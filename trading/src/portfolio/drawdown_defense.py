"""Realized drawdown defense — gradual capital scaling based on own equity drawdown.

CircuitBreaker 는 binary halt (모 아니면 도). Regime 은 시장 기준.
하지만 시장이 정상이고 CB 한도 미만이라도 -10% drawdown 이 진행 중이면
시스템적 결함의 가능성. 자동으로 자본 노출도를 점진 감축.

세 메커니즘이 곱해져서 final capital scale 을 만든다 (서로 독립·직교):

    final_scale = regime_scale × portfolio_dd_scale × (CircuitBreaker on/off)
                  ↑ 시장 기준    ↑ 자기 자본 손실    ↑ catastrophic halt

각 메커니즘 단독으로는 모 아니면 도가 아니라 *gradient* 를 형성. 함께 곱해질 때
부드러운 자본 축소가 가능.

Drawdown thresholds (자기 자본 곡선의 252d 고점 대비):
    0  ~ -3%   →  1.00  (정상)
   -3 ~ -7%   →  0.85  (경고)
   -7 ~ -12%  →  0.65  (방어)
  -12 ~ -15%  →  0.45  (강한 방어)
   -15% 미만  →  0.0   (CircuitBreaker 인계)

선형 보간 대신 step 으로 정한 이유: 명료한 임계값이 디버깅과 backtesting 에서
재현성 ↑. Smooth 가 필요하면 추후 sigmoid 변형 가능.
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class DrawdownDefenseResult:
    current_drawdown: float  # negative number, e.g., -0.08 = -8%
    capital_scale: float
    threshold_band: str  # "normal" | "alert" | "defensive" | "strong_defense" | "halt"
    rationale: str


_BANDS: list[tuple[float, float, str, str]] = [
    # (drawdown_threshold, capital_scale, band_name, rationale_template)
    (0.0,    1.00, "normal",          "DD {dd:.1%} > -3%. 정상 자본 노출."),
    (-0.03,  0.85, "alert",           "DD {dd:.1%}: -3% 진입. 자본 85% (15% 방어 cushion)."),
    (-0.07,  0.65, "defensive",       "DD {dd:.1%}: -7% 진입. 자본 65% (구조적 손실 의심)."),
    (-0.12,  0.45, "strong_defense",  "DD {dd:.1%}: -12% 진입. 자본 45% (시스템 결함 가능성, 회복 우선)."),
    (-0.15,  0.00, "halt",            "DD {dd:.1%}: -15% 초과. CircuitBreaker 인계. 신규 노출 0%."),
]


def compute_drawdown_defense(current_drawdown: float) -> DrawdownDefenseResult:
    """Drawdown 값(음수) 을 받아 capital_scale 결정.

    current_drawdown: 0 또는 음수. 양수가 들어오면 0으로 clamp (정상 운영 중에는 새 high 갱신).
    """
    dd = min(0.0, float(current_drawdown))
    band_name = "normal"
    scale = 1.00
    rationale = "DD 0%. 정상 자본 노출."
    for threshold, s, name, template in _BANDS:
        if dd <= threshold:
            band_name = name
            scale = s
            rationale = template.format(dd=dd)
    return DrawdownDefenseResult(
        current_drawdown=dd,
        capital_scale=scale,
        threshold_band=band_name,
        rationale=rationale,
    )


def equity_to_drawdown(equity_series: list[float]) -> float:
    """Compute current drawdown from peak in given equity series.

    equity_series: time-ordered list of portfolio equity values.
    Returns 0.0 or negative float.
    """
    if not equity_series:
        return 0.0
    peak = max(equity_series)
    if peak <= 0:
        return 0.0
    current = equity_series[-1]
    return (current - peak) / peak
