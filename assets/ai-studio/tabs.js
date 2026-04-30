/* AI 작업실 — 카테고리 탭 모듈
 *
 * 동작:
 *   1) hero__nav의 #sim·#iden·#self·#gate·#sbm 앵커를 탭 버튼으로 재활용
 *   2) 블럭 ⑥(IDEN×5S 통합 진단)이 마운트되어 있으면 탭에 자동 추가
 *   3) 기본 ① 표시. 클릭 시 해당 블럭만 보이고 나머지 숨김
 *   4) URL 해시(#sim 등)와 동기화 — 직접 링크로 들어와도 그 블럭만 표시
 *   5) localStorage에 마지막 탭 기억
 */
(function(){
  'use strict';

  const KEY = 'nedabah:ai-studio:lastTab';
  const TAB_IDS = ['sim','iden','self','gate','sbm','block6'];

  function $(s, root){ return (root||document).querySelector(s); }
  function $$(s, root){ return Array.from((root||document).querySelectorAll(s)); }

  function getTabLinks(){
    const nav = $('.hero__nav');
    if(!nav) return [];
    return $$('a', nav).filter(a => {
      const href = a.getAttribute('href') || '';
      return href.startsWith('#') && TAB_IDS.includes(href.slice(1));
    });
  }

  function activate(id){
    if(!TAB_IDS.includes(id)) id = 'sim';
    // 블럭 표시 토글
    TAB_IDS.forEach(t => {
      const sec = document.getElementById(t);
      if(sec) sec.classList.toggle('is-active-block', t === id);
    });
    // 탭 버튼 활성 표시
    getTabLinks().forEach(a => {
      const tid = (a.getAttribute('href') || '').slice(1);
      a.classList.toggle('is-active', tid === id);
    });
    // ⑥ 탭 버튼이 있으면 동기화
    const block6Tab = $('a[href="#block6"]', $('.hero__nav'));
    if(block6Tab) block6Tab.classList.toggle('is-active', id === 'block6');

    // localStorage 기억
    try{ localStorage.setItem(KEY, id); }catch(e){}
    // 해시 갱신 (스크롤 없이)
    if(location.hash !== '#'+id){
      history.replaceState(null, '', '#'+id);
    }
    // 페이지 상단으로 부드럽게
    window.scrollTo({top:0, behavior:'smooth'});
  }

  function bindClicks(){
    const nav = $('.hero__nav');
    if(!nav) return;
    nav.addEventListener('click', (ev)=>{
      const a = ev.target.closest('a');
      if(!a) return;
      const href = a.getAttribute('href') || '';
      if(!href.startsWith('#')) return;
      const id = href.slice(1);
      if(!TAB_IDS.includes(id)) return;
      ev.preventDefault();
      activate(id);
    });
  }

  function ensureBlock6Tab(){
    // 블럭 ⑥이 마운트되었는지 확인 후 탭 추가
    const sec = document.getElementById('block6');
    const nav = $('.hero__nav');
    if(!sec || !nav) return;
    if($('a[href="#block6"]', nav)) return; // 이미 있음
    const a = document.createElement('a');
    a.href = '#block6';
    a.textContent = '⑥ IDEN×5S 통합';
    nav.appendChild(a);
  }

  function init(){
    document.body.classList.add('as-tabbed');
    bindClicks();

    // 블럭 ⑥은 v2.js → block6.js가 DOMContentLoaded 이후 마운트.
    // 약간 늦게 한 번 더 점검.
    setTimeout(()=>{
      ensureBlock6Tab();
      // 초기 활성 결정 우선순위: URL 해시 > localStorage > 기본 'sim'
      let initial = (location.hash || '').slice(1);
      if(!TAB_IDS.includes(initial)){
        try{
          const saved = localStorage.getItem(KEY);
          if(saved && TAB_IDS.includes(saved)) initial = saved;
        }catch(e){}
      }
      if(!TAB_IDS.includes(initial)) initial = 'sim';
      activate(initial);
    }, 60);

    // 해시 변경(외부 링크) 시 동기화
    window.addEventListener('hashchange', ()=>{
      const id = (location.hash || '').slice(1);
      if(TAB_IDS.includes(id)) activate(id);
    });
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
