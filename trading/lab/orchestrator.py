"""Pipeline orchestrator — runs agents in dependency order for a cycle."""

from __future__ import annotations

import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path

from .base import AgentContext, BaseAgent
from .eventbus import EventBus
from .messages import CycleSummary

log = logging.getLogger(__name__)


@dataclass
class Pipeline:
    name: str
    agents: list[BaseAgent]
    halt_on_error: bool = False


class Orchestrator:
    def __init__(self, bus: EventBus):
        self.bus = bus

    def run(self, pipeline: Pipeline, cycle_id: str | None = None) -> CycleSummary:
        cycle_id = cycle_id or f"{pipeline.name}-{datetime.utcnow().strftime('%Y%m%dT%H%M%S')}-{uuid.uuid4().hex[:6]}"
        started_at = datetime.utcnow()
        self.bus.start_cycle(cycle_id, started_at.isoformat())

        ctx = AgentContext(cycle_id=cycle_id, bus=self.bus)
        summary = CycleSummary(cycle_id=cycle_id, started_at=started_at)

        log.info("=== cycle %s starting (pipeline=%s, %d agents) ===", cycle_id, pipeline.name, len(pipeline.agents))
        for agent in pipeline.agents:
            ok = agent.safe_run(ctx)
            summary.phases_run.append(agent.name)
            if not ok:
                summary.errors.append(agent.name)
                if pipeline.halt_on_error:
                    log.error("halting pipeline due to %s failure", agent.name)
                    break

        summary.intents_count = len(ctx.get("order_intents", []))
        summary.executions_count = len(ctx.get("execution_reports", []))
        summary.success_count = sum(
            1 for r in ctx.get("execution_reports", []) if getattr(r, "success", False)
        )
        summary.ended_at = datetime.utcnow()

        self.bus.end_cycle(cycle_id, summary.ended_at.isoformat(), summary.model_dump(mode="json"))
        log.info(
            "=== cycle %s done. errors=%d, intents=%d, executions=%d, success=%d ===",
            cycle_id, len(summary.errors), summary.intents_count, summary.executions_count, summary.success_count,
        )
        return summary


def make_default_bus(db_path: Path | None = None) -> EventBus:
    from config import LOG_DIR
    db = db_path or (LOG_DIR / "lab_events.db")
    return EventBus(db)
