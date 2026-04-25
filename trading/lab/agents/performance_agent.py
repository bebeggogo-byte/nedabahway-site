"""PerformanceAgent — records daily equity snapshot, computes realized P&L."""

from __future__ import annotations

from datetime import date

from src.risk.limits import CircuitBreaker

from ..base import AgentContext, BaseAgent


class PerformanceAgent(BaseAgent):
    name = "performance_analyst"

    def __init__(self, circuit: CircuitBreaker):
        self.circuit = circuit

    def run(self, ctx: AgentContext) -> None:
        balance = ctx.get("balance")
        if not balance:
            self.emit(ctx, "skipped", {"reason": "no balance"})
            return

        ending_equity = balance.get("total_eval") or balance.get("cash") or 0
        starting_equity = ctx.get("starting_equity", ending_equity)

        pnl, pnl_pct = self.circuit.record_daily(
            trade_date=date.today(),
            starting_equity=starting_equity,
            ending_equity=ending_equity,
        )
        self.emit(
            ctx,
            "daily_pnl",
            {
                "date": date.today().isoformat(),
                "starting_equity": starting_equity,
                "ending_equity": ending_equity,
                "pnl": pnl,
                "pnl_pct": pnl_pct,
            },
        )
