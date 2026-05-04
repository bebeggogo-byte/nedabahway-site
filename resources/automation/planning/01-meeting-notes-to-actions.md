# 기획 자동화 #1 — 회의록 → 액션아이템 자동 정리

> **한 줄 핵심**: 회의록 Google Doc 한 장을 던지면, AI가 의사결정·할일·담당자·기한을 추출해 Sheet에 적재하고 Slack에 발송한다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 회의록 정리 시간 | 30~60분/회 | 0분(트리거만) |
| 액션아이템 누락률 | 30~50% | <5% |
| 담당자 통보 지연 | 평균 2일 | 즉시 |
| 주간 회의 기준 연 절감 | — | **약 130시간/팀** |

**적용 시나리오**: 주간 팀회의 / 임원회의 / 프로젝트 스탠드업 / 1on1 정리.

## 구성요소 (모두 무료 또는 매우 저렴)

- Google Docs (회의록 원본)
- Google Sheets (액션아이템 적재)
- Google Apps Script (실행 엔진)
- Gemini API — `gemini-2.5-flash` 무료 티어 (15 RPM)
- Slack Incoming Webhook (선택)

총 비용: **월 0원** (소규모 팀 기준).

## 셋업 30분 가이드

### Step 1. 시트 만들기
1. 새 Google Sheet 생성 → 이름: `회의록-액션아이템`
2. 1행에 헤더 추가:
   `회의일 | 회의명 | 결정사항 | 액션아이템 | 담당자 | 기한 | 상태 | 원본링크`
3. URL에서 시트 ID 복사 (`/d/{여기}/edit`).

### Step 2. Gemini API 키 발급
1. <https://aistudio.google.com/apikey> 접속
2. **Create API key** → 키 복사 (한번만 노출됨)

### Step 3. Slack Webhook (선택)
1. <https://api.slack.com/apps> → Create New App → From scratch
2. Incoming Webhooks 활성화 → 채널 선택 → Webhook URL 복사

### Step 4. Apps Script 붙여넣기
1. Google Sheet에서 **확장 프로그램 → Apps Script**
2. `script.gs` 내용 붙여넣기 (아래)
3. **프로젝트 설정 → 스크립트 속성**에 다음 추가:
   - `GEMINI_API_KEY` = (발급받은 키)
   - `SHEET_ID` = (시트 ID)
   - `SLACK_WEBHOOK` = (선택)
4. **트리거 추가**: `onMeetingDocOpen` → 시간 기반 → 매일 오전 9시
   또는 **Docs 메뉴에서 직접 실행**(아래 `installDocMenu` 사용)

### Step 5. 회의록 작성 규칙 (사용자 약속)
- 문서 첫 줄: `회의명: 주간 마케팅 회의 / 2026-05-04`
- 본문은 자연어 그대로 작성 (별도 양식 불필요)
- 작성 완료 후 메뉴 **🤖 자동화 → 액션아이템 추출** 클릭

---

## 완성 코드 (`script.gs`)

```javascript
/**
 * 회의록 → 액션아이템 자동 정리
 * 사용: Google Docs에서 메뉴 [자동화 → 액션아이템 추출] 클릭
 */

const PROPS = PropertiesService.getScriptProperties();
const GEMINI_KEY = PROPS.getProperty('GEMINI_API_KEY');
const SHEET_ID   = PROPS.getProperty('SHEET_ID');
const SLACK_HOOK = PROPS.getProperty('SLACK_WEBHOOK') || '';

function onOpen() {
  DocumentApp.getUi()
    .createMenu('🤖 자동화')
    .addItem('액션아이템 추출', 'extractActions')
    .addToUi();
}

function extractActions() {
  const doc  = DocumentApp.getActiveDocument();
  const text = doc.getBody().getText();
  const url  = doc.getUrl();

  const ui = DocumentApp.getUi();
  ui.alert('처리 중', 'AI가 회의록을 분석합니다. 10~20초 소요됩니다.', ui.ButtonSet.OK);

  const result = callGemini(text);
  appendToSheet(result, url);
  if (SLACK_HOOK) postToSlack(result, url);

  ui.alert('완료', `${result.actions.length}개 액션아이템을 시트에 적재했습니다.`, ui.ButtonSet.OK);
}

function callGemini(meetingText) {
  const prompt = `
다음 회의록에서 정보를 추출하세요. JSON만 반환하세요(설명 없이).

회의록:
"""
${meetingText.slice(0, 30000)}
"""

JSON 스키마:
{
  "meetingName": "회의명",
  "meetingDate": "YYYY-MM-DD",
  "decisions": ["결정사항1", "결정사항2"],
  "actions": [
    {"task":"액션내용","owner":"담당자","due":"YYYY-MM-DD 또는 빈문자열"}
  ]
}

규칙:
- 담당자는 회의록에 등장한 사람만 사용. 추정 금지.
- 기한이 명시되지 않으면 빈문자열.
- 결정사항과 액션아이템은 다르다(결정=합의, 액션=실행).
`;

  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({
      contents: [{parts: [{text: prompt}]}],
      generationConfig: {responseMimeType: 'application/json'}
    })
  });
  const json = JSON.parse(res.getContentText());
  const content = json.candidates[0].content.parts[0].text;
  return JSON.parse(content);
}

function appendToSheet(result, docUrl) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheets()[0];
  const decisionsStr = result.decisions.join(' | ');
  result.actions.forEach(a => {
    sheet.appendRow([
      result.meetingDate || new Date().toISOString().slice(0,10),
      result.meetingName || '',
      decisionsStr,
      a.task,
      a.owner || '',
      a.due || '',
      '대기',
      docUrl
    ]);
  });
}

function postToSlack(result, docUrl) {
  const lines = result.actions.map((a,i) =>
    `${i+1}. *${a.task}* — ${a.owner || '미지정'}${a.due ? ` (~${a.due})` : ''}`
  ).join('\n');
  const text = `📝 *${result.meetingName}* 회의 요약\n\n*결정사항*\n• ${result.decisions.join('\n• ')}\n\n*액션아이템*\n${lines}\n\n🔗 ${docUrl}`;
  UrlFetchApp.fetch(SLACK_HOOK, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify({text})
  });
}
```

---

## 강의 시연 시나리오 (10분)

1. 강사가 미리 준비한 가짜 회의록 Doc 오픈
2. 메뉴 [🤖 자동화 → 액션아이템 추출] 클릭
3. 15초 대기 → Sheet에 5~7행 자동 추가되는 모습 시연
4. Slack 채널에 자동 발송된 카드 시연
5. 잘못된 행을 직접 수정하며 "AI는 보조, 사람은 검토" 메시지 강조

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `Cannot read properties of undefined` | Gemini 응답이 JSON이 아님 | 프롬프트 끝에 "JSON만 반환" 강조 + `responseMimeType` 확인 |
| 한국어 담당자 이름 깨짐 | UTF-8 처리 실패 | Apps Script v8 런타임 사용 (기본값) |
| 시트에 빈 행만 추가 | `actions` 배열 0개 | 회의록이 짧거나 액션이 없는 경우, 정상 동작 |
| Gemini 429 에러 | 무료 티어 분당 한도 초과 | `Utilities.sleep(4500)` 호출 사이 추가 |

## 응용 아이디어 (강의 후반 토론용)

- **임원 회의 보안 강화**: Sheet ID를 권한 그룹으로 잠그고 Slack은 비공개 채널만
- **다국어 회의**: 프롬프트에 `"답변은 회의 원문 언어로"` 추가
- **CRM 연동**: 액션의 `owner`가 영업일 경우 Salesforce/HubSpot Task로 자동 생성
- **음성 회의록**: Google Meet 녹화 → Whisper API 전사 → 본 스크립트로 연결
