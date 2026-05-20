# 네다바웨이 사이트 구조 재기획 (v2)

작성: 2026-05-20
브랜치: claude/site-structure-redesign
대상: 정적 HTML + app/(Next.js) 혼합 사이트 nedabah.org

---

## 1. 현재 상태 진단

### 1.1 규모 (실측)

- 루트 HTML: **45개** — 그 중 **11개(28%)는 stub/redirect** (66줄·2.9KB 동일 템플릿)
- 컨텐츠 디렉토리: magazine 409 · blog 354 · resources 1,286 · learning 95 · auto 25 · lectures 14 · 기타
- 아카이브: `_archive_v2/` 16 · `_archive_magazine_old/` 6 · `_build/` 2 — **삭제 정책 없음**
- 별도 시스템: `app/` Next.js 코칭 SaaS — 정적 사이트와 분리 운영

### 1.2 4가지 핵심 통증

| # | 통증 | 근거 |
|---|------|------|
| ❶ | **stub 클러터** | 11개 동일 redirect 페이지(`blueprint.html`, `company.html`, `story.html`, `iden-onepager.html`, `iden-proposal.html`, `portfolio.html`, `facilitation.html`, `work.html`, `guide-github-mcp.html`, `sgp-workbook.html`, `swarm.html`) — 검색 인덱스 오염, UX 혼란 |
| ❷ | **nav 불일치** | 페이지마다 메뉴 다름: about에만 `/p/` 노출, activities/voices만 `활동 기록`/`한 마디` 추가, index는 별도 `.nav-links` 시스템 사용 |
| ❸ | **발견 불가 영역** | blog 354개·studio/admin·`/p/` 모두 메인 nav에서 진입로 없음. URL 추측·외부 링크로만 접근 가능 |
| ❹ | **자동화 시스템 고립** | activities/voices/recommend/studio/admin 5개 페이지가 폐쇄 루프로 작동하지만 홈/콘텐츠 허브에 진입로 없음 |

### 1.3 추가 마찰

- **resources/ 1,286개 비조직화** — 템플릿·스크립트·진단·큐레이션·워크시트 혼재, 카테고리 인덱스 없음
- **magazine(409) vs blog(354)** — 둘 다 일자별 아카이브, 사용자가 구분 불가
- **`/p/`(프로그램 카탈로그) vs programs.html(제안서 생성기)** — 같은 도메인 두 진입, 상호 링크 없음
- **archive 정책 부재** — 무엇을 언제 왜 보관하고 언제 삭제하는지 기준 없음

---

## 2. 목표 정보 구조 (v2)

### 2.1 새 Top-Level Navigation

5개 항목 + 1 CTA. 모든 페이지가 동일 메뉴.

```
[로고]   강의·코칭   콘텐츠   활동기록   소개      [강의 의뢰 →]
```

| 메뉴 | 진입 페이지 | 포함 자원 |
|------|-------------|-----------|
| **강의·코칭** | `/programs.html` (개편) | programs · coaching · /p/ (5개 프로그램) · lectures · book |
| **콘텐츠** | `/content.html` (확장) | magazine · blog · learning · resources · faq · glossary · keywords |
| **활동기록** | `/activities.html` | activities · voices · recommend (외부 진입 CTA) |
| **소개** | `/about.html` | about · org · cases · timeline · iden |
| **강의 의뢰** (CTA) | `/contact.html` | — |

### 2.2 페이지 4분류 정책

| 분류 | 정의 | 처리 |
|------|------|------|
| **L1 허브** | nav에 직접 노출되는 5+1 페이지 | 일관 디자인, gnav 표준화 |
| **L2 페이지** | L1 허브에서 링크되는 콘텐츠 페이지 | 카테고리별 인덱스 + 카드/리스트 |
| **L3 깊은 콘텐츠** | magazine/blog/resources 개별 글 | breadcrumb + 관련 콘텐츠 위젯 |
| **숨김 도구** | studio · admin | nav 미노출, noindex, footer에 작은 링크만 |

### 2.3 URL/redirect 정책

11개 stub은 `vercel.json` redirects로 통합 → 파일 삭제 → SEO 권한 보존:

```
blueprint.html, company.html, story.html, iden-onepager.html → /about.html (301)
facilitation.html, work.html                                  → /programs.html (301)
portfolio.html, iden-proposal.html                            → /cases.html (301)
guide-github-mcp.html, sgp-workbook.html, swarm.html          → /resources/ (301)
```

stub 파일들이 가지고 있던 OG 태그·canonical 메타데이터는 redirect 대상 페이지에서 흡수.

---

## 3. 사이트맵 (v2)

```
nedabah.org/
├── /                           [HOME] index.html — 브랜드 + IDEN + 빠른 진입
│
├── /programs.html              [L1] 강의·코칭 허브
│   ├── /coaching.html          [L2] 1:1 코칭 Bondi
│   ├── /p/                     [L2] 5개 프로그램 카탈로그 (career/teacher/starcp/5s/changjig)
│   ├── /lectures/              [L2] 강의 자료
│   ├── /book.html, book-excerpt.html [L2] 책 소개
│   └── /cases.html             [L2] 기관 케이스 (소개 카테고리와 양쪽 노출)
│
├── /content.html               [L1] 콘텐츠 허브 — 4개 채널 카드
│   ├── /magazine/              [L2] 매거진 (일자별 자동 피드, 409건)
│   ├── /blog/                  [L2] 블로그 (354건, 신규 노출)
│   ├── /learning/              [L2] 학습 노트 (인물별, 95건)
│   ├── /resources/             [L2] 자료실 (카테고리 인덱스 추가, 1286건)
│   │   ├── /resources/templates/      (분류 추가)
│   │   ├── /resources/automation/
│   │   ├── /resources/diagnostics/
│   │   ├── /resources/worksheets/
│   │   └── /resources/curation/
│   ├── /faq.html               [L2] FAQ
│   ├── /glossary.html          [L2] 용어집
│   ├── /keywords.html          [L2] 키워드 인덱스
│   └── /newsletter.html        [L2] 뉴스레터
│
├── /activities.html            [L1] 활동 기록 허브
│   ├── /voices.html            [L2] 받은 한 마디 모음
│   ├── /recommend.html         [L2/공개 폼] 한 마디 남기기
│   ├── /timeline.html          [L2] 12개월 활동 타임라인
│   └── /press/                 [L2] 언론 보도
│
├── /about.html                 [L1] 소개 (대표·조직·전문성)
│   ├── /about.en.html          [L2] English version
│   ├── /org.html               [L2] 비영리 단체 정보
│   ├── /iden.html              [L2] IDEN 프로그램 개요
│   └── /cases.html             [L2] 기관 사례 (강의·코칭 허브와 양쪽 노출)
│
├── /contact.html               [CTA] 강의 의뢰 폼
│
├── (숨김 도구)
│   ├── /studio.html            [TOOL] 본인 전용 활동 기록 도구 — 단축키 + 사진 업로드
│   └── /admin.html             [TOOL] 추천글 승인 + QR 코드
│
├── (유틸리티)
│   ├── /404.html · /offline.html · /privacy.html · /subscribed-thanks.html
│   └── /diagnosis.html · /discover.html · /start.html
│
└── (특수 페이지 — 검토 후 정리)
    ├── /ai.html (39KB) · /sbm.html (28KB) · /support.html — 콘텐츠 허브 흡수 검토
    └── /korea-seo.html — SEO 페이지 (유지)

(별도 시스템)
└── /app/                       Next.js 코칭 SaaS (Phase 1 베타)
    └── 정적 사이트와 정보적 연결 추가: programs.html에 "온라인 코칭 보드" 카드 추가
```

---

## 4. 통합 네비게이션 컴포넌트

### 4.1 단일 진실의 nav HTML

모든 L1/L2 페이지에 동일 nav 블록 사용. 현재 `/assets/global-nav.css` 의 `.gnav` 시스템을 강화하여 한 곳에서 관리:

```html
<nav class="gnav" role="navigation" aria-label="주요 메뉴">
  <div class="gnav__inner">
    <a href="/" class="gnav__logo">네다바웨이</a>
    <button class="gnav__toggle" type="button" aria-label="메뉴">≡</button>
    <ul class="gnav__links" id="gnavLinks">
      <li><a href="/programs.html" class="gnav__link">강의·코칭</a></li>
      <li><a href="/content.html"  class="gnav__link">콘텐츠</a></li>
      <li><a href="/activities.html" class="gnav__link">활동기록</a></li>
      <li><a href="/about.html"    class="gnav__link">소개</a></li>
      <li><a href="/contact.html"  class="gnav__cta">강의 의뢰 →</a></li>
    </ul>
  </div>
</nav>
```

활성 페이지 표시는 페이지별로 `class="gnav__link is-active"` 1개만 다르게.

### 4.2 자동 적용 스크립트

`/assets/js/gnav-inject.js` 작성. 빌드 시 또는 런타임에 모든 페이지에 nav 블록 주입. 현재 페이지 URL에 따라 자동 active. 변경은 nav-template만 수정하면 사이트 전체 일괄 반영.

---

## 5. 단계별 로드맵

### Phase 1 — 안전한 정리 (이 PR)

목표: 외부 사용자에게 안 보이게 stub 제거, nav 일관성 확보.

- [ ] **stub 11개 → vercel.json redirects 변환 + 파일 삭제**
- [ ] **gnav 표준 컴포넌트 정의** (`assets/templates/gnav.html` + `assets/js/gnav-inject.js`)
- [ ] **L1 5개 페이지(index, programs, content, activities, about) nav 통일**
- [ ] **활동기록 시스템(activities/voices/recommend) 메인 nav 편입**
- [ ] **사이트맵 갱신** (`sitemap.xml`)

위험: 낮음. 외부 링크가 stub URL을 가리킬 가능성은 redirect로 보호.

### Phase 2 — 콘텐츠 허브 강화 (별도 PR)

- [ ] `content.html` 재설계 — magazine·blog·learning·resources 4개 채널 카드 + 최신 글 위젯
- [ ] `resources/` 카테고리 인덱스 5개 생성 (templates/automation/diagnostics/worksheets/curation)
- [ ] `blog/` 메인 nav 노출 (현재 미연결 → 발견 가능)
- [ ] `magazine` vs `blog` 차별화 카피 작성

위험: 중간. resources 1,286개 분류는 콘텐츠 검토 동반.

### Phase 3 — 프로그램 영역 통합 (별도 PR)

- [ ] `programs.html` 재설계 — coaching + /p/ + lectures + book + cases 카드 묶음
- [ ] `coaching.html` 과 `app/` Next.js 코칭 보드 정보적 링크
- [ ] `/p/` 5개 프로그램 페이지 카드 디자인 통일

위험: 중간. programs.html(115KB)이 큰 파일이라 점진 교체 필요.

### Phase 4 — 정보 가지치기 (별도 PR)

- [ ] `_archive_v2/`, `_archive_magazine_old/`, `_build/` 정책 수립 후 처리
- [ ] `ai.html`(39KB), `sbm.html`(28KB) — 콘텐츠 허브 흡수 또는 독립 유지 결정
- [ ] 특수 페이지(discover·diagnosis·start) 분류·정리

위험: 낮음~중간. 데이터 손실 없는 정책 결정 작업.

### Phase 5 — Supabase 자동화 부트스트랩 (보류된 작업 재개)

지난 메시지에서 시작했다가 보류한 자동 셋업. 사이트 구조가 정리된 후 진행하는 것이 더 안전.

- [ ] Vercel 빌드 단계에서 env → supabase-config.js 자동 생성
- [ ] bootstrap.html (또는 config-helper) — 사용자 입력 → 검증 → 셋업

---

## 6. 측정 지표

업그레이드 전후 비교 가능 항목:

| 지표 | 현재 | 목표 (Phase 1 완료 후) |
|------|------|------------------------|
| 루트 HTML 파일 수 | 45 | 34 (-11 stub) |
| nav 표준 준수 페이지 비율 | 약 70% | 100% |
| 메인 nav에서 발견 가능한 페이지 비율 | 약 30% | 90%+ |
| 자동화 시스템 진입로 | 0 (직접 URL) | 5+ (nav 노출) |

---

## 7. 결정 필요 사항 (사용자 확인)

1. **nav 5개 메뉴 (강의·코칭 / 콘텐츠 / 활동기록 / 소개 / 강의의뢰)** — 동의/수정?
2. **blog 노출 정책** — 콘텐츠 허브에 묶을지, 별도 메뉴 항목으로 둘지?
3. **stub 11개 삭제 + redirect** — 진행 OK?
4. **Phase 1만 이 PR에서, 이후 Phase는 별도 PR** — 동의?
5. **archive 디렉토리** — 보존/삭제 어느 쪽?

---

Version: 1.0.0 (draft)
Next: 사용자 검토 → Phase 1 실행
