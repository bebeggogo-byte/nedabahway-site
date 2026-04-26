"""CorrelationMonitor — 전략 동조화 감시 + 4번째 capital scale layer.

Pipeline 위치: Portfolio → DrawdownDefender → **CorrelationMonitor** → Strategy → ...

ctx 입출력:
- 입력: events_db + sim_db 의 daily P&L per strategy
- 출력:
  - ctx["correlation_state"]: dict (matrix, avg, max, suggested_scale)
  - ctx["capital_scale"] *= correlation_scale (직교 곱셈)

평균 corr > 0.7 시 = 다양성 붕괴 → 자본 75% 로 감축. CRO 가 활성화되면
이를 veto 신호로 사용 (신규 전략 추가 거부 등).
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from src.portfolio.correlation import compute_correlation_guard

from ..analytics.strategy_daily_pnl import compute_daily_pnl_by_strategy
from ..base import AgentContext, BaseAgent
from ..messages import Severity

log = logging.getLogger(__name__)


class CorrelationMonitor(BaseAgent):
    name = "correlation_monitor"

    def __init__(
        self,
        events_db: Path,
        sim_db: Path | None,
        history_path: Path | None = None,
        lookback_days: int = 90,
    ):
        self.events_db = events_db
        self.sim_db = sim_db
        self.lookback_days = lookback_days
        if history_path is None:
            history_path = (
                Path(__file__).resolve().parents[3] / "quant" / "data" / "correlation_history.json"
            )
        self.history_path = history_path

    def run(self, ctx: AgentContext) -> None:
        try:
            daily = compute_daily_pnl_by_strategy(
                self.events_db, self.sim_db, lookback_days=self.lookback_days,
            )
        except Exception as e:
            self.emit(ctx, "correlation_compute_failed", {"error": str(e)})
            return  # don't modify capital_scale on error

        result = compute_correlation_guard(daily)

        ctx.set("correlation_state", {
            "avg_off_diagonal": result.avg_off_diagonal,
            "max_off_diagonal": result.max_off_diagonal,
            "max_pair": list(result.max_pair) if result.max_pair else None,
            "matrix": result.matrix,
            "n_strategies": result.n_strategies,
            "severity": result.severity,
            "suggested_capital_scale": result.suggested_capital_scale,
            "rationale": result.rationale,
        })

        # Apply 4th capital scale layer (multiplicative)
        prev_scale = float(ctx.get("capital_scale", 1.0))
        new_scale = prev_scale * result.suggested_capital_scale
        ctx.set("capital_scale", new_scale)

        try:
            self._append_history(result, prev_scale, new_scale)
        except Exception as e:
            log.warning("correlation history append failed: %s", e)

        sev_map = {"ok": Severity.INFO, "warn": Severity.WARN, "fail": Severity.WARN}
        self.emit(
            ctx, "correlation_check",
            {
                "severity": result.severity,
                "avg_off_diagonal": result.avg_off_diagonal,
                "max_off_diagonal": result.max_off_diagonal,
                "max_pair": list(result.max_pair) if result.max_pair else None,
                "suggested_scale": result.suggested_capital_scale,
                "scale_before": prev_scale,
                "scale_after": new_scale,
                "rationale": result.rationale,
            },
            severity=sev_map.get(result.severity, Severity.INFO),
        )

    def _append_history(self, result, prev_scale: float, new_scale: float) -> None:
        self.history_path.parent.mkdir(parents=True, exist_ok=True)
        items: list[dict] = []
        if self.history_path.exists():
            try:
                items = json.loads(self.history_path.read_text(encoding="utf-8")).get("history", [])
            except Exception:
                pass
        today_str = datetime.now(timezone.utc).date().isoformat()
        entry = {
            "as_of": today_str,
            "avg": round(result.avg_off_diagonal, 3) if result.avg_off_diagonal is not None else None,
            "max": round(result.max_off_diagonal, 3) if result.max_off_diagonal is not None else None,
            "max_pair": list(result.max_pair) if result.max_pair else None,
            "severity": result.severity,
            "scale": result.suggested_capital_scale,
            "combined_scale": round(new_scale, 3),
            "matrix": {a: {b: round(v, 3) for b, v in row.items()} for a, row in result.matrix.items()},
        }
        if items and items[-1].get("as_of") == today_str:
            items[-1] = entry
        else:
            items.append(entry)
        items = items[-365:]
        self.history_path.write_text(json.dumps({
            "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "history": items,
            "current": entry,
        }, indent=2, ensure_ascii=False))
