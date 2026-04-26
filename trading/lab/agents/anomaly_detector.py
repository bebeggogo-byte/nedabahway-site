"""AnomalyDetector — 통계적 이상을 능동 탐지.

Pipeline 위치: PerformanceAgent 이후 (모든 cycle 결과 확정된 후 회고).

Watchdog 과 직교:
- Watchdog: 시스템이 죽었나 (4h cron)
- AnomalyDetector: 결과가 정상인가 (매 cycle)

5 detector 종류는 src/monitoring/anomaly.py 에 정의.
본 에이전트는 그 detectors 에 ctx + DB 데이터를 주입해 실행.

출력:
- 발견된 anomaly 들을 cycle 이벤트로 emit (severity 별)
- quant/data/anomalies.json (latest + 30일 history) 영속화
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from src.monitoring.anomaly import detect_all, Anomaly, AnomalyType

from ..base import AgentContext, BaseAgent
from ..messages import Severity as MsgSeverity

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


def _pnl_pcts_recent(events_db: Path, days: int = 30) -> list[float]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days * 2)).isoformat()
    rows: list[tuple[str, float]] = []
    with _ro(events_db) as c:
        if c is None:
            return []
        for r in c.execute(
            "SELECT ts, payload_json FROM events WHERE payload_type='daily_pnl' AND ts >= ? ORDER BY ts ASC",
            (cutoff,),
        ).fetchall():
            p = json.loads(r["payload_json"])
            pct = p.get("pnl_pct")
            d = p.get("date")
            if pct is not None and d:
                rows.append((d, float(pct)))
    by_date: dict[str, float] = {}
    for d, pct in rows:
        by_date[d] = pct
    return [by_date[d] for d in sorted(by_date.keys())][-days:]


def _last_two_active_signals(events_db: Path) -> tuple[set[str] | None, set[str] | None]:
    """Return (yesterday_tickers, today_tickers) of latest active signals."""
    with _ro(events_db) as c:
        if c is None:
            return None, None
        rows = c.execute(
            """SELECT ts, payload_json FROM events
               WHERE payload_type='strategy_signal' ORDER BY id DESC LIMIT 100"""
        ).fetchall()
    actives: list[set[str]] = []
    seen_dates: set[str] = set()
    for r in rows:
        p = json.loads(r["payload_json"])
        if (p.get("metadata") or {}).get("role") != "active":
            continue
        d = (r["ts"][:10] if isinstance(r["ts"], str) else str(r["ts"])[:10])
        if d in seen_dates:
            continue
        seen_dates.add(d)
        actives.append(set(p.get("target_weights", {}).keys()))
        if len(actives) >= 2:
            break
    if len(actives) < 2:
        return None, None
    return actives[1], actives[0]  # (yesterday, today)


def _turnover_recent(events_db: Path, sim_db: Path | None, days: int = 30) -> tuple[list[float], float | None]:
    """Returns (last_30_daily_turnovers, today_turnover)."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days * 2)).isoformat()
    daily_notional: dict[str, float] = {}

    with _ro(sim_db) as c:
        if c is not None:
            try:
                for r in c.execute(
                    "SELECT submitted_at, qty, fill_price FROM sim_orders WHERE submitted_at >= ?",
                    (cutoff,),
                ).fetchall():
                    d = r["submitted_at"][:10]
                    daily_notional[d] = daily_notional.get(d, 0.0) + r["qty"] * r["fill_price"]
            except sqlite3.OperationalError:
                pass

    with _ro(events_db) as c:
        if c is not None:
            try:
                for r in c.execute(
                    "SELECT ts, payload_json FROM events WHERE payload_type='execution_report' AND ts >= ?",
                    (cutoff,),
                ).fetchall():
                    p = json.loads(r["payload_json"])
                    if not p.get("success") or not p.get("fill_price"):
                        continue
                    intent = p.get("intent") or {}
                    qty = intent.get("qty", 0)
                    d = r["ts"][:10]
                    daily_notional[d] = daily_notional.get(d, 0.0) + int(qty) * int(p["fill_price"])
            except sqlite3.OperationalError:
                pass

    if not daily_notional:
        return [], None
    sorted_dates = sorted(daily_notional.keys())
    today = datetime.now(timezone.utc).date().isoformat()
    today_turnover = daily_notional.get(today)
    historical = [daily_notional[d] for d in sorted_dates if d != today][-days:]
    return historical, today_turnover


def _critique_fail_4h(events_db: Path) -> int:
    cutoff = (datetime.now(timezone.utc) - timedelta(hours=4)).isoformat()
    n_fail = 0
    with _ro(events_db) as c:
        if c is None:
            return 0
        for r in c.execute(
            "SELECT payload_json FROM events WHERE payload_type='critique_report' AND ts >= ?",
            (cutoff,),
        ).fetchall():
            p = json.loads(r["payload_json"])
            for f in p.get("findings", []):
                if f.get("verdict") == "fail":
                    n_fail += 1
    return n_fail


def _last_data_ts(events_db: Path) -> datetime | None:
    with _ro(events_db) as c:
        if c is None:
            return None
        row = c.execute(
            "SELECT ts FROM events WHERE payload_type IN ('price_frame_loaded', 'balance_snapshot') ORDER BY id DESC LIMIT 1"
        ).fetchone()
        if row and row["ts"]:
            try:
                t = datetime.fromisoformat(row["ts"].replace("Z", "+00:00"))
                if t.tzinfo is None:
                    t = t.replace(tzinfo=timezone.utc)
                return t
            except Exception:
                return None
    return None


_TYPE_TO_SEVERITY = {
    "info": MsgSeverity.INFO,
    "warn": MsgSeverity.WARN,
    "fail": MsgSeverity.WARN,
}


class AnomalyDetector(BaseAgent):
    name = "anomaly_detector"

    def __init__(
        self,
        events_db: Path,
        sim_db: Path | None = None,
        history_path: Path | None = None,
    ):
        self.events_db = events_db
        self.sim_db = sim_db
        if history_path is None:
            history_path = (
                Path(__file__).resolve().parents[3] / "quant" / "data" / "anomalies.json"
            )
        self.history_path = history_path

    def run(self, ctx: AgentContext) -> None:
        # Gather inputs from DB + ctx
        pnl_30d = _pnl_pcts_recent(self.events_db, days=30)
        today_pnl_pct = pnl_30d[-1] if pnl_30d else None
        prev_pnl_pcts = pnl_30d[:-1] if pnl_30d else []

        yesterday_tickers, today_tickers = _last_two_active_signals(self.events_db)
        turnovers, today_turnover = _turnover_recent(self.events_db, self.sim_db)
        fail_4h = _critique_fail_4h(self.events_db)
        last_ts = _last_data_ts(self.events_db)

        anomalies = detect_all(
            pnl_pcts_30d=prev_pnl_pcts,
            today_pnl_pct=today_pnl_pct,
            yesterday_tickers=yesterday_tickers,
            today_tickers=today_tickers,
            daily_turnovers_30d=turnovers,
            today_turnover=today_turnover,
            fail_count_4h=fail_4h,
            last_data_ts=last_ts,
        )

        if anomalies:
            for a in anomalies:
                self.emit(
                    ctx, "anomaly_detected", a.to_dict(),
                    severity=_TYPE_TO_SEVERITY.get(a.severity.value, MsgSeverity.WARN),
                )
        else:
            self.emit(ctx, "anomaly_clean", {"checks_run": 5})

        ctx.set("anomalies", [a.to_dict() for a in anomalies])
        try:
            self._persist_history([a.to_dict() for a in anomalies])
        except Exception as e:
            log.warning("anomaly history append failed: %s", e)

    def _persist_history(self, anomalies_today: list[dict]) -> None:
        self.history_path.parent.mkdir(parents=True, exist_ok=True)
        history: list[dict] = []
        if self.history_path.exists():
            try:
                history = json.loads(self.history_path.read_text(encoding="utf-8")).get("history", [])
            except Exception:
                pass
        # Append today's anomalies to flat history (with dedup by detected_at + type)
        seen = {(h.get("detected_at"), h.get("type")) for h in history}
        for a in anomalies_today:
            key = (a.get("detected_at"), a.get("type"))
            if key not in seen:
                history.append(a)
                seen.add(key)
        history = history[-200:]
        self.history_path.write_text(json.dumps({
            "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "current": anomalies_today,
            "history": history,
        }, indent=2, ensure_ascii=False))
