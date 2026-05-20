# Final Push Plan — to 100% site-side execution

Status: ACTIVE  Date: 2026-05-20

## What's already done (committed in PRs #83, #84)

- Funnel S1–S6 built and deployed (PR #83 merged) — 595 indexable pages, sitemap, JSON-LD, semantic landmarks, PWA, CTA wiring, 6 SPECs, evaluator-active gate.
- Design identity site-wide alignment (cobalt + warm paper, no yellow) — 4 hero pages + shared CSS bundle (918 pages).
- Content accumulation strategy A–G — 50 cluster articles (5 pillars + 45 spokes), glossary 14 terms, FAQ 21 Q&A.
- Marketing: launch newsletter, 12 bespoke OG share cards, 50-item RSS feed.
- Continuous machinery: funnel-qa.yml (gate) + content-health.yml (monitor).
- Google-search infrastructure: author entity page with Person JSON-LD, news-sitemap.xml, image-sitemap extension, Article JSON-LD enriched with wordCount/section/keywords.

## What's still doable site-side (this plan)

### Batch 1 — conversion assets (parallel, disjoint files)

| # | Agent | Output |
|---|-------|--------|
| F-1 | web-content-writer | 5 lead-magnet download pages — one per program, real-value PDF-style HTML download |
| F-2 | web-content-writer | 5-email post-consult nurture sequence (HTML templates the owner can paste) |
| F-3 | web-changelog-writer | Launch press/announcement changelog entry for the 50-article + design wave |

### Batch 2 — search-engine readiness (orchestrator-direct)

| # | Action |
|---|--------|
| F-4 | Search Console + Naver verification scaffolding (file paths, meta-tag placeholder, owner instructions in `.moai/playbooks/`) |
| F-5 | HowTo JSON-LD on procedure articles (12주 절차, 5단계 사이클, 30분 표준형 등) — eligible for rich-result HowTo carousel |
| F-6 | Performance preconnect/prefetch hints in `<head>` for fonts/analytics |

### Batch 3 — final verification

| # | Action |
|---|--------|
| F-7 | Run funnel-qa local check across the full new surface |
| F-8 | Update PR #84 body with the final payload |
| F-9 | Watch CI on remaining checks; merge when green; verify deploy |

## Honest cap

Two items only the owner can complete and they are NOT in this plan because no agent can do them: (a) Search Console / Naver Webmaster submission (requires owner's Google/Naver account), (b) PWA maskable PNG icons (requires image tooling on a tooling-connected machine). The scaffolding (F-4) makes (a) a 5-minute task when the owner is ready.

## Execution order

Batch 1 in parallel now → Batch 2 in parallel while Batch 1 runs → consolidate → Batch 3.
