# SPEC-REACH-001 — S3 무료 홍보 확산 (Free Promotion / Reach)

```yaml
spec_id: SPEC-REACH-001
title: S3 Free Reach — feed syndication, social-share imagery, and realistic bilingual reach so free content travels at zero ad spend
version: 1.0.0
created: 2026-05-19
status: draft
owner: 김창환 (네다바웨이)
priority: High
funnel_stage: S3 (무료 홍보 확산, weight 0.15)
master_plan_ref: .moai/plans/funnel-100-master-plan.md (Phase 3)
strategy_ref: .moai/strategy/site-strategy.yaml
related_specs: [SPEC-DISCOVERY-001, SPEC-FREEVALUE-001, SPEC-LANDING-001, SPEC-SEARCH-001]
tags: [reach, syndication, rss, atom, json-feed, open-graph, social-share, hreflang, multilingual, funnel-s3]
```

## Goal

Make the free content of `nedabah.org` **travel beyond the site at zero ad spend**.
This is funnel stage S3 in the master plan. S1 (SPEC-DISCOVERY-001) made the site
correctly indexed; S2 (SPEC-FREEVALUE-001) made the free content route toward
conversion. S3 widens the *distance* that content travels through three
no-paid-spend mechanisms: feed syndication, correct social-share presentation, and
a realistic bilingual reach scope.

S3 does not introduce any paid promotion, ad network, or paid distribution
service. The reach gain comes entirely from free, owned mechanics: RSS/Atom/JSON
feeds a reader can subscribe to, Open Graph cards that render correctly when a
link is shared, and `hreflang` wiring for the pages that genuinely have an English
variant so non-Korean discovery is not silently broken.

This is an **audit-and-improve** SPEC, not greenfield. The repository already has
a `feeds/` hub page, three `blog/perspective/` feeds (`feed.xml` / `feed.atom` /
`feed.json`), additional feeds (`blog/feed.xml` English, `magazine/feed.xml`,
`iden/feed.xml`, `resources/feed.json`), an established `og:image` convention
(`/assets/og-*.svg` at 1200×630 with an `og-default.svg` fallback), and one
English page (`about.en.html`) already carrying `hreflang`. The work is to audit
this infrastructure, close the gaps the audit finds, and prove the result with the
repository's own tooling.

Success is measured by the **quality of the reach outcome** — feeds valid,
current, and auto-discoverable; share cards that render; bilingual wiring that is
honest about the actual English surface — not by activity volume or by inventing
content purely to register agent usage (master plan Section 1.2).

A representative audit finding that motivates this SPEC: `magazine/feed.xml` is a
valid RSS document but its `<channel>` contains **zero `<item>` entries**, and the
`blog/perspective/` article pages do **not** carry `<link rel="alternate">` feed
autodiscovery in their `<head>`. The reach layer exists but is partially inert —
S3 closes that.

## Scope Definition

### The reach surface

S3 requirements apply to the **reach surface**, defined as the subset of the
SPEC-DISCOVERY-001 frozen public page set
(`.moai/specs/SPEC-DISCOVERY-001/public-pages.txt`) that is **shareable** —
articles, magazine pages, resource pages, landing pages, and top-level section
pages — plus the **feed files** the site publishes:

- **Shareable pages**: every page in the SPEC-FREEVALUE-001 free-content corpus
  (`magazine/`, `blog/`, `blog/perspective/`, `resources/`, `learning/`,
  `lectures/`, `book/`), the five `/p/` landing pages, and the top-level section
  pages (`index.html`, `about.html`, `coaching.html`, `magazine.html`, etc.).
- **Feed files**: the RSS / Atom / JSON feeds the repository publishes —
  observed at authoring time as `blog/perspective/feed.xml`,
  `blog/perspective/feed.atom`, `blog/perspective/feed.json`, `blog/feed.xml`,
  `magazine/feed.xml`, `iden/feed.xml`, `resources/feed.json` — plus any feed
  this SPEC adds. The exact set is frozen by REQ-REACH-001.
- **Feed entry points**: `feeds/index.html` (the human-facing subscription hub).

EXCLUDING non-public paths disallowed in `robots.txt`, archive/build directories
(`_archive_*/`, `_build/`, `auto/`, etc.), and the internal data feeds under
`resources/_data/` — identical exclusions to SPEC-DISCOVERY-001.

[HARD] The first implementation task is to **enumerate and freeze the feed
inventory** as a checked-in list
(`.moai/specs/SPEC-REACH-001/feed-inventory.txt`), recording for each feed its
file path, public URL, format (RSS / Atom / JSON Feed), the content set it
syndicates, and whether it is current or stale. Every feed-scoped requirement is
measured against this frozen inventory, not against a guessed feed count.

## Constraints

- **Static site only.** GitHub Pages + Vercel. No server-side feed generator
  running at request time, no server-rendered share metadata, no headless CMS.
  Feeds are built by the repository's existing static build scripts and committed.
- **No paid promotion.** [HARD] S3 introduces **no ad spend, no paid distribution,
  no paid syndication service, no paid social-scheduling tool, and no paid
  analytics**. Every reach mechanism in this SPEC is free and owned.
- **No server-side logic.** No request-time rendering, no edge functions for
  share cards or feeds.
- **No new runtime dependencies.** Verification reuses tooling already in
  `package.json` (`htmlhint`, `lychee`, `pa11y-ci`, `lhci`, `stylelint`) and the
  existing static build scripts. Feed/JSON validity is checked offline (XML
  well-formedness, `JSON.parse`, JSON Feed 1.1 required-key checks) without a
  paid validator service.
- **Do not regress S1 or S2.** Any page edited under this SPEC MUST keep the
  discoverability metadata SPEC-DISCOVERY-001 requires and the conversion wiring
  SPEC-FREEVALUE-001 requires. Adding a feed autodiscovery `<link>` or an
  `og:image` tag must not break a passing S1/S2 check.
- **Factual claims defer to the strategy SSoT.** Any brand identity, channel URL,
  program name, or persona used in feed metadata, share-card text, or English
  variant pages MUST trace to `.moai/strategy/site-strategy.yaml`.
- **Bilingual scope is deliberately bounded.** S3 does **not** translate the whole
  site. It wires `hreflang` only for the pages that genuinely have, or should
  realistically have, an English variant, and freezes that set explicitly
  (REQ-REACH-010). Korean remains the primary language.
- **No time estimates.** Priority labels only (Critical / High / Medium).

## EARS — Requirements

### REQ-REACH-001 — Feed inventory enumeration (Critical)
The system **shall** maintain a checked-in enumeration of the feed inventory at
`.moai/specs/SPEC-REACH-001/feed-inventory.txt`, recording for every published
feed its file path, public URL, format (RSS / Atom / JSON Feed), the content set
it syndicates, and a current/stale flag. Every feed-scoped requirement is measured
against this frozen inventory.

### REQ-REACH-002 — Feed document validity (Critical)
Every feed in the inventory **shall** be a syntactically valid document of its
declared format: each RSS and Atom feed **shall** be well-formed XML conforming to
the RSS 2.0 / Atom 1.0 element rules, and each JSON feed **shall** be valid JSON
conforming to JSON Feed 1.1 required keys (`version`, `title`, `items`, and per
item `id`).

### REQ-REACH-003 — Feed item coverage (Critical)
Every feed in the inventory that syndicates an existing content set **shall**
contain at least one `<item>` / `<entry>` / `items[]` element, and **shall not**
be an empty-channel feed. **If** a feed's content set genuinely has no published
content, **then** the feed shall be removed from the inventory rather than
published empty.

### REQ-REACH-004 — Feed currency (High)
Each feed in the inventory **shall** be current with the content it syndicates:
its newest item **shall** correspond to the most recently published page in that
content set, and its build/update timestamp (`lastBuildDate` / `updated` /
`generated`) **shall** be a valid date consistent with that newest item.

### REQ-REACH-005 — Feed link integrity (Critical)
Every URL inside every feed in the inventory — channel `<link>`, item `<link>` /
`<id>` / `url`, and `atom:link rel="self"` — **shall** resolve to a reachable
target (HTTP 200 for pages; the self link **shall** match the feed's own public
URL).

### REQ-REACH-006 — Feed autodiscovery in page heads (Critical)
**Where** a reach-surface page belongs to a content set that has a published feed,
that page **shall** declare a `<link rel="alternate">` in its `<head>` with the
correct `type` (`application/rss+xml`, `application/atom+xml`, or
`application/feed+json`) and an `href` resolving to that feed, so feed readers and
crawlers can auto-discover the subscription.

### REQ-REACH-007 — Feed subscription hub correctness (High)
The feed subscription hub `feeds/index.html` **shall** list every feed in the
frozen inventory, label each with its format and the content it covers, and link
each to a reachable feed URL; it **shall not** advertise a feed that is absent
from the inventory or that fails REQ-REACH-002.

### REQ-REACH-008 — Open Graph image resolution on shareable pages (Critical)
Every page on the reach surface **shall** declare an `og:image` whose `href`
resolves to an existing, reachable image asset. **If** a page has no bespoke
share image, **then** it **shall** reference the site default share image
(`/assets/og-default.svg`) so no shareable page is left without a share image.

### REQ-REACH-009 — Share-card metadata correctness (High)
Every page on the reach surface **shall** carry a share-card metadata set that
produces a correct preview: `og:title`, `og:description`, `og:url` (matching the
page canonical), `og:type`, `og:image`, and `twitter:card` of type
`summary_large_image`, with `og:image` accompanied by `og:image:width`,
`og:image:height`, and `og:image:alt`. This requirement **verifies and does not
re-author** the metadata produced by SPEC-DISCOVERY-001 REQ-DISC-006; S3 confirms
it yields good share cards and adds only the missing share-specific properties
(default image fallback, `image:alt`, `twitter:card` sizing).

### REQ-REACH-010 — Bilingual reach scope freeze (Critical)
The system **shall** maintain a checked-in enumeration of the **English-variant
set** at `.moai/specs/SPEC-REACH-001/english-variants.txt`, listing exactly the
pages that have, or are committed to have, an English variant. The set **shall**
include `about.html` ↔ `about.en.html` and the English publication `blog/`
(Still Hands). It **shall not** commit to translating the full Korean site; pages
absent from this set are out of S3 bilingual scope.

### REQ-REACH-011 — hreflang reciprocity for bilingual pages (Critical)
**Where** a page is listed in the English-variant set, both the Korean page and
its English variant **shall** declare reciprocal `<link rel="alternate">`
elements with `hreflang="ko"`, `hreflang="en"`, and `hreflang="x-default"`, each
pointing to an absolute `https://www.nedabah.org/...` URL that resolves (HTTP
200). A page **shall not** declare an `hreflang` link to a non-existent variant.

### REQ-REACH-012 — No orphaned hreflang or one-directional wiring (High)
The system **shall not** leave `hreflang` wiring one-directional. **If** an
English variant declares `hreflang` back to a Korean page, **then** that Korean
page **shall** declare the reciprocal `hreflang` to the English variant. A page
**shall not** be in the English-variant set without both directions wired.

### REQ-REACH-013 — Feed entry points are discoverable (High)
The feed subscription hub `feeds/index.html` **shall** be reachable from the
global navigation or footer of the reach surface, and **shall** be present in
`sitemap.xml`, so a visitor on any page can find the subscription options.

### REQ-REACH-014 — Feeds excluded from indexable page metadata, included as alternates (Medium)
Feed files **shall not** be listed as crawlable HTML pages in `sitemap.xml`, and
**shall** be exposed only through `<link rel="alternate">` autodiscovery
(REQ-REACH-006) and the subscription hub (REQ-REACH-007). This keeps the feed
surface discoverable without polluting the HTML page index.

### REQ-REACH-015 — English-variant pages satisfy S1 discoverability (High)
Every English-variant page **shall** satisfy the SPEC-DISCOVERY-001 metadata
requirements (unique `<title>`, 50–160 char description, single correct canonical
to its own URL, complete OG/Twitter tags, valid JSON-LD, correct heading
hierarchy) and **shall** declare its own `og:locale` (`en_US`) so share cards and
crawlers identify the language correctly.

### REQ-REACH-016 — No S1/S2 regression (Critical)
Every page edited under this SPEC **shall** retain the discoverability metadata
required by SPEC-DISCOVERY-001 and the conversion wiring required by
SPEC-FREEVALUE-001. Adding feed autodiscovery, share-card properties, or
`hreflang` links **shall not** introduce a new `htmlhint`, link, or JSON-LD
error relative to the S1/S2 baseline.

### REQ-REACH-017 — Reach audit report (High)
The system **shall** produce a reach audit report at
`.moai/reports/reach-2026-05-19/report.md` recording, per requirement, the feeds
audited and their validity/currency/coverage state, the share-card findings, the
`hreflang` wiring state, and the final pass/fail state. This report is the
artifact-evidence record required by the master plan's scoring rubric.

## Acceptance Criteria

All criteria are verified against the frozen feed inventory in
`feed-inventory.txt` and the English-variant set in `english-variants.txt`.

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| AC-1 | Feed inventory is enumerated and frozen | `.moai/specs/SPEC-REACH-001/feed-inventory.txt` exists, is non-empty, and records path, URL, format, content set, and current/stale flag for every published feed |
| AC-2 | Every feed is a valid document | XML well-formedness check (RSS/Atom) and `JSON.parse` + JSON Feed 1.1 required-key check (JSON) report zero errors across all feeds in the inventory |
| AC-3 | No feed is an empty-channel feed | Each inventory feed has at least one `<item>`/`<entry>`/`items[]` element; any genuinely empty feed has been removed from the inventory rather than left published |
| AC-4 | Every feed is current | For each feed, the newest item matches the most recently published page in its content set and the build/update timestamp is a valid, consistent date |
| AC-5 | All feed-internal URLs resolve | `npm run links` (lychee) over every feed file reports zero dead URLs; each `atom:link rel="self"` matches the feed's own public URL |
| AC-6 | Feed autodiscovery present on content pages | Audit script over the reach surface: every page in a content set with a published feed declares a `<link rel="alternate">` with the correct `type` and a resolving `href` |
| AC-7 | Subscription hub is correct and complete | `feeds/index.html` lists every inventory feed with format + content label and links each to a URL that resolves; advertises no feed absent from the inventory |
| AC-8 | Every shareable page resolves an og:image | Audit script over the reach surface: every page declares an `og:image`; every `og:image` resolves via `npm run links`; pages with no bespoke image reference `/assets/og-default.svg` |
| AC-9 | Share-card metadata is complete and correct | Audit script: every reach-surface page has `og:title`, `og:description`, `og:url` (= canonical), `og:type`, `og:image`, `og:image:width/height/alt`, and `twitter:card=summary_large_image` |
| AC-10 | Bilingual scope is frozen | `.moai/specs/SPEC-REACH-001/english-variants.txt` exists and lists exactly the pages with a committed English variant, including `about.html`↔`about.en.html` and `blog/` |
| AC-11 | hreflang reciprocity holds | Audit script over `english-variants.txt`: every listed page and its variant declare reciprocal `hreflang` ko/en/x-default links, each resolving (HTTP 200); zero hreflang links to non-existent variants |
| AC-12 | No one-directional hreflang | Audit confirms every `hreflang` declared on an English variant has a matching reciprocal link on its Korean page and vice versa; zero orphaned hreflang links |
| AC-13 | Feed entry points are discoverable | `feeds/index.html` is linked from the global nav/footer of a sampled page per content set and is present in `sitemap.xml` |
| AC-14 | Feeds are alternates, not HTML index entries | `sitemap.xml` contains zero feed-file `<loc>` entries; feeds appear only via `<link rel="alternate">` and the subscription hub |
| AC-15 | English-variant pages pass S1 discoverability | `npm run lint:html`, the JSON-LD validity check, and a metadata audit over `english-variants.txt` report zero errors; each English page declares `og:locale=en_US` |
| AC-16 | No S1/S2 regression | `npm run lint:html`, `npm run links`, and the JSON-LD validity check over all pages edited under this SPEC report zero new errors vs the SPEC-DISCOVERY-001 / SPEC-FREEVALUE-001 baseline |
| AC-17 | Reach audit report produced | `.moai/reports/reach-2026-05-19/report.md` exists and records per-requirement findings and final state |

## S3 → S4 Gate Condition

[HARD] Stage S4 (노출 빈도) work **must not begin** until the `evaluator-active`
gate for S3 passes. The gate passes only when **all** of the following hold, each
backed by artifact evidence (a passing command output or a committed file):

1. **Feed validity** — every feed in the frozen `feed-inventory.txt` is a valid
   document of its declared format with zero parse errors, and no inventory feed
   is an empty-channel feed (AC-2, AC-3).
2. **Feed currency and integrity** — every feed is current with its content set,
   and `npm run links` reports **zero** dead URLs across every feed file (AC-4,
   AC-5).
3. **Autodiscovery** — every reach-surface page in a content set with a published
   feed declares a correct, resolving `<link rel="alternate">` feed
   autodiscovery `<head>` element (AC-6).
4. **Share cards** — **100%** of the reach surface resolves an `og:image`
   (bespoke or the `og-default.svg` fallback) and carries the complete,
   correct share-card metadata set including `twitter:card=summary_large_image`
   and `og:image:alt` (AC-8, AC-9).
5. **Bilingual wiring** — the English-variant set is frozen in
   `english-variants.txt`, and every listed page has reciprocal, resolving
   `hreflang` ko/en/x-default links with zero one-directional or orphaned
   hreflang (AC-10, AC-11, AC-12).
6. **Discoverable entry points** — `feeds/index.html` is linked from the
   navigation/footer and present in `sitemap.xml`, while feed files themselves
   are not listed as HTML index entries (AC-13, AC-14).
7. **No regression** — `npm run lint:html`, `npm run links`, and the JSON-LD
   validity check report **zero new errors** for every page edited under this
   SPEC relative to the S1/S2 baseline (AC-16).
8. **Evidence** — the reach audit report
   (`.moai/reports/reach-2026-05-19/report.md`) exists and records the pass state
   with the findings above (AC-17).

If any condition fails, S3 is not complete and S4 does not start. This mirrors the
master plan Phase 3 gate ("feeds validate; OG cards render correctly on social
preview; ko/en variants resolve with correct hreflang; analytics events fire") —
with the analytics-event clause deferred to S4 (노출 빈도), since measurement
cadence belongs to the exposure-frequency stage, while S3 owns the feed/share/
bilingual reach mechanics themselves.

## Exclusions (What NOT to Build)

- ❌ S1 discoverability work — sitemaps, robots.txt, AI-crawler directives,
  per-page SEO metadata *authoring*, JSON-LD *authoring*. Owned by
  SPEC-DISCOVERY-001. This SPEC only *verifies* that share metadata produces good
  cards and *adds* the share-specific properties (default-image fallback,
  `og:image:alt`, `twitter:card` sizing); it does not re-author the base meta.
- ❌ S2 free-value work — the free-value hub, FAQ, glossary, conversion-CTA wiring
  on free content. Owned by SPEC-FREEVALUE-001. S3 does not change CTAs or
  routing; it only preserves them.
- ❌ Search functionality — the resource search index and search UI are owned by
  SPEC-SEARCH-001. S3 does not modify the search index or the
  `resources/feed.json` *generation logic*; it only audits the published feed for
  validity, currency, and link integrity.
- ❌ Landing-page layout, copy, or the 12-section template — owned by
  SPEC-LANDING-001. S3 only audits the `<head>` share metadata of the `/p/` pages.
- ❌ Re-visit, subscription cadence, PWA, service worker, push notifications,
  newsletter *send cadence* — stage S4 (노출 빈도). S3 makes feeds subscribable
  and discoverable; it does not design the re-engagement cadence or wire a send
  workflow.
- ❌ Analytics event instrumentation and reach measurement dashboards — the
  measurement of *how far content actually spread* belongs to S4 exposure
  tracking. S3 builds the reach mechanics; it does not instrument their measurement.
- ❌ Forms, CTAs as conversion surface, booking, checkout, pricing — stages S5/S6.
- ❌ Full-site translation. S3 wires `hreflang` only for the frozen
  English-variant set (`about.html`↔`about.en.html`, `blog/`). It does not
  translate magazine articles, `blog/perspective/` notes, landing pages, or
  resources into English, and does not commit the site to becoming bilingual.
- ❌ Designing a large set of new bespoke OG images. S3 ensures every shareable
  page *resolves* an `og:image` — bespoke where one already exists, the
  `og-default.svg` fallback otherwise. Producing a bespoke share image per
  article is explicitly out of scope and is not required to pass the gate.
- ❌ Paid promotion, ad spend, paid syndication, paid social-scheduling tools, or
  paid analytics services.
- ❌ Server-side feed generation, edge functions, headless CMS, or any non-static
  infrastructure.
- ❌ Auditing or syndicating archived content under `_archive_*/` or internal data
  feeds under `resources/_data/` — both are excluded from the reach surface.

## Dependencies

- **Predecessor (hard)**: SPEC-DISCOVERY-001 — its S1→S2 gate must have passed;
  `.moai/specs/SPEC-DISCOVERY-001/public-pages.txt` is the source the reach
  surface is derived from, and REQ-DISC-006 (OG/Twitter completeness) is the base
  this SPEC verifies and extends.
- **Predecessor (hard)**: SPEC-FREEVALUE-001 — its S2→S3 gate must have passed;
  `.moai/specs/SPEC-FREEVALUE-001/free-content-corpus.txt` defines the shareable
  content pages within the reach surface.
- **Strategy SSoT**: `.moai/strategy/site-strategy.yaml` — source of brand
  identity, channel URLs (`identity.channels`), program names, and personas used
  in feed metadata, share-card text, and English-variant pages.
- **Related SPECs**: SPEC-SEARCH-001 (`resources/feed.json` is one inventory feed;
  S3 audits it but does not modify its builder), SPEC-LANDING-001 (the five `/p/`
  pages are part of the reach surface for share-card verification).
- **Tooling**: `htmlhint`, `lychee`, `pa11y-ci`, `lhci` (already in
  `package.json` devDependencies); `lychee.toml` config for link checking,
  extended per SPEC-DISCOVERY-001 REQ-DISC-023 to cover the reach surface and feed
  files.
- **Existing infrastructure**: `feeds/index.html` (subscription hub),
  `blog/perspective/feed.{xml,atom,json}`, `blog/feed.xml`, `magazine/feed.xml`,
  `iden/feed.xml`, `resources/feed.json`, `assets/og-*.svg` (including
  `og-default.svg`), `about.en.html`, the global navigation component, and the
  static feed-build scripts.

## Assumptions

1. The reach surface is a subset of the SPEC-DISCOVERY-001 frozen public page set;
   SPEC-DISCOVERY-001 and SPEC-FREEVALUE-001 are treated as already passed (master
   plan build-order rule). The exact feed inventory and English-variant set are
   produced by REQ-REACH-001 and REQ-REACH-010 — feed paths named in this SPEC
   (`blog/perspective/feed.{xml,atom,json}`, `blog/feed.xml`, `magazine/feed.xml`,
   `iden/feed.xml`, `resources/feed.json`) are observed at authoring time and are
   not the contract; `feed-inventory.txt` is.
2. An empty-channel feed (observed: `magazine/feed.xml` has zero `<item>`
   entries) is treated as a defect. REQ-REACH-003 resolves it either by
   populating the feed from the existing `magazine/` content set or by removing
   the feed from the inventory and its autodiscovery links — the implementation
   decides based on whether `magazine/` content genuinely warrants a feed.
3. Feed and JSON validity can be verified offline (XML well-formedness, RSS/Atom
   element rules, `JSON.parse`, JSON Feed 1.1 required-key checks) without a paid
   validator, consistent with the no-paid-services constraint.
4. Share-card rendering correctness is verified structurally — every required
   `og:`/`twitter:` property present, `og:image` resolving, `og:url` matching the
   canonical — rather than by a paid social-preview service. The
   `summary_large_image` card type plus a resolving 1200×630 image is the
   structural definition of a "correctly rendering" card.
5. The English-variant set is small and deliberately bounded:
   `about.html`↔`about.en.html` and the `blog/` (Still Hands) English publication
   are the realistic English surface. The Korean `blog/perspective/` notes,
   `magazine/`, `/p/` landing pages, and resources are Korean-only and are not
   given English variants by this SPEC.
6. The "reach audit report" is classified as a report and lives under
   `.moai/reports/` (per the SPEC-vs-report classification rule), not under
   `.moai/specs/`.
7. The S3→S4 gate thresholds (all feeds valid and current, 100% share-card
   resolution, reciprocal hreflang for the frozen variant set) are derived from
   master plan Phase 3 and are treated as fixed inputs, not re-derived here. The
   master plan Phase 3 "analytics events fire" clause is deferred to S4 because
   measuring how far content spreads is an exposure-frequency concern.

## Lifecycle Note

This SPEC is **spec-anchored**: the site keeps publishing new content, so feeds
drift stale and new shareable pages are added. The S3 contract — feeds valid and
current, every shareable page resolving an `og:image`, bilingual wiring reciprocal
and honest — remains a standing requirement. Re-running the reach audit after
future content additions keeps S3 from regressing into stale feeds and broken
share cards, which would silently shrink the site's free reach and undercut the
revenue-funnel continuity in the master plan rubric.
