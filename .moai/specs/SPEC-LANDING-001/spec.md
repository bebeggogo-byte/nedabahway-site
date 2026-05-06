# SPEC-LANDING-001 — 5개 라인업 랜딩페이지 시스템

```yaml
spec_id: SPEC-LANDING-001
title: 5개 수익 카테고리 랜딩페이지 시스템 (개별 5 + 라인업 1)
version: 1.0.0
created: 2026-05-04
status: near-complete
status_audit: 2026-05-06
status_note: "AC-1/2/3 검증 통과. AC-4(authority sourcing), AC-5(gnav 프로그램 링크), AC-6(전 페이지 CTA) 미검증."
owner: 김창환 (네다바웨이)
strategy_ref: .moai/strategy/site-strategy.yaml
tags: [landing, conversion, b2c, b2b, product-launch]
```

## Goal

신생 브랜드 네다바웨이의 5개 수익 카테고리(STARCP / IDEN-Teacher / IDEN-Career / 창직 / 5S 리더십)를 각각 단독 전환 가능한 랜딩페이지로 출시한다.

## EARS — 기능 요구사항

### REQ-LD-001 라인업 진입점
The system **shall** provide a single lineup index page at `/p/index.html` listing all 5 revenue categories with title, target persona, price, cohort/format, and one-line value proposition.

### REQ-LD-002 개별 랜딩페이지 표준 구조
The system **shall** render each individual landing page at `/p/{slug}.html` following the 12-section template defined in `.moai/strategy/site-strategy.yaml#landing_section_template`.

### REQ-LD-003 카피 핸드오프 마커
Each copy block intended for Claude.ai prose refinement **shall** carry a `data-copy="COPY-{PAGE}-{SECTION}-{N}"` HTML attribute on the wrapping element and **shall** be referenced in `.moai/copy-handoff.md` either by exact ID or by per-page family pattern (e.g., `COPY-STARCP-*`). The CI gate `copy-marker-coverage` enforces ≥85% coverage and **shall** fail the build when undocumented markers exceed the threshold.

### REQ-LD-004 권위 자산 단일 출처
All authority claims (제주 99%, 제주도청, 책 출간 등) **shall** reference `.moai/strategy/site-strategy.yaml#authority_assets` — copy must not invent unverified facts.

### REQ-LD-005 전환 CTA 일관성
Every page **shall** end with a single primary CTA leading to free 30-min consultation, with a secondary CTA to lineup or related category page.

### REQ-LD-006 디자인 토큰 재사용
All pages **shall** import `/assets/nedabah.bundle.css` and use existing cobalt token variables — no inline color values for brand-critical elements.

### REQ-LD-007 SEO 메타데이터
Each page **shall** include canonical URL, OpenGraph tags, JSON-LD `Service` schema with `@id`, `name`, `provider`, `offers.price` (KRW), `audience`.

### REQ-LD-008 글로벌 네비게이션 연결
The global nav (`gnav` component) on lineup and individual pages **shall** include a "프로그램" entry pointing to `/p/`.

### REQ-LD-009 보이스 규칙 준수
All copy **shall** comply with `voice_rules.forbidden` and `voice_rules.required` in site-strategy.yaml — Claude.ai prose review is mandatory before publication.

### REQ-LD-010 접근성
Every page **shall** maintain ≥85% Lighthouse accessibility score, semantic landmarks (`<main>`, `<nav>`, `<section>` with `aria-label`), and alt text for all decorative images.

## Acceptance Criteria

| ID | Criterion | How to Verify |
|----|-----------|---------------|
| AC-1 | 5 individual pages + 1 lineup index exist | `ls /home/user/nedabahway-site/p/` returns 6 .html files |
| AC-2 | Each page has 12 sections | grep `<!-- §` count = 12 per page |
| AC-3 | All copy markers traceable | `.moai/copy-handoff.md` references every `<!-- COPY-` marker |
| AC-4 | Authority claims sourced | every authority claim maps to an `id` in site-strategy.yaml |
| AC-5 | gnav updated | "프로그램" link appears in /p/ pages and at minimum index.html |
| AC-6 | Free consultation CTA on all 6 pages | grep finds primary CTA on each |

## Non-Goals (현재 SPEC 범위 외)

- 결제 시스템 연동 (이메일·전화 신청 우선)
- Astro 마이그레이션 (별도 SPEC)
- 다국어 지원 (한국어 우선)
- 관점 노트 데이터화 (별도 SPEC)
- 책 출간 일정 확정 (사장님 결정 후 별도 갱신)

## Out of Band

- 사장님 사진/프로필 이미지 자산
- 수료생 후기 (1기 종료 후 추가)
- 가격 결제 플로우 (1기는 수동 안내)

## Dependencies

- `assets/nedabah.bundle.css` (디자인 토큰)
- `assets/global-fonts.css`, `global-nav.css`
- `.moai/strategy/site-strategy.yaml` (전략 정북)
- 기존 페이지 스타일 참조: programs.html (B2B), about.html, sbm.html

## Migration Note

이 SPEC은 정적 HTML로 1차 출시 후, 별도 SPEC-SITE-ASTRO-001에서 Astro Content Collections로 마이그레이션 예정. 현재 단계에서는 중복 마크업을 감수하고 즉시 출시 우선.
