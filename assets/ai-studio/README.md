# AI 작업실 v2 — 보조 자산 가이드

`/ai.html` 페이지의 v2 업그레이드 자산. 기존 ai.html 코드를 손대지 않고 추가만 한다.

## 자산 목록

| 파일 | 역할 |
|---|---|
| `bootstrap.js` | 자동 로더 — v2 자산·메타·이중 nav 정리까지 한 줄로 처리 (권장) |
| `v2.css` | 보조 CSS — CTA·카운터·미터·도구바·토스트·블럭⑥·슬라이더·프린트 |
| `v2.js` | 보조 JS — localStorage 영속 / 복사·다운로드·프린트 / 카운터 / 시간 슬라이더 / OG 메타 보강 |
| `block6.js` | ⑥ IDEN×5S 통합 7문항 진단 (자동 마운트) |
| `worksheet-template.html` | 블럭① 출력값을 받아 A4 활동지로 인쇄하는 템플릿 (URL 파라미터 사용) |
| `../og/ai-studio.svg` | OG·트위터 카드 이미지 (1200×630) |

## ai.html에 1줄로 통합하는 방법 (권장 — bootstrap)

`</body>` 바로 앞에 **이 한 줄만** 두면 v2 모든 기능이 자동 로드된다:
```html
<script src="/assets/ai-studio/bootstrap.js" defer></script>
```

bootstrap이 자동으로:
- v2.css·v2.js·block6.js 주입 (중복 차단)
- og·twitter:card 메타 자동 주입
- 이중 네비(`nav.nav` + `nav.gnav` 동시 존재) 자동 정리 — gnav 유지

## ai.html에 직접 link하는 방법 (대안)

`</head>` 앞:
```html
<link rel="stylesheet" href="/assets/ai-studio/v2.css">
<meta property="og:image" content="https://www.nedabah.org/assets/og/ai-studio.svg">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:image" content="https://www.nedabah.org/assets/og/ai-studio.svg">
```

`</body>` 앞:
```html
<script src="/assets/ai-studio/v2.js" defer></script>
<script src="/assets/ai-studio/block6.js" defer></script>
```

## v2 신규 기능

### 1. localStorage 영속 (`nedabah:ai-studio:v2` 키 1개에 통합)
- 5블럭의 모든 입력값·결과를 자동 저장
- 새로고침 시 입력값 복원
- 결과는 "마지막 결과 다시 보기" 버튼으로 복원 (자동 표시되지 않음 — 묵상·진단 결과 자동 노출 방지)

### 2. 도구바 (5블럭 + ⑥ 모두 부착)
- 📋 결과 복사
- ⬇ TXT 다운로드 (`nedabah_{label}_{timestamp}.txt`)
- 🖨 프린트 (`@media print` CSS 적용)
- ↺ 입력 초기화

### 3. 블럭 ④ 정직성 강화
- 실시간 글자수 카운터 (200자 임계)
- 사전 게이트 미터 (짧음 → 보강 권장 → 충분)

### 4. 블럭 ② 강점·결핍 동일 단어 검증
- 같은 단어 입력 시 ⚠️ 경고. 좌표가 빈 곳이 되는 자기 모방 차단.

### 5. 블럭 ⑤ 시간 배분 슬라이더
- 관찰·묵상·사귐 비율을 사용자가 조정 (기본 40·40·20%)
- `window.SBM_RATIO`로 공개

### 6. 블럭마다 보조 CTA + 교차 링크
- "다음 결" 줄에 강의 의뢰·자료실·관점 노트로 가는 동선
- 각 블럭별 관련 자료 2건씩 자동 표시

### 7. 블럭 ⑥ IDEN × 5S 통합 7문항 진단 (신규)
- IDEN 정렬 2문항 + 5S 5문항 = 평균·약축·다음 1주 한 동작 도출
- IDEN 좌표 한 줄(축약형) 자동 생성
- 진단 결과도 localStorage에 영속

### 8. 블럭 ① 활동지 PDF 동선
- 강의 시뮬레이터 결과를 `worksheet-template.html?target=...&topic=...&mins=...&head=...&body=...`로 넘기면 A4 활동지 자동 채움
- 브라우저 인쇄(PDF로 저장) 동선 그대로 사용

## 정직성 정책

- 모든 처리는 클라이언트 측에서만 동작. 서버 전송 0건.
- localStorage는 사용자 자기 브라우저에만 저장됨.
- 입력 초기화 버튼으로 언제든 깨끗이 지움.
- 외부 영향 7종 결(이메일·메시지·결제·계약·실물·공유·공개게시) 0건.

## 다음 결 (Tier E 후속)

- 블럭 ⑥ 결과를 IDEN 1pager에 미리 넣어 PDF로 내보내기
- 블럭 ④ 게이트 결과를 관점 노트 발행 SEED로 자동 변환 (사용자 본인용)
- 블럭 ① 활동지 템플릿에 5S 사이클 다이어그램 SVG 자동 삽입

— 2026-04-30 · 김창환 직업본질연구원 · nedabah.org
