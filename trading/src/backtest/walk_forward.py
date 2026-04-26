"""Walk-forward backtest harness — proper OOS validation.

단일 기간 백테스트는 과적합 위험이 큼. Walk-forward 는 여러 OOS 윈도우에서
독립적으로 성과를 측정해 통계적 신뢰도 확보.

작동:
1. [start, end] 를 연속된 (train, test) 페어로 분할
2. 각 페어마다 백테스트 실행 — 단, 본 strategy 는 룰베이스라 train 은 시간순
   "사용 가능한 과거" 를 의미. lookback 만 보장하면 됨.
3. 각 OOS 윈도우 의 stats 수집
4. 집계: 평균 Sharpe / 표준편차 / 양의 윈도우 비율

ML 전략 합류 시 train window 에서 fit, test window 에서 predict 패턴으로
확장됨. 현재는 룰베이스 전략이라 lookback 만 신경 씀.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta

import numpy as np
import pandas as pd

from config import CostConfig
from src.backtest.engine import BacktestResult, run_backtest
from src.strategies.base import Strategy

log = logging.getLogger(__name__)


@dataclass
class WalkForwardWindow:
    train_start: pd.Timestamp
    train_end: pd.Timestamp
    test_start: pd.Timestamp
    test_end: pd.Timestamp
    result: BacktestResult | None = None
    stats: dict = field(default_factory=dict)


@dataclass
class WalkForwardReport:
    strategy_name: str
    windows: list[WalkForwardWindow]
    aggregate_stats: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        return {
            "strategy": self.strategy_name,
            "n_windows": len(self.windows),
            "aggregate": self.aggregate_stats,
            "windows": [
                {
                    "train_start": w.train_start.isoformat(),
                    "train_end": w.train_end.isoformat(),
                    "test_start": w.test_start.isoformat(),
                    "test_end": w.test_end.isoformat(),
                    "stats": w.stats,
                }
                for w in self.windows
            ],
        }


def _split_windows(
    start: pd.Timestamp,
    end: pd.Timestamp,
    train_months: int = 24,
    test_months: int = 6,
    step_months: int = 6,
) -> list[tuple[pd.Timestamp, pd.Timestamp, pd.Timestamp, pd.Timestamp]]:
    windows = []
    cursor = start
    while True:
        train_start = cursor
        train_end = train_start + pd.DateOffset(months=train_months)
        test_start = train_end
        test_end = test_start + pd.DateOffset(months=test_months)
        if test_end > end:
            break
        windows.append((train_start, train_end, test_start, test_end))
        cursor = cursor + pd.DateOffset(months=step_months)
    return windows


def _aggregate(stats_list: list[dict]) -> dict:
    if not stats_list:
        return {}
    keys = ["CAGR", "sharpe", "max_drawdown", "volatility", "total_return"]
    agg: dict = {}
    for k in keys:
        vals = [s.get(k, 0.0) for s in stats_list if k in s]
        if not vals:
            continue
        arr = np.array(vals)
        agg[f"{k}_mean"] = float(arr.mean())
        agg[f"{k}_std"] = float(arr.std(ddof=1)) if len(arr) > 1 else 0.0
        agg[f"{k}_min"] = float(arr.min())
        agg[f"{k}_max"] = float(arr.max())
    sharpes = [s.get("sharpe", 0.0) for s in stats_list]
    if sharpes:
        agg["sharpe_pos_pct"] = float(sum(1 for s in sharpes if s > 0) / len(sharpes))
        agg["n_windows"] = len(sharpes)
    return agg


def run_walk_forward(
    strategy_factory,
    prices: pd.DataFrame,
    train_months: int = 24,
    test_months: int = 6,
    step_months: int = 6,
    initial_cash: float = 100_000_000,
    rebalance_freq: str = "W-MON",
    cost: CostConfig | None = None,
) -> WalkForwardReport:
    """strategy_factory: callable() -> Strategy. 각 윈도우마다 새 인스턴스 생성.

    Returns WalkForwardReport with per-window stats + aggregates.
    """
    if prices.empty:
        return WalkForwardReport(strategy_name="empty", windows=[])

    full_start, full_end = prices.index[0], prices.index[-1]
    splits = _split_windows(full_start, full_end, train_months, test_months, step_months)
    log.info(
        "walk-forward: %d windows from %s to %s (train=%dm, test=%dm, step=%dm)",
        len(splits), full_start.date(), full_end.date(), train_months, test_months, step_months,
    )

    windows: list[WalkForwardWindow] = []
    strategy_name = "unknown"
    for (ts, te, vs, ve) in splits:
        strategy = strategy_factory()
        strategy_name = strategy.name
        # Pass full price history up to test_end (strategy uses lookback internally)
        sub_prices = prices.loc[prices.index <= ve]
        # Run backtest only over the test window — engine accepts the prices it sees
        # but internally rebalances on freq within entire range. For OOS only,
        # we split by post-processing equity curve.
        try:
            result = run_backtest(
                strategy=strategy,
                prices=sub_prices,
                initial_cash=initial_cash,
                rebalance_freq=rebalance_freq,
                cost=cost,
            )
        except Exception as e:
            log.warning("backtest failed for window %s-%s: %s", vs.date(), ve.date(), e)
            continue

        eq = result.equity_curve
        oos_eq = eq.loc[(eq.index >= vs) & (eq.index <= ve)]
        if len(oos_eq) < 2:
            continue
        oos_rets = oos_eq.pct_change().dropna()
        n = len(oos_rets)
        ann_factor = 252.0
        if n > 0 and oos_rets.std(ddof=1) > 0:
            sharpe = float(oos_rets.mean() / oos_rets.std(ddof=1) * np.sqrt(ann_factor))
            cagr = float((oos_eq.iloc[-1] / oos_eq.iloc[0]) ** (ann_factor / max(n, 1)) - 1)
            vol = float(oos_rets.std(ddof=1) * np.sqrt(ann_factor))
            cummax = oos_eq.cummax()
            mdd = float((oos_eq / cummax - 1.0).min())
            total_ret = float(oos_eq.iloc[-1] / oos_eq.iloc[0] - 1)
            stats = {
                "sharpe": sharpe, "CAGR": cagr, "volatility": vol,
                "max_drawdown": mdd, "total_return": total_ret,
                "n_days": float(n),
            }
        else:
            stats = {"sharpe": 0.0, "n_days": float(n)}

        win = WalkForwardWindow(train_start=ts, train_end=te, test_start=vs, test_end=ve, stats=stats)
        windows.append(win)
        log.info(
            "  window %s→%s: SR=%.2f CAGR=%.1f%% MDD=%.1f%%",
            vs.date(), ve.date(), stats.get("sharpe", 0), stats.get("CAGR", 0)*100, stats.get("max_drawdown", 0)*100,
        )

    aggregate = _aggregate([w.stats for w in windows])
    return WalkForwardReport(strategy_name=strategy_name, windows=windows, aggregate_stats=aggregate)
