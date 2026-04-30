/**
 * resources-search-v1.js — 자료실 검색 위젯 (SPEC-SEARCH-001 M3)
 * 자료실 마스터 페이지에 검색 박스 동적 삽입.
 */
(function() {
  'use strict';
  if (!window.location.pathname.startsWith('/resources/')) return;
  
  const INDEX_URL = '/resources/_data/search-index.json';
  let index = null;
  
  async function loadIndex() {
    try {
      const res = await fetch(INDEX_URL);
      if (!res.ok) return;
      index = await res.json();
    } catch (e) {}
  }
  
  function search(q) {
    if (!index || !q || q.length < 2) return [];
    const ql = q.toLowerCase();
    return (index.items || []).filter(it => 
      (it._search_text || '').includes(ql)
    ).slice(0, 20);
  }
  
  function render(results, container) {
    if (results.length === 0) {
      container.innerHTML = '<p style="color:#5a5048;padding:1rem 0">검색 결과가 없습니다.</p>';
      return;
    }
    container.innerHTML = results.map(r => `
      <a href="${r.url}" style="display:block;padding:1rem;background:#fdfaf3;border-left:3px solid #1E40AF;margin:.5rem 0;text-decoration:none;color:inherit">
        <div style="font-size:.8rem;color:#5a5048;margin-bottom:.25rem">${r.format} · ${r.published || ''}</div>
        <div style="font-weight:600;color:#2a241c">${escapeHtml(r.title)}</div>
        ${r.summary ? `<div style="font-size:.9rem;color:#5a5048;margin-top:.4rem">${escapeHtml(r.summary)}</div>` : ''}
      </a>
    `).join('');
  }
  
  function escapeHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  
  function debounce(fn, ms) {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
  }
  
  async function init() {
    await loadIndex();
    if (!index) return;
    
    const wrapper = document.createElement('div');
    wrapper.id = 'resources-search-widget';
    wrapper.style.cssText = 'max-width:1080px;margin:1rem auto 2rem;padding:0 1rem';
    wrapper.innerHTML = `
      <div style="position:relative">
        <input type="search" id="rsw-input" placeholder="자료 검색 (2글자 이상)" 
          style="width:100%;padding:.75rem 1rem;font-size:1rem;border:1px solid #d8cdb8;border-radius:6px;background:#fdfaf3;color:#2a241c"
          aria-label="자료 검색">
        <div id="rsw-results" style="margin-top:.5rem"></div>
      </div>
      <div style="font-size:.75rem;color:#5a5048;margin-top:.5rem;text-align:right">
        인덱스: ${index.total_indexed}건 (검수 대기 ${index.excluded_internal}건 제외)
      </div>
    `;
    
    // main 또는 .masthead 다음에 삽입
    const main = document.querySelector('main') || document.querySelector('.masthead') || document.body;
    if (main.parentNode) {
      main.parentNode.insertBefore(wrapper, main);
    }
    
    const input = document.getElementById('rsw-input');
    const results = document.getElementById('rsw-results');
    const handler = debounce((e) => {
      const q = e.target.value.trim();
      if (q.length < 2) { results.innerHTML = ''; return; }
      render(search(q), results);
    }, 200);
    input.addEventListener('input', handler);
    
    // ?q=... URL 파라미터 자동 검색 (REQ-E-4)
    const urlQ = new URLSearchParams(window.location.search).get('q');
    if (urlQ) {
      input.value = urlQ;
      render(search(urlQ), results);
    }
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
