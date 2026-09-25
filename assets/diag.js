/* diag.js — shared helpers for the free diagnosis pages (no server, no tracking of answers). */
window.NWD = (function () {
  'use strict';
  function $(sel, root) { return (root || document).querySelector(sel); }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function save(key, obj) { try { localStorage.setItem('nw:diag:' + key, JSON.stringify(obj)); } catch (e) { /* private mode */ } }
  function load(key) { try { return JSON.parse(localStorage.getItem('nw:diag:' + key) || 'null'); } catch (e) { return null; } }
  function clear(key) { try { localStorage.removeItem('nw:diag:' + key); } catch (e) { /* ignore */ } }
  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px';
    document.body.appendChild(ta); ta.select();
    var ok = false; try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta); return ok;
  }
  function copy(text, btn) {
    var done = function (ok) {
      if (!btn) return;
      var label = btn.getAttribute('data-label') || btn.textContent;
      btn.setAttribute('data-label', label);
      btn.textContent = ok ? '복사됨' : '복사 실패';
      setTimeout(function () { btn.textContent = label; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
    } else { done(fallbackCopy(text)); }
  }
  function progress(i, n) {
    var f = $('.dg-top__fill'), t = $('.dg-top__n');
    if (f) f.style.width = Math.round(i / n * 100) + '%';
    if (t) t.textContent = i + ' / ' + n;
  }
  function show(id) {
    ['dgIntro', 'dgQuiz', 'dgResult'].forEach(function (k) { var el = document.getElementById(k); if (el) el.hidden = (k !== id); });
    var top = $('.dg-top'); if (top) top.hidden = (id !== 'dgQuiz');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
  function scrollToQuiz() {
    var q = document.getElementById('dgQuiz');
    if (q) { var y = q.getBoundingClientRect().top + window.pageYOffset - 84; window.scrollTo({ top: y, behavior: 'smooth' }); }
  }
  return { $: $, esc: esc, save: save, load: load, clear: clear, copy: copy, progress: progress, show: show, scrollToQuiz: scrollToQuiz };
})();
