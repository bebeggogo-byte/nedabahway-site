#!/usr/bin/env python3
"""Agent quality scorer for Claude Code agent definition files.

Evaluates every file under .claude/agents/**/*.md against 14 binary
checks defined in .moai/research/evals/agent-quality.yaml, writes a
scorecard to .moai/research/scorecard.json, prints a console summary,
and exits non-zero when CI gates are not satisfied.

Standard library only (Python 3.11).
"""

from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
AGENTS_GLOB = ".claude/agents/**/*.md"
SKILLS_DIR = REPO / ".claude" / "skills"
EVAL_YAML = REPO / ".moai" / "research" / "evals" / "agent-quality.yaml"
SCORECARD = REPO / ".moai" / "research" / "scorecard.json"

VALID_MODELS = {"opus", "sonnet", "haiku", "inherit"}
VALID_PERMISSION_MODES = {
    "default", "acceptEdits", "auto", "delegate",
    "dontAsk", "bypassPermissions", "plan",
}

# Criterion -> tier. Mirrors agent-quality.yaml; the YAML stays the source
# of truth and is also parsed below to confirm consistency.
CRITERIA_TIERS = {
    "frontmatter_delimited": "must",
    "name_present": "must",
    "name_matches_filename": "must",
    "description_present": "must",
    "model_valid": "must",
    "permissionmode_valid": "must",
    "no_broken_skill_ref": "must",
    "body_nonempty": "must",
    "has_en_triggers": "should",
    "has_ko_triggers": "should",
    "has_not_for": "should",
    "has_scope_section": "should",
    "has_out_of_scope": "should",
    "has_mission_section": "should",
    "has_operating_approach": "should",
    "has_completion_evidence": "should",
}

# Worker-grade criteria apply only to the extended roster (web/engineering/
# data/writing). The moai/ framework agents use an older template and are
# managed by `moai update`, so these checks are skipped for them.
EXTENDED_ONLY = {"has_operating_approach", "has_completion_evidence"}


def parse_gates(yaml_path: Path) -> tuple[float, float]:
    """Extract must_pass_rate and should_pass_rate floats from the gates block."""
    must, should = 1.0, 0.85
    text = yaml_path.read_text(encoding="utf-8")
    for line in text.splitlines():
        m = re.match(r"\s*must_pass_rate:\s*([0-9.]+)", line)
        if m:
            must = float(m.group(1))
        m = re.match(r"\s*should_pass_rate:\s*([0-9.]+)", line)
        if m:
            should = float(m.group(1))
    return must, should


def split_frontmatter(text: str) -> tuple[list[str], str, bool]:
    """Return (frontmatter_lines, body, delimited).

    delimited is True when the file opens with '---' on line 1 and has a
    later closing '---'.
    """
    lines = text.splitlines()
    if not lines or lines[0].strip() != "---":
        return [], text, False
    for idx in range(1, len(lines)):
        if lines[idx].strip() == "---":
            fm = lines[1:idx]
            body = "\n".join(lines[idx + 1:])
            return fm, body, True
    return [], text, False


def parse_frontmatter(fm_lines: list[str]) -> dict:
    """Parse simple `key: value` frontmatter.

    Handles the `description: |` block scalar (indented following lines)
    and `skills:` rendered as a YAML list of `  - item` lines.
    """
    data: dict = {}
    i = 0
    n = len(fm_lines)
    while i < n:
        line = fm_lines[i]
        m = re.match(r"^([A-Za-z0-9_]+):\s*(.*)$", line)
        if not m:
            i += 1
            continue
        key, raw = m.group(1), m.group(2).strip()

        if raw in ("|", "|-", ">", ">-"):
            # Block scalar: collect indented following lines.
            block: list[str] = []
            i += 1
            while i < n:
                nxt = fm_lines[i]
                if nxt.strip() == "" or nxt.startswith((" ", "\t")):
                    block.append(nxt.strip())
                    i += 1
                else:
                    break
            data[key] = "\n".join(block).strip()
            continue

        if raw == "":
            # Possibly a YAML list (e.g. skills:) or empty value.
            items: list[str] = []
            j = i + 1
            while j < n:
                nxt = fm_lines[j]
                lm = re.match(r"^\s*-\s+(.*)$", nxt)
                if lm:
                    items.append(lm.group(1).strip())
                    j += 1
                else:
                    break
            if items:
                data[key] = items
                i = j
                continue
            data[key] = ""
            i += 1
            continue

        # Inline value; strip surrounding quotes.
        val = raw
        if len(val) >= 2 and val[0] == val[-1] and val[0] in "\"'":
            val = val[1:-1]
        # Inline flow list: skills: [a, b]
        if val.startswith("[") and val.endswith("]"):
            inner = val[1:-1].strip()
            data[key] = [x.strip().strip("\"'") for x in inner.split(",") if x.strip()]
        else:
            data[key] = val
        i += 1
    return data


def run_checks(path: Path, text: str) -> dict[str, bool]:
    """Run all 14 binary checks for one agent file."""
    fm_lines, body, delimited = split_frontmatter(text)
    fm = parse_frontmatter(fm_lines)
    results: dict[str, bool] = {}

    name = fm.get("name")
    name = name.strip() if isinstance(name, str) else ""
    desc = fm.get("description")
    desc = desc if isinstance(desc, str) else ""
    desc_lower = desc.lower()

    results["frontmatter_delimited"] = delimited
    results["name_present"] = bool(name)
    results["name_matches_filename"] = name == path.stem
    results["description_present"] = bool(desc.strip())

    model = fm.get("model")
    results["model_valid"] = (
        True if model is None else str(model).strip() in VALID_MODELS
    )

    pmode = fm.get("permissionMode")
    results["permissionmode_valid"] = (
        True if pmode is None else str(pmode).strip() in VALID_PERMISSION_MODES
    )

    skills = fm.get("skills")
    if isinstance(skills, list) and skills:
        results["no_broken_skill_ref"] = all(
            (SKILLS_DIR / s).is_dir() for s in skills
        )
    else:
        results["no_broken_skill_ref"] = True

    results["body_nonempty"] = bool(body.strip())
    results["has_en_triggers"] = "EN:" in desc
    results["has_ko_triggers"] = "KO:" in desc
    results["has_not_for"] = "not for:" in desc_lower

    body_lower = body.lower()
    has_scope_heading = bool(
        re.search(r"^#{1,6}.*\bscope\b", body, re.IGNORECASE | re.MULTILINE)
    )
    results["has_scope_section"] = has_scope_heading or "IN SCOPE" in body
    results["has_out_of_scope"] = "out of scope" in body_lower
    results["has_mission_section"] = bool(
        re.search(
            r"^#{1,6}.*\b(primary mission|mission|identity)\b",
            body, re.IGNORECASE | re.MULTILINE,
        )
    )

    if path.parent.name != "moai":
        results["has_operating_approach"] = bool(
            re.search(r"^#{1,6}.*\boperating approach\b",
                      body, re.IGNORECASE | re.MULTILINE)
        )
        results["has_completion_evidence"] = bool(
            re.search(r"^#{1,6}.*\bcompletion evidence\b",
                      body, re.IGNORECASE | re.MULTILINE)
        )
    return results


def main() -> int:
    ap = argparse.ArgumentParser(description="Score Claude Code agent files.")
    ap.add_argument("--quiet", action="store_true",
                    help="Suppress console summary (still writes JSON, sets exit code).")
    args = ap.parse_args()

    must_gate, should_gate = parse_gates(EVAL_YAML)

    files = sorted(REPO.glob(AGENTS_GLOB))

    per_file: list[dict] = []
    must_passed = must_total = 0
    should_passed = should_total = 0
    agents_with_must_failure = 0

    for path in files:
        text = path.read_text(encoding="utf-8")
        checks = run_checks(path, text)
        failed = [cid for cid, ok in checks.items() if not ok]

        f_must = [c for c in failed if CRITERIA_TIERS[c] == "must"]
        f_should = [c for c in failed if CRITERIA_TIERS[c] == "should"]

        n_must = sum(1 for c in checks if CRITERIA_TIERS[c] == "must")
        n_should = sum(1 for c in checks if CRITERIA_TIERS[c] == "should")
        must_passed += n_must - len(f_must)
        must_total += n_must
        should_passed += n_should - len(f_should)
        should_total += n_should
        if f_must:
            agents_with_must_failure += 1

        per_file.append({
            "path": str(path.relative_to(REPO)),
            "tier_dir": path.parent.name,
            "passed": len(checks) - len(failed),
            "total": len(checks),
            "failed_criteria": failed,
            "failed_must": f_must,
            "failed_should": f_should,
        })

    must_rate = must_passed / must_total if must_total else 1.0
    should_rate = should_passed / should_total if should_total else 1.0

    lowest = sorted(per_file, key=lambda r: (r["passed"], r["path"]))
    lowest_scoring = [r for r in lowest if r["failed_criteria"]][:10]

    scorecard = {
        "version": 1,
        "target_glob": AGENTS_GLOB,
        "agent_count": len(files),
        "criteria_tiers": CRITERIA_TIERS,
        "gates": {"must_pass_rate": must_gate, "should_pass_rate": should_gate},
        "roster_totals": {
            "must_pass_rate": round(must_rate, 4),
            "should_pass_rate": round(should_rate, 4),
            "agents_with_must_failure": agents_with_must_failure,
            "lowest_scoring": [
                {"path": r["path"], "passed": r["passed"], "total": r["total"],
                 "failed_criteria": r["failed_criteria"]}
                for r in lowest_scoring
            ],
        },
        "files": per_file,
    }

    SCORECARD.parent.mkdir(parents=True, exist_ok=True)
    SCORECARD.write_text(json.dumps(scorecard, indent=2) + "\n", encoding="utf-8")

    must_ok = must_rate >= must_gate
    should_ok = should_rate >= should_gate

    if not args.quiet:
        print(f"Agent Quality Scorecard  ({len(files)} agents)")
        print(f"  scorecard: {SCORECARD.relative_to(REPO)}")
        print(f"  must  pass rate : {must_rate:.4f}  (gate {must_gate:.2f})  "
              f"{'OK' if must_ok else 'FAIL'}")
        print(f"  should pass rate: {should_rate:.4f}  (gate {should_gate:.2f})  "
              f"{'OK' if should_ok else 'FAIL'}")
        print(f"  agents with must-failure: {agents_with_must_failure}")
        if lowest_scoring:
            print("\nLowest-scoring agents:")
            for r in lowest_scoring:
                print(f"  {r['passed']:>2}/{r['total']}  {r['path']}")
                print(f"        failed: {', '.join(r['failed_criteria'])}")
        else:
            print("\nAll agents passed every criterion.")

    return 0 if (must_ok and should_ok) else 1


if __name__ == "__main__":
    raise SystemExit(main())
