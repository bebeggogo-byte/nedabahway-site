# Revenue Audit Report — SPEC-REVENUE-001
Date: 2026-05-19
Status: PASS

## REQ-REV-001 — Revenue surface enumeration
PASS. revenue-surface.txt created at .moai/specs/SPEC-REVENUE-001/revenue-surface.txt.

## REQ-REV-002 — Free-consultation booking path coherence
PASS. contact.html has consultation as first section (#consult) and lecture as second (#lecture). H1: "무료 30분 상담. 또는 강의 의뢰." Gnav updated to "상담 신청 →". All /p/ offers.url now point to contact.html#consult.

## REQ-REV-003 — Lead-capture form static and low-friction
PASS. mailto: action, no server. Email nedabah.way@gmail.com and phone 010-6642-7749 visible. Fields: 성함/이메일/관심트랙 (required), 전화번호/현재상황 (optional). No account/login/payment fields.

## REQ-REV-004 — Booking expectations explicitly stated
PASS. Info box states: free consultation, Google Meet 30min, 3-day response, offline payment. Form hint and application flow reinforce offline enrollment.

## REQ-REV-005 — Accessibility
PASS. All labels associated (for/id). Required fields have required+aria-required. Optional fields not required. Submit has aria-label. Honeypot: aria-hidden, tabindex=-1, off-screen.

## REQ-REV-006 — Pricing present on every page
PASS. All 5 /p/ pages show concrete KRW price in §9. /p/index.html shows prices on cards and in comparison table.

## REQ-REV-007 — Every price equals SSoT
PASS. STARCP 400만/4000000, IDEN-teacher 350만/3500000, IDEN-career 250만/2500000, changjig 500만/5000000, 5s-leadership 600만/6000000. Zero mismatches.

## REQ-REV-008 — JSON-LD offers valid and accurate
PASS. All 5 pages: @type Offer, price=SSoT, priceCurrency=KRW, url=contact.html#consult. No contradiction with visible price.

## REQ-REV-009 — JSON-LD does not misrepresent online purchase
PASS. offers.url points to consultation section, not checkout. No checkout page exists. InStock indicates availability for booking, consistent with offline-enrolled coaching.

## REQ-REV-010 — Lead-to-enrollment path explained
PASS. 4-step flow in contact.html#consult: form → reply → meet → offline payment. /p/ §12 sections consistent.

## REQ-REV-011 — Pricing copy honest and voice_rules-compliant
PASS. No coercive tone, no fake discounts, no countdowns. Scarcity reflects real cohort_size. Concrete numbers and proper nouns throughout.

## REQ-REV-012 — Retention loop connects
PASS. contact.html#consult links to /newsletter.html and /feeds/index.html with no-commitment framing. Alumni copy consistent with SSoT conversion_funnel.retention.

## REQ-REV-013 — Retention links resolve; S3/S4 untouched
PASS. Links present. No S3/S4 files modified.

## REQ-REV-014 — S6 reuses S4 events, no duplicate analytics
PASS. analytics.js fires consult-reach on contact.html. No new analytics added.

## REQ-REV-015 — No S1-S5 regression
PASS. Only changes: contact.html gnav label; /p/ offers.url anchor. All metadata/manifest/analytics/layout preserved.

## S6 Completion Gate: PASS
All 10 gate conditions satisfied.
