"""Fundamental data — PBR / PER / ROE / dividend yield from KRX via pykrx.

pykrx 가 제공하는 종목별 기본지표:
- BPS, PER, PBR, EPS, DIV (배당수익률), DPS (주당배당)

ROE 는 직접 제공 안 하지만 PBR / PER 로 근사 (PBR / PER ≈ ROE).

각 일자 스냅샷을 parquet 캐시 (data/cache/fundamentals_<date>_<market>.parquet).
pykrx 부재 시 빈 DataFrame 반환 (graceful).

Used by QualityValue strategy + UniverseAgent (optional value/quality filters).
"""

from __future__ import annotations

import logging
from datetime import datetime
from pathlib import Path

import pandas as pd

from config import DATA_CACHE_DIR

log = logging.getLogger(__name__)


def _yyyymmdd(d: str | datetime) -> str:
    if isinstance(d, datetime):
        return d.strftime("%Y%m%d")
    return d.replace("-", "")


def _cache_path(date: str, market: str) -> Path:
    DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_CACHE_DIR / f"fundamentals_{market}_{_yyyymmdd(date)}.parquet"


def get_fundamentals_snapshot(date: str, market: str = "KOSPI") -> pd.DataFrame:
    """일자별 모든 종목의 기본지표.

    cols: BPS, PER, PBR, EPS, DIV, DPS
    index: ticker
    """
    cache = _cache_path(date, market)
    if cache.exists():
        try:
            return pd.read_parquet(cache)
        except Exception:
            pass

    try:
        from pykrx import stock
        df = stock.get_market_fundamental_by_ticker(_yyyymmdd(date), market=market)
        df.index.name = "ticker"
        try:
            df.to_parquet(cache)
        except Exception as e:
            log.debug("parquet cache write failed: %s", e)
        return df
    except ImportError:
        log.warning("pykrx not available; returning empty DataFrame")
        return pd.DataFrame()
    except Exception as e:
        log.warning("get_fundamentals_snapshot failed: %s", e)
        return pd.DataFrame()


def compute_roe_proxy(fundamentals: pd.DataFrame) -> pd.Series:
    """ROE 근사: PBR / PER ≈ ROE.

    PER 이 0 이거나 음수면 (적자) NaN.
    """
    if fundamentals.empty or "PER" not in fundamentals.columns or "PBR" not in fundamentals.columns:
        return pd.Series(dtype=float)
    per = pd.to_numeric(fundamentals["PER"], errors="coerce")
    pbr = pd.to_numeric(fundamentals["PBR"], errors="coerce")
    per_safe = per.where(per > 0)
    return (pbr / per_safe).rename("ROE_proxy")


def quality_value_score(date: str, market: str = "KOSPI", min_pbr: float = 0.3) -> pd.DataFrame:
    """전체 종목에 quality-value 점수 부여.

    Score = z(ROE_proxy) - z(PBR) — high ROE + low PBR 종목에 높은 점수.
    PBR 너무 낮은 종목 (< min_pbr) 은 부실 가능성 → 제외.

    Returns: index=ticker, cols=[ROE_proxy, PBR, PER, score]
    """
    f = get_fundamentals_snapshot(date, market)
    if f.empty:
        return pd.DataFrame()
    roe = compute_roe_proxy(f)
    pbr = pd.to_numeric(f["PBR"], errors="coerce")
    per = pd.to_numeric(f["PER"], errors="coerce")

    # Filter: PBR within sane range
    mask = (pbr >= min_pbr) & (pbr.notna()) & (roe.notna()) & (per > 0)
    df = pd.DataFrame({"ROE_proxy": roe, "PBR": pbr, "PER": per})[mask].copy()
    if df.empty:
        return df

    # z-scores
    df["roe_z"] = (df["ROE_proxy"] - df["ROE_proxy"].mean()) / df["ROE_proxy"].std()
    df["pbr_z"] = (df["PBR"] - df["PBR"].mean()) / df["PBR"].std()
    df["score"] = df["roe_z"] - df["pbr_z"]
    return df
