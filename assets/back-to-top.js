/* back-to-top.js — 우측 하단 "맨 위로" 버튼 자동 마운트
   2026-04-30 사용자 지시: "스크롤 내리면 상단으로 이동 아이콘 오른쪽 하단에 두기"
   - body.deck-mode 페이지에서는 자동 비활성
   - 스크롤 200px 이상 내려갔을 때만 표시
*/
(function () {
  'use strict';

  function init() {
    if (document.body.classList.contains('deck-mode')) return; // 가로 데크는 제외

    if (document.querySelector('.btt')) return; // 중복 방지

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btt';
    btn.setAttribute('aria-label', '맨 위로 이동');
    btn.title = '맨 위로';
    btn.textContent = '\u2191'; // ↑

    btn.addEventListener('click', function () {
      try {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch (e) {
        window.scrollTo(0, 0);
      }
    });

    document.body.appendChild(btn);

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var y = window.scrollY || document.documentElement.scrollTop || 0;
        if (y > 240) {
          btn.classList.add('is-visible');
        } else {
          btn.classList.remove('is-visible');
        }
        ticking = false;
      });
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
