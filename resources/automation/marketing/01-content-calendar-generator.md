# 마케팅 자동화 #1 — 30일 콘텐츠 캘린더 자동 생성

> **한 줄 핵심**: 한 달 테마 1줄과 채널 목록만 입력하면, AI가 30일치 콘텐츠 캘린더(블로그·SNS·뉴스레터)를 헤드라인·후크·CTA·해시태그까지 자동 생성해 시트에 적재한다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 콘텐츠 캘린더 작성 | 1~2일 | 5분 |
| 아이디어 고갈 | 자주 | 드묾 (AI가 30개 변주) |
| 채널별 톤 분기 | 누락 빈번 | 자동 |
| 월 절감 | — | **약 12시간/마케터 1인** |

**적용 시나리오**: 1인 운영·SMB 마케팅·에이전시·신규 캠페인 런칭.

## 구성요소

- Google Sheet (입력 + 결과)
- Gemini API
- Apps Script (커스텀 메뉴 + 단일 함수)
- (선택) Notion API — 캘린더 자동 sync

## 셋업 가이드

### Step 1. 시트 4탭 구성
**탭 `input`**:
| 키 | 값 |
|---|---|
| 월 테마 | 5월 — '실전형 사이드프로젝트' |
| 비즈니스 | 1인 코치/컨설턴트 |
| 타깃 | 30대 직장인, 부업 시작 단계 |
| 채널 | 블로그, 인스타그램, 링크드인, 뉴스레터 |
| 톤 | 따뜻하고 단정한, 거품 없는 |
| 시작일 | 2026-05-01 |

**탭 `calendar`**: `날짜 | 채널 | 형식 | 헤드라인 | 후크 | 본문 가이드 | CTA | 해시태그 | 상태`

**탭 `pillars`** (선택, 입력하면 AI가 균형 있게 분배):
| 기둥 |
|---|
| 마인드셋 |
| 실전 케이스 |
| 도구 사용법 |
| 커뮤니티/Q&A |
| 자기 사례 |

**탭 `prompts`** (수정하면 AI 결과가 바뀜): 시스템 프롬프트 텍스트 1셀.

### Step 2. 스크립트 속성
- `SHEET_ID`
- `GEMINI_API_KEY`

### Step 3. Apps Script — 메뉴 추가 후 시트에서 클릭으로 실행.

---

## 완성 코드 (`script.gs`)

```javascript
const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID  = PROPS.getProperty('SHEET_ID');
const GEMINI    = PROPS.getProperty('GEMINI_API_KEY');

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('🤖 콘텐츠 자동화')
    .addItem('30일 캘린더 생성', 'generateCalendar')
    .addItem('선택 행 다시 쓰기', 'regenerateRow')
    .addToUi();
}

function readInputs() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const inp = Object.fromEntries(ss.getSheetByName('input').getDataRange().getValues().slice(1));
  const pillars = ss.getSheetByName('pillars').getRange('A2:A').getValues().flat().filter(Boolean);
  const channels = String(inp['채널']||'').split(',').map(s=>s.trim()).filter(Boolean);
  return {
    theme: inp['월 테마'], business: inp['비즈니스'], target: inp['타깃'],
    channels, tone: inp['톤'], startDate: new Date(inp['시작일']),
    pillars
  };
}

function generateCalendar() {
  const ui = SpreadsheetApp.getUi();
  const i = readInputs();
  if (!i.theme || !i.channels.length) {
    ui.alert('input 탭의 월 테마/채널을 먼저 입력하세요.'); return;
  }

  const prompt = buildMonthPrompt(i);
  const items = callGemini(prompt); // [{date, channel, format, headline, hook, body, cta, hashtags}, ...]

  const cal = SpreadsheetApp.openById(SHEET_ID).getSheetByName('calendar');
  cal.clearContents();
  cal.appendRow(['날짜','채널','형식','헤드라인','후크','본문 가이드','CTA','해시태그','상태']);
  items.forEach(it => cal.appendRow([
    it.date, it.channel, it.format, it.headline, it.hook, it.body, it.cta, (it.hashtags||[]).join(' '), '예정'
  ]));
  ui.alert(`✅ ${items.length}건 생성 완료`);
}

function buildMonthPrompt(i) {
  const pillarLine = i.pillars.length ? `다음 콘텐츠 기둥을 균형 있게 분배: ${i.pillars.join(', ')}` : '주제는 자율적으로 다양화';
  return `
당신은 ${i.business} 도메인의 시니어 콘텐츠 디렉터입니다.
다음 정보로 30일 콘텐츠 캘린더를 작성하세요.

월 테마: ${i.theme}
타깃: ${i.target}
채널: ${i.channels.join(', ')}
톤: ${i.tone}
시작일: ${i.startDate.toISOString().slice(0,10)}
${pillarLine}

규칙:
- 각 채널 특성에 맞춰 톤·형식 분기 (예: 블로그=long, 인스타=짧은 후크+이미지 가이드, 링크드인=인사이트, 뉴스레터=주제 묶음)
- 같은 주제도 채널별 변주
- 날짜는 시작일부터 30일, 하루에 1~2건 배치 (총 약 30~40건)
- 헤드라인은 12~22자, 후크는 1문장, 본문 가이드는 50자 이내, CTA는 명확한 행동 1개, 해시태그 3~6개
- 자기과시·과장 금지

JSON 배열만 반환:
[{"date":"YYYY-MM-DD","channel":"...","format":"long|short|image|reel|email","headline":"...","hook":"...","body":"...","cta":"...","hashtags":["..."]}]
`;
}

function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`;
  const res = UrlFetchApp.fetch(url, {
    method:'post', contentType:'application/json',
    payload: JSON.stringify({
      contents:[{parts:[{text: prompt}]}],
      generationConfig:{responseMimeType:'application/json', maxOutputTokens: 8192}
    })
  });
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
}

function regenerateRow() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sh = ss.getSheetByName('calendar');
  const r  = sh.getActiveCell().getRow();
  if (r === 1) return;
  const row = sh.getRange(r, 1, 1, 9).getValues()[0];
  const [date, channel, format, headline] = row;

  const i = readInputs();
  const prompt = `
다음 한 건만 새로운 변형으로 다시 작성하세요(같은 날짜·채널·형식 유지).
원본 헤드라인: ${headline}
월 테마: ${i.theme}, 타깃: ${i.target}, 톤: ${i.tone}

JSON 단일 객체:
{"headline":"...","hook":"...","body":"...","cta":"...","hashtags":["..."]}
`;
  const o = JSON.parse(JSON.parse(UrlFetchApp.fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`,
    {method:'post', contentType:'application/json',
     payload: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{responseMimeType:'application/json'}})}
  ).getContentText()).candidates[0].content.parts[0].text);

  sh.getRange(r, 4).setValue(o.headline);
  sh.getRange(r, 5).setValue(o.hook);
  sh.getRange(r, 6).setValue(o.body);
  sh.getRange(r, 7).setValue(o.cta);
  sh.getRange(r, 8).setValue((o.hashtags||[]).join(' '));
}
```

---

## 강의 시연 포인트

1. 빈 시트에서 `input` 입력 → 메뉴 한 번 클릭 → 30일치 헤드라인이 30초 내 채워지는 모습
2. 한 행 선택 후 "다시 쓰기" → 같은 주제의 다른 변주 시연
3. 강의 후 워크숍: 학습자가 자기 비즈니스로 직접 시도 — 결과 비교 토론

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 30건 미만 생성 | 토큰 부족 | `maxOutputTokens` 8192 유지 + 프롬프트 단순화 |
| 날짜가 시작일 이전 | AI가 가끔 거꾸로 | 후처리에서 정렬 + 시작일 검증 추가 |
| 채널별 톤 비슷함 | 프롬프트 강조 부족 | 채널별 미니 톤 가이드를 `pillars`에 추가 |
| JSON 깨짐 | 따옴표 이스케이프 | `responseMimeType: 'application/json'` 필수 |

## 응용 아이디어

- **이미지 자동 시안**: 헤드라인을 받아 DALL·E API로 인스타 카드 이미지 자동 생성
- **Notion sync**: Notion DB로 양방향 동기화 → 팀 협업
- **A/B 헤드라인**: 한 행에 헤드라인 2개 생성 → 게시 후 클릭률 시트로 회수
- **계절·트렌드 보강**: 발행일 기준 검색 트렌드(네이버 트렌드) 반영하도록 입력 자동화
