/* mind-cards.js — 6 MINDS 마음 카드: 한 장 뷰어(앞면 탭 → 뒷면 회전), 한 파일 다운로드, 인스타그램 공유, 6장 컬렉션
   개인 결과(총량·배분)는 어디에도 싣지 않습니다. 밖으로 나가는 이미지는 마음 카드뿐입니다.
   window.NWCards = { card(host, opts), collection(host, opts), collected(), collect(k), backfill(hist, topOf) } */
(function () {
  'use strict';
  var HASH = '#네다바웨이 #식스마인드 #6MINDS';
  var LINK = 'nedabah.org/minds';
  var KEY = 'nw:minds:cards';
  var MINDS = [
    { k: 'explorer', n: '탐험하는 마음', en: 'Explorer', c: '#FF6B3D', hint: '처음 해 보는 일이 가장 많았던 2주' },
    { k: 'maker', n: '만드는 마음', en: 'Maker', c: '#FFC857', hint: '무언가를 끝까지 만든 날이 가장 많았던 2주' },
    { k: 'connector', n: '연결하는 마음', en: 'Connector', c: '#3B82F6', hint: '속마음을 나눈 대화가 가장 많았던 2주' },
    { k: 'supporter', n: '돕는 마음', en: 'Supporter', c: '#10B981', hint: '누군가를 도운 날이 가장 많았던 2주' },
    { k: 'thinker', n: '생각하는 마음', en: 'Thinker', c: '#8B5CF6', hint: '하루를 돌아보고 정리한 날이 가장 많았던 2주' },
    { k: 'enjoyer', n: '즐기는 마음', en: 'Enjoyer', c: '#F472B6', hint: '이유 없이 좋았던 시간이 가장 많았던 2주' }
  ];
  function mind(k) { for (var i = 0; i < MINDS.length; i++) if (MINDS[i].k === k) return MINDS[i]; return null; }
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function el(tag, cls, html) { var e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; }
  function toast(msg) { var t = document.querySelector('.mc-toast'); if (!t) { t = el('p', 'mc-toast'); t.setAttribute('role', 'status'); document.body.appendChild(t); } t.textContent = msg; t.classList.add('is-on'); clearTimeout(t._h); t._h = setTimeout(function () { t.classList.remove('is-on'); }, 2800); }
  function src(k, face) { return '/assets/cards/mind-' + k + '-' + face + '.png'; }
  function thumb(k, face) { return '/assets/cards/thumb/mind-' + k + '-' + (face || 'front') + '.jpg'; }

  // ---------- collection storage ----------
  function collected() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(function (k) { return mind(k); }) : []; } catch (e) { return []; } }
  function collect(k) { var s = collected(); var isNew = s.indexOf(k) < 0; if (isNew) { s.push(k); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} } return isNew; }
  // 이전 결과 기록에서 가장 많이 쓴 마음을 되살려 카드로 인정 (topOf: answers → mind key)
  function backfill(hist, topOf) { (hist || []).forEach(function (h) { try { var k = topOf(h.a); if (k) collect(k); } catch (e) {} }); return collected(); }

  // ---------- share / download ----------
  function blobOf(url) { return fetch(url).then(function (r) { return r.blob(); }); }
  function download(url, name) { return blobOf(url).then(function (b) { var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); }); }
  function copyText(t) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); return new Promise(function (res) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); res(); }); }
  function caption(m) {
    var count = collected().length;
    return '네다바웨이 6 MINDS로 요즘 내 에너지 총량과 흐름을 봤어요. 이번 카드는 「' + m.n + '」. 여섯 마음 카드 ' + count + '/6 모으는 중\n' + HASH + '\n' + LINK;
  }
  function share(m) {
    var text = caption(m);
    return blobOf(src(m.k, 'front')).then(function (b) {
      var file = new File([b], '6minds-' + m.k + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] }) && navigator.share) {
        return navigator.share({ files: [file], title: '6 MINDS · ' + m.n, text: text }).then(function () { return '공유 창을 열었습니다. 인스타그램을 고르고 캡션을 붙여 주세요'; }).catch(function (e) { if (e && e.name === 'AbortError') return '공유를 취소했습니다'; return fallback(); });
      }
      return fallback();
    });
    function fallback() { return copyText(text).then(function () { return download(src(m.k, 'front'), '6minds-' + m.k + '.png'); }).then(function () { return '카드를 저장하고 캡션을 복사했습니다. 인스타그램에서 올려 주세요'; }); }
  }

  // ---------- single card viewer ----------
  // opts: { k, title, sub, isNew }
  function card(host, opts) {
    var m = mind(opts.k); if (!m) return;
    host.innerHTML = ''; host.classList.add('mc'); host.style.setProperty('--mc', m.c);
    var face = 'front';
    if (opts.title) host.appendChild(el('p', 'mc-title', esc(opts.title)));
    var stage = el('div', 'mc-stage');
    var flip = el('button', 'mc-flip'); flip.type = 'button'; flip.setAttribute('aria-label', m.n + ' 카드, 누르면 뒷면으로 돌아갑니다');
    var inner = el('div', 'mc-flip__in');
    var fF = el('div', 'mc-face mc-face--front'), fB = el('div', 'mc-face mc-face--back');
    var iF = new Image(), iB = new Image(); iF.width = iB.width = 1080; iF.height = iB.height = 1920; iF.alt = m.n + ' 카드 앞면'; iB.alt = m.n + ' 카드 뒷면';
    iF.src = src(m.k, 'front'); iB.src = src(m.k, 'back');
    fF.appendChild(iF); fB.appendChild(iB); inner.appendChild(fF); inner.appendChild(fB); flip.appendChild(inner); stage.appendChild(flip);
    if (opts.isNew) stage.appendChild(el('span', 'mc-new', 'NEW'));
    var hint = el('p', 'mc-hint', '카드를 누르면 뒷면으로 돌아갑니다');
    var acts = el('div', 'mc-acts');
    var ig = el('button', 'btn-dark mc-act', '인스타그램에 올리기'), dl = el('button', 'btn-go mc-act', '카드 받기'), cp = el('button', 'btn-ghost mc-act', '캡션 복사');
    ig.type = dl.type = cp.type = 'button';
    if (opts.locked) { var go = el('a', 'btn-dark mc-act', '진단으로 이 카드 열기'); go.href = '/diagnosis/minds/'; acts.appendChild(go); }
    else { acts.appendChild(ig); acts.appendChild(dl); acts.appendChild(cp); }
    var note = el('p', 'mc-note', opts.sub || (opts.locked ? ('아직 모으지 못한 카드입니다. ' + esc(m.hint) + '에 진단하면 열리고, 그때 받기와 인스타그램 올리기가 됩니다.') : '인스타그램에는 <b>마음 카드만</b> 올라갑니다. 내 총량과 배분은 이 화면에만 남고 밖으로 나가지 않습니다. 캡션에 <b>' + HASH + '</b>를 붙이면 같은 카드를 모으는 사람들과 이어집니다.'));
    host.appendChild(stage); host.appendChild(hint); host.appendChild(acts); host.appendChild(note);
    flip.addEventListener('click', function () { face = face === 'front' ? 'back' : 'front'; flip.classList.toggle('is-back', face === 'back'); });
    dl.addEventListener('click', function () { download(src(m.k, 'both'), '6minds-' + m.k + '-card.png').then(function () { toast(m.n + ' 카드를 앞·뒤 한 장으로 저장했습니다'); }); });
    ig.addEventListener('click', function () { share(m).then(toast); });
    cp.addEventListener('click', function () { copyText(caption(m)).then(function () { toast('캡션을 복사했습니다'); }); });
  }

  // ---------- collection grid ----------
  // opts: { have:[k...], onPick(k), current:k }
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
      b.innerHTML = '<span class="mc-col__img"><img src="' + thumb(m.k) + '" width="360" height="640" alt="" loading="lazy"></span><b>' + esc(m.n) + '</b><small>' + (got ? '모았음' : '아직') + '</small>';
      b.setAttribute('aria-label', m.n + (got ? ' 카드, 모았음' : ' 카드, 아직 모으지 못함'));
      b.addEventListener('click', function () { if (got || opts.viewLocked) { if (opts.onPick) opts.onPick(m.k); } else { toast(m.n + ' 카드는 ' + m.hint + '에 진단하면 열립니다'); } });
      g.appendChild(b);
    });
    host.appendChild(g);
    var missing = MINDS.filter(function (m) { return have.indexOf(m.k) < 0; });
    host.appendChild(el('p', 'mc-col__f', have.length >= 6 ? '여섯 장을 다 모았습니다. 여섯 마음을 고루 살아 본 사람만 받는 세트입니다.' : '카드는 사는 방식으로 모읍니다. 진단 한 번에, 그때 가장 많이 쓴 마음 카드 한 장. 다음 카드는 <b>' + esc(missing[0].n) + '</b>. ' + esc(missing[0].hint) + '에 다시 진단해 보세요.'));
  }

  window.NWCards = { card: card, collection: collection, collected: collected, collect: collect, backfill: backfill, MINDS: MINDS, HASH: HASH };
})();
