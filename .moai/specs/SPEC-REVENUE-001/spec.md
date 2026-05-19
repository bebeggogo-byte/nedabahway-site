# SPEC-REVENUE-001 — S6 수익 전환 (Lead → Revenue / Retention)

```yaml
spec_id: SPEC-REVENUE-001
title: S6 Revenue Conversion — make the free-consultation booking the excellent, honest endpoint of the funnel, with transparent pricing, a clear lead-to-enrollment path, and a retention loop back into the free channels
version: 1.0.0
created: 2026-05-19
status: draft
owner: 김창환 (네다바웨이)
priority: Critical
funnel_stage: S6 (수익 전환, weight 0.15) — final funnel stage, there is no S7
master_plan_ref: .moai/plans/funnel-100-master-plan.md (Phase 6)
strategy_ref: .moai/strategy/site-strategy.yaml
related_specs: [SPEC-DISCOVERY-001, SPEC-FREEVALUE-001, SPEC-REACH-001, SPEC-REVISIT-001, SPEC-LANDING-001, SPEC-SEARCH-001]
tags: [revenue, conversion, lead-capture, contact-form, pricing-transparency, lead-to-enrollment, retention, json-ld-offers, funnel-s6, static-site]
```

## Goal

Make `nedabah.org` honestly excellent at the **last revenue job a website can do for
this business**: produce a clear, qualified, friction-free **booked lead** and set
that lead's expectations correctly. This is funnel stage S6 — the final stage; there
is no S7.

네다바웨이 is a **one-person education business** run offline by 김창환. It does **not
sell online**. There is no e-commerce, no payment processor, no shopping cart, and no
applicant database — and the site is static (GitHub Pages + Vercel), so there is no
server on which any of those could run. The real revenue path is:

> a visitor books the **free 30-minute consultation** → 김창환 and the visitor confirm
> the right program together → **enrollment into a paid program happens offline**,
> after that consultation.

The website's revenue job therefore **ends at producing the booked lead**. Everything
after the consultation — payment, enrollment, the first session — happens person to
person, off the site. S6 is scoped honestly to the four things a static site can
genuinely do to maximize and qualify that booked lead:

1. **Lead-capture endpoint quality.** The free-consultation booking path — anchored on
   `contact.html` — must be excellent: clear, low-friction, accessible, working as a
   static form, and setting correct expectations about what happens after a visitor
   books. S1–S5 send every warm visitor here; S6 makes the place they land worth the
   journey.
2. **Pricing transparency.** The five programs' prices must be presented clearly and
   consistently across the `/p/` landing pages and the lineup index, every figure
   tracing to `site-strategy.yaml#revenue_lineup`. No hidden pricing, no
   price-on-request, no figure that contradicts the strategy SSoT.
3. **Lead-to-enrollment clarity.** The path from "booked consultation" to "enrolled in
   a paid program" is explained so a lead knows what comes next, and the JSON-LD
   `offers` on the five `/p/` pages accurately describe the real, offline-enrolled
   programs.
4. **Retention loop.** The retention mechanism for this business is the free channels
   already built in earlier stages — the newsletter / subscription path (S4) and the
   feeds (S3). S6 verifies the post-consultation and post-program touchpoints connect
   back into those free channels, so a person who is not ready to enroll today, and an
   alumnus after a program ends, both have a no-cost way to stay in contact.

This is an **audit-and-improve** SPEC, not greenfield. `contact.html`, the five `/p/`
pages with their JSON-LD `offers`, the lineup index `/p/index.html`, `newsletter.html`,
and the S3 feed hub all already exist. The work is to audit each against the four S6
objectives, close the honest gaps the audit finds, and prove the result with the
repository's own tooling.

A representative audit finding that motivates this SPEC: `contact.html` is currently
framed and titled as a **B2B lecture-booking form** (`강의 의뢰·연락`, `강의 의뢰는
메일 또는 폼으로`). Its form fields ask for an institution name, lecture date, audience
size, and lecture topic. But all five `/p/` landing pages send their primary CTA
("무료 30분 적합도 진단 신청 →") to `contact.html`, and every `/p/` JSON-LD `offers.url`
also points to `contact.html`. A coaching-program lead who clicks "무료 30분 적합도
진단" lands on a page about booking a lecture for an institution — the endpoint does not
match the promise that brought the lead there. S6 closes that mismatch so the
free-consultation lead has a coherent, expectation-setting place to land, **without
removing** the existing lecture-request path that other pages of the site rely on.

Success is measured by the **quality of the lead-capture outcome** — the booking path
is coherent, low-friction, accessible, and honest about what happens next; pricing is
transparent and consistent; the lead-to-enrollment path and the `offers` data are
accurate; the retention loop connects — **not** by activity volume and **not** by
inventing artifacts purely to register agent usage (master plan Section 1.2).

## Scope Definition

### The revenue surface

S6 requirements apply to the **revenue surface**, defined as:

- **The lead-capture endpoint**: `contact.html` (the page the free-consultation CTA
  and every `/p/` `offers.url` resolve to), plus any static form-handling mechanism it
  uses (`mailto:` action, `tel:` link, or a free static form handler).
- **The pricing and offer surface**: the five `/p/{slug}.html` landing pages
  (`starcp`, `iden-teacher`, `iden-career`, `changjig`, `5s-leadership`), their §9
  pricing sections, their JSON-LD `Service`/`offers` blocks, and the lineup index
  `/p/index.html` with its program-card prices and comparison table.
- **The retention surface**: the post-consultation and post-program touchpoints — the
  newsletter / subscription path (`newsletter.html`, owned by SPEC-REVISIT-001) and the
  S3 feed hub (`feeds/index.html`, owned by SPEC-REACH-001) — as referenced from the
  revenue surface. S6 **links to** these; it does not rebuild them.

The relevant public page set is drawn from the SPEC-DISCOVERY-001 frozen public page
set, restricted to the pages above.

[HARD] The first implementation task is to **enumerate and freeze the revenue surface**
as a checked-in inventory (`.moai/specs/SPEC-REVENUE-001/revenue-surface.txt`),
recording: (a) the lead-capture endpoint file(s) and the static mechanism each form
uses, (b) the five `/p/` pages and the lineup index with the pricing location and the
JSON-LD `offers` location in each, and (c) the retention touchpoints linked from the
revenue surface. Every surface-scoped requirement is measured against this frozen
inventory, not against a guessed page count.

## Constraints

- **Static site only.** GitHub Pages + Vercel. There is no application server. Every
  S6 mechanism — the booking form, pricing display, JSON-LD, retention links — is
  static HTML and client-side only.
- **No server-side logic.** [HARD] No request-time rendering, no edge functions, no
  server-side form processing, no server-side state. A booking "form" that requires a
  server endpoint to process a submission is out of scope; the form submits through a
  client-only mechanism (the existing `mailto:` action, the `tel:` channel, or a free
  no-server static form handler).
- **No e-commerce, no payment, no checkout.** [HARD] S6 introduces **no payment
  processor, no shopping cart, no checkout flow, no online purchase of any program**.
  Enrollment and payment happen **offline**, person to person, after the free
  consultation. The site's revenue job ends at the booked lead.
- **No applicant or lead database; no migrations.** [HARD] S6 introduces **no
  database, no applicant/lead/subscriber data model, and no schema migrations**. A
  static site has no server and no datastore; a lead's information travels directly to
  김창환 via the email/phone the static form mechanism produces, and is not persisted by
  the site.
- **No paid services.** [HARD] S6 provisions **no paid form service, no paid CRM, no
  paid scheduling tool, no paid email service provider**. If a static form handler is
  used it MUST be a free no-account-cost tier; otherwise the existing `mailto:` /
  `tel:` mechanism is retained. The retention loop uses the free owned channels already
  in the strategy SSoT.
- **Pricing defers to the strategy SSoT.** [HARD] Every price figure on every page and
  in every JSON-LD `offers` block MUST equal the corresponding `price_krw` in
  `.moai/strategy/site-strategy.yaml#revenue_lineup`. The site MUST NOT invent,
  round inconsistently, or omit a program's price.
- **Factual and brand claims defer to the strategy SSoT.** Any program name, persona,
  duration, cohort size, deliverable, contact email/phone, or channel URL used on the
  revenue surface MUST trace to `.moai/strategy/site-strategy.yaml`.
- **Do not regress S1–S5.** Any page edited under this SPEC MUST keep the
  SPEC-DISCOVERY-001 discoverability metadata, the SPEC-FREEVALUE-001 conversion
  wiring, the SPEC-REACH-001 feed-autodiscovery / share-card / hreflang wiring, the
  SPEC-REVISIT-001 manifest / service-worker / analytics wiring, and the
  SPEC-LANDING-001 12-section layout and CTA pattern. S6 edits MUST NOT introduce a
  new `htmlhint`, link, JSON-LD, or accessibility error relative to the S1–S5
  baseline.
- **No new runtime dependencies.** Verification reuses tooling already in
  `package.json` (`htmlhint`, `lychee`, `pa11y-ci`, `lhci`, `stylelint`). JSON-LD
  `offers` validity is checked offline (`JSON.parse` and a schema.org `Offer`
  field check); pricing consistency is checked by comparing parsed values against
  `site-strategy.yaml`.
- **Voice rules apply to all S6 copy.** Any new or revised copy on the revenue
  surface MUST comply with `site-strategy.yaml#voice_rules` (`forbidden` / `required`)
  and the `cta_pattern` rules (one primary CTA, one footer CTA, no mid-body CTA
  repetition).
- **No time estimates.** Priority labels only (Critical / High / Medium).

## EARS — Requirements

### REQ-REV-001 — Revenue surface enumeration (Critical)
The system **shall** maintain a checked-in enumeration of the revenue surface at
`.moai/specs/SPEC-REVENUE-001/revenue-surface.txt`, recording the lead-capture
endpoint file(s) and the static submission mechanism each form uses, the five `/p/`
landing pages and the lineup index with the pricing location and the JSON-LD `offers`
location in each, and the retention touchpoints linked from the revenue surface. Every
surface-scoped requirement is measured against this frozen inventory.

### REQ-REV-002 — Free-consultation booking path is coherent with the CTA that leads to it (Critical)
The free-consultation booking path **shall** present a destination that matches the
promise of the CTA that brought the visitor there. **Where** the five `/p/` landing
pages send a primary CTA labelled for a free 30-minute program-suitability
consultation (the `cta_secondary` values in `site-strategy.yaml#revenue_lineup`, e.g.
"무료 30분 적합도 진단"), the page that CTA resolves to **shall** clearly present a
free 30-minute consultation as an available, named action — it **shall not** present
*only* an institutional lecture-booking flow when a coaching-program lead arrives.
**If** `contact.html` is retained as the single shared endpoint, **then** it shall
distinguish the free-consultation path from the lecture-request path so that neither
audience lands on a page that contradicts the link they clicked.

### REQ-REV-003 — Lead-capture form works as a static, low-friction form (Critical)
Every form on the lead-capture endpoint **shall** function without any server: it
**shall** use a client-only submission mechanism (a `mailto:` action, a `tel:`
channel, or a free no-server static form handler), **shall** present a visible
fallback contact path (the direct `nedabah.way@gmail.com` email and the
`010-6642-7749` phone, both from `site-strategy.yaml#identity.contact`) for a visitor
whose mechanism fails, and **shall** keep the field set minimal — only the fields
김창환 genuinely needs to prepare for the consultation. The form **shall not** require
account creation, login, or payment information.

### REQ-REV-004 — Booking expectations are set explicitly (Critical)
The lead-capture endpoint **shall** state explicitly, in plain copy, what happens
after a visitor books: that the 30-minute consultation is **free**, the channel and
format it is held on, the expected response timeframe, and that **enrolment and
payment happen offline after the consultation** — there is no online purchase. A
visitor **shall** be able to read, before submitting, that booking the consultation
does not commit them to paying for a program.

### REQ-REV-005 — Lead-capture endpoint accessibility (Critical)
Every form on the lead-capture endpoint **shall** be accessible: each control has a
programmatically associated `<label>`, required fields are marked both visually and
via `required`/`aria-required`, the submit control has an accessible name, and the
page passes the repository accessibility check (`pa11y-ci` via `npm run a11y`) with
zero new errors relative to the S1–S5 baseline. **If** a field is optional, **then**
it shall not be marked `required`, so a visitor is never blocked from booking by an
inessential field.

### REQ-REV-006 — Pricing is present and transparent on every program page (Critical)
Each `/p/{slug}.html` landing page **shall** present the program's price visibly in
its §9 pricing section as a concrete KRW figure — not "가격 문의", not omitted, not
hidden behind an interaction. The lineup index `/p/index.html` **shall** present each
program's price on its program card and in its comparison table. No program on the
revenue surface **shall** be shown without its price.

### REQ-REV-007 — Every displayed price equals the strategy SSoT (Critical)
Every price figure on the revenue surface — each `/p/` §9 pricing section, each
lineup-index program card, each comparison-table row, and each JSON-LD `offers.price`
— **shall** equal the corresponding `price_krw` in
`.moai/strategy/site-strategy.yaml#revenue_lineup` for that program. **If** a
displayed figure does not match the SSoT, **then** the displayed figure shall be
corrected to the SSoT value — the SSoT is the single source of truth and copy must
not diverge from it.

### REQ-REV-008 — JSON-LD `offers` on each program page is valid and accurate (Critical)
Each `/p/{slug}.html` page **shall** carry a JSON-LD block whose `offers` object is
valid schema.org and accurate: `@type` is `Offer`, `price` equals the SSoT
`price_krw`, `priceCurrency` is `"KRW"`, and `url` resolves to a reachable page on the
revenue surface (the lead-capture endpoint, consistent with REQ-REV-002). The
`Service`/`offers` block **shall** parse as valid JSON and **shall not** declare a
price or currency that contradicts the visible §9 pricing copy on the same page.

### REQ-REV-009 — JSON-LD `offers` does not misrepresent an online purchase (Critical)
The JSON-LD `offers` data **shall not** misrepresent the program as an online,
self-service purchase. **If** an `availability` or comparable field is present, **then**
it shall be consistent with the real model — a program enrolled offline after a free
consultation — and the `offers.url` shall point to the free-consultation booking path,
not to a checkout or payment page (no such page exists). The structured data **shall**
describe a real, bookable professional-coaching service, not a fictional e-commerce
product.

### REQ-REV-010 — Lead-to-enrollment path is explained (Critical)
The revenue surface **shall** explain, in plain copy reachable by a lead, the path
from a booked consultation to enrolment in a paid program: that after the free 30-minute
consultation the visitor and 김창환 confirm the right program together, and that
enrolment and payment are then arranged **offline**. This explanation **shall** appear
where a lead will see it before or at the point of booking — at minimum on the
lead-capture endpoint, and consistently with the §12 신청 흐름 section of the `/p/`
pages — so a lead is never surprised about what comes after the consultation.

### REQ-REV-011 — Pricing copy justifies the figure without coercion (High)
The §9 pricing copy on each `/p/` page **shall** present the price alongside its
value justification (the program deliverable and the ROI framing already drafted from
`site-strategy.yaml`) and **shall** comply with `voice_rules` — no coercive "해야
합니다" tone, no vague superlatives, concrete numbers and proper nouns retained. The
pricing section **shall not** use a fake discount, a fabricated countdown, or false
scarcity to pressure the visitor; any cohort/scheduling scarcity shown **shall** be
the real `cohort_size` and `1기` framing from the strategy SSoT.

### REQ-REV-012 — Retention loop connects the revenue surface to the free channels (Critical)
The revenue surface **shall** connect the post-consultation and post-program
touchpoints to the free retention channels built in earlier stages. **Where** a
visitor is not ready to book today, the lead-capture endpoint (and/or the `/p/` pages)
**shall** offer a no-commitment way to stay in contact by linking to the subscription
path (`newsletter.html`) and/or the S3 feed hub (`feeds/index.html`). **Where** the
strategy SSoT describes post-program retention (`conversion_funnel.retention` — 수료
후 동문 커뮤니티 + 사후 상담), the revenue surface copy that references alumni/retention
**shall** be consistent with that SSoT description and **shall not** promise a
retention mechanism the static site does not provide.

### REQ-REV-013 — Retention links resolve and do not regress S3/S4 (High)
Every retention link added or relied on by the revenue surface **shall** resolve to a
reachable page (`newsletter.html`, `feeds/index.html`), and adding those links
**shall not** introduce a broken link or alter the S3 feeds or the S4 subscription
path. S6 **links into** the S3/S4 retention mechanism; it **shall not** modify the
feeds, the feed hub, the subscription page content, or the analytics owned by the
earlier SPECs.

### REQ-REV-014 — S6 instrumentation reuses, and does not duplicate, the S4 events (High)
**Where** the master plan calls for conversion measurement, S6 **shall** rely on the
funnel events already defined by SPEC-REVISIT-001 — at minimum **CTA click** and
**consult-path reach** — and **shall not** introduce a second, duplicate analytics
mechanism. **If** the consult-path-reach event is not yet wired to fire on the
lead-capture endpoint as scoped by SPEC-REVISIT-001, **then** S6 verifies that wiring
is present on the revenue surface; it does not author a new analytics system.

### REQ-REV-015 — Revenue surface does not regress S1–S5 (Critical)
Every page edited under this SPEC **shall** retain the SPEC-DISCOVERY-001
discoverability metadata, the SPEC-FREEVALUE-001 conversion wiring, the SPEC-REACH-001
feed-autodiscovery / share-card / hreflang wiring, the SPEC-REVISIT-001
manifest / service-worker / analytics wiring, and the SPEC-LANDING-001 12-section
layout and `cta_pattern` compliance. `npm run lint:html`, `npm run links`, the JSON-LD
validity check, and `npm run a11y` over every edited page **shall** report zero new
errors relative to the S1–S5 baseline.

### REQ-REV-016 — Revenue audit report (High)
The system **shall** produce a revenue audit report at
`.moai/reports/revenue-2026-05-19/report.md` recording, per requirement: the
lead-capture endpoint state (coherence with the CTA, static-form mechanism,
expectations copy, accessibility), the pricing-transparency state (per-program price
present and equal to the SSoT, across `/p/` pages, the lineup index, and the JSON-LD),
the lead-to-enrollment clarity state, the retention-loop state, and the final
pass/fail state. This report is the artifact-evidence record required by the master
plan's scoring rubric.

## Acceptance Criteria

All criteria are verified against the frozen revenue surface in
`revenue-surface.txt`. Every criterion is objectively verifiable on a static site
with the repository's existing tooling.

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| AC-1 | Revenue surface is enumerated and frozen | `.moai/specs/SPEC-REVENUE-001/revenue-surface.txt` exists, is non-empty, and records the lead-capture endpoint(s) with their static form mechanism, the five `/p/` pages and the lineup index with pricing + `offers` locations, and the retention touchpoints |
| AC-2 | Booking path matches the CTA that leads to it | Following each `/p/` page primary free-consultation CTA and each `offers.url`, the destination page presents a free 30-minute consultation as a clearly named available action; a coaching lead does not land on a page offering only institutional lecture booking |
| AC-3 | Lead-capture form is static and works without a server | Every form on the lead-capture endpoint uses a client-only mechanism (`mailto:`, `tel:`, or a free no-server handler); a visible direct email + phone fallback is present; no field requires account creation, login, or payment data |
| AC-4 | Booking expectations are stated | The lead-capture endpoint states in plain copy that the consultation is free, its channel/format, the response timeframe, and that enrolment and payment happen offline after the consultation with no online purchase |
| AC-5 | Lead-capture form is accessible | Every form control has an associated `<label>`; required fields marked visually and via `required`/`aria-required`; submit control has an accessible name; `npm run a11y` reports zero new errors vs the S1–S5 baseline |
| AC-6 | Pricing is present on every program page and the lineup | Each `/p/{slug}.html` §9 section shows a concrete KRW price; `/p/index.html` shows each program's price on its card and in its comparison table; zero programs shown without a price |
| AC-7 | Every displayed price equals the strategy SSoT | A check comparing each parsed price figure (`/p/` §9 sections, lineup cards, comparison-table rows, JSON-LD `offers.price`) against `site-strategy.yaml#revenue_lineup.price_krw` reports an exact match for all five programs |
| AC-8 | JSON-LD `offers` is valid and accurate | Each `/p/` page's JSON-LD parses via `JSON.parse`; `offers` has `@type: Offer`, `price` = SSoT `price_krw`, `priceCurrency: "KRW"`, and `url` resolving to a reachable revenue-surface page; no contradiction with the visible §9 price |
| AC-9 | JSON-LD does not misrepresent an online purchase | No `/p/` JSON-LD `offers.url` points to a checkout or payment page; any `availability` field is consistent with offline-enrolled coaching; the structured data describes a real bookable coaching service |
| AC-10 | Lead-to-enrollment path is explained | The lead-capture endpoint and the `/p/` §12 신청 흐름 sections explain, consistently, that after the free consultation the program is confirmed together and enrolment/payment are arranged offline |
| AC-11 | Pricing copy is non-coercive and SSoT-sourced | The §9 pricing copy on each `/p/` page complies with `voice_rules` (no coercive tone, no vague superlatives); no fake discount, fabricated countdown, or false scarcity; any scarcity shown is the real `cohort_size` / `1기` framing |
| AC-12 | Retention loop links the revenue surface to the free channels | The revenue surface offers a no-commitment way to stay in contact, linking to `newsletter.html` and/or `feeds/index.html`; alumni/retention copy is consistent with `conversion_funnel.retention` in the SSoT |
| AC-13 | Retention links resolve; S3/S4 untouched | `npm run links` reports the retention links resolve; no S3 feed, feed hub, subscription-page content, or analytics file owned by SPEC-REACH-001 / SPEC-REVISIT-001 is modified by this SPEC |
| AC-14 | S6 reuses the S4 events, no duplicate analytics | The revenue surface relies on the SPEC-REVISIT-001 CTA-click and consult-path-reach events; no second analytics mechanism is introduced |
| AC-15 | No S1–S5 regression | `npm run lint:html`, `npm run links`, the JSON-LD validity check, and `npm run a11y` over every page edited under this SPEC report zero new errors vs the SPEC-DISCOVERY-001 / SPEC-FREEVALUE-001 / SPEC-REACH-001 / SPEC-REVISIT-001 / SPEC-LANDING-001 baseline |
| AC-16 | Revenue audit report produced | `.moai/reports/revenue-2026-05-19/report.md` exists and records per-requirement findings and the final pass/fail state |

## S6 Completion Condition (Final Funnel Gate)

[HARD] S6 is the **final stage of the funnel — there is no S7**, and therefore no
"next stage" to gate the start of. The S6 completion condition is the **terminal gate
of the entire S1–S6 funnel build**: passing it means the master plan's revenue funnel
is, end to end, genuinely shippable. The gate is run by `evaluator-active` (master
plan Section 5, Phase 6). It passes only when **all** of the following hold, each
backed by artifact evidence (a passing command output or a committed file):

1. **The booked lead is the honest endpoint** — the free-consultation booking path is
   coherent with the CTA that leads to it: a coaching-program lead following any `/p/`
   primary CTA or any `offers.url` lands on a page that clearly presents the free
   30-minute consultation as a named action, and is not shown only an institutional
   lecture-booking flow (AC-2).
2. **Lead capture works statically and accessibly** — every form on the lead-capture
   endpoint submits through a client-only mechanism with a visible direct
   email + phone fallback, requires no account/login/payment data, and passes the
   accessibility check with zero new errors (AC-3, AC-5).
3. **Expectations are set** — the lead-capture endpoint states that the consultation
   is free, its channel/format, the response timeframe, and that enrolment and payment
   happen **offline** after the consultation, with no online purchase (AC-4).
4. **Pricing is transparent and SSoT-true** — every program shows a concrete KRW price
   on its `/p/` §9 section, on its lineup-index card, and in the comparison table; and
   **every** displayed price and every JSON-LD `offers.price` equals the
   `site-strategy.yaml#revenue_lineup.price_krw` for that program, for all five
   programs (AC-6, AC-7).
5. **The offer data is valid and honest** — each `/p/` JSON-LD `offers` block is valid
   schema.org, matches the visible price, points to the free-consultation booking
   path, and does not misrepresent the program as an online self-service purchase
   (AC-8, AC-9).
6. **The lead-to-enrollment path is clear** — the revenue surface explains,
   consistently, that after the free consultation the program is confirmed together
   and enrolment/payment are arranged offline (AC-10).
7. **Pricing copy is honest** — the §9 pricing copy is non-coercive, `voice_rules`-
   compliant, and free of fake discounts, fabricated countdowns, or false scarcity
   (AC-11).
8. **The retention loop connects** — the revenue surface links to the S3/S4 free
   retention channels (`newsletter.html`, `feeds/index.html`) as a no-commitment way
   to stay in contact, alumni/retention copy matches the SSoT, those links resolve,
   and S6 reuses the S4 funnel events without introducing duplicate analytics or
   modifying the S3/S4 surfaces (AC-12, AC-13, AC-14).
9. **No regression** — `npm run lint:html`, `npm run links`, the JSON-LD validity
   check, and `npm run a11y` report **zero new errors** for every page edited under
   this SPEC relative to the S1–S5 baseline (AC-15).
10. **Evidence** — the revenue audit report
    (`.moai/reports/revenue-2026-05-19/report.md`) exists and records the pass state
    with the findings above (AC-16).

If any condition fails, S6 is not complete and the funnel build is not done. This
gate interprets the master plan Phase 6 gate clause ("checkout/application flow
completes end-to-end; PII inputs validated per OWASP; conversion analytics report
produced") under the static-site / one-person / offline-enrollment business model:
there is no checkout flow and no PII datastore to validate, so the master plan's
"checkout completes end-to-end" is honestly reinterpreted as **the free-consultation
booking path completes end-to-end as a static, coherent, expectation-setting lead
capture**, and "conversion analytics" is satisfied by reusing the SPEC-REVISIT-001 S4
events plus the revenue audit report. The master-plan Phase 6 items that assume a
server (application/checkout flow, lead/applicant data model, migrations, payment) are
explicitly out of scope — see Exclusions.

## Exclusions (What NOT to Build)

S6, for this business and this static site, deliberately does **not** build a large
part of what a generic "revenue conversion" phase would imply. The master plan's
Phase 6 description mentions "application/checkout flow, lead/applicant data model +
migrations, pricing, payment"; most of that is out of scope here and is excluded for a
concrete, structural reason.

- ❌ **Online payment / payment processor.** No Stripe, no PG (KG이니시스/토스페이먼츠/
  etc.), no payment integration of any kind. **Why:** 네다바웨이 does not sell online;
  enrolment and payment happen offline, person to person, after the free consultation.
  A static site has no server to hold payment secrets or process a transaction.
- ❌ **Checkout flow / shopping cart.** No multi-step checkout, no cart, no "add to
  cart", no order confirmation page. **Why:** there is nothing to check out — the site
  produces a *booked lead*, not a *sale*. The program is confirmed and paid for offline.
- ❌ **Applicant / lead / subscriber database.** No data model, no datastore, no
  records of leads or applicants persisted by the site. **Why:** a static site
  (GitHub Pages + Vercel) has no server and no database; a lead's information travels
  directly to 김창환 by email/phone via the static form mechanism and is not stored by
  the website. Building a "lead data model" would require infrastructure this business
  does not have and does not need.
- ❌ **Server-side migrations.** No schema migrations, no migration files, no database
  versioning. **Why:** there is no database (above), so there is nothing to migrate.
- ❌ **Server-side form processing / application API.** No server endpoint, no edge
  function, no serverless function processing a submission, no `api-designer`-style
  booking/payment API contract. **Why:** the static-site / no-server-logic constraint —
  the form submits client-side (`mailto:` / `tel:` / free static handler) only.
- ❌ **Server-side PII validation / OWASP server hardening.** No server-side input
  sanitization, no server-side validation pipeline. **Why:** there is no server to
  receive or store PII. Client-side form correctness (required fields, input types,
  accessible labels) is in scope (REQ-REV-003, REQ-REV-005); a server-side security
  layer is not, because there is no server.
- ❌ **Account system / login / member area.** No user accounts, no authentication, no
  logged-in dashboard, no "my applications" area. **Why:** a static site cannot
  authenticate users, and the offline-enrollment model has no need for a member area.
- ❌ **Paid CRM, paid scheduling tool, paid email service provider, paid form service.**
  S6 provisions no paid software. **Why:** the master plan's no-paid-services
  constraint and the one-person budget; the existing free `mailto:`/`tel:` mechanism
  and the free owned retention channels are sufficient.
- ❌ **An AI-coach upsell eval suite / prompt engineering for a trial→paid AI funnel.**
  The master plan Phase 6 lists `llm-eval-designer` and `prompt-engineer` for an
  "AI-coach upsell". The two AI coaches in `site-strategy.yaml#authority_assets`
  (`네다바_자기소개서코치`, `네다바_면접코치`) run on external platforms (ChatGPT /
  지피터스), not on this site. **Why:** there is no on-site AI coach to instrument or
  upsell; building an eval/prompt funnel for an off-site tool would be a funnel-orphaned
  artifact (master plan Section 6.3). Out of scope.
- ❌ **Authoring or redesigning the `/p/` landing-page layout, the 12-section
  template, or the landing copy.** Owned by SPEC-LANDING-001. S6 audits and corrects
  the §9 pricing figures and the JSON-LD `offers` for *accuracy and transparency*; it
  does not restructure the pages or rewrite non-pricing copy.
- ❌ **Authoring the S1–S5 surfaces** — SEO metadata and JSON-LD authoring (S1,
  SPEC-DISCOVERY-001), the free-value content and CTAs (S2, SPEC-FREEVALUE-001), the
  feeds and share cards (S3, SPEC-REACH-001), the PWA / subscription page / analytics
  system (S4, SPEC-REVISIT-001), the resource search (SPEC-SEARCH-001). S6 *links to*
  and *preserves* these; it does not rebuild them.
- ❌ **A new analytics system.** S6 reuses the SPEC-REVISIT-001 cookieless analytics
  and its CTA-click / consult-path-reach events. No second analytics mechanism, no
  paid analytics, no conversion-tracking pixel.
- ❌ **Server-side rendering, edge functions, or any non-static infrastructure.**

## Dependencies

- **Predecessor (hard)**: SPEC-DISCOVERY-001 (S1) — its S1→S2 gate must have passed;
  its frozen public page set is the source the revenue surface page set is derived
  from, and its per-page metadata must be preserved on edited pages.
- **Predecessor (hard)**: SPEC-FREEVALUE-001 (S2) — its S2→S3 gate must have passed;
  the free-value layer is what the retention loop and the "not ready to book" path
  route a visitor back toward.
- **Predecessor (hard)**: SPEC-REACH-001 (S3) — its S3→S4 gate must have passed; the
  feed hub `feeds/index.html` is one of the retention channels S6 links to.
- **Predecessor (hard)**: SPEC-REVISIT-001 (S4) — its S4→S5 gate must have passed; the
  subscription path `newsletter.html` is the primary retention channel S6 links to,
  and the S4 CTA-click / consult-path-reach events are the conversion measurement S6
  reuses.
- **Predecessor (hard)**: SPEC-LANDING-001 (S5) — the five `/p/` landing pages, their
  §9 pricing sections, their §12 신청 흐름 sections, their JSON-LD `Service`/`offers`
  blocks, and the lineup index `/p/index.html` are the pricing-and-offer surface S6
  audits.
- **Strategy SSoT**: `.moai/strategy/site-strategy.yaml` — source of every program's
  `price_krw`, name, persona, duration, cohort size, deliverable, `cta_secondary`
  (the free-consultation CTA label), `conversion_funnel` (including `retention`),
  `voice_rules`, `cta_pattern`, and `identity.contact` (email, phone).
- **Existing infrastructure**: `contact.html` (the lead-capture endpoint, currently a
  `mailto:`-based static form), the five `/p/{slug}.html` pages and `/p/index.html`,
  `newsletter.html` (subscription path), `feeds/index.html` (S3 feed hub), the global
  navigation component, `assets/nedabah.bundle.css`.
- **Tooling**: `htmlhint`, `lychee`, `pa11y-ci`, `lhci` (already in `package.json`
  devDependencies); the JSON-LD validity check; `lychee.toml` for link checking.

## Assumptions

1. SPEC-DISCOVERY-001, SPEC-FREEVALUE-001, SPEC-REACH-001, SPEC-REVISIT-001, and
   SPEC-LANDING-001 are treated as already passed (master plan build-order rule). The
   exact revenue surface is produced by REQ-REV-001 — file names cited in this SPEC are
   observed at authoring time and are not the contract; `revenue-surface.txt` is.
2. `contact.html` at authoring time is framed and titled as a B2B lecture-request page
   (`강의 의뢰·연락`) and uses a `mailto:` form action (`action="mailto:..."`,
   `enctype="text/plain"`). All five `/p/` pages route their free-consultation primary
   CTA and their JSON-LD `offers.url` to `contact.html`. REQ-REV-002 treats the
   mismatch between the lecture-request framing and the free-consultation promise as a
   defect to close. Whether the fix is a section/path within `contact.html` or a
   dedicated consultation-booking page is an implementation decision for the Run phase;
   the existing lecture-request path must be retained either way.
3. The five `/p/` JSON-LD `offers` blocks already exist with `price`/`priceCurrency`/
   `url` fields, and the §9 pricing sections and the lineup-index prices already exist
   with figures that, at authoring time, match `site-strategy.yaml#revenue_lineup`
   (4,000,000 / 3,500,000 / 2,500,000 / 5,000,000 / 6,000,000 KRW). REQ-REV-007 and
   REQ-REV-008 verify and lock that consistency rather than assuming it; if a future
   drift is found the displayed figure is corrected to the SSoT.
4. Under the static-site / no-server-logic constraint, "lead capture" means the
   visitor's information reaching 김창환 directly via the form's client-side mechanism
   (email/phone). The master plan Phase 6 phrase "checkout/application flow completes
   end-to-end" is interpreted as the free-consultation booking path completing
   end-to-end as a static, coherent lead capture; there is no server-side flow,
   datastore, or payment step to complete.
5. The retention mechanism is the S3 feeds and the S4 subscription path; S6 does not
   build a new retention system. The strategy SSoT's `conversion_funnel.retention`
   ("수료 후 동문 커뮤니티 + 사후 상담") is an offline, operator-run mechanism — S6
   only ensures the website's copy about it is honest and that the website links a
   visitor toward the free channels that keep contact alive.
6. Conversion measurement reuses the SPEC-REVISIT-001 S4 events (CTA click,
   consult-path reach). S6 does not author analytics; if the consult-path-reach event
   is not yet wired on the lead-capture endpoint per the S4 scope, REQ-REV-014 verifies
   that wiring is present, treating it as S4 surface coverage rather than new S6 work.
7. The "revenue audit report" is classified as a report and lives under
   `.moai/reports/` (per the SPEC-vs-report classification rule), not under
   `.moai/specs/`. The revenue-surface inventory `revenue-surface.txt` is a per-SPEC
   machine-readable contract and lives alongside the SPEC under
   `.moai/specs/SPEC-REVENUE-001/`.
8. S6 is the final funnel stage; the S6 completion condition is the terminal gate of
   the whole S1–S6 build, not a gate that opens a further stage. There is no S7.

## Lifecycle Note

This SPEC is **spec-anchored**: as long as the five programs are offered, the prices
on the `/p/` pages, the lineup index, and the JSON-LD `offers` must keep equalling the
strategy SSoT; the free-consultation booking path must stay coherent with the CTAs
that feed it; and the retention links must keep resolving. The S6 contract — an
honest, accessible, static lead-capture endpoint, transparent SSoT-true pricing, a
clear lead-to-enrollment path, and a retention loop into the free channels — remains a
standing requirement. Re-running the revenue audit after a price change (e.g. a
`site-strategy.yaml` `revision` entry), a new program, or a redesign of `contact.html`
keeps S6 from regressing into a price mismatch, a misleading `offers` block, or a CTA
that lands a lead on the wrong page — any of which would silently break the final
revenue stage and undercut the S5→S6 continuity the master plan's rubric depends on.
```