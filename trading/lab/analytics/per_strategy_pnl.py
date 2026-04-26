"""Per-strategy realized P&L attribution via FIFO matching.

Each order has an `attribution` map (sub_strategy → fraction). When buys are
matched against sells (FIFO per ticker), each match's P&L is split by the
buy's attribution. Result: realized $ contribution per sub-strategy.

Reads sim_orders (SimulatedBroker) and execution_report events (KIS), unifies,
matches FIFO, attributes.

Output: per_strategy_pnl.json structure:
    {
      "updated_at": "...",
      "by_strategy": [
        {"strategy": "xs_momentum", "realized_pnl": 123456, "n_round_trips": 8,
         "win_rate": 0.62, "open_position_value": 100000}
      ],
      "total_realized_pnl": 123456,
    }
"""

from __future__ import annotations

import json
import logging
import sqlite3
from collections import defaultdict, deque
from contextlib import contextmanager
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

log = logging.getLogger(__name__)


@dataclass
class Trade:
    ts: str
    ticker: str
    side: str
    qty: int
    fill_price: int
    fee: float
    attribution: dict[str, float]


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


def _load_sim_orders(sim_db: Path) -> list[Trade]:
    out: list[Trade] = []
    with _ro(sim_db) as c:
        if c is None:
            return out
        try:
            rows = c.execute(
                "SELECT submitted_at, ticker, side, qty, fill_price, fee, attribution_json FROM sim_orders ORDER BY id ASC"
            ).fetchall()
        except sqlite3.OperationalError:
            return out
        for r in rows:
            attr = json.loads(r["attribution_json"]) if r["attribution_json"] else {}
            out.append(Trade(
                ts=r["submitted_at"], ticker=r["ticker"], side=r["side"],
                qty=int(r["qty"]), fill_price=int(r["fill_price"]),
                fee=float(r["fee"] or 0), attribution=attr,
            ))
    return out


def _load_execution_reports(events_db: Path) -> list[Trade]:
    out: list[Trade] = []
    with _ro(events_db) as c:
        if c is None:
            return out
        try:
            rows = c.execute(
                "SELECT ts, payload_json FROM events WHERE payload_type='execution_report' ORDER BY id ASC"
            ).fetchall()
        except sqlite3.OperationalError:
            return out
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
            out.append(Trade(
                ts=r["ts"], ticker=ticker, side=side, qty=int(qty),
                fill_price=int(fill_price), fee=float(p.get("fee") or 0),
                attribution=intent.get("attribution") or {},
            ))
    return out


def compute_per_strategy_pnl(events_db: Path, sim_db: Path | None) -> dict:
    """FIFO match buys against sells per ticker. Each closing match's P&L is
    attributed to the *buy*'s attribution map (since the buy decision is what
    bought into the position)."""
    trades: list[Trade] = []
    trades.extend(_load_sim_orders(sim_db) if sim_db else [])
    trades.extend(_load_execution_reports(events_db))
    trades.sort(key=lambda t: t.ts)

    open_lots: dict[str, deque[Trade]] = defaultdict(deque)  # ticker -> FIFO of buy lots
    realized_per_strategy: dict[str, float] = defaultdict(float)
    round_trips_per_strategy: dict[str, int] = defaultdict(int)
    wins_per_strategy: dict[str, int] = defaultdict(int)
    total_realized = 0.0

    for tr in trades:
        if tr.side == "buy":
            open_lots[tr.ticker].append(tr)
        elif tr.side == "sell":
            remaining = tr.qty
            while remaining > 0 and open_lots[tr.ticker]:
                lot = open_lots[tr.ticker][0]
                match_qty = min(lot.qty, remaining)
                gross = (tr.fill_price - lot.fill_price) * match_qty
                # Allocate fees proportionally
                buy_fee_alloc = lot.fee * (match_qty / max(lot.qty, 1))
                sell_fee_alloc = tr.fee * (match_qty / max(tr.qty, 1))
                pnl = gross - buy_fee_alloc - sell_fee_alloc
                total_realized += pnl

                attr = lot.attribution or {"unknown": 1.0}
                attr_total = sum(attr.values()) or 1.0
                for strat, frac in attr.items():
                    contribution = pnl * (frac / attr_total)
                    realized_per_strategy[strat] += contribution
                    round_trips_per_strategy[strat] += 1
                    if contribution > 0:
                        wins_per_strategy[strat] += 1

                lot.qty -= match_qty
                remaining -= match_qty
                if lot.qty == 0:
                    open_lots[tr.ticker].popleft()

    by_strategy = []
    for strat in realized_per_strategy:
        n_rt = round_trips_per_strategy[strat]
        wins = wins_per_strategy[strat]
        by_strategy.append({
            "strategy": strat,
            "realized_pnl": int(round(realized_per_strategy[strat])),
            "n_round_trips": n_rt,
            "win_rate": (wins / n_rt) if n_rt else 0.0,
        })
    by_strategy.sort(key=lambda r: -r["realized_pnl"])

    return {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "total_realized_pnl": int(round(total_realized)),
        "by_strategy": by_strategy,
        "n_open_lots": sum(len(d) for d in open_lots.values()),
    }


def write_per_strategy_pnl(out_dir: Path, events_db: Path, sim_db: Path | None) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    data = compute_per_strategy_pnl(events_db, sim_db)
    (out_dir / "per_strategy_pnl.json").write_text(json.dumps(data, indent=2, ensure_ascii=False))
    return data
