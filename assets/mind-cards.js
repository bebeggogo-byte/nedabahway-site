/* mind-cards.js — 6 MINDS 마음 카드와 카드함
   - 진단 한 번 = 카드함 하나. 여섯 장 모두 이번 진단의 내 결과로 만들고, 가장 많이 쓴 마음 한 장만 열어 둡니다.
   - 나머지 다섯 장은 잠겨 있고, 한 번 공유하면(공유 창을 끝까지 마치거나 링크를 복사해 보내면) 모두 열립니다.
   - 결과는 브라우저에 자동 저장하지 않습니다. 새로 고침하면 사라지고, 카드함 주소(해시)로만 다시 엽니다.
   - 앞면 = 마음과 색 캐릭터(모두 같음, 공유용). 뒷면 = 그 마음에 대한 내 수치와 해석(나만, 내 기기에만 저장).
   Data: window.NW_MINDS, window.NW_READ (assets/mind-data.js). No server: nothing about the result leaves the browser.
   window.NWCards = { compute, read, readingHTML, renderBack, card, box, trackVisit, lastBox, ... } */
(function () {
  'use strict';
  var HASH = '#네다바웨이 #식스마인드 #6MINDS';
  var SITE = 'https://www.nedabah.org';
  var W = 1080, H = 1920, PAD = 92;
  var INK = '#1b1b1b', BODY = '#34322f', MUTE = '#5c5750', LINE = '#d6cfc1', TRACK = '#e6e0d4', SOFT = '#ece7dc';
  var FONT = "'Pretendard Variable','Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif";
  var RD = window.NW_READ || { states: {}, tpl: {}, minds: {} };
  var MINDS = (window.NW_MINDS || []).map(function (m) { return { k: m.k, n: m.n, en: m.en, c: m.c, char: m.char, char_d: m.char_d, less: m.less, more: m.more, pair_k: m.pair_k }; });
  var KEYS = MINDS.map(function (m) { return m.k; });
  function mind(k) { return MINDS[KEYS.indexOf(k)] || null; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function toast(msg) { var t = document.querySelector('.mc-toast'); if (!t) { t = el('p', 'mc-toast'); t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('is-on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('is-on'); }, 3200); }
  function src(k, face) { return '/assets/cards/mind-' + k + '-' + face + '.png'; }
  function thumb(k) { return '/assets/cards/thumb/mind-' + k + '-front.jpg'; }
  function fmt(d) { return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.'; }
  function ls(k, v) { try { if (v === undefined) return JSON.parse(localStorage.getItem(k) || 'null'); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, JSON.stringify(v)); } catch (e) { return null; } }
  // 예전 방식(결과·카드 자동 저장)으로 남은 기록은 지웁니다. 2주마다 바뀌는 상태를 오래 남기지 않습니다.
  ls('nw:diag:minds', null); ls('nw:minds:cards', null);

  // ---------- result model (same formula as /diagnosis/minds/ compute) ----------
  // a[15] = [use0,chg0, ... use5,chg5, sleep, move, drive]; use 0..4, chg -2..+2, body 0..4
  function compute(a) {
    var r = { a: a, minds: [], total: { sleep: a[12], move: a[13], drive: a[14] } };
    MINDS.forEach(function (m, i) { r.minds.push({ k: m.k, n: m.n, c: m.c, use: a[i * 2], chg: a[i * 2 + 1] }); });
    var totAvg = (r.total.sleep + r.total.move + r.total.drive) / 3 / 4 * 100;
    var chgAvg = r.minds.reduce(function (s, m) { return s + (m.chg + 2) / 4 * 100; }, 0) / 6;
    r.body = Math.round(totAvg * 0.6 * 10) / 10; r.minds40 = Math.round(chgAvg * 0.4 * 10) / 10;
    r.energy = Math.round(totAvg * 0.6 + chgAvg * 0.4);
    return r;
  }
  function sorted(r) { return r.minds.slice().sort(function (x, y) { return y.use - x.use || y.chg - x.chg; }); }
  function topOf(a) { return a && a.length === 15 ? sorted(compute(a))[0].k : null; }
  // 여덟 자리: 사용량(적게 0~1 · 보통 2 · 많이 3~4) × 쓰고 난 뒤(지침 −2~−1 · 그대로 0 · 힘이 남 +1~+2)
  function state(m) {
    if (m.use >= 3) return m.chg >= 1 ? 'keep' : (m.chg <= -1 || m.use === 4 ? 'cut' : 'even');
    if (m.use <= 1) return m.chg >= 1 ? 'grow' : (m.chg <= -1 ? 'wait' : 'idle');
    return m.chg >= 1 ? 'up' : (m.chg <= -1 ? 'down' : 'even');
  }
  var SC = { keep: '#0F9F6E', cut: '#E11D48', grow: '#1D4ED8', wait: '#8a847b', up: '#0E7490', down: '#B45309', even: '#6b665e', idle: '#6b665e' };
  var USE_W = ['전혀 쓰지 않았고', '한두 번 썼고', '가끔 썼고', '자주 썼고', '거의 매일 썼고'];
  var CHG_W = ['많이 지쳤습니다', '조금 지쳤습니다', '힘이 나지도 지치지도 않았습니다', '조금 힘이 났습니다', '힘이 많이 났습니다'];
  // 마음 하나의 해석: 수치 + 자리 + 역할 + 생각·행동·마음 + 한 번 더 깊게 + 이번 주
  function read(r, k) {
    var mm = mind(k), x = r.minds[KEYS.indexOf(k)], st = state(x), S = RD.states[st] || {};
    var cell = (RD.minds[k] || {})[st] || null, doing = (RD.minds[k] || {}).doing || '';
    if (!cell && RD.tpl[st]) { cell = {}; Object.keys(RD.tpl[st]).forEach(function (f) { var v = RD.tpl[st][f]; cell[f] = v ? v.replace(/\{D\}/g, doing) : v; }); }
    cell = cell || {};
    var grow = ((RD.minds[k] || {}).grow || {}).try, fallbackTry = st === 'cut' || st === 'down' ? mm.less : (st === 'wait' ? '나는 이번 주에 이 마음을 늘리지 않고, 잠드는 시간을 3일만 같게 맞춥니다.' : (grow || mm.more));
    var sumUse = r.minds.reduce(function (s, m) { return s + m.use; }, 0);
    var rank = sorted(r).map(function (m) { return m.k; }).indexOf(k) + 1;
    var pair = mind(mm.pair_k), px = r.minds[KEYS.indexOf(mm.pair_k)], pst = state(px), pairLine = '짝이 되는 마음 「' + pair.n + '」은 지금 ' + (RD.states[pst] || {}).label + '입니다.';
    if ((st === 'cut' || st === 'down') && (pst === 'keep' || pst === 'up' || pst === 'grow')) pairLine += ' 나는 「' + pair.n + '」을 이 마음 앞뒤에 20분 붙여 쓰면 같은 양을 쓰고도 덜 지칩니다.';
    else if ((st === 'grow' || st === 'up' || st === 'idle') && pst === 'cut') pairLine += ' 나는 「' + pair.n + '」을 줄인 시간에 이 마음을 쓰면 에너지 총량을 가장 빨리 올릴 수 있습니다.';
    else if ((st === 'cut' || st === 'down') && (pst === 'idle' || pst === 'wait' || pst === 'even')) pairLine += ' 나는 이 마음을 줄인 시간에 「' + pair.n + '」을 조금씩 써 봅니다.';
    else if (st === 'keep' && (pst === 'wait' || pst === 'idle' || pst === 'grow')) pairLine += ' 나는 이 마음에서 얻은 힘으로 「' + pair.n + '」을 조금씩 써 볼 수 있습니다.';
    var contrib = Math.round((x.chg + 2) / 4 * 100 * 0.4 / 6 * 10) / 10;
    return {
      k: k, n: mm.n, char: mm.char, c: mm.c, use: x.use, chg: x.chg, st: st, label: S.label, role: S.role, role_d: S.role_d, sc: SC[st],
      useIdx: x.use * 25, recIdx: (x.chg + 2) * 25, share: sumUse ? Math.round(x.use / sumUse * 100) : 0, net: Math.round(x.use * x.chg * 12.5),
      contrib: contrib, rank: rank, energy: r.energy,
      numLine: '지난 2주 동안 나는 이 마음을 ' + USE_W[x.use] + ', 쓰고 난 뒤에는 ' + CHG_W[x.chg + 2] + '. 여섯 마음 가운데 사용량 ' + rank + '위이고, 이 마음이 에너지 총량 ' + r.energy + '점 가운데 ' + contrib + '점을 보탰습니다(최대 6.7점).',
      lv: ((RD.minds[k] || {}).lv || [])[x.use] || '', now: cell.now || '', think: cell.think || '', act: cell.act || '', need: cell.need || '', deep: cell.deep || '', tryIt: cell.try || fallbackTry, pairLine: pairLine
    };
  }
  // 에너지 총량 해석: 10점 단위 열 칸 + 몸(60) · 마음(40) 중 무엇이 총량을 낮추는지
  var TOT = [['sleep', '잠'], ['move', '움직임'], ['drive', '의욕']];
  function energyRead(r) {
    var E = RD.energy || [], b = E[Math.min(9, Math.floor(r.energy / 10))] || {};
    var bodyR = r.body / 60, mindR = r.minds40 / 40;
    var tired = r.minds.filter(function (m) { return m.chg <= -1; }).map(function (m) { return m.n; });
    var lifted = r.minds.filter(function (m) { return m.chg >= 1; }).map(function (m) { return m.n; });
    // 몸 문항: 모두 같으면 한 문장, 아니면 가장 낮은 문항(동점이면 모두)
    var tv = TOT.map(function (t) { return r.total[t[0]]; }), lo = Math.min.apply(null, tv);
    var bodyLine = tv[0] === tv[1] && tv[1] === tv[2] ? '잠·움직임·의욕은 모두 ' + lo + '/4입니다.'
      : '몸 문항 가운데 가장 낮은 것은 ' + TOT.filter(function (t) { return r.total[t[0]] === lo; }).map(function (t) { return t[1]; }).join('·') + '(' + lo + '/4)입니다.';
    var mindLine = tired.length ? '여섯 마음 가운데 쓰고 나서 지친 마음은 ' + tired.length + '개(' + tired.join('·') + ')입니다.'
      : (lifted.length ? '쓰고 나서 지친 마음은 없고, 힘이 난 마음은 ' + lifted.length + '개(' + lifted.join('·') + ')입니다.' : '여섯 마음 모두 쓰고 나서 힘이 나지도 지치지도 않았습니다.');
    var head = '내 총량은 몸(잠·움직임·의욕) ' + r.body + '/60점과 여섯 마음을 쓰고 난 뒤 ' + r.minds40 + '/40점을 더한 값입니다. ';
    var why;
    if (bodyR >= .75 && mindR >= .75) why = head + '두 쪽 모두 점수가 높습니다. ' + (tired.length ? mindLine : bodyLine);
    else if (bodyR < .5 && mindR < .5) why = head + '두 쪽 모두 점수가 낮습니다. ' + bodyLine + ' ' + mindLine;
    else if (bodyR + .15 <= mindR) why = head + '둘 가운데 점수가 더 낮은 쪽은 몸입니다. ' + bodyLine;
    else if (mindR + .15 <= bodyR) why = head + '둘 가운데 점수가 더 낮은 쪽은 여섯 마음을 쓰고 난 뒤입니다. ' + mindLine;
    else why = head + '두 쪽의 점수가 비슷합니다. ' + bodyLine + ' ' + mindLine;
    return { energy: r.energy, range: b.range, s: b.s, name: b.name, feel: b.feel, know: b.know, first: b.first, why: why, body: r.body, minds40: r.minds40 };
  }
  function energyHTML(r) {
    var e = energyRead(r), v = r.energy, R = 54, C = 2 * Math.PI * R;
    if (!e.name) return '';
    return '<section class="er"><div class="er__top"><svg viewBox="0 0 140 140" width="120" height="120" role="img" aria-label="에너지 총량 ' + v + '점"><circle cx="70" cy="70" r="' + R + '" fill="none" stroke="#d6cfc1" stroke-width="12"/><circle cx="70" cy="70" r="' + R + '" fill="none" stroke="#1D4ED8" stroke-width="12" stroke-linecap="round" stroke-dasharray="' + C.toFixed(1) + '" stroke-dashoffset="' + (C * (1 - v / 100)).toFixed(1) + '" transform="rotate(-90 70 70)"/><text x="70" y="78" text-anchor="middle" font-size="34" font-weight="800" fill="#1b1b1b">' + v + '</text></svg>' +
      '<div><p class="er__k">에너지 총량 ' + v + ' / 100 · ' + esc(e.range || '') + '점 구간</p><h3 class="er__t">' + esc(e.name || '') + '</h3><p class="er__split">몸(잠·움직임·의욕) ' + e.body + ' / 60 · 여섯 마음을 쓰고 난 뒤 ' + e.minds40 + ' / 40</p></div></div>' +
      '<p class="er__feel">' + esc(e.feel || '') + '</p><p class="er__know">' + esc(e.know || '') + '</p><p class="er__why">' + esc(e.why) + '</p>' +
      '<p class="er__first"><b>이번 주 먼저 할 한 가지</b>' + esc(e.first || '') + '</p>' +
      (v < 30 ? '<p class="er__help">요즘 많이 힘들다면 혼자 버티지 않아도 됩니다. 청소년은 1388, 누구나 109(자살예방상담)·129(보건복지상담)에서 24시간 이야기할 수 있습니다.</p>' : '') + '</section>';
  }
  function readingHTML(r, k, open) {
    var x = read(r, k);
    return '<article class="mr" style="--mc:' + x.c + ';--sc:' + x.sc + ';">' +
      '<header class="mr__h"><img src="' + thumb(k) + '" width="360" height="640" alt="" loading="lazy"><div><p class="mr__k">사용량 ' + x.rank + '위 · ' + esc(x.char) + '</p><h4 class="mr__t">' + esc(x.n) + '</h4><p class="mr__st"><b>' + esc(x.label) + '</b> · ' + esc(x.role) + '</p></div></header>' +
      '<dl class="mr__nums"><div><dt>사용 지수</dt><dd>' + x.useIdx + '</dd></div><div><dt>회복 지수</dt><dd>' + x.recIdx + '</dd></div><div><dt>배분 비중</dt><dd>' + x.share + '%</dd></div><div><dt>총량 기여</dt><dd>' + x.contrib + '<small>/6.7</small></dd></div></dl>' +
      (x.lv ? '<p class="mr__lv">' + esc(x.lv) + '</p>' : '') + '<p class="mr__now">' + esc(x.now) + '</p><p class="mr__num">' + esc(x.numLine) + '</p><p class="mr__role"><b>에너지 총량 속 역할 · ' + esc(x.role) + '</b> ' + esc(x.role_d) + '</p>' +
      '<details class="mr__deep"' + (open ? ' open' : '') + '><summary>한 번 더 깊게 보기</summary>' +
      '<ul class="mr__tam"><li><b>생각</b>' + esc(x.think) + '</li><li><b>행동</b>' + esc(x.act) + '</li><li><b>마음</b>' + esc(x.need) + '</li></ul>' +
      '<p class="mr__insight">' + esc(x.deep) + '</p><p class="mr__pair">' + esc(x.pairLine) + '</p></details>' +
      '<p class="mr__try"><b>이번 주 한 가지</b>' + esc(x.tryIt) + '</p></article>';
  }
  function sampleAnswers(k) {
    var use = [2, 3, 2, 1, 3, 1], chg = [1, -1, 2, 0, -1, 1], i = KEYS.indexOf(k), a = [];
    if (i >= 0) { use[i] = 4; chg[i] = 2; }
    for (var j = 0; j < 6; j++) a.push(use[j], chg[j]);
    return a.concat([3, 2, 3]);
  }
  function encA(a) { var n = 0n; for (var i = 0; i < 15; i++) { var v = a[i]; if (i < 12 && i % 2 === 1) v = v + 2; n = n * 5n + BigInt(v); } var t = n.toString(36).toUpperCase(); while (t.length < 10) t = '0' + t; return 'M' + t; }
  function decA(str) { if (!/^M[0-9A-Z]{10}$/.test(str)) return null; var n = 0n, t = str.slice(1).toLowerCase(); for (var i = 0; i < t.length; i++) n = n * 36n + BigInt(parseInt(t[i], 36)); var a = []; for (var j = 14; j >= 0; j--) { var v = Number(n % 5n); n = n / 5n; if (j < 12 && j % 2 === 1) v = v - 2; a[j] = v; } return n === 0n ? a : null; }

  // ---------- 공유로 열기 (서버 없음) ----------
  // 초대 링크에는 결과도 번호도 싣지 않습니다. ?f=s 는 "친구가 보낸 링크" 배너를 띄우는 표시일 뿐입니다.
  function trackVisit() { return new URLSearchParams(location.search).get('f') ? 'shared' : null; }
  function inviteUrl() { return SITE + '/diagnosis/minds/?f=s'; }
  function boxUrl(o) { var d = Math.max(0, Math.round(new Date(o.at).getTime() / 86400000)).toString(36); return SITE + '/minds/box/#r=' + encA(o.a) + '&d=' + d + (o.open ? '&u=1' : ''); }
  function parseBox(h) {
    var q = new URLSearchParams(String(h || '').replace(/^#/, '')), a = decA(q.get('r') || ''), d = q.get('d') || '';
    if (!a || !/^[0-9a-z]{1,5}$/.test(d)) return null;
    return { a: a, at: new Date(parseInt(d, 36) * 86400000).toISOString(), open: q.get('u') === '1' };
  }
  // 카드함 주소만 14일 동안 기억합니다 (결과 화면은 새로 고침하면 사라짐)
  function lastBox() { var b = ls('nw:minds:box'); if (!b || !b.url || Date.now() - new Date(b.at).getTime() > 14 * 86400000) { ls('nw:minds:box', null); return null; } return b; }

  // ---------- canvas ----------
  var imgCache = {};
  function loadImg(url) { if (!imgCache[url]) imgCache[url] = new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = url; }); return imgCache[url]; }
  var fontsReady = null;
  function fonts() { if (!fontsReady) fontsReady = (document.fonts && document.fonts.load ? Promise.all(['500', '600', '700', '800', '900'].map(function (w) { return document.fonts.load(w + ' 40px "Pretendard Variable"').catch(function () {}); })) : Promise.resolve()).then(function () {}, function () {}); return fontsReady; }
  function f(ctx, w, s) { ctx.font = w + ' ' + s + 'px ' + FONT; }
  function lines(ctx, text, maxw) {
    var out = [], cur = '';
    String(text).split(' ').forEach(function (w) {
      var t = cur ? cur + ' ' + w : w;
      if (ctx.measureText(t).width <= maxw) { cur = t; return; }
      if (cur) out.push(cur);
      while (ctx.measureText(w).width > maxw) { var k = w.length; while (k > 1 && ctx.measureText(w.slice(0, k)).width > maxw) k--; out.push(w.slice(0, k)); w = w.slice(k); }
      cur = w;
    });
    if (cur) out.push(cur);
    return out;
  }
  function para(ctx, text, x, y, maxw, lh, draw) { var ls2 = lines(ctx, text, maxw); if (draw) ls2.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); }); return y + ls2.length * lh; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function deep(hex, t) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 'rgb(' + Math.round(r * (1 - t) + 27 * t) + ',' + Math.round(g * (1 - t) + 27 * t) + ',' + Math.round(b * (1 - t) + 27 * t) + ')'; }

  // 뒷면: 마음 k에 대한 내 수치와 해석. res = { a, at } 또는 null(예시)
  function renderBack(k, res, opts) {
    opts = opts || {};
    var sample = !!opts.sample || !res;
    var a = res && res.a ? res.a : sampleAnswers(k), when = res && res.at ? new Date(res.at) : new Date();
    var r = compute(a), x = read(r, k), m = mind(k), colD = deep(m.c, k === 'maker' ? .45 : .25);
    return Promise.all([fonts(), loadImg(src(k, 'back-base')), loadImg('/assets/brand/char-' + k + '.jpg').catch(function () { return null; })]).then(function (v) {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var ctx = cv.getContext('2d');
      var body = function (s, draw) {
        var y, tw = W - PAD * 2;
        ctx.textBaseline = 'top';
        // header
        var pill = sample ? '예시 결과 · SAMPLE' : 'MY 6 MINDS';
        f(ctx, 800, 22); var pw = ctx.measureText(pill).width + 36;
        if (draw) { rr(ctx, PAD, 104, pw, 44, 22); ctx.fillStyle = sample ? INK : colD; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(pill, PAD + 18, 114); f(ctx, 600, 22); ctx.fillStyle = MUTE; var dt = (sample ? '예시 · ' : '') + fmt(when) + ' · 지난 2주'; ctx.fillText(dt, W - PAD - ctx.measureText(dt).width, 114); }
        f(ctx, 900, 50); if (draw) { ctx.fillStyle = INK; ctx.fillText('요즘 나의 「' + m.n + '」', PAD, 170); }
        f(ctx, 800, 24); var lw = ctx.measureText(x.label).width + 30;
        if (draw) { rr(ctx, PAD, 242, lw, 42, 21); ctx.fillStyle = x.sc; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(x.label, PAD + 15, 250); f(ctx, 700, 24); ctx.fillStyle = BODY; ctx.fillText('에너지 총량 속 역할 · ' + x.role + ' · 사용량 ' + x.rank + '위', PAD + lw + 16, 250); }
        // character
        var cy = 310, av = 120;
        if (draw) {
          if (v[2]) { ctx.save(); ctx.beginPath(); ctx.arc(PAD + av / 2, cy + av / 2, av / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(v[2], PAD, cy, av, av); ctx.restore(); }
          ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(PAD + av / 2, cy + av / 2, av / 2, 0, Math.PI * 2); ctx.stroke();
          f(ctx, 900, 38); ctx.fillStyle = colD; ctx.fillText(m.char, PAD + av + 28, cy + 14);
        }
        f(ctx, 500, 23); ctx.fillStyle = BODY; para(ctx, m.char_d, PAD + av + 28, cy + 64, tw - av - 28, 32, draw);
        // metrics
        var my = 460, gap = 14, bw = (tw - gap * 3) / 4;
        [['사용 지수', x.useIdx, '/100'], ['회복 지수', x.recIdx, '/100'], ['배분 비중', x.share + '%', ''], ['총량 기여', x.contrib, '/6.7']].forEach(function (b, i) {
          if (!draw) return; var bx = PAD + i * (bw + gap);
          rr(ctx, bx, my, bw, 112, 18); ctx.fillStyle = SOFT; ctx.fill();
          f(ctx, 700, 19); ctx.fillStyle = MUTE; ctx.fillText(b[0], bx + 18, my + 16);
          f(ctx, 900, 40); ctx.fillStyle = INK; var vs = String(b[1]); ctx.fillText(vs, bx + 18, my + 48); if (b[2]) { var vw = ctx.measureText(vs).width; f(ctx, 700, 18); ctx.fillStyle = MUTE; ctx.fillText(b[2], bx + 22 + vw, my + 70); }
        });
        y = my + 140;
        // now + numbers
        f(ctx, 800, 23); if (draw) { ctx.fillStyle = colD; ctx.fillText('지금 상태', PAD, y); } y += 36;
        f(ctx, 600, Math.round(26 * s)); if (draw) ctx.fillStyle = INK; y = para(ctx, x.now, PAD, y, tw, Math.round(38 * s), draw) + 6;
        f(ctx, 500, Math.round(21 * s)); if (draw) ctx.fillStyle = MUTE; y = para(ctx, x.lv || x.numLine, PAD, y, tw, Math.round(30 * s), draw) + 20;
        // think / act / need
        f(ctx, 800, 23); if (draw) { ctx.fillStyle = colD; ctx.fillText('생각 · 행동 · 마음', PAD, y); } y += 38;
        [['생각', x.think], ['행동', x.act], ['마음', x.need]].forEach(function (row) {
          if (draw) { f(ctx, 800, 20); rr(ctx, PAD, y - 2, 64, 32, 16); ctx.fillStyle = SOFT; ctx.fill(); ctx.fillStyle = INK; ctx.fillText(row[0], PAD + 13, y + 3); }
          f(ctx, 500, Math.round(23 * s)); if (draw) ctx.fillStyle = BODY; y = para(ctx, row[1], PAD + 80, y, tw - 80, Math.round(33 * s), draw) + 10;
        });
        y += 10;
        // deeper
        f(ctx, 800, 23); if (draw) { ctx.fillStyle = colD; ctx.fillText('한 번 더 깊게', PAD, y); } y += 36;
        f(ctx, 500, Math.round(23 * s)); if (draw) ctx.fillStyle = BODY; y = para(ctx, x.deep, PAD, y, tw, Math.round(34 * s), draw) + 18;
        // this week
        f(ctx, 700, Math.round(25 * s)); var tl = lines(ctx, x.tryIt, tw - 60), th = 56 + tl.length * Math.round(36 * s) + 16;
        if (draw) { rr(ctx, PAD, y, tw, th, 22); ctx.fillStyle = SOFT; ctx.fill(); rr(ctx, PAD, y, 10, th, 5); ctx.fillStyle = x.sc; ctx.fill(); f(ctx, 800, 21); ctx.fillStyle = x.sc; ctx.fillText('이번 주 한 가지', PAD + 30, y + 18); f(ctx, 700, Math.round(25 * s)); ctx.fillStyle = INK; tl.forEach(function (l, i) { ctx.fillText(l, PAD + 30, y + 54 + i * Math.round(36 * s)); }); }
        y += th + 22;
        // role in the energy total + pair mind
        f(ctx, 800, 23); if (draw) { ctx.fillStyle = colD; ctx.fillText('에너지 총량 속 역할 · ' + x.role, PAD, y); } y += 36;
        f(ctx, 500, Math.round(23 * s)); if (draw) ctx.fillStyle = BODY; y = para(ctx, x.role_d, PAD, y, tw, Math.round(34 * s), draw) + 14;
        f(ctx, 800, 23); if (draw) { ctx.fillStyle = colD; ctx.fillText('짝이 되는 마음', PAD, y); } y += 36;
        f(ctx, 500, Math.round(23 * s)); if (draw) ctx.fillStyle = BODY; y = para(ctx, x.pairLine, PAD, y, tw, Math.round(34 * s), draw);
        return y;
      };
      var LIMIT = H - 320, s = 1;
      [1, .94, .88, .82, .76].some(function (t) { s = t; return body(t, false) <= LIMIT; });
      ctx.drawImage(v[1], 0, 0, W, H);
      body(s, true);
      // mini strip: six minds + total (fixed, above the footer)
      var sy = H - 292, sw = (W - PAD * 2 - 170) / 6, SHORT = { explorer: '탐험', maker: '만들기', connector: '연결', supporter: '돕기', thinker: '생각', enjoyer: '즐기기' };
      f(ctx, 700, 18); ctx.fillStyle = MUTE; ctx.fillText('여섯 마음 사용량', PAD, sy);
      r.minds.forEach(function (mm, i) {
        var bx = PAD + i * sw, h = 8 + mm.use * 11, isMe = mm.k === k;
        rr(ctx, bx + 6, sy + 80 - h, sw - 14, h, 6); ctx.fillStyle = isMe ? mm.c : TRACK; ctx.fill();
        if (isMe) { ctx.lineWidth = 3; ctx.strokeStyle = INK; ctx.stroke(); }
        f(ctx, isMe ? 800 : 600, 17); ctx.fillStyle = isMe ? INK : MUTE; var lb = SHORT[mm.k]; ctx.fillText(lb, bx + (sw - 8) / 2 - ctx.measureText(lb).width / 2, sy + 88);
      });
      ctx.fillStyle = LINE; ctx.fillRect(W - PAD - 150, sy + 4, 3, 76);
      f(ctx, 700, 18); ctx.fillStyle = MUTE; ctx.fillText('에너지 총량', W - PAD - 130, sy);
      f(ctx, 900, 46); ctx.fillStyle = INK; ctx.fillText(String(r.energy), W - PAD - 130, sy + 28); var eb = energyRead(r).s; if (eb) { f(ctx, 700, 17); ctx.fillStyle = BODY; ctx.fillText(eb, W - PAD - 130, sy + 88); }
      if (sample) { ctx.save(); ctx.translate(W / 2, H * .5); ctx.rotate(-0.28); f(ctx, 900, 170); ctx.globalAlpha = .08; ctx.fillStyle = INK; var st = 'SAMPLE'; ctx.fillText(st, -ctx.measureText(st).width / 2, -85); ctx.restore(); }
      return cv;
    });
  }

  // ---------- save / share ----------
  function blobOf(url) { return fetch(url).then(function (r) { return r.blob(); }); }
  function canvasBlob(cv) { return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); }
  function saveBlob(b, name) { var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); }
  function copyText(t) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); return new Promise(function (res) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); res(); }); }
  // 휴대폰 사진첩: 앞면·뒷면 두 장(각 1080×1920, 휴대폰 화면 비율 9:16)을 공유 창으로 넘기면 「이미지 저장」으로 사진첩에 들어갑니다
  function savePhotos(k, res) {
    return Promise.all([blobOf(src(k, 'front')), renderBack(k, res).then(canvasBlob)]).then(function (b) {
      var files = [new File([b[0]], '6minds-' + k + '-front.png', { type: 'image/png' }), new File([b[1]], '6minds-' + k + '-back.png', { type: 'image/png' })];
      if (navigator.canShare && navigator.canShare({ files: files }) && navigator.share) {
        return navigator.share({ files: files }).then(function () { return '공유 창에서 「이미지 저장」을 누르면 사진첩에 두 장이 저장됩니다'; }).catch(function (e) { if (e && e.name === 'AbortError') return '저장을 취소했습니다'; saveBlob(b[0], files[0].name); saveBlob(b[1], files[1].name); return '앞면과 뒷면 두 장을 내려받았습니다'; });
      }
      saveBlob(b[0], files[0].name); setTimeout(function () { saveBlob(b[1], files[1].name); }, 400);
      return '앞면과 뒷면 두 장(1080×1920)을 내려받았습니다';
    });
  }
  function caption(m) { return '네다바웨이 6 MINDS로 지난 2주 동안 내가 어느 마음을 가장 많이 썼는지 봤어요. 내 캐릭터는 「' + m.char + '」. 당신은 어느 색인가요? 4분 진단 → ' + inviteUrl() + '\n' + HASH; }
  function shareFront(m) {
    var text = caption(m);
    return blobOf(src(m.k, 'front')).then(function (b) {
      var file = new File([b], '6minds-' + m.k + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) return navigator.share({ files: [file], text: text }).then(function () { return '공유 창을 열었습니다. 인스타그램을 고르고 캡션을 붙여 주세요'; }).catch(function (e) { return e && e.name === 'AbortError' ? '공유를 취소했습니다' : fb(); });
      return fb();
      function fb() { return copyText(text).then(function () { saveBlob(b, file.name); return '앞면을 저장하고 캡션을 복사했습니다. 인스타그램에서 올려 주세요'; }); }
    });
  }
  var INVITE = '요즘 나는 어느 마음을 가장 많이 쓰고 있을까? 15문항 4분이면 내 결과가 담긴 마음 카드 여섯 장을 받아요.';
  function shareInvite() {
    var url = inviteUrl();
    function copy() { return copyText(INVITE + ' ' + url).then(function () { return { copied: true }; }); }
    if (navigator.share) return navigator.share({ title: '6 MINDS · 요즘 나의 여섯 마음', text: INVITE, url: url }).then(function () { return { done: true }; }).catch(function (e) { return e && e.name === 'AbortError' ? { cancel: true } : copy(); });
    return copy();
  }

  // ---------- single card viewer ----------
  // opts: { k, res, title, isNew, locked, onUnlock, onGo, sub }
  function card(host, opts) {
    var m = mind(opts.k); if (!m) return;
    var res = opts.res || null, mine = !!res, locked = !!opts.locked;
    host.innerHTML = ''; host.classList.add('mc'); host.style.setProperty('--mc', m.c);
    var face = 'front';
    if (opts.title) host.appendChild(el('p', 'mc-title', esc(opts.title)));
    var stage = el('div', 'mc-stage' + (locked ? ' is-locked' : ''));
    var flip = el('button', 'mc-flip'); flip.type = 'button';
    flip.setAttribute('aria-label', m.n + ' 카드. 누르면 뒷면이 보입니다' + (locked ? '. 이 카드는 아직 잠겨 있습니다' : ''));
    var inner = el('div', 'mc-flip__in'), fF = el('div', 'mc-face mc-face--front'), fB = el('div', 'mc-face mc-face--back');
    var iF = new Image(), iB = new Image(); iF.width = iB.width = 1080; iF.height = iB.height = 1920;
    iF.alt = m.n + ' 카드 앞면. ' + m.char; iB.alt = m.n + ' 카드 뒷면. ' + (mine ? (locked ? '잠긴 내 결과' : '내 결과') : '예시 결과');
    iF.src = src(m.k, 'front'); iB.src = src(m.k, 'back-base');
    renderBack(m.k, res, { sample: !mine }).then(function (cv) { iB.src = cv.toDataURL('image/jpeg', .9); }).catch(function () {});
    fF.appendChild(iF); fB.appendChild(iB);
    if (locked) fB.appendChild(el('span', 'mc-lock', '<b>잠긴 카드</b><small>한 번 공유하면 나머지 다섯 장이 모두 열립니다</small>'));
    inner.appendChild(fF); inner.appendChild(fB); flip.appendChild(inner); stage.appendChild(flip);
    if (opts.isNew) stage.appendChild(el('span', 'mc-new', 'NEW'));
    if (!mine) stage.appendChild(el('span', 'mc-sample', '뒷면은 예시'));
    host.appendChild(stage);
    host.appendChild(el('p', 'mc-hint', '카드를 누르면 뒷면이 보입니다'));
    var acts = el('div', 'mc-acts');
    function btn(label, cls, fn) { var b = el('button', cls + ' mc-act', label); b.type = 'button'; b.addEventListener('click', fn); acts.appendChild(b); return b; }
    if (!mine) {
      if (opts.onGo) btn('4분 진단하고 내 카드 받기', 'btn-go', opts.onGo); else { var go = el('a', 'btn-go mc-act', '4분 진단하고 내 카드 받기'); go.href = '/diagnosis/minds/'; acts.appendChild(go); }
    } else if (locked) {
      if (opts.onUnlock) btn('다섯 장 모두 열기', 'btn-go', opts.onUnlock);
    } else {
      btn('사진으로 저장', 'btn-go', function () { savePhotos(m.k, res).then(toast); });
      btn('인스타그램에 앞면 올리기', 'btn-dark', function () { shareFront(m).then(toast); });
      btn('캡션 복사', 'btn-ghost', function () { copyText(caption(m)).then(function () { toast('캡션을 복사했습니다'); }); });
    }
    host.appendChild(acts);
    host.appendChild(el('p', 'mc-note', opts.sub || (mine
      ? (locked ? '이 카드의 뒷면에도 이번 진단의 내 결과가 이미 들어 있습니다. 카드를 열면 선명하게 보이고 저장할 수 있습니다.' : '뒷면에는 이 마음에 대한 <b>내 수치와 해석</b>이 들어 있습니다. 「사진으로 저장」은 앞면과 뒷면을 휴대폰 화면 크기(1080×1920) 두 장으로 사진첩에 넣습니다. 인스타그램에는 <b>앞면만</b> 올라갑니다.')
      : '뒷면은 예시입니다. 진단하면 여섯 마음 카드 뒷면마다 <b>그 마음에 대한 내 수치와 해석</b>이 들어갑니다.')));
    flip.addEventListener('click', function () { face = face === 'front' ? 'back' : 'front'; flip.classList.toggle('is-back', face === 'back'); });
  }

  // ---------- card box: 6 cards from one diagnosis ----------
  // o: { a, at, open(bool), isNew }
  function box(host, o) {
    var r = compute(o.a), top = sorted(r)[0].k, res = { a: o.a, at: o.at }, cur = top, isNewTop = !!o.isNew;
    host.innerHTML = ''; host.classList.add('mc-box');
    var head = el('div', 'mc-box__h'), grid = el('div', 'mc-col__g mc-box__g'), view = el('div', 'mc-box__view'), foot = el('div', 'mc-invite');
    host.appendChild(head); host.appendChild(grid); host.appendChild(view); host.appendChild(foot);
    function isOpen(k) { return o.open || k === top; }
    function remember() { ls('nw:minds:box', { url: boxUrl(o), at: o.at }); }
    function draw(anim) {
      head.innerHTML = '<b>이번 진단의 카드함</b><span>' + (o.open ? 6 : 1) + ' / 6 열림</span><p>' + (o.open ? '여섯 장이 모두 열렸습니다. 카드를 누르면 그 마음에 대한 내 수치와 해석이 뒷면에 있습니다.' : '여섯 장 모두 이번 진단의 내 결과로 만들었습니다. 가장 많이 쓴 마음 카드 한 장은 바로 열리고, 나머지 다섯 장은 <em>한 번 공유하면 모두 열립니다.</em>') + '</p>';
      grid.innerHTML = '';
      MINDS.forEach(function (m) {
        var op = isOpen(m.k), x = read(r, m.k);
        var b = el('button', 'mc-col__c' + (op ? ' is-got' : ' is-locked') + (cur === m.k ? ' is-cur' : '') + (anim && m.k !== top ? ' is-unlock' : '')); b.type = 'button'; b.style.setProperty('--mc', m.c);
        b.innerHTML = '<span class="mc-col__img"><img src="' + thumb(m.k) + '" width="360" height="640" alt="" loading="lazy">' + (op ? '' : '<i class="mc-col__lock" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg></i>') + '</span><b>' + esc(m.char) + '</b><small>' + (op ? esc(x.label) : '잠김') + '</small>';
        b.setAttribute('aria-label', m.char + ' 카드, ' + (op ? '열림, ' + x.label : '잠김'));
        b.addEventListener('click', function () { cur = m.k; if (!op) { draw(); sheet(); } else { draw(); view.scrollIntoView({ behavior: 'smooth', block: 'center' }); } });
        grid.appendChild(b);
      });
      card(view, { k: cur, res: res, locked: !isOpen(cur), isNew: isNewTop && cur === top, onUnlock: sheet, title: (isOpen(cur) ? '' : '잠긴 카드 · ') + mind(cur).char });
      var burl = boxUrl(o);
      foot.innerHTML = (o.open
        ? '<p class="mc-invite__t">친구에게도 알려 주세요</p><p class="mc-invite__d">받은 사람은 자기 진단을 새로 하고, 자기 결과로 만든 카드 여섯 장을 받습니다. 보내는 글에는 내 결과가 들어가지 않습니다.</p><div class="mc-invite__row"><button type="button" class="btn-dark mc-act" data-a="inv">카카오톡·문자로 보내기</button></div>'
        : '<p class="mc-invite__t">나머지 다섯 장, 공유 한 번이면 모두 열립니다</p><p class="mc-invite__d">결제는 받지 않습니다. 6 MINDS를 알리는 데 함께해 주시면 다섯 장을 모두 드립니다.</p><div class="mc-invite__row"><button type="button" class="btn-go mc-act" data-a="open">다섯 장 모두 열기</button></div>') +
        '<div class="mc-keep"><b>내 카드함 주소</b><p>이 화면은 새로 고침하면 사라집니다. 결과는 2주마다 바뀌기 때문에 자동으로 남기지 않습니다. 카드함 주소를 카카오톡 「나에게 보내기」에 보관하면 나중에 다시 열 수 있습니다. 주소에는 내 결과가 들어 있으니 다른 사람에게 보내지 마세요.</p><div class="mc-keep__row"><button type="button" class="btn-dark mc-act" data-a="box">카드함 주소 보관하기</button>' + (/^\/minds\/box\//.test(location.pathname) ? '' : '<a class="btn-link" href="' + esc(burl) + '">카드함 열기 &#8599;</a>') + '</div></div>';
      var q = function (a) { return foot.querySelector('[data-a="' + a + '"]'); };
      if (q('open')) q('open').addEventListener('click', sheet);
      if (q('inv')) q('inv').addEventListener('click', function () { shareInvite().then(function (x) { toast(x.done ? '보냈습니다. 고맙습니다' : (x.copied ? '초대 글과 링크를 복사했습니다. 카카오톡에 붙여 넣으세요' : '보내기를 취소했습니다')); }); });
      q('box').addEventListener('click', function () {
        var t = '내 6 MINDS 카드함 (' + fmt(new Date(o.at)) + ' 진단, 나만 보기): ' + boxUrl(o);
        (navigator.share ? navigator.share({ title: '내 6 MINDS 카드함', text: t }).then(function () { return '카드함 주소를 보냈습니다'; }) : Promise.reject()).catch(function (e) { if (e && e.name === 'AbortError') return '보관을 취소했습니다'; return copyText(t).then(function () { return '카드함 주소를 복사했습니다. 카카오톡 나에게 보내기에 붙여 넣으세요'; }); }).then(toast);
      });
    }
    function unlock() {
      o.open = true; remember(); draw(true);
      toast('다섯 장이 모두 열렸습니다. 고맙습니다');
      grid.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    // 잠금 해제 안내: 유료 카드처럼 보이지만 결제는 없고, 공유 한 번으로 엽니다
    function sheet() {
      if (o.open) return;
      var d = document.createElement('dialog'); d.className = 'mc-sheet'; d.setAttribute('aria-labelledby', 'mcSheetT');
      var locked = MINDS.filter(function (m) { return m.k !== top; });
      d.innerHTML = '<button type="button" class="mc-sheet__x" aria-label="닫기">&times;</button>' +
        '<p class="mc-sheet__pill">PREMIUM · 나머지 다섯 장</p><h2 class="mc-sheet__t" id="mcSheetT">내 결과 해설 카드 다섯 장</h2>' +
        '<div class="mc-sheet__row">' + locked.map(function (m) { return '<span style="--mc:' + m.c + ';"><img src="' + thumb(m.k) + '" width="360" height="640" alt="">' + '<b>' + esc(m.char) + '</b></span>'; }).join('') + '</div>' +
        '<ul class="mc-sheet__l"><li>카드마다 <b>그 마음의 네 수치</b> (사용 지수 · 회복 지수 · 배분 비중 · 총량 기여)</li><li>여덟 자리 가운데 <b>내 자리</b>와 에너지 총량 속 역할</li><li><b>생각 · 행동 · 마음</b>과 한 번 더 깊게 본 해석</li><li>이번 주 한 가지, 짝이 되는 마음 안내</li><li>앞면 · 뒷면 두 장을 휴대폰 사진첩에 저장</li></ul>' +
        '<div class="mc-sheet__price"><span>이용 방법</span><b>결제 없음 · 공유 한 번</b><small>네다바웨이는 결제를 받지 않습니다. 6 MINDS를 친구나 단톡방에 한 번 알려 주시면 다섯 장을 모두 무료로 엽니다.</small></div>' +
        '<ol class="mc-sheet__steps"><li>아래 버튼을 누르면 공유 창이 열립니다.</li><li>카카오톡 단톡방이나 친구 한 명을 고릅니다.</li><li>보내고 돌아오면 다섯 장이 바로 열립니다.</li></ol>' +
        '<button type="button" class="btn-go mc-sheet__go">공유하고 무료로 열기</button>' +
        '<div class="mc-sheet__fb" hidden><p>초대 글과 링크를 복사했습니다. 카카오톡 단톡방이나 친구에게 붙여 넣어 보낸 뒤 아래 버튼을 누르세요.</p><button type="button" class="btn-dark mc-sheet__done">보냈어요, 다섯 장 열기</button></div>' +
        '<p class="mc-sheet__msg" role="status"></p>' +
        '<p class="mc-sheet__n">보내는 글에는 내 결과가 들어가지 않습니다. 받은 사람은 자기 진단을 새로 합니다.</p>' +
        '<button type="button" class="btn-link mc-sheet__later">나중에 할게요</button>';
      document.body.appendChild(d);
      function close() { if (d.open && d.close) d.close(); d.remove(); }
      d.querySelector('.mc-sheet__x').addEventListener('click', close);
      d.querySelector('.mc-sheet__later').addEventListener('click', close);
      d.addEventListener('cancel', function (e) { e.preventDefault(); close(); });
      d.addEventListener('click', function (e) { if (e.target === d) close(); });
      d.querySelector('.mc-sheet__go').addEventListener('click', function () {
        shareInvite().then(function (x) {
          if (x.done) { close(); unlock(); return; }
          if (x.copied) { d.querySelector('.mc-sheet__fb').hidden = false; d.querySelector('.mc-sheet__done').focus(); return; }
          d.querySelector('.mc-sheet__msg').textContent = '공유를 마치면 바로 열립니다. 다시 눌러 보내 주세요.';
        });
      });
      d.querySelector('.mc-sheet__done').addEventListener('click', function () { close(); unlock(); });
      if (d.showModal) d.showModal(); else d.setAttribute('open', '');
    }
    remember(); draw();
    return { top: top };
  }
  // 새 진단 → 새 카드함 (한 장만 열림)
  function newBox(host, a, isNew) { var o = { a: a, at: new Date().toISOString(), open: false, isNew: isNew }; box(host, o); return o; }

  window.NWCards = { MINDS: MINDS, HASH: HASH, compute: compute, sorted: sorted, topOf: topOf, state: state, read: read, readingHTML: readingHTML, energyRead: energyRead, energyHTML: energyHTML, renderBack: renderBack, card: card, box: box, newBox: newBox, parseBox: parseBox, trackVisit: trackVisit, lastBox: lastBox, inviteUrl: inviteUrl, encA: encA, decA: decA };
})();
