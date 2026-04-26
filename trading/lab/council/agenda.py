"""Weekly council agenda preparation.

Reads recent events / decisions / critiques from SQLite, renders a Markdown
agenda that the 5 LLM agents will consume. The agenda is committed so any
human (or CI) can audit what data the council saw.

PR #14 ships the agenda renderer + a dry-run council that records what each
agent *would* be asked. Real LLM execution wiring (Claude Code action) is in
the next PR.
"""

from __future__ import annotations

import json
import logging
import sqlite3
from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

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


def _recent_cycles(events_db: Path, days: int = 7) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows: list[dict] = []
    with _ro(events_db) as c:
        if c is None:
            return rows
        for r in c.execute(
            "SELECT cycle_id, started_at, ended_at, summary_json FROM cycles WHERE started_at >= ? ORDER BY started_at DESC",
            (cutoff,),
        ).fetchall():
            s = json.loads(r["summary_json"]) if r["summary_json"] else {}
            rows.append({
                "cycle_id": r["cycle_id"],
                "started_at": r["started_at"],
                "errors": s.get("errors", []),
                "intents": s.get("intents_count", 0),
                "executions": s.get("executions_count", 0),
                "success": s.get("success_count", 0),
            })
    return rows


def _recent_critiques(events_db: Path, days: int = 7) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows: list[dict] = []
    with _ro(events_db) as c:
        if c is None:
            return rows
        for r in c.execute(
            """SELECT ts, agent, payload_json FROM events
               WHERE payload_type='critique_report' AND ts >= ?
               ORDER BY id DESC""",
            (cutoff,),
        ).fetchall():
            p = json.loads(r["payload_json"])
            verdicts = [f.get("verdict") for f in p.get("findings", [])]
            worst = "fail" if "fail" in verdicts else ("warn" if "warn" in verdicts else "pass")
            rows.append({
                "ts": r["ts"],
                "critic": r["agent"],
                "target": p.get("target"),
                "worst": worst,
                "n_findings": len(p.get("findings", [])),
            })
    return rows


def _recent_pnl(events_db: Path, days: int = 28) -> list[dict]:
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    rows: list[dict] = []
    with _ro(events_db) as c:
        if c is None:
            return rows
        for r in c.execute(
            """SELECT payload_json FROM events
               WHERE payload_type='daily_pnl' AND ts >= ?
               ORDER BY ts ASC""",
            (cutoff,),
        ).fetchall():
            rows.append(json.loads(r["payload_json"]))
    return rows


def render_agenda(events_db: Path, circuit_db: Path, week_of: str) -> str:
    cycles = _recent_cycles(events_db)
    critiques = _recent_critiques(events_db)
    pnl = _recent_pnl(events_db)

    def fmt_pnl_summary(p):
        if not p:
            return "no daily P&L recorded yet"
        first = p[0]["starting_equity"]
        last = p[-1]["ending_equity"]
        ret = (last - first) / first if first else 0
        return f"{len(p)} days, return={ret*100:+.2f}%, equity {first:,} → {last:,}"

    crit_groups: dict[str, dict[str, int]] = {}
    for c in critiques:
        crit_groups.setdefault(c["critic"], {"pass": 0, "warn": 0, "fail": 0})
        crit_groups[c["critic"]][c["worst"]] += 1

    md = f"""# Quant Lab — Weekly Council Agenda · Week of {week_of}

## 1. Summary

- Cycles last 7d: **{len(cycles)}**, errors: **{sum(len(c['errors']) for c in cycles)}**
- Total intents: {sum(c['intents'] for c in cycles)} · executions: {sum(c['executions'] for c in cycles)} · success: {sum(c['success'] for c in cycles)}
- 4-week P&L: {fmt_pnl_summary(pnl)}

## 2. Recent Cycles (7d)

| cycle_id | when | intents | exec | success | errors |
|---|---|---|---|---|---|
"""
    for c in cycles[:14]:
        md += f"| `{c['cycle_id']}` | {c['started_at']} | {c['intents']} | {c['executions']} | {c['success']} | {len(c['errors'])} |\n"

    md += "\n## 3. Critic Verdict Summary (7d)\n\n"
    if crit_groups:
        md += "| critic | pass | warn | fail |\n|---|---|---|---|\n"
        for crit, counts in crit_groups.items():
            md += f"| {crit} | {counts['pass']} | {counts['warn']} | {counts['fail']} |\n"
    else:
        md += "_No critique reports in window._\n"

    md += "\n## 4. Recent P&L (28d)\n\n"
    if pnl:
        md += "| date | starting | ending | pnl | pnl_pct |\n|---|---|---|---|---|\n"
        for p in pnl[-14:]:
            md += f"| {p['date']} | {p['starting_equity']:,} | {p['ending_equity']:,} | {p['pnl']:+,} | {p['pnl_pct']*100:+.2f}% |\n"
    else:
        md += "_No P&L recorded yet (system pre-trading)._\n"

    md += """

## 5. Council Roles & Order

1. **Researcher** — propose new hypotheses, evaluate current strategies (read prompts/researcher.md)
2. **CRO** — review proposals for risk; cast veto if needed (read prompts/cro.md)
3. **CTO** — code/data/infra review; approve or block (read prompts/cto.md)
4. **CIO** — make final adoption/weight decisions (read prompts/cio.md)
5. **Meta-Optimizer** — (monthly only) evaluate prior decisions, propose prompt diffs (read prompts/meta_optimizer.md)

Each agent must end its response with a JSON code block per its prompt schema.

## 6. Outputs

The council orchestrator collects all 5 JSON blocks and writes them to:
- `quant/data/council/<date>.json` — full council record
- `quant/data/council-latest.json` — pointer for dashboard

Dashboard surfaces the CIO's `cycle_summary` as the headline.
"""
    return md


def write_agenda(out_dir: Path, events_db: Path, circuit_db: Path) -> Path:
    out_dir.mkdir(parents=True, exist_ok=True)
    today = datetime.now(timezone.utc).date()
    week_of = (today - timedelta(days=today.weekday())).isoformat()
    md = render_agenda(events_db, circuit_db, week_of)
    path = out_dir / f"agenda-{week_of}.md"
    path.write_text(md, encoding="utf-8")
    log.info("agenda written: %s (%d bytes)", path, len(md))
    return path
