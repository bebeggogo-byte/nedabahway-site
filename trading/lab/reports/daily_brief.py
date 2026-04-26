"""Daily morning brief — short markdown read in 30 seconds before market opens.

Generated each weekday at 08:00 KST (1 hour before KOSPI opens). Surfaces:
- 어제 성과 (P&L, 매매 횟수, 핵심 트레이드)
- 오늘 계획 (top picks, 강조해야 할 변경)
- 시스템 상태 (heartbeat, blocked 여부)
- 경고 (FAIL critic, retirement candidate, drawdown)

Output: quant/reports/daily-<YYYY-MM-DD>.md (one per weekday, archived)
"""

from __future__ import annotations

import json
import logging
import sqlite3
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


def _yesterday_pnl(events_db: Path) -> dict | None:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=2)).isoformat()
    with _ro(events_db) as c:
        if c is None:
            return None
        row = c.execute(
            "SELECT payload_json FROM events WHERE payload_type='daily_pnl' AND ts >= ? ORDER BY ts DESC LIMIT 1",
            (cutoff,),
        ).fetchone()
        if row:
            return json.loads(row["payload_json"])
    return None


def _yesterday_trades(events_db: Path, sim_db: Path | None) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=1, hours=12)).isoformat()
    out: list[dict] = []
    with _ro(sim_db) as c:
        if c is not None:
            try:
                for r in c.execute(
                    "SELECT submitted_at, ticker, side, qty, fill_price FROM sim_orders WHERE submitted_at >= ? ORDER BY id DESC LIMIT 30",
                    (cutoff,),
                ).fetchall():
                    out.append({
                        "ts": r["submitted_at"], "ticker": r["ticker"], "side": r["side"],
                        "qty": int(r["qty"]), "fill_price": int(r["fill_price"]),
                    })
            except sqlite3.OperationalError:
                pass
    return out


def _today_plan(snapshot_dir: Path) -> dict:
    p = snapshot_dir / "today_plan.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _heartbeat(snapshot_dir: Path) -> dict:
    p = snapshot_dir / "heartbeat.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _meta(snapshot_dir: Path) -> dict:
    p = snapshot_dir / "meta.json"
    if p.exists():
        try:
            return json.loads(p.read_text(encoding="utf-8"))
        except Exception:
            pass
    return {}


def _critique_alerts(events_db: Path) -> list[dict]:
    """Recent critique reports with FAIL findings — last 24h."""
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
    alerts: list[dict] = []
    with _ro(events_db) as c:
        if c is None:
            return alerts
        for r in c.execute(
            "SELECT payload_json FROM events WHERE payload_type='critique_report' AND ts >= ?",
            (cutoff,),
        ).fetchall():
            p = json.loads(r["payload_json"])
            for f in p.get("findings", []):
                if f.get("verdict") == "fail":
                    alerts.append({
                        "critic": f.get("critic"),
                        "metric": f.get("metric"),
                        "detail": f.get("detail", ""),
                    })
    return alerts


def _health_warnings(snapshot_dir: Path) -> list[str]:
    p = snapshot_dir / "strategy_health.json"
    if not p.exists():
        return []
    try:
        h = json.loads(p.read_text(encoding="utf-8"))
        warnings = []
        for s in h.get("by_strategy", []):
            if s.get("status") in ("retirement_candidate", "unhealthy"):
                warnings.append(f"`{s['strategy']}` ({s['status']}): {s['reason']}")
        return warnings
    except Exception:
        return []


def render_daily_brief(events_db: Path, sim_db: Path | None, snapshot_dir: Path) -> str:
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    pnl = _yesterday_pnl(events_db) or {}
    trades = _yesterday_trades(events_db, sim_db)
    plan = _today_plan(snapshot_dir)
    hb = _heartbeat(snapshot_dir)
    meta = _meta(snapshot_dir)
    alerts = _critique_alerts(events_db)
    health_warnings = _health_warnings(snapshot_dir)

    sys_status = "🟢 정상"
    if not (meta.get("system", {}).get("trading_allowed", True)):
        sys_status = f"🛑 거래 중단 ({meta['system'].get('blocked_reason', 'unknown')})"
    elif not hb.get("is_healthy", True):
        sys_status = "⚠️ stale heartbeat"

    # Build markdown
    md = f"""# 일일 브리핑 · {today}

📅 KOSPI 개장 전 자동 생성 · {now.isoformat(timespec="seconds")}

## 시스템 상태

{sys_status} · 가동 {hb.get('uptime_days', '—')}일 · 누적 사이클 {hb.get('n_cycles_total', '—')}개 · 마지막 사이클 {hb.get('stale_hours_since_last_cycle', '—')}h 전

## 어제

"""
    if pnl:
        pnl_v = pnl.get("pnl", 0)
        pnl_pct = pnl.get("pnl_pct", 0)
        starting = pnl.get("starting_equity", 0)
        ending = pnl.get("ending_equity", 0)
        emoji = "📈" if pnl_v > 0 else ("📉" if pnl_v < 0 else "➡️")
        md += f"- {emoji} **P&L: {_fmt_krw(pnl_v)} ({_fmt_pct(pnl_pct)})**\n"
        md += f"- 자본: {_fmt_krw(starting)} → {_fmt_krw(ending)} KRW\n"
        md += f"- 매매 횟수: **{len(trades)}** (매수 {sum(1 for t in trades if t['side']=='buy')}, 매도 {sum(1 for t in trades if t['side']=='sell')})\n"
    else:
        md += "_어제 사이클 없음 (시장 휴장 또는 시스템 시작 전)._\n"

    # Today's plan
    md += "\n## 오늘 계획\n\n"
    active = plan.get("active") or {}
    weights = active.get("target_weights", {})
    if weights:
        sorted_picks = sorted(weights.items(), key=lambda x: -x[1])[:8]
        md += "활성 ensemble 의 상위 픽 (사이클 후 자동 매매됨):\n\n"
        md += "| Rank | Ticker | Weight |\n|---|---|---|\n"
        for rank, (ticker, w) in enumerate(sorted_picks, 1):
            md += f"| {rank} | `{ticker}` | **{w*100:.1f}%** |\n"
    else:
        md += "_오늘 신호 없음 (universe 비어있거나 모든 전략 zero weight)._\n"

    # Alerts
    if alerts or health_warnings:
        md += "\n## ⚠️ 경고\n\n"
        for a in alerts[:5]:
            md += f"- **{a['critic']}** · `{a['metric']}` — {a['detail']}\n"
        for w in health_warnings[:5]:
            md += f"- 전략 건강도: {w}\n"

    md += f"""
## 빠른 링크

- 📊 [라이브 대시보드](https://www.nedabah.org/quant/) — 실시간 차트·KPI
- 📋 [주간 리포트](/quant/reports/) — 일요일 발행
- 🔧 [GitHub Actions](https://github.com/bebeggogo-byte/nedabahway-site/actions) — 워크플로 상태
- 📖 [세부 README](https://github.com/bebeggogo-byte/nedabahway-site/tree/main/trading/lab)

---

_매주 평일 08:00 KST 자동 생성. 사용자 요청 시 수동 트리거 가능: `gh workflow run quant-lab-daily-brief`._
"""
    return md


def write_daily_brief(events_db: Path, sim_db: Path | None, snapshot_dir: Path) -> Path:
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    now = datetime.now(timezone.utc)
    md = render_daily_brief(events_db, sim_db, snapshot_dir)
    path = REPORTS_DIR / f"daily-{now.strftime('%Y-%m-%d')}.md"
    path.write_text(md, encoding="utf-8")

    # Update reports index
    index_path = REPORTS_DIR / "index.json"
    existing = []
    if index_path.exists():
        try:
            existing = json.loads(index_path.read_text(encoding="utf-8")).get("reports", [])
        except Exception:
            pass
    entry = {"path": path.name, "date": now.strftime("%Y-%m-%d"), "type": "daily", "size": path.stat().st_size}
    existing = [r for r in existing if r["path"] != path.name]
    existing.append(entry)
    existing.sort(key=lambda r: r["date"], reverse=True)
    index_path.write_text(json.dumps({
        "updated_at": now.isoformat(timespec="seconds"),
        "reports": existing[:60],  # keep last 60 (~12 weeks: 5 daily * 12 + 12 weekly)
    }, indent=2, ensure_ascii=False))

    log.info("daily brief written: %s (%d bytes)", path, len(md))
    return path
