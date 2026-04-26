from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass

import pandas as pd


@dataclass
class TargetWeights:
    """리밸런싱 시점에 도달하고자 하는 목표 비중. ticker -> weight (sum<=1)."""

    as_of: pd.Timestamp
    weights: dict[str, float]


class Strategy(ABC):
    name: str

    @abstractmethod
    def generate_targets(self, prices: pd.DataFrame, as_of: pd.Timestamp) -> TargetWeights:
        """과거 가격 패널로부터 as_of 시점의 목표 비중을 산출.

        Args:
            prices: index=Date, cols=ticker, values=Adj/Close. as_of 이전 데이터만 써야 함.
            as_of: 신호 산출 시점 (이 시점 종가 기준 데이터까지 사용).
        """
