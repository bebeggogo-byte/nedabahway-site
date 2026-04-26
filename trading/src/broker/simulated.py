"""SimulatedBroker — KIS-shape mock that uses pykrx for prices.

Lets the daily pipeline run end-to-end *without* a real KIS account.
State (positions, cash) is persisted to SQLite so equity accumulates
across daily Actions runs (the DB is committed to the repo).

Interface compatible with KisClient: get_balance, get_current_price, place_order.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import date, datetime
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)


@dataclass
class SimOrderResult:
    success: bool
    order_id: str | None
    raw: dict[str, Any]


_SCHEMA = """
CREATE TABLE IF NOT EXISTS sim_state (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    cash INTEGER NOT NULL,
    initial_cash INTEGER NOT NULL,
    inception_date TEXT NOT NULL,
    last_updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sim_positions (
    ticker TEXT PRIMARY KEY,
    qty INTEGER NOT NULL,
    avg_price REAL NOT NULL,
    last_updated TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS sim_orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    submitted_at TEXT NOT NULL,
    ticker TEXT NOT NULL,
    side TEXT NOT NULL,
    qty INTEGER NOT NULL,
    fill_price INTEGER NOT NULL,
    fee REAL NOT NULL,
    notional INTEGER NOT NULL
);
"""


class SimulatedBroker:
    """KIS-shape simulator. Uses pykrx for current price (yesterday's close)."""

    def __init__(
        self,
        state_db_path: Path,
        initial_cash: int = 100_000_000,
        commission_rate: float = 0.00015,
        tax_rate_sell: float = 0.0018,
        slippage_bps: float = 5.0,
    ):
        state_db_path.parent.mkdir(parents=True, exist_ok=True)
        self.db_path = state_db_path
        self.commission_rate = commission_rate
        self.tax_rate_sell = tax_rate_sell
        self.slippage_bps = slippage_bps
        with self._conn() as c:
            c.executescript(_SCHEMA)
            row = c.execute("SELECT cash FROM sim_state WHERE id=1").fetchone()
            if row is None:
                c.execute(
                    "INSERT INTO sim_state(id, cash, initial_cash, inception_date, last_updated) VALUES (1, ?, ?, ?, ?)",
                    (initial_cash, initial_cash, date.today().isoformat(), datetime.utcnow().isoformat()),
                )
                log.info("SimulatedBroker initialized with cash=%d", initial_cash)

    @contextmanager
    def _conn(self):
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
            conn.commit()
        finally:
            conn.close()

    # ---------- price source ----------
    def _latest_close(self, ticker: str) -> int:
        """Get latest close price via pykrx. Falls back to in-memory cache."""
        from pykrx import stock

        today = date.today()
        for back in range(0, 10):
            d = today.toordinal() - back
            d_str = date.fromordinal(d).strftime("%Y%m%d")
            try:
                df = stock.get_market_ohlcv_by_date(d_str, d_str, ticker)
                if not df.empty:
                    return int(df.iloc[-1]["종가"])
            except Exception:
                continue
        raise RuntimeError(f"no recent price for {ticker}")

    def get_current_price(self, ticker: str) -> int:
        return self._latest_close(ticker)

    # ---------- account ----------
    def get_balance(self) -> dict[str, Any]:
        with self._conn() as c:
            cash_row = c.execute("SELECT cash FROM sim_state WHERE id=1").fetchone()
            cash = int(cash_row["cash"])
            pos_rows = c.execute("SELECT * FROM sim_positions WHERE qty > 0").fetchall()

        positions: list[dict[str, Any]] = []
        total_position_value = 0
        for r in pos_rows:
            try:
                cur_px = self._latest_close(r["ticker"])
            except Exception as e:
                log.warning("price fetch failed in balance: %s %s", r["ticker"], e)
                cur_px = int(r["avg_price"])
            eval_amt = cur_px * r["qty"]
            pnl = int((cur_px - r["avg_price"]) * r["qty"])
            positions.append({
                "ticker": r["ticker"],
                "name": r["ticker"],
                "qty": r["qty"],
                "avg_price": float(r["avg_price"]),
                "current_price": cur_px,
                "eval_amount": eval_amt,
                "pnl": pnl,
            })
            total_position_value += eval_amt

        return {
            "positions": positions,
            "cash": cash,
            "total_eval": cash + total_position_value,
        }

    # ---------- order ----------
    def place_order(
        self,
        ticker: str,
        qty: int,
        side: str,
        price: int = 0,
        order_type: str = "01",
    ) -> SimOrderResult:
        if qty <= 0:
            return SimOrderResult(success=False, order_id=None, raw={"msg1": f"qty<=0: {qty}"})

        try:
            cur = self._latest_close(ticker)
        except Exception as e:
            return SimOrderResult(success=False, order_id=None, raw={"msg1": f"price fetch failed: {e}"})

        slip = cur * (self.slippage_bps / 1e4)
        fill_price = int(round(cur + slip)) if side == "buy" else int(round(cur - slip))
        notional = qty * fill_price
        fee_rate = self.commission_rate + (self.tax_rate_sell if side == "sell" else 0.0)
        fee = int(round(notional * fee_rate))

        with self._conn() as c:
            cash_row = c.execute("SELECT cash FROM sim_state WHERE id=1").fetchone()
            cash = int(cash_row["cash"])

            if side == "buy":
                total_cost = notional + fee
                if total_cost > cash:
                    return SimOrderResult(
                        success=False, order_id=None,
                        raw={"msg1": f"insufficient cash: need {total_cost}, have {cash}"},
                    )
                c.execute("UPDATE sim_state SET cash = cash - ?, last_updated = ? WHERE id=1",
                          (total_cost, datetime.utcnow().isoformat()))
                pos = c.execute("SELECT qty, avg_price FROM sim_positions WHERE ticker=?", (ticker,)).fetchone()
                if pos:
                    new_qty = pos["qty"] + qty
                    new_avg = (pos["qty"] * pos["avg_price"] + notional) / new_qty
                    c.execute(
                        "UPDATE sim_positions SET qty=?, avg_price=?, last_updated=? WHERE ticker=?",
                        (new_qty, new_avg, datetime.utcnow().isoformat(), ticker),
                    )
                else:
                    c.execute(
                        "INSERT INTO sim_positions(ticker, qty, avg_price, last_updated) VALUES (?, ?, ?, ?)",
                        (ticker, qty, float(fill_price), datetime.utcnow().isoformat()),
                    )

            elif side == "sell":
                pos = c.execute("SELECT qty, avg_price FROM sim_positions WHERE ticker=?", (ticker,)).fetchone()
                if not pos or pos["qty"] < qty:
                    held = pos["qty"] if pos else 0
                    return SimOrderResult(
                        success=False, order_id=None,
                        raw={"msg1": f"insufficient holdings: need {qty}, have {held}"},
                    )
                proceeds = notional - fee
                c.execute("UPDATE sim_state SET cash = cash + ?, last_updated = ? WHERE id=1",
                          (proceeds, datetime.utcnow().isoformat()))
                new_qty = pos["qty"] - qty
                if new_qty == 0:
                    c.execute("DELETE FROM sim_positions WHERE ticker=?", (ticker,))
                else:
                    c.execute(
                        "UPDATE sim_positions SET qty=?, last_updated=? WHERE ticker=?",
                        (new_qty, datetime.utcnow().isoformat(), ticker),
                    )

            else:
                return SimOrderResult(success=False, order_id=None, raw={"msg1": f"unknown side: {side}"})

            cur_order = c.execute(
                """INSERT INTO sim_orders(submitted_at, ticker, side, qty, fill_price, fee, notional)
                   VALUES (?, ?, ?, ?, ?, ?, ?)""",
                (datetime.utcnow().isoformat(), ticker, side, qty, fill_price, fee, notional),
            )
            order_id = f"SIM-{cur_order.lastrowid}"

        log.info("SIM %s %s %d @ %d (fee=%d)", side.upper(), ticker, qty, fill_price, fee)
        return SimOrderResult(
            success=True,
            order_id=order_id,
            raw={"ODNO": order_id, "fill_price": fill_price, "fee": fee, "msg1": "simulated fill"},
        )
