# Agent Strategy Report

How to use Claude Code's capabilities and the 100-agent roster strategically.
Synthesis of verified research (2026-05-18) plus a concrete upgrade plan.

Status: ADOPTED
Date: 2026-05-18
Owner: MoAI Orchestrator

---

## 1. Executive Summary

The roster has 100 agents but they were generated from a step-script template
(`Step 1 -> 2 -> 3 -> 4`). Anthropic's own engineering guidance names that the
top anti-pattern: it makes an agent behave like a tool that runs a procedure
instead of a worker that exercises judgment. This report analyzes what Claude
Code actually offers, sets the strategy for deploying the roster, and defines a
file-only upgrade (no extra cost beyond the Claude Code subscription).

---

## 2. Claude Code Capability Analysis

Verified against official `code.claude.com` / `platform.claude.com` docs.

| Capability | What it enables | Strategic use |
|-----------|-----------------|---------------|
| Agent Teams (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`) | Lead + independent teammates, shared task list, peer SendMessage, file-locked task claiming | Use for genuine multi-domain parallel work, not for everything (token cost) |
| Subagents (`.claude/agents/`) | Single-purpose delegates with own tools/model/prompt | The 100-agent roster — routing targets |
| Agent Skills (progressive disclosure) | Name+description preloaded, body loaded on demand | Deep domain knowledge without context bloat |
| Hooks (PreToolUse / PostToolUse / SubagentStop / TeammateIdle / TaskCompleted) | Automated enforcement around tool calls and completion | Evidence-gated completion, quality gates |
| `memory` field (user/project/local) | Injects `MEMORY.md` into the agent prompt | Cross-session learning — the strongest agent-as-worker primitive |
| `/goal` command + Agent View | Set a completion condition; agent works across turns | Outcome-driven supervision instead of turn-by-turn babysitting |
| Background agents + `isolation: worktree` | Non-blocking, conflict-free parallel execution | Parallel writes to disjoint scopes |
| `disallowedTools`, `permissionMode` (`auto`/`dontAsk`) | Finer least-privilege control | Tighten tool surface per agent |
| GitHub `claude-code-action@v1` | Interactive/automation modes for PR work | NOT used here — billing extra API cost (out of scope) |

---

## 3. Strategic Principles (Verified Anthropic Guidance)

1. **Right altitude.** Agent bodies state heuristics and decision principles, not
   numbered procedures. The agent reads the situation and chooses.
2. **Evidence-gated completion.** No "done" without an observed artifact.
3. **Long-horizon persistence.** Keep a progress note; do not stop early on
   context pressure; commit working checkpoints.
4. **Single agent first.** Multi-agent costs roughly an order of magnitude more
   tokens — fan out only for genuine specialization.
5. **Name the workflow pattern.** Prompt chaining, routing, parallelization,
   orchestrator-workers, evaluator-optimizer.
6. **Scope discipline.** Do only what was asked; honor OUT OF SCOPE delegation.
7. **Judgment over mechanism.** Tolerate multiple valid solutions; fetch context
   just in time.

These are encoded once in `.claude/rules/moai/core/agent-worker-protocol.md`,
auto-loaded for every agent.

---

## 4. Roster Deployment Strategy

The 100 agents are a workforce, not a command menu. Deploy them by pattern:

- **Routing**: match a request to the narrowest capable agent via its
  description trigger keywords. One agent handles most tasks.
- **Orchestrator-workers**: for multi-domain work, the orchestrator decomposes
  and delegates to disjoint-scope workers (this is how the roster itself was
  built — four builder agents by tier).
- **Evaluator-optimizer**: pair a builder agent with `evaluator-active` or the
  `agent-eval.py` harness for objective scoring loops.
- **Parallelization**: independent subtasks run as concurrent agents writing to
  disjoint paths.

Tier roles:
- `moai/` (22): framework workflow backbone — SPEC, DDD/TDD, quality, git.
- `web/` (30): the static-site operations crew.
- `engineering/` (25): general software-engineering workers.
- `data/` (10), `writing/` (13): analysis and communication workers.

---

## 5. Gap Analysis

| Gap | Impact | Fix |
|-----|--------|-----|
| Step-script bodies in the 78 new agents | Tool-like, no judgment | Right-altitude rewrite |
| No `memory` on the 78 new agents | No cross-session learning | Add `memory: project` |
| No completion-evidence standard | "Looks done" risk | `Completion Evidence` section + eval criterion |
| Worker standard not enforced | Drift over time | New eval criteria in the self-improvement system |
| 22 `moai/` agents are upstream-managed | Direct edits risk `moai update` conflict | Protocol rule applies at runtime; no file edits |

---

## 6. Upgrade Plan (File-Only, No Extra Cost)

1. Land `agent-worker-protocol.md` — verified patterns, auto-loaded for all 100.
2. Right-altitude rewrite of the 78 extended-roster agents: replace the numbered
   `Workflow` section with `When To Engage` + `Operating Approach` (heuristics)
   and add a `Completion Evidence` section. Keep Mission, Capabilities, Scope.
3. Add `memory: project` to all 78 extended-roster agents.
4. Extend the self-improvement eval with two worker-grade criteria
   (`has_operating_approach`, `has_completion_evidence`), scoped to the
   extended roster, so CI enforces the new standard.
5. Reference the protocol rule from CLAUDE.md.

The 22 `moai/` agents are not edited — they inherit the protocol rule at runtime
and remain safe for `moai update`.

---

## 7. Cost Boundary

Every item above is file-based and runs inside the Claude Code subscription. No
LLM execution in CI runners, no paid review services, no external agent
subscriptions. The `agent-quality` CI workflow runs only plain Python.

---

## 8. Sources

Anthropic: "Building Effective AI Agents", "Effective context engineering for AI
agents", "Effective harnesses for long-running agents", "Writing effective tools
for AI agents". Claude Code official docs: agent-teams, sub-agents, hooks,
agent-skills, changelog. Researched and verified 2026-05-18.
