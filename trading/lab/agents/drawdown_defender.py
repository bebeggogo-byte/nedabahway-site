"""DrawdownDefender — 자기 자본 곡선의 drawdown 기반 자본 보호.

Pipeline 위치: Universe → Data → Regime → Portfolio → **DrawdownDefender** → Strategy → ...

ctx 입출력:
- 입력: events_db 의 daily_pnl 시리즈 (252d 윈도우)
- 출력:
  - ctx["dd_scale"]: float (0.0~1.0, drawdown 기반 capital 다중자)
  - ctx["dd_state"]: dict (current_dd, band, rationale)
  - ctx["capital_scale"]: 갱신 (regime_scale × dd_scale)

Regime 의 capital_scale 을 *추가로* 곱해서 갱신한다. 두 메커니즘 직교.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

from src.portfolio.drawdown_defense import compute_drawdown_defense, equity_to_drawdown

from ..base import AgentContext, BaseAgent
from ..messages import Severity

log = logging.getLogger(__name__)


@contextmanager
def _ro(db_path: Path):
    if not db_path.exists():
        yield None
        return
    conn = sqlite3.connect(f"file:{db_path}?mode=ro", uri=True)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
    finally:
        conn.close()


def _equity_252d(events_db: Path) -> list[float]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=400)).isoformat()
    rows: list[tuple[str, int]] = []
    with _ro(events_db) as c:
        if c is None:
            return []
        for r in c.execute(
            "SELECT payload_json FROM events WHERE payload_type='daily_pnl' AND ts >= ? ORDER BY ts ASC",
            (cutoff,),
        ).fetchall():
            p = json.loads(r["payload_json"])
            d = p.get("date")
            eq = p.get("ending_equity")
            if d and eq is not None:
                rows.append((d, int(eq)))
    by_date: dict[str, int] = {}
    for d, eq in rows:
        by_date[d] = eq
    sorted_dates = sorted(by_date.keys())[-252:]
    return [by_date[d] for d in sorted_dates]


class DrawdownDefender(BaseAgent):
    name = "drawdown_defender"

    def __init__(self, events_db: Path, history_path: Path | None = None):
        self.events_db = events_db
        if history_path is None:
            history_path = (
                Path(__file__).resolve().parents[3] / "quant" / "data" / "drawdown_defense.json"
            )
        self.history_path = history_path

    def run(self, ctx: AgentContext) -> None:
        equity_series = _equity_252d(self.events_db)
        if len(equity_series) < 5:
            self.emit(ctx, "dd_insufficient_data", {
                "n_observations": len(equity_series),
                "note": "최소 5일 equity 필요. 평상시 운영 중 (자본 100% 노출).",
            })
            ctx.set("dd_scale", 1.0)
            ctx.set("dd_state", {"current_dd": 0.0, "band": "insufficient_data", "rationale": "5일 이력 미만"})
            return

        current_dd = equity_to_drawdown(equity_series)
        result = compute_drawdown_defense(current_dd)

        ctx.set("dd_scale", result.capital_scale)
        ctx.set("dd_state", {
            "current_dd": result.current_drawdown,
            "capital_scale": result.capital_scale,
            "band": result.threshold_band,
            "rationale": result.rationale,
        })

        # 직교 결합: 기존 capital_scale (regime) 에 곱한다
        prev_scale = float(ctx.get("capital_scale", 1.0))
        new_scale = prev_scale * result.capital_scale
        ctx.set("capital_scale", new_scale)

        # Persist daily snapshot
        try:
            self._append_history(result, prev_scale, new_scale)
        except Exception as e:
            log.warning("dd history append failed: %s", e)

        sev = Severity.WARN if result.threshold_band in ("defensive", "strong_defense", "halt") else Severity.INFO
        self.emit(ctx, "drawdown_defense", {
            "current_drawdown": result.current_drawdown,
            "dd_capital_scale": result.capital_scale,
            "regime_capital_scale_before": prev_scale,
            "combined_capital_scale_after": new_scale,
            "band": result.threshold_band,
            "rationale": result.rationale,
        }, severity=sev)

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
            "current_drawdown": round(result.current_drawdown, 4),
            "dd_scale": result.capital_scale,
            "band": result.threshold_band,
            "regime_scale": round(prev_scale, 3),
            "combined_scale": round(new_scale, 3),
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
