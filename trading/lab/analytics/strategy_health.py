"""Strategy health analyzer — per-strategy fitness over rolling windows.

Inputs:
- sim_orders + execution_report (via per_strategy_pnl)
- daily_pnl events for context
- attribution.json signal counts

Outputs (per strategy):
- realized_pnl_4w / 8w
- win_rate
- n_round_trips
- status: healthy / warning / unhealthy / retirement_candidate
- recommended_action: keep / reduce_weight / pause / retire

Status logic:
- retirement_candidate:  realized_pnl_8w < 0 AND win_rate < 0.40 AND n_round_trips_8w >= 5
- unhealthy:             realized_pnl_4w < 0 OR win_rate < 0.40
- warning:               realized_pnl_4w near zero (-2%~0%)
- healthy:               otherwise

CIO 가 매주 의회에서 이 데이터를 받아 sub_weights 조정. 4주 연속 candidate
면 자동 PR (월 1회 retirement-alert workflow) 으로 폐기 검토 issue 오픈.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger(__name__)


@contextmanager
def _ro(db_path: Path):
    if not db_path.exists():
        yield None
        return
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _trades_with_attribution(events_db: Path, sim_db: Path | None, since: datetime):
    """Yield (ts, ticker, side, qty, fill_price, fee, attribution) since `since`."""
    cutoff = since.isoformat()
    with _ro(sim_db) as c:
        if c is not None:
            try:
                rows = c.execute(
                    "SELECT submitted_at, ticker, side, qty, fill_price, fee, attribution_json FROM sim_orders WHERE submitted_at >= ? ORDER BY id ASC",
                    (cutoff,),
                ).fetchall()
                for r in rows:
                    attr = json.loads(r["attribution_json"]) if r["attribution_json"] else {}
                    yield (r["submitted_at"], r["ticker"], r["side"], int(r["qty"]),
                           int(r["fill_price"]), float(r["fee"] or 0), attr)
            except sqlite3.OperationalError:
                pass

    with _ro(events_db) as c:
        if c is None:
            return
        try:
            rows = c.execute(
                "SELECT ts, payload_json FROM events WHERE payload_type='execution_report' AND ts >= ? ORDER BY id ASC",
                (cutoff,),
            ).fetchall()
        except sqlite3.OperationalError:
            return
        for r in rows:
            p = json.loads(r["payload_json"])
            if not p.get("success"):
                continue
            intent = p.get("intent") or {}
            ticker = intent.get("ticker")
            side = intent.get("side")
            qty = intent.get("qty")
            fill_price = p.get("fill_price")
            if not (ticker and side and qty and fill_price):
                continue
            yield (r["ts"], ticker, side, int(qty), int(fill_price),
                   float(p.get("fee") or 0), intent.get("attribution") or {})


def _pnl_window(events_db: Path, sim_db: Path | None, days: int) -> dict[str, dict]:
    """FIFO match within window, attribute. Returns {strat: {pnl, n_rt, wins}}."""
    from collections import defaultdict, deque
    since = datetime.now(timezone.utc) - timedelta(days=days)

    open_lots: dict[str, deque] = defaultdict(deque)
    by_strat: dict[str, dict] = defaultdict(lambda: {"pnl": 0.0, "n_rt": 0, "wins": 0})

    for ts, ticker, side, qty, fill_price, fee, attr in _trades_with_attribution(events_db, sim_db, since):
        if side == "buy":
            open_lots[ticker].append({"qty": qty, "fill_price": fill_price, "fee": fee, "attribution": attr})
        elif side == "sell":
            remaining = qty
            while remaining > 0 and open_lots[ticker]:
                lot = open_lots[ticker][0]
                match_qty = min(lot["qty"], remaining)
                gross = (fill_price - lot["fill_price"]) * match_qty
                buy_fee_alloc = lot["fee"] * (match_qty / max(lot["qty"], 1))
                sell_fee_alloc = fee * (match_qty / max(qty, 1))
                pnl = gross - buy_fee_alloc - sell_fee_alloc

                attribution = lot["attribution"] or {"unknown": 1.0}
                attr_total = sum(attribution.values()) or 1.0
                for strat, frac in attribution.items():
                    contribution = pnl * (frac / attr_total)
                    by_strat[strat]["pnl"] += contribution
                    by_strat[strat]["n_rt"] += 1
                    if contribution > 0:
                        by_strat[strat]["wins"] += 1

                lot["qty"] -= match_qty
                remaining -= match_qty
                if lot["qty"] == 0:
                    open_lots[ticker].popleft()

    return dict(by_strat)


def _classify(pnl_4w: dict, pnl_8w: dict) -> tuple[str, str, str]:
    """Returns (status, recommended_action, reason)."""
    n_rt_8w = pnl_8w.get("n_rt", 0)
    pnl_4w_v = pnl_4w.get("pnl", 0.0)
    pnl_8w_v = pnl_8w.get("pnl", 0.0)
    win_rate_8w = (pnl_8w.get("wins", 0) / n_rt_8w) if n_rt_8w else 0.5

    if n_rt_8w < 5:
        return "insufficient_data", "wait", f"only {n_rt_8w} round-trips in 8w (need ≥5)"

    if pnl_8w_v < 0 and win_rate_8w < 0.40 and n_rt_8w >= 5:
        return "retirement_candidate", "retire", (
            f"8w P&L = {pnl_8w_v:,.0f} KRW, win_rate = {win_rate_8w:.1%} < 40%, "
            f"{n_rt_8w} round-trips. Structural underperformance."
        )
    if pnl_4w_v < 0 or win_rate_8w < 0.40:
        return "unhealthy", "reduce_weight", (
            f"4w P&L = {pnl_4w_v:,.0f}, 8w win_rate = {win_rate_8w:.1%}. Halve weight."
        )
    if pnl_4w_v < pnl_8w_v * 0.5 and pnl_8w_v > 0:
        return "warning", "monitor", "recent slowdown in P&L"
    return "healthy", "keep", f"4w P&L = {pnl_4w_v:,.0f}, win_rate = {win_rate_8w:.1%}"


def evaluate_strategy_health(events_db: Path, sim_db: Path | None) -> dict:
    pnl_4w = _pnl_window(events_db, sim_db, 28)
    pnl_8w = _pnl_window(events_db, sim_db, 56)
    all_strats = set(pnl_4w) | set(pnl_8w)

    report = []
    for strat in sorted(all_strats):
        a = pnl_4w.get(strat, {"pnl": 0.0, "n_rt": 0, "wins": 0})
        b = pnl_8w.get(strat, {"pnl": 0.0, "n_rt": 0, "wins": 0})
        status, action, reason = _classify(a, b)
        report.append({
            "strategy": strat,
            "pnl_4w": int(round(a["pnl"])),
            "pnl_8w": int(round(b["pnl"])),
            "n_round_trips_4w": a["n_rt"],
            "n_round_trips_8w": b["n_rt"],
            "win_rate_8w": round((b["wins"] / b["n_rt"]) if b["n_rt"] else 0.0, 3),
            "status": status,
            "recommended_action": action,
            "reason": reason,
        })

    candidates = [r for r in report if r["status"] == "retirement_candidate"]
    return {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "by_strategy": report,
        "retirement_candidates": [r["strategy"] for r in candidates],
        "n_total": len(report),
        "n_candidates": len(candidates),
    }


def write_strategy_health(out_dir: Path, events_db: Path, sim_db: Path | None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    data = evaluate_strategy_health(events_db, sim_db)
    (out_dir / "strategy_health.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return data
