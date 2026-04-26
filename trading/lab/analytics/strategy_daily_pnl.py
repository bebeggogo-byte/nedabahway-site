"""Daily P&L per strategy — derives time series from FIFO matching.

per_strategy_pnl.py 는 누적 P&L 만 산출. Risk parity 는 std 가 필요해서
일자별 시계열이 필요. 본 모듈은 동일 FIFO 매칭을 수행하되 매도 일자별로
attribution 비율로 분배해서 {strategy: [daily $ ...]} 시리즈를 산출.

설계:
- 매도 일자에 그날 닫힌 round-trip 의 P&L 을 attribution 분배
- 매수만 있고 매도 없는 날은 그 strategy 에 0 (Open positions 무시)
- 동일 일자 여러 round-trip 합산
- 출력: {strategy: list[float]} — 시간순 정렬된 일별 P&L
"""

from __future__ import annotations

import json
import logging
import sqlite3
from collections import defaultdict, deque
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


def _iter_trades(events_db: Path, sim_db: Path | None, since: datetime | None = None):
    """Time-ordered trade stream from sim_orders + execution_report."""
    rows: list[dict] = []
    cutoff = since.isoformat() if since else None
    with _ro(sim_db) as c:
        if c is not None:
            try:
                q = "SELECT submitted_at, ticker, side, qty, fill_price, fee, attribution_json FROM sim_orders"
                if cutoff:
                    q += " WHERE submitted_at >= ?"
                q += " ORDER BY id ASC"
                params = (cutoff,) if cutoff else ()
                for r in c.execute(q, params).fetchall():
                    rows.append({
                        "ts": r["submitted_at"], "ticker": r["ticker"], "side": r["side"],
                        "qty": int(r["qty"]), "fill_price": int(r["fill_price"]),
                        "fee": float(r["fee"] or 0),
                        "attribution": json.loads(r["attribution_json"]) if r["attribution_json"] else {},
                    })
            except sqlite3.OperationalError:
                pass

    with _ro(events_db) as c:
        if c is not None:
            try:
                q = "SELECT ts, payload_json FROM events WHERE payload_type='execution_report'"
                if cutoff:
                    q += " AND ts >= ?"
                q += " ORDER BY id ASC"
                params = (cutoff,) if cutoff else ()
                for r in c.execute(q, params).fetchall():
                    p = json.loads(r["payload_json"])
                    if not p.get("success"):
                        continue
                    intent = p.get("intent") or {}
                    if not (intent.get("ticker") and p.get("fill_price")):
                        continue
                    rows.append({
                        "ts": r["ts"], "ticker": intent["ticker"], "side": intent.get("side"),
                        "qty": int(intent.get("qty", 0)), "fill_price": int(p["fill_price"]),
                        "fee": float(p.get("fee") or 0),
                        "attribution": intent.get("attribution") or {},
                    })
            except sqlite3.OperationalError:
                pass

    rows.sort(key=lambda x: x["ts"])
    return rows


def compute_daily_pnl_by_strategy(
    events_db: Path,
    sim_db: Path | None,
    lookback_days: int = 90,
) -> dict[str, list[float]]:
    """Returns {strategy: [daily $ P&L, ...]} sorted by date."""
    since = datetime.now(timezone.utc) - timedelta(days=lookback_days * 2)  # extra for buy lots before window
    trades = _iter_trades(events_db, sim_db, since=since)

    open_lots: dict[str, deque] = defaultdict(deque)
    daily_by_strat: dict[str, dict[str, float]] = defaultdict(lambda: defaultdict(float))

    for t in trades:
        if t["side"] == "buy":
            open_lots[t["ticker"]].append(dict(t))
        elif t["side"] == "sell":
            sell_date = (t["ts"][:10] if isinstance(t["ts"], str) else str(t["ts"])[:10])
            remaining = t["qty"]
            while remaining > 0 and open_lots[t["ticker"]]:
                lot = open_lots[t["ticker"]][0]
                match_qty = min(lot["qty"], remaining)
                gross = (t["fill_price"] - lot["fill_price"]) * match_qty
                buy_fee = lot["fee"] * (match_qty / max(lot["qty"], 1))
                sell_fee = t["fee"] * (match_qty / max(t["qty"], 1))
                pnl = gross - buy_fee - sell_fee

                attribution = lot.get("attribution") or {"unknown": 1.0}
                attr_total = sum(attribution.values()) or 1.0
                for strat, frac in attribution.items():
                    contribution = pnl * (frac / attr_total)
                    daily_by_strat[strat][sell_date] += contribution

                lot["qty"] -= match_qty
                remaining -= match_qty
                if lot["qty"] == 0:
                    open_lots[t["ticker"]].popleft()

    # Constrain to last `lookback_days` (actual sell dates within window)
    cutoff_date = (datetime.now(timezone.utc) - timedelta(days=lookback_days)).date().isoformat()
    out: dict[str, list[float]] = {}
    for strat, by_date in daily_by_strat.items():
        recent_dates = sorted(d for d in by_date if d >= cutoff_date)
        if recent_dates:
            out[strat] = [by_date[d] for d in recent_dates]
    return out
