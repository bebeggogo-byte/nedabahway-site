/* AI 작업실 — 가로 슬라이드 (책 넘기듯)
 *
 * 결: 5개 블럭(+⑥)을 한 화면에 한 장씩 가로로 넘긴다.
 * 사용처: bootstrap.js가 자동 로드.
 *
 * 동작:
 *   - .block 섹션들을 .as-slide-track에 감싸고 가로 트랙으로 정렬
 *   - prev/next 버튼·점 인디케이터·키보드(←→)·터치 스와이프 지원
 *   - 카운터·모드 전환(슬라이드↔스크롤) 버튼 자동 부착
 *   - hero__nav 탭과 양방향 동기화
 *   - URL 해시·localStorage로 마지막 결 기억
 *   - tabs.js의 activate()와 호환 (충돌 방지: 슬라이드 모드일 땐 그게 우선)
 */
(function(){
  'use strict';

  const KEY_MODE = 'nedabah:ai-studio:mode';      // 'slides' | 'scroll'
  const KEY_INDEX = 'nedabah:ai-studio:slideIndex';
  const TAB_IDS = ['sim','iden','self','gate','sbm','block6'];

  let track = null;
  let slides = [];           // 활성 슬라이드 섹션 배열
  let idx = 0;               // 현재 슬라이드 인덱스
  let touchStartX = 0;
  let touchEndX = 0;
  let arrows = {prev:null, next:null};
  let dotsEl = null;
  let counterEl = null;
  let modeBtn = null;
  let initialized = false;

  function $(s, root){ return (root||document).querySelector(s); }
  function $$(s, root){ return Array.from((root||document).querySelectorAll(s)); }

  // ─────────────────────────── 트랙 빌드
  function buildTrack(){
    if(track) return;
    const stage = document.createElement('div');
    stage.className = 'as-slide-stage';
    track = document.createElement('div');
    track.className = 'as-slide-track';
    stage.appendChild(track);

    // .block 섹션 모두 모아 트랙에 옮기기
    const blocks = $$('section.block');
    if(!blocks.length) return;
    const firstBlock = blocks[0];
    firstBlock.parentNode.insertBefore(stage, firstBlock);
    blocks.forEach(b => track.appendChild(b));
    refreshSlides();
  }

  function refreshSlides(){
    if(!track) return;
    slides = $$('section.block', track);
  }

  // ─────────────────────────── 컨트롤(화살표·점·카운터·모드) 부착
  function buildControls(){
    if(arrows.prev) return;

    arrows.prev = document.createElement('button');
    arrows.prev.className = 'as-slide-arrow prev';
    arrows.prev.setAttribute('aria-label','이전 슬라이드');
    arrows.prev.textContent = '‹';
    document.body.appendChild(arrows.prev);
    arrows.prev.addEventListener('click', ()=> go(idx-1));

    arrows.next = document.createElement('button');
    arrows.next.className = 'as-slide-arrow next';
    arrows.next.setAttribute('aria-label','다음 슬라이드');
    arrows.next.textContent = '›';
    document.body.appendChild(arrows.next);
    arrows.next.addEventListener('click', ()=> go(idx+1));

    dotsEl = document.createElement('div');
    dotsEl.className = 'as-slide-dots';
    document.body.appendChild(dotsEl);

    counterEl = document.createElement('div');
    counterEl.className = 'as-slide-counter';
    counterEl.innerHTML = '<b>1</b> / <span>5</span>';
    document.body.appendChild(counterEl);

    modeBtn = document.createElement('button');
    modeBtn.className = 'as-mode-toggle';
    modeBtn.textContent = '☰ 전체 스크롤';
    modeBtn.addEventListener('click', toggleMode);
    document.body.appendChild(modeBtn);

    showHintOnce();
  }

  function rebuildDots(){
    if(!dotsEl) return;
    dotsEl.innerHTML = '';
    slides.forEach((s, i)=>{
      const b = document.createElement('button');
      b.setAttribute('aria-label', `슬라이드 ${i+1}`);
      b.title = (s.querySelector('.block__title')?.textContent || '').trim();
      b.addEventListener('click', ()=> go(i));
      dotsEl.appendChild(b);
    });
  }

  function showHintOnce(){
    try{
      if(localStorage.getItem('nedabah:ai-studio:hintShown')) return;
    }catch(e){}
    const hint = document.createElement('div');
    hint.className = 'as-slide-hint';
    hint.textContent = '← → 키 / 마우스 휠 / 좌우 스와이프로 넘기기';
    document.body.appendChild(hint);
    setTimeout(()=> hint.classList.add('show'), 600);
    setTimeout(()=>{
      hint.classList.remove('show');
      setTimeout(()=> hint.remove(), 300);
    }, 4200);
    try{ localStorage.setItem('nedabah:ai-studio:hintShown','1'); }catch(e){}
  }

  // ─────────────────────────── 이동
  function go(target, opts){
    opts = opts || {};
    if(!slides.length) return;
    const last = slides.length - 1;
    let next = Math.max(0, Math.min(last, target));
    const dir = next > idx ? 'left' : (next < idx ? 'right' : null);
    idx = next;

    track.style.transform = `translateX(-${idx * 100}%)`;

    // 활성 클래스
    slides.forEach((s, i)=> s.classList.toggle('is-active-block', i === idx));

    // 책장 효과
    if(dir){
      track.classList.remove('flip-left','flip-right');
      void track.offsetWidth; // reflow
      track.classList.add(dir === 'left' ? 'flip-left' : 'flip-right');
    }

    // 점·카운터·화살표·hero 탭 동기화
    if(dotsEl){
      $$('button', dotsEl).forEach((b, i)=> b.classList.toggle('is-active', i === idx));
    }
    if(counterEl){
      counterEl.innerHTML = `<b>${idx+1}</b> / <span>${slides.length}</span>`;
    }
    if(arrows.prev) arrows.prev.disabled = idx === 0;
    if(arrows.next) arrows.next.disabled = idx === last;

    syncHeroNav();
    syncHashAndStorage();
    if(!opts.silent){
      window.scrollTo({top:0, behavior:'smooth'});
    }
  }

  function syncHeroNav(){
    const cur = slides[idx];
    if(!cur) return;
    const id = cur.id;
    const nav = $('.hero__nav');
    if(!nav) return;
    $$('a', nav).forEach(a=>{
      const tid = (a.getAttribute('href')||'').slice(1);
      a.classList.toggle('is-active', tid === id);
    });
  }

  function syncHashAndStorage(){
    const cur = slides[idx];
    if(!cur) return;
    if(location.hash !== '#'+cur.id){
      history.replaceState(null, '', '#'+cur.id);
    }
    try{ localStorage.setItem(KEY_INDEX, String(idx)); }catch(e){}
  }

  function findIndexById(id){
    return slides.findIndex(s => s.id === id);
  }

  // ─────────────────────────── 입력 (키보드·휠·스와이프·hero 탭)
  function bindInputs(){
    document.addEventListener('keydown', (e)=>{
      if(!document.body.classList.contains('as-slides')) return;
      // input·textarea 안에서는 무시
      const tag = (e.target.tagName||'').toLowerCase();
      if(['input','textarea','select'].includes(tag)) return;
      if(e.key === 'ArrowRight'){ go(idx+1); }
      else if(e.key === 'ArrowLeft'){ go(idx-1); }
      else if(e.key === 'Home'){ go(0); }
      else if(e.key === 'End'){ go(slides.length-1); }
    });

    // 트랙 위에서만 휠 가로 처리, 그 외엔 자유
    let wheelLock = false;
    document.addEventListener('wheel', (e)=>{
      if(!document.body.classList.contains('as-slides')) return;
      // 가로 휠(트랙패드)일 때만 슬라이드 전환
      if(Math.abs(e.deltaX) < 30 || Math.abs(e.deltaX) < Math.abs(e.deltaY)) return;
      if(wheelLock) return;
      wheelLock = true;
      if(e.deltaX > 0) go(idx+1); else go(idx-1);
      setTimeout(()=>{ wheelLock = false; }, 480);
    }, {passive:true});

    // 스와이프
    document.addEventListener('touchstart', (e)=>{
      if(!document.body.classList.contains('as-slides')) return;
      touchStartX = e.touches[0].clientX;
    }, {passive:true});
    document.addEventListener('touchend', (e)=>{
      if(!document.body.classList.contains('as-slides')) return;
      touchEndX = e.changedTouches[0].clientX;
      const dx = touchEndX - touchStartX;
      if(Math.abs(dx) < 50) return;
      if(dx < 0) go(idx+1); else go(idx-1);
    }, {passive:true});

    // hero 탭 클릭 → 슬라이드 이동
    const nav = $('.hero__nav');
    if(nav){
      nav.addEventListener('click', (ev)=>{
        const a = ev.target.closest('a');
        if(!a) return;
        const href = a.getAttribute('href') || '';
        if(!href.startsWith('#')) return;
        const id = href.slice(1);
        const i = findIndexById(id);
        if(i < 0) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();   // tabs.js 핸들러 차단
        go(i);
      }, true);                          // capture 단계에서 가로채기
    }

    // 외부 hashchange
    window.addEventListener('hashchange', ()=>{
      if(!document.body.classList.contains('as-slides')) return;
      const id = (location.hash||'').slice(1);
      const i = findIndexById(id);
      if(i >= 0 && i !== idx) go(i, {silent:true});
    });

    // 윈도우 리사이즈 시 재정렬
    window.addEventListener('resize', ()=>{
      if(!track) return;
      track.style.transition = 'none';
      track.style.transform = `translateX(-${idx * 100}%)`;
      requestAnimationFrame(()=>{ track.style.transition = ''; });
    });
  }

  // ─────────────────────────── 모드 전환
  function setMode(mode){
    if(mode === 'slides'){
      document.body.classList.add('as-slides');
      document.body.classList.remove('as-tabbed');
      if(modeBtn) modeBtn.textContent = '☰ 전체 스크롤';
      if(arrows.prev){
        arrows.prev.style.display = '';
        arrows.next.style.display = '';
        dotsEl.style.display = '';
        counterEl.style.display = '';
      }
    } else {
      document.body.classList.remove('as-slides');
      // 트랙은 그대로 두지만 transform·flex 해제 (CSS로 처리)
      if(track) track.style.transform = '';
      if(modeBtn) modeBtn.textContent = '⊞ 슬라이드';
      // 컨트롤 숨김
      if(arrows.prev){
        arrows.prev.style.display = 'none';
        arrows.next.style.display = 'none';
        dotsEl.style.display = 'none';
        counterEl.style.display = 'none';
      }
      // 모든 블럭 보이게
      slides.forEach(s => s.classList.add('is-active-block'));
    }
    try{ localStorage.setItem(KEY_MODE, mode); }catch(e){}
  }

  function toggleMode(){
    const cur = document.body.classList.contains('as-slides') ? 'slides' : 'scroll';
    setMode(cur === 'slides' ? 'scroll' : 'slides');
    if(document.body.classList.contains('as-slides')){
      // 다시 슬라이드로 돌아오면 현재 idx 위치 재적용
      track.style.transform = `translateX(-${idx * 100}%)`;
      slides.forEach((s, i)=> s.classList.toggle('is-active-block', i === idx));
    }
  }

  // ─────────────────────────── 초기화
  function init(){
    if(initialized) return;
    initialized = true;

    buildTrack();
    if(!slides.length){
      console.warn('[ai-studio slides] .block 섹션이 없어 슬라이드 모드를 켜지 않습니다.');
      return;
    }
    buildControls();
    rebuildDots();
    bindInputs();

    // 블럭 ⑥은 늦게 마운트되므로 한 번 더 점검
    setTimeout(()=>{
      const before = slides.length;
      // 블럭 ⑥이 트랙 밖에 마운트됐다면 트랙으로 이동
      const b6 = document.getElementById('block6');
      if(b6 && track && b6.parentNode !== track){
        track.appendChild(b6);
      }
      refreshSlides();
      if(slides.length !== before){
        rebuildDots();
        // 카운터 갱신
        if(counterEl) counterEl.innerHTML = `<b>${idx+1}</b> / <span>${slides.length}</span>`;
      }
    }, 300);

    // 모드 결정: localStorage > 기본 'slides'
    let mode = 'slides';
    try{
      const saved = localStorage.getItem(KEY_MODE);
      if(saved === 'scroll' || saved === 'slides') mode = saved;
    }catch(e){}
    setMode(mode);

    // 초기 슬라이드: URL 해시 > localStorage > 0
    let initialIdx = 0;
    const hashId = (location.hash||'').slice(1);
    if(hashId){
      const i = findIndexById(hashId);
      if(i >= 0) initialIdx = i;
    } else {
      try{
        const saved = parseInt(localStorage.getItem(KEY_INDEX) || '0', 10);
        if(saved >= 0 && saved < slides.length) initialIdx = saved;
      }catch(e){}
    }
    go(initialIdx, {silent:true});

    console.log('[ai-studio slides] 슬라이드 모드 가동:', slides.length, '장');
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 외부에서 호출 가능 (block6.js가 마운트된 후 호출 가능)
  window.AS_SLIDES = {
    refresh:()=>{
      const b6 = document.getElementById('block6');
      if(b6 && track && b6.parentNode !== track){ track.appendChild(b6); }
      refreshSlides();
      rebuildDots();
      if(counterEl) counterEl.innerHTML = `<b>${idx+1}</b> / <span>${slides.length}</span>`;
    },
    go,
    setMode,
    getIndex:()=> idx,
    getCount:()=> slides.length
  };
})();
