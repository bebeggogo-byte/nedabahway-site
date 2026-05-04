# HR 자동화 #3 — 분기 펄스서베이 + AI 감성·주제 분석

> **한 줄 핵심**: 익명 설문을 자동 발송·수집한 뒤, AI가 감성·핵심 주제·위험 신호를 분류해 경영진 1페이지 리포트로 전달한다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 응답 1,000건 코딩 | 외부 발주 시 200~500만 원 | 0원 (Gemini 무료 티어로 충분) |
| 분석 소요 | 1~2주 | 30분 |
| 무기명성 | 종이/구글 폼만으로는 의심 | 응답 분리·집계 자동화로 신뢰성↑ |
| 액션 연결 | 보고서로 끝남 | 주제별 권고가 자동 작성됨 |

**적용 시나리오**: 분기 ENPS·번아웃 점검·회식 만족도·리더십 360°.

## 구성요소

- Google Form (익명 설문 — "응답자 이메일 수집 안 함"으로 설정)
- Google Sheet (응답 + 분석 결과)
- Gemini API (감성·주제 분류)
- Apps Script (배치 분석 + 리포트 생성)
- Gmail (경영진 리포트)

> **개인정보 안전 원칙**: 정성 응답을 AI에 보낼 때 이름·부서 등 식별 정보는 절대 함께 전송하지 않는다. 본 스크립트는 정성 텍스트만 추출하여 전송한다.

## 셋업 가이드

### Step 1. 폼 질문 설계 (예시)
1. 직군 (객관식 — 식별 위험 낮은 큰 그룹만: 본부 단위)
2. 일에 몰입한다 (1~5)
3. 회사 추천의향(ENPS) (0~10)
4. 가장 잘된 점 (장문) ← AI 분석 대상
5. 가장 답답한 점 (장문) ← AI 분석 대상
6. 자유 의견 (장문) ← AI 분석 대상

### Step 2. 응답 시트
폼이 자동 생성한 응답 시트를 그대로 사용. 추가 탭 두 개 만들기:
- `analyzed`: `행 | 직군 | 감성 | 주제 | 요지` (AI가 채움)
- `report`: HR/경영진용 1페이지 리포트 결과 저장

### Step 3. 스크립트 속성
- `RESPONSE_SHEET_ID`
- `GEMINI_API_KEY`
- `RECIPIENT_EMAIL` (CHRO/CEO)

### Step 4. 트리거
- `analyzeAll` — 매주 월요일 새벽 (또는 폼 마감일 다음 날)
- `buildReport` — `analyzeAll` 직후 (5분 차이로 트리거 등록)

---

## 완성 코드 (`script.gs`)

```javascript
const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID   = PROPS.getProperty('RESPONSE_SHEET_ID');
const GEMINI_KEY = PROPS.getProperty('GEMINI_API_KEY');
const EMAIL_TO   = PROPS.getProperty('RECIPIENT_EMAIL');

const TEXT_COLS = [4, 5, 6]; // 정성 응답 컬럼 인덱스(1-base) — 폼에 맞게 조정

// ─────────────────────────────────────────────
// 1) 응답 일괄 분석
// ─────────────────────────────────────────────
function analyzeAll() {
  const ss  = SpreadsheetApp.openById(SHEET_ID);
  const src = ss.getSheets()[0];
  const dst = ss.getSheetByName('analyzed') || ss.insertSheet('analyzed');
  if (dst.getLastRow() === 0) dst.appendRow(['행', '직군', '감성', '주제', '요지']);

  const data = src.getDataRange().getValues();
  const processed = new Set(dst.getRange('A2:A').getValues().flat().map(String));

  const batch = []; // [{row, group, text}]
  for (let i = 1; i < data.length; i++) {
    if (processed.has(String(i+1))) continue;
    const group = data[i][1]; // 직군 컬럼 가정 (B열)
    const merged = TEXT_COLS.map(c => (data[i][c-1] || '').trim()).filter(Boolean).join(' / ');
    if (!merged) continue;
    batch.push({row: i+1, group, text: merged});
  }
  if (batch.length === 0) return;

  // 50건씩 배치 처리
  for (let i = 0; i < batch.length; i += 50) {
    const slice = batch.slice(i, i+50);
    const result = classifyBatch(slice);
    slice.forEach((b, idx) => {
      const r = result[idx] || {};
      dst.appendRow([b.row, b.group, r.sentiment || '중립', (r.topics||[]).join(','), r.gist || '']);
    });
    Utilities.sleep(2000);
  }
}

function classifyBatch(items) {
  // 식별정보 분리: text만 전송, group은 후처리
  const prompt = `
각 응답에 대해 한국어로 분석하세요. JSON 배열만 반환.
- sentiment: positive/negative/neutral
- topics: 1~3개 주제(짧은 한국어 명사구) — 회사문화/보상/성장/리더십/업무량/복지/관계/제도/도구/번아웃 등에서 자유롭게
- gist: 한 문장 요약(15자 이내)

응답:
${items.map((it,i)=>`[${i+1}] ${it.text}`).join('\n')}

반환 형식: [{"sentiment":"...","topics":["..."],"gist":"..."}]
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = UrlFetchApp.fetch(url, {
    method:'post', contentType:'application/json',
    payload: JSON.stringify({
      contents:[{parts:[{text: prompt}]}],
      generationConfig:{responseMimeType:'application/json'}
    })
  });
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
}

// ─────────────────────────────────────────────
// 2) 1페이지 경영진 리포트
// ─────────────────────────────────────────────
function buildReport() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const src = ss.getSheets()[0];
  const ana = ss.getSheetByName('analyzed').getDataRange().getValues();

  // 정량
  const all = src.getDataRange().getValues();
  const enpsCol = 3; // ENPS 컬럼(예: C열) — 폼에 맞춰 조정
  const enpsScores = all.slice(1).map(r => Number(r[enpsCol-1])).filter(n => !isNaN(n));
  const enps = enpsScore(enpsScores);

  // 정성: 주제 카운트 + 감성 비율
  const topicCount = {}, byTopicSamples = {};
  let pos = 0, neg = 0, neu = 0;
  for (let i = 1; i < ana.length; i++) {
    const sentiment = ana[i][2];
    const topics = String(ana[i][3]).split(',').map(s => s.trim()).filter(Boolean);
    const gist = ana[i][4];
    topics.forEach(t => {
      topicCount[t] = (topicCount[t]||0) + 1;
      byTopicSamples[t] = byTopicSamples[t] || [];
      if (byTopicSamples[t].length < 3) byTopicSamples[t].push(gist);
    });
    if (sentiment === 'positive') pos++;
    else if (sentiment === 'negative') neg++;
    else neu++;
  }

  const topTopics = Object.entries(topicCount).sort((a,b)=>b[1]-a[1]).slice(0, 6);
  const insight = aiExecutiveSummary(enps, {pos, neg, neu}, topTopics, byTopicSamples);

  const html = renderReport(enps, {pos, neg, neu}, topTopics, byTopicSamples, insight);
  if (EMAIL_TO) GmailApp.sendEmail(EMAIL_TO, `[펄스서베이] ${new Date().toISOString().slice(0,10)} 분석 리포트`, '', {htmlBody: html});

  const rep = ss.getSheetByName('report') || ss.insertSheet('report');
  rep.appendRow([new Date(), enps, JSON.stringify(insight)]);
}

function enpsScore(scores) {
  if (!scores.length) return 0;
  const promoters = scores.filter(s => s >= 9).length;
  const detractors = scores.filter(s => s <= 6).length;
  return Math.round((promoters - detractors) / scores.length * 100);
}

function aiExecutiveSummary(enps, sent, topTopics, samples) {
  const ctx = topTopics.map(([t,c]) => `- ${t}(${c}건): ${(samples[t]||[]).join(' | ')}`).join('\n');
  const prompt = `
당신은 CHRO 코치입니다. 분기 펄스서베이 결과로 경영진용 한 페이지 코멘트를 작성하세요.

데이터:
- ENPS: ${enps}
- 감성 분포: 긍정 ${sent.pos} / 부정 ${sent.neg} / 중립 ${sent.neu}
- 상위 주제:
${ctx}

규칙:
- 추측 금지, 데이터 기반
- 250자 이내
- 1) 가장 시급한 주제 1건과 권고 행동 2개  2) 칭찬할 강점 1건  3) 다음 분기 측정 제안 1건
JSON: {"urgent":"...","actions":["...","..."],"strength":"...","next":"..."}
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = UrlFetchApp.fetch(url, {method:'post', contentType:'application/json',
    payload: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{responseMimeType:'application/json'}})
  });
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
}

function renderReport(enps, sent, topTopics, samples, ins) {
  const total = sent.pos + sent.neg + sent.neu || 1;
  const topicHtml = topTopics.map(([t,c]) => `<li><b>${t}</b> · ${c}건<br><span style="color:#666;font-size:.92em;">${(samples[t]||[]).join(' · ')}</span></li>`).join('');
  return `<div style="font-family:'Noto Sans KR',sans-serif;line-height:1.7;max-width:720px;color:#222;">
    <h2 style="border-bottom:2px solid #b45309;padding-bottom:.4rem;">분기 펄스서베이 — 경영진 요약</h2>
    <p style="color:#6a604f;">${new Date().toLocaleDateString('ko-KR')} 기준</p>

    <h3>정량 지표</h3>
    <ul>
      <li><b>ENPS</b>: ${enps}</li>
      <li><b>감성 분포</b>: 긍정 ${(sent.pos/total*100).toFixed(0)}% / 부정 ${(sent.neg/total*100).toFixed(0)}% / 중립 ${(sent.neu/total*100).toFixed(0)}%</li>
    </ul>

    <h3>상위 주제 (응답 빈도순)</h3>
    <ul>${topicHtml}</ul>

    <h3>📌 핵심 인사이트</h3>
    <p><b>가장 시급한 이슈 — </b>${ins.urgent}</p>
    <p><b>권고 액션</b></p>
    <ol>${ins.actions.map(a=>`<li>${a}</li>`).join('')}</ol>
    <p><b>강점 — </b>${ins.strength}</p>
    <p><b>다음 분기 측정 제안 — </b>${ins.next}</p>

    <p style="color:#999;font-size:.85em;margin-top:2rem;">자동 생성 · 응답은 익명이며 식별 정보는 AI에 전달되지 않았습니다.</p>
  </div>`;
}
```

---

## 강의 시연 포인트

1. 폼 응답 5건을 미리 준비, `analyzeAll()` 1회 실행 → `analyzed` 탭에 자동 채워지는 모습
2. `buildReport()` 실행 → 메일에 1페이지 리포트 도착
3. **개인정보 안전 강조**: 코드의 `classifyBatch`에서 직군은 별도 보관, AI에는 텍스트만 전송됨을 보여주기

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| `analyzed` 시트가 일부만 채워짐 | 50건 배치에서 일부 응답 비어 있음 | 빈 응답 사전 필터링(코드에 반영됨) |
| Gemini가 라벨을 영어로 반환 | 프롬프트 강제 부족 | 시스템 메시지에 "한국어 명사구"를 한 번 더 강조 |
| ENPS가 NaN | 객관식 응답이 텍스트로 들어옴 | 폼 질문을 0~10 척도형으로 정확히 설정 |
| 직군 식별 위험 | 본부가 5명 미만 | 직군 라벨링을 본부→사업부 단위로 묶어 익명성 보장 |

## 응용 아이디어

- **부정 응답 즉시 핫라인**: 감성이 negative이면서 키워드에 "괴롭힘/안전" 포함 시 윤리경영 채널로 즉시 알림
- **분기 비교 트렌드**: `report` 탭에 분기별 누적, 다음 회차에 변화 자동 코멘트
- **부서별 미니 리포트**: 본부장 권한 메일 자동 발송(개인 응답이 아닌 본부 단위 집계만)
- **번역**: 외국인 직원 응답이 영어/일어인 경우 분류 전 한국어 번역 단계 추가
