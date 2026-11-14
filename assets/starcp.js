/* STARCP essay tool — /diagnosis/starcp/
 * The essay text stays on this device (localStorage). With consent, one aggregate
 * row (word choice, counts, ratios) goes to Supabase through the starcp_submit RPC.
 * Example essays are shown read-only under each field; they never enter the inputs.
 * Course settings come from /assets/starcp/courses/<code>.json (?c=<code>).
 * Written in ES5 so it runs in older in-app webviews.
 */
(function () {
  'use strict';

  var LABELS = ['경험 정하기', '여섯 칸 쓰기', '단어 고르기', '첫 문장', '완성본'];
  var COURSE_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
  var CONSENT_KEY = 'starcp-consent-v1';
  var BLANK = { step: 1, exIdx: 0, showEx: true, sid: '', startedAt: 0, sent: '', job: '', q: '', title: '', limit: 500,
    s: '', t: '', a: '', r: '', useCP: false, c: '', p: '', values: [], strengths: [], mainV: '', mainG: '', tpl: 0, first: '', review: '', reviewSent: '' };

  var CFG = null;   // course settings
  var KEY = '';     // localStorage key for this course's draft
  var S = null;     // draft state

  function $(id) { return document.getElementById(id); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function len(x) { return (x || '').trim().length; }
  function esc(x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function uuid() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    var b = new Uint8Array(16), i, h = '';
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(b); else for (i = 0; i < 16; i++) b[i] = Math.floor(Math.random() * 256);
    b[6] = (b[6] & 0x0f) | 0x40; b[8] = (b[8] & 0x3f) | 0x80;
    for (i = 0; i < 16; i++) { h += (b[i] < 16 ? '0' : '') + b[i].toString(16); if (i === 3 || i === 5 || i === 7 || i === 9) h += '-'; }
    return h;
  }

  // ---------- Korean particles chosen by final consonant ----------
  function jong(w) { w = (w || '').trim(); if (!w) return 0; var c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return 0; return (c - 0xAC00) % 28; }
  function eul(w) { return w + (jong(w) ? '을' : '를'); }
  function euro(w) { var j = jong(w); return w + ((j === 0 || j === 8) ? '로' : '으로'); }
  function igo(w) { return w + (jong(w) ? '이고' : '고'); }

  function tplList(src) {
    src = src || S;
    var v = src.mainV || '(핵심가치)', g = src.mainG || '(강점)', e = (src.title || '').trim() || '(경험 제목)', j = (src.job || '').trim() || '(지원 직무)';
    return [
      { k: '독립 한 문장', t: '저는 ' + eul(v) + ' 먼저 생각하고, ' + euro(g) + ' 일을 끝까지 해내는 ' + j + ' 지원자입니다.' },
      { k: '독립 한 문장 (짧게)', t: '제가 일하는 기준은 ' + igo(v) + ', 제 강점은 ' + g + '입니다.' },
      { k: '상황을 섞은 한 문장', t: e + '에서 저는 ' + eul(v) + ' 지키기 위해 ' + eul(g) + ' 발휘했습니다.' }
    ];
  }
  function tplText(i) { return tplList()[i].t; }

  // ---------- derived values ----------
  function ratios() {
    var st = len(S.s) + len(S.t), ar = len(S.a) + len(S.r), cp = S.useCP ? len(S.c) + len(S.p) : 0, sum = st + ar + cp;
    if (!sum) return { st: 0, ar: 0, cp: 0, sum: 0 };
    var pst = Math.round(st / sum * 100), par = Math.round(ar / sum * 100);
    return { st: pst, ar: par, cp: Math.max(0, 100 - pst - par), sum: sum };
  }
  function body() {
    var parts = [S.s, S.t, S.a, S.r]; if (S.useCP) parts.push(S.c, S.p);
    return parts.map(function (x) { return (x || '').trim(); }).filter(Boolean).join(' ');
  }
  function fullText() { return [(S.first || '').trim(), body()].filter(Boolean).join('\n'); }
  function charCount() { return fullText().replace(/\n/g, '').length; }
  function limitOf() { return +S.limit || CFG.limit || 500; }
  function checks() {
    var f = (S.first || '').trim(), n = charCount(), lim = limitOf(), r = ratios();
    var hasKey = !!f && ((S.mainV && f.indexOf(S.mainV) >= 0) || (S.mainG && f.indexOf(S.mainG) >= 0));
    return [
      [hasKey, '첫 문장에 대표 단어가 들어 있습니다', '첫 문장에 대표 핵심가치나 강점 단어를 넣습니다 (4단계)'],
      [r.sum > 0 && r.st <= 25, '상황·과제가 전체의 25% 이하입니다 (지금 ' + r.st + '%)', '상황·과제를 각각 한 문장으로 줄입니다 (지금 ' + r.st + '%, 2단계)'],
      [/저는|제가/.test(S.a || ''), '행동 칸에 「저는」 또는 「제가」로 쓴 문장이 있습니다', '행동 칸에 내가 한 일을 「저는」으로 시작해 씁니다 (2단계)'],
      [/\d/.test(S.r || ''), '결과 칸에 숫자가 있습니다', '결과 칸에 횟수·시간·개수 가운데 숫자 하나를 넣습니다 (2단계)'],
      [n > 0 && n <= lim, '글자 수 제한 안에 있습니다 (' + n + '자)', n > lim ? '글자 수가 ' + (n - lim) + '자 넘었습니다. 상황·과제부터 줄입니다' : '아직 쓴 글이 없습니다']
    ];
  }

  // ---------- storage ----------
  function blankState() { var s = clone(BLANK); s.q = CFG.questions[0]; s.limit = CFG.limit; s.sid = uuid(); return s; }
  function load() {
    var d = lsGet(KEY), k, saved;
    if (d) {
      try {
        saved = JSON.parse(d); S = clone(BLANK);
        if (saved.example) throw new Error('old example draft');
        for (k in saved) if (Object.prototype.hasOwnProperty.call(BLANK, k)) S[k] = saved[k];
        if (!S.sid) S.sid = uuid();
        if (CFG.questions.indexOf(S.q) < 0) S.q = CFG.questions[0];
        return;
      } catch (e) { /* fall through to a blank draft */ }
    }
    S = blankState();
  }
  function save() { lsSet(KEY, JSON.stringify(S)); }
  // The first edit starts the writing-time clock.
  function own() {
    if (!S.sid) S.sid = uuid();
    if (!S.startedAt) S.startedAt = Date.now();
  }

  // ---------- rendering ----------
  function renderNav() {
    var nav = $('stepNav'); nav.innerHTML = '';
    var done = [!!(S.job.trim() && S.title.trim()), !!(len(S.a) && len(S.r)), !!(S.values.length && S.strengths.length), !!len(S.first), false];
    LABELS.forEach(function (l, i) {
      var b = document.createElement('button'); b.type = 'button';
      b.innerHTML = '<span class="n">' + (i + 1) + '</span><span class="l">' + l + '</span>';
      if (S.step === i + 1) b.setAttribute('aria-current', 'step');
      if (done[i]) b.className = 'done';
      b.onclick = function () { go(i + 1); };
      nav.appendChild(b);
    });
  }
  // Read-only examples under each field. They are never copied into the inputs.
  function exText(ex, k) {
    if (k === 'first') return tplList(ex)[ex.tpl || 0].t;
    if (k === 'values' || k === 'strengths') return (ex[k] || []).join(', ');
    if (k === 'full') return [exText(ex, 'first')].concat([ex.s, ex.t, ex.a, ex.r], ex.useCP ? [ex.c, ex.p] : []).filter(Boolean).join(' ');
    return ex[k] || '';
  }
  function renderExamples() {
    var list = CFG.examples || [], ex = list[S.exIdx] || list[0], on = !!ex && S.showEx;
    $('exBar').hidden = !ex;
    $('exText').textContent = on
      ? '칸마다 아래에 예시가 보입니다. 예시는 읽기만 하는 글이고, 내 글에는 들어가지 않습니다.'
      : '예시를 숨겼습니다.';
    $('exToggle').textContent = on ? '예시 숨기기' : '예시 보기';
    var sel = $('exPick'); sel.hidden = !(on && list.length > 1);
    if (!sel.hidden) {
      sel.innerHTML = '';
      list.forEach(function (e, i) { var o = document.createElement('option'); o.value = i; o.textContent = (e.dept || ('예시 ' + (i + 1))) + ' 예시'; sel.appendChild(o); });
      sel.value = list.indexOf(ex);
    }
    Array.prototype.forEach.call(document.querySelectorAll('[data-ex]'), function (el) {
      var t = on ? exText(ex, el.getAttribute('data-ex')) : '';
      el.hidden = !t; el.textContent = t;
    });
    $('exFull').hidden = !on;
  }
  function renderRatio() {
    var r = ratios(), h = '';
    $('bST').style.width = r.st + '%'; $('bAR').style.width = r.ar + '%'; $('bCP').style.width = r.cp + '%';
    $('lST').textContent = '상황·과제 ' + r.st + '%'; $('lAR').textContent = '행동·결과 ' + r.ar + '%'; $('lCP').textContent = '변화·실천 ' + r.cp + '%';
    if (!r.sum) h = '<span class="pill no">아직 쓴 글이 없습니다</span>';
    else {
      h += r.st <= 25 ? '<span class="pill ok">상황·과제 분량이 알맞습니다 (25% 이하)</span>' : '<span class="pill no">상황·과제가 깁니다. 각각 한 문장으로 줄입니다</span>';
      h += r.ar >= 55 ? '<span class="pill ok">행동·결과가 글의 중심입니다 (55% 이상)</span>' : '<span class="pill no">행동·결과가 짧습니다. 내가 한 일을 한 단계 더 씁니다</span>';
    }
    $('ratioPills').innerHTML = h;
    ['s', 't', 'a', 'r', 'c', 'p'].forEach(function (k) { $('c_' + k).textContent = len(S[k]) + '자'; });
    $('cpBox').hidden = !S.useCP;
  }
  function renderChips(boxId, list, key, pickedId) {
    var box = $(boxId); box.innerHTML = '';
    list.forEach(function (w) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = w;
      b.setAttribute('aria-pressed', S[key].indexOf(w) >= 0 ? 'true' : 'false');
      b.onclick = function () {
        own();
        var i = S[key].indexOf(w);
        if (i >= 0) S[key].splice(i, 1); else { if (S[key].length >= 3) S[key].shift(); S[key].push(w); }
        var mk = key === 'values' ? 'mainV' : 'mainG';
        if (S[key].indexOf(S[mk]) < 0) S[mk] = S[key][0] || '';
        save(); renderChips(boxId, list, key, pickedId); renderNav();
      };
      box.appendChild(b);
    });
    $(pickedId).innerHTML = S[key].length
      ? '고른 단어: <b>' + esc(S[key].join(', ')) + '</b> (' + S[key].length + '/3)'
      : '아직 고르지 않았습니다. 4번째를 고르면 가장 먼저 고른 단어가 빠집니다.';
  }
  function renderStep4() {
    [['mainV', 'values'], ['mainG', 'strengths']].forEach(function (p) {
      var sel = $(p[0]), o; sel.innerHTML = '';
      if (!S[p[1]].length) { o = document.createElement('option'); o.textContent = '3단계에서 먼저 고릅니다'; o.value = ''; sel.appendChild(o); }
      S[p[1]].forEach(function (w) { var op = document.createElement('option'); op.textContent = w; op.value = w; sel.appendChild(op); });
      if (S[p[1]].indexOf(S[p[0]]) < 0) S[p[0]] = S[p[1]][0] || '';
      sel.value = S[p[0]];
    });
    var box = $('tplBox'); box.innerHTML = '';
    tplList().forEach(function (t, i) {
      var l = document.createElement('label');
      if (S.tpl === i) l.className = 'sel';
      l.innerHTML = '<input type="radio" name="tpl" value="' + i + '"' + (S.tpl === i ? ' checked' : '') + '><span><small>' + t.k + '</small></span>';
      l.querySelector('span').appendChild(document.createTextNode(t.t));
      l.querySelector('input').onchange = function () { own(); S.tpl = i; S.first = tplText(i); save(); renderStep4(); renderNav(); };
      box.appendChild(l);
    });
    if (!len(S.first) && S.mainV && S.mainG) S.first = tplText(S.tpl);
    $('first').value = S.first; $('c_first').textContent = len(S.first) + '자';
  }
  function renderFinal() {
    var f = (S.first || '').trim(), b = body(), n = charCount(), lim = limitOf();
    $('out').innerHTML = (f ? '<span class="first">' + esc(f) + '</span>\n' : '') + esc(b || '2단계에서 쓴 글이 여기에 이어집니다.');
    $('meta').innerHTML = '<span>지원 직무 <b>' + esc(S.job || '미입력') + '</b></span><span>문항 <b>' + esc(S.q) + '</b></span><span>글자 수 <b>' + n + ' / ' + lim + '</b></span><span>핵심가치 <b>' + esc(S.mainV || '미선택') + '</b></span><span>강점 <b>' + esc(S.mainG || '미선택') + '</b></span>';
    $('checks').innerHTML = checks().map(function (c) {
      return '<li class="' + (c[0] ? 'ok' : 'no') + '"><span class="mk">' + (c[0] ? '통과' : '보완') + '</span><span>' + esc(c[0] ? c[1] : c[2]) + '</span></li>';
    }).join('');
    $('review').value = S.review; $('c_review').textContent = len(S.review) + ' / 100자';
  }
  function renderConsent() {
    var c = lsGet(CONSENT_KEY);
    $('consentAsk').hidden = !!c; $('consentDone').hidden = !c;
    if (c) $('consentState').textContent = c === 'yes'
      ? '통계 기록에 동의했습니다. 단어 선택과 글자 수만 남깁니다.'
      : '통계 기록에 동의하지 않았습니다. 아무것도 기록하지 않습니다.';
  }

  // ---------- Supabase (aggregate row only) ----------
  function rpc(fn, args) {
    var url = window.__SUPABASE_URL__, key = window.__SUPABASE_ANON__;
    if (!url || !key) return Promise.reject(new Error('not_configured'));
    return fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return null; });
  }
  // Called when the student reaches step 5. Sends nothing without consent, for
  // the example, or for an unfinished draft. The same draft overwrites its own row.
  function record() {
    if (lsGet(CONSENT_KEY) !== 'yes' || !S.mainV || !S.mainG || !len(S.a) || !charCount()) return;
    var r = ratios(), n = Math.min(charCount(), 5000);
    var passed = checks().filter(function (c) { return c[0]; }).length;
    var minutes = S.startedAt ? Math.min(1440, Math.max(0, Math.round((Date.now() - S.startedAt) / 60000))) : 0;
    var args = { p_session: S.sid, p_course: CFG.code, p_question: S.q, p_value: S.mainV, p_strength: S.mainG,
      p_chars: n, p_st: r.st, p_ar: r.ar, p_cp: !!S.useCP, p_checks: passed, p_minutes: minutes };
    var sig = JSON.stringify([args.p_question, args.p_value, args.p_strength, n, r.st, r.ar, args.p_cp, passed]);
    if (sig === S.sent) return;
    rpc('starcp_submit', args).then(function () { S.sent = sig; save(); }, function () { /* statistics are optional; the tool keeps working */ });
  }
  function sendReview() {
    var t = (S.review || '').trim(), m = $('reviewMsg');
    m.className = 'msg';
    if (t.length < 5) { m.className = 'msg err'; m.textContent = '5자 이상 적습니다.'; return; }
    if (t === S.reviewSent) { m.textContent = '이미 보낸 문장입니다.'; return; }
    $('sendReview').disabled = true;
    rpc('starcp_review', { p_session: S.sid, p_course: CFG.code, p_body: t.slice(0, 100) }).then(function () {
      S.reviewSent = t; save(); m.textContent = '보냈습니다. 고맙습니다.';
    }, function () {
      m.className = 'msg err'; m.textContent = '보내지 못했습니다. 인터넷 연결을 확인하고 다시 누릅니다.';
    }).then(function () { $('sendReview').disabled = false; });
  }

  // ---------- inputs ----------
  function bindInputs() {
    ['job', 'title', 's', 't', 'a', 'r', 'c', 'p', 'first', 'review'].forEach(function (k) {
      $(k).value = S[k];
      $(k).oninput = function () {
        if (k !== 'review') own();
        S[k] = this.value; save(); renderRatio(); renderNav();
        if (k === 'first') $('c_first').textContent = len(S.first) + '자';
        if (k === 'review') $('c_review').textContent = len(S.review) + ' / 100자';
      };
    });
    var q = $('q'); q.innerHTML = '';
    CFG.questions.forEach(function (t) { var o = document.createElement('option'); o.textContent = t; o.value = t; q.appendChild(o); });
    q.value = S.q; q.onchange = function () { own(); S.q = this.value; save(); };
    $('limit').value = S.limit; $('limit').oninput = function () { own(); S.limit = +this.value || CFG.limit; save(); };
    $('useCP').checked = S.useCP; $('useCP').onchange = function () { own(); S.useCP = this.checked; save(); renderRatio(); };
    $('mainV').onchange = function () { own(); S.mainV = this.value; S.first = tplText(S.tpl); save(); renderStep4(); };
    $('mainG').onchange = function () { own(); S.mainG = this.value; S.first = tplText(S.tpl); save(); renderStep4(); };
    $('refill').onclick = function () { own(); S.first = tplText(S.tpl); save(); renderStep4(); renderNav(); };
  }
  function go(n) {
    S.step = Math.min(5, Math.max(1, n)); save();
    Array.prototype.forEach.call(document.querySelectorAll('section.step'), function (s) { s.classList.toggle('on', +s.getAttribute('data-step') === S.step); });
    renderNav();
    if (S.step === 2) renderRatio();
    if (S.step === 3) { renderChips('vChips', CFG.values, 'values', 'vPicked'); renderChips('gChips', CFG.strengths, 'strengths', 'gPicked'); }
    if (S.step === 4) renderStep4();
    if (S.step === 5) { renderFinal(); record(); }
    $('prev').style.visibility = S.step === 1 ? 'hidden' : 'visible';
    $('next').textContent = S.step === 5 ? '1단계로 돌아가기' : '다음';
    $('msg').textContent = ''; $('msg').className = 'msg'; $('fallback').hidden = true;
  }
  function copy(text, okMsg) {
    function fail() {
      var fb = $('fallback'); fb.hidden = false; fb.value = text; fb.focus(); fb.select();
      $('msg').textContent = '자동 복사가 막혔습니다. 아래 칸의 글을 길게 눌러 복사합니다.';
    }
    try { navigator.clipboard.writeText(text).then(function () { $('msg').textContent = okMsg; }, fail); } catch (e) { fail(); }
  }

  // ---------- A4 sheet (print / save as PDF) ----------
  function buildSheet() {
    var rows = [['S 상황', S.s], ['T 과제', S.t], ['A 행동', S.a], ['R 결과', S.r]];
    if (S.useCP) rows.push(['C 변화', S.c], ['P 실천', S.p]);
    var sheet = $('sheet'), d = new Date();
    sheet.innerHTML =
      '<h1>자기소개서 초안</h1>' +
      '<table><tr><th>지원 직무</th><td>' + esc(S.job) + '</td><th>문항</th><td>' + esc(S.q) + '</td></tr>' +
      '<tr><th>경험</th><td>' + esc(S.title) + '</td><th>글자 수</th><td>' + charCount() + ' / ' + limitOf() + ' (공백 포함)</td></tr>' +
      '<tr><th>핵심가치</th><td>대표 ' + esc(S.mainV || '미선택') + (S.values.length ? ' · 고른 단어 ' + esc(S.values.join(', ')) : '') + '</td>' +
      '<th>강점</th><td>대표 ' + esc(S.mainG || '미선택') + (S.strengths.length ? ' · 고른 단어 ' + esc(S.strengths.join(', ')) : '') + '</td></tr></table>' +
      '<h2>완성 글</h2><div class="full"><span class="first">' + esc((S.first || '').trim()) + '</span>\n' + esc(body()) + '</div>' +
      '<h2>여섯 칸 원문</h2><table>' + rows.map(function (r) { return '<tr><th>' + r[0] + '</th><td>' + esc((r[1] || '').trim()) + '</td></tr>'; }).join('') + '</table>' +
      '<h2>자동 검사 결과</h2><ul>' + checks().map(function (c) { return '<li>[' + (c[0] ? '통과' : '보완') + '] ' + esc(c[0] ? c[1] : c[2]) + '</li>'; }).join('') + '</ul>' +
      '<p class="src">STARCP 자기소개서 작성 도구 · nedabah.org/diagnosis/starcp/ · ' + d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() + '</p>';
    // Shrink the type until the sheet fits one A4 page (297mm - 2 x 15mm margin = 267mm).
    var mm = sheet.offsetWidth / 180, maxH = 265 * mm, pt = 10.5;
    sheet.style.fontSize = pt + 'pt';
    while (sheet.scrollHeight > maxH && pt > 6) { pt -= 0.5; sheet.style.fontSize = pt + 'pt'; }
    return sheet.scrollHeight <= maxH;
  }
  function isKakao() { return /KAKAOTALK/i.test(navigator.userAgent); }
  function savePdf() {
    var fits = buildSheet(), m = $('msg');
    m.className = 'msg';
    m.textContent = (isKakao() ? '카카오톡 안에서는 인쇄 창이 열리지 않을 수 있습니다. 열리지 않으면 위의 「다른 브라우저로 열기」를 누릅니다. ' : '인쇄 창에서 「PDF로 저장」을 고릅니다. ') +
      (fits ? '' : '글이 길어 두 장으로 나뉠 수 있습니다.');
    try { window.print(); } catch (e) { m.className = 'msg err'; m.textContent = '이 브라우저에서는 인쇄 창을 열 수 없습니다. 다른 브라우저로 엽니다.'; }
  }
  function openExternal() {
    var url = location.href;
    if (/android/i.test(navigator.userAgent)) location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    else location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  }

  // ---------- start ----------
  function fetchCourse(code) {
    return fetch('/assets/starcp/courses/' + code + '.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  function start(cfg, missing) {
    CFG = cfg; KEY = 'starcp-draft-v1:' + CFG.code;
    if (CFG.name) { $('course').textContent = CFG.name; $('course').hidden = false; }
    if (missing) { $('courseMiss').hidden = false; }
    load(); bindInputs(); renderExamples(); renderConsent();
    if (!lsSet('starcp-probe', '1')) $('noStore').hidden = false;
    if (isKakao()) { $('inapp').hidden = false; $('openExt').onclick = openExternal; }

    $('consentYes').onclick = function () { lsSet(CONSENT_KEY, 'yes'); renderConsent(); if (S.step === 5) record(); };
    $('consentNo').onclick = function () { lsSet(CONSENT_KEY, 'no'); renderConsent(); };
    $('consentChange').onclick = function () { try { localStorage.removeItem(CONSENT_KEY); } catch (e) { /* ignore */ } renderConsent(); };
    $('restart').onclick = function () {
      if (!window.confirm('쓴 글을 모두 지우고 처음부터 다시 씁니다. 지운 글은 되돌릴 수 없습니다.')) return;
      var keep = { exIdx: S.exIdx, showEx: S.showEx };
      S = blankState(); S.exIdx = keep.exIdx; S.showEx = keep.showEx; save(); bindInputs(); renderExamples(); go(1);
    };
    $('exToggle').onclick = function () { S.showEx = !S.showEx; save(); renderExamples(); };
    $('exPick').onchange = function () { S.exIdx = +this.value; save(); renderExamples(); };
    $('prev').onclick = function () { go(S.step - 1); window.scrollTo(0, 0); };
    $('next').onclick = function () { go(S.step === 5 ? 1 : S.step + 1); window.scrollTo(0, 0); };
    $('copyText').onclick = function () { copy(fullText(), '글을 복사했습니다. 지원서에 붙여 넣습니다.'); };
    $('copyCoach').onclick = function () {
      copy('[자기소개서 초안]\n지원 직무: ' + S.job + '\n문항: ' + S.q + '\n경험: ' + S.title + '\n핵심가치: ' + S.values.join(', ') + ' (대표 ' + S.mainV + ')\n강점: ' + S.strengths.join(', ') + ' (대표 ' + S.mainG + ')\n글자 수: ' + charCount() + ' / ' + limitOf() + '\n\n' + fullText(),
        '코치에게 보낼 내용을 복사했습니다. 카카오톡이나 메일에 붙여 넣습니다.');
    };
    $('savePdf').onclick = savePdf;
    $('sendReview').onclick = sendReview;
    $('app').hidden = false; $('loading').hidden = true;
    go(S.step || 1);
  }
  function init() {
    var m = /[?&]c=([^&#]*)/.exec(location.search), code = m ? decodeURIComponent(m[1]).toLowerCase() : '';
    var want = COURSE_RE.test(code) ? code : '';
    (want ? fetchCourse(want).then(function (c) { start(c, false); }, function () { return fetchCourse('default').then(function (c) { start(c, true); }); })
          : fetchCourse('default').then(function (c) { start(c, !!code); }))
      .catch(function () { $('loading').textContent = '설정을 불러오지 못했습니다. 인터넷 연결을 확인하고 화면을 새로 고칩니다.'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
