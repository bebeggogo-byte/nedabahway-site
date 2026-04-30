/* snap-deck-v1.js — 스크롤 스냅 페이지 데크 도트 네비 동작
   2026-04-30 신설.
   적용 조건: body.snap-deck-on + main.deck 자식 .deck-page 다수
   기능: 도트 클릭 점프 / 키보드(↑↓ PageUp/Down Home/End) / IntersectionObserver active
*/
(function(){
  if (typeof window === 'undefined') return;
  document.addEventListener('DOMContentLoaded', init);

  function init(){
    var body = document.body;
    if (!body.classList.contains('snap-deck-on')) return;

    var pages = Array.from(document.querySelectorAll('.deck-page'));
    if (pages.length < 2) return;

    var dots = buildDots(pages);
    document.body.appendChild(dots.container);

    // IntersectionObserver — 현재 보이는 페이지의 도트를 active 처리
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting && e.intersectionRatio >= 0.5){
            var idx = pages.indexOf(e.target);
            if (idx >= 0) setActive(dots.buttons, idx);
          }
        });
      }, {threshold:[0.5]});
      pages.forEach(function(p){ io.observe(p); });
    } else {
      // fallback — scroll 위치로 계산
      var scroller = document.scrollingElement || document.documentElement;
      scroller.addEventListener('scroll', function(){
        var top = scroller.scrollTop;
        var h = window.innerHeight;
        var idx = Math.min(pages.length-1, Math.round(top / h));
        setActive(dots.buttons, idx);
      });
    }

    // 키보드 네비
    document.addEventListener('keydown', function(ev){
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.isContentEditable)) return;
      var current = dots.buttons.findIndex(function(b){ return b.classList.contains('is-active'); });
      if (current < 0) current = 0;
      var next = current;
      switch(ev.key){
        case 'ArrowDown':
        case 'PageDown':
          next = Math.min(pages.length-1, current+1); break;
        case 'ArrowUp':
        case 'PageUp':
          next = Math.max(0, current-1); break;
        case 'Home':
          next = 0; break;
        case 'End':
          next = pages.length-1; break;
        default:
          return;
      }
      ev.preventDefault();
      jumpTo(pages[next]);
    });
  }

  function buildDots(pages){
    var nav = document.createElement('nav');
    nav.className = 'deck-dots';
    nav.setAttribute('role', 'navigation');
    nav.setAttribute('aria-label', '페이지 네비게이션');

    var buttons = pages.map(function(page, i){
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'deck-dots__btn';
      btn.setAttribute('aria-label', '섹션 ' + (i+1) + '로 이동');
      var label = page.getAttribute('data-deck-label') ||
                  (page.querySelector('h1,h2,h3') && page.querySelector('h1,h2,h3').textContent.trim().slice(0,18)) ||
                  ('섹션 ' + (i+1));
      btn.setAttribute('data-label', label);
      btn.addEventListener('click', function(){ jumpTo(page); });
      nav.appendChild(btn);
      return btn;
    });

    return {container:nav, buttons:buttons};
  }

  function setActive(buttons, idx){
    buttons.forEach(function(b, i){
      b.classList.toggle('is-active', i === idx);
      b.setAttribute('aria-current', i === idx ? 'true' : 'false');
    });
  }

  function jumpTo(page){
    page.scrollIntoView({behavior:'smooth', block:'start'});
  }
})();
