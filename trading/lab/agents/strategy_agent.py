"""StrategyAgent — runs registered strategies, produces target weights.

PR #2: only momentum (Strategy v1, merged from PR #8). Plug-in design so
PR #3+ can add new strategies via constructor without touching the agent.
"""

from __future__ import annotations

from datetime import datetime

import pandas as pd

from src.strategies.base import Strategy
from src.strategies.momentum import CrossSectionalMomentum

from ..base import AgentContext, BaseAgent
from ..messages import StrategySignal


class StrategyAgent(BaseAgent):
    name = "strategy_runner"

    def __init__(self, strategies: list[Strategy] | None = None):
        self.strategies = strategies or [CrossSectionalMomentum()]

    def run(self, ctx: AgentContext) -> None:
        prices: pd.DataFrame | None = ctx.get("prices")
        if prices is None or prices.empty:
            self.emit(ctx, "skipped", {"reason": "no prices in ctx"})
            return

        signals: list[StrategySignal] = []
        as_of = pd.Timestamp(datetime.now().date())
        for strat in self.strategies:
            target = strat.generate_targets(prices, as_of)
            sig = StrategySignal(
                strategy=strat.name,
                as_of=as_of.to_pydatetime(),
                target_weights=target.weights,
            )
            signals.append(sig)
            self.emit(ctx, "strategy_signal", sig.model_dump(mode="json"))

        # PR #2: single-strategy mode — just take the first non-empty signal.
        # PR #3+ : ensemble agent will combine multiple signals.
        active = next((s for s in signals if s.target_weights), None)
        if active:
            ctx.set("active_signal", active)
        else:
            self.emit(ctx, "no_active_signal", {"strategies": [s.strategy for s in signals]})
