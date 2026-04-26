"""AnomalyResponder — playbook actions 자동 적용.

Pipeline 위치: 사이클 *초반* (DataAgent 직후, RegimeAgent 직전).
이전 cycle 의 AnomalyDetector 가 anomalies.json 에 기록한 이상을 읽어,
이번 cycle 에 적용할 playbook actions 를 결정·적용.

1-cycle 시차로 작동:
    어제 cycle:  AnomalyDetector → anomalies.json (이상 기록)
    오늘 cycle:  AnomalyResponder ← anomalies.json (이상 읽고 대응)
                 → ... pipeline ...
                 AnomalyDetector → 새 이상 기록

이상이 사라지면 다음 cycle 자동 정상화 (idempotent).

ctx 에 반영되는 효과:
- ctx["capital_scale"] 추가 곱셈 (×0.7 등)
- ctx["use_yesterday_signal"] = True (StrategyAgent 가 활용)
- ctx["turnover_cap_ratio"] = float (RiskAgent 가 활용)
- ctx["halt_new_orders"] = True (ExecutionAgent 가 활용)
- ctx["emergency_council"] = True (외부 issue 생성 hook)
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from src.monitoring.playbook import (
    ResponseAction,
    build_responses, get_turnover_cap, has_action, merge_capital_scale_overrides,
)

from ..base import AgentContext, BaseAgent
from ..messages import Severity

log = logging.getLogger(__name__)


class AnomalyResponder(BaseAgent):
    name = "anomaly_responder"

    def __init__(self, anomalies_path: Path | None = None):
        if anomalies_path is None:
            anomalies_path = (
                Path(__file__).resolve().parents[3] / "quant" / "data" / "anomalies.json"
            )
        self.anomalies_path = anomalies_path

    def run(self, ctx: AgentContext) -> None:
        if not self.anomalies_path.exists():
            self.emit(ctx, "responder_no_state", {"reason": "anomalies.json not found yet"})
            ctx.set("active_responses", [])
            return

        try:
            data = json.loads(self.anomalies_path.read_text(encoding="utf-8"))
        except Exception as e:
            self.emit(ctx, "responder_read_failed", {"error": str(e)})
            ctx.set("active_responses", [])
            return

        # Use *current* (most recent cycle's) anomalies
        prev_anomalies = data.get("current", []) or []
        if not prev_anomalies:
            self.emit(ctx, "responder_no_anomalies", {})
            ctx.set("active_responses", [])
            self._persist_active([], ctx.cycle_id)
            return

        responses = build_responses(prev_anomalies)
        if not responses:
            self.emit(ctx, "responder_no_actions", {"n_anomalies": len(prev_anomalies)})
            ctx.set("active_responses", [])
            self._persist_active([], ctx.cycle_id)
            return

        # 1) capital_scale multiplicative override
        prev_scale = float(ctx.get("capital_scale", 1.0))
        new_scale, override_rationales = merge_capital_scale_overrides(responses, prev_scale)
        if new_scale != prev_scale:
            ctx.set("capital_scale", new_scale)

        # 2) use_yesterday_signal flag
        if has_action(responses, ResponseAction.USE_YESTERDAY_SIGNAL):
            ctx.set("use_yesterday_signal", True)

        # 3) turnover cap
        cap = get_turnover_cap(responses)
        if cap is not None:
            ctx.set("turnover_cap_ratio", cap)

        # 4) halt_new_orders
        if has_action(responses, ResponseAction.HALT_NEW_ORDERS):
            ctx.set("halt_new_orders", True)

        # 5) emergency_council (external hook — log it; CI/workflow can react later)
        if has_action(responses, ResponseAction.EMERGENCY_COUNCIL):
            ctx.set("emergency_council", True)

        ctx.set("active_responses", [r.to_dict() for r in responses])

        sev = Severity.WARN
        self.emit(ctx, "playbook_responses", {
            "n_responses": len(responses),
            "actions": [r.action.value for r in responses],
            "responses": [r.to_dict() for r in responses],
            "capital_scale_before": prev_scale,
            "capital_scale_after": new_scale,
            "scale_overrides": override_rationales,
        }, severity=sev)

        self._persist_active([r.to_dict() for r in responses], ctx.cycle_id)

    def _persist_active(self, responses: list[dict], cycle_id: str) -> None:
        out_path = self.anomalies_path.parent / "active_responses.json"
        items: list[dict] = []
        if out_path.exists():
            try:
                items = json.loads(out_path.read_text(encoding="utf-8")).get("history", [])
            except Exception:
                pass
        items.append({
            "cycle_id": cycle_id,
            "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "n_active": len(responses),
            "actions": [r["action"] for r in responses],
        })
        items = items[-200:]
        out_path.write_text(json.dumps({
            "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "current": responses,
            "history": items,
        }, indent=2, ensure_ascii=False))
