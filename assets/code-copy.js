/**
 * code-copy.js — pre/code 블록에 라인 넘버 + 복사 버튼 자동 부착
 * 의존성 없음. KakaoTalk 인앱·iOS Safari·Android Chrome 모두 동작.
 */
(function () {
  'use strict';

  function init() {
    // 한 번만 부착
    if (document.documentElement.dataset.cc) return;
    document.documentElement.dataset.cc = '1';

    var css = document.createElement('style');
    css.textContent = [
      '.cc-wrap{position:relative;margin:1rem 0;}',
      '.cc-wrap pre{margin:0!important;padding-left:3.4rem!important;counter-reset:l;}',
      '.cc-wrap pre code{display:block;}',
      '.cc-wrap pre .cc-line{display:block;position:relative;}',
      '.cc-wrap pre .cc-line::before{counter-increment:l;content:counter(l);',
      'position:absolute;left:-3.4rem;width:2.6rem;text-align:right;',
      'color:#8a7a64;opacity:.55;font-variant-numeric:tabular-nums;user-select:none;}',
      '.cc-btn{position:absolute;top:.55rem;right:.55rem;z-index:2;',
      'font:600 .75rem/1.1 system-ui,-apple-system,"Noto Sans KR",sans-serif;',
      'padding:.34rem .7rem;border-radius:6px;border:1px solid rgba(245,233,212,.25);',
      'background:rgba(245,233,212,.08);color:#f5e9d4;cursor:pointer;',
      'transition:background .15s ease,transform .15s ease;backdrop-filter:blur(2px);}',
      '.cc-btn:hover{background:#b45309;border-color:#b45309;transform:translateY(-1px);}',
      '.cc-btn.is-done{background:#2f7a3d;border-color:#2f7a3d;}',
      '@media (max-width:520px){',
      '.cc-wrap pre{padding-left:2.6rem!important;font-size:.78rem;}',
      '.cc-wrap pre .cc-line::before{left:-2.6rem;width:2rem;}',
      '.cc-btn{font-size:.7rem;padding:.28rem .55rem;}',
      '}',
    ].join('');
    document.head.appendChild(css);

    var blocks = document.querySelectorAll('pre > code, pre');
    var seen = new Set();
    Array.prototype.forEach.call(blocks, function (el) {
      var pre = el.tagName === 'PRE' ? el : el.parentElement;
      if (!pre || seen.has(pre)) return;
      seen.add(pre);
      // skip blocks shorter than 2 lines
      var src = pre.textContent || '';
      if (src.replace(/\n+$/, '').split('\n').length < 2) return;

      // wrap
      var wrap = document.createElement('div');
      wrap.className = 'cc-wrap';
      pre.parentNode.insertBefore(wrap, pre);
      wrap.appendChild(pre);

      // line numbering — replace innerHTML carefully without breaking entities
      var lines = src.replace(/\n+$/, '').split('\n');
      var codeEl = pre.querySelector('code') || pre;
      codeEl.innerHTML = lines.map(function (l) {
        var span = document.createElement('span');
        span.className = 'cc-line';
        span.textContent = l.length ? l : ' ';
        return span.outerHTML;
      }).join('\n');

      // button
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'cc-btn';
      btn.textContent = '복사';
      btn.setAttribute('aria-label', '코드 복사');
      btn.addEventListener('click', async function () {
        try {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(src);
          } else {
            var ta = document.createElement('textarea');
            ta.value = src;
            ta.setAttribute('readonly', '');
            ta.style.cssText = 'position:absolute;left:-9999px;';
            document.body.appendChild(ta);
            ta.select();
            document.execCommand('copy');
            document.body.removeChild(ta);
          }
          btn.textContent = '복사됨 ✓';
          btn.classList.add('is-done');
          setTimeout(function () {
            btn.textContent = '복사';
            btn.classList.remove('is-done');
          }, 1800);
        } catch (e) {
          btn.textContent = '실패';
          setTimeout(function () { btn.textContent = '복사'; }, 1800);
        }
      });
      wrap.appendChild(btn);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
