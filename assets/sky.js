/* sky.js — header menu, rotating ask-bar placeholders and scroll reveal for sky.css pages. */
(function () {
  'use strict';
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---- hamburger menu ---- */
  var head = document.querySelector('.sk-head');
  var burger = document.querySelector('.sk-burger');
  if (head && burger) {
    burger.addEventListener('click', function () {
      var open = head.classList.toggle('is-open');
      burger.setAttribute('aria-expanded', open ? 'true' : 'false');
      burger.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
    });
    head.querySelectorAll('.sk-nav a').forEach(function (a) {
      a.addEventListener('click', function () { head.classList.remove('is-open'); burger.setAttribute('aria-expanded', 'false'); });
    });
  }

  /* ---- ask bar: rotating placeholder + submit to contact page ---- */
  document.querySelectorAll('.ask').forEach(function (form) {
    var input = form.querySelector('.ask__input');
    var list = (form.getAttribute('data-examples') || '').split('|').filter(Boolean);
    if (input && list.length > 1 && !reduce) {
      var i = 0;
      setInterval(function () {
        if (document.activeElement === input || input.value) return;
        input.classList.add('is-fading');
        setTimeout(function () {
          i = (i + 1) % list.length;
          input.setAttribute('placeholder', list[i]);
          input.classList.remove('is-fading');
        }, 350);
      }, 3200);
    }
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var msg = (input.value || input.getAttribute('placeholder') || '').trim();
      window.location.href = '/contact.html?msg=' + encodeURIComponent(msg) + '#consult-form';
    });
  });

  /* ---- scroll reveal ---- */
  var items = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduce) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px' });
    items.forEach(function (el) { io.observe(el); });
  } else {
    items.forEach(function (el) { el.classList.add('is-in'); });
  }

})();
