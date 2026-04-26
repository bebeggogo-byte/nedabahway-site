"""Market regime detection — the meta-layer above strategy selection.

베어마켓에서 모든 전략이 동일하게 잘 작동한다는 가정은 위험하다. 모멘텀은
베어에서 손실, 평균회귀도 추세 깨질 때 작동 안 함, 저변동성도 패닉에서 동반
하락. 이런 경우 *전략 선택* 자체보다 *자본 노출도 조절* 이 더 중요하다.

본 모듈은 KOSPI 200d MA + 20d 실현 변동성 + drawdown 깊이의 세 신호를 결합해
시장 체제를 4가지로 분류한다:

- BULL:   200d MA 위 + drawdown 얕음 + vol 안정
- BEAR:   200d MA 아래 + drawdown 깊음
- CHOPPY: 200d MA 근처 + vol 급등
- NORMAL: 위 어디에도 강하게 해당 안 됨 (default)

세 신호를 모두 사용하는 이유: 단일 200d MA 만 쓰면 횡보장에서 잦은 false
signal, 단일 vol 만 쓰면 추세 시점 놓침, drawdown 만 쓰면 회복 중에도 bear
판정. 결합으로 robustness 확보.
"""

from __future__ import annotations

import json
import logging
import math
from dataclasses import dataclass, asdict
from datetime import date, datetime, timedelta, timezone
from enum import Enum
from pathlib import Path

import pandas as pd

from config import DATA_CACHE_DIR

log = logging.getLogger(__name__)


class RegimeLabel(str, Enum):
    BULL = "bull"
    BEAR = "bear"
    CHOPPY = "choppy"
    NORMAL = "normal"


@dataclass(frozen=True)
class RegimeState:
    """Snapshot of market regime + diagnostic signals.

    `recommended_capital_scale` is the suggested global multiplier on all
    target weights downstream:
      bull   → 1.0  (full deployment)
      normal → 0.85 (slight defensive cash buffer)
      choppy → 0.6  (defensive)
      bear   → 0.4  (heavy defensive)
    """

    as_of: date
    label: RegimeLabel
    recommended_capital_scale: float
    confidence: float  # 0..1, how strongly the signals agree

    # Diagnostic signals
    above_200ma: bool
    distance_from_200ma_pct: float
    realized_vol_20d_annualized: float
    drawdown_from_peak_252d: float
    rationale: str

    def to_dict(self) -> dict:
        d = asdict(self)
        d["label"] = self.label.value
        d["as_of"] = self.as_of.isoformat()
        return d


def _kospi_close_series(start: str, end: str) -> pd.Series | None:
    """Fetch KOSPI close prices via pykrx. Returns None if unavailable."""
    try:
        from pykrx import stock
        df = stock.get_index_ohlcv_by_date(
            start.replace("-", ""), end.replace("-", ""), "1001"  # 1001 = KOSPI
        )
        if df.empty:
            return None
        col = "종가" if "종가" in df.columns else "Close"
        s = df[col].astype(float)
        s.index = pd.to_datetime(s.index)
        return s
    except ImportError:
        log.warning("pykrx unavailable; regime detection disabled")
        return None
    except Exception as e:
        log.warning("KOSPI fetch failed: %s", e)
        return None


def _classify(
    above_ma: bool,
    distance_pct: float,
    vol_20d: float,
    dd_252d: float,
) -> tuple[RegimeLabel, float, float, str]:
    """Returns (label, capital_scale, confidence, rationale)."""

    # Strong bear: clearly below MA + meaningful drawdown
    if not above_ma and distance_pct < -0.05 and dd_252d < -0.15:
        scale = 0.4
        confidence = min(1.0, abs(distance_pct) / 0.15 + abs(dd_252d) / 0.30)
        rationale = (
            f"BEAR: KOSPI {abs(distance_pct):.1%} below 200d MA, "
            f"drawdown {dd_252d:.1%} from 252d peak. 자본 40% 만 배치, 60% 현금."
        )
        return RegimeLabel.BEAR, scale, min(confidence, 1.0), rationale

    # Strong bull: well above MA + low vol + shallow drawdown
    if above_ma and distance_pct > 0.05 and dd_252d > -0.10 and vol_20d < 0.30:
        scale = 1.0
        confidence = min(1.0, distance_pct / 0.15)
        rationale = (
            f"BULL: KOSPI {distance_pct:.1%} above 200d MA, "
            f"vol {vol_20d:.1%}, shallow drawdown. 전 자본 배치."
        )
        return RegimeLabel.BULL, scale, min(confidence, 1.0), rationale

    # Choppy: high vol or near MA with whipsaws
    if vol_20d > 0.35 or (abs(distance_pct) < 0.03 and dd_252d < -0.08):
        scale = 0.6
        confidence = min(1.0, vol_20d / 0.50)
        rationale = (
            f"CHOPPY: vol {vol_20d:.1%} 급등 또는 MA 근처 채로 -8% 이상 drawdown. "
            f"자본 60% 배치."
        )
        return RegimeLabel.CHOPPY, scale, min(confidence, 1.0), rationale

    # Default: normal — slightly defensive
    scale = 0.85
    confidence = 0.5
    rationale = (
        f"NORMAL: signals 약한 mixed (above_ma={above_ma}, "
        f"dist={distance_pct:.1%}, vol={vol_20d:.1%}, dd={dd_252d:.1%}). "
        f"기본 85% 배치."
    )
    return RegimeLabel.NORMAL, scale, confidence, rationale


def detect_regime(as_of: date | str | None = None) -> RegimeState | None:
    """Detect current market regime. Returns None if data unavailable."""
    if as_of is None:
        as_of = date.today()
    elif isinstance(as_of, str):
        as_of = date.fromisoformat(as_of)

    # Need ~280 days of history for 200d MA + 252d drawdown window
    start = (as_of - timedelta(days=400)).isoformat()
    end = as_of.isoformat()
    closes = _kospi_close_series(start, end)
    if closes is None or len(closes) < 200:
        return None

    last_close = float(closes.iloc[-1])
    ma200 = float(closes.tail(200).mean())
    above_200ma = last_close > ma200
    distance_from_200ma_pct = (last_close - ma200) / ma200

    rets_20d = closes.pct_change().tail(20).dropna()
    if len(rets_20d) < 5:
        return None
    vol_20d_ann = float(rets_20d.std(ddof=1) * math.sqrt(252))

    closes_252 = closes.tail(252)
    peak = float(closes_252.max())
    dd_from_peak = (last_close - peak) / peak if peak > 0 else 0.0

    label, scale, confidence, rationale = _classify(
        above_200ma, distance_from_200ma_pct, vol_20d_ann, dd_from_peak,
    )

    return RegimeState(
        as_of=as_of,
        label=label,
        recommended_capital_scale=scale,
        confidence=confidence,
        above_200ma=above_200ma,
        distance_from_200ma_pct=distance_from_200ma_pct,
        realized_vol_20d_annualized=vol_20d_ann,
        drawdown_from_peak_252d=dd_from_peak,
        rationale=rationale,
    )


def detect_regime_synthetic(
    closes: pd.Series, as_of: date | None = None
) -> RegimeState | None:
    """Test variant — accepts any close series (not just KOSPI)."""
    if as_of is None:
        as_of = date.today()
    if len(closes) < 200:
        return None

    last_close = float(closes.iloc[-1])
    ma200 = float(closes.tail(200).mean())
    above_200ma = last_close > ma200
    distance_from_200ma_pct = (last_close - ma200) / ma200

    rets_20d = closes.pct_change().tail(20).dropna()
    if len(rets_20d) < 5:
        return None
    vol_20d_ann = float(rets_20d.std(ddof=1) * math.sqrt(252))

    closes_252 = closes.tail(252)
    peak = float(closes_252.max())
    dd_from_peak = (last_close - peak) / peak if peak > 0 else 0.0

    label, scale, confidence, rationale = _classify(
        above_200ma, distance_from_200ma_pct, vol_20d_ann, dd_from_peak,
    )
    return RegimeState(
        as_of=as_of, label=label,
        recommended_capital_scale=scale, confidence=confidence,
        above_200ma=above_200ma,
        distance_from_200ma_pct=distance_from_200ma_pct,
        realized_vol_20d_annualized=vol_20d_ann,
        drawdown_from_peak_252d=dd_from_peak,
        rationale=rationale,
    )


def append_to_history(history_path: Path, state: RegimeState) -> None:
    """Append state to JSON history (append-only log for dashboard chart)."""
    history_path.parent.mkdir(parents=True, exist_ok=True)
    items = []
    if history_path.exists():
        try:
            items = json.loads(history_path.read_text(encoding="utf-8")).get("history", [])
        except Exception:
            pass
    new_entry = state.to_dict()
    if items and items[-1].get("as_of") == new_entry["as_of"]:
        items[-1] = new_entry
    else:
        items.append(new_entry)
    items = items[-365:]  # keep last year
    history_path.write_text(json.dumps({
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "history": items,
    }, indent=2, ensure_ascii=False))
