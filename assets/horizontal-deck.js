/* horizontal-deck.js — 가로 페이지 넘기기 컨트롤
   2026-04-30 — JS 의존 최소. CSS Scroll Snap이 본 동작, JS는 보조(키보드·점·진행바·화살표)
   사용:
     <main class="deck" id="deck">...</main>
     <body class="deck-mode">
   자동 마운트: DOMContentLoaded에서 .deck 발견 시 자동 init
*/
(function () {
  'use strict';

  function init(deck) {
    if (!deck || deck.__deckInit) return;
    deck.__deckInit = true;

    var slides = Array.prototype.slice.call(deck.querySelectorAll('.slide'));
    if (slides.length < 2) return;
    var html = document.documentElement;
    var body = document.body;
    html.classList.add('deck-mode');
    body.classList.add('deck-mode');

    // 슬라이드 번호 자동 부여
    slides.forEach(function (s, i) {
      if (!s.querySelector('.slide__num')) {
        var n = document.createElement('div');
        n.className = 'slide__num';
        n.textContent = (i + 1) + ' / ' + slides.length;
        s.appendChild(n);
      }
    });

    // 화살표 버튼
    var prev = document.createElement('button');
    prev.className = 'deck-arrow deck-arrow--prev';
    prev.setAttribute('aria-label', '이전 페이지');
    prev.type = 'button';
    prev.innerHTML = '\u2039';
    var next = document.createElement('button');
    next.className = 'deck-arrow deck-arrow--next';
    next.setAttribute('aria-label', '다음 페이지');
    next.type = 'button';
    next.innerHTML = '\u203A';
    body.appendChild(prev);
    body.appendChild(next);

    // 점 인디케이터
    var dots = document.createElement('nav');
    dots.className = 'deck-dots';
    dots.setAttribute('aria-label', '페이지 인디케이터');
    var dotEls = slides.map(function (_, i) {
      var b = document.createElement('button');
      b.className = 'deck-dot';
      b.type = 'button';
      b.setAttribute('aria-label', (i + 1) + '번 페이지로');
      b.addEventListener('click', function () { goTo(i); });
      dots.appendChild(b);
      return b;
    });
    body.appendChild(dots);

    // 진행바
    var prog = document.createElement('div');
    prog.className = 'deck-progress';
    var progBar = document.createElement('div');
    progBar.className = 'deck-progress__bar';
    prog.appendChild(progBar);
    body.appendChild(prog);

    // 첫 방문 힌트
    if (!sessionStorage.getItem('deckHintShown')) {
      var hint = document.createElement('div');
      hint.className = 'deck-hint';
      hint.textContent = window.matchMedia('(max-width:640px)').matches
        ? '← → 좌우로 넘기세요'
        : '← → 키 또는 점/화살표로 넘기세요';
      body.appendChild(hint);
      setTimeout(function () { hint.classList.add('is-show'); }, 400);
      setTimeout(function () { hint.classList.remove('is-show'); }, 4400);
      sessionStorage.setItem('deckHintShown', '1');
    }

    function currentIndex() {
      var w = deck.clientWidth || 1;
      return Math.round(deck.scrollLeft / w);
    }

    function goTo(i) {
      i = Math.max(0, Math.min(slides.length - 1, i));
      var w = deck.clientWidth;
      deck.scrollTo({ left: i * w, behavior: 'smooth' });
    }

    function update() {
      var i = currentIndex();
      dotEls.forEach(function (d, idx) {
        d.classList.toggle('is-active', idx === i);
      });
      prev.classList.toggle('is-disabled', i <= 0);
      next.classList.toggle('is-disabled', i >= slides.length - 1);
      var pct = (slides.length <= 1) ? 100 : (i / (slides.length - 1)) * 100;
      progBar.style.width = pct + '%';
      // URL 해시(딥링크)
      var slide = slides[i];
      if (slide && slide.id) {
        if (location.hash !== '#' + slide.id) {
          history.replaceState(null, '', '#' + slide.id);
        }
      }
    }

    prev.addEventListener('click', function () { goTo(currentIndex() - 1); });
    next.addEventListener('click', function () { goTo(currentIndex() + 1); });

    // 키보드
    document.addEventListener('keydown', function (e) {
      // 입력창 포커스 시 무시
      var t = e.target;
      var tag = (t && t.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || (t && t.isContentEditable)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        goTo(currentIndex() + 1); e.preventDefault();
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        goTo(currentIndex() - 1); e.preventDefault();
      } else if (e.key === 'Home') {
        goTo(0); e.preventDefault();
      } else if (e.key === 'End') {
        goTo(slides.length - 1); e.preventDefault();
      }
    });

    // 휠을 가로로 변환 (데스크톱 마우스 휠로 좌우 넘기기)
    var wheelLock = false;
    deck.addEventListener('wheel', function (e) {
      if (Math.abs(e.deltaY) <= Math.abs(e.deltaX)) return; // 트랙패드 가로 자체 스크롤은 그대로
      if (wheelLock) { e.preventDefault(); return; }
      wheelLock = true;
      goTo(currentIndex() + (e.deltaY > 0 ? 1 : -1));
      e.preventDefault();
      setTimeout(function () { wheelLock = false; }, 380);
    }, { passive: false });

    // 스크롤 갱신
    var rafId;
    deck.addEventListener('scroll', function () {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(update);
    }, { passive: true });

    // 리사이즈 보정
    window.addEventListener('resize', function () {
      var i = currentIndex();
      goTo(i);
    });

    // 해시 진입 → 해당 슬라이드로
    if (location.hash) {
      var id = location.hash.slice(1);
      var idx = slides.findIndex(function (s) { return s.id === id; });
      if (idx >= 0) {
        setTimeout(function () { goTo(idx); }, 50);
      }
    }

    update();
  }

  function boot() {
    document.querySelectorAll('.deck').forEach(init);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
