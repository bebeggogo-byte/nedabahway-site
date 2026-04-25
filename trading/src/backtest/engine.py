from __future__ import annotations

import logging
from dataclasses import dataclass, field

import numpy as np
import pandas as pd

from config import CostConfig
from src.strategies.base import Strategy

log = logging.getLogger(__name__)


@dataclass
class BacktestResult:
    equity_curve: pd.Series
    weights_history: pd.DataFrame
    trades: pd.DataFrame
    stats: dict[str, float] = field(default_factory=dict)

    def summary(self) -> str:
        rows = [f"{k:>20s}: {v:>12.4f}" for k, v in self.stats.items()]
        return "\n".join(rows)


def _compute_stats(equity: pd.Series, periods_per_year: float = 252) -> dict[str, float]:
    rets = equity.pct_change().dropna()
    if rets.empty or equity.iloc[0] <= 0:
        return {}
    total_return = float(equity.iloc[-1] / equity.iloc[0] - 1)
    n_years = len(rets) / periods_per_year
    cagr = float((equity.iloc[-1] / equity.iloc[0]) ** (1 / n_years) - 1) if n_years > 0 else 0.0
    vol = float(rets.std() * np.sqrt(periods_per_year))
    sharpe = float(rets.mean() / rets.std() * np.sqrt(periods_per_year)) if rets.std() > 0 else 0.0
    cummax = equity.cummax()
    dd = (equity / cummax - 1.0)
    mdd = float(dd.min())
    return {
        "total_return": total_return,
        "CAGR": cagr,
        "volatility": vol,
        "sharpe": sharpe,
        "max_drawdown": mdd,
        "n_days": float(len(rets)),
    }


def run_backtest(
    strategy: Strategy,
    prices: pd.DataFrame,
    initial_cash: float = 100_000_000,
    rebalance_freq: str = "W-MON",
    cost: CostConfig | None = None,
) -> BacktestResult:
    """일봉 종가 기반 단순 백테스트.

    - 신호일(rebalance_freq): 종가로 리밸런싱 주문 → 그 종가에 체결 가정
    - 매수 비용: commission_rate + slippage / 매도 비용: + tax_rate_sell
    - 분배금/배당 미반영 (보수적 추정)
    """
    cost = cost or CostConfig()
    prices = prices.sort_index().ffill(limit=2)

    rebal_dates = pd.date_range(prices.index[0], prices.index[-1], freq=rebalance_freq)
    rebal_dates = [d for d in rebal_dates if d in prices.index]

    cash = float(initial_cash)
    holdings: dict[str, int] = {}
    equity_records: list[tuple[pd.Timestamp, float]] = []
    weight_records: list[dict] = []
    trade_records: list[dict] = []

    for date in prices.index:
        px_row = prices.loc[date]

        if date in rebal_dates:
            available_universe = px_row.dropna().index
            sub_prices = prices.loc[:date, available_universe]
            target = strategy.generate_targets(sub_prices.iloc[:-1] if len(sub_prices) > 1 else sub_prices, date)

            equity_now = cash + sum(
                holdings.get(t, 0) * float(px_row.get(t, 0) or 0) for t in holdings
            )

            target_qty: dict[str, int] = {}
            for t, w in target.weights.items():
                p = float(px_row.get(t, np.nan))
                if not np.isfinite(p) or p <= 0:
                    continue
                target_qty[t] = int((equity_now * w) // p)

            for t, cur_qty in list(holdings.items()):
                tgt = target_qty.get(t, 0)
                if tgt < cur_qty:
                    sell_qty = cur_qty - tgt
                    p = float(px_row.get(t, np.nan))
                    if not np.isfinite(p) or p <= 0:
                        continue
                    proceeds = sell_qty * p
                    fee = proceeds * (cost.commission_rate + cost.tax_rate_sell + cost.slippage_bps / 1e4)
                    cash += proceeds - fee
                    new_qty = cur_qty - sell_qty
                    if new_qty == 0:
                        del holdings[t]
                    else:
                        holdings[t] = new_qty
                    trade_records.append(
                        {"date": date, "ticker": t, "side": "sell", "qty": sell_qty, "price": p, "fee": fee}
                    )

            for t, tgt in target_qty.items():
                cur = holdings.get(t, 0)
                if tgt > cur:
                    buy_qty = tgt - cur
                    p = float(px_row.get(t, np.nan))
                    if not np.isfinite(p) or p <= 0:
                        continue
                    cost_amt = buy_qty * p
                    fee = cost_amt * (cost.commission_rate + cost.slippage_bps / 1e4)
                    if cash < cost_amt + fee:
                        max_affordable = int(max(0, (cash - fee) // p))
                        if max_affordable <= 0:
                            continue
                        buy_qty = max_affordable
                        cost_amt = buy_qty * p
                        fee = cost_amt * (cost.commission_rate + cost.slippage_bps / 1e4)
                    cash -= cost_amt + fee
                    holdings[t] = cur + buy_qty
                    trade_records.append(
                        {"date": date, "ticker": t, "side": "buy", "qty": buy_qty, "price": p, "fee": fee}
                    )

            weight_records.append({"date": date, **target.weights})

        equity = cash + sum(
            holdings.get(t, 0) * float(px_row.get(t, 0) or 0) for t in holdings
        )
        equity_records.append((date, equity))

    equity_curve = pd.Series(dict(equity_records), name="equity").sort_index()
    weights_df = pd.DataFrame(weight_records).set_index("date") if weight_records else pd.DataFrame()
    trades_df = pd.DataFrame(trade_records)
    stats = _compute_stats(equity_curve)
    return BacktestResult(
        equity_curve=equity_curve, weights_history=weights_df, trades=trades_df, stats=stats
    )
