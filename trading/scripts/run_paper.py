"""페이퍼 트레이딩 리밸런서.

매주 한 번 (예: 월요일 09:30) cron 으로 실행:
    30 9 * * 1 cd /path/to/trading && python -m scripts.run_paper

흐름:
    1. KIS 잔고 조회 → 현재 보유/예수금
    2. pykrx 로 유니버스 + 과거 가격 패널 로드
    3. 전략으로 목표 비중 산출
    4. 포지션 차이 → 주문 (시장가, 모의투자)
    5. SQLite 에 모든 결정/주문/잔고 스냅샷 기록
"""

from __future__ import annotations

import argparse
import logging
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from config import KisConfig, StrategyConfig, TRADE_DB_PATH  # noqa: E402
from src.broker.kis_client import KisClient  # noqa: E402
from src.data.market_data import load_universe_ohlcv  # noqa: E402
from src.data.universe import build_universe  # noqa: E402
from src.logger import TradeLogger  # noqa: E402
from src.risk.sizing import compute_orders  # noqa: E402
from src.strategies.momentum import CrossSectionalMomentum  # noqa: E402

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("paper")


def main() -> int:
    p = argparse.ArgumentParser()
    p.add_argument("--dry-run", action="store_true", help="주문 전송 없이 의도만 출력")
    p.add_argument("--lookback-days", type=int, default=400)
    args = p.parse_args()

    cfg = StrategyConfig()
    kis_cfg = KisConfig.from_env()
    if not kis_cfg.is_paper:
        log.warning("KIS_PAPER=false: real account! aborting unless --dry-run")
        if not args.dry_run:
            return 2

    today = datetime.now()
    start = (today - pd.Timedelta(days=args.lookback_days)).strftime("%Y-%m-%d")
    end = today.strftime("%Y-%m-%d")

    log.info("[1/5] universe @ %s", end)
    universe = build_universe(end, size=cfg.universe_size, min_market_cap_krw=cfg.min_market_cap_krw)

    log.info("[2/5] loading prices for %d tickers (%s ~ %s)", len(universe), start, end)
    prices = load_universe_ohlcv(universe, start, end, field="Close")
    if prices.empty:
        log.error("no price data")
        return 1

    log.info("[3/5] generating signals")
    strat = CrossSectionalMomentum(
        lookback_months=cfg.lookback_months,
        skip_recent_months=cfg.skip_recent_months,
        top_n=cfg.top_n,
        cash_buffer=cfg.cash_buffer,
    )
    target = strat.generate_targets(prices, pd.Timestamp(end))
    log.info("target: %s", target.weights)

    if not target.weights:
        log.warning("no target picks; skipping rebalance")
        return 0

    log.info("[4/5] querying broker balance")
    client = KisClient(kis_cfg)
    bal = client.get_balance()
    cash = bal["cash"]
    total_eval = bal["total_eval"] or cash
    cur_positions = {p["ticker"]: p["qty"] for p in bal["positions"]}
    log.info("cash=%s, total_eval=%s, positions=%d", cash, total_eval, len(cur_positions))

    cur_prices: dict[str, int] = {}
    for t in set(target.weights) | set(cur_positions):
        try:
            cur_prices[t] = client.get_current_price(t)
        except Exception as e:
            log.warning("price fetch failed for %s: %s", t, e)

    intents = compute_orders(
        target_weights=target.weights,
        current_positions=cur_positions,
        prices=cur_prices,
        total_equity=total_eval,
    )
    log.info("orders to place: %d", len(intents))
    for i in intents:
        log.info("  %s %s qty=%d @ %d", i.side.upper(), i.ticker, i.qty, i.target_price)

    if args.dry_run:
        log.info("dry-run; skipping submission")
        return 0

    log.info("[5/5] submitting orders + logging")
    tl = TradeLogger(TRADE_DB_PATH)
    run_id = tl.start_rebalance_run(
        strategy=strat.name,
        universe_size=len(universe),
        target_weights=target.weights,
        notes=f"paper={kis_cfg.is_paper}",
    )
    tl.snapshot_equity(cash=cash, total_eval=total_eval, positions=bal["positions"])

    for intent in intents:
        result = client.place_order(
            ticker=intent.ticker,
            qty=intent.qty,
            side=intent.side,
            order_type="01",
        )
        tl.log_order(
            run_id=run_id,
            ticker=intent.ticker,
            side=intent.side,
            qty=intent.qty,
            target_price=intent.target_price,
            order_type="market",
            broker_order_id=result.order_id,
            success=result.success,
            raw_response=result.raw,
        )
        log.info(
            "  -> %s %s qty=%d ok=%s id=%s",
            intent.side, intent.ticker, intent.qty, result.success, result.order_id,
        )

    log.info("done. run_id=%d", run_id)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
