/**
 * tools/_lib.js — 9개 미니 도구 공용 라이브러리
 *
 * 책임:
 *  - Gemini API 키 보관(localStorage) + 검증
 *  - generateContent() 호출 (JSON 모드, 에러 표준화)
 *  - 결과 카드 렌더링 (복사·CSV·JSON 다운로드)
 *  - 폼 자동 직렬화 + 로딩 상태
 *
 * 의존성 없음. 모든 도구가 <script src="/auto/tools/_lib.js" defer> 한 줄로 로드.
 */
(function () {
  'use strict';

  const KEY_STORAGE = 'mz_gemini_key_v1';
  const MODEL = 'gemini-2.5-flash';
  const ENDPOINT = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

  // ─────────────────────────────────────────
  // 키 관리 UI
  // ─────────────────────────────────────────
  function getKey() {
    return (localStorage.getItem(KEY_STORAGE) || '').trim();
  }
  function setKey(k) {
    if (k) localStorage.setItem(KEY_STORAGE, k.trim());
    else localStorage.removeItem(KEY_STORAGE);
  }
  function maskKey(k) {
    if (!k) return '';
    if (k.length < 12) return '•'.repeat(k.length);
    return k.slice(0, 6) + '••••••••' + k.slice(-4);
  }

  function mountKeyBox(el) {
    if (!el) return;
    const cur = getKey();
    el.innerHTML = `
      <label for="mz-key">Gemini API 키
        <small>· 브라우저에만 저장됨, 서버 전송 없음</small></label>
      <input id="mz-key" type="password" autocomplete="off" spellcheck="false"
             placeholder="AIzaSy..." value="${cur}">
      <button type="button" id="mz-save">${cur ? '저장됨 ✓' : '저장'}</button>
      <div class="key-help">
        키 없으세요? → <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener">aistudio.google.com/apikey</a> 에서 1분 발급 (무료, 분당 15회 무료 호출)
        ${cur ? '<br>현재 키: <code>' + escapeHtml(maskKey(cur)) + '</code> · <a href="#" id="mz-clear">삭제</a>' : ''}
      </div>
    `;
    const input = el.querySelector('#mz-key');
    const btn = el.querySelector('#mz-save');
    btn.classList.toggle('is-ok', !!cur);
    btn.addEventListener('click', () => {
      const v = input.value.trim();
      if (!v) { alert('키를 붙여넣은 뒤 저장하세요.'); return; }
      setKey(v);
      btn.textContent = '저장됨 ✓';
      btn.classList.add('is-ok');
      mountKeyBox(el); // re-render so 삭제 링크 등 노출
    });
    const clear = el.querySelector('#mz-clear');
    if (clear) clear.addEventListener('click', (e) => {
      e.preventDefault();
      if (!confirm('저장된 Gemini 키를 삭제할까요? 브라우저에서만 지워지고 도구는 다시 키를 요구합니다.')) return;
      setKey('');
      mountKeyBox(el);
    });
  }

  // ─────────────────────────────────────────
  // Gemini 호출
  // ─────────────────────────────────────────
  async function generate(prompt, opts) {
    opts = opts || {};
    const key = getKey();
    if (!key) {
      const e = new Error('NO_KEY');
      e.userMessage = 'Gemini API 키를 먼저 입력하고 저장하세요. 무료입니다.';
      throw e;
    }
    const body = {
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: opts.json === false ? 'text/plain' : 'application/json',
        ...(opts.maxOutputTokens && { maxOutputTokens: opts.maxOutputTokens }),
        ...(opts.temperature !== undefined && { temperature: opts.temperature }),
      },
    };
    const res = await fetch(`${ENDPOINT}?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      let detail = '';
      try { detail = (await res.json()).error?.message || ''; } catch (_) { /* noop */ }
      const e = new Error('API_ERROR_' + res.status);
      e.userMessage = friendlyError(res.status, detail);
      throw e;
    }
    const data = await res.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    if (!text) {
      const e = new Error('EMPTY_RESPONSE');
      e.userMessage = '모델이 빈 응답을 반환했습니다. 입력을 줄이거나 다시 시도하세요.';
      throw e;
    }
    if (opts.json === false) return text;
    try { return JSON.parse(text); }
    catch (_) {
      const m = text.match(/[\[{][\s\S]*[\]}]/);
      if (m) { try { return JSON.parse(m[0]); } catch (_) { /* noop */ } }
      const e = new Error('PARSE_ERROR');
      e.userMessage = 'AI 응답을 JSON으로 해석하지 못했습니다. 다시 시도하면 대부분 해결됩니다.';
      e.raw = text;
      throw e;
    }
  }

  function friendlyError(status, detail) {
    if (status === 400) return '요청 형식 문제. 입력 내용이 너무 길거나 비었을 수 있습니다.';
    if (status === 401 || status === 403) return 'API 키가 잘못되었거나 권한이 없습니다. 키를 다시 확인해주세요.';
    if (status === 429) return '분당 호출 한도를 잠시 초과했습니다. 1분 뒤 다시 시도하세요.';
    if (status >= 500) return 'Gemini 서버 일시 오류. 잠시 후 다시 시도하세요.';
    return detail ? detail : '알 수 없는 오류 (HTTP ' + status + ')';
  }

  // ─────────────────────────────────────────
  // 결과 카드 렌더링 + 다운로드
  // ─────────────────────────────────────────
  function renderResult(target, opts) {
    if (!target) return;
    target.innerHTML = '';
    const card = document.createElement('div');
    card.className = 'result-card';
    const head = document.createElement('header');
    head.innerHTML = '<span>' + escapeHtml(opts.title || '결과') + '</span><div class="actions"></div>';
    const actions = head.querySelector('.actions');
    const body = document.createElement('div');
    body.className = 'body';
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else body.appendChild(opts.body);

    (opts.actions || []).forEach((a) => {
      const b = document.createElement('button');
      b.type = 'button';
      b.textContent = a.label;
      b.addEventListener('click', async () => {
        try {
          await a.run();
          const orig = b.textContent;
          b.textContent = a.doneLabel || '완료 ✓';
          b.classList.add('is-done');
          setTimeout(() => { b.textContent = orig; b.classList.remove('is-done'); }, 1600);
        } catch (e) {
          alert(e.userMessage || e.message);
        }
      });
      actions.appendChild(b);
    });

    card.appendChild(head);
    card.appendChild(body);
    target.appendChild(card);

    // ─── 결과 카드 훅 (Batch 2) ─────────────
    // 자동 히스토리 저장 + 비슷한 도구 + 자동화 가이드 + 피드백
    // 훅 생성 실패는 도구 본체 동작을 막지 않도록 모두 swallow한다.
    try { saveToHistory(opts); } catch (_) { /* swallow */ }
    try { appendHooks(card); } catch (_) { /* swallow */ }
  }

  // ─────────────────────────────────────────
  // 결과 카드 훅 — 12개 도구 HTML 변경 0줄로 적용
  // ─────────────────────────────────────────

  // SYNC: scripts/automation_meta.py CARDS — 신규 도구 추가 시 여기도 갱신
  // 형태: { slug: { name, summary, cat, level, guide(optional) } }
  // cat: 'create' (만들기) | 'analyze' (분석·분류)
  // level: 1=★, 2=★★, 3=★★★
  const TOOLS = {
    'meeting-actions':   { name: '회의록 → 액션아이템',     summary: '회의록을 붙이면 결정·할일·담당자가 정리됩니다.',         cat: 'create',    level: 1, guide: '/resources/automation/planning/01-meeting-notes-to-actions.html' },
    'news-digest':       { name: '경쟁사·뉴스 다이제스트',  summary: '키워드 → RSS 후보 + 다이제스트 미리보기.',                cat: 'create',    level: 2, guide: '/resources/automation/planning/02-competitor-news-digest.html' },
    'kpi-comment':       { name: '주간 KPI 코멘트',           summary: 'KPI 표 → 변화·우려·다음 주 권고 코멘트.',                 cat: 'create',    level: 2, guide: '/resources/automation/planning/03-weekly-kpi-report.html' },
    'onboarding-kit':    { name: '입사자 환영 키트',           summary: '환영 메일 + 90일 체크리스트 + Slack 공지.',                cat: 'create',    level: 2, guide: '/resources/automation/hr/01-onboarding-kit.html' },
    'leave-summary':     { name: '휴가 신청 정리',              summary: '자유 텍스트 → 표 + 캘린더·Slack 카드.',                    cat: 'create',    level: 3, guide: '/resources/automation/hr/02-leave-approval-workflow.html' },
    'pulse-analysis':    { name: '설문 응답 분석',              summary: '익명 응답 → 감성·주제 + 1페이지 코멘트.',                  cat: 'analyze',   level: 2, guide: '/resources/automation/hr/03-pulse-survey-sentiment.html' },
    'resume-screening':  { name: '이력서 5분 스크리닝',       summary: '공고+이력서 → 매칭도 + 강점·우려 + 면접 질문.',             cat: 'analyze',   level: 2 },
    'content-calendar':  { name: '30일 콘텐츠 캘린더',         summary: '월 테마 → 30일치 헤드라인·후크·CTA.',                       cat: 'create',    level: 1, guide: '/resources/automation/marketing/01-content-calendar-generator.html' },
    'lead-scoring':      { name: '리드 스코어링',              summary: '리드 정보 → 룰+AI 점수 + 첫 응답 메시지.',                 cat: 'analyze',   level: 2, guide: '/resources/automation/marketing/02-lead-scoring-router.html' },
    'mention-classifier':{ name: '리뷰·멘션 분류기',          summary: '멘션 → 감성·주제 + 부정 멘션 즉시 강조.',                  cat: 'analyze',   level: 2, guide: '/resources/automation/marketing/03-review-mention-digest.html' },
    'sales-followup':    { name: '세일즈 콜 후속 메일',        summary: '미팅 메모 → 후속 메일 + 다음 단계 + 일정 제안.',           cat: 'create',    level: 1 },
    'mail-reply-drafter':{ name: '메일 답장 초안기',           summary: '받은 메일 + 톤 → 한 줄·짧은·자세한 답장 3종.',             cat: 'create',    level: 1 },
  };

  const HISTORY_KEY = 'mz:history';
  const HISTORY_MAX = 30;

  // 현재 페이지 URL에서 /auto/tools/{slug}/ 패턴의 slug 추출
  function currentSlug() {
    const m = (window.location.pathname || '').match(/\/auto\/tools\/([a-z0-9-]+)\/?$/);
    return m ? m[1] : '';
  }

  // 결과 본문 + 액션을 합쳐 가져갈 수 있는 텍스트 한 덩어리 반환
  function extractFullText(opts, card) {
    // body가 string이면 태그 제거 후 텍스트
    if (typeof opts.body === 'string') {
      const tmp = document.createElement('div');
      tmp.innerHTML = opts.body;
      return (tmp.textContent || '').replace(/\s+/g, ' ').trim();
    }
    // DOM이면 textContent
    const el = card.querySelector('.body');
    return el ? (el.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }

  function saveToHistory(opts) {
    const slug = currentSlug();
    if (!slug) return; // 도구 페이지가 아닌 곳에서는 저장 건너뛰기
    let store;
    try {
      store = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      if (!Array.isArray(store)) store = [];
    } catch (_) { store = []; }
    const card = document.querySelector('.result-card');
    const fullText = extractFullText(opts, card || document.createElement('div'));
    const entry = {
      id: Math.random().toString(36).slice(2, 10),
      ts: new Date().toISOString(),
      slug,
      title: String(opts.title || '결과'),
      preview: fullText.slice(0, 120),
      fullText: fullText.slice(0, 4000), // 너무 큰 결과는 잘림
    };
    store.unshift(entry);
    if (store.length > HISTORY_MAX) store.length = HISTORY_MAX;
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(store));
    } catch (_) { /* QuotaExceeded 등 무시 */ }
  }

  function appendHooks(card) {
    const slug = currentSlug();
    if (!slug) return; // 도구 페이지 아닌 곳에서는 훅 미부착
    const tool = TOOLS[slug];
    if (!tool) return; // 매핑에 없는 slug면 미부착 (안전)

    const block = document.createElement('div');
    block.className = 'mz-hook-block';

    // 1) 비슷한 도구 (같은 cat, 자기 제외, 난이도 오름차순, 최대 3개)
    const related = Object.entries(TOOLS)
      .filter(([s, t]) => s !== slug && t.cat === tool.cat)
      .sort((a, b) => a[1].level - b[1].level)
      .slice(0, 3);
    if (related.length) {
      const sec = document.createElement('div');
      sec.className = 'mz-related';
      sec.innerHTML = '<h5>비슷한 도구</h5><div class="mz-related__grid">' +
        related.map(([s, t]) =>
          `<a class="mz-related__card" href="/auto/tools/${s}/">` +
            `<strong>${escapeHtml(t.name)}</strong>` +
            `<span>${escapeHtml(t.summary)}</span>` +
          `</a>`
        ).join('') +
        '</div>';
      block.appendChild(sec);
    }

    // 2) 자동화 가이드 링크 (있는 도구만)
    if (tool.guide) {
      const a = document.createElement('a');
      a.className = 'mz-guide';
      a.href = tool.guide;
      a.textContent = '이 작업을 매주/매일 자동으로 → 가이드 보기';
      block.appendChild(a);
    }

    // 3) 피드백 한 줄 (모든 도구)
    const fb = document.createElement('a');
    fb.className = 'mz-feedback';
    const subj = encodeURIComponent('[' + slug + '] 도구 피드백');
    fb.href = 'mailto:nedabah.way@gmail.com?subject=' + subj;
    fb.textContent = '이 결과 어땠나요? 한 줄 의견 → nedabah.way@gmail.com';
    block.appendChild(fb);

    card.appendChild(block);
  }

  function renderError(target, e) {
    target.innerHTML = `
      <div class="error-card">
        <strong>오류가 발생했습니다</strong>
        ${escapeHtml(e.userMessage || e.message)}
        ${e.raw ? '<pre style="margin-top:.5rem;white-space:pre-wrap;font-size:.78rem;color:#5a3a3a;">' + escapeHtml(String(e.raw).slice(0, 600)) + '</pre>' : ''}
      </div>
    `;
  }

  async function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
    } else {
      const ta = document.createElement('textarea');
      ta.value = text; ta.style.cssText = 'position:absolute;left:-9999px;';
      document.body.appendChild(ta); ta.select();
      try { document.execCommand('copy'); } finally { document.body.removeChild(ta); }
    }
  }

  function downloadFile(filename, content, mime) {
    const blob = new Blob([content], { type: mime || 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click();
    setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 200);
  }

  function toCSV(rows) {
    return rows.map((r) =>
      r.map((c) => {
        const s = String(c == null ? '' : c);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }).join(',')
    ).join('\n');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ─────────────────────────────────────────
  // 로딩 상태 헬퍼
  // ─────────────────────────────────────────
  function setLoading(btn, isLoading) {
    if (!btn) return;
    if (isLoading) {
      btn.dataset.loading = '1';
      btn.disabled = true;
    } else {
      btn.removeAttribute('data-loading');
      btn.disabled = false;
    }
  }

  // ─────────────────────────────────────────
  // 자동 init: 페이지에 #mz-key-box 가 있으면 마운트
  // ─────────────────────────────────────────
  function init() {
    const box = document.getElementById('mz-key-box');
    if (box) mountKeyBox(box);
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 전역 노출
  window.MZ = {
    generate,
    renderResult,
    renderError,
    setLoading,
    copyText,
    downloadFile,
    toCSV,
    escapeHtml,
    getKey,
  };
})();
