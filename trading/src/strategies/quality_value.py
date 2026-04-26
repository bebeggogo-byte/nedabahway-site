"""Quality-Value Strategy — 한국주식 클래식 팩터 (저PBR + 고ROE).

학술 논문 (Fama-French Quality, Asness Quality-Minus-Junk) 에서 가장 검증된
fundamental factor. 한국시장에서도 (저PBR · 고ROE) 결합이 단일 팩터보다 안정적.

작동:
1. 매주 리밸런싱 시점에 fundamentals snapshot 가져옴
2. quality_value_score 로 각 종목 점수 (z(ROE) - z(PBR))
3. 점수 상위 N개 동일 비중 long
4. fundamentals 데이터가 없으면 빈 weights (graceful, ensemble 영향 0)
"""

from __future__ import annotations

import logging

import pandas as pd

from src.data.fundamentals import quality_value_score
from src.strategies.base import Strategy, TargetWeights

log = logging.getLogger(__name__)


class QualityValue(Strategy):
    name = "quality_value"

    def __init__(
        self,
        top_n: int = 10,
        cash_buffer: float = 0.05,
        min_pbr: float = 0.3,
        market: str = "KOSPI",
    ):
        self.top_n = top_n
        self.cash_buffer = cash_buffer
        self.min_pbr = min_pbr
        self.market = market

    def generate_targets(self, prices: pd.DataFrame, as_of: pd.Timestamp) -> TargetWeights:
        as_of = pd.Timestamp(as_of)
        as_of_str = as_of.strftime("%Y-%m-%d")

        # Restrict to tickers in current price universe
        if prices.empty:
            return TargetWeights(as_of=as_of, weights={})
        universe = set(prices.columns)

        try:
            scored = quality_value_score(as_of_str, market=self.market, min_pbr=self.min_pbr)
        except Exception as e:
            log.warning("QualityValue score failed: %s", e)
            return TargetWeights(as_of=as_of, weights={})

        if scored.empty:
            return TargetWeights(as_of=as_of, weights={})

        # Filter to price-universe
        scored = scored[scored.index.isin(universe)]
        if scored.empty:
            return TargetWeights(as_of=as_of, weights={})

        picks = scored.sort_values("score", ascending=False).head(self.top_n).index.tolist()
        if not picks:
            return TargetWeights(as_of=as_of, weights={})

        target_gross = 1.0 - self.cash_buffer
        w = target_gross / len(picks)
        return TargetWeights(as_of=as_of, weights={t: w for t in picks})
