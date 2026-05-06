# DEVELOPER.md — 전문 코더 인수인계 가이드

> **5분 안에 이 사이트를 파악하고 작업을 시작할 수 있도록 작성됨.**
> 처음 오신 분은 위에서 아래로 순서대로 읽으세요.

---

## 1. 한 줄 소개

**nedabah.org**는 김창환 강사(네다바웨이)의 강의·교육·코칭 사업 사이트입니다.
정적 HTML5 + Vanilla JS + Python 빌드로 구성되며, GitHub Pages에 배포됩니다.

| 항목 | 값 |
|---|---|
| 도메인 | https://www.nedabah.org |
| 호스팅 | GitHub Pages (자동 HTTPS) |
| 빌드 | Python 3.9 (`_build/publish_v2.py`) |
| 의존성 | npm 0개·pip 최소 (정적 사이트) |
| 라이선스 | (사이트 콘텐츠 — 비공개 / 코드 — 사적) |

---

## 2. 5분 시작 가이드

```bash
# 1. 클론
git clone https://github.com/bebeggogo-byte/nedabahway-site.git
cd nedabahway-site

# 2. 로컬 미리보기 (Python 내장 서버)
python3 -m http.server 8000
# → http://localhost:8000 접속

# 3. 변경 후 빌드 + 검증
python3 _build/publish_v2.py
# (validate → render → search-widget inject → keyword gate)

# 4. 100점 시뮬레이션
python3 scripts/lighthouse_local_v2.py

# 5. 커밋 + 푸시
git add -A
git commit -m "feat(scope): change description"
git push origin main
# → GitHub Pages 자동 배포 (~1분)
```

---

## 3. 디렉터리 지도 (한 화면 보기)

```
nedabahway-site/
├── *.html                        # 메인 페이지 26개 (index·about·programs·...)
├── assets/                       # CSS·JS·SVG (디자인 시스템)
├── blog/perspective/             # 관점 노트 100편 (1만 편 향한 1단계)
├── magazine/                     # 매거진 v2
├── resources/                    # 자료실 (자료 585건, SSoT)
│   ├── _data/                    # 메타 단일 진실 원천
│   │   ├── feed.json             # ★ 핵심 — 모든 자료 메타
│   │   ├── feed-public.json      # 외부 노출용 분리본 (G3)
│   │   ├── search-index.json     # 검색 인덱스 (SPEC-SEARCH-001)
│   │   └── schema.json           # 메타 스키마
│   ├── _build/                   # 자료실 빌드 스크립트
│   │   ├── validate.py           # feed.json 검증 게이트
│   │   ├── render_all.py         # 마스터·콘솔·sitemap 통합 렌더
│   │   ├── search_index_builder.py
│   │   ├── feed_public_split.py
│   │   └── approve.py            # CEO 콘솔 승인 워크플로우
│   ├── _console/                 # 로컬 전용 (.gitignore + robots.txt 차단)
│   ├── worksheets/  evidence/  guides/ ...   # 8개 형식별 자료 디렉터리
├── _build/                       # 사이트 루트 빌드 스크립트
│   ├── publish.py                # 기본 발행 (validate + render)
│   ├── publish_v2.py             # ★ 통합 발행 진입점 (5단계)
│   ├── inject_search_widget.py   # 자료실 검색 위젯 자동 주입
│   └── empty_coordinates.py      # 4축 매트릭스 빈 좌표 추천
├── scripts/                      # 유틸리티
│   ├── lighthouse_local_v2.py    # ★ 100점 시뮬레이션
│   └── check_private_keywords.py # CI 비공개 키워드 게이트
├── .moai/                        # MoAI-ADK 프로젝트 메타
│   ├── project/                  # product.md · structure.md · tech.md
│   └── specs/                    # SPEC 문서 (EARS 형식)
├── .github/                      # GitHub Actions·dependabot
├── _archive_v2/  _archive_magazine_old/   # 옛 버전 보존 (noindex)
├── CLAUDE.md                     # AI 운영 룰 (D25 자료실 IA · 3계층 분리)
├── DEVELOPER.md                  # 이 문서
├── ARCHITECTURE.md               # 시스템 아키텍처 상세
└── lighthouserc.json             # Lighthouse CI 임계값
```

---

## 4. 핵심 개념 4가지 (반드시 이해)

### 4.1 SSoT (Single Source of Truth)
- `resources/_data/feed.json` = 모든 자료 메타의 단일 진실 원천
- 마스터·콘솔·changelog·sitemap·feed 전부 `render_all.py` 1회 호출로 자동 재생성
- **인덱스 페이지 수동 편집 영구 금지** — 데이터만 수정, 빌드는 스크립트가

### 4.2 3계층 분리 (visibility)
| 계층 | 노출 | 자리 |
|---|---|---|
| `public` | 외부 마스터 + sitemap + feed-public.json | 검수 통과한 자료만 |
| `internal` | CEO 콘솔(`_console/`) 로컬 전용 | 신규 자료 기본값 |
| `draft` | 어디에도 안 보임 | 작성 중 |

### 4.3 외부영향 7종 (HAG 승인 필요)
다음 작업은 사용자 명시 승인 없이 자동 실행 금지:
1. 이메일 발송 / 2. 메시지 발송 / 3. 공개 게시 / 4. 결제·정산
5. 계약 / 6. 실물 배송 / 7. 문서 권한 공유

### 4.4 발행 5단계 (publish_v2.py)
```
1. validate    — feed.json 스키마 검증
2. render      — 마스터·콘솔·sitemap 빌드
3. inject      — 자료실 검색 위젯 자동 주입
4. keyword     — 비공개 키워드 게이트
5. commit/push — git (옵션, 외부영향)
```

---

## 5. 자주 하는 작업 5가지

### 5.1 새 자료 1건 추가
```bash
# 1. HTML 작성
vim resources/{wks|tpl|evd|prm|dgn|gid|crt|med}/{YYYY-MM-DD}_{slug}.html

# 2. feed.json에 메타 1줄 추가 (스키마: resources/_data/schema.json)

# 3. 검증·발행
python3 _build/publish_v2.py --commit --push -m "feat(resources): add ${slug}"
```

### 5.2 새 메인 페이지 추가
```bash
# 1. HTML 생성 — 다른 페이지(예: programs.html) 헤드 영역 복사
# 2. 필수 메타: title, description (50~200자), canonical, og:*, JSON-LD
# 3. 필수 CSS: cobalt-tokens-v1.css (head 첫 자리), v3.css
# 4. 필수 JS: a11y-runtime-v1.js, 404-helper-v1.js
# 5. 시뮬레이션: python3 scripts/lighthouse_local_v2.py --page newpage
```

### 5.3 디자인 변경
- 단일 진실 원천: `assets/cobalt-tokens-v1.css` (코발트 강조 #1E40AF)
- 페이퍼 톤: `assets/warm-tone-v1.css`
- 접근성 보정: `assets/a11y-fixes-v1.css`
- 변경 후 `python3 scripts/lighthouse_local_v2.py`로 점수 회귀 검사

### 5.4 관점 노트 1편 추가
```bash
# 1. 빈 좌표 확인
python3 _build/empty_coordinates.py --limit 10

# 2. blog/perspective/{YYYY-MM-DD}_{title}.html 작성
#    - axis 메타 4축: topic·reader·form·emotion
#    - related-posts-v1.js + 404-helper-v1.js 자동 작동

# 3. blog/perspective/_data.json에 메타 1행 추가 + index 재빌드
```

### 5.5 새 SPEC 작성 (DDD)
```bash
mkdir -p .moai/specs/SPEC-NEWFEAT-001
# 3-파일: spec.md (EARS) · plan.md · acceptance.md
# 예시: .moai/specs/SPEC-SEARCH-001/ 참고
```

---

## 6. 코드 컨벤션

### 6.1 파일 명명
- HTML 메인: `kebab-case.html` (예: `iden-onepager.html`)
- 자료 HTML: `YYYY-MM-DD_kebab-slug.html`
- CSS·JS: `feature-name-v1.{css|js}` (버전 명시)
- Python: `snake_case.py`

### 6.2 커밋 메시지 (Conventional Commits)
```
type(scope): subject (lowercase, ≤72자)

본문 (선택, 한국어 OK)

- 변경 1
- 변경 2
```

`type` 표준: `feat`·`fix`·`chore`·`docs`·`style`·`refactor`·`test`·`perf`

### 6.3 브랜치 전략
- `main` — 항상 배포 가능 상태
- 기능 작업은 PR로 (작업자가 1인이라 main 직접 push도 OK)
- pre-commit hook이 commit 메시지 검사 (`--no-verify`로 우회 가능)

### 6.4 Python 스타일
- Python 3.9 호환 (system Python)
- 함수당 ≤30줄 권장
- 타입 힌트 권장 (`from __future__ import annotations`)
- 외부 의존성 최소 (stdlib 우선, Jinja2·feedgen 정도만)

### 6.5 JS 스타일
- Vanilla JS, 의존성 0
- IIFE 패턴 (`(function(){...})()`)
- `'use strict'`
- ES2017+ (async/await OK, ES modules는 선택)
- 외부 호출 0건 (정적 사이트)

### 6.6 CSS 스타일
- CSS 변수 (`--c-cobalt-*`) 사용 권장
- `cobalt-tokens-v1.css`를 단일 진실 원천으로
- 인라인 스타일 사용 시 `style*=` 셀렉터로 오버라이드 가능 (예: `about-color-fix-v1.css`)

---

## 7. 품질 게이트 (PR 전 필수)

```bash
# 1. validate
python3 resources/_build/validate.py    # 0 errors

# 2. lighthouse simulation
python3 scripts/lighthouse_local_v2.py  # 임계값 95 통과

# 3. private keyword check
python3 scripts/check_private_keywords.py --strict

# 4. (선택) 죽은 링크
lychee resources/ blog/ index.html

# 5. (선택) HTML lint
htmlhint "*.html"
```

GitHub Actions가 PR마다 자동 실행:
- `lighthouse-ci.yml` — Performance·A11y·SEO·BP
- `site-quality.yml` — validate·lychee·gitleaks·htmlhint·키워드 게이트

---

## 8. 환경 설정 (Mac M4 가정)

```bash
# 시스템 도구 (선택)
brew install lychee gitleaks
npm install -g htmlhint @lhci/cli

# Python (system 사용)
python3 --version    # 3.9.6 권장
pip3 install -r requirements.txt

# 빌드 검증
python3 _build/publish_v2.py
```

---

## 9. 자주 만나는 문제

| 증상 | 원인 | 해결 |
|---|---|---|
| `validate.py` 89건 fail | feed.json 메타 누락 | `python3 scripts/fix_feed_metadata.py` 또는 수동 |
| 색상이 다르게 보임 | `--copper` 변수 충돌 | `cobalt-tokens-v1.css`가 가장 먼저 로드되는지 확인 |
| 검색 위젯 안 뜸 | resources/index.html 빌드 후 inject 안 됨 | `python3 _build/inject_search_widget.py` |
| 다크모드 깨짐 | `dark-mode-v1.css` 비활성화됨 (사용자 지시) | 그대로 둠 (의도적 비활성화) |
| 404 페이지 안내 약함 | 404.html 직접 수정 어려움 | `assets/404-helper-v1.js`가 동적 보강 |
| 빌드 시 internal 자료가 노출됨 | publisher classifier 우회 | `keyword_gate.py --strict` 사용 |

---

## 10. 확장 자리 (TODO 후보)

- [ ] **D26 학습노트 데이터 누적 부서** — `~/Scripts/agent/`에 신규 부서
- [ ] **메일 구독 시스템** — Stibee 또는 Buttondown 연동 (HAG 1회 승인)
- [ ] **연락 폼 백엔드** — 현재 `mailto:` → Formspree·Tally로 교체 권장
- [ ] **본인 사진 업로드** — about.html hero 영역 (한국 강사 신뢰 신호 G1)
- [ ] **본인 진단 도구** — sgp-workbook의 5문항 인터랙티브 진단 (G6)
- [ ] **CSS 통합** — 13개 외부 CSS → 3~4개 번들 (Lighthouse Perf +)
- [ ] **Service Worker** — 오프라인·재방문 LCP 단축
- [ ] **Cloudflare 프록시** — Brotli + Edge cache (GitHub Pages 한계 우회)

---

## 10.5 일일 작업 자동화 (daily-content-watchdog)

4개 트랙(학습노트·SBM·관점노트·AI작업실)의 일일 작업이 정체되지 않도록 GitHub Actions가 매일 자동 점검합니다.

### 구성요소

- `scripts/check_daily_progress.py` — 4 트랙의 마지막 갱신 시각을 git log/JSON 메타에서 읽어 staleness 판정. 사용법: `python3 scripts/check_daily_progress.py [--json] [--strict] [--threshold-hours N]`
- `.github/workflows/daily-content-watchdog.yml` — 매일 21:00 / 09:00 UTC cron으로 실행. stale 감지 시 `daily-watchdog` 라벨로 GitHub 이슈 자동 생성/갱신, @claude 멘션. 모든 트랙 healthy 복귀 시 자동 close.

### Staleness 임계 (DEFAULT_THRESHOLDS)

| 트랙 | 임계 | 측정 방식 |
|---|---|---|
| 학습노트 | 48h | `learning/_data/notes.json` entries[].date 최신값 |
| SBM | 48h | `sbm-progress.json` updated 필드 |
| 관점노트 | 168h | `blog/drafts/`·`blog/perspective/` git log 최신 커밋 |
| AI작업실 | 336h | `assets/ai-studio/`·`ai.html` git log 최신 커밋 |

### 동작 흐름

1. cron이 watchdog 실행 → `check_daily_progress.py --json` 호출
2. stale 트랙이 있으면 `actions/github-script@v7`이 이슈 open/comment
3. 이슈 본문에 정체 트랙·경과시간·다음 단계 힌트 포함, @claude 멘션
4. Claude가 GitHub 통합으로 자동 응답해 작업 재개
5. 모든 트랙이 임계 안으로 복귀하면 watchdog가 이슈를 자동 close

### 수동 실행

```bash
# 로컬 점검
python3 scripts/check_daily_progress.py

# strict 모드 (stale 시 exit 1)
python3 scripts/check_daily_progress.py --strict

# 임계 조정
python3 scripts/check_daily_progress.py --threshold-hours 24

# Actions 탭 → daily-content-watchdog → Run workflow (수동 트리거)
```

### 이슈 라벨 정책

- `daily-watchdog` — 자동 생성 이슈 식별
- `automation` — 자동화 관련 이슈 묶음

기존 watchdog 이슈가 있으면 새로 만들지 않고 comment + title 갱신만 수행.

---

## 11. 외부 문서·SPEC

- `CLAUDE.md` — 사이트 운영 룰 (D25 자료실 IA·3계층 분리)
- `~/.claude/CLAUDE.md` — 글로벌 영구 지침 (외부영향 7종 등)
- `~/.claude/projects/-Users-thxjx365/memory/MEMORY.md` — 작업 태도 7원칙
- `.moai/project/product.md` — 제품 정의·사용자·KPI
- `.moai/project/structure.md` — 디렉터리 구조 상세
- `.moai/project/tech.md` — 기술 스택·Constitution
- `.moai/specs/SPEC-SEARCH-001/` — 자료실 검색 기능 SPEC (EARS 3-파일)
- `ARCHITECTURE.md` — 시스템 아키텍처 (다음 문서)

---

## 12. 도움 받기

- 사이트 진단 보고서: `git log --oneline | grep audit`
- 운영자: 김창환 (nedabah.way@gmail.com)
- repo 이슈: https://github.com/bebeggogo-byte/nedabahway-site/issues

---

**환영합니다.** 이 사이트는 *한 사람의 일을 다시 디자인하는 짧은 관찰* 1만 편을 향해 가는 시스템입니다. 코드 한 줄도 그 결에 닿게 작업해 주세요.
