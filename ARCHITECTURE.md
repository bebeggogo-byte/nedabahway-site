# ARCHITECTURE.md — 시스템 아키텍처

> 정적 사이트의 데이터 흐름·빌드 파이프라인·자동화 시스템 전체 지도

---

## 1. 시스템 한 화면

```
┌──────────────────────────────────────────────────────────────────────┐
│                        nedabah.org 시스템                             │
├──────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   ┌────────────┐         ┌────────────┐         ┌────────────┐      │
│   │   콘텐츠   │  ──→   │   빌드     │  ──→   │   배포     │      │
│   │  (D부서)   │         │ (publish)  │         │ (Pages)    │      │
│   └────────────┘         └────────────┘         └────────────┘      │
│         ↓                      ↓                      ↓              │
│    ~/Scripts/agent/       _build/publish_v2.py    GitHub Pages       │
│    LaunchAgent 11개      .github/workflows/*     www.nedabah.org    │
│                                                                      │
│         ↓ 외부 차단                                                   │
│    classifier·keyword_gate·noindex·placeholder                       │
│                                                                      │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 2. 데이터 흐름 — 자료 1건이 사이트에 노출되기까지

```
[D1~D25 부서] ── 자료 생성 (~/Scripts/agent/{Dn}/articles/)
       ↓
[publisher.classify_visibility()]
   - PRIVATE_KEYWORDS 검사 (제주광역자활센터·견적·계약 등)
   - FORM_FORCED_INTERNAL 검사 (diary·prompt_pack 등)
   - 통과 → public, 실패 → internal
       ↓
[publisher.publish_article()]
   - HTML 생성 → resources/{format}/{date}_{slug}.html
   - feed.json에 메타 append
       ↓
[render_all.py]
   - 마스터 페이지·콘솔·changelog·sitemap 자동 재생성
       ↓
[inject_search_widget.py]
   - 자료실 마스터에 검색 위젯 link 자동 주입
       ↓
[keyword_gate.py]
   - 최종 게이트: feed.json + HTML 본문 BANNED 키워드 검사
       ↓
[git commit + push]
   - LaunchAgent com.nedabah.agent.site_publisher (1시간 주기)
   - 또는 publish_v2.py --commit --push
       ↓
[GitHub Actions deploy-pages.yml]
   - PR: site-quality + lighthouse-ci 검증
   - main: GitHub Pages 자동 배포 (~1분)
       ↓
[www.nedabah.org]
   - HTTPS·gzip·HTTP/2 자동
   - sitemap.xml에 public 자료만 등록
```

---

## 3. 3계층 분리 (visibility) 아키텍처

```
┌─────────────────────────────────────────────────────────────┐
│                    feed.json (585건)                         │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─ public (1건) ─┐  ┌─ internal (584건) ─┐  ┌─ draft ─┐   │
│  │ qa_passed      │  │ 자동 분류 결과       │  │ 작업중  │   │
│  │ 키워드 통과     │  │ noindex placeholder │  │         │   │
│  └────────────────┘  └─────────────────────┘  └─────────┘   │
│         ↓                    ↓                       ↓      │
│   외부 sitemap          CEO 콘솔만                안 보임    │
│   feed-public.json     127.0.0.1:8765                       │
│                                                             │
└─────────────────────────────────────────────────────────────┘

차단 메커니즘 (4중 게이트):
1. publisher.classify_visibility()    — 신규 자료 자동 분류
2. validate.py                         — feed.json 스키마·visibility
3. keyword_gate.py                     — 비공개 키워드 검출
4. <meta noindex>                      — 검색엔진·LLM 차단
```

---

## 4. 빌드 파이프라인 (publish_v2.py 5단계)

```
┌──────────────────────────────────────────────────────────────┐
│  Phase 1: validate (resources/_build/validate.py)            │
│  - feed.json 스키마 검증                                      │
│  - id 중복·필수 필드·visibility·파일 실재                      │
│  - 실패 시 exit 1                                             │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Phase 2: render (resources/_build/render_all.py)            │
│  - 자료실 마스터 카드 그리드                                   │
│  - CEO 콘솔 (_console/index.html)                            │
│  - 8개 형식별 인덱스                                          │
│  - sitemap.xml 자료실 부분                                    │
│  - changelog                                                 │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Phase 3: inject (_build/inject_search_widget.py)            │
│  - resources/index.html에 search-v1.js link 주입             │
│  - 8개 형식별 인덱스에 동일 작업                              │
│  - idempotent (이미 있으면 스킵)                              │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Phase 4: keyword_gate (~/Scripts/agent/site_publisher/)     │
│  - feed.json public 자료 BANNED 키워드 검사                   │
│  - resources/ HTML 본문 검사 (noindex 자동 스킵)              │
│  - --strict 시 exit 1                                         │
└──────────────────────────────────────────────────────────────┘
                            ↓
┌──────────────────────────────────────────────────────────────┐
│  Phase 5: commit + push (옵션, 외부영향 7종)                  │
│  - git add resources/ blog/ assets/ _build/ .moai/           │
│  - git commit with auto-message                              │
│  - git push origin main (GitHub Pages 자동 배포 트리거)      │
└──────────────────────────────────────────────────────────────┘
```

---

## 5. CSS 로드 순서 아키텍처

```
1. <head> 첫 자리
   ┌──────────────────────────────────────────┐
   │ cobalt-tokens-v1.css                     │  ← 단일 진실 원천 토큰
   └──────────────────────────────────────────┘
                  ↓
2. 기본 디자인
   ┌──────────────────────────────────────────┐
   │ v3.css                                   │  ← 기본 컴포넌트
   │ nav-right.css · global-nav.css           │  ← 네비
   │ typography-v4.css · global-fonts.css     │  ← 타이포
   │ mobile-v1.css                            │  ← 반응형
   └──────────────────────────────────────────┘
                  ↓
3. 페이지별 컴포넌트
   ┌──────────────────────────────────────────┐
   │ deck-toggle.css · back-to-top.css        │
   │ snap-deck-v1.css                         │
   └──────────────────────────────────────────┘
                  ↓
4. 톤 + 보정 (마지막 로드 = 가장 강함)
   ┌──────────────────────────────────────────┐
   │ warm-tone-v1.css                         │  ← 페이퍼 톤
   │ a11y-fixes-v1.css                        │  ← WCAG AA 보정
   │ about-color-fix-v1.css (about만)         │  ← 인라인 스타일 우회
   └──────────────────────────────────────────┘
```

---

## 6. JavaScript 아키텍처

```
모든 JS는 외부 의존성 0 + Vanilla + IIFE 패턴

기본 로드 (defer):
- snap-deck-v1.js              데크 페이지 스냅
- back-to-top.js               상단 이동 버튼
- perspective-pager.js         관점 노트 페이저
- a11y-runtime-v1.js           ★ 접근성 자동 보정
- 404-helper-v1.js             ★ 404 발동 시 인기 페이지·검색

조건부 로드:
- related-posts-v1.js          관점 노트 페이지에서만
- resources-search-v1.js       /resources/ 페이지에서만
```

---

## 7. 외부 자동화 (LaunchAgent 11개)

```
~/Library/LaunchAgents/com.nedabah.agent.*

┌──────────────────────────────────────────────────────┐
│ Heartbeat (1분)                                       │
│ - usage_monitor (10분)                                │
│ - keep_awake (caffeinate 상시)                        │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Daily (정해진 시각)                                   │
│ - morning_cockpit (07:00)                            │
│ - ceo_daily (08:00)                                  │
│ - empty_coord_daily (08:30) ★ 빈 좌표 5개 추천       │
│ - daily_research (02:00) — 전부서 자료 생성           │
│ - self_improvement (03:30)                           │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│ Periodic                                              │
│ - site_publisher (1시간) — feed catch-up + push       │
│ - mega_brain (30분)                                  │
│ - daily_briefing (1시간)                             │
│ - fame_income (06:30·12:30·18:30·22:30)              │
└──────────────────────────────────────────────────────┘
```

---

## 8. GitHub Actions 워크플로우 (CI)

```
.github/workflows/
├── lighthouse-ci.yml      ← PR + main + 일일 (cron)
│   └─ Performance·A11y·SEO·BP 측정
├── site-quality.yml       ← PR + main
│   ├─ feed.json validate
│   ├─ render dry-run
│   ├─ lychee 죽은 링크
│   ├─ gitleaks 시크릿 스캔
│   ├─ htmlhint
│   └─ keyword gate
└── deploy.yml (선택)      ← main → GitHub Pages 명시 배포

.github/dependabot.yml      ← 의존성 자동 PR (npm·pip·actions)
```

---

## 9. 4축 매트릭스 시스템 (1만 편 향한 인프라)

```
관점 노트 1편 = 4축 좌표 1개
   topic (10) × reader (8) × form (8) × emotion (8)
   = 5,120 좌표

현재 상태:
   100 / 5,120 (1.95%)   ← 1단계 완료

자동 발견:
   _build/empty_coordinates.py
       ↓
   매일 08:30 (LaunchAgent)
       ↓
   ~/Documents/Obsidian Vault/Nedabah-Brain/00_INBOX/
   └─ {YYYY-MM-DD}_빈좌표추천.md
       ↓
   사용자가 5개 중 1개 선정 → 글 작성
```

---

## 10. SPEC 워크플로우 (DDD)

```
.moai/specs/SPEC-NEWFEAT-001/
├── spec.md         ← EARS 형식 요구사항
│   - Ubiquitous · Event-Driven · State-Driven
│   - Unwanted · Optional
├── plan.md         ← 구현 계획·마일스톤
└── acceptance.md   ← Given-When-Then 시나리오

흐름:
1. /moai:1-plan "기능 설명"     → spec.md·plan.md·acceptance.md 생성
2. /moai:2-run SPEC-XXX-001     → DDD 사이클로 구현
3. /moai:3-sync SPEC-XXX-001    → docs·CHANGELOG·PR 생성
```

---

## 11. 측정·모니터링

```
┌─────────────────────────────────────────────────────┐
│ 로컬 (즉시)                                          │
│ - python3 scripts/lighthouse_local_v2.py            │
│   └─ SEO·A11y·BP·Perf 96.1점 (현재)                  │
│ - python3 _build/publish_v2.py                      │
│   └─ 5단계 통합 검증                                  │
│ - python3 scripts/check_private_keywords.py         │
│   └─ 비공개 키워드 게이트                             │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ CI (자동, GitHub Actions)                            │
│ - lighthouse-ci.yml — PR마다 실측 점수                │
│ - site-quality.yml — 5종 검증 동시                    │
│ - dependabot — 의존성 PR 자동                         │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ 운영 (예정)                                          │
│ - GA4 + Microsoft Clarity                           │
│ - Google Search Console                              │
│ - Naver Search Advisor                               │
│ - Listmonk (메일 구독, HAG 1회 승인 후)               │
└─────────────────────────────────────────────────────┘
```

---

## 12. 보안 아키텍처

```
4중 방어선:
1. publisher.classify_visibility()   — 분류 단계 차단
2. .gitignore                         — repo 진입 차단 (private/, internal/)
3. keyword_gate.py                    — 빌드 단계 검출
4. robots.txt + <meta noindex>        — 외부 노출 단계 차단

CI 보안:
- gitleaks-action                     — PR마다 시크릿 스캔
- dependabot                          — 의존성 취약점 자동 PR

런타임 보안:
- 외부 API 호출 0건 (정적 사이트)
- console.log 0건 (production)
- HTTPS 강제 (GitHub Pages 자동)
```

---

## 13. 확장 포인트

신규 기능 추가 시 다음 자리에 영향이 갈 수 있음:

| 추가 자리 | 영향받는 곳 | 검증 |
|---|---|---|
| 신규 메인 페이지 | sitemap·내부 링크·CSS 토큰·Schema.org | `lighthouse_local_v2.py` |
| 신규 자료 형식 | feed.json schema·publisher.RESOURCE_FORMAT_DIRS·render_all.py | `validate.py` |
| 신규 CSS | 로드 순서·cobalt-tokens 충돌 | 시각 검사 + simulator |
| 신규 JS | 다른 JS와 이름 충돌·이벤트 충돌 | 콘솔 에러 0건 |
| 신규 LaunchAgent | 시간대 충돌·중복 빌드 race | `launchctl list \| grep nedabah` |
| 신규 GitHub Action | Free tier 분 한도 (Public 무제한이라 OK) | Actions 탭 확인 |

---

## 14. 변경 이력 추적

```
git log --oneline 주요 시점:
- 87ac29b0  feat(audit): 71건 진단 일괄 적용
- 0384f671  chore(audit): F6·F8·G3·G10 + about color
- d1b9f5fb  feat(audit-extra): A·B·C·E priority

신규 추가 (이번 세션):
- DEVELOPER.md
- ARCHITECTURE.md
- .github/workflows/{lighthouse-ci,site-quality}.yml
- .github/dependabot.yml
- lighthouserc.json
- scripts/{check_private_keywords,lighthouse_local_v2}.py
```
