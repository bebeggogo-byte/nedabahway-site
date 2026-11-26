/* 공문·제안서 미리보기 — a[href$="docs.zip"] 클릭 시 미리보기 창을 연 뒤 다운로드 */
(function(){
  var css = '.dp-ov{position:fixed;inset:0;background:rgba(10,16,32,.72);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}'
  + '.dp-bx{background:#fff;color:#121A2B;width:min(860px,100%);max-height:94vh;display:flex;flex-direction:column;border-radius:10px;overflow:hidden;font-family:Pretendard,system-ui,sans-serif}'
  + '.dp-hd{display:flex;align-items:center;gap:10px;padding:12px 16px;background:#14306A;color:#fff}'
  + '.dp-hd b{flex:1;font-size:16px;line-height:1.35}.dp-x{background:none;border:0;color:#fff;font-size:26px;line-height:1;cursor:pointer;padding:0 4px}'
  + '.dp-tb{display:flex;border-bottom:1px solid #D5DBE6}.dp-tb button{flex:1;padding:12px;border:0;background:#fff;font-size:15px;font-weight:700;color:#6B7280;cursor:pointer;border-bottom:3px solid transparent}'
  + '.dp-tb button.on{color:#1E4BD2;border-bottom-color:#1E4BD2}'
  + '.dp-pv{flex:1;overflow:auto;background:#EEF3FB;padding:14px;display:grid;gap:12px;justify-items:center}'
  + '.dp-pv img{width:100%;max-width:760px;box-shadow:0 2px 10px rgba(20,48,106,.18);background:#fff}'
  + '.dp-ft{display:flex;flex-wrap:wrap;gap:8px;padding:12px 16px;border-top:1px solid #D5DBE6}'
  + '.dp-ft a{flex:1 1 180px;text-align:center;padding:12px 10px;border-radius:8px;font-weight:800;font-size:15px;text-decoration:none}'
  + '.dp-ft a.p{background:#1E4BD2;color:#fff}.dp-ft a.s{border:2px solid #14306A;color:#14306A}'
  + '.dp-n{font-size:12px;color:#6B7280;width:100%;margin:0}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  var PAGES = {gongmun:1, proposal:3}, LABEL = {gongmun:'공문 (1쪽)', proposal:'제안서 (3쪽)'};
  function open(a){
    var zip = a.getAttribute('href'), base = zip.replace(/docs\.zip$/, '') + 'docs/';
    var title = (a.closest('article') && a.closest('article').querySelector('h3')) ? a.closest('article').querySelector('h3').firstChild.textContent.trim() : '공문·제안서';
    var zipName = a.getAttribute('download') || 'docs.zip';
    var ov = document.createElement('div'); ov.className = 'dp-ov'; ov.setAttribute('role','dialog'); ov.setAttribute('aria-modal','true');
    ov.innerHTML = '<div class="dp-bx"><div class="dp-hd"><b></b><button class="dp-x" aria-label="닫기">×</button></div>'
      + '<div class="dp-tb"><button data-k="gongmun" class="on">'+LABEL.gongmun+'</button><button data-k="proposal">'+LABEL.proposal+'</button></div>'
      + '<div class="dp-pv"></div><div class="dp-ft"><a class="p" download>PDF 다운로드</a><a class="s" download>한글(HWPX) 공문·제안서 받기</a>'
      + '<p class="dp-n">한글 파일은 기관명·일정·금액을 직접 고쳐 쓸 수 있습니다.</p></div></div>';
    ov.querySelector('.dp-hd b').textContent = title + ' · 공문·제안서';
    var pv = ov.querySelector('.dp-pv'), pdf = ov.querySelector('.dp-ft a.p'), hw = ov.querySelector('.dp-ft a.s');
    hw.href = zip; hw.setAttribute('download', zipName);
    function show(k){
      ov.querySelectorAll('.dp-tb button').forEach(function(b){ b.classList.toggle('on', b.dataset.k === k); });
      pv.innerHTML = ''; pv.scrollTop = 0;
      for (var i = 1; i <= PAGES[k]; i++){ var im = new Image(); im.loading = 'lazy'; im.alt = LABEL[k] + ' ' + i + '쪽'; im.src = base + k + '-' + i + '.png'; pv.appendChild(im); }
      pdf.href = base + k + '.pdf'; pdf.textContent = (k === 'gongmun' ? '공문' : '제안서') + ' PDF 다운로드';
      pdf.setAttribute('download', zipName.replace(/공문제안서/, k === 'gongmun' ? '공문' : '제안서').replace(/\.zip$/, '.pdf'));
    }
    ov.querySelectorAll('.dp-tb button').forEach(function(b){ b.onclick = function(){ show(b.dataset.k); }; });
    function close(){ ov.remove(); document.removeEventListener('keydown', esc); document.body.style.overflow = ''; }
    function esc(e){ if (e.key === 'Escape') close(); }
    ov.querySelector('.dp-x').onclick = close; ov.onclick = function(e){ if (e.target === ov) close(); };
    document.addEventListener('keydown', esc); document.body.style.overflow = 'hidden';
    document.body.appendChild(ov); show('gongmun'); ov.querySelector('.dp-x').focus();
  }
  document.addEventListener('click', function(e){
    var a = e.target.closest && e.target.closest('a[href$="docs.zip"]');
    if (!a || a.closest('.dp-ov')) return;
    e.preventDefault(); open(a);
  });
})();
