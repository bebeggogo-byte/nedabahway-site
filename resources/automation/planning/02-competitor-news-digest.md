# 기획 자동화 #2 — 경쟁사·뉴스 일일 다이제스트

> **한 줄 핵심**: 경쟁사 키워드와 뉴스 RSS를 매일 새벽 자동 수집·요약해, 출근 전 한 장의 다이제스트를 메일/Slack으로 받는다.

## 왜 이 자동화인가

| 항목 | 수동(Before) | 자동(After) |
|---|---|---|
| 매일 검색·정리 | 40~90분 | 0분 |
| 정보 누락 | 자주 발생 | 매우 드묾 |
| 보고용 리포트 작성 | 주 2시간 | 클릭 1회 |
| 1년 시간 절감 | — | **약 200시간/기획자 1인** |

**적용 시나리오**: 마케팅·전략기획·PR·투자분석·영업기획.

## 구성요소

- Google Sheet (키워드·결과 저장)
- 네이버 뉴스 RSS / Google News RSS / 산업 RSS (무료)
- Gemini API (요약·중복 제거)
- Gmail (자동 발송) 또는 Slack Webhook
- Apps Script 시간 트리거 (매일 06:30)

월 비용: **0원**.

## 셋업 가이드

### Step 1. 시트 만들기 — 두 개의 탭
**탭1 `keywords`**:
| 카테고리 | 키워드 | RSS_URL |
|---|---|---|
| 경쟁사 | 토스 | `https://news.google.com/rss/search?q=토스&hl=ko` |
| 산업 | 핀테크 | `https://news.google.com/rss/search?q=핀테크&hl=ko` |
| 자사 멘션 | 우리회사명 | `https://news.google.com/rss/search?q=우리회사명&hl=ko` |

**탭2 `digest_log`** (자동 채워짐):
| 발송일 | 제목 | URL | 카테고리 | 요약 |

### Step 2. 키 발급 (이전 가이드 참고)
- `GEMINI_API_KEY`
- `SHEET_ID`
- `RECIPIENT_EMAIL` (또는 `SLACK_WEBHOOK`)

### Step 3. Apps Script 붙여넣기 → 시간 트리거 매일 06:30 설정.

---

## 완성 코드 (`script.gs`)

```javascript
const PROPS = PropertiesService.getScriptProperties();
const GEMINI_KEY = PROPS.getProperty('GEMINI_API_KEY');
const SHEET_ID   = PROPS.getProperty('SHEET_ID');
const EMAIL_TO   = PROPS.getProperty('RECIPIENT_EMAIL') || '';
const SLACK_HOOK = PROPS.getProperty('SLACK_WEBHOOK') || '';

const LOOKBACK_HOURS = 24;
const MAX_PER_KEYWORD = 8;

function dailyDigest() {
  const ss = SpreadsheetApp.openById(SHEET_ID);
  const kw = ss.getSheetByName('keywords').getDataRange().getValues();
  const log = ss.getSheetByName('digest_log');

  const since = new Date(Date.now() - LOOKBACK_HOURS * 3600 * 1000);
  const collected = [];

  for (let i = 1; i < kw.length; i++) {
    const [category, keyword, rssUrl] = kw[i];
    if (!rssUrl) continue;
    const items = fetchRSS(rssUrl, since).slice(0, MAX_PER_KEYWORD);
    items.forEach(it => collected.push({...it, category, keyword}));
    Utilities.sleep(800);
  }

  if (collected.length === 0) {
    Logger.log('수집된 뉴스 0건. 다이제스트 생략.');
    return;
  }

  const dedup = deduplicate(collected);
  const summarized = summarizeBatch(dedup);
  const html = buildDigestHTML(summarized);

  // 로그 적재
  const today = new Date().toISOString().slice(0,10);
  summarized.forEach(s => log.appendRow([today, s.title, s.url, s.category, s.summary]));

  if (EMAIL_TO) {
    GmailApp.sendEmail(EMAIL_TO, `[데일리] ${today} 경쟁사·산업 다이제스트`, '', {htmlBody: html});
  }
  if (SLACK_HOOK) {
    UrlFetchApp.fetch(SLACK_HOOK, {
      method: 'post', contentType: 'application/json',
      payload: JSON.stringify({text: htmlToSlackText(summarized, today)})
    });
  }
}

function fetchRSS(url, since) {
  try {
    const xml = UrlFetchApp.fetch(url, {muteHttpExceptions: true}).getContentText();
    const doc = XmlService.parse(xml);
    const items = doc.getRootElement().getChild('channel').getChildren('item');
    return items.map(it => ({
      title: it.getChildText('title') || '',
      url:   it.getChildText('link')  || '',
      pub:   new Date(it.getChildText('pubDate') || Date.now()),
      desc:  (it.getChildText('description') || '').replace(/<[^>]+>/g, '').slice(0, 500)
    })).filter(it => it.pub >= since);
  } catch(e) {
    Logger.log(`RSS 실패 ${url}: ${e}`);
    return [];
  }
}

function deduplicate(items) {
  const seen = new Set();
  return items.filter(it => {
    const key = it.title.replace(/\s+/g, '').slice(0, 30);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function summarizeBatch(items) {
  const prompt = `
다음 뉴스 ${items.length}건을 각각 한국어 1~2문장으로 요약하세요.
- 핵심 사실만, 추측 금지
- "~다"체로 통일
- JSON 배열만 반환: [{"summary":"..."},...]
순서 유지.

뉴스:
${items.map((it,i)=>`[${i+1}] ${it.title}\n${it.desc}`).join('\n\n')}
`;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_KEY}`;
  const res = UrlFetchApp.fetch(url, {
    method: 'post', contentType: 'application/json',
    payload: JSON.stringify({
      contents:[{parts:[{text: prompt}]}],
      generationConfig:{responseMimeType: 'application/json'}
    })
  });
  const arr = JSON.parse(JSON.parse(res.getContentText()).candidates[0].content.parts[0].text);
  return items.map((it, i) => ({...it, summary: (arr[i]||{}).summary || ''}));
}

function buildDigestHTML(items) {
  const grouped = {};
  items.forEach(it => {
    grouped[it.category] = grouped[it.category] || [];
    grouped[it.category].push(it);
  });
  let html = `<div style="font-family:'Noto Sans KR',sans-serif;max-width:680px;line-height:1.6;">
    <h2 style="border-bottom:2px solid #b45309;padding-bottom:.4rem;">📊 데일리 다이제스트</h2>
    <p style="color:#6a604f;">${new Date().toLocaleDateString('ko-KR')} · 총 ${items.length}건</p>`;
  for (const cat in grouped) {
    html += `<h3 style="margin-top:1.5rem;color:#3a322a;">${cat}</h3><ul>`;
    grouped[cat].forEach(it => {
      html += `<li style="margin-bottom:.6rem;"><a href="${it.url}" style="color:#b45309;text-decoration:none;font-weight:600;">${it.title}</a><br><span style="color:#555;font-size:.95em;">${it.summary}</span></li>`;
    });
    html += `</ul>`;
  }
  html += `<p style="color:#999;font-size:.85em;margin-top:2rem;">자동 생성 · 출처는 각 링크 참조</p></div>`;
  return html;
}

function htmlToSlackText(items, date) {
  const grouped = {};
  items.forEach(it => { grouped[it.category] = grouped[it.category] || []; grouped[it.category].push(it); });
  let txt = `*📊 ${date} 데일리 다이제스트* (${items.length}건)\n`;
  for (const cat in grouped) {
    txt += `\n*${cat}*\n`;
    grouped[cat].forEach(it => txt += `• <${it.url}|${it.title}> — ${it.summary}\n`);
  }
  return txt;
}
```

---

## 강의 시연 포인트

1. `keywords` 시트의 한 행을 추가/수정하며 "코드 한 줄도 안 고치고 모니터링 대상 변경" 시연
2. `dailyDigest()` 수동 실행 → 1분 내 메일/Slack에 도착하는 모습 보여주기
3. 키워드 잘못 잡혔을 때 → AI 요약 한 줄로 빠르게 무관함 판별 가능 강조

## 트러블슈팅

| 증상 | 원인 | 해결 |
|---|---|---|
| RSS 0건 | 키워드 너무 좁음 / RSS URL 만료 | Google News RSS는 한국어 검색에 `&hl=ko&gl=KR&ceid=KR:ko` 추가 |
| Gemini 응답 잘림 | items가 50건 초과 | `MAX_PER_KEYWORD` 줄이거나 `summarizeBatch`를 청크로 분할 |
| Gmail 송신 실패 | 일일 한도(개인계정 100건) | Workspace 계정 사용 또는 Slack만 사용 |
| 트리거 시간 어긋남 | Apps Script는 ±1시간 |  업무 시작 1시간 전으로 설정 |

## 응용 아이디어

- **카테고리별 가중치**: `keywords` 시트에 `priority` 컬럼 추가 → 높은 우선순위는 별도 강조
- **PDF 보고서**: HTML을 `DocumentApp`으로 변환해 주간 PDF로 자동 보관
- **Slack 인터랙션**: 다이제스트 카드에 "관심 / 무관심" 버튼 추가하여 학습 데이터로 활용
- **자사 멘션 알림**: 자사 키워드 카테고리만 즉시 알림(트리거 분리)으로 위기 대응 단축
