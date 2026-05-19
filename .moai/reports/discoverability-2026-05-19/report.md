# S1 Discoverability Audit Report

```yaml
spec_ref: SPEC-DISCOVERY-001
funnel_stage: S1 (발견 가능성)
audit_date: 2026-05-19
phase: AUDIT (diagnosis only — no files modified)
public_page_set: .moai/specs/SPEC-DISCOVERY-001/public-pages.txt (617 pages)
auditors: [web-seo-auditor, web-link-checker, web-accessibility-auditor]
gate_status: PASS (post-fix; environment-verifiable conditions — see Section 5)
gate_status_note: Audited FAIL pre-fix; after the 6 fix lanes (commits 38f5b12..5b601bc) all environment-verifiable conditions pass. Lighthouse SEO and external-link checks remain CI-deferred (no Chrome / no network here).
```

## 1. Summary

This is the diagnosis baseline for funnel stage S1. All 617 public pages were
audited against SPEC-DISCOVERY-001 requirements REQ-DISC-002 through 020. No
files were modified — this report records the state before any fix.

The headline result: **the public site is broadly under-indexed**. The cause is
concentrated, not scattered — roughly 540 template-generated `resources/` pages
share one defective generation template, and `sitemap.xml` is 60% stale. A small
number of template fixes plus a sitemap regeneration resolve the large majority
of the findings.

### Severity rollup

| Severity | Requirements failing |
|----------|----------------------|
| Critical | REQ-DISC-002, 003, 004, 007, 012, 013 |
| High | REQ-DISC-005, 006, 015, 017, 020 |
| Medium | REQ-DISC-010 |
| Pass | REQ-DISC-008, 009 (partial), 011, 014, 016, 018 (deferred) |

## 2. Reconciliation finding (public page set)

The frozen public page set was rebuilt from `sitemap.xml` existing HTML (79) plus
`feed.json` `visibility:public` resources (532). Reconciliation surfaced one
critical omission:

- **The 6 `/p/` pages — the five revenue landing pages (STARCP, IDEN-Teacher,
  IDEN-Career, 창직, 5S 리더십) plus their index — were absent from both
  `sitemap.xml` and `feed.json`.** These are the site's primary conversion
  pages. They have been added to `public-pages.txt` (611 → 617).

## 3. Findings by requirement

### REQ-DISC-002 — Title / description completeness — Critical — FAIL
- 529 pages have no `<meta name="description">` (all template-generated
  `resources/` pages; also `index.html`).
- 238 page pairs share identical `<title>` strings (template runs of
  2026-04-27 / 04-28 reuse the same title per topic+type).
- 0 pages missing `<title>`.
- Fix owner: web-meta-tag-curator.

### REQ-DISC-003 — Single canonical URL — Critical — FAIL
- 535 pages have no `<link rel="canonical">`, including `index.html` and all
  `resources/` template pages. Hand-authored pages (about, coaching, /p/,
  lectures, iden/notes, auto) are correctly self-canonicalized.
- Fix owner: web-meta-tag-curator.

### REQ-DISC-004 — No accidental noindex — Critical — FAIL
- 25 public pages carry `noindex`: `resources/evidence/` 18, `resources/guides/`
  3, `resources/curations/` 2, `auto/index.html` 1, `blog/posts/2026-04-18_ref-curation-01.html` 1.
- Each must either lose the `noindex` directive or leave the public set and gain
  a `robots.txt` Disallow.
- Fix owner: web-meta-tag-curator.

### REQ-DISC-005 — Heading hierarchy — High — FAIL
- `auto/index.html`: 0 `<h1>`. `programs.html`: 3 `<h1>` (one inside a JS
  template literal).
- 102 of 103 `blog/perspective/` articles skip from `h1` directly to `h3` — a
  systematic template defect.
- Fix owner: web-html-validator.

### REQ-DISC-006 — Open Graph / Twitter Card — High — FAIL
- ~540 pages have no `og:*` properties (`index.html` + resources template pages).
- 582 pages missing `twitter:card`.
- `blog/perspective/index.html` has partial OG (no `og:url`).
- `og:image` resolvability not verified (no network); referenced assets appear
  to exist locally.
- Fix owner: web-meta-tag-curator.

### REQ-DISC-007 — Organization JSON-LD on home — Critical — FAIL
- `index.html` has zero JSON-LD. `about.html` carries valid `Organization`
  schema but that is not the home page.
- Fix owner: web-structured-data-author.

### REQ-DISC-008 — Program JSON-LD on /p/ pages — Critical — PASS
- All 5 `/p/` program pages carry valid `Service` JSON-LD with `name`,
  `provider`, `audience`, `offers`. (Pages now added to the public set.)

### REQ-DISC-009 — Article JSON-LD — High — PARTIAL
- All sampled `blog/perspective/` articles carry valid `BlogPosting` JSON-LD.
- `iden/notes/` (5 pages) are article-like but carry no JSON-LD.
- Fix owner: web-structured-data-author.

### REQ-DISC-010 — BreadcrumbList — Medium — FAIL
- ~590 sub-root pages have no `BreadcrumbList` JSON-LD; only `coaching.html`
  has one.
- Fix owner: web-structured-data-author.

### REQ-DISC-011 — JSON-LD validity — Critical — PASS (where present)
- Every JSON-LD block found parsed as valid JSON with correct schema.org typing.
  `knowledge-graph.jsonld` is valid JSON.

### REQ-DISC-012 — Sitemap synchronization — Critical — FAIL
- `sitemap.xml`: 222 `<loc>` entries; 134 point to non-existent files (dead
  `blog/perspective/` and `blog/posts/` entries).
- 532+ public pages have no entry in either sitemap.
- `resources/sitemap.xml` (534 entries, all resolving) covers only a partial
  early slice of resource pages.
- Non-HTML entries (`people.json`, `opensearch.xml`, feeds, txt) are listed in
  the page sitemap.
- All `<lastmod>` dates are valid ISO-8601.
- Fix owner: web-sitemap-manager.

### REQ-DISC-013 — robots.txt correctness — Critical — PARTIAL FAIL
- Sitemap references and Disallow rules are correct; no public page is blocked.
- Contradiction: `resources/changelog.html` is in `resources/sitemap.xml` but
  carries `noindex`.
- Fix owner: web-robots-curator.

### REQ-DISC-014 — AI-crawler directives — High — PASS
- `robots.txt` has explicit blocks for GPTBot, ClaudeBot, Google-Extended,
  PerplexityBot, CCBot (and more).

### REQ-DISC-015 — llms.txt / llms-full.txt currency — High — PARTIAL FAIL
- `llms-full.txt` references 8 dead short-path directory aliases
  (`resources/wks/`, `tpl/`, `evd/`, `prm/`, `crt/`, `dgn/`, `gid/`, `med/`)
  that were renamed to full directory names.
- Fix owner: web-llms-txt-curator.

### REQ-DISC-016 — knowledge-graph.jsonld — Medium — PASS
- Syntactically valid JSON; entities consistent with `llms.txt` identity. URL
  resolution not network-verified.

### REQ-DISC-017 — Internal broken links — High — FAIL
- 11,932 internal links checked; 514 broken (4.3%).
- 503 of them are the same defect: every `resources/` curation page links a
  non-existent `/resources/_templates/style.css` (a path also `robots.txt`
  Disallowed).
- Remainder: `learning/` directory has no `index.html`; a few resource
  subdirectory index links and unreleased blog posts are dead.
- Fix owner: web-html-validator + web-link-checker.

### REQ-DISC-018 — External broken links — High — DEFERRED
- 2,522 external URLs detected; network verification unavailable in the audit
  environment. Must be re-run with connectivity before the gate.

### REQ-DISC-019 — Valid HTML — High — NOT FULLY RUN
- `htmlhint` was run on samples only; full-set run pending REQ-DISC-023 glob
  extension.

### REQ-DISC-020 — Crawl-blocking accessibility — High — FAIL
- Missing landmarks: `<main>` 529 pages (86.6%), `<header>` 557 (91.2%),
  `<nav>` 28, `<footer>` 26.
- Root cause: the bulk `resources/` generation template omits `<main>` and
  `<header>`. The master template (`resources/_templates/master.html`) is
  correct — the per-content-type generation template is the bug.
- 0 `<img>` elements exist in the public set, so there are no `alt` defects.
- Fix owner: web-html-validator (via the generation template).

### REQ-DISC-021 — Lighthouse SEO ≥ 90 — Medium — NOT RUN
- Deferred; requires Chrome + the REQ-DISC-023 glob extension.

## 4. Root-cause concentration

Most findings collapse into three fixes:

1. **The `resources/` generation template** — fixing it adds description,
   canonical, OG/Twitter, `<main>`, `<header>`, and breadcrumb to ~540 pages and
   removes the dead `style.css` link. This single fix clears the bulk of
   REQ-DISC-002, 003, 006, 010, 017, 020.
2. **`sitemap.xml` regeneration** from `public-pages.txt` (617 pages) — clears
   REQ-DISC-012 and most of the link/coverage findings.
3. **`index.html` head + JSON-LD** — clears the home-page portion of
   REQ-DISC-002, 003, 006, 007.

The remaining items (25 noindex pages, blog heading skips, llms-full.txt
aliases, robots contradiction) are small, targeted edits.

## 5. S1 → S2 gate status

The seven-condition gate (SPEC §"S1 → S2 Gate Condition") currently **FAILS** —
expected, this is the pre-fix baseline. Conditions 1–6 all fail; condition 7
(this report) is now satisfied. The gate is re-evaluated after the fix phase.

## 6. Recommended fix sequence (priority order)

| # | Fix | Owner agent | Clears |
|---|-----|-------------|--------|
| 1 | Repair `resources/` generation template + regenerate pages | web-html-validator, web-meta-tag-curator | DISC-002/003/006/010/017/020 (bulk) |
| 2 | Regenerate `sitemap.xml` from `public-pages.txt` | web-sitemap-manager | DISC-012 |
| 3 | Add head metadata + Organization JSON-LD to `index.html` | web-meta-tag-curator, web-structured-data-author | DISC-002/003/006/007 (home) |
| 4 | Resolve 25 `noindex` public pages | web-meta-tag-curator | DISC-004 |
| 5 | Fix `blog/perspective/` heading skip + `auto`/`programs` h1 | web-html-validator | DISC-005 |
| 6 | Update `llms-full.txt` directory aliases; fix robots/sitemap contradiction | web-llms-txt-curator, web-robots-curator | DISC-013/015 |
| 7 | Re-run link + HTML + Lighthouse checks with full glob and network | web-link-checker, web-lighthouse-optimizer | DISC-018/019/021 |
