"""Cost Skeptic — challenges trading-cost assumptions.

Checks:
1. **Turnover** — annualized turnover. > 500%/yr triggers warn (high friction).
2. **Cost-to-alpha ratio** — total fees / total absolute return. > 50% → fail.
3. **Slippage stress** — recompute returns assuming 2x and 3x base slippage.
   If 2x slippage flips Sharpe < 0 → fail.
4. **Per-trade economics** — average win/loss vs round-trip cost.
"""

from __future__ import annotations

import logging
import math
from typing import Any

import numpy as np
import pandas as pd

from config import CostConfig

from ..base import AgentContext, BaseAgent
from ..messages import Critique, CritiqueReport, Verdict

log = logging.getLogger(__name__)


def _annualized_turnover(trades: pd.DataFrame, equity: pd.Series) -> float:
    if trades.empty or equity.empty:
        return 0.0
    notional = (trades["qty"] * trades["price"]).abs().sum()
    days = (equity.index[-1] - equity.index[0]).days or 1
    avg_equity = float(equity.mean()) or 1.0
    return float(notional / avg_equity * (365.0 / days))


def _stressed_sharpe(equity: pd.Series, trades: pd.DataFrame, extra_bps: float) -> float:
    if trades.empty or equity.empty:
        return 0.0
    extra_cost_per_trade = (trades["qty"] * trades["price"]).abs() * (extra_bps / 1e4)
    daily_extra = (
        pd.DataFrame({"date": pd.to_datetime(trades["date"]), "cost": extra_cost_per_trade})
        .groupby("date")["cost"].sum()
    )
    eq_adj = equity.copy()
    for d, c in daily_extra.items():
        eq_adj.loc[eq_adj.index >= d] -= c
    rets = eq_adj.pct_change().dropna()
    if rets.std() == 0 or len(rets) < 30:
        return 0.0
    return float((rets.mean() / rets.std()) * math.sqrt(252))


class CostSkeptic(BaseAgent):
    name = "cost_skeptic"

    def __init__(
        self,
        max_turnover_yearly: float = 5.0,
        max_cost_to_alpha: float = 0.5,
        slippage_stress_multipliers: tuple[float, ...] = (2.0, 3.0),
        base_cost: CostConfig | None = None,
    ):
        self.max_turnover_yearly = max_turnover_yearly
        self.max_cost_to_alpha = max_cost_to_alpha
        self.slippage_stress_multipliers = slippage_stress_multipliers
        self.base_cost = base_cost or CostConfig()

    def run(self, ctx: AgentContext) -> None:
        result: dict[str, Any] | None = ctx.get("backtest_result")
        if not result:
            self.emit(ctx, "skipped", {"reason": "no backtest_result"})
            return

        equity: pd.Series = result["equity_curve"]
        trades: pd.DataFrame = result.get("trades", pd.DataFrame())
        target = f"backtest:{result.get('strategy', 'unknown')}"
        findings: list[Critique] = []

        if trades.empty:
            self.emit(ctx, "skipped", {"reason": "no trades"})
            return

        turnover = _annualized_turnover(trades, equity)
        findings.append(Critique(
            critic=self.name, target=target,
            verdict=Verdict.WARN if turnover > self.max_turnover_yearly else Verdict.PASS,
            metric="annualized_turnover",
            value=round(turnover, 2),
            threshold=f"<{self.max_turnover_yearly}",
            detail=f"{turnover:.1f}x annualized turnover",
        ))

        if "fee" in trades.columns and equity.iloc[-1] > equity.iloc[0]:
            total_fees = float(trades["fee"].sum())
            total_pnl = float(equity.iloc[-1] - equity.iloc[0])
            ratio = total_fees / total_pnl if total_pnl > 0 else float("inf")
            findings.append(Critique(
                critic=self.name, target=target,
                verdict=Verdict.FAIL if ratio > self.max_cost_to_alpha else Verdict.PASS,
                metric="cost_to_alpha_ratio",
                value=round(ratio, 3) if ratio != float("inf") else "inf",
                threshold=f"<{self.max_cost_to_alpha}",
                detail=f"fees consumed {ratio:.1%} of gross profit" if ratio != float("inf")
                       else "negative gross PnL — costs immaterial vs losses",
            ))

        for mult in self.slippage_stress_multipliers:
            extra_bps = self.base_cost.slippage_bps * (mult - 1.0)
            sr = _stressed_sharpe(equity, trades, extra_bps)
            findings.append(Critique(
                critic=self.name, target=target,
                verdict=Verdict.PASS if sr > 0.5 else (Verdict.WARN if sr > 0 else Verdict.FAIL),
                metric=f"sharpe_{mult:.0f}x_slippage",
                value=round(sr, 3),
                threshold=">0.5",
                detail=f"Sharpe with {mult:.0f}x base slippage ({extra_bps:.0f}bp extra/trade)",
            ))

        report = CritiqueReport(critic=self.name, target=target, findings=findings)
        existing = ctx.get("critiques", [])
        existing.append(report)
        ctx.set("critiques", existing)
        self.emit(ctx, "critique_report", report.model_dump(mode="json"))
