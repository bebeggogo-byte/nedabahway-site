# 마케팅 자동화 #3 — 리뷰·멘션 주간 다이제스트

> **한 줄 핵심**: 네이버 블로그·카페·뉴스의 자사/제품 멘션을 매일 수집하고, 매주 월요일 AI가 감성·핵심 메시지를 분류한 1페이지 리포트를 발송한다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 모니터링 시간 | 주 4~6시간 | 0분 |
| 부정 멘션 인지 지연 | 평균 1주 | 24시간 이내 |
| VOC → 제품 반영 속도 | 분기 1회 정리 | 주 1회 |
| 위기관리 골든타임 | 놓침 | 부정 멘션 즉시 알림 분기 |

**적용 시나리오**: 브랜드 매니저·PR·CS·제품팀 VOC.

## 구성요소

- 네이버 검색 API (블로그·카페 무료 일 25,000건) — `client_id`, `client_secret` 필요
- Google News RSS (보강)
- Google Sheet (수집 + 분석)
- Gemini API
- Apps Script (일별 수집 트리거 + 주간 리포트 트리거)

## 셋업 가이드

### Step 1. 네이버 개발자 센터 키 발급
1. <https://developers.naver.com/main/> → 애플리케이션 등록
2. "검색" API 사용 신청 → `Client ID`, `Client Secret` 복사

### Step 2. 시트 구조
**탭 `keywords`**: `키워드 | 종류 (자사/경쟁사/카테고리)`
**탭 `mentions`**: `날짜 | 키워드 | 출처 | 제목 | URL | 본문스니펫 | 감성 | 주제`
**탭 `weekly_report`**: 누적 리포트 적재

### Step 3. 스크립트 속성
- `SHEET_ID`
- `NAVER_ID`, `NAVER_SECRET`
- `GEMINI_API_KEY`
- `RECIPIENT_EMAIL`
- `URGENT_SLACK_HOOK` (부정 멘션 즉시 알림)

### Step 4. 트리거
- `dailyCollect` — 매일 07:00
- `weeklyReport` — 매주 월요일 08:00

---

## 완성 코드 (`script.gs`)

```javascript
const PROPS = PropertiesService.getScriptProperties();
const SHEET_ID = PROPS.getProperty('SHEET_ID');
const N_ID = PROPS.getProperty('NAVER_ID');
const N_SEC = PROPS.getProperty('NAVER_SECRET');
const GEMINI = PROPS.getProperty('GEMINI_API_KEY');
const EMAIL_TO = PROPS.getProperty('RECIPIENT_EMAIL');
const URGENT = PROPS.getProperty('URGENT_SLACK_HOOK') || '';

// ─────────────────────────────────────────────
// 1) 매일 수집
// ─────────────────────────────────────────────
function dailyCollect() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const kws = ss.getSheetByName('keywords').getDataRange().getValues().slice(1);
  const dst = ss.getSheetByName('mentions');
  const today = new Date().toISOString().slice(0,10);

  // 중복 방지
  const seen = new Set(dst.getRange('E2:E').getValues().flat().map(String));

  const newItems = [];
  kws.forEach(([keyword, kind]) => {
    if (!keyword) return;
    ['blog','cafearticle','news'].forEach(api => {
      const items = naverSearch(api, keyword);
      items.forEach(it => {
        if (seen.has(it.link)) return;
        seen.add(it.link);
        newItems.push({date: today, keyword, kind, source: api, title: stripHtml(it.title), url: it.link, snippet: stripHtml(it.description||'')});
      });
      Utilities.sleep(300);
    });
  });

  if (newItems.length === 0) return;

  // AI 감성·주제 분류 (배치)
  for (let i = 0; i < newItems.length; i += 30) {
    const slice = newItems.slice(i, i+30);
    const cls = classify(slice);
    slice.forEach((it, idx) => {
      const c = cls[idx] || {};
      dst.appendRow([it.date, it.keyword, it.source, it.title, it.url, it.snippet, c.sentiment || '중립', (c.topics||[]).join(',')]);
      // 부정 즉시 알림
      if (c.sentiment === 'negative' && URGENT) {
        UrlFetchApp.fetch(URGENT, {
          method:'post', contentType:'application/json',
          payload: JSON.stringify({text: `:warning: 부정 멘션 — *${it.keyword}*\n• <${it.url}|${it.title}>\n• 주제: ${(c.topics||[]).join(', ')}`})
        });
      }
    });
    Utilities.sleep(2000);
  }
}

function naverSearch(api, query) {
  const url = `https://openapi.naver.com/v1/search/${api}.json?query=${encodeURIComponent(query)}&display=20&sort=date`;
  try {
    const res = UrlFetchApp.fetch(url, {
      headers: {'X-Naver-Client-Id': N_ID, 'X-Naver-Client-Secret': N_SEC},
      muteHttpExceptions: true
    });
    if (res.getResponseCode() !== 200) return [];
    return JSON.parse(res.getContentText()).items || [];
  } catch(e) { return []; }
}

function stripHtml(s) { return String(s||'').replace(/<[^>]+>/g, '').replace(/&[a-z]+;/gi, ' '); }

function classify(items) {
  const prompt = `
각 멘션에 대해 한국어로 분류하세요. JSON 배열만 반환.
- sentiment: positive/negative/neutral
- topics: 1~3개 짧은 명사구 (가격/품질/배송/디자인/UX/CS/마케팅/이벤트/리더십/위기/기타)

멘션:
${items.map((it,i)=>`[${i+1}] ${it.title} — ${it.snippet.slice(0,300)}`).join('\n')}

[{"sentiment":"...","topics":["..."]}]
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`;
  const res = UrlFetchApp.fetch(url, {method:'post', contentType:'application/json',
    payload: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{responseMimeType:'application/json'}})
  });
  return JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
}

// ─────────────────────────────────────────────
// 2) 주간 리포트
// ─────────────────────────────────────────────
function weeklyReport() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const all = ss.getSheetByName('mentions').getDataRange().getValues();
  const head = all[0];
  const since = new Date(Date.now() - 7*86400000);
  const week = all.slice(1).filter(r => new Date(r[0]) >= since);
  if (week.length === 0) return;

  const grouped = {};
  let pos=0, neg=0, neu=0;
  const topicCount = {};
  week.forEach(r => {
    const [date, keyword, source, title, url, snippet, sentiment, topics] = r;
    grouped[keyword] = grouped[keyword] || {pos:0, neg:0, neu:0, items:[]};
    grouped[keyword].items.push({title, url, sentiment, topics, snippet});
    if (sentiment === 'positive') {pos++; grouped[keyword].pos++;}
    else if (sentiment === 'negative') {neg++; grouped[keyword].neg++;}
    else {neu++; grouped[keyword].neu++;}
    String(topics||'').split(',').filter(Boolean).forEach(t => topicCount[t.trim()] = (topicCount[t.trim()]||0)+1);
  });

  const topTopics = Object.entries(topicCount).sort((a,b)=>b[1]-a[1]).slice(0, 8);

  const insight = aiInsight({total: week.length, pos, neg, neu, topTopics, grouped});
  const html = render(week.length, {pos,neg,neu}, topTopics, grouped, insight);

  if (EMAIL_TO) GmailApp.sendEmail(EMAIL_TO, `[주간] 브랜드 멘션 다이제스트 — ${new Date().toISOString().slice(0,10)}`, '', {htmlBody: html});
  ss.getSheetByName('weekly_report').appendRow([new Date(), week.length, pos, neg, neu, JSON.stringify(insight)]);
}

function aiInsight(d) {
  const ctx = d.topTopics.map(([t,c])=>`${t}(${c})`).join(', ');
  const prompt = `
브랜드 매니저용 주간 코멘트 작성. 한국어 250자 이내.
데이터:
- 총 멘션: ${d.total}
- 감성: 긍정 ${d.pos} / 부정 ${d.neg} / 중립 ${d.neu}
- 상위 주제: ${ctx}

JSON: {"summary":"...","watch":"...","action":"..."}
- summary: 한 문장 종합
- watch: 다음 주 주의해서 지켜볼 한 가지
- action: 마케팅·CS·제품팀 중 한 곳에 보낼 권고 한 줄
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI}`;
  const r = UrlFetchApp.fetch(url, {method:'post', contentType:'application/json',
    payload: JSON.stringify({contents:[{parts:[{text:prompt}]}], generationConfig:{responseMimeType:'application/json'}})
  });
  return JSON.parse(JSON.parse(r.getContentText()).candidates[0].content.parts[0].text);
}

function render(total, sent, topTopics, grouped, ins) {
  const sumTotal = sent.pos + sent.neg + sent.neu || 1;
  const topicHtml = topTopics.map(([t,c])=>`<li><b>${t}</b> · ${c}건</li>`).join('');
  let kwHtml = '';
  for (const k in grouped) {
    const g = grouped[k];
    const negs = g.items.filter(it=>it.sentiment==='negative').slice(0,3);
    const negHtml = negs.length ? `<ul>${negs.map(n=>`<li><a href="${n.url}">${n.title}</a></li>`).join('')}</ul>` : '<p style="color:#888;">부정 멘션 없음</p>';
    kwHtml += `<h4>${k}</h4>
      <p>긍정 ${g.pos} / 부정 ${g.neg} / 중립 ${g.neu}</p>
      <p style="color:#b45309;"><b>주의 멘션</b></p>${negHtml}`;
  }
  return `<div style="font-family:'Noto Sans KR',sans-serif;line-height:1.7;max-width:740px;color:#222;">
    <h2 style="border-bottom:2px solid #b45309;padding-bottom:.5rem;">브랜드 멘션 주간 다이제스트</h2>
    <p style="color:#6a604f;">${new Date().toLocaleDateString('ko-KR')} · 총 ${total}건</p>
    <h3>전체 감성</h3>
    <p>긍정 ${(sent.pos/sumTotal*100).toFixed(0)}% / 부정 ${(sent.neg/sumTotal*100).toFixed(0)}% / 중립 ${(sent.neu/sumTotal*100).toFixed(0)}%</p>
    <h3>상위 주제</h3>
    <ul>${topicHtml}</ul>
    <h3>📌 핵심 인사이트</h3>
    <p><b>요약 — </b>${ins.summary}</p>
    <p><b>다음 주 관찰 — </b>${ins.watch}</p>
    <p><b>권고 액션 — </b>${ins.action}</p>
    <hr>
    <h3>키워드별 상세</h3>
    ${kwHtml}
    <p style="color:#999;font-size:.85em;margin-top:2rem;">자동 생성 · 출처: 네이버 블로그/카페/뉴스</p>
  </div>`;
}
```

---

## 강의 시연 포인트

1. `keywords` 시트에 자사 키워드 한 줄 추가 → `dailyCollect()` 즉시 실행 → 시트 채워지는 모습
2. `weeklyReport()` 즉시 실행 → 메일 도착
3. 일부러 부정 키워드("환불"·"후기 안 좋다") 추가 시 부정 즉시 Slack 알림 시연 → 위기관리 흐름 토론

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| 네이버 API 401 | Key 누락/오타 | 콘솔에서 새 Application 등록 확인 |
| 일 25,000 한도 초과 | 키워드 너무 많음 | 키워드 5개 이내, 검색 sort=date 유지 |
| AI가 모두 "중립" | 본문 스니펫이 너무 짧음 | 가능하면 검색결과 `description` 외 본문 일부 추가 (별도 fetch) |
| 부정 알림 폭주 | 키워드가 흔한 단어 | 키워드를 정확한 브랜드/제품명으로 좁힘 |

## 응용 아이디어

- **자동 응답 초안**: 네이버 블로그 부정 후기에 대해 CS 톤의 답변 초안 자동 작성 → 사람이 검토 후 발송
- **경쟁사 비교 트렌드**: 자사·경쟁사 멘션 추이를 차트로 시각화
- **제품팀 VOC 자동 라우팅**: 주제가 "품질/UX"이면 제품팀, "가격"이면 영업팀으로 자동 분기
- **인플루언서 스코어링**: 자주 언급하는 블로거를 자동 식별해 협업 후보 리스트 작성
