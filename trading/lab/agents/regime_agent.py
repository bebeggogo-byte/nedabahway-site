"""RegimeAgent — meta-layer 시장 체제 감지.

Pipeline 위치: Data → **Regime** → Strategy → Balance → Risk → Microstructure → Execute

ctx 출력:
- ctx["regime"] = RegimeState (None 가능, 데이터 부재 시)
- ctx["capital_scale"] = float (RiskAgent 가 모든 weight 에 곱)

기본값 (체제 미감지 시): capital_scale = 0.85 (NORMAL 가정, 약간 방어).
"""

from __future__ import annotations

import logging
from datetime import date
from pathlib import Path

from src.data.regime import RegimeState, append_to_history, detect_regime

from ..base import AgentContext, BaseAgent
from ..messages import Severity

log = logging.getLogger(__name__)


class RegimeAgent(BaseAgent):
    name = "regime_classifier"

    def __init__(self, history_path: Path | None = None):
        if history_path is None:
            history_path = (
                Path(__file__).resolve().parents[3] / "quant" / "data" / "regime_history.json"
            )
        self.history_path = history_path

    def run(self, ctx: AgentContext) -> None:
        try:
            state = detect_regime(date.today())
        except Exception as e:
            self.emit(ctx, "regime_detect_failed", {"error": str(e)}, severity=Severity.WARN)
            ctx.set("regime", None)
            ctx.set("capital_scale", 0.85)
            return

        if state is None:
            self.emit(ctx, "regime_unavailable", {"reason": "KOSPI data not retrievable"})
            ctx.set("regime", None)
            ctx.set("capital_scale", 0.85)
            return

        ctx.set("regime", state)
        ctx.set("capital_scale", state.recommended_capital_scale)

        try:
            append_to_history(self.history_path, state)
        except Exception as e:
            log.warning("regime history append failed: %s", e)

        sev = Severity.WARN if state.label.value in ("bear", "choppy") else Severity.INFO
        self.emit(ctx, "regime_state", state.to_dict(), severity=sev)
