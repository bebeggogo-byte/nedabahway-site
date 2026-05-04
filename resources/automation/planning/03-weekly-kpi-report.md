# 기획 자동화 #3 — 주간 KPI 자동 리포트

> **한 줄 핵심**: 흩어진 KPI 시트를 매주 월요일 새벽에 모아, AI가 변화 포인트와 다음 주 권고를 작성한 한 장 리포트로 임원진에 발송한다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 주간 리포트 작성 | 3~5시간/주 | 0분 |
| 데이터 출처 일관성 | 사람마다 다름 | 단일 소스 |
| 인사이트 깊이 | 시간 압박으로 얕음 | AI가 변동·이상 자동 검출 |
| 1년 시간 절감 | — | **약 200시간/팀** |

**적용 시나리오**: 경영지원·전략기획·사업부장 보고·이사회 사전자료.

## 구성요소

- Google Sheet (KPI 원천 — 일별 적재 가정)
- Google Slides 또는 Gmail (리포트 출력)
- Apps Script + Gemini API
- Slack (선택)

## 셋업 가이드

### Step 1. KPI 시트 형식 (예시)
**탭 `kpi_daily`**:
| 날짜 | 지표 | 값 | 단위 | 주관 |
|---|---|---|---|---|
| 2026-04-28 | 신규가입 | 412 | 명 | 마케팅 |
| 2026-04-28 | DAU | 18900 | 명 | 프로덕트 |
| 2026-04-28 | 결제전환율 | 3.4 | % | 영업 |

> **약속**: 한 행 = 한 지표의 하루 값. 시트는 "단일 truth source".

### Step 2. KPI 정의 시트
**탭 `kpi_meta`**:
| 지표 | 좋은방향 | 목표값 | 단위 |
|---|---|---|---|
| 신규가입 | up | 500 | 명 |
| DAU | up | 20000 | 명 |
| 결제전환율 | up | 4.0 | % |
| 이탈율 | down | 5.0 | % |

### Step 3. Apps Script 붙여넣기 → 트리거 매주 월요일 06:30.

---

## 완성 코드 (`script.gs`)

```javascript
const PROPS = PropertiesService.getScriptProperties();
const GEMINI_KEY = PROPS.getProperty('GEMINI_API_KEY');
const SHEET_ID   = PROPS.getProperty('SHEET_ID');
const EMAIL_TO   = PROPS.getProperty('RECIPIENT_EMAIL');
const SLACK_HOOK = PROPS.getProperty('SLACK_WEBHOOK') || '';

function weeklyReport() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const daily = ss.getSheetByName('kpi_daily').getDataRange().getValues();
  const meta  = ss.getSheetByName('kpi_meta').getDataRange().getValues();

  const metaMap = {};
  for (let i = 1; i < meta.length; i++) {
    metaMap[meta[i][0]] = {direction: meta[i][1], target: meta[i][2], unit: meta[i][3]};
  }

  const now = new Date();
  const thisStart = startOfWeek(now);
  const lastStart = new Date(thisStart.getTime() - 7*86400000);
  const lastEnd   = new Date(thisStart.getTime() - 1);

  const stats = {};
  for (let i = 1; i < daily.length; i++) {
    const [date, indicator, value] = daily[i];
    if (!indicator) continue;
    const d = new Date(date);
    stats[indicator] = stats[indicator] || {thisWeek:[], lastWeek:[]};
    if (d >= thisStart && d < now)        stats[indicator].thisWeek.push(Number(value));
    else if (d >= lastStart && d <= lastEnd) stats[indicator].lastWeek.push(Number(value));
  }

  const summary = Object.entries(stats).map(([ind, v]) => {
    const tAvg = avg(v.thisWeek);
    const lAvg = avg(v.lastWeek);
    const wow  = lAvg ? ((tAvg - lAvg) / lAvg * 100) : 0;
    const m = metaMap[ind] || {};
    const status = judgeStatus(tAvg, m);
    return {indicator: ind, thisAvg: tAvg, lastAvg: lAvg, wow, target: m.target, direction: m.direction, unit: m.unit, status};
  });

  const insight = aiCommentary(summary);
  const html = buildReportHTML(summary, insight, thisStart);

  if (EMAIL_TO) GmailApp.sendEmail(EMAIL_TO, `[주간] ${fmt(thisStart)} KPI 리포트`, '', {htmlBody: html});
  if (SLACK_HOOK) UrlFetchApp.fetch(SLACK_HOOK, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({text: buildSlack(summary, insight)})
  });
}

function startOfWeek(d) {
  const x = new Date(d);
  x.setHours(0,0,0,0);
  x.setDate(x.getDate() - x.getDay() + (x.getDay() === 0 ? -6 : 1)); // 월요일 시작
  return x;
}
function avg(arr) { return arr.length ? arr.reduce((a,b)=>a+b,0)/arr.length : 0; }
function fmt(d) { return d.toISOString().slice(0,10); }

function judgeStatus(val, meta) {
  if (!meta.target) return '—';
  const reached = meta.direction === 'up' ? val >= meta.target : val <= meta.target;
  return reached ? '✅ 달성' : '⚠️ 미달';
}

function aiCommentary(summary) {
  const prompt = `
당신은 경영진 보고를 작성하는 시니어 분석가입니다.
다음 주간 KPI를 보고 한국어로 간결하게 작성하세요.

규칙:
- 사실만, 추측 금지
- 5문장 이내
- 1) 가장 좋은 변화 1건  2) 가장 우려되는 변화 1건  3) 다음 주 권고 1건
- "~합니다"체

데이터:
${JSON.stringify(summary, null, 2)}

JSON으로 반환:
{"highlight":"...","concern":"...","recommendation":"..."}
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = UrlFetchApp.fetch(url, {
    method:'post', contentType:'application/json',
    payload: JSON.stringify({
      contents:[{parts:[{text:prompt}]}],
      generationConfig:{responseMimeType:'application/json'}
    })
  });
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
}

function buildReportHTML(summary, insight, weekStart) {
  let rows = summary.map(s => {
    const arrow = s.wow > 1 ? '🔺' : s.wow < -1 ? '🔻' : '➖';
    const wowStr = s.wow ? `${s.wow.toFixed(1)}%` : '—';
    return `<tr>
      <td style="padding:.5rem;border-bottom:1px solid #eee;">${s.indicator}</td>
      <td style="padding:.5rem;border-bottom:1px solid #eee;text-align:right;">${s.thisAvg.toFixed(1)} ${s.unit||''}</td>
      <td style="padding:.5rem;border-bottom:1px solid #eee;text-align:right;">${s.lastAvg.toFixed(1)}</td>
      <td style="padding:.5rem;border-bottom:1px solid #eee;text-align:right;">${arrow} ${wowStr}</td>
      <td style="padding:.5rem;border-bottom:1px solid #eee;text-align:right;">${s.target||'—'}</td>
      <td style="padding:.5rem;border-bottom:1px solid #eee;">${s.status}</td>
    </tr>`;
  }).join('');

  return `<div style="font-family:'Noto Sans KR',sans-serif;max-width:760px;line-height:1.6;color:#222;">
    <h2 style="border-bottom:2px solid #b45309;padding-bottom:.5rem;">주간 KPI 리포트</h2>
    <p style="color:#6a604f;">기준 주: ${fmt(weekStart)} ~ ${fmt(new Date())}</p>

    <h3>📌 핵심 코멘트</h3>
    <p><b>가장 좋은 변화 — </b>${insight.highlight}</p>
    <p><b>우려 포인트 — </b>${insight.concern}</p>
    <p><b>다음 주 권고 — </b>${insight.recommendation}</p>

    <h3 style="margin-top:1.5rem;">📊 지표별 표</h3>
    <table style="width:100%;border-collapse:collapse;font-size:.95em;">
      <thead style="background:#fbf6ec;">
        <tr><th style="padding:.5rem;text-align:left;">지표</th>
            <th style="padding:.5rem;text-align:right;">이번주 평균</th>
            <th style="padding:.5rem;text-align:right;">지난주 평균</th>
            <th style="padding:.5rem;text-align:right;">WoW</th>
            <th style="padding:.5rem;text-align:right;">목표</th>
            <th style="padding:.5rem;text-align:left;">상태</th></tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="color:#999;font-size:.85em;margin-top:2rem;">자동 생성 · 원천 데이터: 회사 KPI 시트</p>
  </div>`;
}

function buildSlack(summary, insight) {
  const top = summary.map(s => `• ${s.indicator}: ${s.thisAvg.toFixed(1)}${s.unit||''} (${s.wow>0?'+':''}${s.wow.toFixed(1)}% WoW) ${s.status}`).join('\n');
  return `*📊 주간 KPI 리포트*\n\n${top}\n\n*하이라이트*: ${insight.highlight}\n*우려*: ${insight.concern}\n*권고*: ${insight.recommendation}`;
}
```

---

## 강의 시연 포인트

1. KPI 시트의 한 셀을 일부러 큰 값으로 수정 → `weeklyReport()` 즉시 실행 → AI 코멘트가 "특정 지표 급등에 주목" 등으로 바뀌는 모습
2. `kpi_meta`의 `direction`을 `down`으로 바꿔 "이탈율 같은 부정 지표도 같은 코드로 처리됨" 시연
3. 임원에게 보낼 메일 미리보기로 "Excel 떡칠 보고서 vs 한 장 리포트" 비교

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| WoW가 모두 0 | 일자가 문자열로 들어옴 | `kpi_daily`의 날짜 컬럼 형식을 "날짜"로 강제 |
| AI 코멘트가 일반론 | 데이터 너무 적음 | `kpi_daily`에 최소 14일치 데이터 누적 후 사용 |
| 트리거가 한 번도 안 돌아감 | 인증 미완료 | Apps Script에서 한 번 수동 실행하여 권한 부여 |
| 일부 지표 누락 | meta에 등록 안 됨 | `kpi_meta`에 추가하지 않아도 표시되지만, 목표/상태가 비어 보임 |

## 응용 아이디어

- **부서별 분기**: 시트에 `부서` 컬럼 추가 → 부서별 메일을 다른 수신자에 발송
- **Looker Studio 연동**: Apps Script가 Sheet에 적재한 결과를 Looker가 시각화
- **이상 감지 강화**: 이번주 값이 표준편차 ±2σ 벗어나면 즉시 임원 알림 분리
- **OKR 연결**: `kpi_meta`에 `okr_id` 컬럼 추가하여 OKR 트래킹과 통합
