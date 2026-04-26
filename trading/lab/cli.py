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


def _resolve_broker(args, log_dir: Path):
    """Decide which broker to use and return (client, mode_label)."""
    from src.broker.simulated import SimulatedBroker

    if args.no_broker:
        return None, "no-broker (data-only)"

    if not args.simulate:
        try:
            from src.broker.kis_client import KisClient
            return KisClient(KisConfig.from_env()), "KIS paper"
        except KeyError as e:
            logging.info("KIS env missing (%s); using SimulatedBroker", e)

    sim = SimulatedBroker(
        state_db_path=log_dir / "lab_sim_state.db",
        initial_cash=100_000_000,
    )
    return sim, "simulated (pykrx prices)"


def cmd_daily(args) -> int:
    cfg = StrategyConfig()
    log_dir = TRADE_DB_PATH.parent
    bus = EventBus(log_dir / "lab_events.db")
    circuit = CircuitBreaker(log_dir / "lab_circuit.db", DailyRiskLimits())

    client, mode = _resolve_broker(args, log_dir)
    logging.info("broker mode: %s", mode)

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

    # Persist backtest baseline so the Phase 3 gate can measure realized vs backtest gap
    import json as _json, datetime as _dt
    baseline_path = TRADE_DB_PATH.parent.parent.parent / "quant" / "data" / "backtest_baseline.json"
    baseline_path.parent.mkdir(parents=True, exist_ok=True)
    baseline_path.write_text(_json.dumps({
        "updated_at": _dt.datetime.utcnow().isoformat(),
        "strategy": strat.name,
        "period": {"start": args.start, "end": args.end, "rebalance_freq": args.rebalance_freq},
        "stats": result.stats,
    }, indent=2, ensure_ascii=False, default=str))
    print(f"baseline -> {baseline_path}")
    return 0


def cmd_council(args) -> int:
    from lab.council.runner import run_council_dryrun
    log_dir = TRADE_DB_PATH.parent
    out = Path(args.output).resolve()
    prompts_dir = (Path(__file__).resolve().parent / "prompts")
    record = run_council_dryrun(
        prompts_dir=prompts_dir,
        council_out_dir=out,
        events_db=log_dir / "lab_events.db",
        circuit_db=log_dir / "lab_circuit.db",
        include_meta=args.include_meta,
    )
    print(f"council dry-run done: {len(record['responses'])} agents simulated")
    print(f"agenda: {record['agenda']}")
    return 0


def cmd_report(args) -> int:
    log_dir = TRADE_DB_PATH.parent
    snapshot_dir = log_dir.parent.parent / "quant" / "data"
    if args.type == "daily":
        from lab.reports.daily_brief import write_daily_brief
        path = write_daily_brief(
            events_db=log_dir / "lab_events.db",
            sim_db=log_dir / "lab_sim_state.db",
            snapshot_dir=snapshot_dir,
        )
        print(f"daily brief: {path}")
        return 0
    from lab.reports.weekly_report import write_weekly_report
    path = write_weekly_report(
        events_db=log_dir / "lab_events.db",
        sim_db=log_dir / "lab_sim_state.db",
        snapshot_dir=snapshot_dir,
    )
    print(f"weekly report: {path}")
    return 0


def cmd_walk_forward(args) -> int:
    import json as _json
    from src.backtest.walk_forward import run_walk_forward
    from src.data.market_data import load_universe_ohlcv
    from src.data.universe import build_universe
    from src.strategies.momentum import CrossSectionalMomentum

    cfg = StrategyConfig()
    logging.info("building universe @ %s", args.start)
    tickers = build_universe(args.start, size=cfg.universe_size, min_market_cap_krw=cfg.min_market_cap_krw)
    logging.info("loading prices for %d tickers", len(tickers))
    prices = load_universe_ohlcv(tickers, args.start, args.end, field="Close")
    if prices.empty:
        logging.error("no price data")
        return 1

    report = run_walk_forward(
        strategy_factory=lambda: CrossSectionalMomentum(top_n=cfg.top_n, lookback_months=cfg.lookback_months, skip_recent_months=cfg.skip_recent_months),
        prices=prices,
        train_months=args.train_months,
        test_months=args.test_months,
        step_months=args.step_months,
        rebalance_freq=args.rebalance_freq,
    )
    print(f"\n=== Walk-Forward Report: {report.strategy_name} ===")
    print(f"windows: {len(report.windows)}")
    for w in report.windows:
        s = w.stats
        print(f"  {w.test_start.date()} → {w.test_end.date()}: "
              f"SR={s.get('sharpe', 0):>5.2f}  "
              f"CAGR={s.get('CAGR', 0)*100:>+6.1f}%  "
              f"MDD={s.get('max_drawdown', 0)*100:>+6.1f}%")
    print(f"\nAggregate:")
    for k, v in sorted(report.aggregate_stats.items()):
        if isinstance(v, float):
            print(f"  {k:>22s}: {v:>+10.4f}")
        else:
            print(f"  {k:>22s}: {v}")

    out = TRADE_DB_PATH.parent.parent.parent / "quant" / "data" / "walk_forward.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(_json.dumps(report.to_dict(), indent=2, ensure_ascii=False, default=str))
    print(f"\nreport -> {out}")
    return 0


def cmd_health(args) -> int:
    from lab.analytics.strategy_health import write_strategy_health
    log_dir = TRADE_DB_PATH.parent
    out = Path(args.output).resolve()
    data = write_strategy_health(out, log_dir / "lab_events.db", log_dir / "lab_sim_state.db")
    print(f"strategy health written. {data['n_total']} strategies, {data['n_candidates']} retirement candidates")
    for s in data["by_strategy"]:
        print(f"  {s['strategy']:>22s}: {s['status']:<22s} {s['recommended_action']:<14s} pnl_4w={s['pnl_4w']:>+10,} win={s['win_rate_8w']*100:>3.0f}%")
    return 0 if data["n_candidates"] == 0 else 1


def cmd_gate(args) -> int:
    from lab.gates.phase_transition import evaluate_gate, write_gate_report
    log_dir = TRADE_DB_PATH.parent
    out = Path(args.output).resolve()
    report = evaluate_gate(
        events_db=log_dir / "lab_events.db",
        circuit_db=log_dir / "lab_circuit.db",
        sim_state_db=log_dir / "lab_sim_state.db",
    )
    path = write_gate_report(report, out)
    print(f"phase-gate written to {path}")
    print(f"  paper_days: {report.paper_days}")
    print(f"  passed:     {report.n_passed} / {len(report.criteria)}")
    print(f"  all_passed: {report.all_passed}")
    for c in report.criteria:
        mark = "OK" if c.passed else "--"
        print(f"  [{mark}] {c.label:<30s} measured={c.measured:<20s} threshold={c.threshold}")
    return 0 if report.all_passed else 1


def cmd_snapshot(args) -> int:
    from lab.snapshot import export_all
    out = Path(args.output).resolve()
    log_dir = TRADE_DB_PATH.parent
    result = export_all(
        out_dir=out,
        events_db=log_dir / "lab_events.db",
        circuit_db=log_dir / "lab_circuit.db",
        sim_state_db=log_dir / "lab_sim_state.db",
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
    p_daily.add_argument("--dry-run", action="store_true", help="don't actually submit orders")
    p_daily.add_argument("--no-broker", action="store_true", help="skip broker entirely (data + signals only)")
    p_daily.add_argument("--simulate", action="store_true", help="force SimulatedBroker (default if no KIS env)")
    p_daily.set_defaults(func=cmd_daily)

    p_rev = sub.add_parser("review", help="backtest + statistical/regime/cost critics")
    p_rev.add_argument("--start", default="2020-01-01")
    p_rev.add_argument("--end", default="2024-12-31")
    p_rev.add_argument("--rebalance-freq", default="W-MON")
    p_rev.set_defaults(func=cmd_review)

    p_wf = sub.add_parser("walk-forward", help="walk-forward backtest (rigorous OOS)")
    p_wf.add_argument("--start", default="2018-01-01")
    p_wf.add_argument("--end", default="2024-12-31")
    p_wf.add_argument("--train-months", type=int, default=24)
    p_wf.add_argument("--test-months", type=int, default=6)
    p_wf.add_argument("--step-months", type=int, default=6)
    p_wf.add_argument("--rebalance-freq", default="W-MON")
    p_wf.set_defaults(func=cmd_walk_forward)

    p_snap = sub.add_parser("snapshot", help="export JSON snapshot for the dashboard")
    p_snap.add_argument("--output", default="../quant/data", help="output dir (relative to trading/)")
    p_snap.set_defaults(func=cmd_snapshot)

    p_council = sub.add_parser("council", help="run weekly LLM council (dry-run by default)")
    p_council.add_argument("--include-meta", action="store_true", help="include monthly Meta-Optimizer agent")
    p_council.add_argument("--output", default="../quant/data/council", help="output dir for council records")
    p_council.set_defaults(func=cmd_council)

    p_gate = sub.add_parser("gate", help="evaluate Phase 2 → 3 transition criteria")
    p_gate.add_argument("--output", default="../quant/data", help="output dir for phase-gate.json")
    p_gate.set_defaults(func=cmd_gate)

    p_health = sub.add_parser("health", help="evaluate per-strategy health (4w/8w P&L, win rate)")
    p_health.add_argument("--output", default="../quant/data", help="output dir")
    p_health.set_defaults(func=cmd_health)

    p_report = sub.add_parser("report", help="generate human-readable markdown report")
    p_report.add_argument("type", choices=["weekly", "daily"], default="weekly", nargs="?")
    p_report.set_defaults(func=cmd_report)

    p_insp = sub.add_parser("inspect", help="show events for a cycle")
    p_insp.add_argument("cycle_id")
    p_insp.set_defaults(func=cmd_inspect)

    args = p.parse_args()
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
