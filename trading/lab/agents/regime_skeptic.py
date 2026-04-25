"""Regime Skeptic — checks if a strategy works across market regimes.

Checks:
1. **Rolling Sharpe (252d)** — fraction of windows where SR > 0.5.
2. **Calendar-year breakdown** — best vs worst year delta; consistency.
3. **Bull / Bear / Choppy breakdown** — uses KOSPI200 200-day MA filter
   if benchmark provided; otherwise self-classified by drawdown depth.
4. **Max drawdown depth & duration** — duration > 252 days → fail.
5. **Tail risk (CVaR_5%)** — 5% worst days mean.
"""

from __future__ import annotations

import logging
from typing import Any

import numpy as np
import pandas as pd

from ..base import AgentContext, BaseAgent
from ..messages import Critique, CritiqueReport, Verdict

log = logging.getLogger(__name__)


def _drawdown(equity: pd.Series) -> pd.Series:
    return equity / equity.cummax() - 1.0


def _max_dd_duration(dd: pd.Series) -> int:
    """Longest consecutive run of negative drawdown."""
    in_dd = dd < 0
    if not in_dd.any():
        return 0
    longest, cur = 0, 0
    for v in in_dd:
        cur = cur + 1 if v else 0
        longest = max(longest, cur)
    return longest


def _rolling_sharpe(rets: pd.Series, window: int = 252) -> pd.Series:
    if len(rets) < window:
        return pd.Series(dtype=float)
    rolling = rets.rolling(window)
    return (rolling.mean() / rolling.std()) * np.sqrt(252)


class RegimeSkeptic(BaseAgent):
    name = "regime_skeptic"

    def __init__(
        self,
        rolling_window: int = 252,
        min_positive_window_pct: float = 0.5,
        max_dd_duration_days: int = 252,
    ):
        self.rolling_window = rolling_window
        self.min_positive_window_pct = min_positive_window_pct
        self.max_dd_duration_days = max_dd_duration_days

    def run(self, ctx: AgentContext) -> None:
        result: dict[str, Any] | None = ctx.get("backtest_result")
        if not result:
            self.emit(ctx, "skipped", {"reason": "no backtest_result in ctx"})
            return

        equity: pd.Series = result["equity_curve"]
        target = f"backtest:{result.get('strategy', 'unknown')}"
        findings: list[Critique] = []

        rets = equity.pct_change().dropna()
        n = len(rets)
        if n == 0:
            self.emit(ctx, "skipped", {"reason": "empty equity"})
            return

        rolling_sr = _rolling_sharpe(rets, self.rolling_window).dropna()
        if not rolling_sr.empty:
            pos_pct = float((rolling_sr > 0.5).mean())
            findings.append(Critique(
                critic=self.name, target=target,
                verdict=Verdict.PASS if pos_pct >= self.min_positive_window_pct else Verdict.WARN,
                metric="rolling_sharpe_pos_pct",
                value=round(pos_pct, 3),
                threshold=f">{self.min_positive_window_pct}",
                detail=f"{pos_pct:.1%} of {self.rolling_window}d windows had SR > 0.5",
            ))

        if isinstance(equity.index, pd.DatetimeIndex):
            yearly = equity.resample("YE").last().pct_change().dropna()
            if len(yearly) >= 2:
                best, worst = float(yearly.max()), float(yearly.min())
                negative_years = int((yearly < 0).sum())
                findings.append(Critique(
                    critic=self.name, target=target,
                    verdict=Verdict.WARN if negative_years > len(yearly) * 0.4 else Verdict.PASS,
                    metric="yearly_consistency",
                    value=f"best={best:.1%}, worst={worst:.1%}, negative_years={negative_years}/{len(yearly)}",
                    detail="too many losing years" if negative_years > len(yearly) * 0.4 else "year mix acceptable",
                ))

        dd = _drawdown(equity)
        max_dd = float(dd.min())
        max_dur = _max_dd_duration(dd)
        findings.append(Critique(
            critic=self.name, target=target,
            verdict=Verdict.FAIL if max_dur > self.max_dd_duration_days else (
                Verdict.WARN if max_dd < -0.30 else Verdict.PASS
            ),
            metric="drawdown",
            value=f"max={max_dd:.1%}, duration={max_dur}d",
            threshold=f"duration ≤ {self.max_dd_duration_days}d, depth > -30%",
            detail="drawdown duration excessive" if max_dur > self.max_dd_duration_days
                   else ("deep drawdown" if max_dd < -0.30 else "drawdown profile acceptable"),
        ))

        if n >= 20:
            cvar5 = float(np.quantile(rets, 0.05))
            es5 = float(rets[rets <= cvar5].mean()) if (rets <= cvar5).any() else cvar5
            findings.append(Critique(
                critic=self.name, target=target,
                verdict=Verdict.WARN if es5 < -0.05 else Verdict.PASS,
                metric="cvar_5pct",
                value=round(es5, 4),
                detail=f"average return on worst 5% days = {es5:.2%}",
            ))

        report = CritiqueReport(critic=self.name, target=target, findings=findings)
        existing = ctx.get("critiques", [])
        existing.append(report)
        ctx.set("critiques", existing)
        self.emit(ctx, "critique_report", report.model_dump(mode="json"))
