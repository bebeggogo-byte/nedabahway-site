"""CLI entry point for the quant lab.

Usage:
    cd trading
    python -m lab.cli daily              # daily rebalance cycle (with microstructure gate)
    python -m lab.cli daily --dry-run    # no broker calls, no orders
    python -m lab.cli daily --no-broker  # skip broker entirely (offline data-only)
    python -m lab.cli review --start 2020-01-01 --end 2024-12-31  # backtest + 3 critics
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
from lab.agents.cost_skeptic import CostSkeptic  # noqa: E402
from lab.agents.data_agent import DataAgent  # noqa: E402
from lab.agents.execution_agent import ExecutionAgent  # noqa: E402
from lab.agents.microstructure_skeptic import MicrostructureSkeptic  # noqa: E402
from lab.agents.performance_agent import PerformanceAgent  # noqa: E402
from lab.agents.regime_skeptic import RegimeSkeptic  # noqa: E402
from lab.agents.risk_agent import RiskAgent  # noqa: E402
from lab.agents.statistical_skeptic import StatisticalSkeptic  # noqa: E402
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
    microstructure = MicrostructureSkeptic()
    execution = ExecutionAgent(client=client, dry_run=args.dry_run or client is None)
    performance = PerformanceAgent(circuit=circuit)

    pipeline = Pipeline(
        name="daily",
        agents=[universe, data, strategy, balance, risk, microstructure, execution, performance],
        halt_on_error=False,
    )
    orchestrator = Orchestrator(bus)
    summary = orchestrator.run(pipeline)
    print(summary.model_dump_json(indent=2))
    return 0 if not summary.errors else 1


def cmd_review(args) -> int:
    from src.backtest.engine import run_backtest
    from src.data.market_data import load_universe_ohlcv
    from src.data.universe import build_universe
    from src.strategies.momentum import CrossSectionalMomentum

    cfg = StrategyConfig()
    bus = EventBus(TRADE_DB_PATH.parent / "lab_events.db")

    logging.info("building universe @ %s", args.start)
    tickers = build_universe(args.start, size=cfg.universe_size, min_market_cap_krw=cfg.min_market_cap_krw)
    logging.info("loading prices for %d tickers", len(tickers))
    prices = load_universe_ohlcv(tickers, args.start, args.end, field="Close")
    if prices.empty:
        logging.error("no price data")
        return 1

    strat = CrossSectionalMomentum(
        lookback_months=cfg.lookback_months,
        skip_recent_months=cfg.skip_recent_months,
        top_n=cfg.top_n,
    )
    logging.info("running backtest...")
    result = run_backtest(strategy=strat, prices=prices, rebalance_freq=args.rebalance_freq)
    logging.info("backtest stats: %s", result.stats)

    backtest_payload = {
        "strategy": strat.name,
        "equity_curve": result.equity_curve,
        "trades": result.trades,
        "stats": result.stats,
    }

    from lab.base import AgentContext
    from lab.orchestrator import Orchestrator

    pipeline = Pipeline(
        name="backtest_review",
        agents=[StatisticalSkeptic(), RegimeSkeptic(), CostSkeptic()],
        halt_on_error=False,
    )
    orchestrator = Orchestrator(bus)

    cycle_id = f"review-{strat.name}-{__import__('datetime').datetime.utcnow().strftime('%Y%m%dT%H%M%S')}"
    bus.start_cycle(cycle_id, __import__('datetime').datetime.utcnow().isoformat())
    ctx = AgentContext(cycle_id=cycle_id, bus=bus)
    ctx.set("backtest_result", backtest_payload)
    for agent in pipeline.agents:
        agent.safe_run(ctx)
    bus.end_cycle(cycle_id, __import__('datetime').datetime.utcnow().isoformat(), {"strategy": strat.name})

    print("\n=== Backtest Stats ===")
    for k, v in result.stats.items():
        print(f"  {k:>20s}: {v:>10.4f}")

    print("\n=== Critique Reports ===")
    for rep in ctx.get("critiques", []):
        print(f"\n[{rep.critic}] worst={rep.worst_verdict.value.upper()}")
        for f in rep.findings:
            mark = {"pass": "OK", "warn": "WARN", "fail": "FAIL"}[f.verdict.value]
            print(f"  {mark:>5s} {f.metric:<32s} value={f.value!s:<25s}  {f.detail}")

    print(f"\ncycle_id={cycle_id}")
    return 0


def cmd_snapshot(args) -> int:
    from lab.snapshot import export_all
    out = Path(args.output).resolve()
    log_dir = TRADE_DB_PATH.parent
    result = export_all(
        out_dir=out,
        events_db=log_dir / "lab_events.db",
        circuit_db=log_dir / "lab_circuit.db",
    )
    print(f"snapshot written to {out}")
    print(f"  meta:      phase={result['meta']['phase']} agents={result['meta']['agents']['total']}/{result['meta']['agents']['target']}")
    print(f"  latest:    cycle_id={result['latest'].get('cycle_id')}")
    print(f"  equity:    {len(result['equity']['points'])} points")
    print(f"  decisions: {len(result['decisions']['decisions'])}")
    print(f"  critiques: {len(result['critiques']['critiques'])}")
    return 0


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

    p_rev = sub.add_parser("review", help="backtest + statistical/regime/cost critics")
    p_rev.add_argument("--start", default="2020-01-01")
    p_rev.add_argument("--end", default="2024-12-31")
    p_rev.add_argument("--rebalance-freq", default="W-MON")
    p_rev.set_defaults(func=cmd_review)

    p_snap = sub.add_parser("snapshot", help="export JSON snapshot for the dashboard")
    p_snap.add_argument("--output", default="../quant/data", help="output dir (relative to trading/)")
    p_snap.set_defaults(func=cmd_snapshot)

    p_insp = sub.add_parser("inspect", help="show events for a cycle")
    p_insp.add_argument("cycle_id")
    p_insp.set_defaults(func=cmd_inspect)

    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
