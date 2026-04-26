from __future__ import annotations

import pandas as pd

from src.strategies.base import Strategy, TargetWeights


class CrossSectionalMomentum(Strategy):
    """클래식 12-1 모멘텀: 최근 lookback 개월 수익률에서 직전 skip 개월 제외.

    상위 top_n 종목을 동일 비중으로 보유. 음수 모멘텀 종목은 제외.
    """

    name = "xs_momentum"

    def __init__(
        self,
        lookback_months: int = 12,
        skip_recent_months: int = 1,
        top_n: int = 10,
        cash_buffer: float = 0.05,
    ):
        self.lookback_months = lookback_months
        self.skip_recent_months = skip_recent_months
        self.top_n = top_n
        self.cash_buffer = cash_buffer

    def generate_targets(self, prices: pd.DataFrame, as_of: pd.Timestamp) -> TargetWeights:
        as_of = pd.Timestamp(as_of)
        end_date = as_of - pd.DateOffset(months=self.skip_recent_months)
        start_date = as_of - pd.DateOffset(months=self.lookback_months)

        window = prices.loc[(prices.index >= start_date) & (prices.index <= end_date)]
        if window.shape[0] < 20:
            return TargetWeights(as_of=as_of, weights={})

        valid = window.dropna(axis=1, thresh=int(window.shape[0] * 0.9))
        first = valid.iloc[0]
        last = valid.iloc[-1]
        returns = (last / first) - 1.0
        returns = returns.replace([float("inf"), float("-inf")], pd.NA).dropna()
        ranked = returns[returns > 0].sort_values(ascending=False)
        picks = ranked.head(self.top_n).index.tolist()
        if not picks:
            return TargetWeights(as_of=as_of, weights={})

        target_gross = 1.0 - self.cash_buffer
        w = target_gross / len(picks)
        return TargetWeights(as_of=as_of, weights={t: w for t in picks})
