# ME → WE 워크숍 활동지 웹앱 — 인수인계 문서

> 새 Claude 채팅(이 대화 맥락이 없는 세션)에서 이 워크지 웹앱을 **이어서 작업**할 때
> 먼저 이 문서를 읽으세요. 앱이 무엇이고, 어디 있고, 어떻게 고쳐서 배포하는지를 정리했습니다.

---

## 한 줄 요약

셀프리더십·코칭·자기이해·팀빌딩 **인터랙티브 워크숍 활동지**를 담은
**단일 HTML 웹앱**입니다. 빌드 과정 없이 파일 하나로 동작하며, 핸드폰에서 바로 사용합니다.

- **소스 파일**: [`workbook/me-we/index.html`](./index.html) (약 112KB, 순수 HTML+CSS+바닐라 JS 한 파일)
- **라이브 주소**: <https://www.nedabah.org/workbook/me-we/>
- **자매 사례**: `workbook/seogwipo-20260421/index.html` (동일한 standalone 패턴)

---

## 배포 방식 (중요)

- 정적 사이트는 **GitHub Pages**가 담당합니다: `.github/workflows/pages-deploy.yml`
- **`main` 브랜치에 push되면 자동 배포**됩니다. `workbook/` 디렉터리는 배포에서 제외되지 않습니다.
- 배포는 보통 1~2분. Actions 탭의 "Deploy to GitHub Pages" 실행이 성공(success)이면 반영 완료.
- Vercel(`vercel.json`)은 `app/`(별도 Next.js 앱)만 빌드합니다. 이 워크지와는 무관합니다.

### 고쳐서 배포하는 절차
1. `main`에서 새 브랜치를 만든다.
2. `workbook/me-we/index.html`을 수정한다. (파일 하나만 고치면 됨)
3. 커밋 → push → `main`으로 PR 생성.
4. CI 통과 확인 (아래 "CI 주의" 참고 — 이 파일은 대부분의 게이트 범위 밖이라 통과함).
5. `main`에 병합 → Pages 배포 자동 실행 → 1~2분 뒤 라이브 반영.
6. **핸드폰에서 실제로 확인.** (에이전트 샌드박스는 사이트 egress가 막혀 모든 URL이 403 —
   라이브를 직접 못 띄웁니다. 파일이 `main`에 있는지는 GitHub API `get_file_contents`로 확인 가능.)

---

## CI 주의 — 링크 전용(비색인) 유지

이 페이지는 **의도적으로 사이트맵·공개 페이지 목록에 넣지 않은 링크 전용 페이지**입니다.
그대로 두는 것이 안전합니다.

- `sitemap.xml`, `.moai/specs/SPEC-DISCOVERY-001/public-pages.txt`, free-content-corpus 어디에도 없음.
- `funnel-qa.yml` 게이트는 **"sitemap `<loc>` 개수 == public-pages 개수"** 균형을 검사합니다.
- 만약 이 페이지를 사이트맵에 추가한다면, `public-pages.txt`에도 **반드시 함께 추가**하고
  S1 조건(`<main>`, `<header>`, 유효한 JSON-LD, `rel="manifest"` 링크)을 만족시켜야 CI가 통과합니다.
  그럴 계획이 없으면 **손대지 마세요.**
- HTML lint(`funnel-qa.yml`)는 `index.html start.html faq.html glossary.html offline.html p/*.html`만
  검사합니다. 이 워크지는 대상이 아닙니다.

---

## 앱 내부 구조 (수정할 때 참고)

전부 `index.html` 하나 안에 있습니다. `<style>` → 본문 섹션들 → 하단 `<script>` 순서.

### 상태 저장 / 로그인
- 이름 + 숫자 4자리 PIN으로 입장 → localStorage 키 `mewe_<이름>_<PIN>`에 응답 저장.
- "로그인 유지" 체크 시 `mewe_remember` 키에 마지막 로그인 키 저장 → 자동 로그인.
- 저장 헬퍼: `save()`, `setV(k,v)`, `getV(k,d)`. 모든 입력은 자동 저장(디바운스 없음, 입력 즉시).

### 탭/섹션 구조
- `GROUPS` 배열이 상단 탭을 정의: **0부 워밍업 / 1부 ME / 2부 LEAD / 3부 WE / 마무리**.
- 각 활동은 `.activity-section` div이며 id는 `act*` (예: `act0`, `actWheel`, `actGrow`, `actPost`).
- 진행률 판정은 `SECTION_IDS` + `isDone(id)`.

### 주요 진단/인터랙션
- `PS` — 사전 자가진단 16문항(셀프리더십/안전감/소통/동기), 레이더 차트 + 사후 재검.
- `WHEEL` — 라이프 밸런스 휠 16영역 슬라이더 → 실시간 SVG 레이더.
- `STR` / `strLv` — 강점 3단계 토너먼트(대표 강점 5개).
- `SL`(12) 셀프리더십 · `MV`(12) 동기 · `SAFE`(8) 심리적 안전감 · `DISC`(5) 소통유형.
- 영향력의 원(`concerns`), GROW 카드, SBI 인정 카드, 팀 약속 등.

### 시각 리포트 PDF
- `buildReport()`가 `#reportRoot`에 리포트 DOM을 그리고, `exportPDF()`가 이미지→PDF로 변환.
- 라이브러리: **html2canvas 1.4.1 + jsPDF 2.5.1** (CDN). 실패 시 `window.print()`로 폴백.
- 저장 후 **Web Share API**로 카카오톡·이메일 공유(미지원 시 파일 다운로드).

### 외부 의존(CDN) — 핸드폰에 인터넷 필요
- Google Fonts (Noto Sans KR), html2canvas, jsPDF. 전부 CDN 로드.

### 모바일 대응 (이미 적용됨)
- `viewport`(maximum-scale=1), `theme-color`, `apple-mobile-web-app-capable`,
  반응형 그리드(≤520px 1열), 터치 스크롤 탭, 홈 화면 추가 시 앱처럼 동작.

---

## 개발 환경 메모
- GitHub 작업은 **GitHub MCP 툴**로 (이 환경엔 `gh` CLI 없음).
- 도메인: `www.nedabah.org` (CNAME). 샌드박스에서 라이브 사이트 접근 불가(egress 403).
