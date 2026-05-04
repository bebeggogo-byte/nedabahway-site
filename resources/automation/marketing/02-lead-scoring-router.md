# 마케팅 자동화 #2 — 인입 리드 자동 스코어링·배정

> **한 줄 핵심**: 문의 폼이 들어오면 AI가 회사·문의 내용을 보고 점수(Hot/Warm/Cold)를 매기고, 룰에 따라 담당자에게 자동 배정·알림한다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 첫 응답까지 시간 | 평균 6~24시간 | 2~10분 |
| 영업 우선순위 판단 | 주관적 | 일관된 룰 + AI |
| Hot 리드 누락 | 종종 발생 | 거의 0 |
| 전환율 영향 | — | 응답시간 5분 이내일 때 21배 ↑ (HBR) |

**적용 시나리오**: B2B 컨설팅·SaaS·교육·강연 의뢰·고가 코칭.

## 구성요소

- Google Form (문의)
- Google Sheet (응답 + 룰 + 담당자)
- Gemini API (스코어링 보강)
- Slack Webhook (담당자별 채널)
- Apps Script (Form 제출 트리거)

## 셋업 가이드

### Step 1. 폼 질문 (필수만)
1. 회사/소속
2. 이름
3. 이메일
4. 직무 (객관식: 대표/임원/부서장/실무자/기타)
5. 직원 수 (객관식: 1~10/11~50/51~200/200+)
6. 예상 예산 범위 (객관식: 1천만 미만/1천~5천/5천~1억/1억+)
7. 의뢰 내용 (장문)
8. 희망 시작 시기 (객관식: 즉시/1개월/3개월/미정)

### Step 2. 시트 구조
**탭 `responses`**: 폼 자동 생성
**탭 `rules`**:
| 조건 | 점수 |
|---|---|
| 직무=대표 | 30 |
| 직무=임원 | 20 |
| 직무=실무자 | 5 |
| 예산>=1억 | 35 |
| 예산 5천~1억 | 25 |
| 예산 1천~5천 | 12 |
| 직원 200+ | 15 |
| 시작=즉시 | 20 |
| 시작=1개월 | 10 |

**탭 `assignees`**: `등급 | 담당자명 | 이메일 | slack_channel | slack_user_id`
- HOT 70+ → 대표 본인
- WARM 40~69 → 시니어 매니저
- COLD <40 → 자동 자료만 발송 + 주1회 다이제스트

**탭 `log`**: `타임스탬프 | 회사 | 점수 | 등급 | 담당자 | AI코멘트`

### Step 3. 스크립트 속성
- `RESPONSE_SHEET_ID`
- `GEMINI_API_KEY`
- `SLACK_BOT_TOKEN` (또는 채널별 webhook URL을 시트에 직접 둬도 됨)
- `FROM_NAME`

### Step 4. 트리거: `onFormSubmit` 폼 제출 시.

---

## 완성 코드 (`script.gs`)

```javascript
const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID = PROPS.getProperty('RESPONSE_SHEET_ID');
const GEMINI   = PROPS.getProperty('GEMINI_API_KEY');
const SLACK_TOK = PROPS.getProperty('SLACK_BOT_TOKEN') || '';
const FROM = PROPS.getProperty('FROM_NAME') || '영업팀';

function onFormSubmit(e) {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const responses = ss.getSheets()[0];
  const rules = ss.getSheetByName('rules').getDataRange().getValues().slice(1);
  const assignees = ss.getSheetByName('assignees').getDataRange().getValues().slice(1);

  const lastRow = responses.getLastRow();
  const row = responses.getRange(lastRow, 1, 1, responses.getLastColumn()).getValues()[0];
  const [ts, company, name, email, jobTitle, headcount, budget, content, timing] = row;

  // 1) 룰 기반 점수
  const facts = `직무=${jobTitle}|직원=${headcount}|예산=${budget}|시작=${timing}`;
  let ruleScore = 0;
  rules.forEach(([cond, score]) => {
    if (matchesCond(cond, jobTitle, headcount, budget, timing)) ruleScore += Number(score);
  });

  // 2) AI 보강 점수 + 코멘트
  const ai = aiAssess({company, name, jobTitle, headcount, budget, content, timing});
  const score = Math.min(100, Math.round(ruleScore * 0.6 + ai.score * 0.4));
  const grade = score >= 70 ? 'HOT' : score >= 40 ? 'WARM' : 'COLD';

  // 3) 담당자 결정
  const a = assignees.find(r => r[0] === grade);
  const assignee = a ? {name:a[1], email:a[2], channel:a[3], userId:a[4]} : null;

  // 4) 즉시 알림
  if (assignee && grade !== 'COLD') {
    sendSlackCard(assignee, {company, name, email, jobTitle, score, grade, content, ai});
    autoReplyToProspect(email, name, FROM);
  } else {
    autoReplyToProspect(email, name, FROM);
  }

  // 5) 로그 적재
  const log = ss.getSheetByName('log');
  log.appendRow([new Date(), company, score, grade, assignee ? assignee.name : '자동응대', ai.comment]);
}

function matchesCond(cond, job, hc, budget, timing) {
  cond = String(cond).trim();
  if (cond.startsWith('직무=')) return job === cond.slice(3);
  if (cond.startsWith('직원 ') || cond.startsWith('직원=')) return hc === cond.replace(/^직원[ =]/,'');
  if (cond === '예산>=1억') return budget && budget.indexOf('1억') >= 0 && budget.indexOf('미만') < 0;
  if (cond === '예산 5천~1억') return budget === '5천~1억';
  if (cond === '예산 1천~5천') return budget === '1천~5천';
  if (cond === '직원 200+') return hc === '200+';
  if (cond.startsWith('시작=')) return timing === cond.slice(3);
  return false;
}

function aiAssess(lead) {
  const prompt = `
당신은 B2B 세일즈 코치입니다. 다음 리드의 실제 구매 의향과 적합성을 평가하세요.

리드 정보:
- 회사: ${lead.company}
- 이름: ${lead.name}
- 직무: ${lead.jobTitle} / 직원: ${lead.headcount} / 예산: ${lead.budget} / 시작: ${lead.timing}
- 의뢰 내용: """${(lead.content||'').slice(0, 4000)}"""

규칙:
- score: 0~100 정수 (구매 의향 + 우리 솔루션 적합성)
- comment: 한 문장, 영업 담당자에게 도움될 핵심 한 마디
- urgent: true/false (24시간 내 응답 권고 여부)

JSON: {"score":int,"comment":"...","urgent":bool}
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`;
  const res = UrlFetchApp.fetch(url, {method:'post', contentType:'application/json',
    payload: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{responseMimeType:'application/json'}})
  });
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
}

function sendSlackCard(assignee, lead) {
  const channel = assignee.userId || assignee.channel;
  const emoji = lead.grade === 'HOT' ? '🔥' : '⚠️';
  const body = {
    channel,
    text: `${emoji} ${lead.grade} 리드 인입 — ${lead.company}`,
    blocks: [
      {type:'header', text:{type:'plain_text', text:`${emoji} ${lead.grade} 리드 — ${lead.score}점`}},
      {type:'section', fields:[
        {type:'mrkdwn', text:`*회사*\n${lead.company}`},
        {type:'mrkdwn', text:`*이름/직무*\n${lead.name} / ${lead.jobTitle}`},
        {type:'mrkdwn', text:`*이메일*\n${lead.email}`},
        {type:'mrkdwn', text:`*점수*\n${lead.score}/100`},
      ]},
      {type:'section', text:{type:'mrkdwn', text:`*AI 코멘트*\n${lead.ai.comment}\n${lead.ai.urgent ? ':alarm_clock: 24시간 내 응답 권고' : ''}`}},
      {type:'section', text:{type:'mrkdwn', text:`*의뢰 요약*\n${(lead.content||'').slice(0, 600)}`}},
      {type:'context', elements:[{type:'mrkdwn', text:`담당자: *${assignee.name}*`}]}
    ]
  };
  if (SLACK_TOK) {
    UrlFetchApp.fetch('https://slack.com/api/chat.postMessage', {
      method:'post', contentType:'application/json; charset=utf-8',
      headers:{Authorization:`Bearer ${SLACK_TOK}`}, payload: JSON.stringify(body)
    });
  }
}

function autoReplyToProspect(email, name, fromName) {
  const html = `<div style="font-family:'Noto Sans KR',sans-serif;line-height:1.7;max-width:600px;">
    <p>${name||'고객'} 님, 문의 감사드립니다.</p>
    <p>담당자가 영업일 기준 24시간 안에 직접 연락드리겠습니다. 그 사이 아래 자료를 먼저 보시면 도움이 됩니다.</p>
    <ul>
      <li><a href="https://www.nedabah.org/cases.html">사례 모음</a></li>
      <li><a href="https://www.nedabah.org/lectures/">강의/워크숍 안내</a></li>
    </ul>
    <p style="color:#6a604f;">— ${fromName}</p>
  </div>`;
  GmailApp.sendEmail(email, `문의를 잘 받았습니다 — ${fromName}`, '', {htmlBody: html, name: fromName});
}
```

---

## 강의 시연 포인트

1. 폼 제출 → 1분 내 점수 계산 + 담당자 Slack 카드 + 자동 응답 메일
2. 시트 `rules` 한 줄을 수정해 점수 즉시 변경되는 모습 (코드 0줄 수정)
3. 같은 의뢰가 직무·예산만 다를 때 등급이 어떻게 갈리는지 비교

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 점수가 0 | 룰 조건 문자열 불일치 | `rules` 시트의 라벨을 폼 보기 그대로 복사 |
| Slack 카드 미수신 | 채널에 Bot 미초대 | `/invite @봇이름` |
| AI가 너무 후함 | 프롬프트의 "적합성" 강조 부족 | "우리 솔루션과 맞지 않으면 50 미만" 한 줄 추가 |
| 자동 응답이 누락 | Gmail 송신 실패 | `MailApp.sendEmail`로 대체 가능 |

## 응용 아이디어

- **CRM 연동**: HubSpot/세일즈포스 API로 리드 자동 생성 (Apps Script가 webhook으로 push)
- **이메일 인박스 분석**: Gmail 라벨로 들어온 새 메일을 같은 로직으로 스코어링
- **다국어 자동 응답**: 폼 응답이 영어이면 영어 템플릿으로 분기
- **No-Response 리텐션**: 14일간 연락 없는 리드에 자동 follow-up 메일
