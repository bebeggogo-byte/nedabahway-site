from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime
from pathlib import Path
from typing import Any, Iterator

log = logging.getLogger(__name__)


_SCHEMA = """
CREATE TABLE IF NOT EXISTS rebalance_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_at TEXT NOT NULL,
    strategy TEXT NOT NULL,
    universe_size INTEGER,
    target_weights_json TEXT,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_id INTEGER REFERENCES rebalance_runs(id),
    submitted_at TEXT NOT NULL,
    ticker TEXT NOT NULL,
    side TEXT NOT NULL,
    qty INTEGER NOT NULL,
    target_price INTEGER,
    order_type TEXT,
    broker_order_id TEXT,
    success INTEGER NOT NULL,
    raw_response TEXT
);

CREATE TABLE IF NOT EXISTS equity_snapshots (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    snapshot_at TEXT NOT NULL,
    cash INTEGER,
    total_eval INTEGER,
    positions_json TEXT
);

CREATE INDEX IF NOT EXISTS idx_orders_ticker ON orders(ticker);
CREATE INDEX IF NOT EXISTS idx_orders_submitted ON orders(submitted_at);
CREATE INDEX IF NOT EXISTS idx_equity_at ON equity_snapshots(snapshot_at);
"""


class TradeLogger:
    def __init__(self, db_path: Path):
        db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = db_path
        with self._conn() as c:
            c.executescript(_SCHEMA)

    @contextmanager
    def _conn(self) -> Iterator[sqlite3.Connection]:
        conn = sqlite3.connect(self.db_path)
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    def start_rebalance_run(
        self, strategy: str, universe_size: int, target_weights: dict[str, float], notes: str = ""
    ) -> int:
        with self._conn() as c:
            cur = c.execute(
                "INSERT INTO rebalance_runs(run_at, strategy, universe_size, target_weights_json, notes) VALUES (?, ?, ?, ?, ?)",
                (
                    datetime.utcnow().isoformat(),
                    strategy,
                    universe_size,
                    json.dumps(target_weights),
                    notes,
                ),
            )
            return cur.lastrowid

    def log_order(
        self,
        run_id: int,
        ticker: str,
        side: str,
        qty: int,
        target_price: int,
        order_type: str,
        broker_order_id: str | None,
        success: bool,
        raw_response: dict[str, Any],
    ) -> None:
        with self._conn() as c:
            c.execute(
                """INSERT INTO orders(run_id, submitted_at, ticker, side, qty, target_price,
                   order_type, broker_order_id, success, raw_response)
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    run_id,
                    datetime.utcnow().isoformat(),
                    ticker,
                    side,
                    qty,
                    target_price,
                    order_type,
                    broker_order_id,
                    1 if success else 0,
                    json.dumps(raw_response, ensure_ascii=False),
                ),
            )

    def snapshot_equity(self, cash: int, total_eval: int, positions: list[dict]) -> None:
        with self._conn() as c:
            c.execute(
                "INSERT INTO equity_snapshots(snapshot_at, cash, total_eval, positions_json) VALUES (?, ?, ?, ?)",
                (
                    datetime.utcnow().isoformat(),
                    cash,
                    total_eval,
                    json.dumps(positions, ensure_ascii=False),
                ),
            )
