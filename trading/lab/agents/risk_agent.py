"""RiskAgent — sizes positions, applies daily limits, blocks if circuit triggered."""

from __future__ import annotations

from datetime import date

from src.risk.limits import CircuitBreaker, DailyRiskLimits
from src.risk.sizing import compute_orders

from ..base import AgentContext, BaseAgent
from ..messages import OrderIntent, RiskCheckResult, Severity


class RiskAgent(BaseAgent):
    name = "risk_manager"

    def __init__(
        self,
        circuit: CircuitBreaker,
        max_position_pct: float = 0.15,
    ):
        self.circuit = circuit
        self.max_position_pct = max_position_pct

    def run(self, ctx: AgentContext) -> None:
        signal = ctx.get("active_signal")
        balance = ctx.get("balance")
        prices_now = ctx.get("prices_now", {})

        if signal is None or balance is None:
            self.emit(ctx, "skipped", {"reason": "no signal or balance"})
            return

        equity = balance.get("total_eval") or balance.get("cash") or 0
        allowed, reason = self.circuit.can_trade(today=date.today(), current_equity=equity)
        if not allowed:
            self.emit(
                ctx,
                "circuit_blocked",
                {"reason": reason},
                severity=Severity.BLOCK,
            )
            ctx.set("order_intents", [])
            return

        cur_positions = {p["ticker"]: p["qty"] for p in balance.get("positions", [])}

        # Apply regime-based capital scaling (from RegimeAgent if present)
        capital_scale = float(ctx.get("capital_scale", 1.0))
        scaled_target_weights = {t: w * capital_scale for t, w in signal.target_weights.items()}

        intents_raw = compute_orders(
            target_weights=scaled_target_weights,
            current_positions=cur_positions,
            prices=prices_now,
            total_equity=equity,
            max_position_pct=self.max_position_pct,
        )
        attribution = ctx.get("strategy_attribution") or {}
        intents = []
        for i in intents_raw:
            attr = attribution.get(i.ticker, {signal.strategy: 1.0})
            intents.append(OrderIntent(
                ticker=i.ticker,
                side=i.side,
                qty=i.qty,
                target_price=i.target_price,
                order_type="market",
                rationale=f"rebalance to {signal.strategy}",
                attribution=attr,
            ))
        ctx.set("order_intents", intents)
        result = RiskCheckResult(allowed=True, adjusted_intents=intents)
        self.emit(ctx, "risk_check", result.model_dump(mode="json"))
