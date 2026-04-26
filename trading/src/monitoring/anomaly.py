"""Anomaly detection — 통계적 이상 탐지.

Phase 4 자율 운영 = 측정에서 그치지 않고 *능동적으로 이상을 찾아낸다*.
인간이 매일 대시보드를 봐야 알 수 있는 패턴들을 시스템이 자동 감지.

Watchdog (4시간마다 staleness) 와 직교:
- Watchdog: 시스템이 죽었나 (생존 신호)
- AnomalyDetector: 결과가 정상인가 (품질 신호)

5 detector 종류:

1. equity_outlier       오늘 P&L이 30일 std 의 ±3σ 초과
2. signal_divergence    어제 vs 오늘 target tickers 70% 이상 다름
3. turnover_spike       오늘 turnover 가 30일 평균의 2배 초과
4. critique_burst       4시간 내 비판자 FAIL 카운트 급증 (3+)
5. data_freshness       prices/balance 의 데이터 timestamp stale

설계 원칙:
- 순수 함수 (pandas/numpy 없이도 동작)
- 각 detector 가 None 또는 Anomaly 반환 (composable)
- False positive 최소화: 충분 표본 (n≥10) 요구
- 모든 anomaly 는 severity (info/warn/fail) 와 rationale 포함
"""

from __future__ import annotations

import math
from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class AnomalyType(str, Enum):
    EQUITY_OUTLIER = "equity_outlier"
    SIGNAL_DIVERGENCE = "signal_divergence"
    TURNOVER_SPIKE = "turnover_spike"
    CRITIQUE_BURST = "critique_burst"
    DATA_FRESHNESS = "data_freshness"


class Severity(str, Enum):
    INFO = "info"
    WARN = "warn"
    FAIL = "fail"


@dataclass(frozen=True)
class Anomaly:
    type: AnomalyType
    severity: Severity
    detected_at: str  # ISO timestamp
    metric: str
    value: float
    threshold: str
    rationale: str
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = {
            "type": self.type.value,
            "severity": self.severity.value,
            "detected_at": self.detected_at,
            "metric": self.metric,
            "value": self.value,
            "threshold": self.threshold,
            "rationale": self.rationale,
        }
        if self.metadata:
            d["metadata"] = self.metadata
        return d


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def _stdev(xs: list[float]) -> float:
    n = len(xs)
    if n < 2:
        return 0.0
    m = sum(xs) / n
    var = sum((x - m) ** 2 for x in xs) / (n - 1)
    return math.sqrt(var)


def detect_equity_outlier(
    pnl_pcts_30d: list[float],
    today_pnl_pct: float,
    z_threshold: float = 3.0,
) -> Anomaly | None:
    """오늘 일일 수익률이 최근 30일 std 의 ±3σ 초과."""
    if len(pnl_pcts_30d) < 10:
        return None
    mean = sum(pnl_pcts_30d) / len(pnl_pcts_30d)
    std = _stdev(pnl_pcts_30d)
    if std < 1e-9:
        return None
    z = (today_pnl_pct - mean) / std
    if abs(z) < z_threshold:
        return None
    severity = Severity.FAIL if abs(z) > z_threshold * 1.5 else Severity.WARN
    direction = "급등" if z > 0 else "급락"
    return Anomaly(
        type=AnomalyType.EQUITY_OUTLIER,
        severity=severity,
        detected_at=_now_iso(),
        metric="daily_pnl_z_score",
        value=round(z, 2),
        threshold=f"|z| < {z_threshold}",
        rationale=(
            f"오늘 수익률 {today_pnl_pct*100:+.2f}% 가 30d 평균 {mean*100:+.2f}% 대비 "
            f"z={z:+.2f} ({direction}). 일반적이지 않은 움직임 — 사유 검토 필요."
        ),
    )


def detect_signal_divergence(
    yesterday_tickers: set[str],
    today_tickers: set[str],
    threshold: float = 0.70,
) -> Anomaly | None:
    """어제 vs 오늘 target tickers 가 70% 이상 다름."""
    if not yesterday_tickers or not today_tickers:
        return None
    union = yesterday_tickers | today_tickers
    if len(union) < 5:
        return None
    intersection = yesterday_tickers & today_tickers
    jaccard = len(intersection) / len(union)
    divergence = 1.0 - jaccard
    if divergence < threshold:
        return None
    severity = Severity.FAIL if divergence > 0.85 else Severity.WARN
    return Anomaly(
        type=AnomalyType.SIGNAL_DIVERGENCE,
        severity=severity,
        detected_at=_now_iso(),
        metric="signal_jaccard_divergence",
        value=round(divergence, 3),
        threshold=f"< {threshold}",
        rationale=(
            f"어제 {len(yesterday_tickers)} → 오늘 {len(today_tickers)} 픽 중 공통 {len(intersection)}개. "
            f"divergence {divergence:.0%}. 전략이 갑자기 다른 종목으로 — 우연·체제 변화·버그 의심."
        ),
        metadata={
            "yesterday_n": len(yesterday_tickers),
            "today_n": len(today_tickers),
            "common_n": len(intersection),
        },
    )


def detect_turnover_spike(
    daily_turnovers_30d: list[float],
    today_turnover: float,
    multiplier_threshold: float = 2.0,
) -> Anomaly | None:
    """오늘 turnover 가 30일 평균의 2배 초과."""
    if len(daily_turnovers_30d) < 10:
        return None
    mean = sum(daily_turnovers_30d) / len(daily_turnovers_30d)
    if mean < 1e-9:
        return None
    ratio = today_turnover / mean
    if ratio < multiplier_threshold:
        return None
    severity = Severity.FAIL if ratio > 3.0 else Severity.WARN
    return Anomaly(
        type=AnomalyType.TURNOVER_SPIKE,
        severity=severity,
        detected_at=_now_iso(),
        metric="turnover_ratio_vs_30d_mean",
        value=round(ratio, 2),
        threshold=f"< {multiplier_threshold}x",
        rationale=(
            f"오늘 turnover {today_turnover:,.0f} 가 30d 평균 {mean:,.0f} 의 {ratio:.1f}배. "
            f"비정상적 rebalancing — 신호 불안정 또는 전략 추가/폐기 직후 가능."
        ),
    )


def detect_critique_burst(
    fail_count_4h: int,
    burst_threshold: int = 3,
) -> Anomaly | None:
    """최근 4시간 내 비판자 FAIL 카운트가 임계값 초과."""
    if fail_count_4h < burst_threshold:
        return None
    severity = Severity.FAIL if fail_count_4h >= burst_threshold * 2 else Severity.WARN
    return Anomaly(
        type=AnomalyType.CRITIQUE_BURST,
        severity=severity,
        detected_at=_now_iso(),
        metric="critique_fail_count_4h",
        value=float(fail_count_4h),
        threshold=f"< {burst_threshold}",
        rationale=(
            f"최근 4시간 비판자 FAIL {fail_count_4h}건. 구조적 문제 가능성 — 의회 즉시 소집 권고."
        ),
    )


def detect_data_freshness(
    last_data_ts: datetime | None,
    max_stale_hours: float = 30.0,
) -> Anomaly | None:
    """가격/잔고 데이터 timestamp 가 stale (> 30시간)."""
    if last_data_ts is None:
        return Anomaly(
            type=AnomalyType.DATA_FRESHNESS,
            severity=Severity.WARN,
            detected_at=_now_iso(),
            metric="last_data_timestamp",
            value=0.0,
            threshold=f"< {max_stale_hours}h ago",
            rationale="데이터 timestamp 없음 (시스템 초기 상태 또는 fetch 실패)",
        )
    now = datetime.now(timezone.utc)
    if last_data_ts.tzinfo is None:
        last_data_ts = last_data_ts.replace(tzinfo=timezone.utc)
    stale_hours = (now - last_data_ts).total_seconds() / 3600.0
    if stale_hours <= max_stale_hours:
        return None
    severity = Severity.FAIL if stale_hours > max_stale_hours * 2 else Severity.WARN
    return Anomaly(
        type=AnomalyType.DATA_FRESHNESS,
        severity=severity,
        detected_at=_now_iso(),
        metric="hours_since_last_data",
        value=round(stale_hours, 1),
        threshold=f"< {max_stale_hours}h",
        rationale=(
            f"마지막 데이터 fetch 가 {stale_hours:.1f}시간 전. "
            f"평일 cron (24h 주기) 의 1.25배 초과 — pykrx/KIS 응답 실패 의심."
        ),
    )


def detect_all(
    pnl_pcts_30d: list[float] | None = None,
    today_pnl_pct: float | None = None,
    yesterday_tickers: set[str] | None = None,
    today_tickers: set[str] | None = None,
    daily_turnovers_30d: list[float] | None = None,
    today_turnover: float | None = None,
    fail_count_4h: int = 0,
    last_data_ts: datetime | None = None,
) -> list[Anomaly]:
    """Composite — runs all 5 detectors. Returns only non-None Anomalies."""
    anomalies: list[Anomaly] = []
    if pnl_pcts_30d is not None and today_pnl_pct is not None:
        a = detect_equity_outlier(pnl_pcts_30d, today_pnl_pct)
        if a:
            anomalies.append(a)
    if yesterday_tickers is not None and today_tickers is not None:
        a = detect_signal_divergence(yesterday_tickers, today_tickers)
        if a:
            anomalies.append(a)
    if daily_turnovers_30d is not None and today_turnover is not None:
        a = detect_turnover_spike(daily_turnovers_30d, today_turnover)
        if a:
            anomalies.append(a)
    a = detect_critique_burst(fail_count_4h)
    if a:
        anomalies.append(a)
    a = detect_data_freshness(last_data_ts)
    if a:
        anomalies.append(a)
    return anomalies
