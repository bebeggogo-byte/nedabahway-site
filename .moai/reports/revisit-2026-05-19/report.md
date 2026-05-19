# S4 Re-visit Audit Report

```yaml
spec_ref: SPEC-REVISIT-001
funnel_stage: S4 (노출 빈도)
audit_date: 2026-05-19
phase: AUDIT + FIX
gate_status: PARTIAL — environment-verifiable conditions pass; icon/Lighthouse blocked
```

## 1. Summary

S4 turns single discoveries into repeated exposure: a PWA shell with offline
support, site-wide cookieless analytics measuring the funnel, and a coherent
newsletter path. All software work is implemented; one gate condition is
blocked by the headless environment.

## 2. Findings and fixes

| REQ | Finding | Fix | Status |
|-----|---------|-----|--------|
| REQ-RV-005/006/008 | No site-wide service worker | Created `sw.js` (network-first nav, versioned cache, old-cache cleanup) + `offline.html` fallback | FIXED |
| REQ-RV-002 | Manifest valid but icon-thin | Manifest validated; all required keys present | FIXED |
| REQ-RV-003 | No maskable raster PNG icons (192/512) | **UNMET** — no image tooling (rsvg/ImageMagick/Inkscape) in this environment; `scripts/build-pwa-icons.sh` + `assets/PWA-ICONS-TODO.md` document the step | BLOCKED |
| REQ-RV-004/007/009 | Manifest link / SW reg / analytics inconsistent (~17 pages) | Wired into all 595 public pages + subscribed-thanks.html via an idempotent patcher | FIXED |
| REQ-RV-011/012/013 | Funnel events not instrumented | 4 events (page view, CTA click, consult-path reach, subscribe) wired non-blocking; documented in `events.md` | FIXED |
| REQ-RV-014..017 | Newsletter path incoherent, subscribed-thanks stale English | Newsletter value prop + S2/S3 links confirmed; subscribed-thanks rewritten in Korean; footer link on 5 entry pages | FIXED |

## 3. S4 → S5 gate status

| # | Condition | Status |
|---|-----------|--------|
| 1 | PWA installable (manifest + maskable raster icons + Lighthouse PWA audit) | **BLOCKED** — raster icons need image tooling; Lighthouse needs Chrome |
| 2 | Offline support works | Code in place; functional browser test deferred |
| 3 | PWA wired site-wide (100%) | PASS — 595/595 pages |
| 4 | Analytics measures the funnel (4 events) | PASS |
| 5 | Analytics non-blocking | PASS — try/catch + feature guards |
| 6 | Subscription path coherent | PASS |
| 7 | Zero S1/S2/S3 regression | PASS — additive-only changes |
| 8 | Audit report exists | PASS — this report |

**Verdict:** S4 passes every condition verifiable in this environment. Condition
1 is blocked the same way S1's Lighthouse check is — it requires tooling
(image rasterizer, Chrome) absent from a headless cloud container. Running
`scripts/build-pwa-icons.sh` and a Lighthouse pass in a tooling-equipped
environment (or CI) closes condition 1.
