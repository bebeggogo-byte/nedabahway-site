# SPEC-REVISIT-001 — S4 노출 빈도 (Exposure Frequency / Re-visit)

```yaml
spec_id: SPEC-REVISIT-001
title: S4 Re-visit — installable PWA with offline support, a coherent subscription path, and privacy-respecting analytics so one discovery becomes repeated exposure
version: 1.0.0
created: 2026-05-19
status: draft
owner: 김창환 (네다바웨이)
priority: High
funnel_stage: S4 (노출 빈도, weight 0.15)
master_plan_ref: .moai/plans/funnel-100-master-plan.md (Phase 4)
strategy_ref: .moai/strategy/site-strategy.yaml
related_specs: [SPEC-DISCOVERY-001, SPEC-FREEVALUE-001, SPEC-REACH-001, SPEC-LANDING-001, SPEC-SEARCH-001]
tags: [re-visit, exposure-frequency, pwa, manifest, service-worker, offline, newsletter, subscription, analytics, cookieless, funnel-s4]
```

## Goal

Make `nedabah.org` a site a visitor has a **reason and a channel to return to** —
so a single discovery (S1) becomes repeated exposure rather than a one-time visit.
This is funnel stage S4 in the master plan.

S1 (SPEC-DISCOVERY-001) made the site correctly indexed; S2 (SPEC-FREEVALUE-001)
made the free content deliver real value and route onward; S3 (SPEC-REACH-001)
made that content travel beyond the site. All three optimize a *first* arrival.
S4 closes the loop: it gives the visitor a low-friction way to **come back**,
through three free, no-extra-cost re-visit mechanisms:

1. **Installability and offline** — a valid PWA manifest and a service worker so a
   visitor can install the site to a home screen and reach it offline, turning a
   browser tab into a persistent re-entry point.
2. **Subscription cadence** — a coherent, reachable subscription path
   (`newsletter.html` plus the S3 feeds) so a visitor can opt into a recurring
   channel; the subscription's value proposition is explicit and connects back to
   the S2 free value and the S3 feeds.
3. **Privacy-respecting analytics** — a cookieless, no-extra-cost analytics setup
   so page views *and* the funnel's key events can actually be measured, without
   adding a paid service or violating visitor privacy.

This is an **audit-and-improve** SPEC, not greenfield. The repository already has
`manifest.webmanifest`, `capacitor.config.json`, `newsletter.html`,
`subscribed-thanks.html`, the S3 feed hub `feeds/index.html`, and a cookieless
analytics snippet `assets/analytics.js` (GoatCounter). The work is to audit each
of these, close the gaps the audit finds, and prove the result with the
repository's own tooling. Representative audit findings that motivate this SPEC:

- The root `manifest.webmanifest` is referenced by `<link rel="manifest">` on only
  a fraction of top-level pages and **not on `index.html`**; its `icons` array
  contains a single SVG and **no maskable raster PNG** at 192/512.
- There is **no site-wide service worker**: `vault/sw.js` and `radio/sw.js` exist
  but are scoped to those subapps; the main site has no offline support and no
  SW registration.
- `assets/analytics.js` is wired into `auto/tools/` pages but **not site-wide**,
  and it instruments **page views only** — none of the funnel's key events
  (CTA click, consult-path reach, subscribe) are measured.
- `newsletter.html` describes three subscription channels but **no form on the
  site posts to `subscribed-thanks.html`** — the thank-you page is an orphan.

Success is measured by the **quality of the re-visit outcome** — the PWA is
genuinely installable and offline-capable, the subscription path is coherent and
reachable, and the funnel's events are measured — not by activity volume or by
inventing artifacts purely to register agent usage (master plan Section 1.2).

The S3 SPEC explicitly deferred the master plan's Phase 3 "analytics events fire"
clause to S4, since measurement cadence belongs to the exposure-frequency stage.
Analytics is therefore **in scope for S4** (REQ-RV-009..REQ-RV-013).

## Scope Definition

### The re-visit surface

S4 requirements apply to the **re-visit surface**, defined as:

- **The PWA shell**: `manifest.webmanifest`, the site-wide service worker added by
  this SPEC, the PWA icon assets, and the `<head>` registration/declaration that
  wires them into pages.
- **The subscription path**: `newsletter.html` (the subscription page),
  `subscribed-thanks.html` (the post-subscribe confirmation), the S3 feed hub
  `feeds/index.html`, and the navigation/footer entries that lead to them.
- **The analytics surface**: `assets/analytics.js` (the cookieless analytics
  snippet) and the public HTML pages on which it and the funnel-event
  instrumentation run.

The set of public HTML pages is the SPEC-DISCOVERY-001 frozen public page set
(`.moai/specs/SPEC-DISCOVERY-001/public-pages.txt`), EXCLUDING non-public paths
disallowed in `robots.txt`, archive/build directories (`_archive_*/`, `_build/`,
`auto/`, etc.), and the scoped subapps `vault/` and `radio/` (which have their own
independent manifests and service workers and are out of S4 scope).

[HARD] The first implementation task is to **enumerate and freeze the re-visit
surface** as a checked-in inventory
(`.moai/specs/SPEC-REVISIT-001/revisit-surface.txt`), recording: (a) the PWA shell
files and which pages must carry the manifest/SW registration, (b) the
subscription-path files, and (c) the page set on which analytics and event
instrumentation must be present. Every surface-scoped requirement is measured
against this frozen inventory, not against a guessed page count.

## Constraints

- **Static site only.** GitHub Pages + Vercel. The service worker, manifest, and
  analytics are all client-side and statically served; there is no server-side
  push service, no server-rendered subscription handling, and no headless CMS.
- **No paid services.** [HARD] S4 introduces **no paid analytics, no paid email
  service provider, no paid push-notification service, no paid PWA tooling**.
  Analytics MUST be free, cookieless, and either self-hosted-free or a free
  no-account-cost tier (the existing GoatCounter snippet satisfies this). The
  subscription cadence uses the free owned channels already in the strategy SSoT
  (LinkedIn newsletter, RSS/Atom feeds, Naver blog) — S4 does not provision a paid
  ESP.
- **No server-side logic.** No request-time rendering, no edge functions, no
  server-side form processing. A subscription "form" that requires a server
  endpoint is out of scope; the subscription path routes the visitor to the free
  owned channels and to the existing static `subscribed-thanks.html`
  confirmation.
- **Cookieless, privacy-respecting analytics.** [HARD] Analytics MUST set **no
  cookies**, store **no personal identifiers**, perform **no fingerprinting**, and
  MUST honor the Do-Not-Track signal and the existing `localStorage`
  `mz_no_count` opt-out. Tool inputs, tool results, and form contents MUST NOT be
  sent to the analytics endpoint — only page URL, referrer, and coarse
  page/event metadata. This MUST remain consistent with `privacy.html`.
- **No new runtime dependencies.** Verification reuses tooling already in
  `package.json` (`htmlhint`, `lychee`, `pa11y-ci`, `lhci`, `stylelint`). PWA
  validity is checked with the existing Lighthouse config (`lhci`); manifest and
  service-worker correctness are checked offline (`JSON.parse` of the manifest,
  static inspection of the SW).
- **Do not regress S1, S2, or S3.** Any page edited under this SPEC MUST keep the
  SPEC-DISCOVERY-001 discoverability metadata, the SPEC-FREEVALUE-001 conversion
  wiring, and the SPEC-REACH-001 feed-autodiscovery / share-card / hreflang
  wiring. Adding a `<link rel="manifest">`, a service-worker registration, or an
  analytics tag MUST NOT break a passing S1/S2/S3 check.
- **Factual claims defer to the strategy SSoT.** Any brand identity, channel URL,
  program name, or persona used in the manifest, the subscription page, or
  analytics labels MUST trace to `.moai/strategy/site-strategy.yaml`.
- **No time estimates.** Priority labels only (Critical / High / Medium).

## EARS — Requirements

### REQ-RV-001 — Re-visit surface enumeration (Critical)
The system **shall** maintain a checked-in enumeration of the re-visit surface at
`.moai/specs/SPEC-REVISIT-001/revisit-surface.txt`, recording the PWA shell files,
the pages required to carry the manifest/service-worker registration, the
subscription-path files, and the page set on which analytics and funnel-event
instrumentation must run. Every surface-scoped requirement is measured against
this frozen inventory.

### REQ-RV-002 — Valid web app manifest (Critical)
The site **shall** publish a `manifest.webmanifest` that is valid JSON and
declares, at minimum, `name`, `short_name`, `description`, `start_url`, `scope`,
`display` (a value of `standalone` or `minimal-ui`), `background_color`,
`theme_color`, `lang`, and an `icons` array; every declared value **shall** trace
to `.moai/strategy/site-strategy.yaml` where it expresses brand identity.

### REQ-RV-003 — Maskable PWA icon set (Critical)
The manifest `icons` array **shall** include at least one maskable raster icon at
192×192 and one at 512×512 (PNG), each referencing an existing, reachable image
asset, so the installed app presents a correct home-screen icon. **If** only a
vector icon is currently declared, **then** the required raster sizes shall be
added rather than left absent.

### REQ-RV-004 — Manifest linked across the re-visit surface (Critical)
Every public HTML page in the re-visit surface **shall** declare a
`<link rel="manifest" href="/manifest.webmanifest">` in its `<head>`, and
`index.html` **shall not** be an exception; a page **shall not** be missing the
manifest link while peer pages carry it.

### REQ-RV-005 — Site-wide service worker with offline support (Critical)
The site **shall** publish a single site-wide service worker (for example
`/sw.js`) scoped to `/` that, on `install`, pre-caches a defined offline shell
(at minimum the start URL, the shared CSS bundle, the manifest, and an offline
fallback page) and, on `fetch`, serves cached responses when the network is
unavailable so a previously visited page is reachable offline.

### REQ-RV-006 — Sensible, documented cache strategy (Critical)
The service worker **shall** apply a deliberate cache strategy that does not serve
indefinitely stale content: navigation/document requests **shall** use a
network-first (or stale-while-revalidate) strategy so fresh content is preferred
when online, static hashed assets **may** use cache-first, and the service worker
**shall** carry a versioned cache name and an `activate` handler that deletes
caches from prior versions. The chosen strategy **shall** be documented in a
comment at the top of the service-worker file.

### REQ-RV-007 — Service worker registered across the re-visit surface (Critical)
Every public HTML page in the re-visit surface **shall** register the site-wide
service worker (a `navigator.serviceWorker.register('/sw.js')` call, guarded by a
`'serviceWorker' in navigator` feature check), so the offline shell and re-visit
caching activate on any entry page; registration **shall not** be present on some
pages and absent on peers.

### REQ-RV-008 — Offline fallback page (High)
The system **shall** provide a static offline fallback page that the service
worker serves for a navigation request that misses the cache while the network is
unavailable; the fallback page **shall** identify the site and offer a path back
once connectivity returns, and **shall** itself satisfy the SPEC-DISCOVERY-001
metadata baseline.

### REQ-RV-009 — Cookieless analytics on the re-visit surface (Critical)
Every public HTML page in the re-visit surface **shall** load the cookieless
analytics snippet (`assets/analytics.js`), so page views — the base re-visit
signal — are measured site-wide rather than on a partial page set.

### REQ-RV-010 — Analytics privacy guarantees (Critical)
The analytics integration **shall** set no cookies, store no personal identifier,
perform no fingerprinting, honor the Do-Not-Track header, and honor the
`localStorage` `mz_no_count` opt-out. **If** the analytics snippet would transmit
tool inputs, tool results, form field contents, or any personal data, **then**
that transmission shall be removed; only page URL, referrer, and coarse
page/event metadata may be sent. This behavior **shall** remain consistent with
the disclosure in `privacy.html`.

### REQ-RV-011 — Key funnel events defined and instrumented (Critical)
The system **shall** define and instrument the funnel's key measurable events,
at minimum: **page view** (every re-visit-surface page), **CTA click** (a
click on a primary call-to-action toward a `/p/` program page or the free
consultation), **consult-path reach** (arrival at the free-consultation contact
path), and **subscribe** (a subscription action on the subscription path). Each
event **shall** be sent to the cookieless analytics endpoint as a named,
non-identifying event consistent with REQ-RV-010.

### REQ-RV-012 — Event instrumentation does not break the page (High)
**If** the analytics endpoint or snippet is unavailable, blocked, or fails to
load, **then** the instrumented page **shall** continue to function normally —
event wiring **shall** be feature-guarded and **shall not** throw, block
rendering, or prevent a CTA, link, or subscription action from completing.

### REQ-RV-013 — Funnel events documented (High)
The system **shall** maintain a checked-in event reference at
`.moai/specs/SPEC-REVISIT-001/events.md` listing each instrumented event, its
trigger condition, the page(s) it fires on, and the non-identifying payload it
sends, so the measurement contract is explicit and auditable.

### REQ-RV-014 — Coherent, reachable subscription path (Critical)
The subscription page (`newsletter.html`) **shall** present a coherent
subscription path: it **shall** state the subscription value proposition
explicitly (what the visitor receives, how often, that it is free, that it is
cancellable), **shall** present the available free owned channels (the LinkedIn
newsletter, the RSS/Atom/JSON feeds via `feeds/index.html`, the Naver blog), and
**shall** route a completed subscription action to the existing static
`subscribed-thanks.html` confirmation so that confirmation page is no longer an
orphan.

### REQ-RV-015 — Subscription path reachable from global navigation (Critical)
The global navigation or footer used across the re-visit surface **shall** include
an entry leading to the subscription path (the subscription page or the feed hub),
so a visitor on any page can find a way to subscribe in one click; the
subscription page and the feed hub **shall** be present in `sitemap.xml`.

### REQ-RV-016 — Subscription value connects to S2 and S3 (High)
The subscription page **shall** connect the subscription offer to the S2
free-value layer and the S3 feeds: it **shall** describe the recurring content in
terms of the existing free assets (관점 노트, 학습 노트, magazine articles, the
자료실) and **shall** link to the S3 feed hub `feeds/index.html` as the
subscription's machine-readable channel, so the subscription is presented as a
continuation of the free value already delivered.

### REQ-RV-017 — Subscription confirmation page integrity (High)
The `subscribed-thanks.html` confirmation page **shall** be reachable as the
endpoint of the subscription action (REQ-RV-014), **shall** confirm what the
visitor has subscribed to consistently with `newsletter.html`, and **shall** offer
a next step back into the free-value layer; it **shall** retain its
`noindex, follow` robots directive (a confirmation page is not an indexable
destination) while remaining link-reachable.

### REQ-RV-018 — Re-visit entry points do not regress S1/S2/S3 (Critical)
Every page edited under this SPEC **shall** retain the SPEC-DISCOVERY-001
discoverability metadata, the SPEC-FREEVALUE-001 conversion wiring, and the
SPEC-REACH-001 feed-autodiscovery, share-card, and hreflang wiring. Adding the
manifest link, the service-worker registration, the analytics snippet, or event
instrumentation **shall not** introduce a new `htmlhint`, link, JSON-LD, or
accessibility error relative to the S1/S2/S3 baseline.

### REQ-RV-019 — PWA passes the Lighthouse installability audit (High)
The site **shall** pass the Lighthouse PWA installability checks: the manifest is
served and valid, the required-size maskable icons resolve, a service worker is
registered and controls the start URL, and the start URL responds when offline.
Verification uses the existing `lhci` configuration; no paid PWA validator is
introduced.

### REQ-RV-020 — Re-visit audit report (High)
The system **shall** produce a re-visit audit report at
`.moai/reports/revisit-2026-05-19/report.md` recording, per requirement, the PWA
shell state (manifest validity, icon set, SW registration coverage, offline
behavior), the analytics coverage and the events instrumented, the subscription
path state, and the final pass/fail state. This report is the artifact-evidence
record required by the master plan's scoring rubric.

## Acceptance Criteria

All criteria are verified against the frozen re-visit surface in
`revisit-surface.txt`.

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| AC-1 | Re-visit surface is enumerated and frozen | `.moai/specs/SPEC-REVISIT-001/revisit-surface.txt` exists, is non-empty, and records the PWA shell files, manifest/SW registration page set, subscription-path files, and analytics page set |
| AC-2 | Web app manifest is valid | `JSON.parse` of `manifest.webmanifest` succeeds; the parsed object contains `name`, `short_name`, `description`, `start_url`, `scope`, `display` (`standalone` or `minimal-ui`), `background_color`, `theme_color`, `lang`, and a non-empty `icons` array |
| AC-3 | Maskable raster icon set present | The `icons` array includes a 192×192 and a 512×512 PNG entry with `purpose` including `maskable`; each `src` resolves via `npm run links` |
| AC-4 | Manifest linked across the surface | Audit script over the re-visit surface page set: every page declares `<link rel="manifest" href="/manifest.webmanifest">`, including `index.html`; zero pages missing it |
| AC-5 | Site-wide service worker exists with offline shell | `/sw.js` exists, is scoped to `/`, pre-caches the start URL + CSS bundle + manifest + offline fallback page on `install`, and serves cache on `fetch` when offline |
| AC-6 | Cache strategy is deliberate and versioned | Static inspection of `/sw.js`: navigation requests use network-first or stale-while-revalidate, the cache name is versioned, an `activate` handler deletes prior-version caches, and the strategy is documented in a top-of-file comment |
| AC-7 | Service worker registered across the surface | Audit script: every re-visit-surface page registers `/sw.js` via a feature-guarded `navigator.serviceWorker.register` call; zero pages missing registration |
| AC-8 | Offline fallback page exists and is valid | The offline fallback page exists, is the SW navigation-miss fallback, identifies the site, offers a path back, and passes `npm run lint:html` |
| AC-9 | Analytics loads site-wide | Audit script: every re-visit-surface page loads `assets/analytics.js`; zero pages missing it |
| AC-10 | Analytics is cookieless and privacy-respecting | Inspection of `assets/analytics.js` and a loaded page: no cookies set, no personal identifier stored, no fingerprinting, DNT honored, `mz_no_count` opt-out honored; behavior matches `privacy.html` |
| AC-11 | Key funnel events are instrumented | Audit script: page-view, CTA-click, consult-path-reach, and subscribe events are wired on their respective pages and each dispatches a named non-identifying event to the analytics endpoint |
| AC-12 | Event wiring is non-blocking | With the analytics endpoint blocked, every instrumented page still renders and every CTA/link/subscription action still completes; no JavaScript error is thrown |
| AC-13 | Funnel events are documented | `.moai/specs/SPEC-REVISIT-001/events.md` exists and lists each event with trigger, pages, and non-identifying payload |
| AC-14 | Subscription path is coherent and reachable | `newsletter.html` states the value proposition (content, cadence, free, cancellable), presents the free owned channels, and routes a completed subscription action to `subscribed-thanks.html` |
| AC-15 | Subscription path is in nav and sitemap | The global nav/footer on a sampled page links to the subscription path; `newsletter.html` and `feeds/index.html` appear in `sitemap.xml` |
| AC-16 | Subscription connects to S2/S3 | `newsletter.html` describes the recurring content in terms of the existing free assets and links to the S3 feed hub `feeds/index.html` |
| AC-17 | Confirmation page integrity | `subscribed-thanks.html` is reachable as the subscription endpoint, confirms the subscription consistently with `newsletter.html`, offers a next step into the free-value layer, and retains `noindex, follow` |
| AC-18 | PWA passes the Lighthouse installability audit | `npm run lighthouse` (`lhci`) reports the manifest valid, the maskable icons resolved, a service worker registered controlling the start URL, and the start URL offline-responsive |
| AC-19 | No S1/S2/S3 regression | `npm run lint:html`, `npm run links`, the JSON-LD validity check, and `npm run a11y` over all pages edited under this SPEC report zero new errors vs the SPEC-DISCOVERY-001 / SPEC-FREEVALUE-001 / SPEC-REACH-001 baseline |
| AC-20 | Re-visit audit report produced | `.moai/reports/revisit-2026-05-19/report.md` exists and records per-requirement findings and final state |

## S4 → S5 Gate Condition

[HARD] Stage S5 (유입 전환) work **must not begin** until the `evaluator-active`
gate for S4 passes. The gate passes only when **all** of the following hold, each
backed by artifact evidence (a passing command output or a committed file):

1. **PWA installable** — `manifest.webmanifest` is valid JSON with all required
   keys and a maskable 192×192 + 512×512 raster icon set that resolves, and the
   Lighthouse PWA installability audit (`npm run lighthouse`) passes (AC-2, AC-3,
   AC-18).
2. **Offline support works** — a single site-wide service worker scoped to `/`
   pre-caches the offline shell, applies a deliberate versioned cache strategy,
   and serves a previously visited page (or the offline fallback page) when the
   network is unavailable (AC-5, AC-6, AC-8).
3. **PWA wired site-wide** — **100%** of the re-visit-surface page set declares
   `<link rel="manifest">` and registers the service worker, with `index.html`
   included and zero peer-page inconsistency (AC-4, AC-7).
4. **Analytics measures the funnel** — the cookieless analytics snippet loads on
   **100%** of the re-visit surface, it is verified cookieless and
   privacy-respecting (no cookies, no identifiers, DNT and `mz_no_count`
   honored), and the four key events — page view, CTA click, consult-path reach,
   subscribe — are instrumented and dispatch named non-identifying events
   (AC-9, AC-10, AC-11, AC-13).
5. **Analytics is non-blocking** — with the analytics endpoint blocked, every
   instrumented page still renders and every CTA/link/subscription action still
   completes with no thrown error (AC-12).
6. **Subscription path is coherent** — `newsletter.html` states the value
   proposition, presents the free owned channels, connects to the S2 free value
   and the S3 feed hub, routes a completed subscription to `subscribed-thanks.html`,
   and the subscription path is reachable from the global navigation and present
   in `sitemap.xml` (AC-14, AC-15, AC-16, AC-17).
7. **No regression** — `npm run lint:html`, `npm run links`, the JSON-LD validity
   check, and `npm run a11y` report **zero new errors** for every page edited
   under this SPEC relative to the S1/S2/S3 baseline (AC-19).
8. **Evidence** — the re-visit audit report
   (`.moai/reports/revisit-2026-05-19/report.md`) exists and records the pass
   state with the findings above (AC-20).

If any condition fails, S4 is not complete and S5 does not start. This mirrors the
master plan Phase 4 gate ("PWA installable and passes Lighthouse PWA audit;
subscription form submits and stores; service worker caches correctly") and
absorbs the master-plan Phase 3 "analytics events fire" clause that SPEC-REACH-001
explicitly deferred to S4. The master-plan phrase "subscription form submits and
stores" is interpreted, under the static-site / no-server-logic constraint, as the
subscription path completing to the static `subscribed-thanks.html` confirmation
via the free owned channels — there is no server-side store to write to.

## Exclusions (What NOT to Build)

- ❌ S1 discoverability work — sitemaps, `robots.txt`, AI-crawler directives,
  per-page SEO metadata authoring, JSON-LD authoring. Owned by
  SPEC-DISCOVERY-001. This SPEC only *preserves* that metadata and adds the new
  offline fallback page to the indexed/public set as appropriate.
- ❌ S2 free-value work — the free-value hub, FAQ, glossary, conversion-CTA
  authoring on free content. Owned by SPEC-FREEVALUE-001. S4 measures CTA clicks
  and links to the free value; it does not author or re-route the CTAs.
- ❌ S3 reach work — RSS/Atom/JSON feed *generation*, the feed inventory, OG
  share-image design, `hreflang` wiring. Owned by SPEC-REACH-001. S4 *links to*
  the S3 feed hub as a subscription channel; it does not modify the feeds or
  their builders.
- ❌ Search functionality — the resource search index and search UI are owned by
  SPEC-SEARCH-001. S4 does not touch search.
- ❌ Landing-page layout, copy, the 12-section template, or the five `/p/` pages —
  owned by SPEC-LANDING-001. S4 may instrument a CTA-click event on those pages
  but does not change their content or design.
- ❌ S5 conversion work — landing pages, the free-consult booking form, CTA
  *authoring*, lead capture. S4 instruments a *consult-path-reach* event; it does
  not build the booking form or the lead flow.
- ❌ S6 revenue work — pricing, checkout, application forms, payment, retention
  nurture sequences, alumni community. Out of scope entirely.
- ❌ A paid email service provider, a server-side mailing-list store, or
  double-opt-in email automation. S4 routes subscription through the free owned
  channels (LinkedIn newsletter, RSS/Atom/JSON feeds, Naver blog) and the static
  confirmation page; it does not provision an ESP or a server-side subscriber
  database.
- ❌ Push notifications. Web Push requires a push service and server-side
  triggering; under the static-site / no-server-logic / no-paid-services
  constraints it is out of scope. The service worker provides offline support and
  caching only — it does not subscribe to or handle push.
- ❌ Paid analytics, analytics that set cookies, fingerprinting, or any
  identifying telemetry. Analytics is strictly cookieless and free.
- ❌ Native app store packaging. `capacitor.config.json` describes a separate
  Capacitor wrapper for the `radio/` subapp (`org.nedabah.classicfm`); S4 does not
  build, modify, or ship a native app and does not alter the Capacitor config.
- ❌ The `vault/` and `radio/` subapps' own manifests and service workers. They
  are independently scoped and excluded from the re-visit surface; S4 does not
  modify them.
- ❌ Dark/light theming. `assets/dark-mode-v1.css` was deliberately disabled by a
  prior user instruction (a `prefers-color-scheme` dark mode broke text contrast
  against the copper tone). The master plan flags `web-darkmode-themer` as a
  *weak* S4 contributor; re-enabling dark mode is explicitly **not** required to
  pass the S4 gate and is not built by this SPEC.
- ❌ Server-side rendering, edge functions, or any non-static infrastructure.

## Dependencies

- **Predecessor (hard)**: SPEC-DISCOVERY-001 — its S1→S2 gate must have passed;
  `.moai/specs/SPEC-DISCOVERY-001/public-pages.txt` is the source the re-visit
  surface page set is derived from.
- **Predecessor (hard)**: SPEC-FREEVALUE-001 — its S2→S3 gate must have passed;
  the free-value layer (hub, articles, tools) is what the subscription connects
  back to and what CTA-click instrumentation measures.
- **Predecessor (hard)**: SPEC-REACH-001 — its S3→S4 gate must have passed; the
  feed hub `feeds/index.html` and the frozen feed inventory are the
  machine-readable subscription channel S4 links to.
- **Strategy SSoT**: `.moai/strategy/site-strategy.yaml` — source of brand
  identity, channel URLs (`identity.channels` — site, youtube, naver_blog,
  linkedin), program names, and personas used in the manifest, the subscription
  page, and analytics labels.
- **Related SPECs**: SPEC-LANDING-001 (the five `/p/` pages carry CTA-click
  events S4 instruments), SPEC-SEARCH-001 (unaffected).
- **Tooling**: `htmlhint`, `lychee`, `pa11y-ci`, `lhci` (already in
  `package.json` devDependencies); `.lighthouserc.json` for the PWA audit;
  `lychee.toml` for link checking.
- **Existing infrastructure**: `manifest.webmanifest` (root web app manifest),
  `assets/analytics.js` (cookieless GoatCounter snippet), `newsletter.html`
  (subscription page), `subscribed-thanks.html` (post-subscribe confirmation),
  `feeds/index.html` (S3 feed hub), `privacy.html` (analytics disclosure), the
  global navigation component, and `assets/nedabah.bundle.css`.

## Assumptions

1. The re-visit surface page set is a subset of the SPEC-DISCOVERY-001 frozen
   public page set; SPEC-DISCOVERY-001, SPEC-FREEVALUE-001, and SPEC-REACH-001 are
   treated as already passed (master plan build-order rule). The exact surface is
   produced by REQ-RV-001 — file names cited in this SPEC are observed at
   authoring time and are not the contract; `revisit-surface.txt` is.
2. The repository has **no site-wide service worker** at authoring time
   (`vault/sw.js` and `radio/sw.js` are scoped to those subapps only). REQ-RV-005
   therefore *creates* a new site-wide service worker rather than auditing one.
3. The root `manifest.webmanifest` exists but is referenced inconsistently and
   declares only an SVG icon. REQ-RV-003 and REQ-RV-004 treat the missing maskable
   raster icons and the missing manifest links as defects to close.
4. `assets/analytics.js` (GoatCounter) is treated as the cookieless analytics
   solution and satisfies the no-paid-services constraint — GoatCounter is free,
   cookieless, DNT-respecting, and already documented in `privacy.html`. S4 widens
   its page coverage and adds event instrumentation; it does not replace the tool.
   The GoatCounter account/endpoint provisioning is an operator setup step noted
   in `assets/analytics.js` and is outside the code scope of this SPEC.
5. Under the static-site / no-server-logic constraint, "subscription" means
   routing the visitor to the free owned channels (LinkedIn newsletter, RSS/Atom/
   JSON feeds, Naver blog) and to the static `subscribed-thanks.html` confirmation.
   The master-plan Phase 4 phrase "subscription form submits and stores" is
   interpreted accordingly — there is no server-side subscriber store to write to,
   and provisioning one is out of scope.
6. Push notifications are out of scope: Web Push requires a push service and
   server-side triggering, which the static-site / no-server-logic / no-paid-
   services constraints exclude. The service worker delivers offline support and
   caching only.
7. The "re-visit audit report" is classified as a report and lives under
   `.moai/reports/` (per the SPEC-vs-report classification rule), not under
   `.moai/specs/`. The event reference `events.md` is a per-SPEC machine-readable
   contract and lives alongside the SPEC under `.moai/specs/SPEC-REVISIT-001/`.
8. The S4→S5 gate thresholds (PWA installable and Lighthouse-audited, offline
   support working, analytics site-wide with the four key events instrumented,
   subscription path coherent and reachable) are derived from master plan Phase 4
   and the S3-deferred "analytics events fire" clause, and are treated as fixed
   inputs, not re-derived here.

## Lifecycle Note

This SPEC is **spec-anchored**: the site keeps adding pages, so the manifest link,
the service-worker registration, and the analytics snippet must keep being applied
to new pages, and the service-worker cache version must be bumped when the offline
shell changes. The S4 contract — the PWA installable and offline-capable, the
subscription path coherent and reachable, the funnel's key events measured —
remains a standing requirement. Re-running the re-visit audit after future
additions keeps S4 from regressing into a partially registered PWA, a stale
offline cache, or an unmeasured funnel, which would silently break the
exposure-frequency stage and undercut the revenue-funnel continuity in the master
plan rubric.
