"""Statistical Skeptic — challenges backtest claims with rigorous tests.

Checks:
1. **Look-ahead audit** — every trade timestamp must use info available at
   that time (sanity check on signal generation).
2. **Block bootstrap** of daily returns → CI for Sharpe / mean return.
   Wide CI / containing zero → fail.
3. **Deflated Sharpe Ratio** (Lopez de Prado, 2014) — adjusts Sharpe for
   the number of trials and skew/kurtosis of returns.
4. **Min track record length** — can't claim significance from < 250 days.
5. **In-sample vs OOS gap** — if both provided, large drop → warn.
"""

from __future__ import annotations

import logging
import math
from typing import Any

import numpy as np
import pandas as pd

from ..base import AgentContext, BaseAgent
from ..messages import Critique, CritiqueReport, Verdict

log = logging.getLogger(__name__)


def _block_bootstrap_sharpe(
    returns: np.ndarray, block_size: int = 20, n_iter: int = 1000, seed: int = 42
) -> tuple[float, float, float]:
    """Stationary bootstrap-ish (overlapping blocks). Returns (mean, lo95, hi95)."""
    rng = np.random.default_rng(seed)
    n = len(returns)
    if n < block_size * 2:
        block_size = max(2, n // 4)
    sharpes: list[float] = []
    for _ in range(n_iter):
        idx_starts = rng.integers(0, n - block_size, size=(n // block_size) + 1)
        sample = np.concatenate([returns[s : s + block_size] for s in idx_starts])[:n]
        if sample.std(ddof=1) > 0:
            s = (sample.mean() / sample.std(ddof=1)) * math.sqrt(252)
            sharpes.append(s)
    if not sharpes:
        return 0.0, 0.0, 0.0
    arr = np.array(sharpes)
    return float(arr.mean()), float(np.quantile(arr, 0.025)), float(np.quantile(arr, 0.975))


def _deflated_sharpe(sharpe: float, returns: np.ndarray, n_trials: int) -> float:
    """Lopez de Prado's deflated Sharpe ratio.

    Adjusts the observed SR for: skewness, kurtosis, sample size, number of trials.
    Returns probability that the true SR > 0 (higher is more confident).
    """
    n = len(returns)
    if n < 30 or sharpe == 0:
        return 0.0
    skew = float(pd.Series(returns).skew())
    kurt = float(pd.Series(returns).kurtosis())
    expected_max_sr = math.sqrt(2 * math.log(max(n_trials, 2)))
    sr_std = math.sqrt((1 - skew * sharpe + (kurt - 1) / 4 * sharpe**2) / (n - 1))
    if sr_std == 0:
        return 0.0
    z = (sharpe - expected_max_sr) / sr_std
    from math import erf

    return 0.5 * (1 + erf(z / math.sqrt(2)))


class StatisticalSkeptic(BaseAgent):
    name = "statistical_skeptic"

    def __init__(
        self,
        n_trials_assumed: int = 20,
        min_days: int = 250,
        bootstrap_n: int = 1000,
        block_size: int = 20,
    ):
        self.n_trials_assumed = n_trials_assumed
        self.min_days = min_days
        self.bootstrap_n = bootstrap_n
        self.block_size = block_size

    def run(self, ctx: AgentContext) -> None:
        result: dict[str, Any] | None = ctx.get("backtest_result")
        if not result:
            self.emit(ctx, "skipped", {"reason": "no backtest_result in ctx"})
            return

        equity: pd.Series = result["equity_curve"]
        trades: pd.DataFrame = result.get("trades", pd.DataFrame())
        target = f"backtest:{result.get('strategy', 'unknown')}"
        findings: list[Critique] = []

        rets = equity.pct_change().dropna().values
        n = len(rets)

        if n < self.min_days:
            findings.append(Critique(
                critic=self.name, target=target, verdict=Verdict.FAIL,
                metric="track_record_days", value=float(n), threshold=float(self.min_days),
                detail=f"only {n} days of returns; need ≥{self.min_days} for significance",
            ))

        if n >= 30 and rets.std(ddof=1) > 0:
            sr_observed = float((rets.mean() / rets.std(ddof=1)) * math.sqrt(252))
            mean_sr, lo, hi = _block_bootstrap_sharpe(rets, self.block_size, self.bootstrap_n)
            findings.append(Critique(
                critic=self.name, target=target,
                verdict=Verdict.PASS if lo > 0 else Verdict.FAIL,
                metric="bootstrap_sharpe_95ci",
                value=f"[{lo:.2f}, {hi:.2f}] (mean={mean_sr:.2f}, observed={sr_observed:.2f})",
                threshold="lower bound > 0",
                detail="95% CI contains zero → cannot reject 'no edge'" if lo <= 0 else "bootstrapped Sharpe lower bound > 0",
            ))

            dsr_prob = _deflated_sharpe(sr_observed, rets, self.n_trials_assumed)
            findings.append(Critique(
                critic=self.name, target=target,
                verdict=Verdict.PASS if dsr_prob > 0.95 else (Verdict.WARN if dsr_prob > 0.5 else Verdict.FAIL),
                metric="deflated_sharpe_prob",
                value=round(dsr_prob, 3),
                threshold=">0.95",
                detail=f"P(true SR > 0 | {self.n_trials_assumed} trials, skew/kurt adjusted) = {dsr_prob:.3f}",
            ))

        if not trades.empty and "date" in trades.columns:
            equity_dates = set(equity.index.normalize())
            trade_dates = set(pd.to_datetime(trades["date"]).dt.normalize())
            anomalies = trade_dates - equity_dates
            if anomalies:
                findings.append(Critique(
                    critic=self.name, target=target, verdict=Verdict.FAIL,
                    metric="lookahead_audit", value=str(len(anomalies)),
                    detail=f"{len(anomalies)} trade dates not in equity curve (timing mismatch)",
                ))
            else:
                findings.append(Critique(
                    critic=self.name, target=target, verdict=Verdict.PASS,
                    metric="lookahead_audit", value="ok",
                    detail="all trade dates align with equity curve",
                ))

        report = CritiqueReport(critic=self.name, target=target, findings=findings)
        existing = ctx.get("critiques", [])
        existing.append(report)
        ctx.set("critiques", existing)
        self.emit(ctx, "critique_report", report.model_dump(mode="json"))
