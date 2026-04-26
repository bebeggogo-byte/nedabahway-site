"""Pydantic message schemas for inter-agent communication.

All messages flow through the EventBus and are persisted for replay/audit.
"""

from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class Severity(str, Enum):
    INFO = "info"
    WARN = "warn"
    ERROR = "error"
    BLOCK = "block"


class AgentMessage(BaseModel):
    """Base envelope for everything posted to the bus."""

    agent: str
    cycle_id: str
    ts: datetime = Field(default_factory=datetime.utcnow)
    payload_type: str
    payload: dict[str, Any]
    severity: Severity = Severity.INFO
    correlation_id: str | None = None


class UniverseSnapshot(BaseModel):
    as_of: datetime
    market: str
    tickers: list[str]
    rejected: dict[str, str] = Field(default_factory=dict)
    rationale: str = ""


class PriceFrameRef(BaseModel):
    """Reference to cached price panel; agents pass refs not data."""

    cache_key: str
    fields: list[str]
    start: datetime
    end: datetime
    n_tickers: int
    n_rows: int


class StrategySignal(BaseModel):
    strategy: str
    as_of: datetime
    target_weights: dict[str, float]
    metadata: dict[str, Any] = Field(default_factory=dict)


class OrderIntent(BaseModel):
    ticker: str
    side: str  # buy | sell
    qty: int
    target_price: int
    order_type: str = "market"  # market | limit
    rationale: str = ""
    attribution: dict[str, float] = Field(default_factory=dict)
    """Map of sub-strategy name → fraction of this order. Sum should = 1.0.
    Used for per-strategy P&L attribution downstream."""
    expected_price: int | None = None
    """Expected fill price at signal generation (mid or last close).
    Compared against actual fill_price downstream for TCA slippage measurement."""


class RiskCheckResult(BaseModel):
    allowed: bool
    reason: str = ""
    adjusted_intents: list[OrderIntent] = Field(default_factory=list)
    blocked_intents: list[OrderIntent] = Field(default_factory=list)


class ExecutionReport(BaseModel):
    intent: OrderIntent
    success: bool
    broker_order_id: str | None = None
    fill_price: int | None = None
    fee: float | None = None
    error: str | None = None


class CycleSummary(BaseModel):
    cycle_id: str
    started_at: datetime
    ended_at: datetime | None = None
    phases_run: list[str] = Field(default_factory=list)
    errors: list[str] = Field(default_factory=list)
    intents_count: int = 0
    executions_count: int = 0
    success_count: int = 0


class Verdict(str, Enum):
    PASS = "pass"
    WARN = "warn"
    FAIL = "fail"


class Critique(BaseModel):
    """Single finding from a critic agent."""

    critic: str
    target: str  # e.g., "backtest:xs_momentum" or "live:order_intent:005930"
    verdict: Verdict
    metric: str
    value: float | str | None = None
    threshold: float | str | None = None
    detail: str = ""


class CritiqueReport(BaseModel):
    critic: str
    target: str
    findings: list[Critique]
    summary: str = ""

    @property
    def worst_verdict(self) -> Verdict:
        if any(f.verdict == Verdict.FAIL for f in self.findings):
            return Verdict.FAIL
        if any(f.verdict == Verdict.WARN for f in self.findings):
            return Verdict.WARN
        return Verdict.PASS
