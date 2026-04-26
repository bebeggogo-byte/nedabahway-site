"""End-to-end integration verification — 27 PR 의 모든 컴포넌트 작동 검증.

목적: 모든 모듈이 import 되고, 모든 에이전트가 인스턴스화되고, snapshot 이
정상 export 되는지 한 번에 확인. CI 또는 개발자가 손으로 돌릴 수 있다.

사용:
    cd trading
    python scripts/verify_integration.py

CI 통합 (선택):
    .github/workflows/quant-lab-daily.yml 에서 daily cycle 실행 전에
    이 스크립트를 호출해 시스템 무결성 사전 확인 가능.
"""

from __future__ import annotations

import sys
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch

# Add trading/ to path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

# Mock pykrx if not available (for environments without market data)
try:
    import pykrx  # type: ignore
except ImportError:
    sys.modules["pykrx"] = MagicMock()
    sys.modules["pykrx.stock"] = MagicMock()


def verify_imports() -> int:
    """All 50+ trading modules import cleanly."""
    modules = [
        # Agents (15)
        "lab.agents.universe_agent", "lab.agents.data_agent",
        "lab.agents.regime_agent", "lab.agents.portfolio_agent",
        "lab.agents.drawdown_defender", "lab.agents.correlation_monitor",
        "lab.agents.lifecycle_manager", "lab.agents.strategy_agent",
        "lab.agents.balance_agent", "lab.agents.risk_agent",
        "lab.agents.microstructure_skeptic", "lab.agents.execution_agent",
        "lab.agents.performance_agent", "lab.agents.anomaly_detector",
        "lab.agents.anomaly_responder",
        # Critics (3 deterministic; microstructure overlaps)
        "lab.agents.statistical_skeptic", "lab.agents.regime_skeptic",
        "lab.agents.cost_skeptic",
        # Brokers (2)
        "src.broker.simulated", "src.broker.kis_client",
        # Strategies (5 + ensemble)
        "src.strategies.momentum", "src.strategies.mean_reversion",
        "src.strategies.low_volatility", "src.strategies.volatility_breakout",
        "src.strategies.quality_value", "src.strategies.ensemble",
        # Portfolio (5 capital/weight modules)
        "src.portfolio.risk_parity", "src.portfolio.drawdown_defense",
        "src.portfolio.correlation", "src.portfolio.lifecycle",
        "src.portfolio.regime_strategies",
        # Monitoring (2)
        "src.monitoring.anomaly", "src.monitoring.playbook",
        # Data sources (3)
        "src.data.regime", "src.data.fundamentals", "src.data.krx_status",
        # Backtest (2)
        "src.backtest.engine", "src.backtest.walk_forward",
        # Risk (1)
        "src.risk.limits",
        # Analytics (4)
        "lab.analytics.per_strategy_pnl", "lab.analytics.strategy_health",
        "lab.analytics.tca", "lab.analytics.strategy_daily_pnl",
        # Reports (2)
        "lab.reports.weekly_report", "lab.reports.daily_brief",
        # Gates (1)
        "lab.gates.phase_transition",
        # Council (4)
        "lab.council.runner", "lab.council.agenda",
        "lab.council.parse_llm_output", "lab.council.meta_autopr",
        # Lab core (4)
        "lab.snapshot", "lab.eventbus", "lab.orchestrator", "lab.cli",
    ]
    errors = []
    for m in modules:
        try:
            __import__(m)
        except Exception as e:
            errors.append(f"{m}: {type(e).__name__}: {e}")

    if errors:
        print(f"❌ {len(errors)} import errors:")
        for e in errors:
            print(f"   {e}")
        return 1
    print(f"✅ ALL {len(modules)} modules import cleanly")
    return 0


def verify_pipeline_assembly() -> int:
    """Daily pipeline 의 15 에이전트가 모두 instantiate."""
    from lab.agents.universe_agent import UniverseAgent
    from lab.agents.data_agent import DataAgent
    from lab.agents.regime_agent import RegimeAgent
    from lab.agents.portfolio_agent import PortfolioAgent
    from lab.agents.drawdown_defender import DrawdownDefender
    from lab.agents.correlation_monitor import CorrelationMonitor
    from lab.agents.lifecycle_manager import LifecycleManager
    from lab.agents.strategy_agent import StrategyAgent
    from lab.agents.balance_agent import BalanceAgent
    from lab.agents.risk_agent import RiskAgent
    from lab.agents.microstructure_skeptic import MicrostructureSkeptic
    from lab.agents.execution_agent import ExecutionAgent
    from lab.agents.performance_agent import PerformanceAgent
    from lab.agents.anomaly_detector import AnomalyDetector
    from lab.agents.anomaly_responder import AnomalyResponder
    from lab.eventbus import EventBus
    from lab.orchestrator import Pipeline
    from src.broker.simulated import SimulatedBroker
    from src.risk.limits import CircuitBreaker, DailyRiskLimits

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        log_dir = td / "logs"
        log_dir.mkdir()
        EventBus(log_dir / "lab_events.db")
        circuit = CircuitBreaker(log_dir / "lab_circuit.db", DailyRiskLimits())

        with patch.object(SimulatedBroker, "_latest_close", lambda self, t: 50000):
            client = SimulatedBroker(log_dir / "sim.db", initial_cash=100_000_000)
            agents = [
                UniverseAgent(size=10),
                DataAgent(lookback_days=200),
                AnomalyResponder(anomalies_path=td / "anomalies.json"),
                RegimeAgent(history_path=td / "regime_history.json"),
                PortfolioAgent(events_db=log_dir / "lab_events.db", sim_db=log_dir / "sim.db"),
                DrawdownDefender(events_db=log_dir / "lab_events.db", history_path=td / "dd.json"),
                CorrelationMonitor(events_db=log_dir / "lab_events.db", sim_db=log_dir / "sim.db", history_path=td / "corr.json"),
                LifecycleManager(registry_path=td / "lifecycle.json", events_db=log_dir / "lab_events.db", sim_db=log_dir / "sim.db", snapshot_dir=td),
                StrategyAgent(),
                BalanceAgent(client=client),
                RiskAgent(circuit=circuit),
                MicrostructureSkeptic(check_krx_status=False),
                ExecutionAgent(client=client, dry_run=True),
                PerformanceAgent(circuit=circuit),
                AnomalyDetector(events_db=log_dir / "lab_events.db", sim_db=log_dir / "sim.db", history_path=td / "anomalies.json"),
            ]
            Pipeline(name="daily", agents=agents, halt_on_error=False)

    print(f"✅ {len(agents)} pipeline agents assemble cleanly")
    return 0


def verify_snapshot_export() -> int:
    """Snapshot 이 빈 DB 에서도 graceful 하게 모든 JSON 생성."""
    from lab.eventbus import EventBus
    from lab.snapshot import export_all
    from src.risk.limits import CircuitBreaker, DailyRiskLimits

    with tempfile.TemporaryDirectory() as td:
        td = Path(td)
        out = td / "data"
        log_dir = td / "logs"
        log_dir.mkdir()
        EventBus(log_dir / "lab_events.db")
        CircuitBreaker(log_dir / "lab_circuit.db", DailyRiskLimits())
        export_all(
            out, log_dir / "lab_events.db", log_dir / "lab_circuit.db",
            sim_state_db=log_dir / "sim.db",
        )
        files = sorted(f.name for f in out.glob("*.json"))

    expected = {
        "meta.json", "latest.json", "equity.json", "decisions.json", "critiques.json",
        "heartbeat.json", "today_plan.json", "recent_trades.json", "attribution.json",
        "per_strategy_pnl.json", "strategy_health.json", "portfolio_weights.json",
        "tca.json",
    }
    missing = expected - set(files)
    if missing:
        print(f"❌ snapshot missing: {missing}")
        return 1
    print(f"✅ snapshot exports {len(expected)} JSON files (empty DB graceful)")
    return 0


def verify_dashboard_seeds() -> int:
    """Dashboard 의 quant/data/ 에 seed JSON 들 존재."""
    expected = [
        "meta.json", "latest.json", "equity.json", "decisions.json", "critiques.json",
        "heartbeat.json", "today_plan.json", "recent_trades.json", "attribution.json",
        "per_strategy_pnl.json", "strategy_health.json", "portfolio_weights.json",
        "tca.json", "anomalies.json", "active_responses.json",
        "regime_history.json", "drawdown_defense.json", "correlation_history.json",
        "strategy_lifecycle.json", "phase-gate.json", "council-latest.json",
    ]
    quant_data = Path(__file__).resolve().parent.parent.parent / "quant" / "data"
    missing = [f for f in expected if not (quant_data / f).exists()]
    if missing:
        print(f"❌ {len(missing)} dashboard seeds missing: {missing[:3]}...")
        return 1
    print(f"✅ all {len(expected)} dashboard seed JSONs present")
    return 0


def verify_workflows() -> int:
    """7 GitHub Actions workflows 존재 및 valid YAML."""
    import yaml
    wf_dir = Path(__file__).resolve().parent.parent.parent / ".github" / "workflows"
    expected = [
        "quant-lab-daily.yml",
        "quant-lab-watchdog.yml",
        "quant-lab-council-weekly.yml",
        "quant-lab-gate-weekly.yml",
        "quant-lab-health-monthly.yml",
        "quant-lab-report-weekly.yml",
        "quant-lab-daily-brief.yml",
    ]
    errors = []
    for fname in expected:
        path = wf_dir / fname
        if not path.exists():
            errors.append(f"{fname} not found")
            continue
        try:
            yaml.safe_load(path.read_text(encoding="utf-8"))
        except Exception as e:
            errors.append(f"{fname}: invalid YAML — {e}")
    if errors:
        print(f"❌ workflow errors:")
        for e in errors:
            print(f"   {e}")
        return 1
    print(f"✅ all {len(expected)} GitHub Actions workflows valid")
    return 0


def verify_llm_prompts() -> int:
    """6 LLM prompts (5 council agents + orchestrator)."""
    prompts_dir = Path(__file__).resolve().parent.parent / "lab" / "prompts"
    expected = ["researcher.md", "cio.md", "cro.md", "cto.md", "meta_optimizer.md", "orchestrator.md"]
    missing = [p for p in expected if not (prompts_dir / p).exists()]
    if missing:
        print(f"❌ prompts missing: {missing}")
        return 1
    print(f"✅ all {len(expected)} LLM prompts present")
    return 0


def main() -> int:
    print("=== 27-PR Integration Verification ===\n")
    checks = [
        ("Imports", verify_imports),
        ("Pipeline assembly", verify_pipeline_assembly),
        ("Snapshot export", verify_snapshot_export),
        ("Dashboard seeds", verify_dashboard_seeds),
        ("Workflows", verify_workflows),
        ("LLM prompts", verify_llm_prompts),
    ]
    failed = 0
    for name, fn in checks:
        print(f"--- {name} ---")
        try:
            rc = fn()
            failed += rc
        except Exception as e:
            print(f"❌ {name} crashed: {type(e).__name__}: {e}")
            failed += 1
        print()

    if failed:
        print(f"❌ {failed} checks failed")
        return 1
    print("🎯 ALL 6 INTEGRATION CHECKS PASSED — 시스템 작동 검증 완료")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
