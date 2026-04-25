from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import pandas as pd
from pykrx import stock

from config import DATA_CACHE_DIR

log = logging.getLogger(__name__)


def _cache_path(name: str) -> Path:
    DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_CACHE_DIR / f"{name}.parquet"


def _yyyymmdd(d: str | datetime) -> str:
    if isinstance(d, datetime):
        return d.strftime("%Y%m%d")
    return d.replace("-", "")


def load_ohlcv(ticker: str, start: str, end: str, use_cache: bool = True) -> pd.DataFrame:
    """일봉 OHLCV. index=Date(datetime), cols=[Open, High, Low, Close, Volume]."""
    start, end = _yyyymmdd(start), _yyyymmdd(end)
    cache = _cache_path(f"ohlcv_{ticker}_{start}_{end}")
    if use_cache and cache.exists():
        return pd.read_parquet(cache)

    df = stock.get_market_ohlcv_by_date(start, end, ticker)
    if df.empty:
        return df
    df.index.name = "Date"
    df = df.rename(columns={"시가": "Open", "고가": "High", "저가": "Low", "종가": "Close", "거래량": "Volume"})
    df = df[["Open", "High", "Low", "Close", "Volume"]].astype({"Volume": "int64"})
    df.to_parquet(cache)
    return df


def load_universe_ohlcv(
    tickers: list[str], start: str, end: str, field: str = "Close"
) -> pd.DataFrame:
    """유니버스 전체 일봉 패널. index=Date, cols=ticker, values=field."""
    frames = {}
    for t in tickers:
        try:
            df = load_ohlcv(t, start, end)
            if not df.empty:
                frames[t] = df[field]
        except Exception as e:
            log.warning("load_ohlcv failed for %s: %s", t, e)
    if not frames:
        return pd.DataFrame()
    return pd.concat(frames, axis=1)


def get_market_cap_snapshot(date: str, market: str = "KOSPI") -> pd.DataFrame:
    """특정 일자 시총/거래대금 스냅샷. cols=[종목명, 시가총액, 거래대금, 상장주식수]."""
    date = _yyyymmdd(date)
    cache = _cache_path(f"mcap_{market}_{date}")
    if cache.exists():
        return pd.read_parquet(cache)
    df = stock.get_market_cap_by_ticker(date, market=market)
    df.index.name = "ticker"
    df.to_parquet(cache)
    return df


def get_listed_tickers(date: str, market: str = "KOSPI") -> list[str]:
    """해당 일자 상장 종목 리스트 (보통주 기준)."""
    return stock.get_market_ticker_list(_yyyymmdd(date), market=market)


def get_ticker_name(ticker: str) -> str:
    try:
        return stock.get_market_ticker_name(ticker)
    except Exception:
        return ticker


_EXCLUDE_NAME_KEYWORDS = ("스팩", "우B", "우C", "리츠", "ETN")


def is_excluded_by_name(name: str) -> bool:
    return any(k in name for k in _EXCLUDE_NAME_KEYWORDS) or name.endswith("우")
