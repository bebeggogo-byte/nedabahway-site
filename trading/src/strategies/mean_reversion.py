"""Mean Reversion Strategy — z-score based.

Premise: short-term overreactions in liquid stocks revert. Long the most
oversold names, equal-weighted, hold for ~1 week, replace at next rebalance.

Counter-trend to momentum → adding both improves diversification when
correlations between them are low (typically 0.2~0.4 in KR mid-large caps).
"""

from __future__ import annotations

import pandas as pd

from src.strategies.base import Strategy, TargetWeights


class MeanReversion(Strategy):
    name = "mean_reversion"

    def __init__(
        self,
        lookback_days: int = 20,
        zscore_threshold: float = -1.5,
        top_n: int = 10,
        cash_buffer: float = 0.05,
    ):
        self.lookback_days = lookback_days
        self.zscore_threshold = zscore_threshold
        self.top_n = top_n
        self.cash_buffer = cash_buffer

    def generate_targets(self, prices: pd.DataFrame, as_of: pd.Timestamp) -> TargetWeights:
        as_of = pd.Timestamp(as_of)
        end = as_of - pd.Timedelta(days=1)
        start = end - pd.Timedelta(days=self.lookback_days * 2)

        window = prices.loc[(prices.index >= start) & (prices.index <= end)]
        if window.shape[0] < self.lookback_days:
            return TargetWeights(as_of=as_of, weights={})

        valid = window.dropna(axis=1, thresh=int(window.shape[0] * 0.9))
        if valid.shape[1] == 0:
            return TargetWeights(as_of=as_of, weights={})

        recent = valid.tail(self.lookback_days)
        mean = recent.mean()
        std = recent.std()
        last = recent.iloc[-1]
        zscore = (last - mean) / std.replace(0, pd.NA)
        zscore = zscore.dropna()

        oversold = zscore[zscore <= self.zscore_threshold].sort_values()
        picks = oversold.head(self.top_n).index.tolist()
        if not picks:
            return TargetWeights(as_of=as_of, weights={})

        target_gross = 1.0 - self.cash_buffer
        w = target_gross / len(picks)
        return TargetWeights(as_of=as_of, weights={t: w for t in picks})
