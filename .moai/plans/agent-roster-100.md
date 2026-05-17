# Agent Roster Plan — 100 Agents

Status: APPROVED
Date: 2026-05-17
Owner: MoAI Orchestrator
Branch: claude/setup-100-agents-95i67

## 1. Purpose

Move from "agent-as-tool" to a curated roster of 100 single-responsibility,
proactive agents. Each agent owns exactly one job, declares clear scope
boundaries, and delegates out-of-scope work. The roster combines the MoAI
framework backbone with website-operations and general-engineering agents.

## 2. Audit of Existing 22 MoAI Agents

Location: `.claude/agents/moai/`. Verdict: keep all 22. They form a coherent
framework set with minimal true redundancy.

| Group | Agents | Verdict |
|-------|--------|---------|
| Manager (8) | spec, ddd, tdd, docs, quality, project, strategy, git | Keep — workflow backbone |
| Expert (8) | backend, frontend, security, devops, performance, debug, testing, refactoring | Keep — clear domain split |
| Builder (3) | agent, skill, plugin | Keep |
| Evaluator (2) | evaluator-active, plan-auditor | Keep |
| Researcher (1) | researcher | Keep — framework meta-tool |

Feedback notes (no deletions warranted):
- Quality trio (manager-quality / evaluator-active / plan-auditor) overlaps in
  intent but is separated by workflow phase (plan vs run). Justified.
- manager-ddd vs expert-refactoring overlap on code transformation, but DDD is
  a behavior-preserving legacy cycle and refactoring is one-shot codemod. Justified.
- Real gap is FIT: all 22 are software-engineering agents; this repo is a static
  website. The 78 new agents close that gap.

## 3. Roster Structure (22 kept + 78 new = 100)

| Tier | Directory | Count | Theme |
|------|-----------|-------|-------|
| T1 | `.claude/agents/moai/` | 22 | MoAI framework (unchanged) |
| T2 | `.claude/agents/web/` | 30 | Website / content operations |
| T3 | `.claude/agents/engineering/` | 25 | General software engineering |
| T4 | `.claude/agents/data/` | 10 | Data / AI / analysis |
| T5 | `.claude/agents/writing/` | 13 | Documentation / communication |

## 4. Standard Spec for New Agents (T2-T5)

Frontmatter fields: `name`, `description` (block scalar), `tools`, `model`,
`permissionMode`, `color`. Omit `skills` and `hooks` — no matching skills or
hook handlers exist for these new domains; referencing non-existent ones breaks loading.

`description` block must contain:
- Line 1: one-sentence role + "Use PROACTIVELY for ..." trigger phrase
- `EN:` comma-separated English trigger keywords
- `KO:` comma-separated Korean trigger keywords
- `NOT for:` explicit exclusions

Body sections (English, per coding-standards.md):
`# Title` / `## Primary Mission` / `## Core Capabilities` / `## Scope Boundaries`
(IN SCOPE / OUT OF SCOPE) / `## Workflow` (3-6 steps) / `## Success Criteria`.

Model assignment:
- `opus` — reasoning-intensive (code-reviewer, concurrency-auditor, prompt-engineer)
- `sonnet` — implementation / authoring agents (default)
- `haiku` — simple, fast, mechanical agents (linters, formatters, converters)

Permission / tools:
- Implementation & authoring agents: `permissionMode: acceptEdits`,
  `tools: Read, Write, Edit, Grep, Glob, Bash`
- Pure review / audit agents: `permissionMode: plan`,
  `tools: Read, Grep, Glob, Bash`
- Agents needing live web/docs (seo, deploy, dependency, prompt): add `WebFetch, WebSearch`

Colors by tier: T2 web → `cyan`, T3 engineering → `blue`, T4 data → `purple`,
T5 writing → `green`.

## 5. T2 — web/ (30 agents)

| # | name | model | mode | mission |
|---|------|-------|------|---------|
| 1 | web-seo-auditor | sonnet | plan | Audit on-page SEO: meta, headings, canonical, sitemap coverage |
| 2 | web-meta-tag-curator | haiku | acceptEdits | Author title/description/OG/Twitter meta tags per page |
| 3 | web-structured-data-author | sonnet | acceptEdits | Author JSON-LD schema.org structured data |
| 4 | web-sitemap-manager | haiku | acceptEdits | Generate and validate sitemap.xml |
| 5 | web-robots-curator | haiku | acceptEdits | Maintain robots.txt and AI-crawler directives |
| 6 | web-accessibility-auditor | sonnet | plan | Audit WCAG 2.1 AA compliance via pa11y config |
| 7 | web-lighthouse-optimizer | sonnet | acceptEdits | Improve Lighthouse performance/SEO/best-practice scores |
| 8 | web-html-validator | haiku | acceptEdits | Validate and fix HTML against htmlhint rules |
| 9 | web-css-linter | haiku | acceptEdits | Enforce stylelint compliance on stylesheets |
| 10 | web-link-checker | haiku | plan | Detect broken internal/external links |
| 11 | web-image-optimizer | sonnet | acceptEdits | Compress images, add responsive srcset, WebP/AVIF |
| 12 | web-font-optimizer | sonnet | acceptEdits | Subset fonts, preload, prevent FOUT/FOIT |
| 13 | web-i18n-translator | sonnet | acceptEdits | Produce ko/en localized page variants |
| 14 | web-content-writer | sonnet | acceptEdits | Write long-form web page copy |
| 15 | web-magazine-editor | sonnet | acceptEdits | Edit magazine section articles and layout |
| 16 | web-blog-publisher | sonnet | acceptEdits | Create blog posts with correct front-matter |
| 17 | web-newsletter-composer | sonnet | acceptEdits | Compose newsletter and subscription content |
| 18 | web-rss-feed-builder | haiku | acceptEdits | Generate RSS/Atom feeds |
| 19 | web-llms-txt-curator | sonnet | acceptEdits | Maintain llms.txt and llms-full.txt for AI crawlers |
| 20 | web-copy-proofreader | haiku | acceptEdits | Proofread Korean/English site copy |
| 21 | web-landing-builder | sonnet | acceptEdits | Assemble landing and marketing pages |
| 22 | web-form-handler | sonnet | acceptEdits | Build and validate contact/subscription forms |
| 23 | web-redirect-manager | haiku | acceptEdits | Manage 404 page and vercel.json redirects/rewrites |
| 24 | web-pwa-curator | sonnet | acceptEdits | Maintain webmanifest and service worker |
| 25 | web-og-image-designer | sonnet | acceptEdits | Specify Open Graph social-share images |
| 26 | web-darkmode-themer | sonnet | acceptEdits | Build dark/light theme tokens and toggle |
| 27 | web-vercel-deployer | sonnet | acceptEdits | Configure Vercel deploy and preview |
| 28 | web-analytics-integrator | haiku | acceptEdits | Set up privacy-respecting analytics |
| 29 | web-changelog-writer | haiku | acceptEdits | Write site update changelog and press notes |
| 30 | web-component-extractor | sonnet | acceptEdits | Extract repeated HTML into reusable partials |

## 6. T3 — engineering/ (25 agents)

| # | name | model | mode | mission |
|---|------|-------|------|---------|
| 31 | code-reviewer | opus | plan | Review code for quality, bugs, and style |
| 32 | api-designer | sonnet | acceptEdits | Design REST/GraphQL API contracts |
| 33 | db-schema-architect | sonnet | acceptEdits | Design relational/NoSQL database schemas |
| 34 | test-author | sonnet | acceptEdits | Write unit and integration tests |
| 35 | bug-triager | sonnet | plan | Reproduce, classify severity, root-cause bugs |
| 36 | dependency-auditor | sonnet | plan | Audit dependency CVEs, versions, health |
| 37 | license-compliance-checker | haiku | plan | Check OSS license compatibility |
| 38 | log-analyzer | sonnet | plan | Parse logs, correlate anomalies and errors |
| 39 | regex-crafter | haiku | acceptEdits | Construct and test regular expressions |
| 40 | shell-scripter | sonnet | acceptEdits | Author POSIX/bash scripts |
| 41 | dockerfile-author | sonnet | acceptEdits | Author Dockerfiles and multi-stage builds |
| 42 | ci-pipeline-builder | sonnet | acceptEdits | Author GitHub Actions / CI workflows |
| 43 | env-config-manager | haiku | acceptEdits | Manage env vars and config schemas |
| 44 | migration-writer | sonnet | acceptEdits | Write DB/schema migration scripts |
| 45 | mock-data-generator | haiku | acceptEdits | Generate realistic fixture/seed data |
| 46 | cli-builder | sonnet | acceptEdits | Design and implement command-line interfaces |
| 47 | error-handler-designer | sonnet | acceptEdits | Design error taxonomy, retry, fallback |
| 48 | code-commenter | haiku | acceptEdits | Author inline docs and comments |
| 49 | type-annotator | sonnet | acceptEdits | Add and refine static type annotations |
| 50 | benchmark-runner | sonnet | acceptEdits | Build micro/macro benchmark harnesses |
| 51 | concurrency-auditor | opus | plan | Review for race conditions and deadlocks |
| 52 | git-hook-author | haiku | acceptEdits | Author pre-commit/pre-push hooks |
| 53 | config-schema-validator | haiku | plan | Validate JSON/YAML against schemas |
| 54 | release-notes-writer | haiku | acceptEdits | Write version release notes |
| 55 | codemod-author | sonnet | acceptEdits | Write AST-based bulk code transforms |

## 7. T4 — data/ (10 agents)

| # | name | model | mode | mission |
|---|------|-------|------|---------|
| 56 | data-cleaner | sonnet | acceptEdits | Clean, dedup, normalize datasets |
| 57 | csv-json-transformer | haiku | acceptEdits | Convert between tabular and JSON formats |
| 58 | data-visualizer | sonnet | acceptEdits | Produce chart/graph specs from datasets |
| 59 | prompt-engineer | opus | acceptEdits | Design and optimize LLM prompts |
| 60 | llm-eval-designer | sonnet | acceptEdits | Design binary eval suites for LLM outputs |
| 61 | json-schema-author | haiku | acceptEdits | Author JSON Schema definitions |
| 62 | knowledge-graph-builder | sonnet | acceptEdits | Build entity/relation graphs (JSON-LD) |
| 63 | spreadsheet-analyst | sonnet | acceptEdits | Analyze spreadsheet formulas and pivots |
| 64 | data-pipeline-designer | sonnet | acceptEdits | Design ETL/ELT pipelines |
| 65 | statistics-reporter | sonnet | plan | Produce descriptive stats and summary reports |

## 8. T5 — writing/ (13 agents)

| # | name | model | mode | mission |
|---|------|-------|------|---------|
| 66 | technical-writer | sonnet | acceptEdits | Author technical documentation |
| 67 | readme-author | haiku | acceptEdits | Author README files |
| 68 | tutorial-writer | sonnet | acceptEdits | Write step-by-step tutorials and guides |
| 69 | faq-builder | haiku | acceptEdits | Compile FAQs from source material |
| 70 | glossary-curator | haiku | acceptEdits | Curate domain glossary and terminology |
| 71 | translator-ko-en | sonnet | acceptEdits | Translate documents Korean<->English |
| 72 | summarizer | haiku | plan | Summarize long documents |
| 73 | proposal-writer | sonnet | acceptEdits | Draft business and project proposals |
| 74 | citation-formatter | haiku | acceptEdits | Format references and citations |
| 75 | meeting-notes-taker | haiku | acceptEdits | Structure meeting minutes |
| 76 | email-drafter | haiku | acceptEdits | Compose professional emails |
| 77 | presentation-builder | sonnet | acceptEdits | Outline and write slide-deck content |
| 78 | style-guide-enforcer | haiku | plan | Enforce writing style-guide consistency |

## 9. Execution

1. builder-agent x4 spawned in parallel, one per tier (T2-T5), each writes to a
   disjoint directory — no write conflicts.
2. Each builder-agent reads this plan as the single source of truth.
3. Verify: 100 total files, valid frontmatter, unique names.
4. Commit, push to `claude/setup-100-agents-95i67`, open draft PR.

## 10. Success Criteria

- Exactly 100 agent definition files (22 moai + 78 new).
- Every new file: valid YAML frontmatter, unique `name`, no `skills`/`hooks`
  referencing non-existent resources.
- Every agent has single, non-overlapping responsibility with explicit
  OUT OF SCOPE delegation notes.
- `model` is one of opus/sonnet/haiku; `permissionMode` valid.
