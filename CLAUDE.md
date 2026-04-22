# 네다바웨이 사이트 · Claude 운영 지침

1인 교육기업 네다바웨이(nedabah.org)의 정적 사이트. GitHub Pages 호스팅.

## 우선 읽을 것
- 조직도와 자율 루프 프로토콜: `.claude/agents/README.md`
- 전체 사업·디지털 구조 기획: `plan.md`

## 개발 원칙
- **정적 HTML/CSS/JS만**. 빌드 시스템(React/Vite/Next/Astro 등) 도입 금지.
- **두 톤 분리 유지**:
  - 다크 (브랜드 정면): `index.html`, `company.html`, `programs.html`, `blueprint.html`, `facilitation.html`, `story.html`, `portfolio.html`, `iden.html`, `iden-proposal.html`, `admin.html`
  - 라이트 잡지 (읽기): `blog/**`, `resources/**`
- **CTA 단일 경로**: 모든 문의는 `index.html#contact` (Formsubmit.co)로 수렴. 다른 경로 만들지 않는다.
- **외부 의존 최소**: Pretendard + Noto Serif CDN 외 신규 추가 금지.

## 자율 운영

새 작업은 기본적으로 **자율 루프**를 따른다:
1. `chief` — 목표 1문장
2. `strategist` — 스프린트 분해
3. 실무 부서(editor/researcher/producer/designer/engineer) — 병렬 실행
4. `qa` — 검수
5. `chief` — 머지·배포
6. `strategist` — 회고·개선안
7. 다음 사이클

부서 정의: `.claude/agents/*.md`

## 금지 목록
- 빌드 시스템, 유료 SaaS, 가짜 트래픽, 클릭베이트 제목
- 두 톤(다크/라이트) 혼합
- 이모지·외부 아이콘 폰트(SVG 인라인만)
- 임의의 신규 CTA 경로
- 개인·기관 실명 노출(동의 확인 전까지 익명)

## 배포
- 브랜치: `claude/fix-website-issues-lEVBw`에서 작업 → PR(draft) → 검토 후 main 병합 → GitHub Pages 자동 배포
- 도메인: nedabah.org (CNAME 파일로 고정)
