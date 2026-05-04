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
1. 트리거 1: `onFormSubmit` → 폼 제출 시 실행 (Apps Script 트리거 메뉴에서 추가)
2. 트리거 2: 스크립트 편집기에서 **`installApprovalTrigger`** 함수를 1회 실행 → 권한 동의 후 설치형 onEdit 트리거가 등록됨 (단순 트리거가 아니어야 GmailApp/CalendarApp 호출 가능)
3. **배포 → 새 배포 → 웹 앱** → 실행: 본인 / 액세스: 누구나 → URL 복사 → Slack App의 Interactivity Request URL에 붙여넣기

> **왜 트리거가 두 개인가**: Slack은 인터랙션 응답을 3초 안에 받지 못하면 사용자에게 오류를 노출합니다. 따라서 `doPost`는 sheet 상태만 갱신하고 즉시 응답하며, 캘린더 등록·연차 차감·신청자 메일은 sheet 변화를 감지하는 별도 설치형 트리거가 비동기로 처리합니다.

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
//
// Slack은 Interactive payload에 대한 HTTP 응답을 3초 안에 받지 못하면
// "This app took too long to respond" 오류를 노출한다. 따라서 doPost는
// (a) 빠른 sheet 상태 갱신만 수행하고 (b) 즉시 Slack에 message 교체 응답을
// 반환한다. 캘린더 등록·연차 잔여 갱신·신청자 메일은 sheet 상태 컬럼을
// 감시하는 설치형 onEdit 트리거(`onApprovalStatusChange`)에서 비동기로
// 처리한다. 이 분리가 라이브 시연 안정성의 핵심이다.
// ─────────────────────────────────────────────
function doPost(e) {
  const payload = JSON.parse(e.parameter.payload);
  const action = payload.actions[0];
  const value = JSON.parse(action.value);
  const userName = payload.user.name;

  const ss = SpreadsheetApp.openById(SHEET_ID);
  const sheet = ss.getSheets()[0];
  const lastCol = sheet.getLastColumn();
  const row = sheet.getRange(value.row, 1, 1, lastCol).getValues()[0];
  const [ts, email, name, type] = row;

  // 멱등성 가드: 이미 처리된 행이면 무시 (사용자가 메시지를 새로고쳐 두 번 누르는 경우 방지)
  const meta = String(row[lastCol - 1] || '').split('|');
  if (meta[2] && meta[2] !== '대기') {
    return jsonResponse({text: `이미 ${meta[2]} 처리된 신청입니다.`, response_type: 'ephemeral'});
  }

  // sheet의 마지막 컬럼(`channel|ts|상태`)을 갱신 — onApprovalStatusChange 트리거가 이 변화를 감지해 무거운 작업을 수행
  const decided = value.action === 'approve' ? '승인' : '반려';
  sheet.getRange(value.row, lastCol).setValue(`${meta[0]||payload.channel.id}|${meta[1]||payload.message.ts}|${decided}|${userName}`);

  // 즉시 Slack에 message 교체 응답 — chat.update API 호출 불필요 (왕복 시간 절약)
  const resultText = decided === '승인'
    ? `✅ ${userName} 님이 ${name}의 ${type} *승인* 했습니다.`
    : `❌ ${userName} 님이 ${name}의 ${type} *반려* 했습니다.`;
  return jsonResponse({
    replace_original: true,
    text: resultText,
    blocks: [
      ...payload.message.blocks.filter(b => b.type !== 'actions'),
      {type:'context', elements:[{type:'mrkdwn', text: resultText + ' (후속 처리 진행 중)'}]}
    ]
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * 설치형 onEdit 트리거. 폼 응답 시트의 마지막 컬럼이 `...|승인` 또는 `...|반려`로
 * 바뀌면 캘린더·연차잔여·신청자 메일을 처리한다. 셋업 시 `installApprovalTrigger()`를 1회 실행.
 */
function onApprovalStatusChange(e) {
  if (!e || !e.range) return;
  const sheet = e.range.getSheet();
  if (sheet.getName() !== SpreadsheetApp.openById(SHEET_ID).getSheets()[0].getName()) return;
  const lastCol = sheet.getLastColumn();
  if (e.range.getColumn() !== lastCol) return; // 메타 컬럼만 감시

  const r = e.range.getRow();
  if (r === 1) return;
  const meta = String(e.value || '').split('|');
  const decided = meta[2];
  if (decided !== '승인' && decided !== '반려') return;
  // 처리 멱등성: 4번째 토큰("done")이 이미 있으면 skip
  if (meta[4] === 'done') return;

  const row = sheet.getRange(r, 1, 1, lastCol).getValues()[0];
  const [ts, email, name, type, start, end, reason, leadEmail] = row;
  const days = calcDays(type, start, end);

  if (decided === '승인') {
    CalendarApp.getCalendarById(CAL_ID).createAllDayEvent(
      `${name} ${type}`, new Date(start), new Date(new Date(end).getTime()+86400000)
    );
    if (type === '연차') updateBalance(email, days);
    notifyApplicant(email, `✅ ${type} 승인되었습니다. (${fmt(start)} ~ ${fmt(end)})`);
  } else {
    notifyApplicant(email, `❌ ${type} 신청이 반려되었습니다. 팀장과 협의해주세요.`);
  }
  // done 마킹으로 멱등성 보장
  sheet.getRange(r, lastCol).setValue(`${meta[0]}|${meta[1]}|${decided}|${meta[3]||''}|done`);
}

/**
 * 셋업 시 1회 실행: onApprovalStatusChange를 설치형 onEdit 트리거로 등록.
 * 단순 트리거는 GmailApp/CalendarApp 호출 권한이 없으므로 반드시 설치형이어야 한다.
 */
function installApprovalTrigger() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onApprovalStatusChange')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onApprovalStatusChange').forSpreadsheet(ss).onEdit().create();
  Logger.log('승인 상태 변경 트리거 등록 완료');
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
| Slack에 "took too long to respond" 표시 | `doPost`가 3초 안에 응답 못함 | 본 가이드 코드는 무거운 작업을 설치형 onEdit 트리거로 분리해 `doPost`를 0.5~1초 수준으로 유지함. `installApprovalTrigger`가 등록되어 있는지 확인 |
| 같은 신청을 두 번 처리 | 메시지 새로고침 후 재클릭 | sheet 메타 컬럼의 멱등성 가드(`'대기' 외 상태면 무시`)가 자동으로 차단함 |

## 응용 아이디어

- **2단계 승인**: 팀장 → 임원 두 단계가 필요한 경우 `state` 컬럼으로 단계 관리
- **연차 자동 적립**: 매월 1일 트리거로 `balances`에 비례 적립 자동 추가
- **공휴일 보정**: `calcDays`에서 공공API(공휴일 RSS)로 주말·공휴일 제외
- **이상 신청 감지**: 같은 직원이 단기간 반복 신청할 때 HR에 부드러운 알림
