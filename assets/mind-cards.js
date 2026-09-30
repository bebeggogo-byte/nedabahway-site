/* mind-cards.js — 6 MINDS 마음 카드
   앞면: 마음과 색 캐릭터(모두 같음, 공유용). 뒷면: 내 진단 결과(사람마다 다름, 내 기기에만 저장).
   - 진단 전에는 뒷면에 "예시 결과"를 그려 보여 주고, 진단하면 같은 자리에 내 결과가 들어갑니다.
   - 인스타그램·스레드에는 앞면만 나갑니다. 「내 카드 받기」는 앞면 + 내 결과 뒷면을 한 장으로 저장합니다.
   Data: window.NW_MINDS (assets/mind-data.js, generated from .moai/project/six-minds-data.json)
   window.NWCards = { card, collection, collected, collect, backfill, compute, topOf, resultFor, renderBack, ... } */
(function () {
  'use strict';
  var HASH = '#네다바웨이 #식스마인드 #6MINDS';
  var KEY = 'nw:minds:cards';
  var W = 1080, H = 1920, PAD = 92;
  var INK = '#1b1b1b', BODY = '#34322f', MUTE = '#5c5750', LINE = '#d6cfc1', TRACK = '#e6e0d4';
  var FONT = "'Pretendard Variable','Pretendard','Apple SD Gothic Neo','Malgun Gothic',system-ui,sans-serif";
  var HINT = {
    explorer: '처음 해 보는 일이 가장 많았던 2주', maker: '무언가를 끝까지 만든 날이 가장 많았던 2주',
    connector: '속마음을 나눈 대화가 가장 많았던 2주', supporter: '누군가를 도운 날이 가장 많았던 2주',
    thinker: '하루를 돌아보고 정리한 날이 가장 많았던 2주', enjoyer: '이유 없이 좋았던 시간이 가장 많았던 2주'
  };
  var MINDS = (window.NW_MINDS || []).map(function (m) { return { k: m.k, n: m.n, en: m.en, c: m.c, char: m.char, char_d: m.char_d, less: m.less, more: m.more, hint: HINT[m.k] }; });
  function mind(k) { for (var i = 0; i < MINDS.length; i++) if (MINDS[i].k === k) return MINDS[i]; return null; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function toast(msg) { var t = document.querySelector('.mc-toast'); if (!t) { t = el('p', 'mc-toast'); t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('is-on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('is-on'); }, 2800); }
  function src(k, face) { return '/assets/cards/mind-' + k + '-' + face + '.png'; }
  function thumb(k) { return '/assets/cards/thumb/mind-' + k + '-front.jpg'; }
  function fmt(d) { return d.getFullYear() + '. ' + (d.getMonth() + 1) + '. ' + d.getDate() + '.'; }

  // ---------- result model (same formula as /diagnosis/minds/ compute) ----------
  // answers a[15] = [use0,chg0, use1,chg1, ... use5,chg5, sleep, move, drive]; use 0..4, chg -2..+2, body 0..4
  function compute(a) {
    var r = { minds: [], total: { sleep: a[12], move: a[13], drive: a[14] } };
    MINDS.forEach(function (m, i) { r.minds.push({ k: m.k, n: m.n, c: m.c, use: a[i * 2], chg: a[i * 2 + 1] }); });
    var totAvg = (r.total.sleep + r.total.move + r.total.drive) / 3 / 4 * 100;
    var chgAvg = r.minds.reduce(function (s, m) { return s + (m.chg + 2) / 4 * 100; }, 0) / 6;
    r.energy = Math.round(totAvg * 0.6 + chgAvg * 0.4);
    return r;
  }
  function sorted(r) { return r.minds.slice().sort(function (x, y) { return y.use - x.use || y.chg - x.chg; }); }
  function topOf(a) { if (!a || a.length !== 15) return null; return sorted(compute(a))[0].k; }
  // 네 자리: 사용량(많이/적게) × 쓰고 난 뒤(힘이 남/지침). 이름이 곧 이번 주 할 일입니다.
  function quad(m) { var hi = m.use >= 3, lo = m.use <= 1; if (hi && m.chg >= 1) return 'keep'; if (hi && m.chg <= -1) return 'cut'; if (lo && m.chg >= 1) return 'grow'; if (lo && m.chg <= -1) return 'wait'; if (m.use === 4 && m.chg <= 0) return 'cut'; return 'mid'; }
  var QUAD = { keep: '지킬 마음', cut: '줄일 마음', grow: '늘릴 마음', wait: '기다릴 마음', mid: '보통' };
  function band(e) { return e >= 70 ? '넉넉함' : (e >= 50 ? '보통' : (e >= 30 ? '낮음' : '회복이 먼저')); }
  function summary(e) { return e >= 70 ? '나는 잠과 움직임이 안정되어 있고, 여섯 마음을 고르게 쓰고 있습니다.' : (e >= 50 ? '나는 몸의 기본은 괜찮고, 몇 가지 마음만 많이 쓰고 있습니다.' : (e >= 30 ? '나는 거의 안 쓰는 마음이 몇 개 있고, 잠과 움직임부터 챙길 때입니다.' : '나는 요즘 많이 지쳐 있습니다. 이번 주는 쉬는 것이 먼저입니다.')); }
  function chgTag(c) { return c >= 1 ? { t: '힘이 남', c: '#0F9F6E' } : (c <= -1 ? { t: '지침', c: '#E11D48' } : { t: '그대로', c: '#8a847b' }); }
  function plan(r) {
    var s = sorted(r), A = s[0], B = s[s.length - 1];
    var grow = r.minds.filter(function (m) { return quad(m) === 'grow'; }).sort(function (x, y) { return y.chg - x.chg || x.use - y.use; });
    var cut = r.minds.filter(function (m) { return quad(m) === 'cut'; }).sort(function (x, y) { return y.use - x.use; });
    var G = grow[0] || r.minds.filter(function (m) { return m.use <= 1 && m.chg >= 0; }).sort(function (x, y) { return y.chg - x.chg; })[0] || B;
    var L = cut[0] || A;
    if (G.k === L.k) G = B.k !== L.k ? B : s[s.length - 2];
    return { A: A, B: B, G: G, L: L };
  }
  // 예시 결과: 카드 k가 가장 많이 쓴 마음이 되도록 만든 가상의 답
  function sampleAnswers(k) {
    var use = [2, 3, 2, 1, 3, 1], chg = [1, -1, 2, 0, -1, 1], i = MINDS.map(function (m) { return m.k; }).indexOf(k), a = [];
    if (i >= 0) { use[i] = 4; chg[i] = 2; }
    for (var j = 0; j < 6; j++) { a.push(use[j], chg[j]); }
    return a.concat([3, 2, 3]);
  }

  // ---------- storage ----------
  function persist() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {} }
  function encA(a) { var n = 0n; for (var i = 0; i < 15; i++) { var v = a[i]; if (i < 12 && i % 2 === 1) v = v + 2; n = n * 5n + BigInt(v); } var t = n.toString(36).toUpperCase(); while (t.length < 10) t = '0' + t; return 'M' + t; }
  function decA(str) { if (!/^M[0-9A-Z]{10}$/.test(str)) return null; var n = 0n, t = str.slice(1).toLowerCase(); for (var i = 0; i < t.length; i++) n = n * 36n + BigInt(parseInt(t[i], 36)); var a = []; for (var j = 14; j >= 0; j--) { var v = Number(n % 5n); n = n / 5n; if (j < 12 && j % 2 === 1) v = v - 2; a[j] = v; } return n === 0n ? a : null; }
  function diagLoad() { try { return JSON.parse(localStorage.getItem('nw:diag:minds') || 'null'); } catch (e) { return null; } }
  function diagSave(o) { try { localStorage.setItem('nw:diag:minds', JSON.stringify(o)); } catch (e) {} }
  function collected() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(function (k) { return mind(k); }) : []; } catch (e) { return []; } }
  function collect(k) { var s = collected(); var isNew = s.indexOf(k) < 0; if (isNew) { s.push(k); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} persist(); } return isNew; }
  function backfill(hist) { (hist || []).forEach(function (h) { var k = topOf(h && h.a); if (k) collect(k); }); return collected(); }
  // 카드 k를 받게 한 가장 최근 진단 (뒷면에 그릴 내 결과)
  function resultFor(k) {
    var st = diagLoad() || {}, list = (st.hist || []).slice();
    if (st.a) list.push({ a: st.a, at: st.at });
    for (var i = list.length - 1; i >= 0; i--) { var h = list[i]; if (h && h.a && topOf(h.a) === k) return { a: h.a, at: h.at }; }
    return null;
  }
  function maskOf() { var mask = 0; collected().forEach(function (k) { var i = MINDS.map(function (m) { return m.k; }).indexOf(k); if (i >= 0) mask |= (1 << i); }); return mask.toString(36).toUpperCase(); }
  function backupLink() {
    var st = diagLoad() || {}; var hist = (st.hist || []).filter(function (h) { return h && h.a && h.a.length === 15; }).slice(-6);
    var h = hist.map(function (x) { var d = Math.max(0, Math.round(new Date(x.at).getTime() / 86400000)); return encA(x.a) + d.toString(36).toUpperCase(); }).join('.');
    return 'https://www.nedabah.org/minds/?k=' + maskOf() + (h ? '&h=' + h : '');
  }
  function shortBackup() { return 'nedabah.org/minds/?k=' + maskOf(); }
  function restoreFrom(urlish) {
    var q; try { q = new URL(String(urlish), location.href).searchParams; } catch (e) { return 0; }
    var k = q.get('k'), h = q.get('h'), n = 0;
    if (k && /^[0-9A-Z]{1,2}$/i.test(k)) { var mask = parseInt(k, 36); MINDS.forEach(function (m, i) { if (mask & (1 << i)) { if (collect(m.k)) n++; } }); }
    if (h) {
      var st = diagLoad() || {}; var hist = st.hist || []; var seen = {}; hist.forEach(function (x) { seen[x.at] = 1; });
      h.split('.').forEach(function (tok) { var m = /^(M[0-9A-Z]{10})([0-9A-Z]{1,5})$/.exec(tok); if (!m) return; var a = decA(m[1]); if (!a) return; var at = new Date(parseInt(m[2], 36) * 86400000).toISOString(); if (seen[at]) return; hist.push({ a: a, at: at }); seen[at] = 1; n++; });
      hist.sort(function (x, y) { return new Date(x.at) - new Date(y.at); }); hist = hist.slice(-6);
      var last = hist[hist.length - 1]; if (last && (!st.at || new Date(last.at) >= new Date(st.at))) { st.a = last.a; st.at = last.at; }
      st.hist = hist; diagSave(st);
    }
    if (n) persist();
    return n;
  }
  function restoreFromUrl() { if (!/[?&]k=/.test(location.search)) return 0; var n = restoreFrom(location.href); try { history.replaceState(null, '', location.pathname + location.hash); } catch (e) {} if (n) toast('모은 카드와 기록을 되살렸습니다'); return n; }

  // ---------- canvas back ----------
  var imgCache = {};
  function loadImg(url) { if (!imgCache[url]) imgCache[url] = new Promise(function (res, rej) { var i = new Image(); i.onload = function () { res(i); }; i.onerror = rej; i.src = url; }); return imgCache[url]; }
  var fontsReady = null;
  function fonts() {
    if (!fontsReady) fontsReady = (document.fonts && document.fonts.load ? Promise.all(['500', '600', '700', '800', '900'].map(function (w) { return document.fonts.load(w + ' 40px "Pretendard Variable"').catch(function () {}); })) : Promise.resolve()).then(function () {}, function () {});
    return fontsReady;
  }
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
  function para(ctx, text, x, y, maxw, lh) { var ls = lines(ctx, text, maxw); ls.forEach(function (l, i) { ctx.fillText(l, x, y + i * lh); }); return y + ls.length * lh; }
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function deep(hex, t) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; t = t || .3; return 'rgb(' + Math.round(r * (1 - t) + 27 * t) + ',' + Math.round(g * (1 - t) + 27 * t) + ',' + Math.round(b * (1 - t) + 27 * t) + ')'; }
  function tint(hex, t) { var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255; return 'rgb(' + Math.round(r + (255 - r) * t) + ',' + Math.round(g + (255 - g) * t) + ',' + Math.round(b + (255 - b) * t) + ')'; }

  // res: { a:[15], at } or null; opts.sample → 예시 결과 표시
  function renderBack(k, res, opts) {
    opts = opts || {};
    var m = mind(k), sample = !!opts.sample || !res;
    var a = res && res.a ? res.a : sampleAnswers(k), when = res && res.at ? new Date(res.at) : new Date();
    var r = compute(a), p = plan(r), s = sorted(r);
    var top = mind(p.A.k), col = top.c, colD = deep(col, top.k === 'maker' ? .45 : .25);
    return Promise.all([fonts(), loadImg(src(top.k, 'back-base')), loadImg('/assets/brand/char-' + top.k + '.jpg').catch(function () { return null; })]).then(function (v) {
      var cv = document.createElement('canvas'); cv.width = W; cv.height = H; var ctx = cv.getContext('2d');
      ctx.drawImage(v[1], 0, 0, W, H); ctx.textBaseline = 'top';
      // header
      var pill = sample ? '예시 결과 · SAMPLE' : 'MY 6 MINDS';
      f(ctx, 800, 22); var pw = ctx.measureText(pill).width + 36;
      rr(ctx, PAD, 104, pw, 44, 22); ctx.fillStyle = sample ? INK : colD; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(pill, PAD + 18, 114);
      f(ctx, 600, 22); ctx.fillStyle = MUTE; var dt = (sample ? '예시 · ' : '') + fmt(when) + ' · 지난 2주'; ctx.fillText(dt, W - PAD - ctx.measureText(dt).width, 114);
      f(ctx, 900, 54); ctx.fillStyle = INK;
      ctx.fillText('요즘 나는 「' + top.n + '」을', PAD, 172); ctx.fillText('가장 많이 썼습니다', PAD, 238);
      // character
      var cy = 330, av = 150;
      if (v[2]) { ctx.save(); ctx.beginPath(); ctx.arc(PAD + av / 2, cy + av / 2, av / 2, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(v[2], PAD, cy, av, av); ctx.restore(); }
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(PAD + av / 2, cy + av / 2, av / 2, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(PAD + av / 2, cy + av / 2, av / 2 - 7, 0, Math.PI * 2); ctx.stroke();
      var tx = PAD + av + 34, tw = W - PAD - tx;
      f(ctx, 700, 22); ctx.fillStyle = MUTE; ctx.fillText('나의 대표 캐릭터', tx, cy + 6);
      f(ctx, 900, 46); ctx.fillStyle = colD; ctx.fillText(top.char, tx, cy + 38);
      f(ctx, 500, 25); ctx.fillStyle = BODY; para(ctx, top.char_d, tx, cy + 100, tw, 36);
      // energy
      var ey = 520; ctx.fillStyle = LINE; ctx.fillRect(PAD, ey, W - PAD * 2, 3);
      var rcx = PAD + 96, rcy = ey + 134, R = 82;
      ctx.lineCap = 'round'; ctx.lineWidth = 20; ctx.strokeStyle = TRACK; ctx.beginPath(); ctx.arc(rcx, rcy, R, 0, Math.PI * 2); ctx.stroke();
      ctx.strokeStyle = '#1D4ED8'; ctx.beginPath(); ctx.arc(rcx, rcy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * r.energy / 100); ctx.stroke(); ctx.lineCap = 'butt';
      f(ctx, 900, 58); ctx.fillStyle = INK; var es = String(r.energy); ctx.fillText(es, rcx - ctx.measureText(es).width / 2, rcy - 36);
      f(ctx, 700, 18); ctx.fillStyle = MUTE; ctx.fillText('/ 100', rcx - ctx.measureText('/ 100').width / 2, rcy + 26);
      var ex = PAD + 220, ew = W - PAD - ex;
      f(ctx, 700, 22); ctx.fillStyle = MUTE; ctx.fillText('에너지 총량', ex, ey + 44);
      f(ctx, 900, 42); ctx.fillStyle = INK; ctx.fillText(band(r.energy), ex, ey + 76);
      f(ctx, 500, 25); ctx.fillStyle = BODY; para(ctx, summary(r.energy), ex, ey + 136, ew, 36);
      // bars
      var by = 800; f(ctx, 900, 30); ctx.fillStyle = INK; ctx.fillText('여섯 마음, 얼마나 썼나', PAD, by);
      f(ctx, 600, 20); ctx.fillStyle = MUTE; var lg = '막대 = 쓴 양 · 오른쪽 = 쓰고 난 뒤'; ctx.fillText(lg, W - PAD - ctx.measureText(lg).width, by + 8);
      var ry = by + 56, bx = PAD + 190, bw = W - PAD - 126 - bx;
      s.forEach(function (x, i) {
        var mm = mind(x.k), yy = ry + i * 60, isTop = i === 0;
        ctx.fillStyle = mm.c; ctx.beginPath(); ctx.arc(PAD + 9, yy + 15, 9, 0, Math.PI * 2); ctx.fill();
        f(ctx, isTop ? 800 : 600, 24); ctx.fillStyle = INK; ctx.fillText(mm.n, PAD + 28, yy + 2);
        rr(ctx, bx, yy + 4, bw, 24, 12); ctx.fillStyle = TRACK; ctx.fill();
        var fw = Math.max(24, bw * x.use / 4); if (x.use > 0) { rr(ctx, bx, yy + 4, fw, 24, 12); ctx.fillStyle = mm.c; ctx.fill(); }
        var tg = chgTag(x.chg); f(ctx, 800, 22); ctx.fillStyle = tg.c; ctx.fillText(tg.t, W - PAD - ctx.measureText(tg.t).width, yy + 4);
      });
      // plan boxes
      var y = ry + 6 * 60 + 18;
      [['줄일 마음', p.L, mind(p.L.k).less, '#E11D48'], ['늘릴 마음', p.G, mind(p.G.k).more, '#0F9F6E']].forEach(function (row) {
        f(ctx, 600, 27); var ls = lines(ctx, row[2], W - PAD * 2 - 64); var bh = 70 + ls.length * 38 + 18;
        rr(ctx, PAD, y, W - PAD * 2, bh, 24); ctx.fillStyle = '#ece7dc'; ctx.fill();
        rr(ctx, PAD, y, 10, bh, 5); ctx.fillStyle = row[3]; ctx.fill();
        var lb = row[0] + ' · ' + mind(row[1].k).n; f(ctx, 800, 22); var lw = ctx.measureText(lb).width + 28;
        rr(ctx, PAD + 32, y + 20, lw, 36, 18); ctx.fillStyle = row[3]; ctx.fill(); ctx.fillStyle = '#fff'; ctx.fillText(lb, PAD + 46, y + 27);
        f(ctx, 600, 27); ctx.fillStyle = INK; ls.forEach(function (l, i) { ctx.fillText(l, PAD + 34, y + 72 + i * 38); });
        y += bh + 14;
      });
      // pattern + next
      var pat = '나는 지난 2주 동안 「' + mind(p.A.k).n + '」을 가장 많이 쓰고 「' + mind(p.B.k).n + '」을 가장 적게 썼습니다.';
      f(ctx, 600, 25); ctx.fillStyle = BODY; y = para(ctx, pat, PAD, y + 8, W - PAD * 2, 36);
      if (y + 96 < H - 200) { f(ctx, 800, 22); ctx.fillStyle = colD; ctx.fillText('이번 주 나의 한 가지', PAD, y + 22); ctx.fillStyle = LINE; ctx.fillRect(PAD + 250, y + 46, W - PAD * 2 - 250, 3); y += 70; }
      var nx = new Date(when.getTime() + 28 * 86400000), nt = '다음 진단 ' + fmt(nx) + ' · 4주 뒤 다시 하면 변화가 보입니다';
      f(ctx, 800, 22); ctx.fillStyle = colD; if (y + 34 < H - 160) ctx.fillText(nt, PAD, Math.max(y + 12, H - 196));
      if (sample) {
        ctx.save(); ctx.translate(W / 2, H * .52); ctx.rotate(-0.28); f(ctx, 900, 170); ctx.globalAlpha = .09; ctx.fillStyle = INK; var st = 'SAMPLE'; ctx.fillText(st, -ctx.measureText(st).width / 2, -85); ctx.restore();
      }
      return cv;
    });
  }

  // ---------- share / download ----------
  function blobOf(url) { return fetch(url).then(function (r) { return r.blob(); }); }
  function saveBlob(b, name) { var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); }
  function download(url, name) { return blobOf(url).then(function (b) { saveBlob(b, name); }); }
  function canvasBlob(cv) { return new Promise(function (res) { cv.toBlob(res, 'image/png'); }); }
  // 한 파일: 앞면 + 내 결과 뒷면
  function myCard(k, res) {
    return Promise.all([loadImg(src(k, 'front')), renderBack(k, res)]).then(function (v) {
      var cv = document.createElement('canvas'); cv.width = W * 2 + 80; cv.height = H + 80; var ctx = cv.getContext('2d');
      ctx.fillStyle = '#f1ede5'; ctx.fillRect(0, 0, cv.width, cv.height); ctx.drawImage(v[0], 0, 40, W, H); ctx.drawImage(v[1], W + 80, 40, W, H);
      return canvasBlob(cv);
    });
  }
  function copyText(t) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); return new Promise(function (res) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); res(); }); }
  function caption(m) {
    return '네다바웨이 6 MINDS로 지난 2주 동안 내가 어느 마음을 가장 많이 썼는지 봤어요. 내 캐릭터는 「' + m.char + '」. 여섯 마음 카드 ' + collected().length + '/6 모으는 중\n' + HASH + '\n' + shortBackup();
  }
  function share(m) {
    var text = caption(m);
    return blobOf(src(m.k, 'front')).then(function (b) {
      var file = new File([b], '6minds-' + m.k + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        return navigator.share({ files: [file], title: '6 MINDS · ' + m.char, text: text }).then(function () { return '공유 창을 열었습니다. 인스타그램을 고르고 캡션을 붙여 주세요'; }).catch(function (e) { if (e && e.name === 'AbortError') return '공유를 취소했습니다'; return fallback(); });
      }
      return fallback();
    });
    function fallback() { return copyText(text).then(function () { return download(src(m.k, 'front'), '6minds-' + m.k + '.png'); }).then(function () { return '앞면을 저장하고 캡션을 복사했습니다. 인스타그램에서 올려 주세요'; }); }
  }
  function threads(m) { var t = '요즘 나는 「' + m.n + '」을 가장 많이 쓰고 있대요. 내 캐릭터는 ' + m.char + '. 당신은 어느 색인가요? 4분 진단 → nedabah.org/diagnosis/minds/\n' + HASH; window.open('https://www.threads.net/intent/post?text=' + encodeURIComponent(t), '_blank', 'noopener'); return '스레드 글쓰기를 열었습니다. 앞면 이미지는 저장해서 붙이세요'; }

  // ---------- single card viewer ----------
  // opts: { k, title, sub, isNew, locked, a, at, onGo }  (a 없으면 이 카드를 받은 가장 최근 진단, 그것도 없으면 예시)
  function card(host, opts) {
    var m = mind(opts.k); if (!m) return;
    var res = opts.a ? { a: opts.a, at: opts.at } : (opts.locked ? null : resultFor(m.k));
    var mine = !!res && !opts.locked;
    host.innerHTML = ''; host.classList.add('mc'); host.style.setProperty('--mc', m.c);
    var face = 'front';
    if (opts.title) host.appendChild(el('p', 'mc-title', esc(opts.title)));
    var stage = el('div', 'mc-stage');
    var flip = el('button', 'mc-flip'); flip.type = 'button';
    flip.setAttribute('aria-label', m.n + ' 카드. 누르면 뒷면의 ' + (mine ? '내 결과' : '예시 결과') + '가 보입니다');
    var inner = el('div', 'mc-flip__in');
    var fF = el('div', 'mc-face mc-face--front'), fB = el('div', 'mc-face mc-face--back');
    var iF = new Image(), iB = new Image(); iF.width = iB.width = 1080; iF.height = iB.height = 1920;
    iF.alt = m.n + ' 카드 앞면. ' + m.char; iB.alt = m.n + ' 카드 뒷면. ' + (mine ? '내 진단 결과' : '예시 결과');
    iF.src = src(m.k, 'front'); iB.src = src(m.k, 'back-base');
    renderBack(m.k, mine ? res : null, { sample: !mine }).then(function (cv) { iB.src = cv.toDataURL('image/jpeg', .9); }).catch(function () {});
    fF.appendChild(iF); fB.appendChild(iB); inner.appendChild(fF); inner.appendChild(fB); flip.appendChild(inner); stage.appendChild(flip);
    if (opts.isNew) stage.appendChild(el('span', 'mc-new', 'NEW'));
    if (!mine) stage.appendChild(el('span', 'mc-sample', '뒷면은 예시'));
    host.appendChild(stage);
    host.appendChild(el('p', 'mc-hint', mine ? '카드를 누르면 뒷면에 내 결과가 보입니다' : '카드를 누르면 뒷면의 예시 결과가 보입니다'));
    var acts = el('div', 'mc-acts');
    if (!mine) {
      var go; if (opts.onGo) { go = el('button', 'btn-go mc-act', '4분 진단하고 내 카드 받기'); go.type = 'button'; go.addEventListener('click', opts.onGo); } else { go = el('a', 'btn-go mc-act', '4분 진단하고 내 카드 받기'); go.href = '/diagnosis/minds/'; } acts.appendChild(go);
    } else {
      var dl = el('button', 'btn-go mc-act', '내 카드 받기'), ig = el('button', 'btn-dark mc-act', '인스타그램에 앞면 올리기'), th = el('button', 'btn-dark mc-act', '스레드에 올리기'), cp = el('button', 'btn-ghost mc-act', '캡션 복사');
      dl.type = ig.type = th.type = cp.type = 'button';
      acts.appendChild(dl); acts.appendChild(ig); acts.appendChild(th); acts.appendChild(cp);
      dl.addEventListener('click', function () { myCard(m.k, res).then(function (b) { saveBlob(b, '6minds-' + m.k + '-mycard.png'); toast('앞면과 내 결과 뒷면을 한 장으로 저장했습니다'); }); });
      ig.addEventListener('click', function () { share(m).then(toast); });
      th.addEventListener('click', function () { toast(threads(m)); });
      cp.addEventListener('click', function () { copyText(caption(m)).then(function () { toast('캡션을 복사했습니다'); }); });
    }
    host.appendChild(acts);
    host.appendChild(el('p', 'mc-note', opts.sub || (mine
      ? '뒷면에는 <b>내 에너지 총량, 여섯 마음 배분, 이번 주 줄일 마음과 늘릴 마음</b>이 들어 있습니다. 인스타그램·스레드에는 <b>앞면만</b> 올라가고, 뒷면은 「내 카드 받기」로 내 기기에만 저장됩니다.'
      : (opts.locked ? '아직 받지 못한 카드입니다. ' + esc(m.hint) + '에 진단하면 이 카드를 받습니다. ' : '') + '뒷면은 예시입니다. 진단하면 같은 자리에 <b>내 에너지 총량, 여섯 마음 배분, 이번 주 줄일 마음과 늘릴 마음</b>이 들어간 나만의 뒷면을 받습니다.')));
    flip.addEventListener('click', function () { face = face === 'front' ? 'back' : 'front'; flip.classList.toggle('is-back', face === 'back'); });
  }

  // ---------- collection grid ----------
  // opts: { have:[k...], onPick(k), current:k, viewLocked }
  function collection(host, opts) {
    opts = opts || {};
    var have = opts.have || collected();
    host.innerHTML = ''; host.classList.add('mc-col');
    host.appendChild(el('div', 'mc-col__h', '<b>마음 카드 컬렉션</b><span>' + have.length + ' / 6</span>'));
    var bar = el('div', 'mc-col__bar'); var fill = el('i'); fill.style.width = Math.round(have.length / 6 * 100) + '%'; bar.appendChild(fill); host.appendChild(bar);
    var g = el('div', 'mc-col__g');
    MINDS.forEach(function (m) {
      var got = have.indexOf(m.k) >= 0;
      var b = el('button', 'mc-col__c' + (got ? ' is-got' : ' is-locked') + (opts.current === m.k ? ' is-cur' : ''));
      b.type = 'button'; b.style.setProperty('--mc', m.c);
      b.innerHTML = '<span class="mc-col__img"><img src="' + thumb(m.k) + '" width="360" height="640" alt="" loading="lazy"></span><b>' + esc(m.char) + '</b><small>' + (got ? '받음' : '아직') + '</small>';
      b.setAttribute('aria-label', m.char + ' 카드, ' + (got ? '받음' : '아직 받지 못함'));
      b.addEventListener('click', function () { if (got || opts.viewLocked) { if (opts.onPick) opts.onPick(m.k); } else { toast(m.char + ' 카드는 ' + m.hint + '에 진단하면 받습니다'); } });
      g.appendChild(b);
    });
    host.appendChild(g);
    var missing = MINDS.filter(function (m) { return have.indexOf(m.k) < 0; });
    if (have.length) {
      var keep = el('div', 'mc-keep', '<b>내 카드 지키기</b><p>로그인이 없어서 카드와 결과는 이 브라우저에만 남습니다. 아래 링크를 카카오톡 「나에게 보내기」나 메모에 붙여 두면, 다른 기기나 다른 브라우저에서도 그 링크를 눌러 카드와 기록을 그대로 되살릴 수 있습니다.</p>');
      var row = el('div', 'mc-keep__row'); var lk = el('button', 'btn-go mc-act', '지키기 링크 복사'), rs = el('button', 'btn-ghost mc-act', '링크로 되살리기'); lk.type = rs.type = 'button'; row.appendChild(lk); row.appendChild(rs); keep.appendChild(row);
      lk.addEventListener('click', function () { copyText(backupLink()).then(function () { toast('지키기 링크를 복사했습니다. 나에게 보내기로 보관하세요'); }); });
      rs.addEventListener('click', function () { var v = prompt('지키기 링크를 붙여 넣으세요'); if (!v) return; var n = restoreFrom(v.trim()); toast(n ? '되살렸습니다. 새로 고침하면 반영됩니다' : '되살릴 것이 없거나 링크가 맞지 않습니다'); if (n) setTimeout(function () { location.reload(); }, 900); });
      host.appendChild(keep);
    }
    host.appendChild(el('p', 'mc-col__f', have.length >= 6 ? '여섯 장을 다 받았습니다. 여섯 마음을 한 번씩 가장 많이 써 본 사람만 받는 세트입니다.' : '진단 한 번에 카드 한 장을 받습니다. 그 2주 동안 내가 가장 많이 쓴 마음의 카드입니다. 다음 카드 <b>' + esc(missing[0].char) + '</b>는 ' + esc(missing[0].hint) + '에 진단하면 받습니다.'));
  }

  window.NWCards = { card: card, collection: collection, collected: collected, collect: collect, backfill: backfill, compute: compute, topOf: topOf, quad: quad, QUAD: QUAD, resultFor: resultFor, renderBack: renderBack, backupLink: backupLink, restoreFrom: restoreFrom, restoreFromUrl: restoreFromUrl, MINDS: MINDS, HASH: HASH };
})();
