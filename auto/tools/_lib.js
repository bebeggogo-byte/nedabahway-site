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
