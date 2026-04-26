"""Volatility Breakout — Larry Williams style 일중 단타.

매일 09:00 시초가 + (전일 고가 - 전일 저가) × K 돌파 시 매수, 15:15 청산.

본 클래스는 *Strategy* 인터페이스에 맞추어 "다음 거래일 종가 기준 목표 비중"
을 산출하는 daily 모드와, 시초가/돌파 신호를 위한 헬퍼를 함께 제공한다.

페이퍼 daily 사이클에서는 daily 모드를 쓰고, 추후 인트라데이 사이클(09:01 cron)이
별도로 만들어지면 compute_intraday_targets 를 사용한다.
"""

from __future__ import annotations

from dataclasses import dataclass

import pandas as pd

from src.strategies.base import Strategy, TargetWeights


@dataclass
class IntradayTarget:
    ticker: str
    target_price: int
    yesterday_range: float


class VolatilityBreakout(Strategy):
    name = "volatility_breakout"

    def __init__(
        self,
        k: float = 0.55,
        top_n: int = 8,
        cash_buffer: float = 0.10,
        require_uptrend_filter: bool = True,
        ma_window: int = 20,
    ):
        self.k = k
        self.top_n = top_n
        self.cash_buffer = cash_buffer
        self.require_uptrend_filter = require_uptrend_filter
        self.ma_window = ma_window

    def generate_targets(self, prices: pd.DataFrame, as_of: pd.Timestamp) -> TargetWeights:
        """Daily 모드: 직전 5일 평균 변동성 상위 + 추세 필터 통과 종목 균등.

        실제 entry/exit 가격은 인트라데이 cron 에서 결정되지만, daily 사이클 안에서
        '오늘 어떤 종목들에 변동성 돌파를 시도할 것인가'를 universe 로 좁혀준다.
        """
        as_of = pd.Timestamp(as_of)
        end = as_of - pd.Timedelta(days=1)
        start = end - pd.Timedelta(days=max(self.ma_window, 10) * 2)
        window = prices.loc[(prices.index >= start) & (prices.index <= end)]
        if window.shape[0] < 10:
            return TargetWeights(as_of=as_of, weights={})

        valid = window.dropna(axis=1, thresh=int(window.shape[0] * 0.9))
        if valid.shape[1] == 0:
            return TargetWeights(as_of=as_of, weights={})

        rets = valid.pct_change().dropna(how="all")
        recent_vol = rets.tail(5).std()
        recent_vol = recent_vol.dropna().sort_values(ascending=False)

        ranked = recent_vol.index.tolist()

        if self.require_uptrend_filter and len(valid) >= self.ma_window:
            ma = valid.rolling(self.ma_window).mean().iloc[-1]
            last = valid.iloc[-1]
            up = (last > ma)
            ranked = [t for t in ranked if bool(up.get(t, False))]

        picks = ranked[: self.top_n]
        if not picks:
            return TargetWeights(as_of=as_of, weights={})

        target_gross = 1.0 - self.cash_buffer
        w = target_gross / len(picks)
        return TargetWeights(as_of=as_of, weights={t: w for t in picks})

    def compute_intraday_targets(
        self, ohlc_yesterday: pd.DataFrame, opens_today: pd.Series
    ) -> list[IntradayTarget]:
        """09:00 시초가 확정 후 호출. target_price = open + K*(H-L)."""
        targets: list[IntradayTarget] = []
        for ticker in opens_today.index:
            if ticker not in ohlc_yesterday.index:
                continue
            row = ohlc_yesterday.loc[ticker]
            yest_range = float(row["High"] - row["Low"])
            if yest_range <= 0:
                continue
            target_px = int(round(opens_today[ticker] + self.k * yest_range))
            targets.append(IntradayTarget(ticker=ticker, target_price=target_px, yesterday_range=yest_range))
        return targets
