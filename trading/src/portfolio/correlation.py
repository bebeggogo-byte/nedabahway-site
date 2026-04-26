"""Strategy correlation guard — 분산의 환상 탐지.

Risk parity 가 weights 를 균등 위험 으로 배분해도, 4 전략이 동시에 같은 방향
으로 움직이면 (실제 베어마켓에서 자주 발생) "분산" 은 환상이다.

본 모듈은 전략 간 daily P&L 의 pairwise correlation 을 계산하고:
- 평균 correlation 이 0.7 초과 시 = 다양성 붕괴 신호
- max correlation 이 0.85 초과 시 = 두 전략이 사실상 동일

설계:
- pandas/numpy 의존 없는 pure-Python 구현 (테스트 가벼움)
- 짧은 시리즈 (< 20일) 는 NaN — false positive 방지
- 길이 다른 시리즈는 짧은 쪽 길이로 정렬
- 결과는 결정론적 — 동일 입력 → 동일 출력
"""

from __future__ import annotations

import math
from dataclasses import dataclass


@dataclass(frozen=True)
class CorrelationGuardResult:
    pairs: dict[tuple[str, str], float]
    matrix: dict[str, dict[str, float]]
    avg_off_diagonal: float | None
    max_off_diagonal: float | None
    max_pair: tuple[str, str] | None
    n_strategies: int
    suggested_capital_scale: float  # 0.7~1.0
    severity: str  # "ok" | "warn" | "fail"
    rationale: str


def _pearson(xs: list[float], ys: list[float]) -> float | None:
    """Pure-Python pearson correlation. Returns None if undefined."""
    n = min(len(xs), len(ys))
    if n < 20:
        return None
    xs, ys = xs[-n:], ys[-n:]
    mx = sum(xs) / n
    my = sum(ys) / n
    sxx = sum((x - mx) ** 2 for x in xs)
    syy = sum((y - my) ** 2 for y in ys)
    sxy = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
    if sxx <= 0 or syy <= 0:
        return None
    return sxy / math.sqrt(sxx * syy)


def compute_correlation_guard(
    daily_pnl_by_strategy: dict[str, list[float]],
    avg_warn_threshold: float = 0.50,
    avg_fail_threshold: float = 0.70,
    max_warn_threshold: float = 0.70,
    max_fail_threshold: float = 0.85,
) -> CorrelationGuardResult:
    """전략 간 daily P&L correlation 분석.

    suggested_capital_scale 단계:
        ok    (avg < 0.50) → 1.00
        warn  (avg < 0.70) → 0.90
        fail  (avg ≥ 0.70) → 0.75
    """
    strategies = sorted(daily_pnl_by_strategy.keys())
    n = len(strategies)

    if n < 2:
        return CorrelationGuardResult(
            pairs={}, matrix={s: {s: 1.0} for s in strategies},
            avg_off_diagonal=None, max_off_diagonal=None, max_pair=None,
            n_strategies=n, suggested_capital_scale=1.0, severity="ok",
            rationale="2개 미만 전략 — 상관관계 측정 불가, 정상 노출",
        )

    pairs: dict[tuple[str, str], float] = {}
    matrix: dict[str, dict[str, float]] = {s: {} for s in strategies}
    valid_corrs: list[float] = []
    for i, a in enumerate(strategies):
        matrix[a][a] = 1.0
        for j in range(i + 1, n):
            b = strategies[j]
            corr = _pearson(daily_pnl_by_strategy[a], daily_pnl_by_strategy[b])
            if corr is None:
                continue
            pairs[(a, b)] = corr
            matrix[a][b] = corr
            matrix[b][a] = corr
            valid_corrs.append(corr)

    if not valid_corrs:
        return CorrelationGuardResult(
            pairs={}, matrix=matrix,
            avg_off_diagonal=None, max_off_diagonal=None, max_pair=None,
            n_strategies=n, suggested_capital_scale=1.0, severity="ok",
            rationale=f"{n}개 전략 중 유효 상관 페어 0 (시리즈 < 20일). 정상 노출.",
        )

    avg = sum(valid_corrs) / len(valid_corrs)
    max_c = max(valid_corrs)
    max_pair = max(pairs.items(), key=lambda kv: kv[1])[0]

    severity = "ok"
    scale = 1.00
    rationale = f"평균 corr {avg:.2f}, max {max_c:.2f}. 정상 분산."

    if avg >= avg_fail_threshold or max_c >= max_fail_threshold:
        severity = "fail"
        scale = 0.75
        if avg >= avg_fail_threshold:
            rationale = (
                f"평균 corr {avg:.2f} ≥ {avg_fail_threshold}: 5 전략이 사실상 동조화. "
                f"분산 효과 붕괴. 자본 75% 로 감축."
            )
        else:
            rationale = (
                f"max corr {max_c:.2f} ≥ {max_fail_threshold} (페어 {max_pair[0]}↔{max_pair[1]}): "
                f"두 전략이 사실상 동일. 자본 75% 로 감축."
            )
    elif avg >= avg_warn_threshold or max_c >= max_warn_threshold:
        severity = "warn"
        scale = 0.90
        rationale = (
            f"평균 corr {avg:.2f}, max {max_c:.2f} (페어 {max_pair[0]}↔{max_pair[1]}). "
            f"동조화 진행 중 — 자본 90% 로 감축."
        )

    return CorrelationGuardResult(
        pairs=pairs, matrix=matrix,
        avg_off_diagonal=avg, max_off_diagonal=max_c, max_pair=max_pair,
        n_strategies=n, suggested_capital_scale=scale, severity=severity,
        rationale=rationale,
    )
