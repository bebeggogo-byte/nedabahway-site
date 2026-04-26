"""Low Volatility Strategy — long the lowest-vol names.

Premise (well documented anomaly): low-vol stocks have historically delivered
risk-adjusted returns at least as good as high-vol, with much smaller drawdowns.
Adds defensive ballast to a momentum-heavy book.

Long-only, equal-weight, weekly rebalance.
"""

from __future__ import annotations

import pandas as pd

from src.strategies.base import Strategy, TargetWeights


class LowVolatility(Strategy):
    name = "low_volatility"

    def __init__(
        self,
        vol_window: int = 60,
        top_n: int = 10,
        cash_buffer: float = 0.05,
        require_positive_return: bool = True,
        return_window: int = 60,
    ):
        self.vol_window = vol_window
        self.top_n = top_n
        self.cash_buffer = cash_buffer
        self.require_positive_return = require_positive_return
        self.return_window = return_window

    def generate_targets(self, prices: pd.DataFrame, as_of: pd.Timestamp) -> TargetWeights:
        as_of = pd.Timestamp(as_of)
        end = as_of - pd.Timedelta(days=1)
        start = end - pd.Timedelta(days=max(self.vol_window, self.return_window) * 2)
        window = prices.loc[(prices.index >= start) & (prices.index <= end)]
        if window.shape[0] < self.vol_window:
            return TargetWeights(as_of=as_of, weights={})

        valid = window.dropna(axis=1, thresh=int(window.shape[0] * 0.9))
        rets = valid.pct_change().dropna(how="all")
        vols = rets.tail(self.vol_window).std().dropna()
        ranked = vols.sort_values()  # ascending = lowest vol first

        if self.require_positive_return:
            past_ret = (valid.iloc[-1] / valid.iloc[-self.return_window] - 1).dropna()
            ranked = ranked[ranked.index.isin(past_ret[past_ret > 0].index)]

        picks = ranked.head(self.top_n).index.tolist()
        if not picks:
            return TargetWeights(as_of=as_of, weights={})

        target_gross = 1.0 - self.cash_buffer
        w = target_gross / len(picks)
        return TargetWeights(as_of=as_of, weights={t: w for t in picks})
