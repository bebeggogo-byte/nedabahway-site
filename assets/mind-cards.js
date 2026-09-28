/* mind-cards.js — 6 MINDS 카드 뷰어(앞·뒷면 뒤집기, 저장, 기기 공유, 해시태그) + 개인 결과 카드(캔버스)
   Used by /diagnosis/minds/ (result section ⑩) and /minds/#cards.
   window.NWCards = { mount(el, opts), resultCard(data) } */
(function () {
  'use strict';
  var HASH = '#네다바웨이 #식스마인드 #6MINDS';
  var SITE = 'https://www.nedabah.org';
  var PAPER = '#f1ede5', CARD = '#fbf9f4', INK = '#1b1b1b', MUTE = '#5c5750', BODY = '#343230', LINE = '#cec7ba';
  var FONT = '"Pretendard Variable", Pretendard, "Apple SD Gothic Neo", "Malgun Gothic", system-ui, sans-serif';

  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function hex2rgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]; return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
  function mix(a, b, t) { var A = hex2rgb(a), B = hex2rgb(b); return 'rgb(' + A.map(function (v, i) { return Math.round(v + (B[i] - v) * t); }).join(',') + ')'; }
  function toast(host, msg) { var t = host.querySelector('.mc-toast'); if (!t) { t = el('p', 'mc-toast'); t.setAttribute('role', 'status'); host.appendChild(t); } t.textContent = msg; t.classList.add('is-on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('is-on'); }, 2600); }

  // ---------- sources → blob / url ----------
  function srcUrl(src) { return (src && src.tagName === 'CANVAS') ? src.toDataURL('image/png') : src; }
  function srcBlob(src) {
    if (src && src.tagName === 'CANVAS') return new Promise(function (res) { src.toBlob(res, 'image/png'); });
    return fetch(src).then(function (r) { return r.blob(); });
  }
  function download(src, name) {
    return srcBlob(src).then(function (b) { var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); });
  }
  function copyText(t) {
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    return new Promise(function (res) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); res(); });
  }

  // ---------- viewer ----------
  // opts.cards: [{id, label, name, color, front, back, file}]  front/back: url or canvas
  // opts.caption: share text (hashtags appended)
  function mount(host, opts) {
    var cards = opts.cards, cur = 0, face = 'front';
    host.innerHTML = '';
    host.classList.add('mc');
    var tabs = el('div', 'mc-tabs'); tabs.setAttribute('role', 'tablist');
    cards.forEach(function (c, i) {
      var b = el('button', 'mc-tab', '<span>' + esc(c.label) + '</span><b>' + esc(c.name) + '</b>');
      b.type = 'button'; b.style.setProperty('--mc', c.color); b.setAttribute('role', 'tab'); b.setAttribute('aria-selected', i === 0 ? 'true' : 'false');
      b.addEventListener('click', function () { cur = i; face = 'front'; paint(); });
      tabs.appendChild(b);
    });
    var stage = el('div', 'mc-stage');
    var flip = el('button', 'mc-flip'); flip.type = 'button'; flip.setAttribute('aria-label', '카드 뒤집기');
    var inner = el('div', 'mc-flip__in');
    var fF = el('div', 'mc-face mc-face--front'), fB = el('div', 'mc-face mc-face--back');
    var imgF = new Image(), imgB = new Image(); imgF.width = 1080; imgF.height = 1920; imgB.width = 1080; imgB.height = 1920; imgF.alt = '카드 앞면'; imgB.alt = '카드 뒷면';
    fF.appendChild(imgF); fB.appendChild(imgB); inner.appendChild(fF); inner.appendChild(fB); flip.appendChild(inner); stage.appendChild(flip);
    var hint = el('p', 'mc-hint', '카드를 누르면 뒤집힙니다');
    var seg = el('div', 'mc-seg');
    var bFront = el('button', 'mc-seg__b is-on', '앞면'), bBack = el('button', 'mc-seg__b', '뒷면'); bFront.type = bBack.type = 'button';
    seg.appendChild(bFront); seg.appendChild(bBack);
    var acts = el('div', 'mc-acts');
    var saveF = el('button', 'btn-go mc-act', '앞면 저장'), saveB = el('button', 'btn-go mc-act', '뒷면 저장'), share = el('button', 'btn-dark mc-act', '공유하기'), tag = el('button', 'btn-ghost mc-act', '해시태그 복사');
    [saveF, saveB, share, tag].forEach(function (b) { b.type = 'button'; acts.appendChild(b); });
    var note = el('p', 'mc-note', '공유하기를 누르면 앞·뒷면 두 장이 함께 넘어갑니다. 인스타그램에 올릴 때 캡션에 <b>' + HASH + '</b>를 붙여 주세요. 이 태그로 검색하면 누구나 여섯 마음 카드를 볼 수 있습니다.');
    host.appendChild(tabs); host.appendChild(stage); host.appendChild(hint); host.appendChild(seg); host.appendChild(acts); host.appendChild(note);

    function card() { return cards[cur]; }
    function paint() {
      var c = card();
      imgF.src = srcUrl(c.front); imgB.src = srcUrl(c.back);
      stage.style.setProperty('--mc', c.color);
      flip.classList.toggle('is-back', face === 'back');
      bFront.classList.toggle('is-on', face === 'front'); bBack.classList.toggle('is-on', face === 'back');
      tabs.querySelectorAll('.mc-tab').forEach(function (t, i) { t.classList.toggle('is-on', i === cur); t.setAttribute('aria-selected', i === cur ? 'true' : 'false'); });
      saveF.textContent = c.name + ' 앞면 저장'; saveB.textContent = c.name + ' 뒷면 저장';
    }
    flip.addEventListener('click', function () { face = face === 'front' ? 'back' : 'front'; paint(); });
    bFront.addEventListener('click', function () { face = 'front'; paint(); });
    bBack.addEventListener('click', function () { face = 'back'; paint(); });
    saveF.addEventListener('click', function () { download(card().front, card().file + '-front.png').then(function () { toast(host, '앞면을 저장했습니다'); }); });
    saveB.addEventListener('click', function () { download(card().back, card().file + '-back.png').then(function () { toast(host, '뒷면을 저장했습니다'); }); });
    tag.addEventListener('click', function () { copyText(captionOf(card())).then(function () { toast(host, '캡션과 해시태그를 복사했습니다'); }); });
    share.addEventListener('click', function () { shareCard(card()).then(function (how) { toast(host, how); }); });
    function captionOf(c) { return (opts.caption ? opts.caption + ' · ' : '') + c.name + ' ' + HASH + '\n' + (opts.url || SITE + '/minds/'); }
    function shareCard(c) {
      return Promise.all([srcBlob(c.front), srcBlob(c.back)]).then(function (bl) {
        var files = [new File([bl[0]], c.file + '-front.png', { type: 'image/png' }), new File([bl[1]], c.file + '-back.png', { type: 'image/png' })];
        var data = { files: files, title: '6 MINDS · ' + c.name, text: captionOf(c) };
        if (navigator.canShare && navigator.canShare({ files: files }) && navigator.share) {
          return navigator.share(data).then(function () { return '공유했습니다. 캡션에 해시태그를 붙여 주세요'; }).catch(function (e) { if (e && e.name === 'AbortError') return '공유를 취소했습니다'; return fallback(); });
        }
        return fallback();
        function fallback() { return copyText(captionOf(c)).then(function () { return download(c.front, c.file + '-front.png'); }).then(function () { return download(c.back, c.file + '-back.png'); }).then(function () { return '두 장을 저장하고 캡션을 복사했습니다. 인스타그램에서 올려 주세요'; }); }
      });
    }
    paint();
    return { select: function (i) { cur = i; face = 'front'; paint(); } };
  }

  // ---------- canvas result card ----------
  // data: {when, energy, band, minds:[{k,name,color,use,chg,quad,quadColor}], top:{k,name,color,q}, less:{name,text}, more:{name,text}, pair, sharp, pattern, code, cmpUrl}
  var CW = 1080, CH = 1920, PAD = 92;
  function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
  function fnt(w, s) { return w + ' ' + s + 'px ' + FONT; }
  function wrapText(ctx, text, maxw) {
    var out = []; String(text).split('\n').forEach(function (para) { var cur = ''; para.split(' ').forEach(function (w) { var t = (cur + ' ' + w).trim(); if (ctx.measureText(t).width <= maxw) cur = t; else { if (cur) out.push(cur); while (ctx.measureText(w).width > maxw) { var k = w.length; while (k > 1 && ctx.measureText(w.slice(0, k)).width > maxw) k--; out.push(w.slice(0, k)); w = w.slice(k); } cur = w; } }); out.push(cur); });
    return out;
  }
  function par(ctx, text, x, y, maxw, lh) { wrapText(ctx, text, maxw).forEach(function (l) { ctx.fillText(l, x, y); y += lh; }); return y; }
  function parH(ctx, text, maxw, lh) { return wrapText(ctx, text, maxw).length * lh; }

  function frame(ctx, color) {
    ctx.fillStyle = PAPER; ctx.fillRect(0, 0, CW, CH);
    // foil band
    var g = ctx.createLinearGradient(0, 0, CW, CH);
    g.addColorStop(0, color); g.addColorStop(.45, mix(color, '#ffffff', .55)); g.addColorStop(1, mix(color, '#1c1a18', .28));
    rr(ctx, 18, 18, CW - 36, CH - 36, 64); ctx.fillStyle = g; ctx.fill();
    // light streaks
    ctx.save(); rr(ctx, 18, 18, CW - 36, CH - 36, 64); ctx.clip();
    for (var i = -CH; i < CW + CH; i += 120) { var s = ctx.createLinearGradient(i, 0, i + 90, 0); s.addColorStop(0, 'rgba(255,255,255,0)'); s.addColorStop(.5, 'rgba(255,255,255,.45)'); s.addColorStop(1, 'rgba(255,255,255,0)'); ctx.fillStyle = s; ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i + 90, 0); ctx.lineTo(i + 90 - CH * .6, CH); ctx.lineTo(i - CH * .6, CH); ctx.closePath(); ctx.fill(); }
    ctx.restore();
    rr(ctx, 18, 18, CW - 36, CH - 36, 64); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
    rr(ctx, 48, 48, CW - 96, CH - 96, 46); ctx.fillStyle = CARD; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = mix(color, INK, .35); ctx.stroke();
    // corner sparkles
    [[48, 48], [CW - 48, 48], [48, CH - 48], [CW - 48, CH - 48]].forEach(function (p) { star(ctx, p[0], p[1], 10, '#fff'); });
  }
  function star(ctx, cx, cy, r, fill) { ctx.beginPath(); for (var i = 0; i < 8; i++) { var a = i * Math.PI / 4, rr2 = i % 2 ? r * .32 : r; ctx.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
  function header(ctx, color, title, sub, badge) {
    ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(PAD + 34, 150, 34, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(PAD + 34, 150, 30, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = PAPER; ctx.font = fnt('800', 22); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(badge, PAD + 34, 151); ctx.textAlign = 'left'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = INK; ctx.font = fnt('900', 62); ctx.fillText(title, PAD + 88, 176);
    ctx.fillStyle = color; ctx.font = fnt('700', 26); ctx.fillText(sub, PAD + 92, 226);
  }
  function footer(ctx, color, right) {
    var y = CH - 150; ctx.strokeStyle = LINE; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(PAD, y); ctx.lineTo(CW - PAD, y); ctx.stroke();
    ctx.fillStyle = MUTE; ctx.font = fnt('600', 22); ctx.fillText('NEDABAHWAY · Different People, Bigger World', PAD, y + 46);
    ctx.fillStyle = color; ctx.font = fnt('700', 22); ctx.fillText(HASH, PAD, y + 84);
    ctx.textAlign = 'right'; ctx.fillStyle = MUTE; ctx.font = fnt('600', 20); ctx.fillText(right || 'nedabah.org/diagnosis/minds', CW - PAD, y + 84); ctx.textAlign = 'left';
  }
  function loadImg(src) { return new Promise(function (res) { var im = new Image(); im.onload = function () { res(im); }; im.onerror = function () { res(null); }; im.src = src; }); }
  function pill(ctx, x, y, text, fill, fg, size) { ctx.font = fnt('800', size); var w = ctx.measureText(text).width + 28; rr(ctx, x, y, w, size + 16, 20); ctx.fillStyle = fill; ctx.fill(); ctx.fillStyle = fg; ctx.fillText(text, x + 14, y + size + 3); return w; }

  function resultCard(d) {
    var color = d.top.color;
    var ready = (document.fonts && document.fonts.load) ? Promise.all([document.fonts.load('900 60px "Pretendard Variable"'), document.fonts.load('700 30px "Pretendard Variable"'), document.fonts.load('500 30px "Pretendard Variable"')]).catch(function () {}) : Promise.resolve();
    return ready.then(function () { return loadImg('/assets/brand/char-' + d.top.k + '.jpg'); }).then(function (av) {
      var f = document.createElement('canvas'); f.width = CW; f.height = CH; var ctx = f.getContext('2d');
      frame(ctx, color); header(ctx, color, '요즘 나의 여섯 마음', d.when + '  ·  6 MINDS 결과 카드', 'ME');
      // energy ring
      var cx = PAD + 190, cy = 470, R = 150;
      ctx.lineWidth = 34; ctx.lineCap = 'round'; ctx.strokeStyle = '#e8e2d5'; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, Math.PI * 1.5); ctx.stroke();
      var rg = ctx.createLinearGradient(cx - R, cy, cx + R, cy); rg.addColorStop(0, color); rg.addColorStop(1, mix(color, '#1b1b1b', .35));
      ctx.strokeStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, R, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.max(.02, d.energy / 100)); ctx.stroke();
      ctx.fillStyle = INK; ctx.font = fnt('900', 92); ctx.textAlign = 'center'; ctx.fillText(String(d.energy), cx, cy + 22);
      ctx.fillStyle = MUTE; ctx.font = fnt('600', 22); ctx.fillText('에너지 총량 / 100', cx, cy + 62); ctx.textAlign = 'left';
      // top mind avatar + band
      var ax = CW - PAD - 250, ay = 320, as = 250;
      ctx.save(); ctx.shadowColor = 'rgba(20,16,12,.35)'; ctx.shadowBlur = 24; ctx.shadowOffsetY = 12; ctx.beginPath(); ctx.arc(ax + as / 2, ay + as / 2, as / 2, 0, Math.PI * 2); ctx.fillStyle = mix(color, '#fff', .8); ctx.fill(); ctx.restore();
      if (av) { ctx.save(); ctx.beginPath(); ctx.arc(ax + as / 2, ay + as / 2, as / 2 - 3, 0, Math.PI * 2); ctx.clip(); ctx.drawImage(av, ax, ay, as, as); ctx.restore(); }
      ctx.lineWidth = 5; ctx.strokeStyle = INK; ctx.beginPath(); ctx.arc(ax + as / 2, ay + as / 2, as / 2, 0, Math.PI * 2); ctx.stroke();
      ctx.lineWidth = 3; ctx.strokeStyle = color; ctx.beginPath(); ctx.arc(ax + as / 2, ay + as / 2, as / 2 - 8, 0, Math.PI * 2); ctx.stroke();
      ctx.textAlign = 'center'; ctx.fillStyle = MUTE; ctx.font = fnt('600', 22); ctx.fillText('요즘 가장 많이 쓰는 마음', ax + as / 2, ay + as + 44);
      ctx.fillStyle = INK; ctx.font = fnt('800', 32); ctx.fillText(d.top.name, ax + as / 2, ay + as + 86); ctx.textAlign = 'left';
      var bwid = pill(ctx, PAD + 40, 660, d.band, INK, PAPER, 24); if (d.stats) pill(ctx, PAD + 40 + bwid + 10, 660, d.stats, '#e8e2d5', INK, 24);
      // six bars
      var y = 760; ctx.fillStyle = INK; ctx.font = fnt('900', 32); ctx.fillText('여섯 마음 배분', PAD, y); y += 30;
      ctx.fillStyle = MUTE; ctx.font = fnt('500', 22); ctx.fillText('막대 = 지난 2주 사용량 · 오른쪽 = 쓰고 난 뒤 상태와 자리', PAD, y); y += 34;
      var bw = CW - 2 * PAD - 330;
      d.minds.forEach(function (m) {
        var pct = Math.round(m.use / 4 * 100);
        ctx.fillStyle = INK; ctx.font = fnt('800', 27); ctx.fillText(m.name, PAD, y + 34);
        rr(ctx, PAD + 130, y + 8, bw, 34, 12); ctx.fillStyle = '#e8e2d5'; ctx.fill();
        if (pct > 0) { rr(ctx, PAD + 130, y + 8, Math.max(24, bw * pct / 100), 34, 12); ctx.fillStyle = m.color; ctx.fill(); }
        var fw = Math.max(24, bw * pct / 100); ctx.font = fnt('800', 22);
        if (fw + 70 > bw) { ctx.fillStyle = '#fff'; ctx.textAlign = 'right'; ctx.fillText(pct + '%', PAD + 130 + fw - 12, y + 33); ctx.textAlign = 'left'; }
        else { ctx.fillStyle = INK; ctx.fillText(pct + '%', PAD + 130 + fw + 12, y + 33); }
        var chg = m.chg >= 1 ? '충전' : (m.chg <= -1 ? '고갈' : '그대로'); var cc = m.chg >= 1 ? '#10B981' : (m.chg <= -1 ? '#E11D48' : '#9a948c');
        var px = CW - PAD - 190; var w1 = pill(ctx, px, y + 8, chg, cc, '#fff', 19); pill(ctx, px + w1 + 8, y + 8, m.quad, '#e8e2d5', INK, 19);
        y += 66;
      });
      // pattern
      y += 16; ctx.font = fnt('600', 27); var ph0 = parH(ctx, d.pattern, CW - 2 * PAD - 72, 40) + 90;
      rr(ctx, PAD, y, CW - 2 * PAD, ph0, 24); ctx.fillStyle = mix(color, '#fff', .84); ctx.fill(); rr(ctx, PAD, y, 12, ph0, 6); ctx.fillStyle = color; ctx.fill();
      ctx.fillStyle = color; ctx.font = fnt('800', 22); ctx.fillText('요즘의 패턴', PAD + 36, y + 42);
      ctx.fillStyle = INK; ctx.font = fnt('600', 27); par(ctx, d.pattern, PAD + 36, y + 86, CW - 2 * PAD - 72, 40);
      // code
      y += ph0 + 34; rr(ctx, PAD, y, CW - 2 * PAD, 96, 24); ctx.fillStyle = INK; ctx.fill();
      ctx.fillStyle = '#c8c2b6'; ctx.font = fnt('700', 20); ctx.fillText('내 코드 · 상대가 넣으면 나와 비교됩니다', PAD + 28, y + 36);
      ctx.fillStyle = PAPER; ctx.font = fnt('900', 34); ctx.fillText(d.code, PAD + 28, y + 78);
      ctx.textAlign = 'right'; ctx.fillStyle = color; ctx.font = fnt('700', 22); ctx.fillText('뒷면 QR로 바로 비교', CW - PAD - 28, y + 60); ctx.textAlign = 'left';
      footer(ctx, color);

      // ---- back ----
      var b = document.createElement('canvas'); b.width = CW; b.height = CH; ctx = b.getContext('2d');
      frame(ctx, color); header(ctx, color, '이번 주, 이렇게', d.when + '  ·  줄일 것 하나, 늘릴 것 하나', 'ME');
      y = 290;
      [['줄일 것 · ' + d.less.name, d.less.text, '#E11D48'], ['늘릴 것 · ' + d.more.name, d.more.text, '#10B981']].forEach(function (r) {
        ctx.font = fnt('600', 31); var h = parH(ctx, r[1], CW - 2 * PAD - 80, 46) + 104;
        rr(ctx, PAD, y, CW - 2 * PAD, h, 28); ctx.fillStyle = '#ece7dc'; ctx.fill(); rr(ctx, PAD, y, 12, h, 6); ctx.fillStyle = r[2]; ctx.fill();
        pill(ctx, PAD + 36, y + 24, r[0], r[2], '#fff', 22);
        ctx.fillStyle = INK; ctx.font = fnt('600', 31); par(ctx, r[1], PAD + 40, y + 104, CW - 2 * PAD - 80, 46);
        y += h + 18;
      });
      if (d.pair) { ctx.font = fnt('500', 27); var ph = parH(ctx, d.pair, CW - 2 * PAD - 72, 40) + 80; rr(ctx, PAD, y, CW - 2 * PAD, ph, 24); ctx.fillStyle = mix('#1D4ED8', '#fff', .88); ctx.fill(); ctx.fillStyle = '#1D4ED8'; ctx.font = fnt('800', 22); ctx.fillText('붙여 쓰기', PAD + 36, y + 42); ctx.fillStyle = INK; ctx.font = fnt('500', 27); par(ctx, d.pair, PAD + 36, y + 82, CW - 2 * PAD - 72, 40); y += ph + 26; }
      if (d.sharp) { ctx.fillStyle = INK; ctx.font = fnt('900', 32); ctx.fillText('자세히 보면', PAD, y + 34); rr(ctx, PAD, y + 50, 120, 8, 4); ctx.fillStyle = color; ctx.fill(); ctx.fillStyle = BODY; ctx.font = fnt('500', 27); y = par(ctx, d.sharp, PAD, y + 104, CW - 2 * PAD, 42) + 10; }
      // write-in box fills the gap, then QR + code block anchored above footer
      var qy = CH - 150 - 40 - 300, qs = 300;
      var wy0 = y + 30, wy1 = qy - 40;
      if (wy1 - wy0 >= 150) { rr(ctx, PAD, wy0, CW - 2 * PAD, wy1 - wy0, 24); ctx.lineWidth = 3; ctx.strokeStyle = mix(color, INK, .2); ctx.stroke(); ctx.fillStyle = color; ctx.font = fnt('800', 24); ctx.fillText('이번 주 나의 한 가지', PAD + 28, wy0 + 44); ctx.strokeStyle = LINE; ctx.lineWidth = 2; for (var ly = wy0 + 100; ly < wy1 - 24; ly += 52) { ctx.beginPath(); ctx.moveTo(PAD + 28, ly); ctx.lineTo(CW - PAD - 28, ly); ctx.stroke(); } }
      rr(ctx, PAD, qy, qs, qs, 24); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 4; ctx.strokeStyle = INK; ctx.stroke();
      if (window.qrcode) { try { var q = window.qrcode(0, 'M'); q.addData(d.cmpUrl); q.make(); var n = q.getModuleCount(), cs = Math.floor((qs - 40) / n), off = (qs - cs * n) / 2; ctx.fillStyle = INK; for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) if (q.isDark(r, c)) ctx.fillRect(PAD + off + c * cs, qy + off + r * cs, cs, cs); } catch (e) {} }
      var tx = PAD + qs + 40;
      ctx.fillStyle = INK; ctx.font = fnt('800', 30); ctx.fillText('이 QR을 찍으면 나와 비교됩니다', tx, qy + 48);
      ctx.fillStyle = MUTE; ctx.font = fnt('500', 24); par(ctx, '상대가 이 QR을 찍고 자기 진단을 마치면 두 사람의 여섯 마음이 나란히 나옵니다. 누가 낫다가 아니라 서로 어느 마음을 잘 쓰는지를 봅니다.', tx, qy + 96, CW - PAD - tx, 36);
      rr(ctx, tx, qy + 214, CW - PAD - tx, 70, 18); ctx.fillStyle = INK; ctx.fill();
      ctx.fillStyle = PAPER; ctx.font = fnt('900', 30); ctx.fillText(d.code, tx + 24, qy + 262);
      footer(ctx, color);
      return { front: f, back: b };
    });
  }

  window.NWCards = { mount: mount, resultCard: resultCard, HASH: HASH };
})();
