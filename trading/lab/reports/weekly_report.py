"""Weekly markdown report — human-readable summary the user reads each Sunday.

Aggregates last 7 days of:
- Equity curve + week's return
- All trades (count, top winners, top losers)
- Per-strategy P&L breakdown
- Strategy health changes
- Critic findings (FAIL count)
- Council decisions (when LLM enabled)
- System health stats (uptime, blocked cycles)

Output: quant/reports/weekly-<YYYY-MM-DD>.md  (browseable on site)
        quant/reports/index.json              (list for dashboard linking)
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

REPO_ROOT = Path(__file__).resolve().parents[3]
REPORTS_DIR = REPO_ROOT / "quant" / "reports"


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


def _fmt_krw(n) -> str:
    if n is None:
        return "—"
    n = float(n)
    if abs(n) >= 1e8:
        return f"{n/1e8:+.2f}억"
    if abs(n) >= 1e4:
        return f"{n/1e4:+.1f}만"
    return f"{n:+,.0f}"


def _fmt_pct(n) -> str:
    if n is None:
        return "—"
    return f"{n*100:+.2f}%"


def _equity_for_week(events_db: Path, since: datetime) -> list[tuple[str, int, int, float]]:
    rows = []
    with _ro(events_db) as c:
        if c is None:
            return rows
        for r in c.execute(
            "SELECT payload_json FROM events WHERE payload_type='daily_pnl' AND ts >= ? ORDER BY ts ASC",
            (since.isoformat(),),
        ).fetchall():
            p = json.loads(r["payload_json"])
            rows.append((
                p.get("date"),
                int(p.get("starting_equity", 0)),
                int(p.get("ending_equity", 0)),
                float(p.get("pnl_pct", 0)),
            ))
    return rows


def _trades_for_week(events_db: Path, sim_db: Path | None, since: datetime) -> list[dict]:
    cutoff = since.isoformat()
    out: list[dict] = []
    with _ro(sim_db) as c:
        if c is not None:
            try:
                for r in c.execute(
                    "SELECT submitted_at, ticker, side, qty, fill_price, fee, attribution_json FROM sim_orders WHERE submitted_at >= ? ORDER BY id ASC",
                    (cutoff,),
                ).fetchall():
                    out.append({
                        "ts": r["submitted_at"], "ticker": r["ticker"], "side": r["side"],
                        "qty": int(r["qty"]), "fill_price": int(r["fill_price"]),
                        "fee": float(r["fee"] or 0),
                        "attribution": json.loads(r["attribution_json"]) if r["attribution_json"] else {},
                        "source": "sim",
                    })
            except sqlite3.OperationalError:
                pass
    with _ro(events_db) as c:
        if c is not None:
            try:
                for r in c.execute(
                    "SELECT ts, payload_json FROM events WHERE payload_type='execution_report' AND ts >= ? AND payload_json LIKE '%\"success\": true%' ORDER BY id ASC",
                    (cutoff,),
                ).fetchall():
                    p = json.loads(r["payload_json"])
                    intent = p.get("intent") or {}
                    if not (intent.get("ticker") and p.get("fill_price")):
                        continue
                    out.append({
                        "ts": r["ts"], "ticker": intent["ticker"], "side": intent.get("side"),
                        "qty": int(intent.get("qty", 0)), "fill_price": int(p["fill_price"]),
                        "fee": float(p.get("fee") or 0),
                        "attribution": intent.get("attribution") or {},
                        "source": "kis",
                    })
            except sqlite3.OperationalError:
                pass
    out.sort(key=lambda t: t["ts"])
    return out


def _round_trip_pnl(trades: list[dict]) -> list[dict]:
    """FIFO match buy/sell for the week. Returns closed round-trips with P&L."""
    open_lots: dict[str, deque] = defaultdict(deque)
    closed: list[dict] = []
    for t in trades:
        if t["side"] == "buy":
            open_lots[t["ticker"]].append(dict(t))
        elif t["side"] == "sell":
            remaining = t["qty"]
            while remaining > 0 and open_lots[t["ticker"]]:
                lot = open_lots[t["ticker"]][0]
                match_qty = min(lot["qty"], remaining)
                gross = (t["fill_price"] - lot["fill_price"]) * match_qty
                buy_fee = lot["fee"] * (match_qty / max(lot["qty"], 1))
                sell_fee = t["fee"] * (match_qty / max(t["qty"], 1))
                pnl = gross - buy_fee - sell_fee
                closed.append({
                    "ticker": t["ticker"], "qty": match_qty,
                    "buy_price": lot["fill_price"], "sell_price": t["fill_price"],
                    "pnl": int(round(pnl)), "buy_ts": lot["ts"], "sell_ts": t["ts"],
                    "attribution": lot.get("attribution", {}),
                })
                lot["qty"] -= match_qty
                remaining -= match_qty
                if lot["qty"] == 0:
                    open_lots[t["ticker"]].popleft()
    return closed


def _critique_summary(events_db: Path, since: datetime) -> dict:
    """Returns counts: {pass, warn, fail, total} for last week."""
    out = {"pass": 0, "warn": 0, "fail": 0, "total": 0}
    with _ro(events_db) as c:
        if c is None:
            return out
        for r in c.execute(
            "SELECT payload_json FROM events WHERE payload_type='critique_report' AND ts >= ?",
            (since.isoformat(),),
        ).fetchall():
            p = json.loads(r["payload_json"])
            out["total"] += 1
            findings = p.get("findings", [])
            verdicts = [f.get("verdict") for f in findings]
            if "fail" in verdicts:
                out["fail"] += 1
            elif "warn" in verdicts:
                out["warn"] += 1
            else:
                out["pass"] += 1
    return out


def _heartbeat(out_dir: Path) -> dict:
    p = out_dir / "heartbeat.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _strategy_pnl(out_dir: Path) -> dict:
    p = out_dir / "per_strategy_pnl.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"by_strategy": []}


def _strategy_health(out_dir: Path) -> dict:
    p = out_dir / "strategy_health.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {"by_strategy": [], "retirement_candidates": []}


def _council_latest(out_dir: Path) -> dict:
    p = out_dir / "council-latest.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def render_weekly_report(
    events_db: Path,
    sim_db: Path | None,
    snapshot_dir: Path,
) -> str:
    now = datetime.now(timezone.utc)
    since = now - timedelta(days=7)
    week_label = now.strftime("%Y-%m-%d")

    eq = _equity_for_week(events_db, since)
    trades = _trades_for_week(events_db, sim_db, since)
    closed = _round_trip_pnl(trades)
    crit = _critique_summary(events_db, since)
    hb = _heartbeat(snapshot_dir)
    pnl = _strategy_pnl(snapshot_dir)
    health = _strategy_health(snapshot_dir)
    council = _council_latest(snapshot_dir)

    week_return_pct = None
    week_pnl = None
    if eq:
        start_eq = eq[0][1]
        end_eq = eq[-1][2]
        if start_eq > 0:
            week_return_pct = (end_eq - start_eq) / start_eq
            week_pnl = end_eq - start_eq

    md = f"""# 주간 리포트 · Week of {week_label}

자동 생성 · {now.isoformat(timespec="seconds")}

## 한 눈에

| 지표 | 값 |
|---|---|
| 주간 P&L | **{_fmt_krw(week_pnl)} KRW** ({_fmt_pct(week_return_pct)}) |
| 거래 횟수 | {len(trades)} (매수 {sum(1 for t in trades if t['side']=='buy')}, 매도 {sum(1 for t in trades if t['side']=='sell')}) |
| 완결 라운드트립 | {len(closed)} |
| 비판자 리포트 | {crit['total']} (PASS {crit['pass']} / WARN {crit['warn']} / **FAIL {crit['fail']}**) |
| 시스템 가동 | {hb.get('uptime_days', '—')}일, 누적 사이클 {hb.get('n_cycles_total', '—')} |
| 마지막 사이클 | {hb.get('stale_hours_since_last_cycle', '—')}시간 전 |

"""

    if closed:
        winners = sorted(closed, key=lambda x: -x["pnl"])[:3]
        losers = sorted(closed, key=lambda x: x["pnl"])[:3]
        md += "## 이번 주 베스트/워스트\n\n### 수익 Top 3\n\n| Ticker | Buy | Sell | P&L | 전략 |\n|---|---|---|---|---|\n"
        for w in winners:
            attr = ", ".join(f"{k}({v:.0%})" for k, v in (w["attribution"] or {}).items())
            md += f"| `{w['ticker']}` | {w['buy_price']:,} | {w['sell_price']:,} | **{w['pnl']:+,}** | {attr or '—'} |\n"
        md += "\n### 손실 Top 3\n\n| Ticker | Buy | Sell | P&L | 전략 |\n|---|---|---|---|---|\n"
        for l in losers:
            attr = ", ".join(f"{k}({v:.0%})" for k, v in (l["attribution"] or {}).items())
            md += f"| `{l['ticker']}` | {l['buy_price']:,} | {l['sell_price']:,} | **{l['pnl']:+,}** | {attr or '—'} |\n"
        md += "\n"
    else:
        md += "## 이번 주 라운드트립\n\n_아직 매수→매도 사이클 완성 없음. 다음 주 첫 매도 후 표시됨._\n\n"

    if pnl.get("by_strategy"):
        md += "## 전략별 누적 실현 P&L\n\n| 전략 | 실현 P&L | 라운드트립 | 승률 |\n|---|---|---|---|\n"
        for s in pnl["by_strategy"]:
            md += f"| `{s['strategy']}` | **{s['realized_pnl']:+,}** | {s['n_round_trips']} | {s['win_rate']*100:.0f}% |\n"
        md += "\n"

    if health.get("by_strategy"):
        md += "## 전략 건강도\n\n"
        for s in health["by_strategy"]:
            status_mark = {
                "healthy": "✅", "warning": "⚠️", "unhealthy": "❌",
                "retirement_candidate": "🚫", "insufficient_data": "⏳",
            }.get(s["status"], "·")
            md += f"- {status_mark} `{s['strategy']}` ({s['status']}) — {s['reason']}\n"
        md += "\n"

    if health.get("retirement_candidates"):
        md += f"### ⚠️ 폐기 후보\n\n다음 전략은 8주 누적 손실 + 낮은 승률로 폐기 검토 필요:\n\n"
        for cand in health["retirement_candidates"]:
            md += f"- `{cand}`\n"
        md += "\nCIO 가 다음 의회에서 weight=0 으로 자동 조정 예정.\n\n"

    consensus = council.get("consensus") or {}
    if consensus.get("cycle_summary"):
        md += f"## 의회 결정\n\n> {consensus['cycle_summary']}\n\n"
        if consensus.get("adopted_strategies"):
            md += "**채택된 신규 전략**:\n"
            for s in consensus["adopted_strategies"]:
                md += f"- `{s.get('name')}` (가중치 {s.get('initial_weight', 0)*100:.0f}%) — {s.get('rationale', '')}\n"
            md += "\n"
        if consensus.get("vetoes"):
            md += "**CRO veto**:\n"
            for v in consensus["vetoes"]:
                md += f"- {v.get('target')}: {v.get('reason')}\n"
            md += "\n"

    md += f"""## 다음 주 계획

[대시보드 Today's Plan 카드](https://www.nedabah.org/quant/) 에서 다음 사이클의 목표 비중 확인.

---

📊 **라이브 대시보드**: https://www.nedabah.org/quant/
🤖 **시스템 소스**: `nedabahway-site/trading/`
📋 **이전 리포트**: [reports index](./)

_이 리포트는 매주 일요일 의회 후 자동 생성됩니다. 데이터 소스: lab_events.db, sim_state.db, snapshot JSONs._
"""
    return md


def write_weekly_report(events_db: Path, sim_db: Path | None, snapshot_dir: Path) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    md = render_weekly_report(events_db, sim_db, snapshot_dir)
    path = REPORTS_DIR / f"weekly-{now.strftime('%Y-%m-%d')}.md"
    path.write_text(md, encoding="utf-8")

    # Update reports index
    index_path = REPORTS_DIR / "index.json"
    existing = []
    if index_path.exists():
        try:
            existing = json.loads(index_path.read_text(encoding="utf-8")).get("reports", [])
        except Exception:
            pass
    entry = {"path": path.name, "date": now.strftime("%Y-%m-%d"), "type": "weekly", "size": path.stat().st_size}
    existing = [r for r in existing if r["path"] != path.name]
    existing.append(entry)
    existing.sort(key=lambda r: r["date"], reverse=True)
    index_path.write_text(json.dumps({
        "updated_at": now.isoformat(timespec="seconds"),
        "reports": existing[:50],  # keep last 50
    }, indent=2, ensure_ascii=False))

    log.info("weekly report written: %s (%d bytes)", path, len(md))
    return path
