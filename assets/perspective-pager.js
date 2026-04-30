/* perspective-pager.js — 글 페이지 책 넘김 네비
   현재 글의 slug를 canonical에서 추출 → 100편 전체 메타에서 인덱스 잡고
   ←/→ 키, 좌우 스와이프, 화면 좌우 화살표 클릭으로 이전/다음 글로 이동.
   작성: 2026-04-30 */

(function(){
  if (window.__pspPagerLoaded) return;
  window.__pspPagerLoaded = true;

  // 관점 노트 글 페이지에서만 동작
  const path = location.pathname;
  if (!/\/blog\/perspective\/\d{4}-\d{2}-\d{2}_/.test(path)) return;

  function currentSlug(){
    // canonical 또는 location에서 파일명 추출
    let url = location.pathname;
    const m = url.match(/\/blog\/perspective\/([^/?#]+\.html)$/);
    if (!m) return null;
    return decodeURIComponent(m[1]).replace(/\.html$/, '');
  }

  function fmtDate(s){
    if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || '';
    return s; // 그대로 표시
  }

  function build(items, idx){
    const total = items.length;
    const prev = idx > 0 ? items[idx-1] : null;          // 이전(시간상 이전 = 더 오래된)
    const next = idx < total-1 ? items[idx+1] : null;    // 다음(더 최신)

    // 정렬 보장: items는 최신순(date_desc)이라고 가정 → 좌(이전 글)는 idx+1, 우(다음 글)은 idx-1
    // 사용자 직관: ← 이전 글(시간상 더 과거), → 다음 글(시간상 더 미래/최신)
    // 따라서 "이전 글" = idx+1 (더 과거), "다음 글" = idx-1 (더 최신)
    const olderItem = idx < total-1 ? items[idx+1] : null;
    const newerItem = idx > 0 ? items[idx-1] : null;

    const wrap = document.createElement('div');
    wrap.className = 'psp-pager';

    if (olderItem){
      const a = document.createElement('a');
      a.className = 'psp-pager__btn psp-pager__btn--prev';
      a.href = './' + encodeURIComponent(olderItem.slug) + '.html';
      a.setAttribute('aria-label', '이전 글로 (' + (olderItem.title||'') + ')');
      a.innerHTML = '‹<span class="psp-pager__hover">' +
        '← ' + escapeHtml(fmtDate(olderItem.date)) + ' · ' +
        escapeHtml(olderItem.title||'') + '</span>';
      wrap.appendChild(a);
    } else {
      const a = document.createElement('span');
      a.className = 'psp-pager__btn psp-pager__btn--prev';
      a.setAttribute('aria-disabled','true');
      a.innerHTML = '‹';
      wrap.appendChild(a);
    }

    if (newerItem){
      const a = document.createElement('a');
      a.className = 'psp-pager__btn psp-pager__btn--next';
      a.href = './' + encodeURIComponent(newerItem.slug) + '.html';
      a.setAttribute('aria-label', '다음 글로 (' + (newerItem.title||'') + ')');
      a.innerHTML = '›<span class="psp-pager__hover">' +
        escapeHtml(newerItem.title||'') + ' · ' +
        escapeHtml(fmtDate(newerItem.date)) + ' →</span>';
      wrap.appendChild(a);
    } else {
      const a = document.createElement('span');
      a.className = 'psp-pager__btn psp-pager__btn--next';
      a.setAttribute('aria-disabled','true');
      a.innerHTML = '›';
      wrap.appendChild(a);
    }

    // 진행 막대 (최신 = 100/100, 가장 오래된 = 1/100)
    // idx=0이면 최신글이므로 100%, idx=total-1이면 1편째 → 1/total
    const orderFromOldest = total - idx; // 1..total
    const pct = total > 1 ? Math.round((orderFromOldest / total) * 100) : 100;

    const prog = document.createElement('div');
    prog.className = 'psp-progress';
    prog.innerHTML = '<div class="psp-progress__bar" style="width:' + pct + '%"></div>';

    const meta = document.createElement('a');
    meta.className = 'psp-meta';
    meta.href = '/blog/perspective/';
    meta.setAttribute('aria-label','관점 노트 전체 목록으로');
    meta.innerHTML =
      '<span class="psp-meta__idx">' + orderFromOldest + ' / ' + total + '</span>' +
      '<span class="psp-meta__sep">·</span>' +
      '<span class="psp-meta__back">목록 ↩︎</span>';

    document.body.appendChild(wrap);
    document.body.appendChild(prog);
    document.body.appendChild(meta);

    // 키보드 ←/→
    document.addEventListener('keydown', function(e){
      const tag = (document.activeElement && document.activeElement.tagName) || '';
      if (['INPUT','TEXTAREA','SELECT'].indexOf(tag) >= 0) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowLeft' && olderItem){
        e.preventDefault();
        location.href = './' + encodeURIComponent(olderItem.slug) + '.html';
      } else if (e.key === 'ArrowRight' && newerItem){
        e.preventDefault();
        location.href = './' + encodeURIComponent(newerItem.slug) + '.html';
      }
    });

    // 터치 스와이프
    let sx = 0, sy = 0, dx = 0, dy = 0, active = false;
    document.addEventListener('touchstart', function(e){
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
      dx = 0; dy = 0; active = true;
    }, {passive:true});
    document.addEventListener('touchmove', function(e){
      if (!active) return;
      dx = e.touches[0].clientX - sx; dy = e.touches[0].clientY - sy;
    }, {passive:true});
    document.addEventListener('touchend', function(){
      if (!active) return; active = false;
      // 가로 스와이프가 세로보다 1.4배 이상 + 80px 이상일 때만 작동 (스크롤 방해 방지)
      if (Math.abs(dx) > 80 && Math.abs(dx) > Math.abs(dy) * 1.4){
        if (dx < 0 && newerItem){
          location.href = './' + encodeURIComponent(newerItem.slug) + '.html';
        } else if (dx > 0 && olderItem){
          location.href = './' + encodeURIComponent(olderItem.slug) + '.html';
        }
      }
    });
  }

  function escapeHtml(s){
    return String(s||'').replace(/[&<>"']/g, function(m){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m];
    });
  }

  function init(){
    const slug = currentSlug();
    if (!slug) return;
    fetch('/blog/perspective/_data.json', {cache:'no-store'})
      .then(function(r){ return r.ok ? r.json() : null; })
      .then(function(data){
        if (!data || !Array.isArray(data.items)) return;
        // _data.json의 items[].url은 "/blog/perspective/{slug}.html" 형태
        // 정렬 보장: 최신순(date desc)
        const items = data.items.slice().map(function(it){
          const m = (it.url || '').match(/\/([^/]+)\.html$/);
          return Object.assign({}, it, { slug: m ? decodeURIComponent(m[1]) : '' });
        }).sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });

        let idx = items.findIndex(function(it){ return it.slug === slug; });
        if (idx < 0) return; // 메타에 없는 글이면 네비 안 띄움
        build(items, idx);
      })
      .catch(function(e){ /* 조용히 무시 */ });
  }

  if (document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
