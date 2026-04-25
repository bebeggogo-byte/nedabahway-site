"""백테스트 실행: pykrx 데이터로 momentum 전략 시뮬레이션.

사용법:
    cd trading
    python -m scripts.backtest --start 2020-01-01 --end 2024-12-31 --top-n 10
"""

from __future__ import annotations

import argparse
import logging
import sys
from pathlib import Path

# trading/ 을 import path 에 추가
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import CostConfig, StrategyConfig  # noqa: E402
from src.backtest.engine import run_backtest  # noqa: E402
from src.data.market_data import load_universe_ohlcv  # noqa: E402
from src.data.universe import build_universe  # noqa: E402
from src.strategies.momentum import CrossSectionalMomentum  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("backtest")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--start", default="2020-01-01")
    p.add_argument("--end", default="2024-12-31")
    p.add_argument("--universe-size", type=int, default=50)
    p.add_argument("--top-n", type=int, default=10)
    p.add_argument("--lookback-months", type=int, default=12)
    p.add_argument("--skip-recent-months", type=int, default=1)
    p.add_argument("--rebalance-freq", default="W-MON", help="pandas freq (W-MON, M, etc.)")
    p.add_argument("--initial-cash", type=float, default=100_000_000)
    args = p.parse_args()

    log.info("building universe at %s", args.start)
    universe = build_universe(args.start, size=args.universe_size)

    log.info("loading prices for %d tickers", len(universe))
    prices = load_universe_ohlcv(universe, args.start, args.end, field="Close")
    if prices.empty:
        log.error("no price data loaded")
        return 1

    strat = CrossSectionalMomentum(
        lookback_months=args.lookback_months,
        skip_recent_months=args.skip_recent_months,
        top_n=args.top_n,
    )
    result = run_backtest(
        strategy=strat,
        prices=prices,
        initial_cash=args.initial_cash,
        rebalance_freq=args.rebalance_freq,
        cost=CostConfig(),
    )

    print("\n=== Backtest Result ===")
    print(result.summary())
    print(f"\nTrades: {len(result.trades)}")
    if not result.trades.empty:
        print(result.trades.tail(10).to_string(index=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
