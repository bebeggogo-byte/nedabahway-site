"""BaseAgent — common interface every agent implements.

Deterministic agents in PR #2: just Python functions wrapped to publish
events. LLM agents in PR #3 will inherit the same interface but call
Claude Code subagents internally.
"""

from __future__ import annotations

import logging
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from .eventbus import EventBus
from .messages import AgentMessage, Severity

log = logging.getLogger(__name__)


@dataclass
class AgentContext:
    """Shared per-cycle context. Agents read inputs / write outputs here."""

    cycle_id: str
    bus: EventBus
    state: dict[str, Any] = field(default_factory=dict)

    def get(self, key: str, default: Any = None) -> Any:
        return self.state.get(key, default)

    def set(self, key: str, value: Any) -> None:
        self.state[key] = value


class BaseAgent(ABC):
    name: str

    def emit(
        self,
        ctx: AgentContext,
        payload_type: str,
        payload: dict,
        severity: Severity = Severity.INFO,
    ) -> None:
        msg = AgentMessage(
            agent=self.name,
            cycle_id=ctx.cycle_id,
            payload_type=payload_type,
            payload=payload,
            severity=severity,
        )
        ctx.bus.publish(msg)

    @abstractmethod
    def run(self, ctx: AgentContext) -> None:
        """Read from ctx.state, do work, write back to ctx.state, emit events."""

    def safe_run(self, ctx: AgentContext) -> bool:
        try:
            log.info("[%s] starting (cycle=%s)", self.name, ctx.cycle_id)
            self.run(ctx)
            log.info("[%s] done", self.name)
            return True
        except Exception as e:
            log.exception("[%s] failed", self.name)
            self.emit(
                ctx,
                payload_type="agent_error",
                payload={"error": str(e), "type": type(e).__name__},
                severity=Severity.ERROR,
            )
            return False
