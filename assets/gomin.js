/* gomin.js — 방구석고민, 바닷가코칭 포스트잇 벽. Supabase REST(PostgREST)만 fetch 로 호출, 라이브러리 없음. */
window.GOMIN = (function () {
  'use strict';
  var CFG = window.GOMIN_CFG || { url: '', key: '' };
  var ready = !!(CFG.url && CFG.key);
  var COLORS = ['maker', 'connector', 'supporter', 'explorer', 'thinker', 'enjoyer'];

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function $(sel, root) { return (root || document).querySelector(sel); }

  function deviceId() {
    var k = 'nw:gomin:device', v = null;
    try { v = localStorage.getItem(k); } catch (e) { /* private mode */ }
    if (!v) {
      v = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12) + Math.random().toString(36).slice(2, 8);
      try { localStorage.setItem(k, v); } catch (e) { /* ignore */ }
    }
    return v;
  }
  function pinGet(code) { try { return sessionStorage.getItem('nw:gomin:pin:' + code) || ''; } catch (e) { return ''; } }
  function pinSet(code, pin) { try { if (pin) sessionStorage.setItem('nw:gomin:pin:' + code, pin); else sessionStorage.removeItem('nw:gomin:pin:' + code); } catch (e) { /* ignore */ } }

  function headers(extra) {
    var h = { 'apikey': CFG.key, 'Authorization': 'Bearer ' + CFG.key, 'Content-Type': 'application/json' };
    if (extra) for (var k in extra) h[k] = extra[k];
    return h;
  }
  function req(method, path, body, extra) {
    if (!ready) return Promise.reject(new Error('not_configured'));
    return fetch(CFG.url.replace(/\/$/, '') + '/rest/v1/' + path, { method: method, headers: headers(extra), body: body ? JSON.stringify(body) : undefined })
      .then(function (r) {
        if (r.status === 204) return null;
        return r.text().then(function (t) {
          var d = null; try { d = t ? JSON.parse(t) : null; } catch (e) { d = t; }
          if (!r.ok) { var msg = (d && (d.message || d.hint || d.details)) || ('HTTP ' + r.status); var err = new Error(msg); err.status = r.status; err.data = d; throw err; }
          return d;
        });
      });
  }
  function rpc(fn, args) { return req('POST', 'rpc/' + fn, args || {}); }

  var api = {
    ready: ready,
    esc: esc, $: $, deviceId: deviceId, pinGet: pinGet, pinSet: pinSet, COLORS: COLORS,
    board: function (code) { return req('GET', 'boards?code=eq.' + encodeURIComponent(code) + '&select=code,title,place,audience,is_open,created_at').then(function (r) { return r && r[0] ? r[0] : null; }); },
    notes: function (code) { return req('GET', 'notes?select=id,text,nick,hearts,created_at,boards!inner(code)&boards.code=eq.' + encodeURIComponent(code) + '&order=hearts.desc,created_at.desc&limit=300'); },
    myHearts: function (code) { return rpc('my_hearts', { p_board_code: code, p_device: deviceId() }); },
    post: function (boardId, text, nick) { return req('POST', 'notes', { board_id: boardId, text: text, nick: nick || '', device_id: deviceId() }, { 'Prefer': 'return=representation' }); },
    boardId: function (code) { return req('GET', 'boards?code=eq.' + encodeURIComponent(code) + '&select=id').then(function (r) { return r && r[0] ? r[0].id : null; }); },
    heart: function (noteId) { return rpc('heart_note', { p_note: noteId, p_device: deviceId() }).then(function (r) { return r && r[0] ? r[0] : r; }); },
    createBoard: function (title, place, audience, pin) { return rpc('create_board', { p_title: title, p_place: place, p_audience: audience, p_pin: pin }).then(function (r) { return r && r[0] ? r[0] : r; }); },
    checkPin: function (code, pin) { return rpc('check_pin', { p_code: code, p_pin: pin }); },
    adminNotes: function (code, pin) { return rpc('board_notes_admin', { p_code: code, p_pin: pin }); },
    setHidden: function (code, pin, noteId, hidden) { return rpc('set_note_hidden', { p_code: code, p_pin: pin, p_note: noteId, p_hidden: hidden }); },
    setOpen: function (code, pin, open) { return rpc('set_board_open', { p_code: code, p_pin: pin, p_open: open }); },
    boardUrl: function (code) { return location.origin + '/gomin/b/?c=' + encodeURIComponent(code); },
    qr: function (el, text, size) {
      if (!window.qrcode) { el.textContent = text; return; }
      var q = window.qrcode(0, 'M'); q.addData(text); q.make();
      el.innerHTML = q.createSvgTag({ cellSize: 4, margin: 2, scalable: true });
      var svg = el.querySelector('svg'); if (svg) { svg.setAttribute('width', size || 180); svg.setAttribute('height', size || 180); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'QR 코드: ' + text); }
    },
    timeAgo: function (iso) {
      var s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
      if (s < 60) return '방금'; if (s < 3600) return Math.floor(s / 60) + '분 전'; if (s < 86400) return Math.floor(s / 3600) + '시간 전';
      return Math.floor(s / 86400) + '일 전';
    },
    errMsg: function (e) {
      var m = (e && e.message) || '';
      if (m === 'not_configured') return '고민 벽이 아직 연결되지 않았습니다. 잠시 뒤 다시 시도해 주세요.';
      if (/too_fast/.test(m)) return '너무 빨라요. 15초 뒤에 다시 붙여 주세요.';
      if (/pin/.test(m)) return 'PIN이 맞지 않습니다.';
      if (/violates check/.test(m)) return '2자 이상 200자 이하로 적어 주세요.';
      if (/row-level security/.test(m)) return '이 보드는 닫혀 있어 새 메모를 받지 않습니다.';
      return '잠시 문제가 있었습니다. 다시 시도해 주세요. (' + m + ')';
    }
  };

  /* ---------- 벽 렌더링 (index + b 공용) ---------- */
  api.mountWall = function (opts) {
    var code = opts.code, root = opts.root, screen = !!opts.screen, mine = {}, boardId = null, board = null, timer = null, admin = false, adminNotes = null;
    var pin = pinGet(code);
    function colorOf(id) { var n = 0; for (var i = 0; i < id.length; i++) n = (n * 31 + id.charCodeAt(i)) >>> 0; return COLORS[n % COLORS.length]; }
    function noteCard(n, i) {
      var hid = n.hidden ? ' is-hidden' : '';
      var top = i < 3 && n.hearts > 0 ? '<span class="gm-note__top">TOP ' + (i + 1) + '</span>' : '';
      var heart = '<button type="button" class="gm-heart' + (mine[n.id] ? ' is-on' : '') + '" data-id="' + n.id + '" aria-pressed="' + (mine[n.id] ? 'true' : 'false') + '" aria-label="공감 하트"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7-4.6-9.3-8.6C.6 8.7 2.6 4.5 6.6 4.5c2 0 3.5 1.1 4.4 2.4.9-1.3 2.4-2.4 4.4-2.4 4 0 6 4.2 3.9 7.9C19 16.4 12 21 12 21z"/></svg><span class="gm-heart__n">' + n.hearts + '</span></button>';
      var adminBtn = admin ? '<button type="button" class="gm-note__adm" data-id="' + n.id + '" data-hidden="' + (n.hidden ? '1' : '0') + '">' + (n.hidden ? '되살리기' : '숨기기') + '</button>' : '';
      return '<article class="gm-note gm-note--' + colorOf(n.id) + hid + '" style="--rot:' + (((i * 7) % 5) - 2) * 0.6 + 'deg;">' + top + '<p class="gm-note__t">' + esc(n.text) + '</p><div class="gm-note__f"><span class="gm-note__who">' + esc(n.nick || '익명') + ' · ' + api.timeAgo(n.created_at) + '</span>' + heart + adminBtn + '</div></article>';
    }
    function render(list) {
      var grid = $('.gm-grid', root);
      if (!list.length) { grid.innerHTML = '<p class="gm-empty">아직 붙은 고민이 없습니다. 첫 포스트잇을 붙여 주세요.</p>'; return; }
      grid.innerHTML = list.map(noteCard).join('');
      grid.querySelectorAll('.gm-heart').forEach(function (b) {
        b.addEventListener('click', function () {
          if (b.disabled) return; b.disabled = true;
          api.heart(b.getAttribute('data-id')).then(function (r) {
            b.querySelector('.gm-heart__n').textContent = r.hearts; b.classList.toggle('is-on', !!r.mine); b.setAttribute('aria-pressed', r.mine ? 'true' : 'false');
            mine[b.getAttribute('data-id')] = !!r.mine; b.disabled = false; setTimeout(load, 600);
          }).catch(function (e) { b.disabled = false; toast(api.errMsg(e)); });
        });
      });
      grid.querySelectorAll('.gm-note__adm').forEach(function (b) {
        b.addEventListener('click', function () {
          api.setHidden(code, pin, b.getAttribute('data-id'), b.getAttribute('data-hidden') !== '1').then(load).catch(function (e) { toast(api.errMsg(e)); });
        });
      });
    }
    function toast(msg) { var t = $('.gm-toast', root); if (!t) return; t.textContent = msg; t.hidden = false; clearTimeout(t._t); t._t = setTimeout(function () { t.hidden = true; }, 3200); }
    function load() {
      if (!ready) return Promise.resolve();
      var p = admin ? api.adminNotes(code, pin) : api.notes(code);
      return Promise.all([p, api.myHearts(code)]).then(function (r) {
        mine = {}; (r[1] || []).forEach(function (id) { mine[id] = true; });
        render(r[0] || []);
        var c = $('.gm-count', root); if (c) c.textContent = (r[0] || []).length + '개';
      }).catch(function (e) { toast(api.errMsg(e)); });
    }
    function init() {
      if (!ready) { root.innerHTML = '<div class="gm-notready"><strong>고민 벽 준비 중입니다.</strong> 데이터 저장소 연결이 끝나면 이 자리에 포스트잇이 붙습니다.</div>'; return; }
      api.board(code).then(function (b) {
        if (!b) { root.innerHTML = '<div class="gm-notready"><strong>이 코드의 보드가 없습니다.</strong> 코드를 다시 확인해 주세요.</div>'; return; }
        board = b;
        return api.boardId(code).then(function (id) { boardId = id; });
      }).then(function () {
        if (!board) return;
        var h = '';
        if (opts.showHead) {
          h += '<div class="gm-head"><div><p class="gm-head__k">고민 보드 · ' + esc(board.code) + '</p><h1 class="gm-head__t">' + esc(board.title) + '</h1>' + (board.place || board.audience ? '<p class="gm-head__d">' + esc([board.place, board.audience].filter(Boolean).join(' · ')) + '</p>' : '') + '</div>';
          if (screen) { h += '<div class="gm-head__qr"><div class="gm-qr" id="gmQr"></div><p class="gm-head__code">코드 <b>' + esc(board.code) + '</b><br><span>nedabah.org/gomin/b/?c=' + esc(board.code) + '</span></p></div>'; }
          h += '</div>';
        }
        if (!screen) {
          h += '<form class="gm-form" id="gmForm"><label class="sr-only" for="gmText">고민 내용</label><textarea id="gmText" maxlength="200" rows="3" placeholder="' + (board.is_open ? '요즘 마음에 걸리는 고민을 한 장에 적어 붙여 주세요. (200자)' : '이 보드는 닫혀 있어 새 메모를 받지 않습니다.') + '"' + (board.is_open ? '' : ' disabled') + '></textarea><div class="gm-form__row"><input id="gmNick" type="text" maxlength="20" placeholder="닉네임 (선택)" aria-label="닉네임"' + (board.is_open ? '' : ' disabled') + '><span class="gm-form__cnt"><span id="gmCnt">0</span>/200</span><button type="submit" class="btn-go"' + (board.is_open ? '' : ' disabled') + '>붙이기</button></div></form>';
        }
        h += '<div class="gm-bar"><span class="gm-count">…</span><span class="gm-bar__note">하트가 많은 고민이 위로 올라옵니다. 하트는 한 기기에서 메모마다 한 번.</span>' + (opts.showHead && !screen ? '<a class="gm-bar__link" href="/gomin/b/?c=' + esc(board.code) + '&screen=1" target="_blank" rel="noopener">큰 화면으로 보기 &#8599;</a><button type="button" class="gm-bar__link gm-admin-btn" id="gmAdmin">운영자</button>' : '') + '</div>';
        h += '<div class="gm-grid" aria-live="polite"></div><p class="gm-toast" hidden></p>';
        if (admin) h += '';
        root.innerHTML = h;
        if (screen) api.qr($('#gmQr', root), api.boardUrl(board.code), 150);
        var form = $('#gmForm', root);
        if (form) {
          var ta = $('#gmText', root), cnt = $('#gmCnt', root);
          ta.addEventListener('input', function () { cnt.textContent = ta.value.length; });
          form.addEventListener('submit', function (e) {
            e.preventDefault(); var text = ta.value.trim(); if (text.length < 2) { toast('두 글자 이상 적어 주세요.'); return; }
            var btn = form.querySelector('button[type=submit]'); btn.disabled = true;
            api.post(boardId, text, $('#gmNick', root).value.trim()).then(function () { ta.value = ''; cnt.textContent = '0'; btn.disabled = false; toast('붙였습니다.'); load(); })
              .catch(function (e) { btn.disabled = false; toast(api.errMsg(e)); });
          });
        }
        var ab = $('#gmAdmin', root);
        if (ab) ab.addEventListener('click', function () {
          if (admin) { admin = false; pinSet(code, ''); pin = ''; ab.textContent = '운영자'; root.classList.remove('is-admin'); load(); return; }
          var p = prompt('운영자 PIN'); if (!p) return;
          api.checkPin(code, p).then(function (ok) {
            if (!ok) { toast('PIN이 맞지 않습니다.'); return; }
            pin = p; pinSet(code, p); admin = true; ab.textContent = '운영자 모드 끄기'; root.classList.add('is-admin');
            var tools = document.createElement('div'); tools.className = 'gm-tools';
            tools.innerHTML = '<button type="button" class="btn-ghost" id="gmCsv">CSV 내보내기</button><button type="button" class="btn-ghost" id="gmToggle">' + (board.is_open ? '보드 닫기(새 메모 중단)' : '보드 열기') + '</button>';
            $('.gm-bar', root).after(tools);
            $('#gmCsv', root).addEventListener('click', function () {
              api.adminNotes(code, pin).then(function (rows) {
                var csv = '﻿순위,하트,내용,닉네임,숨김,작성시각\n' + rows.map(function (n, i) { return [i + 1, n.hearts, '"' + String(n.text).replace(/"/g, '""') + '"', '"' + String(n.nick || '').replace(/"/g, '""') + '"', n.hidden ? 'Y' : '', n.created_at].join(','); }).join('\n');
                var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' })); a.download = 'gomin-' + code + '-' + new Date().toISOString().slice(0, 10) + '.csv'; a.click();
              }).catch(function (e) { toast(api.errMsg(e)); });
            });
            $('#gmToggle', root).addEventListener('click', function () {
              api.setOpen(code, pin, !board.is_open).then(function () { board.is_open = !board.is_open; $('#gmToggle', root).textContent = board.is_open ? '보드 닫기(새 메모 중단)' : '보드 열기'; toast(board.is_open ? '보드를 열었습니다.' : '보드를 닫았습니다.'); }).catch(function (e) { toast(api.errMsg(e)); });
            });
            load();
          }).catch(function (e) { toast(api.errMsg(e)); });
        });
        load();
        timer = setInterval(function () { if (document.visibilityState === 'visible') load(); }, screen ? 5000 : 10000);
      }).catch(function (e) { root.innerHTML = '<div class="gm-notready">' + esc(api.errMsg(e)) + '</div>'; });
    }
    init();
    return { reload: load, stop: function () { clearInterval(timer); } };
  };

  return api;
})();
