"""Validate council records produced by the LLM orchestrator.

The Claude Code action writes `quant/data/council/council-<date>.json` directly.
This script (run after the action) validates the schema, surfaces it to
`quant/data/council-latest.json`, and reports any structural issues.

Runnable as a module: `python -m lab.council.parse_llm_output`
"""

from __future__ import annotations

import json
import logging
import sys
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
COUNCIL_DIR = REPO_ROOT / "quant" / "data" / "council"
COUNCIL_LATEST = REPO_ROOT / "quant" / "data" / "council-latest.json"


REQUIRED_TOP_KEYS = {"ts", "responses", "consensus"}
EXPECTED_AGENTS = {"researcher", "cro", "cto", "cio"}


def find_latest_council_record() -> Path | None:
    if not COUNCIL_DIR.exists():
        return None
    files = sorted(COUNCIL_DIR.glob("council-*.json"))
    return files[-1] if files else None


def validate_record(path: Path) -> tuple[bool, list[str]]:
    issues: list[str] = []
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except Exception as e:
        return False, [f"json decode error: {e}"]

    missing = REQUIRED_TOP_KEYS - set(data.keys())
    if missing:
        issues.append(f"missing top-level keys: {missing}")

    responses = data.get("responses", {})
    if isinstance(responses, list):
        agents_present = {r.get("agent") for r in responses if isinstance(r, dict)}
    elif isinstance(responses, dict):
        agents_present = set(responses.keys())
    else:
        agents_present = set()
        issues.append("responses must be dict or list")

    missing_agents = EXPECTED_AGENTS - agents_present
    if missing_agents:
        issues.append(f"missing required agents: {missing_agents}")

    consensus = data.get("consensus")
    if not isinstance(consensus, dict):
        issues.append("consensus must be a dict")
    else:
        if "cycle_summary" not in consensus:
            issues.append("consensus.cycle_summary required")

    return (not issues), issues


def update_latest_pointer(path: Path) -> None:
    data = json.loads(path.read_text(encoding="utf-8"))
    consensus = data.get("consensus", {})
    pointer = {
        "path": path.name,
        "date": path.stem.replace("council-", ""),
        "consensus": consensus,
        "updated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "mode": data.get("mode", "unknown"),
    }
    COUNCIL_LATEST.write_text(json.dumps(pointer, indent=2, ensure_ascii=False))
    log.info("updated council-latest.json -> %s (mode=%s)", path.name, pointer["mode"])


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    record = find_latest_council_record()
    if record is None:
        log.warning("no council record found in %s", COUNCIL_DIR)
        return 1

    log.info("validating %s", record)
    ok, issues = validate_record(record)
    if not ok:
        log.error("record invalid: %s", issues)
        # Even if invalid, surface it (with degraded mode tag)
        try:
            data = json.loads(record.read_text(encoding="utf-8"))
            data.setdefault("consensus", {})
            data["consensus"]["cycle_summary"] = (
                "[partial] LLM council ran but output failed validation: "
                + "; ".join(issues)
            )
            record.write_text(json.dumps(data, indent=2, ensure_ascii=False))
        except Exception:
            pass

    update_latest_pointer(record)
    return 0 if ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
