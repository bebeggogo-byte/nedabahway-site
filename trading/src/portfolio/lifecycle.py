"""Strategy lifecycle — 전략 로스터의 생애주기 관리.

지금까지 5 전략은 코드에 박혀있고 retirement 는 알람만 발생. Phase 4 정상
운영은 시간이 갈수록 새 전략이 들어오고 폐기되는 동적 시스템.

본 모듈은 명시적 상태 전이를 정의하고, 각 단계에서 자동 검증·승격이 가능
하게 한다. 전략의 입구와 출구가 모두 코드화 — 실거래 진입 후에도 안전하게
새 전략을 추가하고 부진한 전략을 폐기할 수 있는 구조.

상태 전이:

    proposal      Researcher LLM 또는 사용자 제안. 가중치 0.
       ↓ walk-forward Sharpe > 0.5 + n_trials >= 3
    validating    검증 진행 중. 가중치 0.
       ↓ CTO 코드 승인 (issue 라벨 또는 LLM)
    probation     4주 실집행 monitoring. 가중치 cap 10%.
       ↓ 4주 OK + win_rate > 0.45
    active        정상 ensemble. 가중치 = risk_parity 결과.
       ↓ retirement_candidate (PR #20) 4주 연속
    retired       가중치 0. 코드는 보존 (재가동 가능).

Persistence: quant/data/strategy_lifecycle.json — append-only audit log.
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path


class LifecycleState(str, Enum):
    PROPOSAL = "proposal"
    VALIDATING = "validating"
    PROBATION = "probation"
    ACTIVE = "active"
    RETIRED = "retired"


@dataclass
class StrategyLifecycle:
    name: str
    state: LifecycleState
    entered_state_at: str  # ISO date
    proposal_source: str  # "default" | "researcher_llm" | "manual" | "..."
    weight_cap: float  # 0.0 (proposal/validating/retired) | 0.10 (probation) | 1.0 (active)
    history: list[dict] = field(default_factory=list)  # transitions
    metadata: dict = field(default_factory=dict)

    def to_dict(self) -> dict:
        d = asdict(self)
        d["state"] = self.state.value
        return d


_STATE_WEIGHT_CAPS: dict[LifecycleState, float] = {
    LifecycleState.PROPOSAL: 0.0,
    LifecycleState.VALIDATING: 0.0,
    LifecycleState.PROBATION: 0.10,
    LifecycleState.ACTIVE: 1.0,  # uncapped (subject to risk_parity)
    LifecycleState.RETIRED: 0.0,
}


def weight_cap_for(state: LifecycleState) -> float:
    return _STATE_WEIGHT_CAPS[state]


def transition(
    current: StrategyLifecycle,
    new_state: LifecycleState,
    reason: str,
    actor: str = "system",
) -> StrategyLifecycle:
    """Append-only state transition. Returns NEW object (immutable update)."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    history_entry = {
        "ts": now,
        "from": current.state.value,
        "to": new_state.value,
        "reason": reason,
        "actor": actor,
    }
    new_history = list(current.history) + [history_entry]
    return StrategyLifecycle(
        name=current.name,
        state=new_state,
        entered_state_at=now,
        proposal_source=current.proposal_source,
        weight_cap=weight_cap_for(new_state),
        history=new_history,
        metadata=dict(current.metadata),
    )


def make_default_strategy(name: str) -> StrategyLifecycle:
    """Default 5 strategies start as ACTIVE (legacy onboarding)."""
    now = datetime.now(timezone.utc).isoformat(timespec="seconds")
    return StrategyLifecycle(
        name=name,
        state=LifecycleState.ACTIVE,
        entered_state_at=now,
        proposal_source="default",
        weight_cap=1.0,
        history=[{
            "ts": now, "from": None, "to": "active",
            "reason": "default v1 strategy", "actor": "system",
        }],
        metadata={"is_default": True},
    )


_DEFAULT_STRATEGIES = [
    "xs_momentum", "mean_reversion", "low_volatility",
    "volatility_breakout", "quality_value",
]


def load_or_init_registry(path: Path) -> dict[str, StrategyLifecycle]:
    """Read registry from disk; if missing, initialize 5 defaults as ACTIVE."""
    if path.exists():
        try:
            data = json.loads(path.read_text(encoding="utf-8"))
            registry: dict[str, StrategyLifecycle] = {}
            for name, item in data.get("strategies", {}).items():
                registry[name] = StrategyLifecycle(
                    name=name,
                    state=LifecycleState(item["state"]),
                    entered_state_at=item["entered_state_at"],
                    proposal_source=item.get("proposal_source", "unknown"),
                    weight_cap=float(item.get("weight_cap", weight_cap_for(LifecycleState(item["state"])))),
                    history=item.get("history", []),
                    metadata=item.get("metadata", {}),
                )
            return registry
        except Exception:
            pass
    return {name: make_default_strategy(name) for name in _DEFAULT_STRATEGIES}


def save_registry(path: Path, registry: dict[str, StrategyLifecycle]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = {
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "strategies": {name: s.to_dict() for name, s in registry.items()},
    }
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False))


def apply_caps(
    raw_weights: dict[str, float],
    registry: dict[str, StrategyLifecycle],
) -> dict[str, float]:
    """Cap weights according to lifecycle state, then renormalize.

    proposal/validating/retired → 0
    probation → min(raw, 0.10)
    active → raw (uncapped by lifecycle, still subject to risk_parity floor/cap)
    """
    capped: dict[str, float] = {}
    for name, w in raw_weights.items():
        s = registry.get(name)
        if s is None:
            capped[name] = 0.0
            continue
        cap = s.weight_cap
        if cap <= 0:
            capped[name] = 0.0
        else:
            capped[name] = min(w, cap)
    total = sum(capped.values())
    if total <= 0:
        return capped
    return {k: v / total for k, v in capped.items()}
