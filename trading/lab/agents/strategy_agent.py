"""StrategyAgent — runs registered strategies (or ensemble), produces target weights.

PR #15: supports multi-strategy + EnsembleStrategy. Each sub-strategy emits its
own signal event for transparency, plus the final 'active_signal' event.
"""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from src.strategies.base import Strategy
from src.strategies.ensemble import EnsembleStrategy
from src.strategies.low_volatility import LowVolatility
from src.strategies.mean_reversion import MeanReversion
from src.strategies.momentum import CrossSectionalMomentum
from src.strategies.volatility_breakout import VolatilityBreakout

from ..base import AgentContext, BaseAgent
from ..messages import StrategySignal


def default_ensemble() -> EnsembleStrategy:
    """Default 4-strategy ensemble used when no explicit list is provided."""
    return EnsembleStrategy(
        strategies=[
            CrossSectionalMomentum(top_n=10),
            MeanReversion(top_n=10),
            LowVolatility(top_n=10),
            VolatilityBreakout(top_n=8),
        ],
        sub_weights=[0.40, 0.20, 0.25, 0.15],
        mode="weighted_sum",
        top_n=15,
    )


class StrategyAgent(BaseAgent):
    name = "strategy_runner"

    def __init__(self, strategy: Strategy | None = None):
        self.strategy = strategy or default_ensemble()

    def run(self, ctx: AgentContext) -> None:
        prices: pd.DataFrame | None = ctx.get("prices")
        if prices is None or prices.empty:
            self.emit(ctx, "skipped", {"reason": "no prices in ctx"})
            return

        as_of = pd.Timestamp(datetime.now().date())

        per_ticker_attribution: dict[str, dict[str, float]] = {}

        if isinstance(self.strategy, EnsembleStrategy):
            breakdown = self.strategy.per_strategy_breakdown(prices, as_of)
            sub_weight_map = dict(zip([s.name for s in self.strategy.strategies], self.strategy.sub_weights))
            for sub_name, sub_target in breakdown.items():
                sub_sig = StrategySignal(
                    strategy=sub_name,
                    as_of=as_of.to_pydatetime(),
                    target_weights=sub_target.weights,
                    metadata={"role": "sub_strategy"},
                )
                self.emit(ctx, "strategy_signal", sub_sig.model_dump(mode="json"))
                # Build per-ticker attribution from contributions
                sw = sub_weight_map.get(sub_name, 0.0)
                for ticker, w in sub_target.weights.items():
                    per_ticker_attribution.setdefault(ticker, {})
                    per_ticker_attribution[ticker][sub_name] = (
                        per_ticker_attribution[ticker].get(sub_name, 0.0) + sw * w
                    )

            # Normalize per-ticker so each ticker's attribution sums to 1.0
            for ticker, m in per_ticker_attribution.items():
                total = sum(m.values())
                if total > 0:
                    per_ticker_attribution[ticker] = {k: v / total for k, v in m.items()}
        else:
            # Single strategy: 100% attribution
            for ticker in self.strategy.generate_targets(prices, as_of).weights:
                per_ticker_attribution[ticker] = {self.strategy.name: 1.0}

        target = self.strategy.generate_targets(prices, as_of)
        active = StrategySignal(
            strategy=self.strategy.name,
            as_of=as_of.to_pydatetime(),
            target_weights=target.weights,
            metadata={"role": "active", "per_ticker_attribution": per_ticker_attribution},
        )
        self.emit(ctx, "strategy_signal", active.model_dump(mode="json"))

        ctx.set("strategy_attribution", per_ticker_attribution)
        if active.target_weights:
            ctx.set("active_signal", active)
        else:
            self.emit(ctx, "no_active_signal", {"strategy": self.strategy.name})
