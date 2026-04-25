"""CLI entry point for the quant lab.

Usage:
    cd trading
    python -m lab.cli daily              # daily rebalance cycle
    python -m lab.cli daily --dry-run    # no broker calls, no orders
    python -m lab.cli daily --no-broker  # skip broker entirely (offline data-only)
    python -m lab.cli inspect <cycle_id> # print events for a cycle
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import KisConfig, StrategyConfig, TRADE_DB_PATH  # noqa: E402

from lab.agents.balance_agent import BalanceAgent  # noqa: E402
from lab.agents.data_agent import DataAgent  # noqa: E402
from lab.agents.execution_agent import ExecutionAgent  # noqa: E402
from lab.agents.performance_agent import PerformanceAgent  # noqa: E402
from lab.agents.risk_agent import RiskAgent  # noqa: E402
from lab.agents.strategy_agent import StrategyAgent  # noqa: E402
from lab.agents.universe_agent import UniverseAgent  # noqa: E402
from lab.eventbus import EventBus  # noqa: E402
from lab.orchestrator import Orchestrator, Pipeline  # noqa: E402
from src.risk.limits import CircuitBreaker, DailyRiskLimits  # noqa: E402


def cmd_daily(args) -> int:
    cfg = StrategyConfig()
    bus = EventBus(TRADE_DB_PATH.parent / "lab_events.db")
    circuit = CircuitBreaker(
        TRADE_DB_PATH.parent / "lab_circuit.db",
        DailyRiskLimits(),
    )

    client = None
    if not args.no_broker:
        try:
            client = __import__("src.broker.kis_client", fromlist=["KisClient"]).KisClient(KisConfig.from_env())
        except KeyError as e:
            logging.warning("KIS env missing (%s); falling back to --no-broker mode", e)
            client = None

    universe = UniverseAgent(size=cfg.universe_size, min_market_cap_krw=cfg.min_market_cap_krw)
    data = DataAgent(lookback_days=400)
    strategy = StrategyAgent()
    balance = BalanceAgent(client=client)
    risk = RiskAgent(circuit=circuit)
    execution = ExecutionAgent(client=client, dry_run=args.dry_run or client is None)
    performance = PerformanceAgent(circuit=circuit)

    pipeline = Pipeline(
        name="daily",
        agents=[universe, data, strategy, balance, risk, execution, performance],
        halt_on_error=False,
    )
    orchestrator = Orchestrator(bus)
    summary = orchestrator.run(pipeline)
    print(summary.model_dump_json(indent=2))
    return 0 if not summary.errors else 1


def cmd_inspect(args) -> int:
    bus = EventBus(TRADE_DB_PATH.parent / "lab_events.db")
    cycle = bus.get_cycle(args.cycle_id)
    print("CYCLE:", cycle)
    events = bus.query(cycle_id=args.cycle_id, limit=500)
    for e in reversed(events):
        print(f"[{e['ts']}] {e['agent']:>20s} :: {e['payload_type']:<22s} {e['severity']}")
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    p = argparse.ArgumentParser(prog="lab.cli")
    sub = p.add_subparsers(dest="cmd", required=True)

    p_daily = sub.add_parser("daily", help="run daily rebalance cycle")
    p_daily.add_argument("--dry-run", action="store_true")
    p_daily.add_argument("--no-broker", action="store_true", help="skip KIS broker entirely")
    p_daily.set_defaults(func=cmd_daily)

    p_insp = sub.add_parser("inspect", help="show events for a cycle")
    p_insp.add_argument("cycle_id")
    p_insp.set_defaults(func=cmd_inspect)

    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
