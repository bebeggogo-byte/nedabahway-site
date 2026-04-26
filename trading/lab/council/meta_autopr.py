"""Meta-Optimizer auto-PR generator.

Reads the latest council record. If the Meta-Optimizer agent proposed prompt
improvements, applies them on a new branch and opens a draft PR via gh CLI.

Runs only when:
- Latest council included Meta-Optimizer (monthly)
- Meta proposed concrete prompt diffs
- The current process has push permission + gh CLI authenticated

Idempotent: re-running on the same council record won't open duplicate PRs.
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

log = logging.getLogger(__name__)

REPO_ROOT = Path(__file__).resolve().parents[3]
COUNCIL_DIR = REPO_ROOT / "quant" / "data" / "council"
PROMPTS_DIR = REPO_ROOT / "trading" / "lab" / "prompts"
META_PR_LOG = REPO_ROOT / "quant" / "data" / "meta-pr-log.json"


def _load_pr_log() -> dict:
    if META_PR_LOG.exists():
        return json.loads(META_PR_LOG.read_text(encoding="utf-8"))
    return {"opened_pr_for_council": []}


def _save_pr_log(data: dict) -> None:
    META_PR_LOG.parent.mkdir(parents=True, exist_ok=True)
    META_PR_LOG.write_text(json.dumps(data, indent=2, ensure_ascii=False))


def _run(cmd: list[str], cwd: Path | None = None) -> tuple[int, str]:
    log.info("$ %s", " ".join(cmd))
    res = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True)
    if res.returncode != 0:
        log.warning("command failed (rc=%d): %s", res.returncode, res.stderr.strip())
    return res.returncode, (res.stdout + res.stderr).strip()


def _find_latest_council_with_meta() -> tuple[Path | None, dict | None]:
    if not COUNCIL_DIR.exists():
        return None, None
    files = sorted(COUNCIL_DIR.glob("council-*.json"), reverse=True)
    for f in files:
        try:
            data = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        responses = data.get("responses", {})
        if isinstance(responses, dict) and "meta_optimizer" in responses:
            return f, data
        if isinstance(responses, list):
            for r in responses:
                if r.get("agent") == "meta_optimizer":
                    return f, data
    return None, None


def _meta_response_payload(data: dict) -> dict | None:
    responses = data.get("responses", {})
    if isinstance(responses, dict):
        meta = responses.get("meta_optimizer")
    else:
        meta = next((r for r in responses if r.get("agent") == "meta_optimizer"), None)
    if not meta:
        return None
    if isinstance(meta, dict):
        if "structured" in meta and isinstance(meta["structured"], dict):
            return meta["structured"]
        return meta
    return None


def _apply_prompt_diff(agent_name: str, new_prompt_text: str) -> Path | None:
    target = PROMPTS_DIR / f"{agent_name}.md"
    if not target.exists():
        log.warning("prompt file not found for %s: %s", agent_name, target)
        return None
    target.write_text(new_prompt_text, encoding="utf-8")
    return target


def open_meta_pr(dry_run: bool = False) -> int:
    council_path, data = _find_latest_council_with_meta()
    if not council_path:
        log.info("no council record with meta_optimizer; nothing to do")
        return 0

    pr_log = _load_pr_log()
    council_id = council_path.name
    if council_id in pr_log.get("opened_pr_for_council", []):
        log.info("already opened PR for %s; skipping", council_id)
        return 0

    meta = _meta_response_payload(data)
    if not meta:
        log.info("meta_optimizer in council but no structured payload")
        return 0

    improvements = meta.get("prompt_improvements", [])
    if not improvements:
        log.info("meta proposed no prompt_improvements")
        return 0

    branch = f"meta/prompts-{datetime.now(timezone.utc).strftime('%Y%m%d')}-{council_id.replace('council-', '').replace('.json', '')}"
    if dry_run:
        log.info("DRY RUN: would create branch %s with %d prompt improvements", branch, len(improvements))
        for imp in improvements:
            log.info("  - %s: %s", imp.get("agent"), imp.get("diff_summary", "")[:80])
        return 0

    rc, _ = _run(["git", "checkout", "-b", branch], cwd=REPO_ROOT)
    if rc != 0:
        log.error("checkout failed; aborting")
        return 1

    applied: list[str] = []
    for imp in improvements:
        agent = imp.get("agent")
        new_text = imp.get("new_prompt_text")
        if not (agent and new_text):
            log.warning("improvement missing agent or new_prompt_text: %s", imp)
            continue
        path = _apply_prompt_diff(agent, new_text)
        if path:
            applied.append(agent)
            _run(["git", "add", str(path.relative_to(REPO_ROOT))], cwd=REPO_ROOT)

    if not applied:
        log.warning("no improvements applied")
        return 0

    _run(["git", "config", "user.name", "quant-lab-meta"], cwd=REPO_ROOT)
    _run(["git", "config", "user.email", "quant-lab-meta@users.noreply.github.com"], cwd=REPO_ROOT)
    rc, _ = _run(
        ["git", "commit", "-m", f"meta: prompt v+1 for {', '.join(applied)} (council {council_id})"],
        cwd=REPO_ROOT,
    )
    if rc != 0:
        log.error("commit failed")
        return 1

    rc, _ = _run(["git", "push", "-u", "origin", branch], cwd=REPO_ROOT)
    if rc != 0:
        log.error("push failed")
        return 1

    pr_body = f"""## Meta-Optimizer 자동 프롬프트 개선

Council `{council_id}` 에서 Meta-Optimizer 가 제안한 프롬프트 개선안.

### 변경된 에이전트
{chr(10).join(f"- `{a}`" for a in applied)}

### Meta 의 근거
{json.dumps(meta.get("system_health_metrics", {}), indent=2, ensure_ascii=False)}

자동 생성된 draft PR. CTO subagent 의 다음 회기 승인 후 머지 권장.
"""
    rc, out = _run(
        ["gh", "pr", "create", "--draft", "--base", "main", "--head", branch,
         "--title", f"meta: prompt v+1 — {', '.join(applied)}",
         "--body", pr_body],
        cwd=REPO_ROOT,
    )
    if rc != 0:
        log.error("PR creation failed: %s", out)
        return 1

    log.info("PR opened: %s", out)
    pr_log.setdefault("opened_pr_for_council", []).append(council_id)
    pr_log["last_action"] = {
        "ts": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "council": council_id,
        "branch": branch,
        "applied_agents": applied,
    }
    _save_pr_log(pr_log)
    return 0


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    dry = "--dry-run" in sys.argv
    return open_meta_pr(dry_run=dry)


if __name__ == "__main__":
    raise SystemExit(main())
