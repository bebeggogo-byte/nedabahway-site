/* deck-toggle.js — 긴 페이지에서 데크 모드로 진입하는 우하단 배지 (2026-04-30)
   현재 페이지 경로(/about.html)에 대응되는 데크(/deck/about.html)가 있으면 그쪽으로,
   없으면 데크 홈(/deck/)으로 이동.
   body.deck-mode 페이지에서는 마운트 안 함.
*/
(function () {
  'use strict';

  // 데크에 매핑된 페이지 화이트리스트
  var MAP = {
    '/': '/deck/',
    '/index.html': '/deck/',
    '/about.html': '/deck/about.html',
    '/programs.html': '/deck/programs.html',
    '/ai.html': '/deck/ai.html',
    '/contact.html': '/deck/contact.html',
    '/work.html': '/deck/work.html'
  };

  function init() {
    if (document.body.classList.contains('deck-mode')) return;
    if (document.querySelector('.deck-toggle')) return;

    var path = location.pathname;
    var dest = MAP[path] || '/deck/';

    var a = document.createElement('a');
    a.className = 'deck-toggle';
    a.href = dest;
    a.title = '가로로 페이지 넘기기';
    a.setAttribute('aria-label', '데크 모드로 보기');

    var icon = document.createElement('span');
    icon.className = 'deck-toggle__icon';
    icon.textContent = '\u2630';   // ☰ 데크 느낌

    var label = document.createElement('span');
    label.className = 'deck-toggle__label';
    label.textContent = '데크 모드';

    a.appendChild(icon);
    a.appendChild(label);

    document.body.appendChild(a);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
