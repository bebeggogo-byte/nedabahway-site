"""Council runner — invokes 5 LLM agents in order, collects JSON outputs.

PR #14: ships in **dry-run mode** that records what each agent would be asked
and writes a placeholder council record. Real LLM execution (via Claude Code
GitHub Action / subagent) lands in the next PR.

The dry-run output already populates the dashboard with structured council
records so the UI is testable end-to-end before LLM wiring lands.
"""

from __future__ import annotations

import json
import logging
from datetime import datetime, timezone
from pathlib import Path

from .agenda import write_agenda

log = logging.getLogger(__name__)

AGENT_ORDER = ["researcher", "cro", "cto", "cio", "meta_optimizer"]


def _placeholder_response(agent: str, agenda_path: Path) -> dict:
    return {
        "agent": agent,
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "mode": "dry_run",
        "agenda_consumed": str(agenda_path.name),
        "note": "Council orchestrator is in dry-run mode. LLM wiring lands in the next PR.",
        "structured": None,
    }


def run_council_dryrun(
    prompts_dir: Path,
    council_out_dir: Path,
    events_db: Path,
    circuit_db: Path,
    include_meta: bool = False,
) -> dict:
    council_out_dir.mkdir(parents=True, exist_ok=True)
    agenda_path = write_agenda(council_out_dir, events_db, circuit_db)

    agents = list(AGENT_ORDER)
    if not include_meta:
        agents = [a for a in agents if a != "meta_optimizer"]

    record: dict = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "agenda": str(agenda_path),
        "mode": "dry_run",
        "responses": [],
        "consensus": None,
    }
    for agent in agents:
        prompt_path = prompts_dir / f"{agent}.md"
        if not prompt_path.exists():
            log.warning("missing prompt for %s at %s", agent, prompt_path)
            continue
        record["responses"].append(_placeholder_response(agent, agenda_path))

    record["consensus"] = {
        "adopted_strategies": [],
        "vetoes": [],
        "cycle_summary": (
            "Council dry-run executed (no LLM calls). Real council wiring lands "
            "in the next PR; until then, dashboard shows the agenda Claude *would* see."
        ),
    }

    today = datetime.now(timezone.utc).date().isoformat()
    record_path = council_out_dir / f"council-{today}.json"
    record_path.write_text(json.dumps(record, indent=2, ensure_ascii=False))
    latest = council_out_dir.parent / "council-latest.json"
    latest.write_text(json.dumps({"path": record_path.name, "date": today, "consensus": record["consensus"]}, indent=2, ensure_ascii=False))
    log.info("council dry-run record: %s", record_path)
    return record
