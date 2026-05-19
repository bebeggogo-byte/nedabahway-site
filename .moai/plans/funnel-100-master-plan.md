# Funnel-100 Master Execution Plan

Status: DRAFT
Date: 2026-05-19
Owner: MoAI Orchestrator (on behalf of 김창환 / 네다바웨이)
Branch: `claude/select-effective-agent-project-7BGIU`

This master plan operationalizes a confirmed framework. It does not re-derive
strategy — it expands a set of decisions already reached and approved during
planning into a rigorous, committable, reviewable document. The five confirmed
decisions (project, goal, scoring rubric, revenue funnel, build strategy) are
treated as fixed inputs.

---

## 1. Strategy

### 1.1 The confirmed project

Evolve the existing `nedabahway-site` (nedabah.org) — the live website of
네다바웨이, a one-person education company run by 김창환 from 제주 서귀포 —
into a **premium freemium AI content platform**.

The site already sells five 1:1 coaching programs (the `revenue_lineup` in
`.moai/strategy/site-strategy.yaml`):

| Rank | Program | Persona | Price (KRW) | Duration |
|------|---------|---------|-------------|----------|
| 1 | STARCP 마스터 | 현직 취업 컨설턴트 / 코치 | 4,000,000 | 12주 |
| 2 | IDEN 좌표 마스터 (진로교사) | 중·고교 진로전담교사 | 3,500,000 | 12주 |
| 3 | IDEN 진로 재설계 (이직·전직) | 30~40대 이직·전직 직장인 | 2,500,000 | 12주 |
| 4 | 창직·1인 사업자 1:1 | 자기 길 찾는 30~50대 | 5,000,000 | 12주 |
| 5 | 5S 리더십 마스터 | 팀장·신임 임원 | 6,000,000 | 6개월 |

The site has real infrastructure already in place: `magazine/`, `blog/`,
newsletter, `feeds/`, `resources/`, `sitemap.xml`, `llms.txt`,
`knowledge-graph.jsonld`, `robots.txt`, a PWA manifest, and two existing SPECs
(SPEC-LANDING-001 for the five landing pages, SPEC-SEARCH-001 for resource
search).

The platform evolution layers a **freemium model** on top of this asset base:
free, searchable content and magazine articles act as the lead magnet; the five
paid programs and an optional subscription tier are the upgrade.

### 1.2 The confirmed goal

**Maximum agent coverage.** The objective is to exercise as many of the 100
roster agents as possible (`.moai/plans/agent-roster-100.md`) — but only through
genuine contribution. Busywork artifacts that exist only to mark an agent as
"used" are explicitly disallowed and are penalized by the rubric in Section 2.

This project was chosen specifically because a freemium content platform
naturally mobilizes the full roster end-to-end. SEO and AI-crawler agents have
real discoverability work; content and writing agents have a real magazine to
fill; engineering agents have search, forms, feeds, and deploy pipelines to
build; data agents have a real knowledge graph and eval surface. No agent has to
be force-fit.

### 1.3 Why a single freemium funnel

The strategy is **one freemium funnel**, not two parallel products.

- The free searchable content/magazine **is the product trial**. A teacher who
  finds a free IDEN article through search is already sampling the IDEN method.
  This is funnel stage S2 (무료 가치 / lead magnet).
- The paid programs are the **natural extension** of that same trial. The reader
  who found value in the free article converts on the matching landing page.
  This is funnel stage S6 (수익 전환).
- S2 and S6 therefore share **one pipeline**. The free article, the search
  index, the landing page, and the checkout are links in a single chain. This
  is deliberate: when free assets and paid conversion share a pipeline, both the
  revenue score (S2→S6 continuity) and the connectivity score (artifacts wire
  directly into products) rise together.

The existing `conversion_funnel` block in `site-strategy.yaml`
(awareness → interest → consideration → decision → action → retention) is the
business-language version of the same idea. The S1–S6 funnel in Section 3 is its
measurable, agent-assignable form.

**Build rule (confirmed and non-negotiable):** build in funnel order
S1 → S2 → S3 → S4 → S5 → S6. Each stage must pass an `evaluator-active` gate
before the next begins. The anti-pattern "build all features first, bolt on
monetization last" is **explicitly forbidden** — it produces funnel-orphaned
artifacts and collapses the connectivity score.

---

## 2. Scoring Rubric

### 2.1 The 100-point model

The plan is scored out of **100 points**. Each of the 100 roster agents is worth
**1.00 point**. An agent's point is earned across three weighted axes.

| Axis | Weight | Meaning |
|------|--------|---------|
| 투입 깊이 (usage depth) | 0.30 | How deeply the agent is actually used |
| 수익 기여 (revenue contribution) | 0.40 | How much the agent moves the funnel (Section 3) |
| 다이렉트 연결성 (direct connectivity) | 0.30 | How directly its output wires into products / other agents |

**Per-agent score** = (투입 × 0.30) + (수익 × 0.40) + (연결성 × 0.30)

**Total** = Σ (all 100 agent scores) / 100

### 2.2 Axis scoring bands

**투입 깊이 (usage depth)**

| Value | Definition |
|-------|------------|
| 0.0 | 미사용 — agent never invoked |
| 0.5 | 의미있는 1회 — one genuine, substantive invocation |
| 1.0 | 핵심경로 반복 + 게이트 통과 — repeated use on the critical path, output passed an evaluator gate |

**수익 기여 (revenue contribution)** — computed from the funnel, see Section 3.

**다이렉트 연결성 (direct connectivity)**

| Value | Definition |
|-------|------------|
| 0.0 | 고아 산출물 — output is an orphan, nothing consumes it |
| 0.5 | 1단계 건너 연결 — output reaches a product/agent only via one intermediate hop |
| 1.0 | 제품·타에이전트에 직접 물림 — output is directly consumed by a shipped product or another agent |

### 2.3 Robustness rules (anti-inflation)

These rules exist so the score reflects real contribution, not roster theater.

| Rule | Mechanism |
|------|-----------|
| Artifact-evidence requirement | Any axis scored ≥ 0.70 MUST cite artifact evidence — a commit hash, a file path, or a passing test. Unsupported ≥ 0.70 scores are downgraded to the 0.40 tier. |
| Coverage-inflation penalty | If more than 20% of agents (> 20 agents) land in the 0.40 "구색용" tier, a global coverage-inflation penalty is applied to the total — the plan is judged to be padding the roster. |
| Zero-justification rule | Every agent scored 0.00 (unused) MUST have a written reason stating why it has no genuine role in this project. Unexplained zeros invalidate the scorecard. |
| Gate-tied depth | A 1.0 usage-depth score is only valid if the agent's output passed the relevant `evaluator-active` phase gate (Section 5). |

The integrity of the entire rubric depends on the artifact-evidence rule being
enforced during review. Without it, every axis trends optimistically upward.

---

## 3. Revenue Funnel S1–S6

The 수익 기여 axis is not a free-form judgment. It is computed from a six-stage
funnel that runs from base (a stranger on the internet) to revenue (a paying
client, retained).

An agent's **수익 score** = Σ (weight of each stage it touches × that stage's
effectiveness 0–1), **capped at 1.0**.

| Stage | Name | Weight | What it covers | "Effectiveness" means |
|-------|------|--------|----------------|------------------------|
| S1 | 발견 가능성 | 0.20 | Accurate external discoverability — search engines, AI crawlers, directory indexing | The site is correctly and completely indexed; crawlers parse it without error; structured data is valid |
| S2 | 무료 가치 | 0.15 | Zero-barrier free assets — tools, content, search — acting as the lead magnet | A first-time visitor gets real, usable value with no signup, no payment |
| S3 | 무료 홍보 확산 | 0.15 | Free promotion — syndication, social sharing, multilingual reach | Content travels beyond the site at zero ad spend (RSS, OG cards, ko/en variants) |
| S4 | 노출 빈도 | 0.15 | Exposure frequency — re-visit, subscription, notification cadence | A visitor has a reason and a channel to come back repeatedly |
| S5 | 유입 전환 | 0.20 | Visit → lead — landing pages, forms, CTA | A warm visitor reaches a clear next action and takes it (free consult booking) |
| S6 | 수익 전환 | 0.15 | Lead → revenue / retention — pricing, checkout, retention | A lead becomes a paying client and stays (pricing clarity, checkout, alumni retention) |

Stage weights sum to 1.00. They reflect the confirmed judgment that the two
*ends* of the funnel — being found (S1) and converting the warm visitor (S5) —
carry the most revenue leverage for a one-person business with no ad budget.

**Note:** these stage weights are the default. The user may adjust them. If
weights change, every 수익 score and the projected total in Section 6 must be
recomputed.

---

## 4. Agent → Funnel-Stage Assignment

Every one of the 100 agents is assigned to one or more S1–S6 stages, or marked
**process/meta** when the agent serves the *workflow* rather than the funnel
directly. Process/meta agents (mostly MoAI framework agents) still earn points —
their usage-depth and connectivity are real — but their 수익 score derives from
the stages their orchestration enables, not from a stage of their own.

Honesty note: where an agent fits a stage only weakly, it is marked **(weak)**
and is predicted to score low. This is intentional and feeds Section 6.

### 4.1 T1 — MoAI framework (22) — mostly process/meta

| Agent | Stage | Role | Predicted strength |
|-------|-------|------|--------------------|
| manager-spec | process/meta | Authors every SPEC; first in every phase | High |
| manager-strategy | process/meta | System design for the platform evolution | High |
| manager-ddd | process/meta | Behavior-preserving implementation cycle | High |
| manager-tdd | process/meta | Test-first implementation cycle | Medium |
| manager-docs | process/meta + S2 | Syncs docs; doc pages are also free assets | Medium |
| manager-quality | process/meta | TRUST 5 gate enforcement | High |
| manager-project | process/meta | Project config, workflow setup | Medium |
| manager-git | process/meta | Commits, branches, PRs — artifact evidence trail | High |
| evaluator-active | process/meta | Runs the phase gate at every S1–S6 boundary | High (critical path) |
| plan-auditor | process/meta | Audits this plan and each phase SPEC | Medium |
| expert-backend | S5, S6 | Search backend, form handling, checkout integration | High |
| expert-frontend | S2, S5, S6 | Landing pages, search UI, content templates | High |
| expert-security | S6 | Form/checkout input validation, OWASP | Medium |
| expert-devops | S1, S4 | Deploy pipeline, crawler-facing hosting config | Medium |
| expert-performance | S1, S5 | Core Web Vitals — ranking and conversion factor | Medium |
| expert-debug | process/meta | Defect resolution across phases | Medium |
| expert-testing | process/meta | Test strategy for search/forms | Medium |
| expert-refactoring | process/meta | One-shot cleanup of legacy site code | Low (weak) |
| builder-agent | process/meta | Builds/updates roster agents if gaps appear | Low (weak) |
| builder-skill | process/meta | Builds skills if a workflow gap appears | Low (weak) |
| builder-plugin | process/meta | Plugin packaging — no current need | Low (weak) |
| researcher | process/meta + S1 | Research for SPECs; keyword/competitor research | Medium |

### 4.2 S1 — 발견 가능성 (discoverability)

| Agent | Tier | Role at this stage |
|-------|------|--------------------|
| web-seo-auditor | T2 | Audit on-page SEO across all pages |
| web-meta-tag-curator | T2 | Title/description/OG/Twitter per page |
| web-structured-data-author | T2 | JSON-LD schema.org for programs, articles, org |
| web-sitemap-manager | T2 | Generate/validate sitemap.xml |
| web-robots-curator | T2 | robots.txt + AI-crawler directives |
| web-llms-txt-curator | T2 | llms.txt / llms-full.txt for AI crawlers |
| web-html-validator | T2 | Valid HTML so crawlers parse cleanly |
| web-link-checker | T2 | No broken links degrading crawl/ranking |
| knowledge-graph-builder | T4 | Maintain knowledge-graph.jsonld entity graph |
| web-lighthouse-optimizer | T2 | SEO/best-practice Lighthouse score |
| expert-performance | T1 | Core Web Vitals as a ranking signal |
| researcher | T1 | Keyword and competitor discovery research |

### 4.3 S2 — 무료 가치 (free value / lead magnet)

| Agent | Tier | Role at this stage |
|-------|------|--------------------|
| web-content-writer | T2 | Long-form free web content |
| web-magazine-editor | T2 | Magazine articles — core lead magnet |
| web-blog-publisher | T2 | Blog posts with correct front-matter |
| web-copy-proofreader | T2 | Proofread free content (ko/en) |
| web-component-extractor | T2 | Reusable partials for content pages |
| faq-builder | T5 | Free FAQ content |
| glossary-curator | T5 | Free domain glossary (IDEN/5S/STARCP terms) |
| tutorial-writer | T5 | Free step-by-step guides |
| technical-writer | T5 | Method explainer pages as free assets |
| summarizer | T5 | Article summaries / TL;DRs |
| expert-frontend | T1 | Search UI + content page templates |
| expert-backend | T1 | Resource search backend (SPEC-SEARCH-001) |

### 4.4 S3 — 무료 홍보 확산 (free promotion / reach)

| Agent | Tier | Role at this stage |
|-------|------|--------------------|
| web-rss-feed-builder | T2 | RSS/Atom feeds for syndication |
| web-og-image-designer | T2 | Open Graph share images |
| web-i18n-translator | T2 | ko/en localized page variants |
| translator-ko-en | T5 | ko↔en document translation |
| web-newsletter-composer | T2 | Newsletter content for sharing |
| web-changelog-writer | T2 | Site update / press notes |
| web-analytics-integrator | T2 | Measure which content actually spreads |
| citation-formatter | T5 | (weak) Reference formatting for shareable research posts |

### 4.5 S4 — 노출 빈도 (exposure frequency / re-visit)

| Agent | Tier | Role at this stage |
|-------|------|--------------------|
| web-newsletter-composer | T2 | Subscription content cadence |
| web-pwa-curator | T2 | PWA manifest + service worker for re-engagement |
| web-rss-feed-builder | T2 | Feed subscription as a re-visit channel |
| web-form-handler | T2 | Newsletter subscription form |
| web-darkmode-themer | T2 | (weak) Comfort feature, marginal re-visit lift |
| email-drafter | T5 | (weak) Subscriber email drafts — orphaned unless wired to a real send workflow |
| expert-devops | T1 | Notification/deploy cadence infrastructure |

### 4.6 S5 — 유입 전환 (visit → lead)

| Agent | Tier | Role at this stage |
|-------|------|--------------------|
| web-landing-builder | T2 | Assemble the five landing pages (SPEC-LANDING-001) |
| web-form-handler | T2 | Free-consult booking form |
| web-meta-tag-curator | T2 | Conversion-oriented page meta |
| web-content-writer | T2 | Landing page copy |
| web-accessibility-auditor | T2 | WCAG — no user excluded from converting |
| web-redirect-manager | T2 | 404 recovery + redirect rules preserve traffic |
| web-image-optimizer | T2 | Fast-loading landing visuals |
| web-font-optimizer | T2 | Prevent FOUT/FOIT on landing fold |
| expert-frontend | T1 | Landing/CTA implementation |
| expert-backend | T1 | Form submission backend |
| expert-performance | T1 | Landing-page speed as a conversion factor |
| data-visualizer | T4 | ROI / comparison charts on landing pages |
| proposal-writer | T5 | (weak) B2B program proposals — orphaned unless a real B2B workstream exists |
| presentation-builder | T5 | (weak) Program decks — orphaned unless used in real sales ops |

### 4.7 S6 — 수익 전환 (lead → revenue / retention)

| Agent | Tier | Role at this stage |
|-------|------|--------------------|
| web-form-handler | T2 | Application/checkout form |
| api-designer | T3 | Contract for booking/payment integration |
| db-schema-architect | T3 | Lead/applicant/subscriber data model |
| migration-writer | T3 | Schema migrations for the data model |
| error-handler-designer | T3 | Checkout/booking error taxonomy and fallback |
| expert-security | T1 | Payment/PII input validation |
| expert-backend | T1 | Checkout + retention backend |
| web-analytics-integrator | T2 | Conversion-rate measurement |
| llm-eval-designer | T4 | Eval suite for the site's AI coach upsell quality |
| prompt-engineer | T4 | Prompt design for AI-coach trial → paid upsell |
| web-newsletter-composer | T2 | Alumni retention / post-program nurture |

### 4.8 Engineering / data / writing — supporting roles

These agents support implementation across stages. Several are honestly weak —
flagged here and counted as point-loss risk in Section 6.

| Agent | Tier | Stage(s) | Predicted strength |
|-------|------|----------|--------------------|
| code-reviewer | T3 | process/meta | Medium — reviews critical-path code |
| test-author | T3 | process/meta | Medium — tests for search/forms |
| bug-triager | T3 | process/meta | Medium |
| dependency-auditor | T3 | process/meta | Medium |
| license-compliance-checker | T3 | process/meta | Low (weak) |
| log-analyzer | T3 | S1/S4 | Low (weak) — static site has thin logs |
| regex-crafter | T3 | S2 | Low (weak) — search query parsing only |
| shell-scripter | T3 | process/meta | Low — build scripts |
| dockerfile-author | T3 | process/meta | Low (weak) — static site, minimal container need |
| ci-pipeline-builder | T3 | process/meta | Medium — deploy pipeline |
| env-config-manager | T3 | S6 | Low — secrets for form/payment |
| mock-data-generator | T3 | process/meta | Low (weak) — test fixtures only |
| cli-builder | T3 | process/meta | Low (weak) — no real CLI need |
| code-commenter | T3 | process/meta | Low (weak) |
| type-annotator | T3 | process/meta | Low (weak) — minimal JS |
| benchmark-runner | T3 | S1/S5 | Low (weak) — overlaps Lighthouse |
| concurrency-auditor | T3 | process/meta | Low (weak) — static site, near-zero concurrency |
| git-hook-author | T3 | process/meta | Low — pre-commit hooks |
| config-schema-validator | T3 | process/meta | Low — validates site-strategy.yaml etc. |
| release-notes-writer | T3 | S3 | Low (weak) — overlaps web-changelog-writer |
| codemod-author | T3 | process/meta | Low (weak) |
| web-vercel-deployer | T2 | process/meta + S1 | Medium — ships everything |
| web-css-linter | T2 | process/meta | Low — style hygiene |
| data-cleaner | T4 | S2 | Low (weak) — content/resource dataset hygiene |
| csv-json-transformer | T4 | S2 | Low (weak) — resource index format conversion |
| json-schema-author | T4 | process/meta | Low — schema for resource/feed JSON |
| spreadsheet-analyst | T4 | S6 | Low (weak) — funnel-orphaned unless tied to real ops |
| data-pipeline-designer | T4 | S2/S4 | Low (weak) — content pipeline, light |
| statistics-reporter | T4 | S6 | Low (weak) — conversion stats reporting |
| readme-author | T5 | process/meta | Low — repo README |
| style-guide-enforcer | T5 | S2 | Medium — enforces voice_rules from site-strategy.yaml |
| meeting-notes-taker | T5 | process/meta | Low (weak) — funnel-orphaned, no meetings in scope |

---

## 5. Phased Execution Roadmap

Six phases, one per funnel stage, built strictly in order. Each phase begins
with `manager-spec` and ends with an `evaluator-active` gate. **No phase starts
until the previous phase's gate has passed.** `plan-auditor` audits each phase
SPEC before implementation; `manager-git` commits at each phase end to create
the artifact-evidence trail the rubric requires.

### Phase 1 — S1 발견 가능성 (priority: Critical, first)

- **Objective:** make the site accurately and completely discoverable by search
  engines and AI crawlers.
- **Agents activated:** web-seo-auditor, web-meta-tag-curator,
  web-structured-data-author, web-sitemap-manager, web-robots-curator,
  web-llms-txt-curator, web-html-validator, web-link-checker,
  knowledge-graph-builder, web-lighthouse-optimizer, expert-performance,
  researcher, web-vercel-deployer; orchestrated by manager-spec, manager-strategy.
- **Artifacts:** updated `sitemap.xml`, `robots.txt`, `llms.txt`/`llms-full.txt`,
  per-page meta tags, valid JSON-LD, `knowledge-graph.jsonld`, SEO audit report,
  zero-broken-link report.
- **Gate (evaluator-active):** sitemap covers 100% of public pages; all JSON-LD
  validates; zero broken links; llms.txt resolves; Lighthouse SEO >= 90.

### Phase 2 — S2 무료 가치 (priority: Critical)

- **Objective:** ship the free lead magnet — searchable content and magazine —
  delivering real value with zero barrier.
- **Agents activated:** web-content-writer, web-magazine-editor,
  web-blog-publisher, web-copy-proofreader, web-component-extractor, faq-builder,
  glossary-curator, tutorial-writer, technical-writer, summarizer,
  expert-frontend, expert-backend (search per SPEC-SEARCH-001), style-guide-enforcer,
  data-cleaner, csv-json-transformer.
- **Artifacts:** new magazine/blog articles, FAQ page, glossary, tutorials,
  resource search feature, content page templates/partials.
- **Gate:** search returns relevant results; >= N free articles published and
  proofread against `voice_rules`; no signup required to reach any free asset.

### Phase 3 — S3 무료 홍보 확산 (priority: High)

- **Objective:** make free content travel beyond the site at zero ad spend.
- **Agents activated:** web-rss-feed-builder, web-og-image-designer,
  web-i18n-translator, translator-ko-en, web-newsletter-composer,
  web-changelog-writer, web-analytics-integrator, citation-formatter,
  release-notes-writer.
- **Artifacts:** validated RSS/Atom feeds, OG share images, ko/en page variants,
  newsletter issue, changelog, analytics integration.
- **Gate:** feeds validate; OG cards render correctly on social preview; ko/en
  variants resolve with correct hreflang; analytics events fire.

### Phase 4 — S4 노출 빈도 (priority: High)

- **Objective:** give visitors a reason and a channel to return.
- **Agents activated:** web-newsletter-composer, web-pwa-curator,
  web-rss-feed-builder, web-form-handler, web-darkmode-themer, email-drafter,
  expert-devops, data-pipeline-designer.
- **Artifacts:** subscription form, working PWA manifest + service worker,
  newsletter cadence plan, dark/light theme.
- **Gate:** PWA installable and passes Lighthouse PWA audit; subscription form
  submits and stores; service worker caches correctly.

### Phase 5 — S5 유입 전환 (priority: Critical)

- **Objective:** turn warm visitors into leads via landing pages and CTAs.
- **Agents activated:** web-landing-builder, web-form-handler,
  web-meta-tag-curator, web-content-writer, web-accessibility-auditor,
  web-redirect-manager, web-image-optimizer, web-font-optimizer, expert-frontend,
  expert-backend, expert-performance, data-visualizer; SPEC-LANDING-001 is the
  spec anchor.
- **Artifacts:** five completed landing pages (12-section template from
  site-strategy.yaml), free-consult booking form, ROI/comparison charts, 404 +
  redirect rules.
- **Gate:** all five landing pages pass WCAG 2.1 AA; booking form submits
  end-to-end; landing Core Web Vitals in the green; CTA pattern matches
  `cta_pattern` rules.

### Phase 6 — S6 수익 전환 (priority: Critical, last)

- **Objective:** convert leads to paying clients and retain them.
- **Agents activated:** web-form-handler, api-designer, db-schema-architect,
  migration-writer, error-handler-designer, expert-security, expert-backend,
  web-analytics-integrator, llm-eval-designer, prompt-engineer,
  web-newsletter-composer; supported by env-config-manager, statistics-reporter.
- **Artifacts:** application/checkout flow, lead/applicant data model + migrations,
  pricing presentation, AI-coach upsell eval suite, retention nurture sequence.
- **Gate:** checkout/application flow completes end-to-end; PII inputs validated
  per OWASP; conversion analytics report produced; eval suite passes.

Throughout all phases, process/meta agents (manager-quality, code-reviewer,
test-author, bug-triager, dependency-auditor, manager-git, plan-auditor, etc.)
run continuously on the critical path.

---

## 6. Projected Score

### 6.1 Tier-level projection

| Group | Agents | Projected avg / agent | Subtotal |
|-------|--------|------------------------|----------|
| T1 core (high-value: spec, strategy, ddd, quality, git, evaluator, backend, frontend, performance, security, devops) | ~12 | 0.80 | ~9.6 |
| T1 weak (refactoring, builder-agent, builder-skill, builder-plugin, tdd, debug, testing, project, docs, plan-auditor, researcher) | ~10 | 0.55 | ~5.5 |
| T2 web — S1/S2/S5 core | ~20 | 0.78 | ~15.6 |
| T2 web — S3/S4 + hygiene | ~10 | 0.55 | ~5.5 |
| T3 engineering — critical-path (code-reviewer, api-designer, db-schema-architect, test-author, error-handler-designer, ci-pipeline-builder, migration-writer, dependency-auditor) | ~8 | 0.62 | ~5.0 |
| T3 engineering — weak/orphan-risk (17 remaining) | ~17 | 0.40 | ~6.8 |
| T4 data — knowledge-graph, prompt-engineer, llm-eval-designer, data-visualizer | ~4 | 0.62 | ~2.5 |
| T4 data — weak (6 remaining) | ~6 | 0.42 | ~2.5 |
| T5 writing — content-supporting (faq, glossary, tutorial, technical, summarizer, translator, style-guide, readme) | ~8 | 0.58 | ~4.6 |
| T5 writing — office orphans (proposal-writer, email-drafter, meeting-notes-taker, presentation-builder, citation-formatter) | ~5 | 0.38 | ~1.9 |

**Raw projected total: ≈ 65 / 100.**

### 6.2 Coverage-inflation penalty check

Count the 0.40-tier ("구색용") agents: T3 weak (~17) + T4 weak (~6) + T5 office
orphans (~5) ≈ **28 agents**, which is **28%** of the roster — above the 20%
threshold in Section 2.3. The coverage-inflation penalty therefore **applies**.

**Realistic projected total after penalty: ≈ 60–63 / 100.**

This plan adopts **62 / 100** as its honest projected figure.

### 6.3 Main point-loss areas (honest)

- **Office agents are funnel-orphaned.** proposal-writer, email-drafter,
  meeting-notes-taker, presentation-builder, and spreadsheet-analyst produce
  artifacts (proposals, emails, minutes, decks, sheets) that no shipped product
  consumes. They score low on connectivity and revenue unless wrapped into a
  *real* business-operations workstream (e.g. an actual B2B school-budget
  proposal pipeline, an actual subscriber email send). Without that, they stay
  at the 0.40 tier.
- **Static-site engineering mismatch.** concurrency-auditor, dockerfile-author,
  cli-builder, codemod-author, type-annotator, mock-data-generator, and
  log-analyzer are software-engineering agents on a largely static website.
  Their genuine surface area is thin. Forcing them up would violate the
  artifact-evidence rule.
- **Redundancy clusters.** release-notes-writer vs web-changelog-writer,
  benchmark-runner vs web-lighthouse-optimizer, summarizer vs web-copy-proofreader
  — overlapping agents split one job's credit, depressing both scores.
- **Builder agents have no gap to fill.** builder-agent / builder-skill /
  builder-plugin only score well if the project surfaces a real roster or
  tooling gap. The plan does not assume one.

Pushing past ~65 would require manufacturing artifacts purely to register agent
usage — which the rubric is explicitly designed to punish. **62 is the honest
ceiling for genuine contribution.**

---

## 7. Risks & Honest Caveats

| # | Risk | Mitigation / honest caveat |
|---|------|----------------------------|
| 1 | **Diminishing returns above ~65.** | Each point past ~65 costs disproportionately more effort and tempts busywork. Treat 62 as success; do not chase 100/100. The goal is genuine coverage, not a perfect number. |
| 2 | **Rubric integrity depends on evidence enforcement.** | If the artifact-evidence rule (Section 2.3) is not enforced at review time, every axis drifts upward and the score becomes fiction. The reviewer MUST demand a commit/file/test for every >= 0.70 score. |
| 3 | **One-person capacity.** | 네다바웨이 is a single operator. A six-phase, 100-agent plan is large. Phases are independently shippable — partial completion (S1–S3) still produces a working freemium top-of-funnel. |
| 4 | **Office-agent temptation.** | The cheapest way to lift the score is to fabricate proposals/emails/decks. This is explicitly forbidden. Better to accept the 0.40 tier and the coverage penalty than to corrupt the rubric. |
| 5 | **Build-order discipline.** | Skipping ahead to S6 (monetization) before S1–S5 are gated breaks the shared-pipeline thesis and orphans artifacts. The S1→S6 order and the per-phase evaluator gates are non-negotiable. |
| 6 | **Stage-weight sensitivity.** | The 수익 score and the projected total assume the default S1–S6 weights. If the user re-weights stages, Sections 3, 4, and 6 must be recomputed before the scorecard is trusted. |
| 7 | **Voice/brand drift.** | High agent throughput on content risks violating `voice_rules` in site-strategy.yaml. style-guide-enforcer and web-copy-proofreader are mandatory gates on every S2/S5 content artifact. |
| 8 | **Redundant-agent credit dilution.** | Overlapping agents (Section 6.3) will under-score. This is accepted as honest; do not split work artificially just to feed both. |

---

## Appendix — Source References

- Roster: `.moai/plans/agent-roster-100.md`
- Strategy SSoT: `.moai/strategy/site-strategy.yaml`
- Existing SPECs: `.moai/specs/SPEC-LANDING-001/`, `.moai/specs/SPEC-SEARCH-001/`
- Confirmed decisions: planning conversation (this document is their write-up)
