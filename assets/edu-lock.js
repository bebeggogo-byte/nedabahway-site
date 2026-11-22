/* edu-lock.js — password-locked slides and downloads for an education materials page.
   The page holds a form (#eduLock) with data-salt / data-dir, an unlocked area (#eduFiles)
   with a slide viewer (#eduView) and a download list (ul). Every file is stored as
   iv(12) || AES-256-GCM ciphertext; the key is PBKDF2-SHA256(password, salt, 200000).
   manifest.bin = { files: [{id,name,size}], slides: [{id}] } (an older plain array means
   files only). Nothing is stored in the browser. ES5 for older in-app browsers. */
(function () {
  'use strict';
  var form = document.getElementById('eduLock'), out = document.getElementById('eduFiles');
  if (!form || !out) return;
  var input = form.querySelector('input'), btn = form.querySelector('button'), err = form.querySelector('.err');
  var dir = form.getAttribute('data-dir'), salt = form.getAttribute('data-salt'), key = null;

  function hex(h) { var a = new Uint8Array(h.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(h.substr(i * 2, 2), 16); return a; }
  function fail(m) { err.textContent = m; err.hidden = false; btn.disabled = false; input.disabled = false; input.focus(); input.select(); }
  function size(n) { return n > 1048576 ? (n / 1048576).toFixed(1) + 'MB' : Math.round(n / 1024) + 'KB'; }
  function get(name) { return fetch(dir + name, { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('http'); return r.arrayBuffer(); }); }
  function open(buf) { var b = new Uint8Array(buf); return crypto.subtle.decrypt({ name: 'AES-GCM', iv: b.slice(0, 12) }, key, b.slice(12)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  function save(item, b) {
    b.disabled = true; b.textContent = '받는 중…';
    get(item.id + '.bin').then(open).then(function (plain) {
      var url = URL.createObjectURL(new Blob([plain])), a = document.createElement('a');
      a.href = url; a.download = item.name; document.body.appendChild(a); a.click(); a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 60000);
      b.disabled = false; b.textContent = '다시 받기';
    }).catch(function () { b.disabled = false; b.textContent = '실패 · 다시 시도'; });
  }

  function files(list) {
    var ul = out.querySelector('ul');
    ul.innerHTML = list.map(function (x, i) {
      return '<li><span><b>' + esc(x.name) + '</b><em>' + size(x.size) + '</em></span><button type="button" class="dl" data-i="' + i + '">내려받기</button></li>';
    }).join('');
    ul.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.dl') : null; if (b) save(list[+b.getAttribute('data-i')], b); });
  }

  // Slide viewer: decrypts each slide when it is first shown and keeps the next two ready.
  function viewer(slides) {
    var box = document.getElementById('eduView');
    if (!box || !slides.length) return;
    box.hidden = false;
    var img = box.querySelector('img'), count = box.querySelector('.count'), cache = {}, cur = 0;
    function url(i) {
      if (!cache[i]) cache[i] = get(slides[i].id + '.bin').then(open).then(function (p) { return URL.createObjectURL(new Blob([p], { type: 'image/jpeg' })); });
      return cache[i];
    }
    function go(i) {
      cur = Math.max(0, Math.min(slides.length - 1, i)); var want = cur;
      count.textContent = (cur + 1) + ' / ' + slides.length;
      url(cur).then(function (u) { if (want === cur) { img.src = u; img.alt = '슬라이드 ' + (cur + 1); } }).catch(function () { count.textContent = (cur + 1) + ' / ' + slides.length + ' · 불러오지 못함'; });
      if (cur + 1 < slides.length) url(cur + 1); if (cur + 2 < slides.length) url(cur + 2);
    }
    box.querySelector('.prev').addEventListener('click', function () { go(cur - 1); });
    box.querySelector('.next').addEventListener('click', function () { go(cur + 1); });
    box.querySelector('.stage').addEventListener('click', function (e) { var r = this.getBoundingClientRect(); go(e.clientX - r.left < r.width / 3 ? cur - 1 : cur + 1); });
    box.querySelector('.full').addEventListener('click', function () {
      var d = document;
      if (d.fullscreenElement || d.webkitFullscreenElement) { (d.exitFullscreen || d.webkitExitFullscreen).call(d); return; }
      var f = box.requestFullscreen || box.webkitRequestFullscreen; if (f) try { f.call(box); } catch (e) { /* not allowed here */ }
    });
    document.addEventListener('keydown', function (e) {
      if (e.target && /INPUT|TEXTAREA/.test(e.target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); go(cur + 1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(cur - 1); }
      else if (e.key === 'Home') go(0); else if (e.key === 'End') go(slides.length - 1);
    });
    var x0 = null;
    box.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
    box.addEventListener('touchend', function (e) { if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) go(dx < 0 ? cur + 1 : cur - 1); });
    go(0);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!window.crypto || !crypto.subtle) { fail('이 브라우저에서는 열 수 없습니다. 최신 Chrome, Safari, Edge를 써 주세요.'); return; }
    var pw = input.value.trim(); if (!pw) { fail('비밀번호를 입력해 주세요.'); return; }
    err.hidden = true; btn.disabled = true; input.disabled = true;
    crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: hex(salt), iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }).then(function (k) { key = k; return get('manifest.bin').then(open); })
      .then(function (plain) {
        var m = JSON.parse(new TextDecoder().decode(plain)); if (m instanceof Array) m = { files: m, slides: [] };
        form.hidden = true; out.hidden = false; files(m.files || []); viewer(m.slides || []);
      })
      .catch(function () { key = null; fail('비밀번호가 맞지 않습니다.'); });
  });
})();
