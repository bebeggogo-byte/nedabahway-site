"""Regime-conditional strategy activation — 체제별 전략 가중치 조정.

기존 4-layer 자본 보호는 *얼마나* 베팅하는가만 결정. 본 모듈은 *어느 전략을*
강조할지 체제별로 조정. 학술 + 실증 기반 multiplier matrix.

학술적 근거:
- Momentum (Jegadeesh & Titman 1993): 강한 추세 시 작동, 횡보장에서 손실
- Mean Reversion (Lo & MacKinlay 1990): 횡보·과반응 시 작동, 추세장에서 손실
- Low Volatility (Frazzini & Pedersen 2014): 베어 회복기 outperform
- Quality (Asness 2019): 베어마켓 방어, 위기 시 빛남
- Volatility Breakout (Williams): momentum 의 일중 변형

체제별 전략 적합도 (multiplier on top of risk parity weights):

    전략              BULL    NORMAL  CHOPPY  BEAR
    ────────────────────────────────────────────
    Momentum          1.20    1.00    0.50    0.30
    Mean Reversion    0.70    1.00    1.30    0.80
    Low Volatility    0.90    1.00    1.10    1.20
    VBO               1.10    1.00    0.70    0.40
    Quality Value     0.90    1.00    1.00    1.30

이 multiplier 가 기존 raw_weights 에 곱해진 후 재정규화. 즉:
    final_w_i = raw_w_i × regime_multiplier[strategy_i, current_regime]
    final_w_i /= Σ final_w_j

설계 원칙:
- 결정론적 매핑 (LLM 의회 활성화 시 CIO 가 override 가능)
- 모든 전략이 모든 체제에서 0 이상 (완전 차단은 lifecycle 권한)
- multiplier 합이 4 (전략 수) — 평균 1.0 유지
- 미지의 전략 (default 외 신규) 은 1.0 (neutral) 사용
"""

from __future__ import annotations

from dataclasses import dataclass, field


# (strategy_name, regime_label) → multiplier
_REGIME_MATRIX: dict[str, dict[str, float]] = {
    "xs_momentum": {
        "bull":   1.20,  # 추세 폭발 시 outperform
        "normal": 1.00,
        "choppy": 0.50,  # 횡보장에서 whipsaw 손실
        "bear":   0.30,  # 베어에서 가장 위험
    },
    "mean_reversion": {
        "bull":   0.70,  # 강한 추세 시 일찍 매수
        "normal": 1.00,
        "choppy": 1.30,  # 가장 빛나는 체제
        "bear":   0.80,  # 회복기에 작동
    },
    "low_volatility": {
        "bull":   0.90,  # 시장 추월 못함
        "normal": 1.00,
        "choppy": 1.10,
        "bear":   1.20,  # 방어주 강세
    },
    "volatility_breakout": {
        "bull":   1.10,  # 단기 momentum 변형
        "normal": 1.00,
        "choppy": 0.70,  # whipsaw 위험
        "bear":   0.40,  # 단타 매수 매우 위험
    },
    "quality_value": {
        "bull":   0.90,  # 성장주에 밀림
        "normal": 1.00,
        "choppy": 1.00,
        "bear":   1.30,  # 가장 빛나는 체제 (위기 시 안전자산)
    },
}


@dataclass(frozen=True)
class RegimeTiltResult:
    regime: str
    multipliers: dict[str, float]
    weights_before: dict[str, float]
    weights_after: dict[str, float]
    rationale: str


def get_strategy_multiplier(strategy: str, regime: str) -> float:
    """Returns multiplier for (strategy, regime). Unknown strategies = 1.0 (neutral)."""
    row = _REGIME_MATRIX.get(strategy, {})
    return row.get(regime, 1.0)


def apply_regime_tilts(
    weights: dict[str, float],
    regime: str | None,
) -> RegimeTiltResult:
    """Apply regime-conditional multipliers to weights, then renormalize.

    weights: {strategy_name: weight} (output of risk parity / lifecycle)
    regime: 'bull'|'normal'|'choppy'|'bear'|None (None = no tilt applied)

    Returns RegimeTiltResult with before/after + rationale.
    """
    if not weights or regime is None:
        return RegimeTiltResult(
            regime=regime or "none",
            multipliers={},
            weights_before=dict(weights),
            weights_after=dict(weights),
            rationale="No regime detected — weights unchanged.",
        )

    multipliers = {s: get_strategy_multiplier(s, regime) for s in weights}
    raw_after = {s: w * multipliers[s] for s, w in weights.items()}
    total = sum(raw_after.values())
    if total <= 0:
        return RegimeTiltResult(
            regime=regime,
            multipliers=multipliers,
            weights_before=dict(weights),
            weights_after=dict(weights),
            rationale=f"All weights zero after tilt — keeping original weights.",
        )
    after = {s: w / total for s, w in raw_after.items()}

    # Build rationale showing biggest shifts
    deltas = sorted(
        [(s, after[s] - weights[s]) for s in weights],
        key=lambda x: -abs(x[1])
    )
    top_shifts = ", ".join(
        f"{s} {('+' if d > 0 else '')}{d*100:.1f}pp"
        for s, d in deltas[:3]
    )
    rationale = f"{regime.upper()} 체제: 상위 변경 {top_shifts}"

    return RegimeTiltResult(
        regime=regime,
        multipliers=multipliers,
        weights_before=dict(weights),
        weights_after=after,
        rationale=rationale,
    )
