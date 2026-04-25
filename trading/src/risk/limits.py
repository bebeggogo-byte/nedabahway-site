"""Daily risk limits / circuit breakers.

Halts trading when:
- daily P&L drawdown exceeds limit
- consecutive losing days exceed threshold
- account equity falls below minimum

State is persisted to SQLite so circuit-breaker survives process restarts.
"""

from __future__ import annotations

import json
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime, timedelta
from pathlib import Path


@dataclass(frozen=True)
class DailyRiskLimits:
    daily_loss_limit_pct: float = 0.02
    max_consecutive_loss_days: int = 3
    min_equity_krw: float = 1_000_000
    cooldown_days_after_block: int = 1


_SCHEMA = """
CREATE TABLE IF NOT EXISTS daily_pnl (
    trade_date TEXT PRIMARY KEY,
    starting_equity INTEGER,
    ending_equity INTEGER,
    realized_pnl INTEGER,
    pnl_pct REAL
);
CREATE TABLE IF NOT EXISTS circuit_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    blocked_until TEXT,
    reason TEXT,
    updated_at TEXT
);
"""


class CircuitBreaker:
    def __init__(self, db_path: Path, limits: DailyRiskLimits | None = None):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        self.limits = limits or DailyRiskLimits()
        with self._conn() as c:
            c.executescript(_SCHEMA)

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def record_daily(
        self, trade_date: date, starting_equity: int, ending_equity: int
    ) -> tuple[int, float]:
        pnl = ending_equity - starting_equity
        pnl_pct = (pnl / starting_equity) if starting_equity > 0 else 0.0
        with self._conn() as c:
            c.execute(
                """INSERT OR REPLACE INTO daily_pnl(trade_date, starting_equity, ending_equity, realized_pnl, pnl_pct)
                   VALUES (?, ?, ?, ?, ?)""",
                (trade_date.isoformat(), starting_equity, ending_equity, pnl, pnl_pct),
            )
        return pnl, pnl_pct

    def can_trade(self, today: date | None = None, current_equity: int | None = None) -> tuple[bool, str]:
        today = today or date.today()
        with self._conn() as c:
            row = c.execute("SELECT * FROM circuit_state WHERE id=1").fetchone()
            if row and row["blocked_until"]:
                blocked_until = date.fromisoformat(row["blocked_until"])
                if today <= blocked_until:
                    return False, f"blocked until {blocked_until} ({row['reason']})"

            if current_equity is not None and current_equity < self.limits.min_equity_krw:
                self._block(c, today, days=30, reason=f"equity {current_equity} < min {self.limits.min_equity_krw}")
                return False, "equity below minimum"

            today_row = c.execute(
                "SELECT pnl_pct FROM daily_pnl WHERE trade_date=?", (today.isoformat(),)
            ).fetchone()
            if today_row and today_row["pnl_pct"] is not None:
                if today_row["pnl_pct"] <= -self.limits.daily_loss_limit_pct:
                    self._block(c, today, days=self.limits.cooldown_days_after_block,
                                reason=f"daily loss {today_row['pnl_pct']:.2%} exceeded limit")
                    return False, "daily loss limit hit"

            recent = c.execute(
                "SELECT pnl_pct FROM daily_pnl WHERE pnl_pct IS NOT NULL ORDER BY trade_date DESC LIMIT ?",
                (self.limits.max_consecutive_loss_days,),
            ).fetchall()
            if (
                len(recent) == self.limits.max_consecutive_loss_days
                and all(r["pnl_pct"] < 0 for r in recent)
            ):
                self._block(c, today, days=self.limits.cooldown_days_after_block,
                            reason=f"{self.limits.max_consecutive_loss_days} consecutive losing days")
                return False, "consecutive loss days exceeded"

        return True, "ok"

    def _block(self, c: sqlite3.Connection, today: date, days: int, reason: str) -> None:
        until = (today + timedelta(days=days)).isoformat()
        c.execute(
            "INSERT OR REPLACE INTO circuit_state(id, blocked_until, reason, updated_at) VALUES (1, ?, ?, ?)",
            (until, reason, datetime.utcnow().isoformat()),
        )
