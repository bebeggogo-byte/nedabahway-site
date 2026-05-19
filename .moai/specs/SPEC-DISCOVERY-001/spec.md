# SPEC-DISCOVERY-001 — S1 발견 가능성 (Accurate External Discoverability)

```yaml
spec_id: SPEC-DISCOVERY-001
title: S1 Discoverability — accurate, complete indexing by search engines and AI crawlers
version: 1.0.0
created: 2026-05-19
status: draft
owner: 김창환 (네다바웨이)
priority: Critical
funnel_stage: S1 (발견 가능성, weight 0.20)
master_plan_ref: .moai/plans/funnel-100-master-plan.md (Phase 1)
strategy_ref: .moai/strategy/site-strategy.yaml
related_specs: [SPEC-LANDING-001, SPEC-SEARCH-001]
tags: [seo, discoverability, structured-data, sitemap, ai-crawler, accessibility, funnel-s1]
```

## Goal

Make every public page of `nedabah.org` correctly and completely discoverable by
search engines and AI crawlers. This is funnel stage S1 — the foundation of the
revenue funnel defined in the master plan. Stages S2–S6 depend on a site that is
indexed without error, so this SPEC must pass its gate before any S2 work begins.

This is an **audit-and-improve** SPEC, not greenfield. The repository already has
`sitemap.xml`, `robots.txt`, `llms.txt`, `llms-full.txt`, `knowledge-graph.jsonld`,
`opensearch.xml`, per-page meta tags, and partial JSON-LD. The work is to audit
this existing infrastructure against the actual page set, find and close the gaps,
and prove the result with the repository's own tooling.

Success is measured by the **quality of the discoverability outcome** — every
public page indexable, valid, and linked — not by activity volume.

## Scope Definition

### The public page set

Discoverability requirements apply to the **public page set**, defined as:

- All `.html` files at the repository root and in the directories `blog/`,
  `magazine/`, `learning/`, `p/`, `resources/`, `press/`, `book/`, `topics/`,
  `iden/`, `lectures/`, `workbook/`
- EXCLUDING any path disallowed in `robots.txt` (e.g. `/admin.html`, `/org.html`,
  `/resources/_console/`, `/resources/_data/`, `/resources/_build/`,
  `/resources/_templates/`, `/blog/iden/`)
- EXCLUDING archive and build directories: `_archive_magazine_old/`, `_archive_v2/`,
  `_build/`, `auto/`, `swarm/`, `vault/`, `design-lab/`, `node_modules/`

[HARD] The first implementation task is to **enumerate and freeze the public page
set** as a checked-in list (`.moai/specs/SPEC-DISCOVERY-001/public-pages.txt`).
Every subsequent requirement is measured against this frozen list, not against a
guessed page count.

## Constraints

- **Static site only.** GitHub Pages + Vercel. No server-side indexer, no
  server-rendered SEO logic, no paid external SEO/crawl services.
- **No new runtime dependencies.** Verification uses tooling already in
  `package.json` (`htmlhint`, `lychee`, `pa11y-ci`, `lhci`, `stylelint`).
- **Tooling glob extension is in scope.** The current `package.json` scripts
  (`lint:html`, `links`, `a11y`, `lighthouse`) are scoped to `p/*.html` only.
  This SPEC requires extending the glob/config of those scripts to cover the
  public page set, or adding parallel `:site` variants. No new tool is added.
- **Factual claims defer to the strategy SSoT.** Any authority fact, program
  name, price, or persona used in meta tags or JSON-LD MUST trace to
  `.moai/strategy/site-strategy.yaml`. Copy and structured data must not invent
  unverified facts.
- **No time estimates.** Priority labels only (Critical / High / Medium).

## EARS — Requirements

### REQ-DISC-001 — Public page set enumeration (Critical)
The system **shall** maintain a checked-in enumeration of the public page set at
`.moai/specs/SPEC-DISCOVERY-001/public-pages.txt`, produced by listing public
`.html` files and removing every `robots.txt`-disallowed and archive/build path.

### REQ-DISC-002 — Title and description completeness (Critical)
The system **shall** ensure every page in the public page set has a non-empty,
unique `<title>` and a non-empty `<meta name="description">` whose length is
between 50 and 160 characters.

### REQ-DISC-003 — Single canonical URL per page (Critical)
Every page in the public page set **shall** declare exactly one
`<link rel="canonical">` resolving to its absolute `https://www.nedabah.org/...`
URL, and **shall not** declare a canonical pointing to a different page's URL.

### REQ-DISC-004 — Indexability directives (Critical)
The system **shall** ensure no page in the public page set carries
`<meta name="robots" content="noindex">` or an `X-Robots-Tag: noindex`
equivalent. **If** a page must be excluded from indexing, **then** it shall be
removed from the public page set and added to `robots.txt` `Disallow` instead.

### REQ-DISC-005 — Heading hierarchy (High)
Every page in the public page set **shall** contain exactly one `<h1>` element
and **shall not** skip heading levels (no `<h3>` without a preceding `<h2>`).

### REQ-DISC-006 — Open Graph and Twitter Card completeness (High)
Every page in the public page set **shall** include `og:title`, `og:description`,
`og:url`, `og:type`, `og:image`, and `twitter:card`, where `og:url` matches the
canonical URL and `og:image` resolves to an existing, reachable image asset.

### REQ-DISC-007 — Organization structured data (Critical)
The site **shall** expose valid JSON-LD describing 네다바웨이 as an
`Organization` (or `EducationalOrganization`) on the home page, with `name`,
`url`, `logo`, `description`, and `sameAs` channel links sourced from
`site-strategy.yaml#identity`.

### REQ-DISC-008 — Program structured data (Critical)
Each of the five program pages under `/p/` **shall** carry valid JSON-LD of the
appropriate schema.org type (`Course` or `Service`) with `name`, `provider`,
`description`, `audience`, and `offers.price` in KRW, all sourced from
`site-strategy.yaml#revenue_lineup`. This requirement coordinates with
SPEC-LANDING-001 REQ-LD-007 and must not contradict it.

### REQ-DISC-009 — Article structured data (High)
Every blog and magazine article page **shall** carry valid JSON-LD of type
`Article` (or `BlogPosting`) with `headline`, `datePublished`, `author`, and
`mainEntityOfPage`.

### REQ-DISC-010 — Breadcrumb structured data (Medium)
Pages that sit below the site root in a navigable hierarchy (e.g. articles within
`blog/`, `magazine/`, `learning/`) **shall** carry valid JSON-LD of type
`BreadcrumbList` reflecting their navigation path.

### REQ-DISC-011 — JSON-LD validity (Critical)
The system **shall** ensure every JSON-LD block on every public page is
syntactically valid JSON and conforms to schema.org type definitions, with zero
parse errors and zero schema-required-property violations.

### REQ-DISC-012 — Sitemap synchronization (Critical)
`sitemap.xml` **shall** list every URL in the public page set and **shall not**
list any URL outside it. Every `<loc>` **shall** resolve to a reachable page
(HTTP 200), and every `<lastmod>` **shall** be a valid ISO-8601 date.

### REQ-DISC-013 — robots.txt correctness (Critical)
`robots.txt` **shall** be syntactically valid, **shall** reference the canonical
`sitemap.xml` location(s), **shall** allow crawling of the entire public page
set, and **shall** disallow every non-public path. The system **shall not**
disallow a path that is also listed in `sitemap.xml`.

### REQ-DISC-014 — AI-crawler directives (High)
`robots.txt` **shall** include explicit, current `User-agent` directives for the
major AI crawlers (at minimum `GPTBot`, `ClaudeBot`, `Google-Extended`,
`PerplexityBot`, `CCBot`), each consistent with the site's "AI crawlers welcomed"
policy and applying the same non-public `Disallow` set as the general agent.

### REQ-DISC-015 — llms.txt currency and accuracy (High)
`llms.txt` and `llms-full.txt` **shall** accurately describe the current site:
every URL they reference **shall** resolve (HTTP 200), and the program list,
brand identity, and key sections **shall** match `site-strategy.yaml`. They
**shall not** reference removed or renamed pages.

### REQ-DISC-016 — knowledge-graph.jsonld accuracy (Medium)
`knowledge-graph.jsonld` **shall** be valid JSON-LD whose entities (organization,
people, programs) are consistent with `site-strategy.yaml` and whose internal URL
references resolve to reachable pages.

### REQ-DISC-017 — Internal broken-link elimination (Critical)
The system **shall** contain zero broken internal links across the public page
set, where "broken" means a link target that returns a non-2xx/3xx status or a
fragment (`#anchor`) with no matching element.

### REQ-DISC-018 — External broken-link elimination (High)
The system **shall** contain zero broken external links across the public page
set. **If** an external target is permanently unreachable, **then** the link
shall be removed or replaced rather than left dead.

### REQ-DISC-019 — Valid HTML for crawl parsing (High)
Every page in the public page set **shall** pass `htmlhint` with zero errors, so
crawlers parse the markup without ambiguity.

### REQ-DISC-020 — Crawl-blocking accessibility issues (High)
Every page in the public page set **shall** use semantic landmark elements
(`<main>`, `<nav>`, `<header>`, `<footer>`) and **shall** provide `alt` text on
every non-decorative `<img>`, so that document structure and image content are
machine-readable. Verified via `pa11y-ci` with zero errors.

### REQ-DISC-021 — Crawler-facing performance (Medium)
Every audited page **shall** achieve a Lighthouse SEO category score of at least
90, measured by `lhci`.

### REQ-DISC-022 — Discoverability audit report (High)
The system **shall** produce a discoverability audit report at
`.moai/reports/discoverability-2026-05-19/report.md` recording, per requirement,
the pages audited, the issues found, the issues fixed, and the final pass/fail
state. This report is the artifact-evidence record required by the master plan's
scoring rubric.

### REQ-DISC-023 — Tooling glob coverage (High)
The verification scripts (`lint:html`, `links`, `a11y`, `lighthouse`) **shall**
be configured — by extending their globs/config or adding `:site` variants — to
cover the full public page set, not only `p/`. The default `npm run qa` pipeline
**shall** exercise the public page set.

## Acceptance Criteria

All criteria are verified against the frozen public page set in `public-pages.txt`.

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| AC-1 | Public page set is enumerated and frozen | `.moai/specs/SPEC-DISCOVERY-001/public-pages.txt` exists, is non-empty, and contains no `robots.txt`-disallowed or archive/build paths |
| AC-2 | Every public page has a unique title and a 50–160 char description | Audit script over `public-pages.txt`: zero pages with missing/empty/duplicate `<title>`, zero descriptions outside 50–160 chars |
| AC-3 | Every public page has exactly one correct canonical | Audit script: each page has exactly one `<link rel="canonical">` matching its own absolute URL |
| AC-4 | No public page is accidentally noindexed | Audit script: zero `noindex` directives in the public page set |
| AC-5 | Heading hierarchy is correct | `npm run lint:html` (htmlhint, `tag-pair`/`title-require` rules) over the public page set passes with zero errors; audit confirms one `<h1>` per page, no skipped levels |
| AC-6 | OG and Twitter Card tags complete and resolvable | Audit script: every page has the six OG/Twitter properties; every `og:image` resolves via `npm run links` |
| AC-7 | Organization, Course/Service, Article, Breadcrumb JSON-LD present where required | Audit script confirms required JSON-LD type per page category; counts match the public page set categories |
| AC-8 | All JSON-LD is valid | JSON-LD extraction + `JSON.parse` + schema.org required-property check reports zero errors across all public pages |
| AC-9 | sitemap.xml is fully synchronized | Diff of `<loc>` entries against `public-pages.txt` shows zero missing and zero extra URLs; every `<lastmod>` is valid ISO-8601 |
| AC-10 | sitemap URLs all resolve | `npm run links` (lychee) over `sitemap.xml` reports zero dead `<loc>` entries |
| AC-11 | robots.txt is valid and consistent | robots.txt parses without error, references `sitemap.xml`, allows the full public page set, disallows all non-public paths, and contradicts no sitemap entry |
| AC-12 | AI-crawler directives present | robots.txt contains `User-agent` blocks for `GPTBot`, `ClaudeBot`, `Google-Extended`, `PerplexityBot`, `CCBot` |
| AC-13 | llms.txt / llms-full.txt are current | `npm run links` over both files reports zero dead URLs; manual diff confirms program list and identity match `site-strategy.yaml` |
| AC-14 | knowledge-graph.jsonld is valid and consistent | `JSON.parse` succeeds; entity references resolve; entities match `site-strategy.yaml` |
| AC-15 | Zero broken links (internal and external) | `npm run links` (lychee, `--include-fragments`) over the public page set reports zero broken links |
| AC-16 | Valid HTML site-wide | `npm run lint:html` over the public page set passes with zero errors |
| AC-17 | No crawl-blocking accessibility issues | `npm run a11y` (pa11y-ci) over the public page set reports zero errors |
| AC-18 | Lighthouse SEO >= 90 | `npm run lighthouse` (lhci) reports SEO category score >= 90 on every audited page |
| AC-19 | Audit report produced | `.moai/reports/discoverability-2026-05-19/report.md` exists and records per-requirement findings and final state |
| AC-20 | Verification tooling covers the public page set | `lint:html`, `links`, `a11y`, `lighthouse` config/globs include the public page set; `npm run qa` exercises it |

## S1 → S2 Gate Condition

[HARD] Stage S2 (무료 가치) work **must not begin** until the `evaluator-active`
gate for S1 passes. The gate passes only when **all** of the following hold,
each backed by artifact evidence (a passing command output or a committed file):

1. **Coverage** — `sitemap.xml` lists 100% of the frozen public page set and
   nothing outside it (AC-9).
2. **Structured data** — every JSON-LD block on every public page validates with
   zero parse errors and zero schema-required-property violations (AC-8).
3. **Link integrity** — `npm run links` reports **zero** broken links, internal
   and external, across the public page set and `sitemap.xml` (AC-10, AC-15).
4. **Crawler entry points resolve** — `robots.txt`, `llms.txt`, and
   `llms-full.txt` are valid and contain zero dead URLs (AC-11, AC-13).
5. **Markup and accessibility** — `npm run lint:html` and `npm run a11y` both
   report **zero errors** across the public page set (AC-16, AC-17).
6. **Performance signal** — `npm run lighthouse` reports a Lighthouse SEO score
   of **>= 90** on every audited page (AC-18).
7. **Evidence** — the discoverability audit report
   (`.moai/reports/discoverability-2026-05-19/report.md`) exists and records the
   pass state with the command outputs above (AC-19).

If any condition fails, S1 is not complete and S2 does not start. This mirrors
the master plan Phase 1 gate ("sitemap covers 100% of public pages; all JSON-LD
validates; zero broken links; llms.txt resolves; Lighthouse SEO >= 90").

## Exclusions (What NOT to Build)

- ❌ New content creation — writing articles, FAQs, glossary entries (that is
  stage S2, SPEC scope of a later phase).
- ❌ Search functionality — owned by SPEC-SEARCH-001; this SPEC does not modify
  the search index or search UI.
- ❌ Landing page layout/copy — owned by SPEC-LANDING-001; this SPEC only audits
  and corrects the `<head>` metadata and JSON-LD of those pages, not their body.
- ❌ Social syndication, RSS/Atom feed generation, OG share-image *design* — that
  is stage S3 (무료 홍보 확산). This SPEC verifies that referenced `og:image`
  assets resolve, but does not design new ones.
- ❌ Multilingual / hreflang variant pages — stage S3. This SPEC audits the
  existing (Korean) page set only.
- ❌ PWA, service worker, notification cadence — stage S4 (노출 빈도).
- ❌ Forms, CTAs, conversion flows, checkout — stages S5/S6.
- ❌ Server-side rendering, headless CMS, or any non-static infrastructure.
- ❌ Paid SEO tools, rank-tracking subscriptions, or external crawl services.
- ❌ Redesigning archived content under `_archive_*/` — archived pages are
  excluded from the public page set and are not audited.

## Dependencies

- **Tooling**: `htmlhint`, `lychee`, `pa11y-ci`, `lhci`, `prettier` (already in
  `package.json` devDependencies).
- **Config files**: `.htmlhintrc`, `lychee.toml`, `.pa11yci.json`,
  `.lighthouserc.json` (already present; globs/config to be extended per
  REQ-DISC-023).
- **Strategy SSoT**: `.moai/strategy/site-strategy.yaml` — source of all
  identity, program, persona, price, and authority facts used in meta tags and
  JSON-LD.
- **Related SPECs**: SPEC-LANDING-001 (JSON-LD on `/p/` pages must stay
  consistent), SPEC-SEARCH-001 (search index is out of scope but its
  `/resources/sitemap.xml` is part of the crawler surface).

## Assumptions

1. The public page set is defined by directory membership minus `robots.txt`
   disallows and archive/build directories (per Scope Definition). The exact
   frozen list is produced by REQ-DISC-001; until then, page counts in this SPEC
   are not assumed — `sitemap.xml` currently lists 222 URLs while the repository
   contains far more `.html` files, most of them archived or internal.
2. The repository's existing verification scripts are intentionally scoped to
   `p/*.html` today; extending that scope (REQ-DISC-023) is treated as in-scope
   tooling work, not as adding a new tool.
3. JSON-LD validation can be performed offline (JSON parse + schema.org
   required-property checks) without a paid validator service, consistent with
   the static-site, no-paid-services constraint.
4. The "discoverability audit report" is classified as a report and therefore
   lives under `.moai/reports/` (per the SPEC-vs-report classification rule),
   not under `.moai/specs/`.
5. The S1→S2 gate thresholds (100% sitemap coverage, zero broken links,
   Lighthouse SEO >= 90) are taken verbatim from master plan Phase 1 and are
   treated as fixed inputs, not re-derived here.

## Lifecycle Note

This SPEC is **spec-anchored**: the site evolves (new articles, removed pages),
and the discoverability requirements remain a standing contract. Re-running the
verification pipeline after future content changes keeps S1 from regressing,
which protects every downstream funnel stage.
