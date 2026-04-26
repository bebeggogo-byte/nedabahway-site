"""Snapshot exporter — reads SQLite (events + circuit) and writes JSON for the dashboard.

Output: /quant/data/*.json (committed by daily GitHub Action so GitHub Pages auto-deploys).

Files produced:
- meta.json        system status, last update, current phase, version
- latest.json      most recent cycle summary
- equity.json      equity curve time series
- decisions.json   recent N cycles' summaries (orders, signals)
- critiques.json   recent critique reports (worst-verdict surfaced)
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

SCHEMA_VERSION = "0.1.0"


@contextmanager
def _ro_conn(db_path: Path):
    if not db_path.exists():
        yield None
        return
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _utcnow_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _system_status(circuit_db: Path) -> dict[str, Any]:
    with _ro_conn(circuit_db) as c:
        if c is None:
            return {"trading_allowed": True, "blocked_reason": None, "blocked_until": None}
        row = c.execute("SELECT * FROM circuit_state WHERE id=1").fetchone()
        if not row or not row["blocked_until"]:
            return {"trading_allowed": True, "blocked_reason": None, "blocked_until": None}
        from datetime import date
        blocked_until = row["blocked_until"]
        try:
            allowed = date.fromisoformat(blocked_until) < date.today()
        except ValueError:
            allowed = True
        return {
            "trading_allowed": allowed,
            "blocked_reason": row["reason"],
            "blocked_until": blocked_until,
        }


def export_meta(out_dir: Path, circuit_db: Path, phase: int = 1, phase_name: str = "Infrastructure Build") -> dict:
    meta = {
        "schema_version": SCHEMA_VERSION,
        "last_updated": _utcnow_iso(),
        "phase": phase,
        "phase_name": phase_name,
        "phases_total": 4,
        "system": _system_status(circuit_db),
        "agents": {
            "deterministic_backbone": 7,
            "deterministic_critics": 4,
            "llm_council": 0,
            "total": 11,
            "target": 16,
        },
    }
    (out_dir / "meta.json").write_text(json.dumps(meta, indent=2, ensure_ascii=False))
    return meta


def export_latest_cycle(out_dir: Path, events_db: Path) -> dict:
    with _ro_conn(events_db) as c:
        if c is None:
            data = {"cycle_id": None, "events": [], "started_at": None, "ended_at": None}
            (out_dir / "latest.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        row = c.execute("SELECT * FROM cycles ORDER BY started_at DESC LIMIT 1").fetchone()
        if not row:
            data = {"cycle_id": None, "events": []}
            (out_dir / "latest.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
            return data
        cycle_id = row["cycle_id"]
        events = c.execute(
            "SELECT ts, agent, payload_type, severity, payload_json FROM events WHERE cycle_id=? ORDER BY id ASC",
            (cycle_id,),
        ).fetchall()
        events_out = []
        for e in events:
            events_out.append({
                "ts": e["ts"], "agent": e["agent"],
                "type": e["payload_type"], "severity": e["severity"],
                "payload": json.loads(e["payload_json"]),
            })
        summary = json.loads(row["summary_json"]) if row["summary_json"] else {}
        data = {
            "cycle_id": cycle_id,
            "started_at": row["started_at"],
            "ended_at": row["ended_at"],
            "summary": summary,
            "events": events_out,
        }
    (out_dir / "latest.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_equity(out_dir: Path, events_db: Path) -> dict:
    """Equity time series from daily_pnl events."""
    points: list[dict] = []
    with _ro_conn(events_db) as c:
        if c is not None:
            rows = c.execute(
                "SELECT ts, payload_json FROM events WHERE payload_type='daily_pnl' ORDER BY ts ASC"
            ).fetchall()
            for r in rows:
                p = json.loads(r["payload_json"])
                points.append({
                    "date": p.get("date"),
                    "equity": p.get("ending_equity"),
                    "pnl": p.get("pnl"),
                    "pnl_pct": p.get("pnl_pct"),
                })
    data = {"updated_at": _utcnow_iso(), "points": points}
    (out_dir / "equity.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_decisions(out_dir: Path, events_db: Path, n: int = 30) -> dict:
    rows_out: list[dict] = []
    with _ro_conn(events_db) as c:
        if c is not None:
            rows = c.execute(
                "SELECT cycle_id, started_at, ended_at, summary_json FROM cycles ORDER BY started_at DESC LIMIT ?",
                (n,),
            ).fetchall()
            for r in rows:
                summary = json.loads(r["summary_json"]) if r["summary_json"] else {}
                rows_out.append({
                    "cycle_id": r["cycle_id"],
                    "started_at": r["started_at"],
                    "ended_at": r["ended_at"],
                    "phases_run": summary.get("phases_run", []),
                    "errors": summary.get("errors", []),
                    "intents_count": summary.get("intents_count", 0),
                    "executions_count": summary.get("executions_count", 0),
                    "success_count": summary.get("success_count", 0),
                })
    data = {"updated_at": _utcnow_iso(), "decisions": rows_out}
    (out_dir / "decisions.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_critiques(out_dir: Path, events_db: Path, n: int = 50) -> dict:
    rows_out: list[dict] = []
    with _ro_conn(events_db) as c:
        if c is not None:
            rows = c.execute(
                """SELECT ts, agent, payload_json FROM events
                   WHERE payload_type='critique_report'
                   ORDER BY id DESC LIMIT ?""",
                (n,),
            ).fetchall()
            for r in rows:
                p = json.loads(r["payload_json"])
                worst = "pass"
                for f in p.get("findings", []):
                    if f.get("verdict") == "fail":
                        worst = "fail"
                        break
                    if f.get("verdict") == "warn":
                        worst = "warn"
                rows_out.append({
                    "ts": r["ts"],
                    "critic": r["agent"],
                    "target": p.get("target"),
                    "worst_verdict": worst,
                    "n_findings": len(p.get("findings", [])),
                    "findings": p.get("findings", []),
                })
    data = {"updated_at": _utcnow_iso(), "critiques": rows_out}
    (out_dir / "critiques.json").write_text(json.dumps(data, indent=2, ensure_ascii=False, default=str))
    return data


def export_all(out_dir: Path, events_db: Path, circuit_db: Path) -> dict[str, Any]:
    out_dir.mkdir(parents=True, exist_ok=True)
    log.info("exporting snapshot to %s", out_dir)
    meta = export_meta(out_dir, circuit_db)
    latest = export_latest_cycle(out_dir, events_db)
    equity = export_equity(out_dir, events_db)
    decisions = export_decisions(out_dir, events_db)
    critiques = export_critiques(out_dir, events_db)
    log.info(
        "snapshot complete: latest=%s, equity_pts=%d, decisions=%d, critiques=%d",
        latest.get("cycle_id"), len(equity["points"]), len(decisions["decisions"]), len(critiques["critiques"]),
    )
    return {"meta": meta, "latest": latest, "equity": equity, "decisions": decisions, "critiques": critiques}
