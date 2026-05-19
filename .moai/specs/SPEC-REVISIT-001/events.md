# SPEC-REVISIT-001 — funnel event reference (REQ-RV-013 / AC-13)

The measurement contract for the S4 re-visit funnel. Every event below is
dispatched by `assets/analytics.js` to the cookieless GoatCounter endpoint as a
**named, non-identifying** event. No cookies, no personal identifiers, no
fingerprinting; the Do-Not-Track signal and the `localStorage` `mz_no_count`
opt-out are honored before any event fires (REQ-RV-010).

All event wiring is feature-guarded and wrapped in `try/catch`: if GoatCounter
is blocked, unavailable, or fails to load, the page still renders and every
CTA / link / subscription action still completes (REQ-RV-012 / AC-12).

## Transport

GoatCounter counts arbitrary paths as events via `window.goatcounter.count()`.
Each event is sent as:

```js
goatcounter.count({ path: 'event/<name>', title: 'event:<name>', event: true })
```

The **only** data transmitted is the event `path`, the `title`, plus the page
URL and referrer GoatCounter already collects for the pageview. No tool inputs,
tool results, form field contents, or personal data are ever sent.

## Events

### 1. page view

| Field    | Value |
|----------|-------|
| Trigger  | Page load — the GoatCounter `count.js` snippet auto-counts the pageview. |
| Pages    | All 595 re-visit-surface pages (every page loads `assets/analytics.js`). |
| Payload  | Page URL path, referrer, coarse screen size (GoatCounter defaults). No identifiers. |
| Funnel   | S4 base re-visit signal — exposure frequency. |

### 2. cta-click

| Field    | Value |
|----------|-------|
| Trigger  | Click on a primary conversion CTA. A capture-phase `click` listener matches `.cta-next a`, `a.cta-next__primary`, `a.cta-next__secondary`, `a.gnav__cta`, `[data-cta]`. The listener never calls `preventDefault` — the link navigates normally. |
| Pages    | Any page carrying a `.cta-next` block (~1260 resources pages) or the global-nav `강의 의뢰` CTA (`a.gnav__cta`). |
| Payload  | `path: event/cta-click`. No link href, no page-specific identifier. |
| Funnel   | S4 → S5 — measures intent to move toward a `/p/` program page or the free consultation. |

### 3. consult-reach

| Field    | Value |
|----------|-------|
| Trigger  | Arrival at the free-consultation contact path — fired on page load when `location.pathname` ends in `/contact.html`. |
| Pages    | `contact.html`. |
| Payload  | `path: event/consult-reach`. No identifier. |
| Funnel   | S4 → S5 — confirms a visitor reached the consult path. |

### 4. subscribe

| Field    | Value |
|----------|-------|
| Trigger  | Completion of the subscription path — fired on page load when `location.pathname` ends in `/subscribed-thanks.html` (the static confirmation page that every `newsletter.html` channel routes to). |
| Pages    | `subscribed-thanks.html`. |
| Payload  | `path: event/subscribe`. No identifier, no email, no channel detail. |
| Funnel   | S4 — the subscription cadence opt-in is measured. |

### Supporting event — subscribe-intent

| Field    | Value |
|----------|-------|
| Trigger  | On `newsletter.html`, a click on a subscription channel or confirm link (`a[href*="subscribed-thanks"]`, `a[href*="linkedin.com"]`, `a[href*="blog.naver.com"]`, `a[href*="/feeds/"]`). Capture-phase listener; never blocks the click. |
| Pages    | `newsletter.html`. |
| Payload  | `path: event/subscribe-intent`. No identifier. |
| Funnel   | S4 — measures the entry side of the subscription funnel so drop-off between intent and completion (`subscribe`) is visible. |

## Privacy consistency

This event set is consistent with `privacy.html` §6 (cookieless GoatCounter
statistics). Events carry only coarse page/event metadata; they introduce no
new data category beyond what the pageview already collects. The `mz_no_count`
opt-out and DNT short-circuit the entire script — when either is set, no
pageview and no event is sent.

## Lifecycle

Spec-anchored: when new CTAs, contact paths, or subscription channels are
added, extend the selectors / path checks in `assets/analytics.js` and update
this file so the measurement contract stays accurate.
