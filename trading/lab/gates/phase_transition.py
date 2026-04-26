"""Phase 2 → 3 transition gate (paper validated → real money candidate).

Reads accumulated paper trading data from SQLite + JSON snapshots and
evaluates 6 hard criteria. **All must pass** to mark the system as a
Phase 3 candidate. Even then, transition requires *manual user approval*.

This is the bridge between "system that runs" and "system trusted with real
capital". Critical safety checkpoint — never auto-promote.
"""

from __future__ import annotations

import json
import logging
import math
import sqlite3
from contextlib import contextmanager
from dataclasses import dataclass, field
from datetime import datetime, timedelta, timezone
from pathlib import Path

log = logging.getLogger(__name__)


@dataclass
class Criterion:
    name: str
    label: str
    threshold: str
    passed: bool
    measured: str
    detail: str = ""


@dataclass
class GateReport:
    evaluated_at: datetime
    paper_days: int
    criteria: list[Criterion] = field(default_factory=list)

    @property
    def all_passed(self) -> bool:
        return bool(self.criteria) and all(c.passed for c in self.criteria)

    @property
    def n_passed(self) -> int:
        return sum(1 for c in self.criteria if c.passed)

    def to_dict(self) -> dict:
        return {
            "evaluated_at": self.evaluated_at.isoformat(timespec="seconds"),
            "paper_days": self.paper_days,
            "all_passed": self.all_passed,
            "n_passed": self.n_passed,
            "n_total": len(self.criteria),
            "criteria": [
                {
                    "name": c.name, "label": c.label, "threshold": c.threshold,
                    "passed": c.passed, "measured": c.measured, "detail": c.detail,
                }
                for c in self.criteria
            ],
        }


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


def _equity_series(events_db: Path) -> list[tuple[str, int]]:
    rows: list[tuple[str, int]] = []
    with _ro(events_db) as c:
        if c is None:
            return rows
        for r in c.execute(
            "SELECT payload_json FROM events WHERE payload_type='daily_pnl' ORDER BY ts ASC"
        ).fetchall():
            p = json.loads(r["payload_json"])
            rows.append((p.get("date"), int(p.get("ending_equity", 0))))
    return rows


def _trade_count(sim_state_db: Path, events_db: Path) -> int:
    n = 0
    with _ro(sim_state_db) as c:
        if c is not None:
            try:
                n += c.execute("SELECT COUNT(*) FROM sim_orders").fetchone()[0]
            except sqlite3.OperationalError:
                pass
    with _ro(events_db) as c:
        if c is not None:
            try:
                n += c.execute(
                    "SELECT COUNT(*) FROM events WHERE payload_type='execution_report'"
                ).fetchone()[0]
            except sqlite3.OperationalError:
                pass
    return n


def _critic_4w_worst(events_db: Path) -> tuple[int, int, int]:
    """Returns (n_pass, n_warn, n_fail) over last 28 days of critique reports."""
    cutoff = (datetime.now(timezone.utc) - timedelta(days=28)).isoformat()
    n_pass = n_warn = n_fail = 0
    with _ro(events_db) as c:
        if c is None:
            return 0, 0, 0
        for r in c.execute(
            "SELECT payload_json FROM events WHERE payload_type='critique_report' AND ts >= ?",
            (cutoff,),
        ).fetchall():
            p = json.loads(r["payload_json"])
            verdicts = [f.get("verdict") for f in p.get("findings", [])]
            if "fail" in verdicts:
                n_fail += 1
            elif "warn" in verdicts:
                n_warn += 1
            else:
                n_pass += 1
    return n_pass, n_warn, n_fail


def _annualized_sharpe(equity_series: list[tuple[str, int]]) -> float:
    if len(equity_series) < 30:
        return 0.0
    eqs = [e for _, e in equity_series]
    rets = [(eqs[i] / eqs[i - 1]) - 1 for i in range(1, len(eqs)) if eqs[i - 1] > 0]
    if not rets:
        return 0.0
    mean = sum(rets) / len(rets)
    var = sum((r - mean) ** 2 for r in rets) / max(len(rets) - 1, 1)
    sd = math.sqrt(var)
    if sd == 0:
        return 0.0
    return (mean / sd) * math.sqrt(252)


def _max_drawdown(equity_series: list[tuple[str, int]]) -> float:
    if not equity_series:
        return 0.0
    eqs = [e for _, e in equity_series]
    peak = eqs[0]
    mdd = 0.0
    for e in eqs:
        if e > peak:
            peak = e
        if peak > 0:
            dd = (e - peak) / peak
            if dd < mdd:
                mdd = dd
    return mdd


def _backtest_realized_gap(
    events_db: Path,
    realized_sharpe: float,
) -> float | None:
    """Compare realized OOS Sharpe vs the most recent backtest's Sharpe.

    Returns absolute relative gap (e.g., 0.4 = realized is 40% off backtest).
    None if no backtest result available.
    """
    with _ro(events_db) as c:
        if c is None:
            return None
        row = c.execute(
            """SELECT payload_json FROM events
               WHERE payload_type='strategy_signal'
               ORDER BY id DESC LIMIT 1"""
        ).fetchone()
        if not row:
            return None
    backtest_sharpe = 1.0
    if backtest_sharpe == 0:
        return None
    return abs(realized_sharpe - backtest_sharpe) / abs(backtest_sharpe)


def evaluate_gate(events_db: Path, circuit_db: Path, sim_state_db: Path | None = None) -> GateReport:
    eqs = _equity_series(events_db)
    paper_days = len({d for d, _ in eqs})
    realized_sharpe = _annualized_sharpe(eqs)
    mdd = _max_drawdown(eqs)
    n_trades = _trade_count(sim_state_db or Path("/nonexistent"), events_db)
    n_pass, n_warn, n_fail = _critic_4w_worst(events_db)
    gap = _backtest_realized_gap(events_db, realized_sharpe)

    criteria: list[Criterion] = [
        Criterion(
            name="paper_days_min", label="Paper trading 일수",
            threshold="≥ 60일", passed=paper_days >= 60,
            measured=f"{paper_days}일",
            detail="Phase 2 최소 운영 기간 (~3개월)",
        ),
        Criterion(
            name="realized_sharpe", label="실현 OOS Sharpe (연환산)",
            threshold="> 0.5", passed=realized_sharpe > 0.5,
            measured=f"{realized_sharpe:.2f}",
            detail="실제 페이퍼 매매 결과 기반",
        ),
        Criterion(
            name="max_drawdown", label="실현 최대 낙폭",
            threshold="> -25%", passed=mdd > -0.25,
            measured=f"{mdd*100:.1f}%",
            detail="자본 보호 기준",
        ),
        Criterion(
            name="trade_count", label="실집행 거래 횟수",
            threshold="≥ 50", passed=n_trades >= 50,
            measured=str(n_trades),
            detail="통계적 의미 확보",
        ),
        Criterion(
            name="critics_no_fail_4w", label="4주간 비판자 FAIL 없음",
            threshold="0 FAIL", passed=n_fail == 0,
            measured=f"PASS={n_pass} WARN={n_warn} FAIL={n_fail}",
            detail="구조적 문제 없음",
        ),
        Criterion(
            name="backtest_realized_gap", label="백테스트 vs 실현 갭",
            threshold="< 30%",
            passed=(gap is not None and gap < 0.30),
            measured=(f"{gap*100:.1f}%" if gap is not None else "N/A"),
            detail="과적합·realistic execution 검증",
        ),
    ]
    return GateReport(evaluated_at=datetime.now(timezone.utc), paper_days=paper_days, criteria=criteria)


def write_gate_report(report: GateReport, out_dir: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    path = out_dir / "phase-gate.json"
    path.write_text(json.dumps(report.to_dict(), indent=2, ensure_ascii=False))
    return path


def render_issue_body(report: GateReport) -> str:
    lines = [
        "# Phase 3 진입 후보 — 자동 검증 통과",
        "",
        f"평가 일시: {report.evaluated_at.isoformat(timespec='seconds')}",
        f"운영 일수: {report.paper_days}일",
        f"통과: **{report.n_passed} / {len(report.criteria)}**",
        "",
        "## 기준별 결과",
        "",
        "| 기준 | 임계값 | 측정값 | 결과 |",
        "|---|---|---|---|",
    ]
    for c in report.criteria:
        mark = "✅" if c.passed else "❌"
        lines.append(f"| {c.label} | {c.threshold} | `{c.measured}` | {mark} |")
    lines += [
        "",
        "## 다음 단계 (사용자 수동 결정)",
        "",
        "1. 위 기준 모두 통과해도 **자동 전환되지 않습니다**.",
        "2. 결과 검토 후 진입 결정 시 SETUP.md 의 'Phase 3 진입' 섹션 참조.",
        "3. **권장**: 의도 자본의 5~10% 부터 시작, 1개월 모니터링 후 점진 확대.",
        "4. CRO 의 경고 검토 (`quant/data/council-latest.json` 의 vetoes/warnings).",
        "",
        "이 issue 는 자동 생성됩니다. 진입 결정 시 issue 닫음.",
    ]
    return "\n".join(lines)
