# SPEC-FREEVALUE-001 — S2 무료 가치 (Free Value / Lead Magnet)

```yaml
spec_id: SPEC-FREEVALUE-001
title: S2 Free Value — a zero-barrier free-content layer that delivers real value and routes visitors toward conversion
version: 1.0.0
created: 2026-05-19
status: draft
owner: 김창환 (네다바웨이)
priority: Critical
funnel_stage: S2 (무료 가치, weight 0.15)
master_plan_ref: .moai/plans/funnel-100-master-plan.md (Phase 2)
strategy_ref: .moai/strategy/site-strategy.yaml
related_specs: [SPEC-DISCOVERY-001, SPEC-LANDING-001, SPEC-SEARCH-001]
tags: [free-value, lead-magnet, content, faq, glossary, cta, funnel-s2]
```

## Goal

Make the free content of `nedabah.org` function as a deliberate **lead magnet**: a
first-time visitor who lands cold can find the free material, get genuine usable
value from it without signup or payment, and is then offered a clear, non-pushy
next step toward the free 30-minute consultation or a relevant paid program.

This is funnel stage S2 in the master plan. The strategic thesis (master plan
Section 1.3) is that **the free content is the product trial** and S2 shares one
pipeline with conversion (S5/S6). A teacher who finds a free IDEN article is
already sampling the IDEN method; the article must therefore not dead-end.

This is an **audit-and-improve** SPEC, not greenfield. The repository already has
a large free-content base: `magazine/` (409 article pages), `blog/` and
`blog/perspective/` (354 pages), `resources/` (532 indexed public resources),
`learning/` (95 pages), `lectures/` (14 pages), `book/` (6 pages), and
`auto/tools/` (12 free mini web-apps with a hub at `auto/tools/index.html`). The
work is to (1) give this base a coherent entry point, (2) wire each substantial
piece toward conversion, (3) hold it to a content-quality baseline, and (4) keep
it consistent with the S1 discoverability metadata established by
SPEC-DISCOVERY-001.

A representative audit finding that motivates this SPEC: of five sampled
`magazine/` article pages, **zero** linked to a program page or the free
consultation. The free-value layer is currently a funnel orphan — S2 closes that.

Success is measured by the **quality of the free-value outcome** — value is
reachable, every substantial asset routes onward, content meets the brand baseline
— not by the count of agents or artifacts produced.

## Scope Definition

### The free-content corpus

S2 requirements apply to the **free-content corpus**, defined as the subset of the
SPEC-DISCOVERY-001 frozen public page set
(`.moai/specs/SPEC-DISCOVERY-001/public-pages.txt`) that is zero-barrier free
content, namely pages under:

- `magazine/` — long-form articles (core lead magnet)
- `blog/` and `blog/perspective/` — articles and perspective notes
- `resources/` — public resources (curations, evidence, guides, prompts,
  diagnostics, worksheets), reachable via the SPEC-SEARCH-001 search index
- `learning/` — learning pages
- `lectures/` — lecture pages
- `book/` — book excerpt / sample pages
- `auto/tools/` — the 12 free mini web-apps and their hub `index.html`

EXCLUDING the five `/p/` landing pages (conversion surface, SPEC-LANDING-001),
non-public paths disallowed in `robots.txt`, and archive/build directories
(`_archive_*/`, `_build/`, etc.) — identical exclusions to SPEC-DISCOVERY-001.

[HARD] The first implementation task is to **enumerate and freeze the
free-content corpus** as a checked-in list
(`.moai/specs/SPEC-FREEVALUE-001/free-content-corpus.txt`), derived from
`public-pages.txt` by directory membership above. The corpus list further marks
each entry as **substantial** or **incidental** (see REQ-FV-004). Every
corpus-scoped requirement is measured against this frozen list.

## Constraints

- **Static site only.** GitHub Pages + Vercel. No server-side logic, no
  server-rendered personalization, no headless CMS.
- **No paid services.** No paid content tools, no paid CTA/popup platforms, no
  paid analytics. The free-value layer must itself remain free to operate.
- **No signup wall.** [HARD] Reaching any free asset MUST NOT require a login,
  email submission, or payment. CTAs offer the next step; they never gate the
  content already delivered.
- **No new runtime dependencies.** Verification reuses tooling already in
  `package.json` (`htmlhint`, `lychee`, `pa11y-ci`, `lhci`, `stylelint`) and the
  existing `resources/_build/` scripts.
- **Do not regress S1.** Any page edited under this SPEC must keep the
  discoverability metadata (title, description, canonical, OG/Twitter, JSON-LD,
  heading hierarchy) that SPEC-DISCOVERY-001 requires. Adding a CTA block or a
  hub page must not break a passing S1 check.
- **Factual claims defer to the strategy SSoT.** Any program name, price,
  persona, authority fact, or method term used in free content, CTAs, FAQ, or
  glossary MUST trace to `.moai/strategy/site-strategy.yaml`. Free content must
  not invent unverified facts.
- **Brand voice is a hard constraint.** All free content edited or created under
  this SPEC MUST comply with `site-strategy.yaml#voice_rules` — the `forbidden`
  list, the `required` list, and `cta_pattern` (one primary CTA at the end of the
  body, one footer CTA, no repeated mid-body CTAs).
- **No time estimates.** Priority labels only (Critical / High / Medium).

## EARS — Requirements

### REQ-FV-001 — Free-content corpus enumeration (Critical)
The system **shall** maintain a checked-in enumeration of the free-content corpus
at `.moai/specs/SPEC-FREEVALUE-001/free-content-corpus.txt`, derived from the
SPEC-DISCOVERY-001 public page set by the directory membership in Scope
Definition, with each entry classified as **substantial** or **incidental** per
REQ-FV-004.

### REQ-FV-002 — Free-value entry point / hub (Critical)
The system **shall** provide a single free-value hub page (at `/free.html` or an
equivalent canonical path) that a cold visitor can reach from the global
navigation, presenting the categories of free material (magazine, articles,
resources/search, free tools, learning) with a one-line value statement per
category and a direct link into each.

### REQ-FV-003 — Hub reachability from global navigation (High)
The global navigation component used across the free-content corpus **shall**
include an entry pointing to the free-value hub (REQ-FV-002), so a visitor on any
free page can reach the full free-value map in one click.

### REQ-FV-004 — Substantial-asset classification (Critical)
The system **shall** classify each free-content corpus page as **substantial** or
**incidental**, where a **substantial** asset is a standalone long-form article,
guide, tutorial, worksheet, diagnostic, or interactive tool that delivers
self-contained value, and an **incidental** page is an index, listing, tag, or
navigational stub. The conversion-wiring requirements REQ-FV-005..REQ-FV-008 apply
only to **substantial** assets.

### REQ-FV-005 — Conversion next-step on substantial articles (Critical)
**When** a visitor reaches the end of a substantial article page (`magazine/`,
`blog/`, `blog/perspective/`, `learning/`, `lectures/`, `book/`), the page
**shall** present exactly one primary next-step call-to-action leading either to
the free 30-minute consultation or to the single most relevant `/p/` program
page, consistent with `site-strategy.yaml#voice_rules.cta_pattern`.

### REQ-FV-006 — Conversion next-step on free tools (Critical)
**When** a visitor finishes using a free mini-app under `auto/tools/`, the tool
page **shall** present a clear next-step call-to-action toward the free
consultation or a relevant program, placed after the tool result so it never
blocks use of the tool itself.

### REQ-FV-007 — Conversion next-step on resources (High)
Every **substantial** public resource page under `resources/` (guide, prompt,
diagnostic, worksheet) **shall** end with a next-step call-to-action toward the
free consultation or a relevant program.

### REQ-FV-008 — Relevance of the routed program (High)
**Where** a substantial asset's next-step CTA points to a specific `/p/` program
page rather than the generic free consultation, the routed program **shall** be
the one whose `target_persona` / `target_pain` in
`site-strategy.yaml#revenue_lineup` best matches the asset's topic; an asset
**shall not** route to an unrelated program.

### REQ-FV-009 — No signup wall on free value (Critical)
The system **shall not** require login, email submission, or payment to reach or
consume any page in the free-content corpus. **If** an asset currently sits behind
any such gate, **then** the gate shall be removed or the asset shall be moved out
of the free-content corpus.

### REQ-FV-010 — Brand-voice conformance of free content (Critical)
All free content created or edited under this SPEC **shall** comply with
`site-strategy.yaml#voice_rules`: it shall contain none of the `forbidden`
expressions and shall observe the `required` conventions (concrete numbers, proper
nouns, singular address, short sentences, noun-form or invitational closing).

### REQ-FV-011 — Content-quality baseline (High)
Every substantial asset created or substantively edited under this SPEC **shall**
meet a content-quality baseline: it shall be factually accurate against the
strategy SSoT, shall have a clear single topic and a meaningful body (not a thin
stub or filler), and **shall not** be unedited AI-generated boilerplate.

### REQ-FV-012 — Free FAQ page (High)
**Where** it adds real value for a first-time visitor, the system **shall**
provide a single free FAQ page answering the recurring questions a cold visitor
asks (what 네다바웨이 is, what the free consultation is and how to book it, who
each program is for, how pricing works), with every factual answer sourced from
`site-strategy.yaml`.

### REQ-FV-013 — Free domain glossary (High)
**Where** it adds real value, the system **shall** provide a single free glossary
defining the brand's domain terms (at minimum STARCP, IDEN, the 5S cycle —
See·Speak·Sense·Steer·Sustain, WFO, 창직), each definition sourced from
`site-strategy.yaml#authority_assets` and the program method descriptions.

### REQ-FV-014 — Getting-started guidance (Medium)
**Where** it adds real value, the free-value hub (REQ-FV-002) **shall** include
getting-started guidance that orients a first-time visitor — a short "start here"
path indicating which free asset to read first depending on the visitor's
situation (취업, 진로교사, 이직, 창직, 리더십).

### REQ-FV-015 — Consistent free-content structure (High)
Substantial articles within the same category **shall** use a consistent page
structure (one `<h1>`, semantic `<main>`, a body, and the standardized end-of-body
next-step block from REQ-FV-005), so the free-content layer reads as one coherent
library rather than disparate pages.

### REQ-FV-016 — S1 discoverability metadata preserved (Critical)
Every page edited under this SPEC **shall** retain the discoverability metadata
required by SPEC-DISCOVERY-001 (unique `<title>`, 50–160 char description, single
correct canonical, complete OG/Twitter tags, valid JSON-LD, correct heading
hierarchy). New pages created under this SPEC (hub, FAQ, glossary) **shall** also
satisfy those SPEC-DISCOVERY-001 requirements and **shall** be added to
`sitemap.xml` and to the SPEC-DISCOVERY-001 public page set.

### REQ-FV-017 — Hub and new pages enter the search surface (Medium)
The free-value hub, FAQ, and glossary pages **shall** be linked from the site such
that they are crawlable, and any of them that qualifies as a public resource
**shall** be reachable through the SPEC-SEARCH-001 resource search where
applicable. This requirement coordinates with SPEC-SEARCH-001 and does not modify
the search index builder.

### REQ-FV-018 — Free-value audit report (High)
The system **shall** produce a free-value audit report at
`.moai/reports/free-value-2026-05-19/report.md` recording, per requirement, the
corpus pages audited, the assets classified substantial, the CTAs added, the
voice-rule and quality findings, and the final pass/fail state. This report is the
artifact-evidence record required by the master plan's scoring rubric.

### REQ-FV-019 — No mid-body CTA spam (High)
The system **shall not** introduce repeated mid-body calls-to-action into free
content. **If** an asset already contains mid-body CTA repetition, **then** it
shall be reduced to the single end-of-body primary CTA plus the footer CTA, per
`voice_rules.cta_pattern.forbidden`.

## Acceptance Criteria

All criteria are verified against the frozen free-content corpus in
`free-content-corpus.txt`.

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| AC-1 | Free-content corpus is enumerated and frozen | `.moai/specs/SPEC-FREEVALUE-001/free-content-corpus.txt` exists, is non-empty, every entry is also in `SPEC-DISCOVERY-001/public-pages.txt`, and each entry is tagged `substantial` or `incidental` |
| AC-2 | Free-value hub exists and lists the free categories | The hub page exists at its canonical path, contains a link into each free category (magazine, articles, resources/search, tools, learning), and renders with a one-line value statement per category |
| AC-3 | Hub is reachable from global navigation | The global nav on a sampled page from each corpus directory contains a link resolving to the hub |
| AC-4 | Every substantial article ends with exactly one primary next-step CTA | Audit script over `substantial` article entries: each has exactly one end-of-body CTA element linking to the free-consult page or a `/p/` page; zero substantial articles with no CTA |
| AC-5 | Every free tool offers a post-result next step | Audit of `auto/tools/*/index.html`: each tool page contains a next-step CTA placed after the result region |
| AC-6 | Every substantial resource ends with a next-step CTA | Audit of `substantial` `resources/` entries: each has an end-of-body CTA toward free-consult or a `/p/` page |
| AC-7 | Routed programs are topic-relevant | Manual review sample (>= 20 substantial assets): each asset that routes to a specific `/p/` page routes to the persona-matched program per `revenue_lineup`; zero mismatches in the sample |
| AC-8 | No free asset is behind a signup/payment wall | Audit of the corpus: zero pages require login/email/payment to view content |
| AC-9 | Free content passes voice rules | Voice-rule check (forbidden-expression scan + `required`/`cta_pattern` review) over all assets created or edited under this SPEC reports zero `forbidden` violations |
| AC-10 | Substantial new/edited content meets the quality baseline | Review confirms each new/edited substantial asset is accurate vs `site-strategy.yaml`, single-topic, non-thin, and not unedited AI boilerplate |
| AC-11 | FAQ page exists and is sourced | The FAQ page exists, answers the recurring cold-visitor questions, and every factual answer traces to `site-strategy.yaml` |
| AC-12 | Glossary page exists and is sourced | The glossary defines at minimum STARCP, IDEN, 5S (See·Speak·Sense·Steer·Sustain), WFO, 창직, each definition traceable to `site-strategy.yaml` |
| AC-13 | Getting-started guidance present on the hub | The hub contains a "start here" path mapping the five visitor situations to a recommended first free asset |
| AC-14 | Consistent structure across same-category articles | Sampled substantial articles per category share one `<h1>`, semantic `<main>`, and the standardized end-of-body next-step block |
| AC-15 | S1 metadata not regressed | `npm run lint:html`, `npm run links`, and the JSON-LD validity check over all pages edited/created under this SPEC report zero new errors vs the SPEC-DISCOVERY-001 baseline |
| AC-16 | New pages indexed | Hub, FAQ, and glossary appear in `sitemap.xml` and in `SPEC-DISCOVERY-001/public-pages.txt`; `npm run links` confirms they resolve |
| AC-17 | No mid-body CTA spam | Audit confirms no edited free asset contains repeated mid-body CTA blocks; only the end-of-body primary CTA and footer CTA remain |
| AC-18 | Free-value audit report produced | `.moai/reports/free-value-2026-05-19/report.md` exists and records per-requirement findings and final state |

## S2 → S3 Gate Condition

[HARD] Stage S3 (무료 홍보 확산) work **must not begin** until the
`evaluator-active` gate for S2 passes. The gate passes only when **all** of the
following hold, each backed by artifact evidence (a passing command output or a
committed file):

1. **Reachable entry point** — the free-value hub exists, is linked from the
   global navigation, and lists every free category with a working link into it
   (AC-2, AC-3).
2. **Conversion wiring complete** — **100%** of assets classified `substantial`
   in `free-content-corpus.txt` (articles, tools, and resources) end with exactly
   one next-step CTA toward the free 30-minute consultation or a relevant `/p/`
   program page; zero substantial assets are funnel orphans (AC-4, AC-5, AC-6).
3. **Relevance verified** — in a review sample of at least 20 substantial assets,
   every program-specific CTA routes to the persona-matched program with zero
   mismatches (AC-7).
4. **Zero barrier** — no page in the free-content corpus requires login, email,
   or payment to consume its content (AC-8).
5. **Brand-voice conformance** — the voice-rule check reports **zero**
   `forbidden`-expression violations across all content created or edited under
   this SPEC, and CTAs follow `cta_pattern` (AC-9, AC-17).
6. **Supporting artifacts present** — the FAQ page and the domain glossary exist,
   are sourced from `site-strategy.yaml`, and the hub carries getting-started
   guidance (AC-11, AC-12, AC-13).
7. **No S1 regression** — `npm run lint:html`, `npm run links`, and the JSON-LD
   validity check report **zero new errors** for every page edited or created
   under this SPEC, and the hub/FAQ/glossary are present in `sitemap.xml` and the
   public page set (AC-15, AC-16).
8. **Evidence** — the free-value audit report
   (`.moai/reports/free-value-2026-05-19/report.md`) exists and records the pass
   state with the findings above (AC-18).

If any condition fails, S2 is not complete and S3 does not start. This mirrors the
master plan Phase 2 gate ("search returns relevant results; free articles
published and proofread against `voice_rules`; no signup required to reach any
free asset") and adds the master-plan-mandated S2→conversion connection as an
explicit, measurable condition.

## Exclusions (What NOT to Build)

- ❌ S1 discoverability work — sitemaps, robots.txt, AI-crawler directives,
  per-page SEO metadata authoring, JSON-LD authoring. Owned by
  SPEC-DISCOVERY-001. This SPEC only *preserves* that metadata and adds the few
  new pages to the indexed set.
- ❌ Search functionality — the resource search index, search UI, and search
  ranking are owned by SPEC-SEARCH-001. This SPEC links to the search page but
  does not modify the index builder or the search behavior.
- ❌ Landing-page layout, copy, or the 12-section template — owned by
  SPEC-LANDING-001. This SPEC routes free content *to* the `/p/` pages but does
  not change them.
- ❌ Checkout, payment, application forms, booking-form backend — stages S5/S6.
  S2 links toward the free consultation; it does not build the consultation
  booking flow itself.
- ❌ Social syndication, RSS/Atom feeds, OG share-image design, ko/en
  multilingual variants — stage S3 (무료 홍보 확산).
- ❌ Newsletter cadence, subscription forms, PWA, service worker, re-visit
  notifications — stage S4 (노출 빈도).
- ❌ Mass content generation to inflate the article count. New free content is
  created only where it adds genuine value (FAQ, glossary, hub, targeted gaps),
  not to register agent usage. Master plan Section 1.2 forbids busywork
  artifacts.
- ❌ Rewriting or re-themed redesign of the existing 400+ magazine articles.
  Existing articles are audited and receive the standardized next-step CTA and
  voice-rule correction; their body content is not rewritten unless it fails the
  REQ-FV-011 quality baseline.
- ❌ Server-side rendering, headless CMS, AI-powered personalization, or any
  non-static infrastructure.
- ❌ Paid CTA / popup / analytics platforms.
- ❌ Auditing or wiring archived content under `_archive_*/` — archived pages are
  excluded from the free-content corpus.

## Dependencies

- **Predecessor (hard)**: SPEC-DISCOVERY-001 — its S1→S2 gate must have passed,
  and `.moai/specs/SPEC-DISCOVERY-001/public-pages.txt` is the source the
  free-content corpus is derived from.
- **Strategy SSoT**: `.moai/strategy/site-strategy.yaml` — source of all program,
  persona, price, authority, method, `voice_rules`, and `conversion_funnel`
  facts used in free content, CTAs, FAQ, and glossary.
- **Related SPECs**: SPEC-LANDING-001 (the five `/p/` pages are the CTA targets),
  SPEC-SEARCH-001 (the resource search page is one free-value category linked
  from the hub).
- **Tooling**: `htmlhint`, `lychee`, `pa11y-ci`, `lhci` (already in
  `package.json` devDependencies) for the no-regression verification.
- **Existing infrastructure**: `auto/tools/index.html` (free-tools hub),
  `resources/index.html`, `blog/index.html`, `magazine.html`, the global
  navigation component, and `assets/nedabah.bundle.css` design tokens.

## Assumptions

1. The free-content corpus is a strict subset of the SPEC-DISCOVERY-001 frozen
   public page set; SPEC-DISCOVERY-001 is treated as already passed (master plan
   build-order rule). The exact corpus list is produced by REQ-FV-001 — page
   counts in this SPEC (409 magazine, 354 blog, 532 resources, 95 learning, 14
   lectures, 6 book, 12 tools) are observed at authoring time and are not the
   contract; `free-content-corpus.txt` is.
2. The site currently has no dedicated free-value hub, no FAQ page, and no
   glossary page (confirmed by directory listing: `faq.html` / `glossary.html` /
   `start.html` absent). REQ-FV-002/012/013 therefore create new pages rather
   than audit existing ones.
3. The "free-value audit report" is classified as a report and lives under
   `.moai/reports/` (per the SPEC-vs-report classification rule), not under
   `.moai/specs/`.
4. The free 30-minute consultation is reached via the existing contact path
   (`contact.html` / the `cta_secondary` "무료 30분 …" pattern in
   `revenue_lineup`). S2 routes visitors toward that path; building or changing
   the booking mechanism itself is S5 scope.
5. "Substantial" vs "incidental" classification (REQ-FV-004) is decidable from
   page type and is frozen in `free-content-corpus.txt`; conversion-wiring
   acceptance criteria are measured only against `substantial` entries.
6. Voice-rule conformance can be verified offline (a forbidden-expression scan
   plus a structured `required`/`cta_pattern` review) without a paid service,
   consistent with the no-paid-services constraint.
7. The S2→S3 gate thresholds (100% substantial-asset conversion wiring, zero
   signup walls, zero forbidden-voice violations) are derived from master plan
   Phase 2 and Section 1.3 and are treated as fixed inputs, not re-derived here.

## Lifecycle Note

This SPEC is **spec-anchored**: the free-content base grows (new magazine
articles, new resources), and the S2 contract — every substantial free asset
routes onward, content stays on-brand, S1 metadata is preserved — remains a
standing requirement. Re-running the free-value audit after future content
additions keeps S2 from regressing into a funnel-orphaned content dump, which
would collapse both the revenue-continuity and connectivity scores in the master
plan rubric.
