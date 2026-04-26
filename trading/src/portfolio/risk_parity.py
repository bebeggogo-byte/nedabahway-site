"""Risk parity weighting — equal risk contribution, not equal capital.

Bridgewater All Weather, AQR, Two Sigma 등 대형 펀드의 표준 자본배분.
"단순 평균보다 sharper" — 학술·실전 모두 검증.

작동:
1. 각 전략의 realized vol 측정 (60d 표준)
2. inverse-vol weighting: w_i = (1/σ_i) / Σ(1/σ_j)
3. floor (5%) / cap (40%) 제약 + 재정규화
4. cold-start (충분 데이터 없음) → fallback (static defaults)

설계 원칙:
- 순수 함수 (입력만 → 출력만, I/O 없음)
- pandas 의존성 최소 (numpy 도 optional)
- 테스트 가능: equal-vol → equal weights, skewed-vol → inverse 검증
"""

from __future__ import annotations

import logging
import math
from dataclasses import dataclass

log = logging.getLogger(__name__)


@dataclass(frozen=True)
class RiskParityResult:
    weights: dict[str, float]
    realized_vols: dict[str, float]  # annualized (or just std if periodic)
    method: str  # "inverse_vol" | "fallback_equal" | "fallback_static"
    n_eligible: int
    rationale: str


def _stdev(xs: list[float]) -> float:
    n = len(xs)
    if n < 2:
        return 0.0
    mean = sum(xs) / n
    var = sum((x - mean) ** 2 for x in xs) / (n - 1)
    return math.sqrt(var)


def _apply_floor_cap(
    raw: dict[str, float],
    min_weight: float,
    max_weight: float,
    max_iter: int = 20,
) -> dict[str, float]:
    """floor/cap 제약 적용 후 재정규화. 위반 종목을 binding 하고 나머지 재분배."""
    w = dict(raw)
    if not w:
        return w
    for _ in range(max_iter):
        total = sum(w.values())
        if total <= 0:
            return {k: 1.0 / len(w) for k in w}
        # normalize
        w = {k: v / total for k, v in w.items()}
        # find violations
        capped = {k: v for k, v in w.items() if v > max_weight}
        floored = {k: v for k, v in w.items() if v < min_weight}
        if not capped and not floored:
            return w
        # bind violators at their bounds, redistribute rest
        bound: dict[str, float] = {}
        free: dict[str, float] = {}
        for k, v in w.items():
            if v > max_weight:
                bound[k] = max_weight
            elif v < min_weight:
                bound[k] = min_weight
            else:
                free[k] = v
        bound_total = sum(bound.values())
        free_target = max(0.0, 1.0 - bound_total)
        free_sum = sum(free.values())
        if free_sum > 0:
            new_free = {k: v / free_sum * free_target for k, v in free.items()}
        else:
            new_free = {}
        w = {**bound, **new_free}
    # final normalize
    total = sum(w.values())
    return {k: v / total for k, v in w.items()} if total > 0 else w


def compute_risk_parity_weights(
    daily_pnl_by_strategy: dict[str, list[float]],
    min_history_days: int = 30,
    min_weight: float = 0.05,
    max_weight: float = 0.40,
    fallback_weights: dict[str, float] | None = None,
    annualization_factor: float = 252.0,
) -> RiskParityResult:
    """Inverse-vol weighting with floor/cap.

    daily_pnl_by_strategy: {strategy: list of daily $ P&L (one per trading day)}
        — 각 list 의 std 가 그 전략의 risk proxy. 길이가 다른 시리즈도 OK.

    Cold start (모든 전략이 min_history_days 미만): fallback_weights 또는 균등 분배.
    """
    if not daily_pnl_by_strategy:
        if fallback_weights:
            total = sum(fallback_weights.values())
            w = {k: v / total for k, v in fallback_weights.items()} if total > 0 else fallback_weights
            return RiskParityResult(weights=w, realized_vols={}, method="fallback_static",
                                    n_eligible=0, rationale="입력 없음 → static fallback")
        return RiskParityResult(weights={}, realized_vols={}, method="fallback_static",
                                n_eligible=0, rationale="입력 없음 + fallback 없음")

    eligible: dict[str, list[float]] = {}
    for s, pnls in daily_pnl_by_strategy.items():
        if pnls and len(pnls) >= min_history_days:
            eligible[s] = pnls

    if not eligible:
        n = len(daily_pnl_by_strategy)
        if fallback_weights:
            # restrict fallback to known strategies if possible
            relevant = {k: v for k, v in fallback_weights.items() if k in daily_pnl_by_strategy}
            if relevant and (total := sum(relevant.values())) > 0:
                w = {k: v / total for k, v in relevant.items()}
                return RiskParityResult(weights=w, realized_vols={}, method="fallback_static",
                                        n_eligible=0, rationale=f"이력 부족 (모든 전략 < {min_history_days}d) → static")
        equal = 1.0 / max(n, 1)
        return RiskParityResult(
            weights={s: equal for s in daily_pnl_by_strategy},
            realized_vols={}, method="fallback_equal", n_eligible=0,
            rationale=f"이력 부족 (모든 전략 < {min_history_days}d) → 균등 분배",
        )

    # Realized stdev → annualized vol (proxy)
    vols: dict[str, float] = {}
    for s, pnls in eligible.items():
        std = _stdev(pnls)
        if std > 1e-9:
            vols[s] = std * math.sqrt(annualization_factor)

    if not vols:
        n = len(eligible)
        equal = 1.0 / max(n, 1)
        return RiskParityResult(
            weights={s: equal for s in eligible}, realized_vols={},
            method="fallback_equal", n_eligible=n,
            rationale="모든 전략이 zero-vol (이상) → 균등 분배",
        )

    inv = {s: 1.0 / v for s, v in vols.items()}
    inv_total = sum(inv.values())
    raw = {s: iv / inv_total for s, iv in inv.items()}

    constrained = _apply_floor_cap(raw, min_weight, max_weight)

    rationale = (
        f"Risk parity: {len(vols)} 전략 inverse-vol weighting. "
        f"vol range [{min(vols.values()):.1%}, {max(vols.values()):.1%}]. "
        f"floor={min_weight:.0%}, cap={max_weight:.0%}."
    )
    return RiskParityResult(
        weights=constrained, realized_vols=vols,
        method="inverse_vol", n_eligible=len(vols), rationale=rationale,
    )
