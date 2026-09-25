/* vault.js — client-side lock for the private archive (brand v2).
   Every page under the lock is stored as an encrypted payload:
     base64( iv[12] || AES-256-GCM( deflate-raw(html) ) )
   The key is PBKDF2-SHA256(password, SALT, 200k) and is derived in the
   browser; the password itself is never stored. With "remember" on, the
   derived key is kept in localStorage so the next page opens directly.
   Pages are written by scripts/vault.mjs (encrypt / decrypt). */
(function () {
  'use strict';
  var SALT = '15f2ff39a12774b48602e772f7455327';
  var KEY_STORE = 'nw:vault:k';
  var enc = new TextEncoder();

  function hex(s) { var a = new Uint8Array(s.length / 2); for (var i = 0; i < a.length; i++) a[i] = parseInt(s.substr(i * 2, 2), 16); return a; }
  function b64ToBuf(b64) { return fetch('data:application/octet-stream;base64,' + b64).then(function (r) { return r.arrayBuffer(); }); }
  function bufToB64(buf) { var s = ''; var a = new Uint8Array(buf); for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return btoa(s); }

  function deriveKey(password) {
    return crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']).then(function (base) {
      return crypto.subtle.deriveKey({ name: 'PBKDF2', salt: hex(SALT), iterations: 200000, hash: 'SHA-256' }, base,
        { name: 'AES-GCM', length: 256 }, true, ['decrypt']);
    });
  }
  function importKey(raw) { return crypto.subtle.importKey('raw', raw, { name: 'AES-GCM' }, true, ['decrypt']); }

  function decrypt(key, payload) {
    var iv = payload.slice(0, 12), data = payload.slice(12);
    return crypto.subtle.decrypt({ name: 'AES-GCM', iv: iv }, key, data).then(function (plain) {
      var ds = new DecompressionStream('deflate-raw');
      var w = ds.writable.getWriter(); w.write(plain); w.close();
      return new Response(ds.readable).text();
    });
  }

  function show(html) {
    document.open();
    document.write(html);
    document.close();
  }

  function storedKey() { try { return localStorage.getItem(KEY_STORE); } catch (e) { return null; } }
  function storeKey(key) { crypto.subtle.exportKey('raw', key).then(function (raw) { try { localStorage.setItem(KEY_STORE, bufToB64(raw)); } catch (e) { /* private mode */ } }); }
  function forget() { try { localStorage.removeItem(KEY_STORE); } catch (e) { /* noop */ } }

  function ready() {
    var node = document.getElementById('nw-vault-data');
    var lock = document.getElementById('nw-lock');
    if (!node || !lock) return;
    var b64 = node.textContent.replace(/\s+/g, '');
    if (!window.crypto || !crypto.subtle || typeof DecompressionStream === 'undefined') {
      lock.hidden = false;
      lock.innerHTML = '<p class="nw-lock__err">이 브라우저에서는 열 수 없습니다. 최신 Chrome, Safari, Edge를 써 주세요.</p>';
      return;
    }
    var payloadP = b64ToBuf(b64);

    function tryKey(key) { return payloadP.then(function (p) { return decrypt(key, p); }); }

    var form = lock.querySelector('form');
    var input = lock.querySelector('input[type="password"]');
    var remember = lock.querySelector('input[type="checkbox"]');
    var err = lock.querySelector('.nw-lock__err');
    var btn = lock.querySelector('button[type="submit"]');

    function fail(msg) { err.textContent = msg; err.hidden = false; btn.disabled = false; input.disabled = false; input.focus(); input.select(); }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pw = input.value;
      if (!pw) { fail('비밀번호를 입력해 주세요.'); return; }
      err.hidden = true; btn.disabled = true; input.disabled = true;
      deriveKey(pw).then(function (key) {
        return tryKey(key).then(function (html) { if (remember.checked) storeKey(key); show(html); });
      }).catch(function () { fail('비밀번호가 맞지 않습니다.'); });
    });

    var saved = storedKey();
    if (saved) {
      b64ToBuf(saved).then(importKey).then(tryKey).then(show).catch(function () { forget(); lock.hidden = false; input.focus(); });
    } else {
      lock.hidden = false; input.focus();
    }
  }

  window.NWVault = { forget: forget };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ready); else ready();
})();
