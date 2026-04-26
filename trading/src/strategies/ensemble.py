"""Ensemble Strategy — combines multiple sub-strategies into one target-weights vector.

Two combination modes:
- "weighted_sum": each sub-strategy contributes its weights * sub_weight, sum normalized
- "rank_avg":     average each ticker's rank across strategies, take top_n

PR #14 의 LLM 의회가 활성화되면 sub_weights 를 CIO가 동적으로 결정한다.
PR #15 (이 PR) 에서는 사용자가 명시한 가중치 (기본 균등) 사용.
"""

from __future__ import annotations

from collections import defaultdict
from typing import Iterable

import pandas as pd

from src.strategies.base import Strategy, TargetWeights


class EnsembleStrategy(Strategy):
    name = "ensemble"

    def __init__(
        self,
        strategies: list[Strategy],
        sub_weights: list[float] | None = None,
        mode: str = "weighted_sum",
        top_n: int = 15,
        cash_buffer: float = 0.05,
    ):
        if not strategies:
            raise ValueError("ensemble needs at least one sub-strategy")
        self.strategies = strategies
        if sub_weights is None:
            sub_weights = [1.0 / len(strategies)] * len(strategies)
        if len(sub_weights) != len(strategies):
            raise ValueError("sub_weights length must match strategies")
        s = sum(sub_weights)
        self.sub_weights = [w / s for w in sub_weights] if s > 0 else sub_weights
        if mode not in ("weighted_sum", "rank_avg"):
            raise ValueError(f"unknown mode: {mode}")
        self.mode = mode
        self.top_n = top_n
        self.cash_buffer = cash_buffer

    def _per_strategy_targets(self, prices: pd.DataFrame, as_of: pd.Timestamp) -> list[TargetWeights]:
        return [s.generate_targets(prices, as_of) for s in self.strategies]

    def generate_targets(self, prices: pd.DataFrame, as_of: pd.Timestamp) -> TargetWeights:
        sub_targets = self._per_strategy_targets(prices, as_of)
        as_of = pd.Timestamp(as_of)

        if self.mode == "weighted_sum":
            agg: dict[str, float] = defaultdict(float)
            for w, t in zip(self.sub_weights, sub_targets):
                for ticker, weight in t.weights.items():
                    agg[ticker] += w * weight
            if not agg:
                return TargetWeights(as_of=as_of, weights={})
            target_gross = 1.0 - self.cash_buffer
            total = sum(agg.values())
            scaled = {tk: (v / total) * target_gross for tk, v in agg.items()} if total > 0 else {}
            return TargetWeights(as_of=as_of, weights=scaled)

        ranks: dict[str, list[float]] = defaultdict(list)
        for t in sub_targets:
            sorted_picks = sorted(t.weights.items(), key=lambda x: -x[1])
            n = len(sorted_picks)
            if n == 0:
                continue
            for i, (ticker, _) in enumerate(sorted_picks):
                ranks[ticker].append(1.0 - (i / max(n - 1, 1)))

        if not ranks:
            return TargetWeights(as_of=as_of, weights={})
        avg_rank = {tk: sum(rs) / len(rs) for tk, rs in ranks.items()}
        picks = sorted(avg_rank.items(), key=lambda x: -x[1])[: self.top_n]
        target_gross = 1.0 - self.cash_buffer
        w = target_gross / len(picks)
        return TargetWeights(as_of=as_of, weights={tk: w for tk, _ in picks})

    def per_strategy_breakdown(
        self, prices: pd.DataFrame, as_of: pd.Timestamp
    ) -> dict[str, TargetWeights]:
        targets = self._per_strategy_targets(prices, as_of)
        return {s.name: t for s, t in zip(self.strategies, targets)}
