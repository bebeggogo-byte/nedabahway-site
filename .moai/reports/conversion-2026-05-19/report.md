# S5 Conversion Audit Report

```yaml
spec_ref: SPEC-LANDING-001
funnel_stage: S5 (유입 전환)
audit_date: 2026-05-19
phase: AUDIT + FIX (path B — code-based)
design_route: path B (Claude Design path A unavailable in headless env)
gate_status: PASS (path-B scope); 3 authority claims flagged for owner
```

## 1. Summary

S5 turns warm visitors into leads via the 5 `/p/` revenue landing pages. The
pages were already near-complete (12-section template, JSON-LD, consultation
CTAs). S5 completed the three open acceptance criteria from SPEC-LANDING-001
via path B (code-based) — Claude Design path A could not run in this headless
environment (no design MCP tooling).

## 2. Acceptance criteria

| AC | Item | Result |
|----|------|--------|
| AC-4 | Authority claims trace to `site-strategy.yaml#authority_assets` | PASS with 3 flags (below) |
| AC-5 | Program links in navigation | PASS — global-nav `/p/` link present on entry pages; sibling cross-link strip added to all 5 `/p/` pages |
| AC-6 | Every landing page ends with one primary consultation CTA | PASS — all 5 verified |

## 3. AC-4 — flagged authority claims (owner decision needed)

These claims have a supported core but assert a detail not present in the
strategy SSoT. They were NOT deleted — the SSoT may simply be incomplete. The
owner (김창환) should either confirm the detail (and add it to
`site-strategy.yaml#authority_assets`) or soften the copy.

1. `p/iden-teacher.html` §5 — "학교·가정용 워크시트와 30가지 자가진단을 책에 부록으로 수록": the book is confirmed in the SSoT, the appendix-content detail is not.
2. `p/iden-career.html` §5 — "부록 30가지 자가진단 수록": same — appendix detail not in the SSoT.
3. `p/5s-leadership.html` §5 — "사내 강사 8명 대상 한 워크숍씩 완성": the SSoT records "P 공공기관 퍼실 양성 8차시"; the "8명" mapping is an elaboration not stated.

## 4. Design route note

The master plan assigns S5 design to `/moai design` path A (Claude Design). The
design MCP servers (`pencil`, `claude-in-chrome`) are runtime-provided and are
not connected in this headless cloud session, so path A could not execute.
Path B (code-based, conservative polish within the existing design system) was
applied per the master plan fallback. A full path-A Claude Design pass on the
5 landing pages remains available in a design-tooling-connected environment.

## 5. S5 → S6 gate status

Path-B conversion wiring is complete: all 5 landing pages cross-linked,
CTA-complete, authority-audited. The 3 flagged claims are the only open item
and need the owner, not code. Functional checks (WCAG AA, Core Web Vitals,
end-to-end booking-form submission) require a browser environment and are
deferred to CI / a tooling-connected pass — the same environment boundary as
S1 Lighthouse and S4 PWA icons.
