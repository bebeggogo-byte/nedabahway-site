# 자동화 9선 자료 — 공유·배포 전략 플랜

## Context (왜 이 플랜인가)

PR #53로 9선 자동화 강의 자료가 evaluator-active 100/100 PASS 상태가 되었지만, 현재는 "사이트에 올라가 있고 링크를 알아야 접근 가능한 상태". 강사 김창환이 ① 워크숍 참가자 ② 카카오톡·네이버블로그 인입 ③ 잠재 고객사 ④ 1대1 코칭 클라이언트에게 **마찰 없이 자료를 도달**시키고, **초보자도 30초 안에 "이건 내가 할 수 있겠다"** 라는 감각을 갖게 만들 필요가 있다.

사용자 요구는 두 갈래:
1. **초보자에게도 쉽게** — 모바일·KakaoTalk·복사 버튼·진입장벽 낮춤
2. **다양한 배포 방식 검토** — 사이트, 파일, 영상, 뉴스레터, 템플릿 등 + 타사 사례

본 플랜은 **산업 사례 9가지 패턴**을 정리한 뒤, 김창환 1인 운영 맥락에서 **즉시 큰 ROI를 만드는 Phase 1 + 워크숍 자료 키트화 Phase 2 + 채널 확장 Phase 3**의 3단계로 구성한다.

---

## 1. 산업 사례 — 다른 조직은 어떻게 하나

| 패턴 | 대표 사례 | 핵심 메커니즘 | 김창환에 적합? |
|---|---|---|---|
| **A. 공개 웹 + GitHub 리포** | Stripe Docs, Vercel Learn, Anthropic Cookbook, OpenAI Cookbook, Tailwind Docs | HTML 사이트 + Markdown 소스를 동일 리포에 공개. 검색·SEO·fork 모두 |  ✅ 이미 절반 갖춤 (PR이 public repo) |
| **B. 폴리시드 PDF eBook** | HBR Insights, McKinsey Quarterly, BCG Perspectives, Stratechery 단행본 | 30~80p PDF를 메일 게이트 후 발송. 임원 친화 | ✅ "책 발췌 PDF" 패턴이 사이트에 이미 있음 |
| **C. 워크숍 키트 (ZIP)** | IDEO Method Cards, Design Sprint Kit, Atlassian Team Playbook, Liberating Structures | ZIP에 슬라이드·핸드아웃·코드·샘플데이터·진행자가이드 묶음. Google Drive 공유도 흔함 | ✅ 강의 직후 한 링크로 발송 가능 |
| **D. Notion 템플릿 복제** | Linear, Reforge, Maven, 한국 인디크리에이터 다수 | "Duplicate" 버튼 → 사용자 워크스페이스로 복사 | ✅ 한국 직장인 친숙도 매우 높음 |
| **E. 이메일 드립 코스** | Lenny's Newsletter, James Clear, ConvertKit Creator Pass, "Learn X in N days" | 9~14일에 걸쳐 1일 1통, 1개념 1실습 | △ 인프라 작지만 ESP 운영 부담 |
| **F. 영상 강좌 플랫폼** | Inflearn (한국 1위), Udemy, Coursera, Maven Cohort | 30분~5시간 영상, 플랫폼이 결제·스트리밍 처리 | △ 영상 제작 큰 비용, 본 PR 범위 밖 |
| **G. A4 1매 + QR 핸드아웃** | McKinsey/BCG 클라이언트 leave-behind, 컨퍼런스 토크 | 인쇄물 1매에 핵심 + QR → 온라인 전이 | ✅ 오프라인 워크숍에 강력 |
| **H. 마켓플레이스 템플릿** | Make.com Templates, Zapier Templates, Notion Marketplace, Apps Script Workspace Marketplace | 1클릭 설치, 마켓플레이스 SEO | △ 등록 절차·심사 |
| **I. 한국 채널 특화** | KakaoTalk OpenChat, Naver Blog, Brunch, LinkedIn Korea | 카톡 OG 카드·네이버 블로그 발행·LinkedIn 글 | ✅ 카톡 OG 최적화는 즉시 효과 |

### 패턴별 한 줄 결론

- 단단한 무료 강좌의 골격은 **A + C + G** 삼위일체 (웹+키트+한핸드아웃)
- 한국 디지털 직장인 retention은 **D (Notion)**
- 리드젠은 **B (PDF) + E (이메일)**
- 본 PR에서는 A는 이미 충족, 부족한 C·G·I·B·D를 단계별로 채운다

---

## 2. 초보자 페인포인트 (현재 자료가 어려운 이유)

| 페인 | 현재 상태 | 영향 |
|---|---|---|
| 어디서부터? | 9개 카드 동등 노출 | 결정 마비 → 이탈 |
| 코드 복사 번거로움 | 드래그→복사 수동 | 첫 설치에서 좌절 |
| API 키 발급 무엇? | 텍스트만 | 진입 단계에서 멈춤 |
| 내 사례 매칭 안됨 | "어떤 것부터?" 가이드 없음 | 적용 못함 |
| 모바일 가독성 | 데스크탑 우선 디자인 | 카톡 첫 인상 나쁨 |
| 용어 생소 | 트리거·웹훅·HMAC·JSON | 첫 문단부터 막힘 |
| 한 페이지가 길어 끝 못 봄 | 200~370줄 | 중도 이탈 |
| 인쇄·오프라인 안 됨 | 인쇄 시 코드 깨짐 | 종이 학습자 배제 |
| 카톡 미리보기 빈약 | og-default.svg 1장 공용 | 클릭율 낮음 |

---

## 3. 권장 단계별 실행안

### Phase 1 — "먹기 좋은 사이트" (낮은 노력, 최대 효과)

> 1~2일 작업으로 강의·카카오톡 공유 즉시 강화. 가장 큰 ROI.

- **A. 초보자 시작 가이드 블록** — 허브 상단에 "5분 시작 가이드" 카드
  - 결정 트리: "지금 가장 자주 잃는 시간은? → 회의록 / 보고서 / 멘션 모니터링 / 다른 것"
  - 난이도 ★/★★/★★★ + 예상 소요 + 전제조건 (구글 계정/Slack/네이버 키)
  - 9개 카드 위에 "초보자 추천 3선" 띠

- **B. 코드 복사 버튼 + 라인 넘버**
  - 자체 30줄 스크립트 또는 Prism.js 경량 빌드
  - 클릭 → "복사됨" 토스트 (KakaoTalk 모바일에서도 동작)
  - 코드 블록에 좌측 라인 넘버

- **C. 공유 플로팅 바 활성화**
  - `/assets/share-bar.js` 이미 존재(현재 archive만 사용 중)
  - 카카오톡 / 네이버블로그 / X / LinkedIn / 링크복사 버튼 추가
  - 모바일 하단 sticky

- **D. 짧은 URL 리다이렉트**
  - `/auto` → `/resources/automation/`
  - `/auto/1`~`/auto/9` → 각 가이드
  - 카카오톡 구두 공유에 강함 (정적 사이트는 `404.html` 또는 `_redirects` 패턴)

- **E. 자동화 9선 전용 OG 이미지 1장**
  - 1200×630 SVG: "조직 자동화 9선 — 누구나 30분"
  - 카카오톡·LinkedIn·X 미리보기 모두 개선

- **F. 모바일 가독성 점검·튜닝**
  - 가이드 페이지 코드 블록 가로 스크롤 / 폰트 / 표
  - Lighthouse 모바일 점수 측정

- **G. 용어집 1페이지** — `/resources/automation/glossary.html`
  - 트리거·웹훅·HMAC·JSON·Properties·OAuth·RSS·Webhook·Bearer·Idempotency·Cron 등 12~15개를 1줄씩 한국어 설명
  - 가이드 페이지에서 첫 등장 단어를 글로사리로 링크

### Phase 2 — "파일로 받기" (중간 노력, 강의 후 강력)

> 별도 1~2일. 강의·워크숍 직후 한 링크로 자료 패킷 전달.

- **H. PDF 워크북 자동 생성** — Pandoc 또는 WeasyPrint
  - 9개 .md → 1권 통합 PDF (표지·목차·페이지번호)
  - `/resources/automation/automation-9-workbook.pdf`
  - 빌드 스크립트가 이미 있는 `scripts/build-automation-pages.py`와 동일한 입력으로 분기

- **I. ZIP 자료 키트** — `automation-9-kit.zip`
  - 9개 .gs 코드 파일 (마크다운에서 추출)
  - 시트 템플릿 명세 README
  - PDF 워크북 동봉
  - LICENSE + 사용 가이드
  - GitHub Releases 또는 `/resources/automation/automation-9-kit.zip` 정적 서빙

- **J. A4 1매 워크숍 핸드아웃 PDF**
  - 9선 한 장 요약 + 짧은 URL + QR 코드
  - 인쇄 후 강의실 배포 가능 + 카카오톡 미리보기에도 깔끔

- **K. 강의 페이지에 다운로드 CTA**
  - `lectures/business-automation.html` 사이드에 "워크북 PDF / 자료 키트 ZIP / 핸드아웃" 3개 버튼

### Phase 3 — "채널 확장" (선택, 별도 PR)

> 본 PR과 분리. 시간 분배에 따라 순차 진행.

- **L. Notion 템플릿 발행** — 한국 직장인 retention
  - 9선 콘텐츠를 Notion 페이지로 컨버트
  - "복제하기" 공개 링크
  - 워크북 PDF에서 본 사람이 자기 워크스페이스로 가져가는 패턴

- **M. 9일 이메일 코스** — 기존 newsletter 인프라 확장
  - "9일에 1개씩 업무 자동화" 시퀀스
  - 첫날: 회의록 → 9일째: 멘션 다이제스트
  - ConvertKit / Buttondown / MailerLite 또는 Substack

- **N. YouTube 핸즈온 영상 9개 (각 5분)** — Inflearn 시드
  - 영상별 1개 자동화 라이브 셋업
  - 사이트 가이드 페이지 상단에 임베드
  - 추후 Inflearn 무료 미리보기 강의로 재활용

- **O. Apps Script Workspace Marketplace** — 1버튼 설치
  - 가장 매력적이나 등록 심사 절차 큼. 9선이 안정화된 뒤 진행 권장

---

## 4. 본 PR (Phase 1 + 2)에서 만질 파일 목록

| 영역 | 파일 | 변경 형태 |
|---|---|---|
| 허브 상단 시작 블록 | `resources/automation/index.html` | 카드 위에 결정 트리·난이도 띠 추가 |
| 가이드 템플릿 — 복사 버튼·라인 넘버·모바일·OG | `scripts/build-automation-pages.py` (PAGE_TPL) | 템플릿 확장, 빌드 재실행 |
| 9개 가이드 메타 (난이도·소요·전제조건) | `scripts/build-automation-pages.py` (CARDS dict) | 필드 추가 |
| 공유 바 적재 | `lectures/business-automation.html`, 생성된 9개 가이드 HTML | `<script src="/assets/share-bar.js">` 라인 추가 |
| 카카오 공유 버튼 추가 | `assets/share-bar.js` | 새 버튼 (KakaoTalk SDK 또는 단순 share URL) |
| 코드 복사 JS | `assets/code-copy.js` (신규, ~40줄) | 신규 |
| 용어집 페이지 | `resources/automation/glossary.html` (신규) | 신규 |
| 짧은 URL 리다이렉트 | `404.html` 의 client-side redirect 또는 정적 redirect | 사이트 호스팅(GH Pages?) 패턴 확인 후 결정 |
| PDF 워크북 빌더 | `scripts/build-automation-pdf.py` (신규) | Pandoc 또는 WeasyPrint 호출 |
| ZIP 키트 빌더 | `scripts/build-automation-kit.sh` (신규) | .gs 추출 + PDF 동봉 + zip |
| A4 핸드아웃 PDF 빌더 | `scripts/build-automation-handout.py` (신규) | 1페이지 레이아웃 |
| OG 이미지 | `assets/og-automation-9.svg` (신규) | 1장 |
| 강의 페이지 다운로드 CTA | `lectures/business-automation.html` | aside 추가 |
| sitemap | `sitemap.xml` | glossary·PDF·ZIP·short URL·OG 이미지 추가 |
| package.json | `package.json` | (선택) 빌드 스크립트 npm script 등록 |

---

## 5. 재사용 가능 자산 (이미 존재 — 새로 만들지 말 것)

| 자산 | 경로 | 용도 |
|---|---|---|
| 9 SNS 공유 바 | `/assets/share-bar.js` | Phase 1C |
| 인쇄 가드 CSS | `/assets/print-guard.css` | Phase 2 PDF·핸드아웃 |
| 가이드 빌드 템플릿 | `/scripts/build-automation-pages.py` PAGE_TPL | Phase 1B/E 확장 지점 |
| 책 발췌 PDF 패턴 | `/book-excerpt.html` | Phase 2H Schema 모델 |
| 뉴스레터 허브 | `/newsletter.html` | Phase 3M 활용 |
| RSS 피드 | `/blog/perspective/feed.xml` | Phase 3M ESP 백본 |
| PWA 매니페스트 | `/manifest.webmanifest` | Phase 1D 단축키 |
| 워크북 패턴 | `/workbook/seogwipo-20260421/` | Phase 2 H/J 디자인 참고 |

---

## 6. 검증 (verification end-to-end)

### Phase 1 검증
- [ ] 모바일 Lighthouse 점수 측정 (Before vs After). 가독성·접근성 90+
- [ ] 코드 복사 버튼 클릭 → 클립보드에 들어가는지 (모바일 Safari/Chrome 둘 다)
- [ ] 카카오톡으로 9선 허브 URL 공유 → OG 카드 정상 표시 (제목·이미지·설명)
- [ ] 짧은 URL `/auto`, `/auto/1` → 정상 리다이렉트
- [ ] 용어집의 모든 항목이 1줄 한국어로 명확
- [ ] 허브 결정 트리 → 추천 자동화 1개로 안내됨

### Phase 2 검증
- [ ] PDF 워크북: 표지 · 목차 · 9개 가이드 페이지 분할 정상 · 한글 폰트 깨짐 없음
- [ ] ZIP 다운로드 → 압축 해제 → 9개 .gs + PDF + README 포함 검증
- [ ] A4 핸드아웃 인쇄 미리보기에서 한 장에 깔끔하게 들어감 + QR 인식 가능

### Phase 3 검증 (해당 PR 분리 시)
- [ ] Notion 복제 링크를 익명 브라우저에서 클릭 → 복제 가능
- [ ] 첫 캠페인 이메일 발송 테스트 → 받은 편지함에 정상 도착
- [ ] YouTube 영상 임베드 → 가이드 페이지에서 재생

---

## 7. 본 플랜이 의도적으로 포함하지 않은 것

- **Inflearn 유료 강좌 등록** — 영상 제작 큰 비용, 별도 의사결정
- **자체 결제·LMS** — 1인 운영 부담. 의뢰 메일로 충분
- **회원 가입 게이트** — 자료 무료 공개 원칙. 이메일 게이트는 Phase 3M 옵션
- **영문 번역판** — 별도 PR. 한국어 정착 우선
- **번역·다국어 사이트 인프라** — 본 PR 범위 밖

---

## 8. 추천 출시 순서

1. **Phase 1 (A~G, 1~2일)** — 가장 큰 ROI. 카카오톡·블로그 인입 즉시 강화.
2. **Phase 2 (H~K, 1~2일)** — 강의·워크숍 직후 자료 패킷 발송.
3. **Phase 3 (L~O, 별도 PR·시기 분리)** — Notion → 이메일 → 영상 → 마켓플레이스 순.

본 PR은 Phase 1 + Phase 2까지 한 번에 밀어붙일 수 있다. 분량은 `scripts/`에 빌더 3개 추가 + 템플릿 확장 + 자산 1~2개 추가 수준으로 통제 가능. Phase 3는 본질적으로 운영(이메일·영상·마켓플레이스)이라 별도 PR이 맞다.

---

# 부록 — 도구 3개 확장 (claude/tools-extension-3 브랜치)

## Context

PR #54 (도구 9개) 머지 후, 사용자가 chat에서 작성한 4개 baseline 파일(3개 도구 + 1개 카드 스니펫)을
받아 `_baseline/`에 저장했다. baseline은 초안이라 로컬 실제 패턴에 맞춰 검증·수정한 뒤 정확한 위치에
통합해야 한다. 새 도구 3개:

- **mail-reply-drafter** (운영) — 메일 텍스트 + 톤 → 한 줄·짧은·자세한 답장 3종
- **sales-followup** (영업) — 미팅 메모 → 후속 메일 + 다음 단계 3개 + 일정 제안 (메모에 없는 항목은 [확인 필요])
- **resume-screening** (HR) — 공고 + 이력서 → 매칭도 + 강점 3·우려 2(이력서 근거 인용) + 면접 질문 5

## 진행 현황 (이미 완료된 작업)

| 단계 | 작업 | 상태 |
|---|---|---|
| 0 | baseline 4/4 식별·저장 (`_baseline/`) | ✅ |
| 1 | 실제 코드 패턴 파악 (OG 단일파일 9, `tag {plan/hr/mkt}` 클래스) | ✅ |
| 2 | baseline 3개 검증·수정 — markdown 자동링크 11곳, OG 10/11/12 → 9, 색상 #0d6b4e → #b45309, 누락 textarea 복원 | ✅ |
| 3 | 3개 도구 파일 `auto/tools/{slug}/index.html` 배치 | ✅ |
| 4 | `auto/tools/index.html` 신규 섹션 + `tag.ops` `tag.sales` 색상 정의 | ✅ |
| 5 | `sitemap.xml` 3개 URL 추가 (총 217개) | ✅ |
| 6 | 12개 도구 모두 `node --check` PASS | ✅ |
| 8 | `.gitignore`에 `_baseline/` 추가 | ✅ (commit 대기) |

## 남은 작업 (이 ExitPlanMode 후 실행 요청)

1. **commit + push** (브랜치 `claude/tools-extension-3`)
   - 추가: `auto/tools/{mail-reply-drafter,sales-followup,resume-screening}/index.html`
   - 수정: `.gitignore`, `auto/tools/index.html`, `sitemap.xml`
2. **PR 생성** (base=main, head=claude/tools-extension-3)
3. **PR 머지** (squash, 사용자 동의 시) → 1~3분 후 라이브

## 중요 결정 기록

- **OG 이미지**: 기존 도구 9개가 모두 `og-automation-9.svg` 단일 파일 공용. baseline이 부여한 10/11/12는 존재하지 않으므로 모두 9로 통일.
- **색상 팔레트**: baseline의 `#0d6b4e` (녹색)는 사이트 팔레트(`#b45309` accent)와 충돌. 모두 사이트 색상으로 교체.
- **새 카테고리 태그**: `운영`, `영업` 두 카테고리는 기존 `plan/hr/mkt`에 없어 새 색상 클래스(`.tag.ops`, `.tag.sales`) 추가.
- **자동화 가이드 매칭**: 3개 도구 모두 `resources/automation/` 안에 매칭되는 자동화 가이드가 없으므로 `automation_meta.py` 수정은 SKIP. `next-aside`는 "향후 추가됩니다" 안내로 작성.
- **baseline 보존**: `_baseline/`은 .gitignore에 추가해 PR에 포함되지 않도록 함.

## 검증 결과

- `python3 -c "import xml.etree.ElementTree as ET; ET.parse('sitemap.xml')"` → 217 URLs valid
- 12개 도구 인라인 script `node --check` → 12/12 PASS
- `grep markdown autolink 잔존` → 0 (모두 수정됨)
- `grep og-automation-(10|11|12)` → 0 (모두 9로 교체됨)
- 카드 인덱스에 새 카드 3개 정상 노출

브라우저 시연 (Step 7)은 환경에 chromium 없어 SKIP. 실제 동작은 머지 후 라이브에서 확인.
