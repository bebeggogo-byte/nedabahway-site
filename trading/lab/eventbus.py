"""SQLite-backed event bus.

Every AgentMessage published is appended to an event log for replay/audit.
Subscribers can query by cycle_id / agent / payload_type.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

from .messages import AgentMessage


_SCHEMA = """
CREATE TABLE IF NOT EXISTS events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ts TEXT NOT NULL,
    cycle_id TEXT NOT NULL,
    agent TEXT NOT NULL,
    payload_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    correlation_id TEXT,
    payload_json TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_cycle ON events(cycle_id);
CREATE INDEX IF NOT EXISTS idx_events_agent ON events(agent);
CREATE INDEX IF NOT EXISTS idx_events_type ON events(payload_type);
CREATE INDEX IF NOT EXISTS idx_events_ts ON events(ts);

CREATE TABLE IF NOT EXISTS cycles (
    cycle_id TEXT PRIMARY KEY,
    started_at TEXT NOT NULL,
    ended_at TEXT,
    summary_json TEXT
);
"""


class EventBus:
    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        with self._conn() as c:
            c.executescript(_SCHEMA)

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def publish(self, msg: AgentMessage) -> int:
        with self._conn() as c:
            cur = c.execute(
                """INSERT INTO events(ts, cycle_id, agent, payload_type, severity, correlation_id, payload_json)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (
                    msg.ts.isoformat(),
                    msg.cycle_id,
                    msg.agent,
                    msg.payload_type,
                    msg.severity.value,
                    msg.correlation_id,
                    json.dumps(msg.payload, default=str, ensure_ascii=False),
                ),
            )
            return cur.lastrowid

    def query(
        self,
        cycle_id: str | None = None,
        agent: str | None = None,
        payload_type: str | None = None,
        limit: int = 100,
    ) -> list[dict]:
        clauses, params = [], []
        if cycle_id:
            clauses.append("cycle_id = ?")
            params.append(cycle_id)
        if agent:
            clauses.append("agent = ?")
            params.append(agent)
        if payload_type:
            clauses.append("payload_type = ?")
            params.append(payload_type)
        where = ("WHERE " + " AND ".join(clauses)) if clauses else ""
        params.append(limit)
        with self._conn() as c:
            rows = c.execute(
                f"SELECT * FROM events {where} ORDER BY id DESC LIMIT ?", params
            ).fetchall()
            out = []
            for r in rows:
                d = dict(r)
                d["payload"] = json.loads(d.pop("payload_json"))
                out.append(d)
            return out

    def start_cycle(self, cycle_id: str, started_at: str) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT OR REPLACE INTO cycles(cycle_id, started_at) VALUES (?, ?)",
                (cycle_id, started_at),
            )

    def end_cycle(self, cycle_id: str, ended_at: str, summary: dict) -> None:
        with self._conn() as c:
            c.execute(
                "UPDATE cycles SET ended_at=?, summary_json=? WHERE cycle_id=?",
                (ended_at, json.dumps(summary, default=str), cycle_id),
            )

    def get_cycle(self, cycle_id: str) -> dict | None:
        with self._conn() as c:
            row = c.execute("SELECT * FROM cycles WHERE cycle_id=?", (cycle_id,)).fetchone()
            if not row:
                return None
            d = dict(row)
            if d.get("summary_json"):
                d["summary"] = json.loads(d.pop("summary_json"))
            return d
