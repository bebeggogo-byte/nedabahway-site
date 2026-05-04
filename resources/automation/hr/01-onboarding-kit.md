# HR 자동화 #1 — 신규 입사자 온보딩 키트

> **한 줄 핵심**: 인사 담당자가 Sheet에 합격자 정보 한 줄을 넣으면, 환영 메일·계정 신청서·90일 체크리스트·1on1 일정·슬랙 초대 안내가 자동 생성·발송된다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 입사자 1인 준비 시간 | 3~5시간 | 10분(데이터 입력) |
| 누락 발생률 | 높음 (장비·계정·소개) | 0에 수렴 |
| 입사 첫날 만족도 | 부서마다 격차 | 표준화 |
| 연 50명 채용 시 절감 | — | **약 200시간 + 휴먼에러 사실상 제거** |

**적용 시나리오**: 정규직 채용·인턴·계약직·파트너 입사.

## 구성요소

- Google Sheet (입사자 마스터)
- Google Docs 템플릿 (환영 레터·체크리스트)
- Gmail (자동 발송)
- Google Calendar (1on1·교육 일정)
- Slack Webhook (HR 채널 공지)
- Apps Script (편집 트리거)

## 셋업 가이드

### Step 1. 입사자 마스터 시트
**탭 `hires`**:
| 이름 | 이메일 | 입사일 | 부서 | 직책 | 멘토 | 멘토이메일 | 상태 |
|---|---|---|---|---|---|---|---|
| 김신입 | sin@example.com | 2026-05-12 | 마케팅 | 매니저 | 박선배 | park@example.com | (자동) |

> 마지막 컬럼은 비워두세요. 스크립트가 `완료` 표시.

### Step 2. Docs 템플릿 두 개 만들기
1. **환영 레터** (`{{이름}}`, `{{입사일}}`, `{{부서}}`, `{{멘토}}` 변수 포함)
2. **90일 체크리스트** (Day 1·Day 7·Day 30·Day 60·Day 90 항목)

각 Doc URL의 ID 복사 → 스크립트 속성에 등록.

### Step 3. Apps Script 속성
- `MASTER_SHEET_ID`
- `WELCOME_TEMPLATE_ID`
- `CHECKLIST_TEMPLATE_ID`
- `OUTPUT_FOLDER_ID` (생성된 Doc 저장 폴더)
- `SLACK_HOOK` (HR 공지 채널)
- `HR_FROM_NAME` (메일 발신 표시명)

### Step 4. 설치형 트리거 등록 (단순 트리거 아님, 중요)

> **왜 설치형인가**: 단순 `onEdit`은 권한 한도가 낮아 `GmailApp.sendEmail`, `DriveApp.getFolderById`, `CalendarApp.createEvent` 같은 외부 서비스를 호출할 수 없습니다. 반드시 설치형 트리거로 등록해야 합니다.

1. 스크립트 상단의 **`installTrigger`** 함수를 한 번 실행 → 권한 동의 화면이 뜨면 모두 허용
2. Apps Script 좌측 **트리거(시계 아이콘)** 메뉴에서 `onEditInstallable`이 `from spreadsheet → on edit` 으로 등록되어 있는지 확인

---

## 완성 코드 (`script.gs`)

```javascript
const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID  = PROPS.getProperty('MASTER_SHEET_ID');
const TPL_WEL   = PROPS.getProperty('WELCOME_TEMPLATE_ID');
const TPL_CHK   = PROPS.getProperty('CHECKLIST_TEMPLATE_ID');
const FOLDER    = PROPS.getProperty('OUTPUT_FOLDER_ID');
const SLACK     = PROPS.getProperty('SLACK_HOOK') || '';
const FROM_NAME = PROPS.getProperty('HR_FROM_NAME') || 'HR팀';

/**
 * 셋업 시 1회 실행: 설치형 onEdit 트리거를 등록한다.
 * 단순 트리거(onEdit)는 외부 서비스 권한이 없어 메일/캘린더/Drive 호출이 실패한다.
 */
function installTrigger() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  // 기존 동일 트리거가 있으면 제거 (중복 방지)
  ScriptApp.getProjectTriggers()
    .filter(t => t.getHandlerFunction() === 'onEditInstallable')
    .forEach(t => ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onEditInstallable').forSpreadsheet(ss).onEdit().create();
  Logger.log('설치형 onEdit 트리거 등록 완료');
}

function onEditInstallable(e) {
  const sheet = e.source.getActiveSheet();
  if (sheet.getName() !== 'hires') return;
  const row = e.range.getRow();
  if (row === 1) return;

  const data = sheet.getRange(row, 1, 1, 8).getValues()[0];
  const [name, email, joinDate, dept, role, mentor, mentorEmail, status] = data;
  if (status === '완료' || !name || !email || !joinDate) return;

  // 1) 환영 레터 + 체크리스트 Doc 생성
  const welcomeDoc = copyAndFill(TPL_WEL, `[환영] ${name} 님 - ${fmt(joinDate)}`, {
    이름: name, 입사일: fmt(joinDate), 부서: dept, 직책: role, 멘토: mentor || '추후 안내'
  });
  const checklistDoc = copyAndFill(TPL_CHK, `[체크리스트] ${name} 90일 플랜`, {
    이름: name, 입사일: fmt(joinDate), 부서: dept, 멘토: mentor || ''
  });

  // 2) 환영 메일 (입사자 + 멘토 cc)
  const body = buildWelcomeBody(name, joinDate, dept, role, mentor, welcomeDoc.url, checklistDoc.url);
  GmailApp.sendEmail(email, `${name} 님, ${fmt(joinDate)} 입사를 환영합니다`, body, {
    name: FROM_NAME,
    cc: mentorEmail || '',
    htmlBody: body
  });

  // 3) 캘린더 — Day 1 환영미팅 + Day 7·30·90 체크인 자동 생성
  const cal = CalendarApp.getDefaultCalendar();
  const join = new Date(joinDate);
  cal.createEvent(`${name} 환영 미팅`, atHour(join, 10), atHour(join, 11), {guests: `${email},${mentorEmail||''}`});
  [7, 30, 90].forEach(d => {
    const day = addDays(join, d);
    cal.createEvent(`${name} ${d}일 체크인`, atHour(day, 14), atHour(day, 14, 30), {guests: `${email},${mentorEmail||''}`});
  });

  // 4) 슬랙 공지
  if (SLACK) {
    UrlFetchApp.fetch(SLACK, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({text:
        `🎉 *신규 입사 안내* \n*${name}* 님이 ${fmt(joinDate)} *${dept}/${role}* 으로 합류합니다.\n멘토: ${mentor||'미정'}\n환영 한 마디 남겨주세요.`
      })
    });
  }

  // 5) 상태 업데이트
  sheet.getRange(row, 8).setValue('완료');
  sheet.getRange(row, 9).setValue(welcomeDoc.url);
  sheet.getRange(row, 10).setValue(checklistDoc.url);
}

function copyAndFill(templateId, title, vars) {
  const folder = DriveApp.getFolderById(FOLDER);
  const file = DriveApp.getFileById(templateId).makeCopy(title, folder);
  const doc = DocumentApp.openById(file.getId());
  const body = doc.getBody();
  for (const k in vars) {
    body.replaceText(`{{${k}}}`, String(vars[k]));
  }
  doc.saveAndClose();
  return {id: file.getId(), url: file.getUrl()};
}

function buildWelcomeBody(name, joinDate, dept, role, mentor, welcomeUrl, checklistUrl) {
  return `<div style="font-family:'Noto Sans KR',sans-serif;line-height:1.7;max-width:620px;">
    <h2 style="color:#b45309;">${name} 님, 환영합니다 🎉</h2>
    <p>${fmt(joinDate)} ${dept}/${role}로 입사하시는 ${name} 님께 첫날을 위한 안내를 드립니다.</p>
    <ul>
      <li>📄 <a href="${welcomeUrl}">환영 레터(개인 맞춤)</a></li>
      <li>✅ <a href="${checklistUrl}">90일 온보딩 체크리스트</a></li>
      <li>👥 멘토: ${mentor || '추후 배정'}</li>
      <li>🗓️ 첫날 10:00 환영 미팅이 캘린더에 등록되었습니다.</li>
    </ul>
    <p>입사 전 궁금한 점은 언제든 회신주세요. 좋은 인연이 되길 기대합니다.</p>
    <p style="color:#6a604f;">— ${FROM_NAME}</p>
  </div>`;
}

function fmt(d) { return new Date(d).toISOString().slice(0,10); }
function atHour(d, h, m=0) { const x = new Date(d); x.setHours(h,m,0,0); return x; }
function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate()+n); return x; }
```

---

## 강의 시연 포인트

1. 시트에 입사자 한 줄을 시연용으로 입력 → 캘린더·메일·슬랙·드라이브가 동시에 반응
2. Docs 템플릿의 `{{이름}}` 같은 변수가 어떻게 치환되는지 강조
3. "왜 이 작업은 사람이 해야 하는가" 토론: 멘토 매칭·문화 안내 영상은 자동화 대상에서 의도적으로 제외했음을 설명

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `onEdit` 미발동 / 권한 오류 | 단순 트리거는 외부 서비스 호출 권한이 없음 | 셋업 Step 4에 따라 `installTrigger()`를 1회 실행해 설치형 트리거로 등록 |
| 캘린더 이벤트 중복 생성 | 같은 행을 다시 편집 | `status` 컬럼이 `완료`면 조기 return — 이미 처리됨 |
| 환영 메일 스팸 분류 | 발신 도메인/SPF 미설정 | Workspace 도메인 발신 + SPF/DKIM 설정 |
| 멘토 미정 시 캘린더 오류 | guests 빈값 | `mentorEmail`이 빈문자열일 때 분기 처리(이미 코드에 반영) |

## 응용 아이디어

- **계정 신청 연동**: 입사일 −7일에 IT팀 채널로 계정 신청 카드 발송
- **온보딩 진행률**: 체크리스트 Doc의 체크 항목을 주 1회 스캔해 시트에 진행률 적재
- **퇴사자 오프보딩 미러**: 같은 패턴으로 퇴사 절차(자료 인계·계정 정리) 자동화
- **다국어**: 외국인 직원의 경우 환영 레터를 영어 템플릿으로 분기
