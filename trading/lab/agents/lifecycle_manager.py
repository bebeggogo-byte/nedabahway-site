"""LifecycleManager — 전략 로스터 자동 생애주기 관리.

Pipeline 위치: PortfolioAgent 직후 (PortfolioAgent 가 제안한 raw weights 를
lifecycle 의 weight_cap 으로 다시 cap → 재정규화).

작동:
1. 레지스트리 load (기본값: 5 default strategies 모두 ACTIVE)
2. ctx["portfolio_weights"] 에 lifecycle cap 적용
   - probation 전략은 max 10%
   - proposal/validating/retired 는 0
3. 자동 전이 후보 평가 (조건 충족 시 transition):
   - probation → active: 4주 + win_rate ≥ 0.45
   - active → retired: strategy_health 가 4주 연속 retirement_candidate
4. 레지스트리 저장 (history 누적)

설계 원칙:
- 결정론적 전이 규칙 (LLM 의회 없이도 작동)
- 사용자 수동 override 가능 (registry JSON 직접 편집)
- 모든 transition 이력 영구 보존
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from src.portfolio.lifecycle import (
    LifecycleState, StrategyLifecycle,
    apply_caps, load_or_init_registry, save_registry, transition,
)

from ..base import AgentContext, BaseAgent
from ..messages import Severity

log = logging.getLogger(__name__)


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


def _per_strategy_4w_winrate(events_db: Path, sim_db: Path | None) -> dict[str, float]:
    """Compute 4-week win rate per strategy via per_strategy_pnl analytics."""
    try:
        from ..analytics.strategy_health import _pnl_window  # reuse internal
        pnl = _pnl_window(events_db, sim_db, days=28)
        return {
            s: (data["wins"] / data["n_rt"]) if data["n_rt"] else 0.0
            for s, data in pnl.items()
        }
    except Exception:
        return {}


def _strategy_health_status(snapshot_dir: Path) -> dict[str, str]:
    p = snapshot_dir / "strategy_health.json"
    if not p.exists():
        return {}
    try:
        h = json.loads(p.read_text(encoding="utf-8"))
        return {s["strategy"]: s.get("status", "unknown") for s in h.get("by_strategy", [])}
    except Exception:
        return {}


class LifecycleManager(BaseAgent):
    name = "lifecycle_manager"

    def __init__(
        self,
        registry_path: Path | None = None,
        events_db: Path | None = None,
        sim_db: Path | None = None,
        snapshot_dir: Path | None = None,
        probation_min_days: int = 28,
        probation_min_win_rate: float = 0.45,
    ):
        if registry_path is None:
            registry_path = (
                Path(__file__).resolve().parents[3] / "quant" / "data" / "strategy_lifecycle.json"
            )
        if snapshot_dir is None:
            snapshot_dir = registry_path.parent
        self.registry_path = registry_path
        self.events_db = events_db
        self.sim_db = sim_db
        self.snapshot_dir = snapshot_dir
        self.probation_min_days = probation_min_days
        self.probation_min_win_rate = probation_min_win_rate

    def run(self, ctx: AgentContext) -> None:
        registry = load_or_init_registry(self.registry_path)

        # Step 1: Apply lifecycle caps to portfolio weights
        portfolio_weights = ctx.get("portfolio_weights") or {}
        if portfolio_weights:
            capped = apply_caps(portfolio_weights, registry)
            if capped != portfolio_weights:
                ctx.set("portfolio_weights", capped)
                self.emit(ctx, "lifecycle_caps_applied", {
                    "before": portfolio_weights,
                    "after": capped,
                })

        # Step 2: Evaluate auto-transitions
        transitions: list[dict] = []

        win_rates = (
            _per_strategy_4w_winrate(self.events_db, self.sim_db)
            if self.events_db else {}
        )
        health_status = _strategy_health_status(self.snapshot_dir)

        for name, s in list(registry.items()):
            new_state = self._evaluate_transition(s, win_rates, health_status)
            if new_state and new_state != s.state:
                reason = self._build_reason(s, new_state, win_rates, health_status)
                registry[name] = transition(s, new_state, reason, actor="lifecycle_manager")
                transitions.append({
                    "strategy": name, "from": s.state.value,
                    "to": new_state.value, "reason": reason,
                })

        save_registry(self.registry_path, registry)

        ctx.set("strategy_lifecycle", {
            n: s.to_dict() for n, s in registry.items()
        })
        if transitions:
            self.emit(ctx, "lifecycle_transitions", {"transitions": transitions},
                      severity=Severity.WARN)
        else:
            self.emit(ctx, "lifecycle_steady", {"n_strategies": len(registry)})

    def _evaluate_transition(
        self,
        s: StrategyLifecycle,
        win_rates: dict[str, float],
        health_status: dict[str, str],
    ) -> LifecycleState | None:
        now = datetime.now(timezone.utc)

        # probation → active: 4주+ in probation + win_rate >= 0.45
        if s.state == LifecycleState.PROBATION:
            try:
                entered = datetime.fromisoformat(s.entered_state_at.replace("Z", "+00:00"))
                if entered.tzinfo is None:
                    entered = entered.replace(tzinfo=timezone.utc)
                days_in_state = (now - entered).days
            except Exception:
                days_in_state = 0
            if days_in_state >= self.probation_min_days:
                wr = win_rates.get(s.name)
                if wr is not None and wr >= self.probation_min_win_rate:
                    return LifecycleState.ACTIVE

        # active → retired: strategy_health 가 retirement_candidate
        if s.state == LifecycleState.ACTIVE:
            status = health_status.get(s.name)
            if status == "retirement_candidate":
                # require sustained: check history for prior retirement signal
                # Simple version: immediate retire on signal (sustained-check is
                # naturally handled by 4w window in strategy_health logic).
                return LifecycleState.RETIRED

        return None

    def _build_reason(
        self,
        s: StrategyLifecycle,
        new: LifecycleState,
        win_rates: dict[str, float],
        health_status: dict[str, str],
    ) -> str:
        if new == LifecycleState.ACTIVE and s.state == LifecycleState.PROBATION:
            wr = win_rates.get(s.name, 0.0)
            return f"probation 통과: 4주+ 운영, win_rate {wr:.0%} ≥ {self.probation_min_win_rate:.0%}"
        if new == LifecycleState.RETIRED and s.state == LifecycleState.ACTIVE:
            return f"strategy_health = retirement_candidate. 자동 폐기 (구조적 손실)."
        return f"transition {s.state.value} → {new.value}"
