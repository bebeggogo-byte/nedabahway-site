/**
 * related-posts-v1.js — 관점 노트 관련글 추천 (2026-05-01)
 *
 * 동작:
 *  1. 현재 페이지 URL을 _data.json에서 매칭
 *  2. 동일 axis.topic & axis.emotion 기준 코사인 유사도 계산
 *  3. 상위 3편을 footer-note 위쪽에 렌더링
 *  4. 외부 호출 0건 — 로컬 _data.json만 사용
 *
 * 사용:
 *   <div id="related-posts"></div>
 *   <script src="/assets/related-posts-v1.js"></script>
 */
(function() {
  'use strict';

  const DATA_URL = '/blog/perspective/_data.json';
  const CONTAINER_ID = 'related-posts';
  const TOP_N = 3;

  function score(current, candidate) {
    if (!current.axis || !candidate.axis) return 0;
    let s = 0;
    if (current.axis.topic && current.axis.topic === candidate.axis.topic) s += 3;
    if (current.axis.emotion && current.axis.emotion === candidate.axis.emotion) s += 2;
    if (current.axis.reader && current.axis.reader === candidate.axis.reader) s += 1;
    if (current.axis.form && current.axis.form === candidate.axis.form) s += 1;
    // 동일 시리즈는 가중치 추가 (G6 추가 메타)
    if (current.series && current.series === candidate.series) s += 4;
    return s;
  }

  function render(currentItem, related) {
    const container = document.getElementById(CONTAINER_ID);
    if (!container || related.length === 0) return;

    const html = `
      <aside class="related-posts" style="margin: 3rem 0 2rem; padding: 1.5rem 0; border-top: 1px solid #d8cdb8;">
        <h2 style="font-size: 1.1rem; font-weight: 600; color: #5a5048; margin: 0 0 1rem; letter-spacing: -.01em;">관련 관점 노트</h2>
        <ul style="list-style: none; padding: 0; margin: 0; display: grid; gap: 1rem;">
          ${related.map(item => `
            <li style="padding: 1rem; background: #fdfaf3; border-left: 3px solid #1E40AF; border-radius: 2px;">
              <a href="${item.url}" style="text-decoration: none; color: inherit;">
                <div style="font-size: .8rem; color: #5a5048; margin-bottom: .25rem;">${item.date || ''} · ${(item.axis && item.axis.topic) || ''}</div>
                <div style="font-size: 1.05rem; font-weight: 600; color: #2a241c; line-height: 1.4;">${escapeHtml(item.title)}</div>
                ${item.excerpt ? `<div style="font-size: .9rem; color: #5a5048; margin-top: .4rem; line-height: 1.5;">${escapeHtml(item.excerpt)}</div>` : ''}
              </a>
            </li>
          `).join('')}
        </ul>
      </aside>
    `;
    container.innerHTML = html;
  }

  function escapeHtml(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function init() {
    try {
      const res = await fetch(DATA_URL, { cache: 'force-cache' });
      if (!res.ok) return;
      const data = await res.json();
      const items = Array.isArray(data) ? data : (data.articles || data.items || []);
      if (!items.length) return;

      const currentPath = window.location.pathname;
      const currentItem = items.find(it =>
        it.url === currentPath || (it.url && currentPath.endsWith(it.url.split('/').pop()))
      );
      if (!currentItem) return;

      const scored = items
        .filter(it => it.url !== currentItem.url)
        .map(it => ({ item: it, score: score(currentItem, it) }))
        .filter(x => x.score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, TOP_N)
        .map(x => x.item);

      render(currentItem, scored);
    } catch (e) {
      // 정적 사이트 — 무인 실패 (콘솔 노이즈 0)
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
