"""Anomaly response playbook — 감지된 이상에 대한 자동 1차 대응.

PR #32 의 AnomalyDetector 가 *감지* 라면, 본 모듈은 *반응*. 인간이 anomaly
알림을 받고 똑같이 할 만한 1차 대응을 시스템이 자동 수행. 사용자 개입 없이
시스템이 안전 모드로 전환했다가 이상 사라지면 자동 복귀.

5 type → 5 action mapping (severity 별 강도 차등):

    equity_outlier FAIL    → capital_scale × 0.7 for 1 day (보수적 후퇴)
    signal_divergence FAIL → use_yesterday_signal (오늘 신호 불신)
    turnover_spike WARN    → turnover_cap 1.5x (rebalance 폭주 억제)
    critique_burst FAIL    → emergency_council_issue (긴급 의회)
    data_freshness FAIL    → halt_new_orders (CircuitBreaker 보조)

설계 원칙:
- 각 action 은 1 cycle 한정 — 다음 cycle 에서 anomaly 사라지면 정상화
- 누적 효과 가능 (예: 2 anomaly 동시 → 두 action 모두 적용)
- 모든 action 은 idempotent (중복 적용 안전)
- 모든 action 이 ctx 변경 (mutable 출력) 또는 외부 효과 (issue 생성)
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum


class ResponseAction(str, Enum):
    CAPITAL_SCALE_OVERRIDE = "capital_scale_override"  # multiplicative
    USE_YESTERDAY_SIGNAL = "use_yesterday_signal"
    TURNOVER_CAP = "turnover_cap"
    EMERGENCY_COUNCIL = "emergency_council"
    HALT_NEW_ORDERS = "halt_new_orders"


@dataclass
class PlaybookResponse:
    action: ResponseAction
    triggered_by_anomaly: str  # anomaly type
    severity_in: str  # the anomaly's severity
    parameters: dict = field(default_factory=dict)
    rationale: str = ""

    def to_dict(self) -> dict:
        return {
            "action": self.action.value,
            "triggered_by": self.triggered_by_anomaly,
            "severity_in": self.severity_in,
            "parameters": self.parameters,
            "rationale": self.rationale,
        }


def build_responses(anomalies: list[dict]) -> list[PlaybookResponse]:
    """Map detected anomalies to response actions.

    anomalies: list of Anomaly.to_dict() outputs from AnomalyDetector.
    """
    responses: list[PlaybookResponse] = []
    for a in anomalies:
        atype = a.get("type")
        sev = a.get("severity", "info")

        if atype == "equity_outlier" and sev in ("warn", "fail"):
            multiplier = 0.7 if sev == "fail" else 0.85
            responses.append(PlaybookResponse(
                action=ResponseAction.CAPITAL_SCALE_OVERRIDE,
                triggered_by_anomaly=atype,
                severity_in=sev,
                parameters={"multiplier": multiplier, "duration_cycles": 1},
                rationale=(
                    f"Equity outlier ({sev}): 다음 cycle 자본 노출도 {multiplier:.0%} 로 감축. "
                    f"이상 사라지면 자동 복귀."
                ),
            ))

        elif atype == "signal_divergence" and sev == "fail":
            responses.append(PlaybookResponse(
                action=ResponseAction.USE_YESTERDAY_SIGNAL,
                triggered_by_anomaly=atype,
                severity_in=sev,
                parameters={"duration_cycles": 1},
                rationale=(
                    "Signal divergence FAIL: 오늘 active signal 불신 — 어제 portfolio 유지. "
                    "체제 변화·전략 우연·버그 어느 것이든 1 cycle 관망."
                ),
            ))

        elif atype == "turnover_spike" and sev in ("warn", "fail"):
            cap_ratio = 1.5 if sev == "warn" else 1.2
            responses.append(PlaybookResponse(
                action=ResponseAction.TURNOVER_CAP,
                triggered_by_anomaly=atype,
                severity_in=sev,
                parameters={"max_ratio_vs_30d_mean": cap_ratio},
                rationale=(
                    f"Turnover spike ({sev}): 오늘 rebalance 를 30d 평균의 {cap_ratio:.1f}배로 제한. "
                    f"필요한 일부 거래만 우선순위로 실행."
                ),
            ))

        elif atype == "critique_burst" and sev in ("warn", "fail"):
            responses.append(PlaybookResponse(
                action=ResponseAction.EMERGENCY_COUNCIL,
                triggered_by_anomaly=atype,
                severity_in=sev,
                parameters={"create_issue": True, "priority": sev},
                rationale=(
                    f"Critique burst ({sev}): 긴급 의회 issue 자동 생성. "
                    f"4시간 내 비판자 다수 FAIL — 구조적 문제 검토 필요."
                ),
            ))

        elif atype == "data_freshness" and sev in ("warn", "fail"):
            if sev == "fail":
                responses.append(PlaybookResponse(
                    action=ResponseAction.HALT_NEW_ORDERS,
                    triggered_by_anomaly=atype,
                    severity_in=sev,
                    parameters={"duration_cycles": 1, "reason": "data_stale"},
                    rationale=(
                        "Data freshness FAIL: 데이터 신뢰도 의심 — 신규 주문 1 cycle halt. "
                        "기존 포지션은 유지. 다음 cycle 데이터 확보되면 정상화."
                    ),
                ))

    return responses


def merge_capital_scale_overrides(responses: list[PlaybookResponse], current_scale: float) -> tuple[float, list[str]]:
    """Multiply current capital_scale by all CAPITAL_SCALE_OVERRIDE multipliers."""
    rationales: list[str] = []
    new_scale = current_scale
    for r in responses:
        if r.action == ResponseAction.CAPITAL_SCALE_OVERRIDE:
            mult = float(r.parameters.get("multiplier", 1.0))
            new_scale *= mult
            rationales.append(f"× {mult:.2f} ({r.triggered_by_anomaly})")
    return new_scale, rationales


def has_action(responses: list[PlaybookResponse], action: ResponseAction) -> bool:
    return any(r.action == action for r in responses)


def get_turnover_cap(responses: list[PlaybookResponse]) -> float | None:
    """Returns smallest cap among all turnover_cap responses (most restrictive wins)."""
    caps = [
        r.parameters.get("max_ratio_vs_30d_mean")
        for r in responses if r.action == ResponseAction.TURNOVER_CAP
    ]
    caps = [c for c in caps if c is not None]
    return min(caps) if caps else None
