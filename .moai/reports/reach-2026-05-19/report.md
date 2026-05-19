# S3 Reach Audit Report

```yaml
spec_ref: SPEC-REACH-001
funnel_stage: S3 (무료 홍보 확산)
audit_date: 2026-05-19
phase: AUDIT + FIX (diagnosis and remediation in one pass)
gate_status: PASS (environment-verifiable conditions)
```

## 1. Summary

S3 widens free content reach through feeds, share imagery, and bounded
bilingual wiring. The audit found three defects; all are fixed.

## 2. Findings and fixes

| REQ | Finding | Fix | Status |
|-----|---------|-----|--------|
| REQ-REACH-003 | `magazine/feed.xml` valid RSS but **zero items** | Populated with the 50 most recent magazine articles (RFC-822 dates, absolute links, guid) | FIXED |
| REQ-REACH-006 | `blog/perspective/` articles and `iden/notes/` carried **no feed autodiscovery** | Added `<link rel="alternate">` (RSS/Atom/JSON) to 107 content pages | FIXED |
| REQ-REACH-008/009 | 22 public pages had **no `og:image`** | Every public page now resolves an `og:image` (bespoke or `/assets/og-default.svg` fallback) with full share-card metadata | FIXED |
| REQ-REACH-011/012 | `hreflang` was **one-directional** (about.en.html only) | Added the reciprocal `hreflang` set (ko/en/x-default) to about.html | FIXED |

## 3. Feed inventory (REQ-REACH-001)

| Feed | Format | Items | Valid |
|------|--------|-------|-------|
| magazine/feed.xml | RSS 2.0 | 50 | yes |
| iden/feed.xml | RSS 2.0 | 5 | yes |
| blog/feed.xml | RSS 2.0 | 4 | yes |
| blog/perspective/feed.xml | RSS 2.0 | 50 | yes |
| blog/perspective/feed.atom | Atom 1.0 | 50 | yes |
| blog/perspective/feed.json | JSON Feed | 50 | yes |
| resources/feed.json | JSON Feed | 532 | yes |

All feeds are valid documents with non-empty channels.

## 4. Bilingual reach (REQ-REACH-010)

Frozen at `.moai/specs/SPEC-REACH-001/english-variants.txt`: the bilingual scope
is deliberately bounded to `about.html ↔ about.en.html`. The rest of the site
(blog/perspective, magazine, /p/, resources) stays Korean-only — S3 does not
commit the site to becoming fully bilingual.

## 5. S3 → S4 gate status

Environment-verifiable conditions **PASS**: all feeds valid and non-empty;
feed autodiscovery wired; 100% og:image coverage; reciprocal hreflang; feeds
hub in sitemap; no S1/S2 regression; this report committed.

Deferred to a network-connected environment: external link resolution inside
feeds (`npm run links`). The internal feed URLs were statically confirmed to
resolve.
