"""DataAgent — fetches & caches OHLCV for the universe."""

from __future__ import annotations

from datetime import datetime, timedelta

import pandas as pd

from src.data.market_data import load_universe_ohlcv

from ..base import AgentContext, BaseAgent
from ..messages import PriceFrameRef


class DataAgent(BaseAgent):
    name = "data_engineer"

    def __init__(self, lookback_days: int = 400, field: str = "Close"):
        self.lookback_days = lookback_days
        self.field = field

    def run(self, ctx: AgentContext) -> None:
        universe = ctx.get("universe")
        if not universe:
            self.emit(ctx, "skipped", {"reason": "no universe in ctx"})
            return

        end = datetime.now()
        start = end - timedelta(days=self.lookback_days)
        prices = load_universe_ohlcv(
            universe, start.strftime("%Y-%m-%d"), end.strftime("%Y-%m-%d"), field=self.field
        )
        ctx.set("prices", prices)
        ref = PriceFrameRef(
            cache_key=f"{self.field}-{start.date()}-{end.date()}",
            fields=[self.field],
            start=start,
            end=end,
            n_tickers=prices.shape[1] if not prices.empty else 0,
            n_rows=prices.shape[0] if not prices.empty else 0,
        )
        self.emit(ctx, "price_frame_loaded", ref.model_dump(mode="json"))
