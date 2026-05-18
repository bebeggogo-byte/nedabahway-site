# Agent Self-Improvement Loop

A standing process that keeps the 100-agent roster measurably high quality.
It pairs an objective eval harness with the `researcher` agent's autoresearch loop.

## Components

| Component | Path | Role |
|-----------|------|------|
| Eval criteria | `.moai/research/evals/agent-quality.yaml` | 14 binary pass/fail criteria |
| Scorer | `scripts/agent-eval.py` | Scans 100 agents, writes scorecard, gates exit code |
| Scorecard | `.moai/research/scorecard.json` | Machine-readable result of the last run |
| CI gate | `.github/workflows/agent-quality.yml` | Runs the scorer on every relevant PR/push |
| Loop runbook | this file | How the researcher consumes the scorecard |

## The Loop

1. **Score** — run `python3 scripts/agent-eval.py`. It produces `scorecard.json`
   with per-agent pass counts and failed criterion ids.
2. **Select** — pick the lowest-scoring agent that is in the loop's mutation scope
   (see below). Ties break by directory order: web, engineering, data, writing.
3. **Hypothesize** — form ONE specific change that should fix ONE failed criterion.
4. **Apply** — make that single change to the target agent file.
5. **Re-score** — run the scorer again.
6. **Keep or revert** — if the agent's pass count rose and no other agent
   regressed, keep the change; otherwise revert and try a different hypothesis.
7. **Repeat** — until the roster satisfies both gates or no tractable failure
   remains.

This is the autoresearch discipline: one change at a time, binary evals only,
measure before and after.

## Mutation Scope

- **In scope for the automated loop**: extended-roster agents under
  `.claude/agents/{web,engineering,data,writing}/` — these are project-owned.
- **Out of scope for the automated loop**: framework agents under
  `.claude/agents/moai/` — these are managed by `moai update` and direct edits
  may be overwritten on upgrade. The scorer still reports their failures; a
  human (or the orchestrator, with the user informed) resolves them manually,
  and the CI gate guards against regressions.

## Gates

From `agent-quality.yaml`:
- `must_pass_rate: 1.0` — every must-criterion passes for every agent.
- `should_pass_rate: 0.85` — at least 85% of should-criteria pass across the roster.

The scorer exits non-zero when a gate is violated, failing CI.

## Running It

```
python3 scripts/agent-eval.py            # full run with console summary
python3 scripts/agent-eval.py --quiet    # CI-style: JSON + exit code only
```

To run a deeper optimization cycle, invoke the `researcher` agent:
"Use the researcher subagent to run the agent-improvement loop against
`.moai/research/scorecard.json`, targeting extended-roster agents only."

## Baseline (2026-05-17)

First run scored 100 agents: must_pass_rate 1.0, should_pass_rate 0.9867.
Eight should-failures in four `moai/` framework agents (missing scope sections)
were resolved in the first improvement cycle. The extended roster passed all
14 criteria from creation.
