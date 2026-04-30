/* snap-deck-v1.js — 가로 스크롤 스냅 책 넘김 + 하단 도트 + 양옆 화살표
   2026-04-30 v2: 책 넘기듯 좌→우. 마우스 휠도 가로 스크롤로 변환.
*/
(function(){
  if (typeof window === 'undefined') return;
  document.addEventListener('DOMContentLoaded', init);

  function init(){
    var body = document.body;
    if (!body.classList.contains('snap-deck-on')) return;
    document.documentElement.classList.add('snap-deck-html');

    var deck = document.querySelector('main.deck');
    if (!deck) return;
    var pages = Array.from(deck.querySelectorAll('.deck-page'));
    if (pages.length < 2) return;

    // 페이지 번호 라벨 자동 추가
    pages.forEach(function(p, i){
      if (!p.querySelector('.deck-page__num')){
        var num = document.createElement('div');
        num.className = 'deck-page__num';
        num.textContent = String(i+1).padStart(2,'0') + ' / ' + String(pages.length).padStart(2,'0');
        p.appendChild(num);
      }
    });

    // 하단 도트
    var dots = buildDots(pages, deck);
    document.body.appendChild(dots.container);

    // 진행 텍스트 (도트 위)
    var progress = document.createElement('div');
    progress.className = 'deck-progress';
    progress.textContent = '1 / ' + pages.length;
    document.body.appendChild(progress);

    // 양옆 화살표
    var prevBtn = document.createElement('button');
    prevBtn.type='button'; prevBtn.className='deck-arrow deck-arrow--prev';
    prevBtn.setAttribute('aria-label','이전 페이지'); prevBtn.innerHTML='‹';
    var nextBtn = document.createElement('button');
    nextBtn.type='button'; nextBtn.className='deck-arrow deck-arrow--next';
    nextBtn.setAttribute('aria-label','다음 페이지'); nextBtn.innerHTML='›';
    document.body.appendChild(prevBtn);
    document.body.appendChild(nextBtn);
    prevBtn.addEventListener('click', function(){ go(currentIdx() - 1); });
    nextBtn.addEventListener('click', function(){ go(currentIdx() + 1); });

    function currentIdx(){
      var i = dots.buttons.findIndex(function(b){ return b.classList.contains('is-active'); });
      return i < 0 ? 0 : i;
    }
    function go(idx){
      idx = Math.max(0, Math.min(pages.length-1, idx));
      pages[idx].scrollIntoView({behavior:'smooth', inline:'start', block:'nearest'});
    }
    function refreshArrows(idx){
      prevBtn.disabled = (idx === 0);
      nextBtn.disabled = (idx === pages.length-1);
      progress.textContent = (idx+1) + ' / ' + pages.length;
    }

    // IntersectionObserver — 가로 컨테이너 안에서 보이는 페이지 추적
    if ('IntersectionObserver' in window){
      var io = new IntersectionObserver(function(entries){
        entries.forEach(function(e){
          if (e.isIntersecting && e.intersectionRatio >= 0.5){
            var idx = pages.indexOf(e.target);
            if (idx >= 0){
              setActive(dots.buttons, idx);
              refreshArrows(idx);
            }
          }
        });
      }, {root:deck, threshold:[0.5]});
      pages.forEach(function(p){ io.observe(p); });
    } else {
      deck.addEventListener('scroll', function(){
        var w = window.innerWidth;
        var idx = Math.min(pages.length-1, Math.round(deck.scrollLeft / w));
        setActive(dots.buttons, idx);
        refreshArrows(idx);
      });
    }
    refreshArrows(0);

    // 마우스 휠 → 가로 스크롤 변환 (세로 휠을 가로로)
    deck.addEventListener('wheel', function(ev){
      // 트랙패드 가로 제스처는 그대로 두고, 세로 휠일 때만 변환
      if (Math.abs(ev.deltaY) > Math.abs(ev.deltaX)){
        ev.preventDefault();
        // 한 번에 한 페이지씩 점프 (디바운스)
        if (!deck._wheelLock){
          deck._wheelLock = true;
          go(currentIdx() + (ev.deltaY > 0 ? 1 : -1));
          setTimeout(function(){ deck._wheelLock = false; }, 600);
        }
      }
    }, {passive:false});

    // 키보드 ←→ PageUp/Down Home/End
    document.addEventListener('keydown', function(ev){
      if (ev.target && (ev.target.tagName === 'INPUT' || ev.target.tagName === 'TEXTAREA' || ev.target.isContentEditable)) return;
      var c = currentIdx();
      var n = c;
      switch(ev.key){
        case 'ArrowRight': case 'PageDown': case ' ':
          n = c + 1; break;
        case 'ArrowLeft': case 'PageUp':
          n = c - 1; break;
        case 'Home': n = 0; break;
        case 'End': n = pages.length-1; break;
        default: return;
      }
      ev.preventDefault();
      go(n);
    });
  }

  function buildDots(pages, deck){
    var nav = document.createElement('nav');
    nav.className = 'deck-dots';
    nav.setAttribute('role','navigation');
    nav.setAttribute('aria-label','페이지 네비게이션');

    var buttons = pages.map(function(page, i){
      var btn = document.createElement('button');
      btn.type='button';
      btn.className = 'deck-dots__btn' + (i===0?' is-active':'');
      btn.setAttribute('aria-label', '페이지 ' + (i+1) + '로 이동');
      var label = page.getAttribute('data-deck-label') ||
                  (page.querySelector('h1,h2,h3') && page.querySelector('h1,h2,h3').textContent.trim().slice(0,16)) ||
                  ('페이지 ' + (i+1));
      btn.setAttribute('data-label', (i+1) + '. ' + label);
      btn.addEventListener('click', function(){
        page.scrollIntoView({behavior:'smooth', inline:'start', block:'nearest'});
      });
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
})();
