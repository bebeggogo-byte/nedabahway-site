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

  // ---------- persistence without login ----------
  // (1) ask the browser to keep this origin's storage (skips eviction under pressure; Safari home-screen apps are exempt from the 7-day rule)
  function persist() { try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {}); } catch (e) {} }
  // (2) answers <-> 'M' + 10 base36 chars (same scheme as the diagnosis compare code)
  function encA(a) { var n = 0n; for (var i = 0; i < 15; i++) { var v = a[i]; if (i < 12 && i % 2 === 1) v = v + 2; n = n * 5n + BigInt(v); } var t = n.toString(36).toUpperCase(); while (t.length < 10) t = '0' + t; return 'M' + t; }
  function decA(str) { if (!/^M[0-9A-Z]{10}$/.test(str)) return null; var n = 0n, t = str.slice(1).toLowerCase(); for (var i = 0; i < t.length; i++) n = n * 36n + BigInt(parseInt(t[i], 36)); var a = []; for (var j = 14; j >= 0; j--) { var v = Number(n % 5n); n = n / 5n; if (j < 12 && j % 2 === 1) v = v - 2; a[j] = v; } return n === 0n ? a : null; }
  function diagLoad() { try { return JSON.parse(localStorage.getItem('nw:diag:minds') || 'null'); } catch (e) { return null; } }
  function diagSave(o) { try { localStorage.setItem('nw:diag:minds', JSON.stringify(o)); } catch (e) {} }
  // (3) backup link: cards as a 6-bit mask + history as Mcode+days, e.g. /minds/?k=1B&h=M0004DWJYXW.KQ3F
  function backupLink() {
    var mask = 0; collected().forEach(function (k) { var i = MINDS.map(function (m) { return m.k; }).indexOf(k); if (i >= 0) mask |= (1 << i); });
    var st = diagLoad() || {}; var hist = (st.hist || []).filter(function (h) { return h && h.a && h.a.length === 15; }).slice(-6);
    var h = hist.map(function (x) { var d = Math.max(0, Math.round(new Date(x.at).getTime() / 86400000)); return encA(x.a) + d.toString(36).toUpperCase(); }).join('.');
    return 'https://www.nedabah.org/minds/?k=' + mask.toString(36).toUpperCase() + (h ? '&h=' + h : '');
  }
  function shortBackup() { var mask = 0; collected().forEach(function (k) { var i = MINDS.map(function (m) { return m.k; }).indexOf(k); if (i >= 0) mask |= (1 << i); }); return 'nedabah.org/minds/?k=' + mask.toString(36).toUpperCase(); }
  // (4) restore from a pasted link or the current URL; merges, never overwrites
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

  // ---------- collection storage ----------
  function collected() { try { var v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v.filter(function (k) { return mind(k); }) : []; } catch (e) { return []; } }
  function collect(k) { var s = collected(); var isNew = s.indexOf(k) < 0; if (isNew) { s.push(k); try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {} persist(); } return isNew; }
  // 이전 결과 기록에서 가장 많이 쓴 마음을 되살려 카드로 인정 (topOf: answers → mind key)
  function backfill(hist, topOf) { (hist || []).forEach(function (h) { try { var k = topOf(h.a); if (k) collect(k); } catch (e) {} }); return collected(); }

  // ---------- share / download ----------
  function blobOf(url) { return fetch(url).then(function (r) { return r.blob(); }); }
  function download(url, name) { return blobOf(url).then(function (b) { var u = URL.createObjectURL(b); var a = document.createElement('a'); a.href = u; a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(u); a.remove(); }, 1500); }); }
  function copyText(t) { if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t); return new Promise(function (res) { var ta = document.createElement('textarea'); ta.value = t; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) {} ta.remove(); res(); }); }
  function caption(m) {
    var count = collected().length;
    return '네다바웨이 6 MINDS로 요즘 내 에너지 총량과 흐름을 봤어요. 이번 카드는 「' + m.n + '」. 여섯 마음 카드 ' + count + '/6 모으는 중\n' + HASH + '\n' + shortBackup();
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

  function threads(m) { var t = '요즘 나는 「' + m.n + '」을 가장 많이 쓰고 있대요. 당신은 어느 마음을 가장 많이 쓰고 있나요? 4분 진단 → ' + shortBackup().replace('/minds/?k=', '/diagnosis/minds/#') + '\n' + HASH; window.open('https://www.threads.net/intent/post?text=' + encodeURIComponent(t), '_blank', 'noopener'); return '스레드 글쓰기를 열었습니다. 카드 이미지는 「카드 받기」로 저장해 붙이세요'; }

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
    var ig = el('button', 'btn-dark mc-act', '인스타그램에 올리기'), th = el('button', 'btn-dark mc-act', '스레드에 올리기'), dl = el('button', 'btn-go mc-act', '카드 받기'), cp = el('button', 'btn-ghost mc-act', '캡션 복사');
    ig.type = th.type = dl.type = cp.type = 'button';
    if (opts.locked) { var go = el('a', 'btn-dark mc-act', '진단으로 이 카드 열기'); go.href = '/diagnosis/minds/'; acts.appendChild(go); }
    else { acts.appendChild(ig); acts.appendChild(th); acts.appendChild(dl); acts.appendChild(cp); }
    var note = el('p', 'mc-note', opts.sub || (opts.locked ? ('아직 모으지 못한 카드입니다. ' + esc(m.hint) + '에 진단하면 열리고, 그때 받기와 인스타그램 올리기가 됩니다.') : '인스타그램에는 <b>마음 카드만</b> 올라갑니다. 내 총량과 배분은 이 화면에만 남고 밖으로 나가지 않습니다. 캡션에 <b>' + HASH + '</b>를 붙이면 같은 카드를 모으는 사람들과 이어집니다.'));
    host.appendChild(stage); host.appendChild(hint); host.appendChild(acts); host.appendChild(note);
    flip.addEventListener('click', function () { face = face === 'front' ? 'back' : 'front'; flip.classList.toggle('is-back', face === 'back'); });
    dl.addEventListener('click', function () { download(src(m.k, 'both'), '6minds-' + m.k + '-card.png').then(function () { toast(m.n + ' 카드를 앞·뒤 한 장으로 저장했습니다'); }); });
    ig.addEventListener('click', function () { share(m).then(toast); });
    th.addEventListener('click', function () { toast(threads(m)); });
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
    if (have.length) {
      var keep = el('div', 'mc-keep', '<b>내 카드 지키기</b><p>로그인이 없어서 카드는 이 브라우저에만 남습니다. 아래 링크를 카카오톡 「나에게 보내기」나 메모에 붙여 두면, 어느 기기·어느 브라우저에서든 그 링크를 눌러 카드와 기록을 그대로 되살립니다. 인스타그램 캡션에도 같은 링크가 들어가니 내 게시물이 곧 백업입니다.</p>');
      var row = el('div', 'mc-keep__row'); var lk = el('button', 'btn-go mc-act', '지키기 링크 복사'), rs = el('button', 'btn-ghost mc-act', '링크로 되살리기'); lk.type = rs.type = 'button'; row.appendChild(lk); row.appendChild(rs); keep.appendChild(row);
      lk.addEventListener('click', function () { copyText(backupLink()).then(function () { toast('지키기 링크를 복사했습니다. 나에게 보내기로 보관하세요'); }); });
      rs.addEventListener('click', function () { var v = prompt('지키기 링크를 붙여 넣으세요'); if (!v) return; var n = restoreFrom(v.trim()); toast(n ? '되살렸습니다. 새로 고침하면 반영됩니다' : '되살릴 것이 없거나 링크가 맞지 않습니다'); if (n) setTimeout(function () { location.reload(); }, 900); });
      host.appendChild(keep);
    }
    host.appendChild(el('p', 'mc-col__f', have.length >= 6 ? '여섯 장을 다 모았습니다. 여섯 마음을 고루 살아 본 사람만 받는 세트입니다.' : '카드는 사는 방식으로 모읍니다. 진단 한 번에, 그때 가장 많이 쓴 마음 카드 한 장. 다음 카드는 <b>' + esc(missing[0].n) + '</b>. ' + esc(missing[0].hint) + '에 다시 진단해 보세요.'));
  }

  window.NWCards = { card: card, collection: collection, collected: collected, collect: collect, backfill: backfill, backupLink: backupLink, restoreFrom: restoreFrom, restoreFromUrl: restoreFromUrl, MINDS: MINDS, HASH: HASH };
})();
