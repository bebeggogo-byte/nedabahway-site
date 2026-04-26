"""PortfolioAgent — risk parity 동적 sub_weights.

Pipeline 위치: Universe → Data → Regime → **Portfolio** → Strategy → ...

ctx 출력:
- ctx["portfolio_weights"]: dict[strategy_name, weight]  (동적 가중치)
- ctx["portfolio_method"]: "inverse_vol" | "fallback_equal" | "fallback_static"

Cold start 시 (실집행 이력 부족) fallback_weights 사용. StrategyAgent 가
ctx["portfolio_weights"] 가 있으면 ensemble.sub_weights 동적 override.
"""

from __future__ import annotations

import logging
from pathlib import Path

from src.portfolio.risk_parity import compute_risk_parity_weights

from ..analytics.strategy_daily_pnl import compute_daily_pnl_by_strategy
from ..base import AgentContext, BaseAgent

log = logging.getLogger(__name__)


class PortfolioAgent(BaseAgent):
    name = "portfolio_allocator"

    def __init__(
        self,
        events_db: Path,
        sim_db: Path | None,
        lookback_days: int = 90,
        min_history_days: int = 30,
        min_weight: float = 0.05,
        max_weight: float = 0.40,
        fallback_weights: dict[str, float] | None = None,
    ):
        self.events_db = events_db
        self.sim_db = sim_db
        self.lookback_days = lookback_days
        self.min_history_days = min_history_days
        self.min_weight = min_weight
        self.max_weight = max_weight
        # static defaults (matches default_ensemble in strategy_agent.py)
        self.fallback_weights = fallback_weights or {
            "xs_momentum": 0.30,
            "mean_reversion": 0.15,
            "low_volatility": 0.20,
            "volatility_breakout": 0.15,
            "quality_value": 0.20,
        }

    def run(self, ctx: AgentContext) -> None:
        try:
            daily = compute_daily_pnl_by_strategy(
                self.events_db, self.sim_db, lookback_days=self.lookback_days
            )
        except Exception as e:
            self.emit(ctx, "portfolio_compute_failed", {"error": str(e)})
            ctx.set("portfolio_weights", self.fallback_weights)
            ctx.set("portfolio_method", "fallback_static")
            return

        result = compute_risk_parity_weights(
            daily_pnl_by_strategy=daily,
            min_history_days=self.min_history_days,
            min_weight=self.min_weight,
            max_weight=self.max_weight,
            fallback_weights=self.fallback_weights,
        )
        ctx.set("portfolio_weights", result.weights)
        ctx.set("portfolio_method", result.method)
        ctx.set("portfolio_realized_vols", result.realized_vols)

        self.emit(ctx, "portfolio_weights", {
            "method": result.method,
            "n_eligible": result.n_eligible,
            "weights": result.weights,
            "realized_vols": result.realized_vols,
            "rationale": result.rationale,
        })
