# HR 자동화 #2 — 휴가 신청 슬랙 승인 워크플로우

> **한 줄 핵심**: 직원이 Google Form에 휴가를 신청하면, 팀장 슬랙에 "승인/반려" 버튼 카드가 가고, 승인 시 캘린더·연차 잔여 시트가 자동으로 갱신된다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 신청→승인 평균 시간 | 2~3일 | 평균 30분 |
| 연차 잔여 계산 오류 | 종종 발생 | 즉시 갱신·검증 |
| 팀 캘린더 누락 | 흔함 | 자동 등록 |
| HR 인보크 횟수/주 | 많음 | 거의 0 |

**적용 시나리오**: 연차·반차·재택근무 신청·외근 등록.

## 구성요소

- Google Form (휴가 신청)
- Google Sheet (응답 + 잔여 잔고 + 마스터)
- Google Calendar (전사 휴가 캘린더)
- Slack App (Bot Token + Block Kit) — `chat.postMessage` + `chat.update`
- Apps Script Web App (Slack 인터랙션 콜백 수신)

## 셋업 가이드

### Step 1. Google Form
필수 질문:
1. 이름 (단답)
2. 직원 이메일 (단답, "응답을 기록할 수 있도록 이메일 수집"으로 자동 채움 권장)
3. 종류 (객관식: 연차 / 반차 오전 / 반차 오후 / 재택)
4. 시작일 (날짜)
5. 종료일 (날짜)
6. 사유 (장문)
7. 팀장 이메일 (단답)

응답 → 시트로 연결.

### Step 2. 시트 추가 탭 만들기
**탭 `balances`**: `이메일 | 연초잔고 | 사용 | 잔여`
**탭 `team_lead_slack`**: `팀장이메일 | slack_user_id` (Slack 멤버 ID; @팀장 → 옵션 → 멤버 ID 복사)

### Step 3. Slack App 설정
1. <https://api.slack.com/apps> → 새 앱 → Bot Token Scopes:
   `chat:write`, `chat:write.public`, `users:read`, `users:read.email`
2. **Interactivity & Shortcuts** ON → Request URL = (Apps Script Web App URL — Step 5에서 받음)
3. Bot User OAuth Token 복사 → Apps Script 속성 `SLACK_BOT_TOKEN`

### Step 4. Apps Script 속성 등록
- `RESPONSE_SHEET_ID`
- `CALENDAR_ID` (전사 캘린더 ID — 캘린더 설정에서 복사)
- `SLACK_BOT_TOKEN`

### Step 5. 트리거 + Web App 배포
1. 트리거: `onFormSubmit` → 폼 제출 시 실행
2. **배포 → 새 배포 → 웹 앱** → 누구나 접근 가능 → URL 복사 → Slack App의 Interactivity Request URL에 붙여넣기

---

## 완성 코드 (`script.gs`)

```javascript
const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID  = PROPS.getProperty('RESPONSE_SHEET_ID');
const CAL_ID    = PROPS.getProperty('CALENDAR_ID');
const SLACK_TOK = PROPS.getProperty('SLACK_BOT_TOKEN');

// ─────────────────────────────────────────────
// 1) 폼 제출 시: 팀장 슬랙으로 승인 요청 카드 발송
// ─────────────────────────────────────────────
function onFormSubmit(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const responses = ss.getSheets()[0]; // 폼 응답 시트
  const lastRow = responses.getLastRow();
  const row = responses.getRange(lastRow, 1, 1, responses.getLastColumn()).getValues()[0];

  const [ts, email, name, type, start, end, reason, leadEmail] = row;
  const days = calcDays(type, start, end);

  // 잔여 확인
  const bal = getBalance(email);
  if (type === '연차' && bal && bal.remaining < days) {
    notifyApplicant(email, `잔여(${bal.remaining}일)보다 신청(${days}일)이 큽니다. HR에 문의하세요.`);
    return;
  }

  const slackUid = lookupTeamLeadSlack(leadEmail);
  if (!slackUid) {
    notifyApplicant(email, `팀장 Slack ID 미등록. HR에 알려주세요.`);
    return;
  }

  const payload = {
    channel: slackUid,
    text: `${name}의 ${type} 신청이 도착했습니다`,
    blocks: [
      {type:'header', text:{type:'plain_text', text:`📋 ${name} - ${type} 신청`}},
      {type:'section', fields: [
        {type:'mrkdwn', text:`*기간*\n${fmt(start)} ~ ${fmt(end)} (${days}일)`},
        {type:'mrkdwn', text:`*잔여(연차기준)*\n${bal? bal.remaining: '—'}일`},
      ]},
      {type:'section', text:{type:'mrkdwn', text:`*사유*\n${reason || '—'}`}},
      {type:'actions', block_id: `req_${lastRow}`, elements: [
        {type:'button', style:'primary', text:{type:'plain_text', text:'승인'},
         value: JSON.stringify({row: lastRow, action: 'approve'}),
         action_id: 'approve'},
        {type:'button', style:'danger',  text:{type:'plain_text', text:'반려'},
         value: JSON.stringify({row: lastRow, action: 'reject'}),
         action_id: 'reject'}
      ]}
    ]
  };
  const r = slackPost('chat.postMessage', payload);
  // 메시지 ts 저장하여 추후 update
  responses.getRange(lastRow, responses.getLastColumn()+1).setValue(`${r.channel}|${r.ts}|대기`);
}

// ─────────────────────────────────────────────
// 2) Slack 인터랙션 콜백: 버튼 눌림 처리
// ─────────────────────────────────────────────
function doPost(e) {
  const payload = JSON.parse(e.parameter.payload);
  const action = payload.actions[0];
  const value = JSON.parse(action.value);
  const userName = payload.user.name;

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheets()[0];
  const row = sheet.getRange(value.row, 1, 1, sheet.getLastColumn()).getValues()[0];
  const [ts, email, name, type, start, end, reason, leadEmail] = row;
  const days = calcDays(type, start, end);

  let resultText;
  if (value.action === 'approve') {
    // 캘린더 등록
    CalendarApp.getCalendarById(CAL_ID).createAllDayEvent(
      `${name} ${type}`, new Date(start), new Date(new Date(end).getTime()+86400000)
    );
    if (type === '연차') updateBalance(email, days);
    notifyApplicant(email, `✅ ${type} 승인되었습니다. (${fmt(start)} ~ ${fmt(end)})`);
    resultText = `✅ ${userName} 님이 ${name}의 ${type} *승인* 했습니다.`;
  } else {
    notifyApplicant(email, `❌ ${type} 신청이 반려되었습니다. 팀장과 협의해주세요.`);
    resultText = `❌ ${userName} 님이 ${name}의 ${type} *반려* 했습니다.`;
  }

  // 슬랙 메시지 갱신 (버튼 제거)
  slackPost('chat.update', {
    channel: payload.channel.id, ts: payload.message.ts,
    text: resultText,
    blocks: [
      ...payload.message.blocks.filter(b => b.type !== 'actions'),
      {type:'context', elements:[{type:'mrkdwn', text: resultText}]}
    ]
  });

  return ContentService.createTextOutput('ok');
}

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────
function calcDays(type, start, end) {
  if (type.indexOf('반차') >= 0) return 0.5;
  if (!end) return 1;
  const ms = new Date(end) - new Date(start);
  return Math.max(1, Math.round(ms / 86400000) + 1);
}
function getBalance(email) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('balances');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === email) {
      return {row: i+1, initial: data[i][1], used: data[i][2], remaining: data[i][3]};
    }
  }
  return null;
}
function updateBalance(email, days) {
  const bal = getBalance(email); if (!bal) return;
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('balances');
  sh.getRange(bal.row, 3).setValue((bal.used||0) + days);
  sh.getRange(bal.row, 4).setValue((bal.initial||0) - ((bal.used||0)+days));
}
function lookupTeamLeadSlack(leadEmail) {
  const sh = SpreadsheetApp.openById(SHEET_ID).getSheetByName('team_lead_slack');
  const data = sh.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) if (data[i][0] === leadEmail) return data[i][1];
  return null;
}
function notifyApplicant(email, text) {
  GmailApp.sendEmail(email, '[휴가 신청 알림]', text);
}
function slackPost(method, body) {
  const r = UrlFetchApp.fetch(`https://slack.com/api/${method}`, {
    method: 'post', contentType: 'application/json; charset=utf-8',
    headers: {Authorization: `Bearer ${SLACK_TOK}`},
    payload: JSON.stringify(body)
  });
  return JSON.parse(r.getContentText());
}
function fmt(d) { return new Date(d).toISOString().slice(0,10); }
```

---

## 강의 시연 포인트

1. 강사가 폼 제출 → 30초 내 팀장(강사 본인) Slack에 카드 도착
2. "승인" 버튼 클릭 → 캘린더·시트가 동시 갱신, Slack 카드 본문도 즉시 업데이트
3. 잔여 부족 시나리오: 연차 잔여를 0으로 미리 세팅한 직원의 신청이 자동 차단되는 모습 시연

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 슬랙 카드 미수신 | Bot이 채널/DM에 미초대 | 팀장 DM은 `users:read` 후 `slackUid`를 정확히 (U… 형식) |
| `doPost`가 동작 안 함 | Web App 배포가 "본인만"으로 됨 | "누구나"로 재배포, 새 URL을 Slack App에 갱신 |
| 캘린더 권한 오류 | `CALENDAR_ID`가 비공개 | 캘린더 공유 → 스크립트 실행 계정에 변경 권한 부여 |
| 메시지 update 실패 | 30초 안에 응답 못함 | 메시지 처리는 `doPost`에서 즉시 `ok` 반환, 무거운 작업은 별도 함수로 분리 |

## 응용 아이디어

- **2단계 승인**: 팀장 → 임원 두 단계가 필요한 경우 `state` 컬럼으로 단계 관리
- **연차 자동 적립**: 매월 1일 트리거로 `balances`에 비례 적립 자동 추가
- **공휴일 보정**: `calcDays`에서 공공API(공휴일 RSS)로 주말·공휴일 제외
- **이상 신청 감지**: 같은 직원이 단기간 반복 신청할 때 HR에 부드러운 알림
