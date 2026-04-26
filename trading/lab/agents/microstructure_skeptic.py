"""Microstructure Skeptic — live pre-trade gate.

Sits between RiskAgent and ExecutionAgent in the daily pipeline.
Can BLOCK individual order intents (mutates ctx['order_intents']) when:

1. **Tick size violation** — target_price not aligned to KRX tick grid.
2. **Liquidity** — order qty × price > X% of recent avg trading value.
3. **Stale price** — current_price diverges > Y% from yesterday's close.
4. **Universe sanity** — ticker not in current universe (defensive).

Unlike the backtest critics, this one runs every cycle and is mutating.
"""

from __future__ import annotations

import logging

from src.risk.sizing import round_to_tick, tick_size

from ..base import AgentContext, BaseAgent
from ..messages import Critique, CritiqueReport, OrderIntent, Severity, Verdict

log = logging.getLogger(__name__)


class MicrostructureSkeptic(BaseAgent):
    name = "microstructure_skeptic"

    def __init__(
        self,
        max_order_pct_of_volume: float = 0.05,
        max_price_drift_pct: float = 0.30,
        check_krx_status: bool = True,
    ):
        self.max_order_pct_of_volume = max_order_pct_of_volume
        self.max_price_drift_pct = max_price_drift_pct
        self.check_krx_status = check_krx_status

    def _check_intent(
        self,
        intent: OrderIntent,
        prices: dict[str, int],
        prev_close: dict[str, int],
        avg_trading_value: dict[str, float],
        universe: set[str],
        krx_blocked: set[str],
    ) -> tuple[bool, list[Critique]]:
        findings: list[Critique] = []
        target = f"live:order_intent:{intent.ticker}"

        if intent.ticker in krx_blocked:
            findings.append(Critique(
                critic=self.name, target=target, verdict=Verdict.FAIL,
                metric="krx_status", value="blocked",
                detail="ticker in KRX 관리/투자주의/투자경고 list — refusing trade",
            ))

        if intent.ticker not in universe and universe:
            findings.append(Critique(
                critic=self.name, target=target, verdict=Verdict.FAIL,
                metric="universe_member", value="false",
                detail="ticker not in current universe — refusing trade",
            ))

        if intent.order_type == "limit" and intent.target_price > 0:
            t = tick_size(intent.target_price)
            if intent.target_price % t != 0:
                rounded = round_to_tick(intent.target_price, side=intent.side)
                findings.append(Critique(
                    critic=self.name, target=target, verdict=Verdict.WARN,
                    metric="tick_size",
                    value=intent.target_price, threshold=t,
                    detail=f"price {intent.target_price} off-grid (tick={t}); auto-rounded to {rounded}",
                ))
                intent.target_price = rounded

        cur = prices.get(intent.ticker)
        prev = prev_close.get(intent.ticker)
        if cur and prev:
            drift = abs(cur - prev) / prev
            if drift > self.max_price_drift_pct:
                findings.append(Critique(
                    critic=self.name, target=target, verdict=Verdict.FAIL,
                    metric="price_drift", value=round(drift, 4),
                    threshold=f"<{self.max_price_drift_pct}",
                    detail=f"price moved {drift:.1%} since prev close — possible split/halt",
                ))

        avg_val = avg_trading_value.get(intent.ticker, 0.0)
        if avg_val > 0 and cur:
            order_value = intent.qty * cur
            ratio = order_value / avg_val
            if ratio > self.max_order_pct_of_volume:
                findings.append(Critique(
                    critic=self.name, target=target, verdict=Verdict.FAIL,
                    metric="order_size_vs_volume",
                    value=round(ratio, 4),
                    threshold=f"<{self.max_order_pct_of_volume}",
                    detail=f"order size {ratio:.2%} of avg trading value — likely market impact",
                ))

        block = any(f.verdict == Verdict.FAIL for f in findings)
        return not block, findings

    def run(self, ctx: AgentContext) -> None:
        intents: list[OrderIntent] = ctx.get("order_intents", [])
        if not intents:
            self.emit(ctx, "skipped", {"reason": "no order_intents"})
            return

        prices_now: dict[str, int] = ctx.get("prices_now", {})
        prev_close: dict[str, int] = ctx.get("prev_close", {})
        avg_trading_value: dict[str, float] = ctx.get("avg_trading_value", {})
        universe = set(ctx.get("universe", []))

        krx_blocked: set[str] = set()
        if self.check_krx_status:
            try:
                from datetime import date as _date
                from src.data.krx_status import get_blocked_tickers
                krx_blocked = get_blocked_tickers(_date.today().isoformat())
            except Exception as e:
                self.emit(ctx, "krx_status_unavailable", {"error": str(e)})

        kept: list[OrderIntent] = []
        blocked: list[OrderIntent] = []
        all_findings: list[Critique] = []
        for intent in intents:
            ok, findings = self._check_intent(
                intent, prices_now, prev_close, avg_trading_value, universe, krx_blocked,
            )
            all_findings.extend(findings)
            if ok:
                kept.append(intent)
            else:
                blocked.append(intent)

        if blocked:
            self.emit(
                ctx, "intents_blocked",
                {"blocked": [i.model_dump(mode="json") for i in blocked]},
                severity=Severity.WARN,
            )
        ctx.set("order_intents", kept)
        ctx.set("blocked_intents", blocked)

        target = f"live:cycle:{ctx.cycle_id}"
        report = CritiqueReport(critic=self.name, target=target, findings=all_findings)
        existing = ctx.get("critiques", [])
        existing.append(report)
        ctx.set("critiques", existing)
        self.emit(ctx, "critique_report", report.model_dump(mode="json"))
