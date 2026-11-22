/* edu-lock.js — password-locked downloads for an education materials page.
   The page holds a form (#eduLock), a list target (#eduFiles) and data-salt / data-dir
   on #eduLock. Files are stored as iv(12) || AES-256-GCM ciphertext; the key is
   PBKDF2-SHA256(password, salt, 200000). manifest.bin lists the files. Nothing is
   stored in the browser. ES5 for older in-app browsers. */
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

  function show(list) {
    form.hidden = true; out.hidden = false;
    var ul = out.querySelector('ul');
    ul.innerHTML = list.map(function (x, i) {
      return '<li><span><b>' + esc(x.name) + '</b><em>' + size(x.size) + '</em></span><button type="button" class="dl" data-i="' + i + '">내려받기</button></li>';
    }).join('');
    ul.addEventListener('click', function (e) { var b = e.target.closest ? e.target.closest('.dl') : null; if (b) save(list[+b.getAttribute('data-i')], b); });
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!window.crypto || !crypto.subtle) { fail('이 브라우저에서는 열 수 없습니다. 최신 Chrome, Safari, Edge를 써 주세요.'); return; }
    var pw = input.value.trim(); if (!pw) { fail('비밀번호를 입력해 주세요.'); return; }
    err.hidden = true; btn.disabled = true; input.disabled = true;
    crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: hex(salt), iterations: 200000, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    }).then(function (k) { key = k; return get('manifest.bin').then(open); })
      .then(function (plain) { show(JSON.parse(new TextDecoder().decode(plain))); })
      .catch(function () { key = null; fail('비밀번호가 맞지 않습니다.'); });
  });
})();
