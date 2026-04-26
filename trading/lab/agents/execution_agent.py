"""ExecutionAgent — submits orders via KIS (paper) and reports fills."""

from __future__ import annotations

from src.broker.kis_client import KisClient

from ..base import AgentContext, BaseAgent
from ..messages import ExecutionReport, OrderIntent, Severity


class ExecutionAgent(BaseAgent):
    name = "execution_trader"

    def __init__(self, client: KisClient, dry_run: bool = False):
        self.client = client
        self.dry_run = dry_run

    def run(self, ctx: AgentContext) -> None:
        intents: list[OrderIntent] = ctx.get("order_intents", [])
        if not intents:
            self.emit(ctx, "no_orders", {})
            return

        # AnomalyResponder may have requested a halt for this cycle
        if ctx.get("halt_new_orders"):
            self.emit(ctx, "halt_by_playbook", {
                "n_intents_blocked": len(intents),
                "reason": "AnomalyResponder halt_new_orders flag",
            }, severity=Severity.WARN)
            ctx.set("execution_reports", [])
            ctx.set("blocked_intents", intents)
            return

        reports: list[ExecutionReport] = []
        for intent in intents:
            if self.dry_run:
                rep = ExecutionReport(intent=intent, success=True, broker_order_id="DRY")
                reports.append(rep)
                self.emit(ctx, "execution_report", rep.model_dump(mode="json"))
                continue

            try:
                kis_order_type = "01" if intent.order_type == "market" else "00"
                # SimulatedBroker accepts attribution; KisClient ignores extra kwargs gracefully
                place_kwargs = {
                    "ticker": intent.ticker,
                    "qty": intent.qty,
                    "side": intent.side,
                    "price": intent.target_price if intent.order_type == "limit" else 0,
                    "order_type": kis_order_type,
                }
                if intent.attribution and "attribution" in self.client.place_order.__code__.co_varnames:
                    place_kwargs["attribution"] = intent.attribution
                result = self.client.place_order(**place_kwargs)
                rep = ExecutionReport(
                    intent=intent,
                    success=result.success,
                    broker_order_id=result.order_id,
                    error=None if result.success else (result.raw.get("msg1") or "unknown"),
                )
            except Exception as e:
                rep = ExecutionReport(intent=intent, success=False, error=str(e))

            reports.append(rep)
            severity = Severity.INFO if rep.success else Severity.ERROR
            self.emit(ctx, "execution_report", rep.model_dump(mode="json"), severity=severity)

        ctx.set("execution_reports", reports)
