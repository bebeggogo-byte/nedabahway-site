"""BalanceAgent — fetches account balance & current quotes for tickers in scope."""

from __future__ import annotations

from src.broker.kis_client import KisClient

from ..base import AgentContext, BaseAgent


class BalanceAgent(BaseAgent):
    name = "balance_fetcher"

    def __init__(self, client: KisClient | None = None):
        self.client = client

    def run(self, ctx: AgentContext) -> None:
        if self.client is None:
            self.emit(ctx, "skipped", {"reason": "no broker client (LLM-key-free mode)"})
            ctx.set("balance", {"cash": 0, "total_eval": 0, "positions": []})
            ctx.set("prices_now", {})
            return

        bal = self.client.get_balance()
        ctx.set("balance", bal)
        self.emit(
            ctx,
            "balance_snapshot",
            {"cash": bal["cash"], "total_eval": bal["total_eval"], "n_positions": len(bal["positions"])},
        )

        signal = ctx.get("active_signal")
        target_tickers = set(signal.target_weights.keys()) if signal else set()
        held_tickers = {p["ticker"] for p in bal.get("positions", [])}
        prices_now: dict[str, int] = {}
        for t in target_tickers | held_tickers:
            try:
                prices_now[t] = self.client.get_current_price(t)
            except Exception as e:
                self.emit(ctx, "price_fetch_failed", {"ticker": t, "error": str(e)})
        ctx.set("prices_now", prices_now)
