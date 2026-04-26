from __future__ import annotations

import logging

import pandas as pd

from src.data.krx_status import get_blocked_tickers
from src.data.market_data import (
    get_market_cap_snapshot,
    get_ticker_name,
    is_excluded_by_name,
)

log = logging.getLogger(__name__)


def build_universe(
    date: str,
    size: int = 50,
    market: str = "KOSPI",
    min_market_cap_krw: float = 5e11,
    min_trading_value_krw: float = 1e9,
    exclude_admin: bool = True,
    exclude_caution: bool = True,
    exclude_alert: bool = True,
) -> list[str]:
    """시총 상위 N 유니버스 (우선주·스팩·리츠·ETN·관리·투자주의·투자경고 제외).

    KIS 모의투자가 KOSPI 위주여서 기본 KOSPI. 실전 전환 후 KOSDAQ 추가 가능.
    """
    df = get_market_cap_snapshot(date, market=market).copy()
    df = df[df["시가총액"] >= min_market_cap_krw]
    df = df[df["거래대금"] >= min_trading_value_krw]

    blocked: set[str] = set()
    if exclude_admin or exclude_caution or exclude_alert:
        try:
            blocked = get_blocked_tickers(
                date, include_caution=exclude_caution, include_alert=exclude_alert
            )
            log.info("krx blocklist@%s: %d tickers excluded", date, len(blocked))
        except Exception as e:
            log.warning("krx blocklist fetch failed: %s — proceeding without exclusion", e)

    keep = []
    skipped_blocked = 0
    skipped_name = 0
    for ticker in df.sort_values("시가총액", ascending=False).index:
        if ticker in blocked:
            skipped_blocked += 1
            continue
        name = get_ticker_name(ticker)
        if is_excluded_by_name(name):
            skipped_name += 1
            continue
        keep.append(ticker)
        if len(keep) >= size:
            break
    log.info(
        "universe@%s size=%d/%d (blocked=%d, name_excluded=%d)",
        date, len(keep), size, skipped_blocked, skipped_name,
    )
    return keep
