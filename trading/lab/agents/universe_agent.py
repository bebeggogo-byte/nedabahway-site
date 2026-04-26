"""UniverseAgent — picks tradeable tickers (시총/거래대금/우선주 제외)."""

from __future__ import annotations

from datetime import datetime

from src.data.universe import build_universe

from ..base import AgentContext, BaseAgent
from ..messages import UniverseSnapshot


class UniverseAgent(BaseAgent):
    name = "universe_curator"

    def __init__(
        self,
        size: int = 50,
        market: str = "KOSPI",
        min_market_cap_krw: float = 5e11,
        min_trading_value_krw: float = 1e9,
    ):
        self.size = size
        self.market = market
        self.min_market_cap_krw = min_market_cap_krw
        self.min_trading_value_krw = min_trading_value_krw

    def run(self, ctx: AgentContext) -> None:
        as_of = datetime.now().strftime("%Y-%m-%d")
        tickers = build_universe(
            as_of,
            size=self.size,
            market=self.market,
            min_market_cap_krw=self.min_market_cap_krw,
            min_trading_value_krw=self.min_trading_value_krw,
        )
        ctx.set("universe", tickers)
        snap = UniverseSnapshot(
            as_of=datetime.now(),
            market=self.market,
            tickers=tickers,
            rationale=f"top {self.size} by market cap, mcap≥{self.min_market_cap_krw:.0f}, trade≥{self.min_trading_value_krw:.0f}",
        )
        self.emit(ctx, "universe_snapshot", snap.model_dump(mode="json"))
