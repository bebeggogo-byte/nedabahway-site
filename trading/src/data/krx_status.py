"""KRX status fetchers — detect 관리종목 / 거래정지 / 투자주의·경고.

Uses pykrx's admin/caution/alert listing APIs. Each call is cached per-day to
avoid hammering KRX. Network failures fall back to empty sets (defensive — no
data means we can't filter, but we don't crash).

Used by UniverseAgent (exclude from picks) and MicrostructureSkeptic
(hard-fail any order intent on these tickers).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime
from pathlib import Path

from config import DATA_CACHE_DIR

log = logging.getLogger(__name__)


def _yyyymmdd(d: str | datetime) -> str:
    if isinstance(d, datetime):
        return d.strftime("%Y%m%d")
    return d.replace("-", "")


def _cache_path(name: str) -> Path:
    DATA_CACHE_DIR.mkdir(parents=True, exist_ok=True)
    return DATA_CACHE_DIR / f"krx_status_{name}.json"


def _read_cache(name: str) -> set[str] | None:
    p = _cache_path(name)
    if not p.exists():
        return None
    try:
        return set(json.loads(p.read_text(encoding="utf-8")))
    except Exception:
        return None


def _write_cache(name: str, tickers: set[str]) -> None:
    _cache_path(name).write_text(json.dumps(sorted(tickers), ensure_ascii=False))


def _try_pykrx(fn_name: str, date: str) -> set[str]:
    try:
        from pykrx import stock as _stock
    except ImportError:
        return set()
    fn = getattr(_stock, fn_name, None)
    if fn is None:
        return set()
    try:
        result = fn(date)
        if hasattr(result, "index"):
            return set(result.index.tolist())
        if isinstance(result, (list, tuple, set)):
            return set(result)
        return set()
    except Exception as e:
        log.warning("%s(%s) failed: %s", fn_name, date, e)
        return set()


def get_admin_issue_tickers(date: str) -> set[str]:
    """관리종목 — 상장폐지 가능성 있는 종목."""
    d = _yyyymmdd(date)
    name = f"admin_{d}"
    cached = _read_cache(name)
    if cached is not None:
        return cached
    s = _try_pykrx("get_market_admin_list_by_date", d)
    if not s:
        s = _try_pykrx("get_market_admin_list", d)
    _write_cache(name, s)
    return s


def get_caution_tickers(date: str) -> set[str]:
    """투자주의 (caution)."""
    d = _yyyymmdd(date)
    name = f"caution_{d}"
    cached = _read_cache(name)
    if cached is not None:
        return cached
    s = _try_pykrx("get_market_caution_list_by_date", d)
    if not s:
        s = _try_pykrx("get_market_caution_list", d)
    _write_cache(name, s)
    return s


def get_alert_tickers(date: str) -> set[str]:
    """투자경고·위험."""
    d = _yyyymmdd(date)
    name = f"alert_{d}"
    cached = _read_cache(name)
    if cached is not None:
        return cached
    s = _try_pykrx("get_market_alert_list_by_date", d)
    if not s:
        s = _try_pykrx("get_market_alert_list", d)
    _write_cache(name, s)
    return s


def get_halted_tickers_heuristic(date: str, candidate_tickers: list[str], market: str = "KOSPI") -> set[str]:
    """Heuristic halted detection: 0 volume on `date`.

    pykrx 가 정확한 거래정지 리스트 API 를 제공하지 않으면 OHLCV 의 거래량 0 으로
    근사. False positive 가능 (정말 거래량 0 인 일반 종목) — 보수적이고 안전한 방향.
    """
    try:
        from pykrx import stock as _stock
    except ImportError:
        return set()
    d = _yyyymmdd(date)
    halted: set[str] = set()
    for ticker in candidate_tickers:
        try:
            df = _stock.get_market_ohlcv_by_date(d, d, ticker)
            if df.empty:
                halted.add(ticker)
                continue
            row = df.iloc[-1]
            vol = row.get("거래량", row.get("Volume", 0))
            if int(vol) == 0:
                halted.add(ticker)
        except Exception:
            continue
    return halted


def get_blocked_tickers(date: str, include_caution: bool = True, include_alert: bool = True) -> set[str]:
    """Combined exclusion set: admin + (optionally) caution + alert.

    Halted detection is too expensive across full universe — call the
    heuristic separately on a candidate list when needed.
    """
    blocked = get_admin_issue_tickers(date)
    if include_caution:
        blocked = blocked | get_caution_tickers(date)
    if include_alert:
        blocked = blocked | get_alert_tickers(date)
    return blocked
