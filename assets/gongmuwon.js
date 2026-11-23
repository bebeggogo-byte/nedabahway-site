/* Civil-service interview answer note — /edu/gongmuwon/
 * Seven steps: start -> who we work for -> pick experiences (3 or 5) -> write each
 * experience in six sentences -> keywords -> resolution -> answer note for the
 * seven basic questions. The tool never writes sentences for the student: it only
 * places the student's own words into the frames from the course design.
 * Drafts live in localStorage. With consent and a registered class code (?c=),
 * the draft (with the student's name) is also sent to the coach screen via gm_save RPC.
 * Written in ES5 for older in-app webviews.
 */
(function () {
  'use strict';

  var D = null, S = null, KEY = 'gm-note-v1', CLASS = '', CLASS_OK = false;
  var CODE_RE = /^[a-z0-9][a-z0-9-]{1,39}$/;
  var STEPS = [
    ['시작', '시작'], ['누구를 위해', '누구를<br>위해'], ['경험 고르기', '경험<br>고르기'], ['경험 쓰기', '경험<br>쓰기'],
    ['키워드', '키워드'], ['각오와 지원동기', '각오'], ['답변노트', '답변<br>노트']
  ];
  var SENT = null; // sentence definitions from data
  var BLANK = {
    step: 0, sub: 0, showEx: true, alias: '', grade: '', share: null, sid: '', startedAt: 0,
    track: '', trackOther: '', q1: '', q2who: '', q2what: '',
    chosen: [1, 2, 3], scenes: [], exp: {}, kg: {}, kv: {}, mainV: '', mainG: '', mainVManual: false, mainGManual: false,
    first: '', firstEdited: false, q3when: '', q3who: '', q3do: '',
    dept: '', prac: '', learnt: '', reason: '', vow: '', vowEdited: false,
    want: '', issue: '', ans: {}, ansEdited: {}, self: {}
  };

  // ---------- small helpers ----------
  function $(id) { return document.getElementById(id); }
  function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function t(x) { return (x || '').replace(/\s+/g, ' ').trim(); }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
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
  function getPath(p) { var o = S, a = p.split('.'), i; for (i = 0; i < a.length; i++) { if (o == null) return ''; o = o[a[i]]; } return o == null ? '' : o; }
  function setPath(p, v) { var o = S, a = p.split('.'), i; for (i = 0; i < a.length - 1; i++) { if (o[a[i]] == null || typeof o[a[i]] !== 'object') o[a[i]] = {}; o = o[a[i]]; } o[a[a.length - 1]] = v; }

  // Korean particles chosen by the final consonant of the last Hangul syllable.
  function jong(w) { w = t(w); if (!w) return 0; var c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return -1; return (c - 0xAC00) % 28; }
  function pp(w, a, b) { var j = jong(w); if (/\]$/.test(t(w))) return w + a + '(' + b + ')'; return w + (j > 0 ? a : b); }
  function eul(w) { return pp(w, '을', '를'); }
  function iga(w) { return pp(w, '이', '가'); }
  function eun(w) { return pp(w, '은', '는'); }
  // Trim what students tend to add around a blank so the frame reads naturally.
  function trimEnd(w, list) { w = t(w).replace(/[.。!?]+$/, ''); for (var i = 0; i < list.length; i++) { if (w.length > list[i].length && w.slice(-list[i].length) === list[i]) return t(w.slice(0, -list[i].length)); } return w; }
  function sentence(x) { x = t(x); if (!x) return ''; return /[.!?。"”]$/.test(x) ? x : x + '.'; }
  function blank(name) { return '[빈칸: ' + name + ']'; }
  function or(v, name) { v = t(v); return v || blank(name); }

  // ---------- derived data ----------
  function track() { for (var i = 0; i < D.tracks.length; i++) if (D.tracks[i].id === S.track) return D.tracks[i]; return null; }
  function roleName() {
    var tr = track(); if (!tr) return blank('직렬') + ' 공무원';
    if (tr.id === 'other') return t(S.trackOther) ? trimEnd(S.trackOther, ['공무원']) + ' 공무원' : blank('직렬') + ' 공무원';
    return tr.role;
  }
  function trackLabel() { var tr = track(); if (!tr) return ''; return tr.id === 'other' ? t(S.trackOther) : tr.name; }
  // Sample student examples written for the chosen track; other tracks use the default.
  function HX() { return (D.examples && D.examples[S.track]) || D.examples['default']; }
  function theme(n) { for (var i = 0; i < D.themes.length; i++) if (D.themes[i].n === n) return D.themes[i]; return null; }
  function chosen() { return S.chosen.slice().sort(); }
  function E(n) { return S.exp[n] || {}; }
  function filled(n) { var e = E(n), c = 0; SENT.forEach(function (s) { if (t(e[s.k])) c++; }); return c; }
  function expMin(n) { var e = E(n); return !!(t(e.s) && t(e.act) && t(e.learn)); }
  function valuesList() { var tr = track(), l = D.values.slice(); if (tr && tr.valueWord) l.push(tr.valueWord); return l; }
  function tally(key) {
    var c = {}; chosen().forEach(function (n) { (S[key][n] || []).forEach(function (w) { c[w] = (c[w] || 0) + 1; }); });
    var arr = Object.keys(c).map(function (w) { return { w: w, n: c[w] }; });
    arr.sort(function (a, b) { return b.n - a.n || (a.w < b.w ? -1 : 1); });
    return arr;
  }
  // The experience that best shows the main strength (falls back to the first written one).
  function bestExp() {
    var list = chosen(), i;
    for (i = 0; i < list.length; i++) if (S.mainG && (S.kg[list[i]] || []).indexOf(S.mainG) >= 0 && t(E(list[i]).act)) return list[i];
    for (i = 0; i < list.length; i++) if (t(E(list[i]).act)) return list[i];
    return list[0] || 1;
  }
  function expFor(pref) { var list = chosen(); for (var i = 0; i < pref.length; i++) if (list.indexOf(pref[i]) >= 0 && t(E(pref[i]).act)) return pref[i]; return bestExp(); }
  function act(n) { return sentence(E(n).act) || blank('경험 ' + n + '의 내가 한 일'); }
  function who3() { return or(trimEnd(S.q3who, ['를', '을']), '누구'); }
  function when3() { return or(trimEnd(S.q3when, ['할 때', '하는 때', '때', '하다', '하기', '할']), '무엇을'); }
  function do3() {
    var v = t(S.q3do).replace(/[.!?]+$/, '');
    if (!v) return blank('무엇을 하겠다');
    if (/겠습니다$/.test(v)) return v;
    if (/겠다$/.test(v)) return v.replace(/겠다$/, '겠습니다');
    if (/하다$/.test(v)) return v.replace(/하다$/, '하겠습니다');
    if (/(하기|함)$/.test(v)) return v.replace(/(하기|함)$/, '하겠습니다');
    return v + '하겠습니다';
  }
  function who2() { return or(S.q2who, '누구'); }
  function what2() { return or(trimEnd(S.q2what, ['수 있게', '할 수 있게']), '무엇을 할'); }

  function firstSentence() {
    return '저는 ' + eul(or(S.mainV, '가치관')) + ' 중요하게 여기고, ' + iga(or(S.mainG, '강점')) + ' 강점인 사람입니다.';
  }
  function vowText() {
    return '공무원은 ' + eul(or(trimEnd(S.q1, ['를', '을']), '누구')) + ' 위해 일합니다. ' + roleName() + '의 일은 ' + iga(who2()) + ' ' + what2() + ' 수 있게 돕는 일입니다. ' +
      act(bestExp()) + ' 공무원이 되어서도 ' + when3() + '할 때 ' + eul(who3()) + ' 먼저 생각하겠습니다.';
  }
  // The seven basic questions (design doc p15-16) and how each answer is assembled.
  var QUESTIONS = [
    { n: 1, title: '자기소개 (30초)', ask: '"경험 포함해서 자기소개 해 보세요." · 30초 자기소개(2025 후기)',
      make: function () { return (S.firstEdited && t(S.first) ? t(S.first) : firstSentence()) + ' ' + act(bestExp()) + ' ' + roleName() + '이 되어 ' + eul(who3()) + ' 위해 ' + do3() + '.'; } },
    { n: 2, title: '지원동기 (20~30초)', ask: '"지원동기는?" · "…를 지망하시는 이유는?"(2023·2024 후기)',
      make: function () { return '저는 ' + or(S.dept, '학과') + '에서 ' + eul(or(S.prac, '실습')) + ' 하며 ' + eul(or(trimEnd(S.learnt, ['을 배웠습니다', '를 배웠습니다']), '배운 것')) + ' 알게 되었습니다. ' + eun(roleName()) + ' ' + iga(who2()) + ' ' + what2() + ' 수 있게 돕습니다. 그래서 ' + or(trimEnd(S.reason, ['지원했습니다']), '지원 이유') + ' 지원했습니다.'; } },
    { n: 3, title: '직렬·기관이 하는 일', ask: '"…가 무슨 일을 하는지 알고 계신가요?"(지역인재 2024)',
      make: function () { var tr = track(), org = (tr && tr.org) || blank('기관'); return eun(org) + ' ' + eul(who2()) + ' 위해 일합니다. 제가 특히 하고 싶은 일은 ' + or(S.want, '하고 싶은 일') + '입니다. 요즘 ' + iga(or(S.issue, '지역·직렬 현안 1개')) + ' 있다고 알고 있습니다.'; } },
    { n: 4, title: '경험 질문과 꼬리질문', ask: '"팀을 이루어서 성취해 본 경험이 있는가?" · "그 해결 방안에 반박한 사람은 없었는지"(2024 후기)', exp: true },
    { n: 5, title: '공직관·청렴', ask: '"만약 부정 청탁을 받게 된다면 어떻게 하실 건가요?"(지역인재 2024)',
      make: function () { return '공무원은 ' + eul(or(trimEnd(S.q1, ['를', '을']), '누구')) + ' 위해 일합니다. ' + act(expFor([5, 1])) + ' 공무원이 되어서도 부정 청탁을 받으면 정중하게 거절하고, 규정에 따라 보고하고 기록을 남기겠습니다.'; } },
    { n: 6, title: '상황 질문', ask: '', situation: true,
      make: function () { return '먼저 ' + who2() + '의 말을 듣고 규정과 사실을 확인하겠습니다. 그다음 상사에게 보고해 협의하고, 결과를 ' + who2() + '에게 안내한 뒤 기록으로 남기겠습니다. ' + act(expFor([2, 1])) + ' 공무원이 되어서도 이 순서를 지키겠습니다.'; } },
    { n: 7, title: '마지막으로 하고 싶은 말 (10초)', ask: '"가장 하고 싶은 말을 10초로"(2025 후기)',
      make: function () { return '공무원이 되어 ' + when3() + '할 때 ' + eul(who3()) + ' 먼저 생각하는 ' + roleName() + '이 되겠습니다.'; } }
  ];
  function answer(q) { if (q.exp) return ''; return S.ansEdited[q.n] ? (S.ans[q.n] || '') : q.make(); }
  function blanksIn(x) { var m = (x || '').match(/\[빈칸: [^\]]+\]/g) || []; return m.map(function (s) { return s.slice(5, -1); }); }

  // ---------- step completion (also sent to the coach screen) ----------
  function stepDone(i) {
    switch (i) {
      case 0: return !!S.track && (S.track !== 'other' || !!t(S.trackOther));
      case 1: return !!(t(S.q1) && t(S.q2who) && t(S.q2what));
      case 2: return chosen().filter(function (n) { return t(E(n).title); }).length >= 3;
      case 3: return chosen().length >= 3 && chosen().every(expMin);
      case 4: return !!(S.mainV && S.mainG && t(S.first));
      case 5: return !!(t(S.q3when) && t(S.q3who) && t(S.q3do));
      case 6: return QUESTIONS.filter(function (q) { return !q.exp && blanksIn(answer(q)).length === 0; }).length >= 6;
    }
    return false;
  }

  // ---------- storage + sharing ----------
  var saveTimer = null, lastSent = '';
  function save() {
    lsSet(KEY, JSON.stringify(S));
    if (CLASS_OK && S.share === true) { clearTimeout(saveTimer); saveTimer = setTimeout(push, 2500); }
  }
  function rpc(fn, args) {
    var url = window.__SUPABASE_URL__, key = window.__SUPABASE_ANON__;
    if (!url || !key) return Promise.reject(new Error('not_configured'));
    return fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(args)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return null; });
  }
  function push() {
    if (!(CLASS_OK && S.share === true)) return;
    var data = clone(S); delete data.sid; delete data.share;
    data.done = STEPS.map(function (x, i) { return stepDone(i); });
    data.ansText = {}; QUESTIONS.forEach(function (q) { if (!q.exp) data.ansText[q.n] = answer(q); });
    var body = { p_device: S.sid, p_class: CLASS, p_alias: t(S.alias).slice(0, 20) || '이름 없음', p_track: trackLabel().slice(0, 40), p_step: S.step, p_data: data };
    var sig = JSON.stringify(body); if (sig === lastSent) return;
    status('보내는 중');
    rpc('gm_save', body).then(function () { lastSent = sig; status('ok'); }, function () { status('fail'); });
  }
  function status(k) {
    var el = $('sync'); if (!el) return;
    if (!CLASS_OK || S.share !== true) { el.textContent = '이 기기에만 저장됩니다.'; el.className = 'sync'; return; }
    var d = new Date(), hm = (d.getHours() < 10 ? '0' : '') + d.getHours() + ':' + (d.getMinutes() < 10 ? '0' : '') + d.getMinutes();
    el.textContent = k === 'ok' ? '✓ 강사님께 자동 저장되고 있습니다 (마지막 ' + hm + ')' : k === 'fail' ? '보내지 못했습니다. 글은 이 기기에 저장되어 있고, 인터넷이 되면 다시 보냅니다.' : '강사님께 보내는 중입니다.';
    el.className = 'sync' + (k === 'fail' ? ' err' : '');
  }
  function load() {
    var raw = lsGet(KEY), k, o;
    S = clone(BLANK);
    if (raw) { try { o = JSON.parse(raw); for (k in o) if (Object.prototype.hasOwnProperty.call(BLANK, k)) S[k] = o[k]; } catch (e) { /* start fresh */ } }
    if (!S.sid) S.sid = uuid();
    if (!S.chosen || S.chosen.length < 1) S.chosen = [1, 2, 3];
  }
  function touch() { if (!S.startedAt) S.startedAt = Date.now(); }

  // ---------- rendering pieces ----------
  function exBox(text, label) {
    if (!S.showEx || !t(text)) return '';
    return '<p class="ex"><span class="ex-tag">' + (label || '한결 예시') + '</span>' + esc(text) + '</p>';
  }
  function input(k, ph, extra) { return '<input type="text" data-k="' + k + '" value="' + esc(getPath(k)) + '" placeholder="' + esc(ph || '') + '"' + (extra || '') + '>'; }
  function area(k, ph, cls) { return '<textarea data-k="' + k + '" class="' + (cls || '') + '" placeholder="' + esc(ph || '') + '">' + esc(getPath(k)) + '</textarea>'; }
  function chips(name, list, sel, multi) {
    return '<div class="chips" role="group">' + list.map(function (w) {
      var on = multi ? sel.indexOf(w) >= 0 : sel === w;
      return '<button type="button" class="chip" data-chip="' + esc(name) + '" data-v="' + esc(w) + '" aria-pressed="' + on + '">' + esc(w) + '</button>';
    }).join('') + '</div>';
  }
  function fillChips(k, list) {
    return '<div class="fill">' + list.filter(Boolean).map(function (w) { return '<button type="button" class="fillbtn" data-fill="' + k + '" data-v="' + esc(w) + '">' + esc(w) + ' 넣기</button>'; }).join('') + '</div>';
  }
  function prompt(key, title) {
    var txt = (D.prompts[key] || '').replace(/\[직렬\]/g, trackLabel() || '[직렬]').replace(/\[장면 3개\]/g, S.scenes.length ? S.scenes.join(', ') : '[장면 3개]');
    return '<details class="ai"><summary>' + (title || 'ChatGPT에게 질문 받기 (선택)') + '</summary><p class="q">아래 글을 복사해 ChatGPT에 붙여 넣습니다. ' + esc(D.aiRule) + '</p>' +
      '<p class="prompt">' + esc(D.prompts.start.replace(/\[직렬\]/g, trackLabel() || '[직렬]')) + '\n\n' + esc(txt) + '</p>' +
      '<button type="button" class="btn sm" data-copy-prompt="' + key + '">이 질문 복사</button></details>';
  }
  function mustHtml(items) {
    return '<div class="must"><b>이 단계에서 남길 것</b><ul>' + items.map(function (it) { return '<li class="' + (it[0] ? 'ok' : '') + '">' + (it[0] ? '✓ ' : '○ ') + esc(it[1]) + '</li>'; }).join('') + '</ul></div>';
  }
  function must() { return '<div id="mustBox"></div>'; }
  var MUSTS = [
    function () { return [[stepDone(0), '내 시험 직렬'], [!CLASS_OK || S.share === true, '강사님과 공유 체크 (선택)']]; },
    function () { return [[!!t(S.q1), '질문 1의 한 단어'], [!!(t(S.q2who) && t(S.q2what)), '질문 2의 빈칸 두 개']]; },
    function () { var n = chosen().filter(function (x) { return t(E(x).title); }).length; return [[n >= 3, '경험 3개 이상 고르기 (지금 ' + n + '개)'], [chosen().length === 5, '시간이 있으면 5개 모두 (선택)']]; },
    function () { var l = chosen(), n = l[S.sub], d = l.filter(expMin).length; return [[expMin(n), '이 경험의 상황 · 내가 한 일 · 배운 것'], [d === l.length, '고른 경험 ' + l.length + '개 모두 (지금 ' + d + '개)']]; },
    function () { return [[!!S.mainG, '대표 강점'], [!!S.mainV, '대표 가치관'], [!!t(S.first), '첫 문장']]; },
    function () { return [[stepDone(5), '질문 3의 빈칸 세 개'], [!!(t(S.dept) && t(S.prac)), '학과와 실습']]; },
    function () { var n = QUESTIONS.filter(function (q) { return !q.exp && blanksIn(answer(q)).length === 0; }).length; return [[n >= 6, '빈칸 없는 답 6개 (지금 ' + n + '개)']]; }
  ];
  function tabsHtml() {
    var list = chosen();
    return list.map(function (x, i) {
      return '<button type="button" role="tab" data-sub="' + i + '" aria-selected="' + (i === S.sub) + '" class="' + (expMin(x) ? 'done' : '') + '">' + (expMin(x) ? '✓ ' : '') + '주제 ' + x + '<small>' + filled(x) + '/6</small></button>';
    }).join('');
  }
  function head(title, lead) { return '<h2>' + title + '</h2>' + (lead ? '<p class="lead">' + lead + '</p>' : ''); }

  // ---------- steps ----------
  // Days left until the exam date ('YYYY-MM-DD'), counted on the local calendar.
  function daysTo(ymd) {
    var p = String(ymd || '').split('-'); if (p.length !== 3) return null;
    var now = new Date(), a = new Date(now.getFullYear(), now.getMonth(), now.getDate()), b = new Date(+p[0], +p[1] - 1, +p[2]);
    return Math.round((b - a) / 86400000);
  }
  // Researched current issues for the track: tap a chip to fill the issue field; numbers and sources below.
  function issueBox(list) {
    var chips = fillChips('issue', list.map(function (x) { return x.w; })).replace(/<\/div>$/, '<button type="button" class="fillbtn" data-fill="issue" data-v="">기타 (직접 쓰기)</button></div>');
    return '<div class="box"><p><b>현안 고르기</b> · 자료에서 고르거나, 「기타」를 눌러 내가 조사한 현안을 직접 씁니다.</p>' + chips +
      (list.length ? '<ul class="plain">' + list.map(function (x) { return '<li>' + esc(x.t) + '<br><span class="src2">' + esc(x.s) + '</span></li>'; }).join('') + '</ul>' : '') + '</div>';
  }
  function examCard(ex) {
    var n = ex.date ? daysTo(ex.date) : null, dd = n === null ? '' : n > 0 ? '면접 D-' + n : n === 0 ? '면접 D-day' : '면접 지남';
    var li = function (l) { return (l || []).map(function (x) { return '<li>' + esc(x) + '</li>'; }).join(''); };
    return '<div class="box exam"><p class="examh"><b>내 시험 정보</b>' + (dd ? '<span class="dday">' + dd + '</span>' : '') + '</p>' +
      '<p><b>' + esc(ex.when) + '</b></p><ul class="plain">' + li(ex.rows) + '</ul>' +
      (ex.check && ex.check.length ? '<ul class="plain warnlist">' + li(ex.check) + '</ul>' : '') +
      '<p class="src2">근거: ' + esc(ex.src) + '</p></div>';
  }
  function step0() {
    var tr = track(), h = head('면접에서 말할 재료를 만듭니다', '오늘은 말하기를 연습하는 날이 아니라 말할 재료를 만드는 날입니다. 면접 주제에 맞는 내 경험을 문장으로 쓰고, 마지막에 면접 질문 7개에 답할 답변노트를 완성합니다.');
    h += '<details class="why"><summary>오늘 왜 경험을 글로 쓰나요?</summary><ol>' + D.why.map(function (r) { return '<li><b>' + esc(r[0]) + '</b><br>' + esc(r[1]) + '<br><span class="q">' + esc(r[2]) + '</span></li>'; }).join('') + '</ol></details>';
    if (CLASS_OK) {
      h += '<div class="field"><label for="alias">이름 <span class="cnt">강사님 화면에 보이는 이름</span></label><p class="q">내 이름을 적습니다. 학교·연락처는 쓰지 않습니다.</p>' + input('alias', '예: 홍길동', ' id="alias" maxlength="20" autocomplete="name"') + '<p class="warn" data-noname hidden>이름을 적어야 강사님 화면에서 내 답변노트를 찾을 수 있습니다.</p></div>';
      h += '<div class="box strong"><label class="tog"><input type="checkbox" data-share' + (S.share === true ? ' checked' : '') + '><span><b>강사님과 답변노트를 공유합니다</b><br>' +
        (S.share === true ? '<span class="sync">✓ 공유하고 있습니다. 이제 쓰기만 하면 됩니다. 쓰는 글이 이름과 함께 강사님 화면에 자동으로 저장됩니다. 따로 누를 단추는 없습니다.</span>'
          : '<span class="q">한 번 체크해 두면 쓰는 글이 이름과 함께 강사님 화면에 자동으로 저장되고, 강사님이 내 글을 보고 도와줍니다. 체크하지 않아도 도구는 그대로 쓸 수 있습니다.</span>') +
        '</span></label></div>';
    }
    h += '<div class="field"><div class="lbl">학년</div>' + chips('grade', ['3학년', '2학년'], S.grade || '', false) + '</div>';
    h += '<div class="field"><div class="lbl">내 시험 직렬</div>' + chips('track', D.tracks.map(function (x) { return x.name; }), tr ? tr.name : '', false);
    if (S.track === 'other') h += input('trackOther', '직렬 이름을 적습니다. 예: 일반농업', ' maxlength="30"');
    if (tr && tr.note) h += '<p class="note">' + esc(tr.note) + '</p>';
    h += '</div>';
    if (tr && tr.exam) h += examCard(tr.exam);
    h += must();
    return h;
  }
  function step1() {
    var tr = track(), H = HX(), h = head('공무원은 누구를 위해 일할까요?', '원문을 먼저 읽고, 빈칸에 내 말을 한 단어씩 넣습니다.');
    h += '<div class="quote">' + D.law.map(function (l) { return '<p><b>' + esc(l[0]) + '</b><br>"' + esc(l[1]) + '"</p>'; }).join('') + '</div>';
    h += '<div class="field"><div class="lbl">질문 1. 공무원은 누구를 위해 일하나요?</div><p class="fr">공무원은 ' + input('q1', '누구', ' class="inl" maxlength="20"') + '을(를) 위해 일한다</p>' + fillChips('q1', ['국민', '주민']) +
      '<p class="preview" data-preview="q1"></p>' + exBox('공무원은 ' + eul(H.q1) + ' 위해 일한다') + '</div>';
    if (tr && tr.id !== 'other') h += '<div class="box"><p><b>' + esc(tr.name) + '</b> · 일하는 곳: ' + esc(tr.place) + '<br>일이 향하는 사람: <b>' + esc(tr.who) + '</b></p><p class="q">직렬별 표는 제안입니다. 근무 부서의 업무 소개로 한 번 더 확인합니다.</p></div>';
    h += '<div class="field"><div class="lbl">질문 2. 내가 일할 부서는 누구를 위해 일하나요?</div><p class="fr">' + esc(roleName()) + '은 ' + input('q2who', '누구', ' class="inl" maxlength="30"') + '이(가) ' + input('q2what', '무엇을 할', ' class="inl wide" maxlength="40"') + ' 수 있게 일한다</p>' +
      fillChips('q2who', tr && tr.who ? [tr.who] : []) + '<p class="preview" data-preview="q2"></p>' +
      exBox(eun(H.role || '기계 공무원') + ' ' + iga(H.q2who) + ' ' + H.q2what + ' 수 있게 일한다') + '</div>';
    h += must();
    return h;
  }
  // Which chip is selected for a theme: a listed candidate, '기타' (own words) or nothing.
  function pickOf(th) {
    var e = E(th.n), ti = t(e.title);
    if (e.pick) return e.pick;
    if (!ti) return '';
    return th.cands.indexOf(ti) >= 0 ? ti : '기타';
  }
  function step2() {
    var H = HX(), h = head('면접 주제에 맞는 내 경험을 고릅니다', '주제 다섯 개 가운데 <b>세 개 이상</b> 고릅니다. 시간이 있으면 다섯 개 모두 씁니다. 주제마다 쓸 경험을 하나씩 누릅니다. 목록에 없으면 「기타」를 누르고 짧게 적습니다.');
    h += '<div class="guide"><b>경험을 고르는 기준 세 가지</b><ol><li>내가 직접 한 행동이 있는가</li><li>고등학교 3년 안의 일인가</li><li>그 일이 누군가에게 도움이 됐는가</li></ol><p class="q">한 경험은 한 주제에만 씁니다. 경험이 모자라면 작은 일도 됩니다(실습 한 번, 하루 봉사).</p></div>';
    h += '<div class="field"><div class="lbl">눈이 멈추는 장면을 눌러 봅니다 <span class="cnt">떠올리기용</span></div>' + chips('scene', D.scenes, S.scenes, true) + '</div>';
    var titles = {};
    D.themes.forEach(function (th) {
      var on = S.chosen.indexOf(th.n) >= 0, ti = t(E(th.n).title);
      if (ti) titles[ti] = (titles[ti] || 0) + 1;
      h += '<div class="theme' + (on ? ' on' : '') + '"><label class="tog"><input type="checkbox" data-theme="' + th.n + '"' + (on ? ' checked' : '') + '><span><b>주제 ' + th.n + '. ' + esc(th.name) + '</b><br><span class="q">면접 질문 ' + esc(th.ask) + '</span></span></label>';
      if (on) {
        var pk = pickOf(th);
        h += '<p class="q">어떤 경험을 쓸지 하나 누릅니다. 자세한 내용은 다음 단계에서 씁니다.</p>' + chips('pick.' + th.n, th.cands.concat(['기타']), pk, false);
        if (pk === '기타') h += '<label class="sr" for="ti' + th.n + '">주제 ' + th.n + ' 기타 경험</label>' + input('exp.' + th.n + '.title', '어떤 경험인지 짧게 적습니다', ' id="ti' + th.n + '" maxlength="60"');
        h += '<p class="warn" data-dup="' + th.n + '" hidden>다른 주제와 같은 경험입니다. 한 경험은 한 주제에만 씁니다.</p>';
        h += exBox(H.exp[th.n].title) + '<details class="case"><summary>실제 합격 사례</summary><p>' + esc(th.case) + '</p></details>';
      }
      h += '</div>';
    });
    h += prompt('pick');
    var n = chosen().filter(function (x) { return t(E(x).title); }).length;
    h += must();
    return h;
  }
  function step3() {
    var list = chosen(); if (S.sub >= list.length) S.sub = 0;
    var n = list[S.sub], th = theme(n), e = E(n), H = HX().exp[n], tr = track();
    var h = head('경험을 여섯 문장으로 씁니다', '면접에서는 이 여섯 문장을 그대로 읽지 않고, 질문에 맞게 골라 씁니다. 여섯 문장이 있으면 꼬리질문("그때 어떻게?", "무엇을 배웠나?")에도 답할 수 있습니다.');
    h += '<div class="tabs" role="tablist" id="expTabs">' + tabsHtml() + '</div>';
    h += '<div class="box"><p><b>주제 ' + n + '. ' + esc(th.name) + '</b><br>면접 질문 ' + esc(th.ask) + '</p>' + (n === 1 && tr && tr.note ? '<p class="note">' + esc(tr.note) + '</p>' : '') + '</div>';
    h += '<div class="field"><label for="tiw">한 줄 기록</label><p class="q">앞 단계에서 고른 경험입니다. 언제·어디서·무슨 역할로 했는지 한 줄로 고쳐 씁니다.</p>' + input('exp.' + n + '.title', '언제·어디서·무슨 역할로·무엇을 했다', ' id="tiw" maxlength="60"') + '</div>';
    SENT.forEach(function (s, i) {
      var k = 'exp.' + n + '.' + s.k, key = s.k === 'act';
      h += '<div class="field' + (key ? ' key' : '') + '"><label for="f' + s.k + '"><span><span class="num">' + (i + 1) + '</span>' + s.label + (key ? ' <span class="badge">가장 자세히</span>' : '') + '</span><span class="cnt" data-cnt="' + k + '"></span></label>' +
        '<p class="q">' + esc(s.ask) + '</p><p class="frame">틀: ' + esc(s.frame) + '</p>' +
        '<textarea id="f' + s.k + '" data-k="' + k + '" class="' + (key ? 'tall' : '') + '">' + esc(e[s.k] || '') + '</textarea>' +
        '<p class="hint" data-hint="' + k + '"></p>' + exBox(H[s.k]) + '</div>';
    });
    h += '<div class="guide"><b>혼자 읽고 고치는 기준 세 가지</b><ol><li>숨이 차면 문장을 둘로 나눕니다.</li><li>평소 쓰지 않는 말은 내 말로 바꿉니다.</li><li>누가 한 일인지 안 보이면 "저는"을 넣습니다.</li></ol></div>';
    h += prompt(n === 3 ? 'fail' : 'conflict', n === 3 ? 'ChatGPT에게 실패 경험 질문 받기 (선택)' : 'ChatGPT에게 장면 질문 받기 (선택)');
    var done = list.filter(expMin).length;
    h += must();
    return h;
  }
  function step4() {
    var H = HX(), h = head('내 강점과 가치관 단어를 찾습니다', '강점은 <b>내가 한 일</b> 문장에서, 가치관은 <b>기억에 남는 이유·배운 것</b> 문장에서 고릅니다. 맞는 단어를 모두 누릅니다.');
    chosen().forEach(function (n) {
      var e = E(n);
      h += '<div class="kwcard"><p class="kwt">주제 ' + n + ' · ' + esc(t(e.title) || theme(n).name) + '</p>' +
        '<p class="src"><span>내가 한 일</span>' + esc(t(e.act) || '아직 쓰지 않았습니다') + '</p>' + chips('kg.' + n, D.strengths, S.kg[n] || [], true) +
        '<p class="src"><span>기억·배운 것</span>' + esc([t(e.mem), t(e.learn)].filter(Boolean).join(' ') || '아직 쓰지 않았습니다') + '</p>' + chips('kv.' + n, valuesList(), S.kv[n] || [], true) + exBox('주제 ' + n + '에서 한결은 강점 ' + ((HX().kg[n] || []).join(', ') || '-') + ', 가치관 ' + ((HX().kv[n] || []).join(', ') || '-') + '을(를) 골랐습니다.') + '</div>';
    });
    h += '<div class="field" id="tallyBox"></div>';
    h += '<div class="field"><label for="first"><span>첫 문장</span><span class="cnt" data-cnt="first"></span></label><p class="frame">틀: 저는 [가치관]을 중요하게 여기고, [강점]이 강점인 사람입니다.</p>' +
      '<textarea id="first" data-k="first" data-auto="first">' + esc(S.firstEdited ? S.first : firstSentence()) + '</textarea>' +
      '<p class="warn" id="firstHint" hidden>대표 키워드가 바뀌었습니다. 「고른 단어로 다시 맞추기」를 누르면 첫 문장에 반영됩니다.</p><div class="btns"><button type="button" class="btn sm" data-reset="first">고른 단어로 다시 맞추기</button></div><p class="q">틀이 어색하면 내 말투로 고칩니다.</p>' + exBox(H.first) + '</div>';
    h += must();
    return h;
  }
  // The main keyword follows the student's marks: a word nobody marks any more is
  // dropped, a unique top word is taken unless the student picked another one, and
  // a tie waits for the student to choose.
  function settleMain(arr, key) {
    var counts = {}; arr.forEach(function (x) { counts[x.w] = x.n; });
    var manual = S[key + 'Manual'];
    if (S[key] && !counts[S[key]]) { S[key] = ''; manual = false; }
    if (!arr.length) { S[key] = ''; manual = false; }
    else if (!manual) {
      var top = arr[0].n, tied = arr.filter(function (x) { return x.n === top; });
      S[key] = tied.length === 1 ? tied[0].w : (tied.some(function (x) { return x.w === S[key]; }) ? S[key] : '');
    }
    S[key + 'Manual'] = manual;
  }
  function renderTally() {
    var box = $('tallyBox'); if (!box) return;
    var g = tally('kg'), v = tally('kv');
    settleMain(g, 'mainG'); settleMain(v, 'mainV');
    function pick(arr, key, label) {
      if (!arr.length) return '<p class="q">' + label + ': 위에서 단어를 누르면 여기에 셉니다.</p>';
      var top = arr[0].n, tied = arr.filter(function (x) { return x.n === top; });
      return '<p class="lbl2">' + label + (S[key] ? ': <b>' + esc(S[key]) + '</b>' : '') + '</p><div class="chips">' + arr.slice(0, 6).map(function (x) {
        return '<button type="button" class="chip" data-main="' + key + '" data-v="' + esc(x.w) + '" aria-pressed="' + (S[key] === x.w) + '">' + esc(x.w) + ' <small>' + x.n + '번</small></button>';
      }).join('') + '</div>' + (tied.length > 1 && !S[key] ? '<p class="note">' + tied.length + '개가 ' + top + '번으로 같습니다. 나를 더 잘 보여 주는 단어 하나를 누릅니다.</p>' : '');
    }
    box.innerHTML = '<div class="lbl">많이 나온 단어 = 대표 키워드</div>' + pick(g, 'mainG', '대표 강점') + pick(v, 'mainV', '대표 가치관');
    var fh = $('firstHint');
    if (fh) { var f0 = t(S.first); fh.hidden = !(S.firstEdited && S.mainG && S.mainV && (f0.indexOf(S.mainG) < 0 || f0.indexOf(S.mainV) < 0)); }
  }
  function step5() {
    var H = HX(), tr = track(), h = head('각오와 지원동기를 정리합니다', '질문 3에 답하면, 앞에서 쓴 내 문장으로 각오와 포부 문단이 만들어집니다.');
    h += '<div class="field"><div class="lbl">질문 3. 나는 무엇을 할 때, 누구를 향해, 무엇을 하겠다</div>' +
      '<p class="fr">나는 ' + input('q3when', '무엇을', ' class="inl wide" maxlength="40"') + '할 때 ' + input('q3who', '누구', ' class="inl" maxlength="30"') + '을(를) 위해 ' + input('q3do', '무엇을 하겠다', ' class="inl wide" maxlength="40"') + '</p><p class="q">마지막 칸은 「~하겠다」까지 씁니다. 예: 한 번 더 확인하겠다</p>' +
      fillChips('q3who', [t(S.q2who)]) + '<p class="preview" data-preview="q3"></p>' + exBox('나는 ' + H.q3when + '할 때 ' + eul(H.q3who) + ' 위해 ' + H.q3do) + '</div>';
    h += '<div class="field"><label for="vow"><span>⑥ 각오와 포부 (30초)</span><span class="cnt" data-cnt="vow"></span></label><p class="q">자기소개 마지막 문장, 지원동기 끝, 공직관 답, "마지막으로 하고 싶은 말"에 다시 씁니다.</p>' +
      '<textarea id="vow" data-k="vow" data-auto="vow" class="tall">' + esc(S.vowEdited ? S.vow : vowText()) + '</textarea><div class="btns"><button type="button" class="btn sm" data-reset="vow">내 문장으로 다시 맞추기</button></div>' + exBox(H.vow) + '</div>';
    h += '<div class="field"><div class="lbl">지원동기 재료</div><p class="q">답변노트의 지원동기에 들어갑니다.</p>' +
      '<label class="mini">내 학과' + input('dept', '예: ' + HX().dept, ' maxlength="30"') + '</label>' +
      '<label class="mini">기억나는 실습·수업' + input('prac', '예: ' + HX().prac, ' maxlength="40"') + '</label>' +
      '<label class="mini">그 실습에서 배운 것' + input('learnt', '예: ' + HX().learnt, ' maxlength="60"') + '</label>' +
      '<label class="mini">지원하는 이유 한 마디' + input('reason', '예: ' + HX().reason, ' maxlength="60"') + '</label>' +
      (tr && tr.motive ? exBox(tr.motive, '모범답안(빈칸형)') : '') + '</div>';
    h += prompt('motive', 'ChatGPT에게 지원동기 질문 받기 (선택)');
    h += must();
    return h;
  }
  function step6() {
    var tr = track(), h = head('답변노트: 면접 질문 7개에 답합니다', '앞에서 쓴 내 문장이 틀에 들어가 있습니다. 소리 내어 읽고, 30초(약 120자)에 맞게 고칩니다. <span class="blank">[빈칸]</span>이 남은 곳은 앞 단계에서 채우거나 여기서 바로 고칩니다.');
    h += '<details class="rules"><summary>답변 작성 요령 6가지</summary><ol>' + D.rules.map(function (r) { return '<li>' + esc(r) + '</li>'; }).join('') + '</ol></details>';
    QUESTIONS.forEach(function (q) {
      h += '<div class="qa" id="qa' + q.n + '"><p class="qn">질문 ' + q.n + '. ' + esc(q.title) + '</p>';
      if (q.situation) {
        var sq = (tr && tr.situation && tr.situation[0]) || '';
        h += '<p class="q">' + (sq ? '예상 상황 질문(제안): "' + esc(sq) + '"' : '내 직렬에서 나올 상황 질문을 하나 떠올립니다.') + '<br>답 순서: ' + esc((tr && tr.situation && tr.situation[1]) || D.tracks[D.tracks.length - 1].situation[1]) + '</p>';
      } else if (q.ask) h += '<p class="q">실제로 나온 질문: ' + esc(q.ask) + '</p>';
      if (q.n === 3) h += '<div class="row2"><label class="mini">제가 특히 하고 싶은 일' + input('want', '예: ' + HX().want, ' maxlength="50"') + '</label><label class="mini">요즘 지역·직렬 현안 1개 (직접 조사)' + input('issue', '예: ' + HX().issue, ' maxlength="50"') + '</label></div>'
      if (q.n === 3) h += issueBox((tr && tr.issues) || []);
      if (q.exp) {
        h += '<p class="q">경험 질문에는 경험의 여섯 문장을 순서대로 말합니다. 꼬리질문은 아래 문장으로 답합니다.</p><ul class="tail"><li>"반대한 사람은?" → 역할 · 내가 한 일</li><li>"다시 한다면?" → 배운 것</li><li>"공직에서 같은 일이 생기면?" → 배운 것 + 각오</li></ul>';
        chosen().forEach(function (n) {
          var e = E(n);
          h += '<details class="script"><summary>주제 ' + n + ' · ' + esc(t(e.title) || theme(n).name) + ' (' + filled(n) + '/6)</summary><ol>' + SENT.map(function (s) { return '<li><b>' + s.label + '</b> ' + (t(e[s.k]) ? esc(e[s.k]) : '<span class="blank">[빈칸]</span>'); }).join('') + '</ol>' +
            '<button type="button" class="btn sm" data-goexp="' + n + '">이 경험 고치러 가기</button></details>';
        });
      } else {
        var a = answer(q);
        h += '<textarea data-ans="' + q.n + '" class="tall ans" aria-label="질문 ' + q.n + ' 답">' + esc(a) + '</textarea>' +
          '<p class="hint" data-ahint="' + q.n + '"></p>' +
          '<div class="self">' + ['첫 문장에 결론이 있다', '\'저는\'으로 시작하는 내 행동이 있다', '공무원이 되어 누구를 위해 무엇을 할지로 끝난다'].map(function (c, i) {
            var on = !!(S.self[q.n] && S.self[q.n][i]);
            return '<label><input type="checkbox" data-self="' + q.n + '.' + i + '"' + (on ? ' checked' : '') + '> ' + c + '</label>';
          }).join('') + '</div>' +
          '<div class="btns"><button type="button" class="btn sm" data-areset="' + q.n + '">내 문장으로 다시 맞추기</button></div>';
      }
      h += '</div>';
    });
    if (tr && tr.qs && tr.qs.length) h += tr.qs.map(function (g) { return '<div class="box"><p><b>' + esc(tr.name) + ' · ' + esc(g.g) + '</b></p><ul class="plain">' + g.l.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>'; }).join('');
    else if (tr && tr.expect && tr.expect.length) h += '<div class="box"><p><b>' + esc(tr.name) + ' 예상 질문 (출처에 없음, 제안)</b></p><ul class="plain">' + tr.expect.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>';
    h += '<div class="box"><p><b>공직관 꼬리질문 (2024 후기 유형)</b></p><ul class="plain"><li>"상사가 부당한 지시를 하면?" → 지시의 근거를 정중하게 확인 → 규정과 다르면 의견을 말함 → 그래도 다르면 절차에 따름</li><li>"업무가 너무 많으면?" → 우선순위 정리 → 도움 요청 → 끝까지 해냄</li></ul><p class="q">답안을 그대로 외우면 꼬리질문에서 막힙니다. 빈칸에 들어갈 내 경험이 있어야 합니다.</p></div>';
    h += '<div class="btns end"><button type="button" class="btn pri" id="pdfBtn">답변노트 PDF로 저장</button><button type="button" class="btn" id="copyAll">답변노트 전체 복사</button></div>' + (CLASS_OK && S.share === true ? '<p class="sync">✓ 강사님과 공유하고 있어서 답변노트가 강사님 화면에 자동으로 들어가 있습니다.</p>' : '');
    h += prompt('mock', 'ChatGPT와 모의면접 하기 (선택)');
    h += '<p class="msg" id="msg" role="status"></p><textarea id="fallback" class="tall" aria-label="복사할 글" readonly hidden></textarea>';
    return h;
  }

  // ---------- live updates (no full re-render while typing) ----------
  function refreshLive() {
    var k;
    settleMain(tally('kg'), 'mainG'); settleMain(tally('kv'), 'mainV');
    if (!S.firstEdited) S.first = firstSentence();
    if (!S.vowEdited) S.vow = vowText();
    Array.prototype.forEach.call(document.querySelectorAll('[data-cnt]'), function (el) { var v = getPath(el.getAttribute('data-cnt')); el.textContent = t(v).length + '자'; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-hint]'), function (el) {
      k = el.getAttribute('data-hint'); var v = t(getPath(k)), f = k.split('.').pop(), msgs = [];
      if (v) {
        (v.match(/[^.!?]+[.!?]*/g) || []).forEach(function (s) { s = t(s); if (s.length > 70) msgs.push('숨이 찰 만큼 긴 문장이 있습니다(' + s.length + '자). 둘로 나눕니다.'); });
        if (/(^|[^니])다\.?$/.test(v) && !/습니다\.?$|니다\.?$/.test(v)) msgs.push('면접에서 말하듯 「~했습니다」로 끝냅니다.');
        if (f === 'act' && !/저는|제가/.test(v)) msgs.push('누가 한 일인지 보이게 "저는"으로 시작합니다.');
        if (f === 'res' && !/\d|["“”']|고 (말|하)|라고/.test(v)) msgs.push('숫자나 들은 말이 있으면 넣습니다. 없으면 그대로 둡니다.');
      }
      el.textContent = msgs.join(' '); el.hidden = !msgs.length; el.className = 'hint' + (f === 'res' && msgs.length === 1 && /숫자나/.test(msgs[0]) ? ' soft' : '');
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ahint]'), function (el) {
      var n = +el.getAttribute('data-ahint'), a = S.ansEdited[n] ? (S.ans[n] || '') : answer(QUESTIONS[n - 1]), b = blanksIn(a), len = t(a).replace(/\[빈칸: [^\]]+\]/g, '').length, lim = n === 7 ? 50 : 120;
      var m = [len + '자 / 약 ' + lim + '자(' + (n === 7 ? '10초' : '30초') + ')' + (len > lim * 1.3 ? ' · 깁니다. 장면 문장부터 줄입니다.' : '')];
      if (b.length) m.push('빈칸 ' + b.length + '개: ' + b.join(', '));
      el.textContent = m.join(' · '); el.className = 'hint' + (b.length || len > lim * 1.3 ? ' warn' : ' good'); el.hidden = false;
    });
    Array.prototype.forEach.call(document.querySelectorAll('[data-ans]'), function (el) {
      var n = +el.getAttribute('data-ans'); if (S.ansEdited[n] || document.activeElement === el) return;
      var v = QUESTIONS[n - 1].make(); if (el.value !== v) el.value = v;
    });
    if ($('tallyBox')) renderTally();
    var p;
    if ((p = document.querySelector('[data-preview="q1"]'))) p.textContent = t(S.q1) ? '→ 공무원은 ' + eul(trimEnd(S.q1, ['를', '을'])) + ' 위해 일한다' : '';
    if ((p = document.querySelector('[data-preview="q2"]'))) p.textContent = t(S.q2who) && t(S.q2what) ? '→ ' + eun(roleName()) + ' ' + iga(t(S.q2who)) + ' ' + what2() + ' 수 있게 일한다' : '';
    if ((p = document.querySelector('[data-preview="q3"]'))) p.textContent = stepDone(5) ? '→ 나는 ' + when3() + '할 때 ' + eul(who3()) + ' 위해 ' + do3().replace(/겠습니다$/, '겠다') : '';
    var nn = document.querySelector('[data-noname]'); if (nn) nn.hidden = !(S.share === true && !t(S.alias));
    Array.prototype.forEach.call(document.querySelectorAll('[data-dup]'), function (el) {
      var n = +el.getAttribute('data-dup'), ti = t(E(n).title), dup = false;
      if (ti) chosen().forEach(function (x) { if (x !== n && t(E(x).title) === ti) dup = true; });
      el.hidden = !dup;
    });
    var f = $('first'); if (f && !S.firstEdited && document.activeElement !== f) { f.value = firstSentence(); S.first = f.value; }
    var w = $('vow'); if (w && !S.vowEdited && document.activeElement !== w) { w.value = vowText(); S.vow = w.value; }
    var mb = $('mustBox'); if (mb) mb.innerHTML = mustHtml(MUSTS[S.step]());
    var tb = $('expTabs'); if (tb) tb.innerHTML = tabsHtml();
    renderNav();
  }

  // ---------- events ----------
  function bind() {
    var stage = $('stage');
    Array.prototype.forEach.call(stage.querySelectorAll('[data-k]'), function (el) {
      el.oninput = function () {
        var k = el.getAttribute('data-k'); touch(); setPath(k, el.value);
        if (k === 'first') S.firstEdited = true;
        if (k === 'vow') S.vowEdited = true;
        save(); refreshLive();
      };
    });
    Array.prototype.forEach.call(stage.querySelectorAll('[data-ans]'), function (el) {
      el.oninput = function () { var n = el.getAttribute('data-ans'); touch(); S.ans[n] = el.value; S.ansEdited[n] = true; save(); refreshLive(); };
    });
    stage.onclick = function (ev) {
      var b = ev.target.closest ? ev.target.closest('button, input[type=checkbox]') : null; if (!b) return;
      var a;
      if ((a = b.getAttribute('data-chip')) && a.indexOf('pick.') === 0) {
        var pn = +a.split('.')[1], pv = b.getAttribute('data-v'), th0 = theme(pn), cur0 = pickOf(th0); touch();
        if (cur0 === pv) { setPath('exp.' + pn + '.pick', ''); if (pv !== '기타' || th0.cands.indexOf(t(E(pn).title)) >= 0) setPath('exp.' + pn + '.title', ''); }
        else if (pv === '기타') { setPath('exp.' + pn + '.pick', '기타'); if (th0.cands.indexOf(t(E(pn).title)) >= 0) setPath('exp.' + pn + '.title', ''); }
        else { setPath('exp.' + pn + '.pick', pv); setPath('exp.' + pn + '.title', pv); }
        save(); render(true);
        // Only "기타" needs typing, so only it brings up the keyboard.
        if (pickOf(th0) === '기타') { var oi = $('ti' + pn); if (oi) oi.focus(); }
        return;
      }
      if ((a = b.getAttribute('data-chip'))) {
        var v = b.getAttribute('data-v'); touch();
        if (a === 'track') { for (var i = 0; i < D.tracks.length; i++) if (D.tracks[i].name === v) S.track = D.tracks[i].id; }
        else if (a === 'grade') S.grade = S.grade === v ? '' : v;
        else if (a === 'scene') toggle(S.scenes, v);
        else { var parts = a.split('.'); S[parts[0]][parts[1]] = S[parts[0]][parts[1]] || []; toggle(S[parts[0]][parts[1]], v); }
        save(); render(true); return;
      }
      if ((a = b.getAttribute('data-main'))) { var mv = b.getAttribute('data-v'); if (S[a] === mv && S[a + 'Manual']) { S[a + 'Manual'] = false; } else { S[a] = mv; S[a + 'Manual'] = true; } save(); refreshLive(); return; }
      if ((a = b.getAttribute('data-fill'))) {
        var cur = t(getPath(a)), val = b.getAttribute('data-v');
        setPath(a, a.indexOf('.title') > 0 ? (cur ? cur : val + '에서 ') : val); touch(); save(); render(true);
        var el = document.querySelector('[data-k="' + a + '"]'); if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* ignore */ } }
        return;
      }
      if (b.hasAttribute('data-theme')) {
        var n = +b.getAttribute('data-theme');
        if (b.checked) { if (S.chosen.indexOf(n) < 0) S.chosen.push(n); }
        else if (S.chosen.length > 3 || window.confirm('주제는 3개 이상 쓰기를 권합니다. 이 주제를 빼시겠습니까?')) S.chosen.splice(S.chosen.indexOf(n), 1);
        else b.checked = true;
        save(); render(true); return;
      }
      if (b.hasAttribute('data-self')) { var s = b.getAttribute('data-self').split('.'); S.self[s[0]] = S.self[s[0]] || []; S.self[s[0]][+s[1]] = b.checked; save(); return; }
      if (b.hasAttribute('data-share')) { S.share = b.checked; save(); render(true); if (S.share) push(); status(); return; }
      if (b.hasAttribute('data-sub')) { S.sub = +b.getAttribute('data-sub'); save(); render(); return; }
      if ((a = b.getAttribute('data-reset'))) { S[a + 'Edited'] = false; S[a] = a === 'first' ? firstSentence() : vowText(); save(); render(true); return; }
      if ((a = b.getAttribute('data-areset'))) { S.ansEdited[a] = false; delete S.ans[a]; save(); render(true); return; }
      if ((a = b.getAttribute('data-goexp'))) { S.step = 3; S.sub = chosen().indexOf(+a); save(); render(); return; }
      if ((a = b.getAttribute('data-copy-prompt'))) { copy(b.parentNode.querySelector('.prompt').textContent, '질문을 복사했습니다. ChatGPT에 붙여 넣습니다.'); return; }
      if (b.id === 'pdfBtn') { pdf(); return; }
      if (b.id === 'copyAll') { copy(noteText(), '답변노트를 복사했습니다.'); return; }
    };
  }
  function toggle(arr, v) { var i = arr.indexOf(v); if (i >= 0) arr.splice(i, 1); else arr.push(v); }

  // ---------- navigation ----------
  function renderNav() {
    var nav = $('stepNav'); if (!nav) return;
    nav.innerHTML = STEPS.map(function (s, i) {
      return '<button type="button" data-step="' + i + '"' + (i === S.step ? ' aria-current="step"' : '') + ' class="' + (stepDone(i) ? 'done' : '') + '"><span class="n">' + (stepDone(i) ? '✓' : i + 1) + '</span><span class="l">' + s[1] + '</span></button>';
    }).join('');
    var total = STEPS.filter(function (s, i) { return stepDone(i); }).length;
    $('progress').textContent = (S.step + 1) + '/' + STEPS.length + ' · ' + STEPS[S.step][0] + ' · 완료 ' + total + '단계';
    var list = chosen(), last = S.step === STEPS.length - 1;
    $('prev').style.visibility = S.step === 0 && !(S.step === 3 && S.sub > 0) ? 'hidden' : 'visible';
    $('next').textContent = S.step === 3 && S.sub < list.length - 1 ? '다음 경험 (주제 ' + list[S.sub + 1] + ')' : last ? '맨 위로' : '다음: ' + STEPS[S.step + 1][0];
  }
  function render(keepScroll) {
    var y = window.pageYOffset, stage = $('stage'), fns = [step0, step1, step2, step3, step4, step5, step6];
    stage.innerHTML = fns[S.step]();
    if (!S.showEx) stage.classList.add('noex'); else stage.classList.remove('noex');
    $('exToggle').textContent = S.showEx ? '한결 예시 숨기기' : '한결 예시 보기';
    bind(); refreshLive();
    if (keepScroll) window.scrollTo(0, y); else window.scrollTo(0, 0);
    if (S.step === 6) save();
  }
  function go(i) { S.step = Math.max(0, Math.min(STEPS.length - 1, i)); if (S.step !== 3) S.sub = 0; save(); render(); push(); }

  // ---------- output ----------
  function noteText() {
    var out = ['[면접노트[공무원]] ' + (trackLabel() || '')];
    out.push('대표 키워드: 가치관 ' + (S.mainV || '-') + ' · 강점 ' + (S.mainG || '-'));
    QUESTIONS.forEach(function (q) {
      out.push('');
      out.push('질문 ' + q.n + '. ' + q.title);
      if (q.exp) chosen().forEach(function (n) { var e = E(n); out.push('- 주제 ' + n + ' ' + t(e.title)); SENT.forEach(function (s) { if (t(e[s.k])) out.push('  ' + s.label + ': ' + t(e[s.k])); }); });
      else out.push(S.ansEdited[q.n] ? (S.ans[q.n] || '') : q.make());
    });
    out.push(''); out.push('⑥ 각오와 포부: ' + (S.vowEdited ? S.vow : vowText()));
    return out.join('\n');
  }
  function copy(text, ok) {
    function fail() { var fb = $('fallback'); if (!fb) return; fb.hidden = false; fb.value = text; fb.focus(); fb.select(); $('msg').textContent = '자동 복사가 막혔습니다. 아래 칸의 글을 길게 눌러 복사합니다.'; }
    try { navigator.clipboard.writeText(text).then(function () { var m = $('msg'); if (m) m.textContent = ok; }, fail); } catch (e) { fail(); }
  }
  function isKakao() { return /KAKAOTALK/i.test(navigator.userAgent); }
  function pdf() {
    var sh = $('sheet'), d = new Date(), rows = '';
    QUESTIONS.forEach(function (q) {
      var body = q.exp ? chosen().map(function (n) { var e = E(n); return '<p><b>주제 ' + n + ' ' + esc(t(e.title)) + '</b><br>' + SENT.map(function (s) { return esc(t(e[s.k])); }).filter(Boolean).join(' ') + '</p>'; }).join('')
        : '<p>' + esc(S.ansEdited[q.n] ? (S.ans[q.n] || '') : q.make()) + '</p>';
      rows += '<tr><th>' + q.n + '. ' + esc(q.title) + '</th><td>' + body + '</td></tr>';
    });
    sh.innerHTML = '<h1>면접노트[공무원]</h1><p class="meta">직렬 ' + esc(trackLabel() || '-') + ' · 대표 가치관 ' + esc(S.mainV || '-') + ' · 대표 강점 ' + esc(S.mainG || '-') + '</p>' +
      '<table>' + rows + '<tr><th>⑥ 각오와 포부</th><td><p>' + esc(S.vowEdited ? S.vow : vowText()) + '</p></td></tr></table>' +
      '<p class="src">' + esc(D.org) + ' ' + esc(D.course) + ' · 1일차 답변노트 · ' + d.getFullYear() + '.' + (d.getMonth() + 1) + '.' + d.getDate() + ' · 예시는 가상 예시입니다.</p>';
    $('msg').textContent = isKakao() ? '카카오톡 안에서는 인쇄 창이 열리지 않을 수 있습니다. 위의 「다른 브라우저로 열기」를 누릅니다.' : '인쇄 창에서 「PDF로 저장」을 고릅니다.';
    try { window.print(); } catch (e) { $('msg').textContent = '이 브라우저에서는 인쇄 창을 열 수 없습니다. 「답변노트 전체 복사」를 씁니다.'; }
  }

  // ---------- install ----------
  var installEvent = null;
  window.addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); installEvent = e; });
  function standalone() { return (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator.standalone === true; }
  function install() {
    var tx = $('installText'), ua = navigator.userAgent;
    if (installEvent) { installEvent.prompt(); installEvent.userChoice.then(function (c) { if (c && c.outcome === 'accepted') $('installBar').hidden = true; }); installEvent = null; return; }
    if (isKakao()) tx.textContent = '카카오톡 안에서는 설치할 수 없습니다. 「다른 브라우저로 열기」를 누른 뒤 다시 누릅니다.';
    else if (/iphone|ipad|ipod/i.test(ua)) tx.textContent = 'Safari 아래쪽 공유 단추를 누르고 「홈 화면에 추가」를 고릅니다. 설치하기 전에 쓴 글은 설치한 앱으로 옮겨지지 않으므로, 쓰기 전에 설치합니다.';
    else tx.textContent = '브라우저 메뉴(점 세 개)에서 「홈 화면에 추가」 또는 「앱 설치」를 고릅니다.';
  }
  function openExternal() {
    var url = location.href;
    if (/android/i.test(navigator.userAgent)) location.href = 'intent://' + url.replace(/^https?:\/\//, '') + '#Intent;scheme=https;package=com.android.chrome;end';
    else location.href = 'kakaotalk://web/openExternal?url=' + encodeURIComponent(url);
  }

  // ---------- start ----------
  function start() {
    SENT = D.sentences;
    var m = /[?&]c=([^&#]*)/.exec(location.search), code = m ? decodeURIComponent(m[1]).toLowerCase() : (lsGet('gm-class') || '');
    if (CODE_RE.test(code)) { CLASS = code; lsSet('gm-class', code); }
    CLASS_OK = !!CLASS && (D.classes || []).indexOf(CLASS) >= 0;
    load();
    $('app').hidden = false; $('loading').hidden = true;
    if (isKakao()) { $('inapp').hidden = false; $('openExt').onclick = openExternal; }
    if (!lsSet('gm-probe', '1')) $('noStore').hidden = false;
    $('installBar').hidden = standalone(); $('installBtn').onclick = install;
    $('exToggle').onclick = function () { S.showEx = !S.showEx; save(); render(true); };
    $('restart').onclick = function () {
      if (!window.confirm('쓴 글을 모두 지우고 처음부터 다시 씁니다. 지운 글은 되돌릴 수 없습니다.')) return;
      var keep = { alias: S.alias, share: S.share, sid: S.sid }; S = clone(BLANK); S.alias = keep.alias; S.share = keep.share; S.sid = keep.sid; save(); go(0);
    };
    $('stepNav').onclick = function (ev) { var b = ev.target.closest('[data-step]'); if (b) go(+b.getAttribute('data-step')); };
    $('prev').onclick = function () { if (S.step === 3 && S.sub > 0) { S.sub--; save(); render(); } else if (S.step === 4) { S.step = 3; S.sub = chosen().length - 1; save(); render(); } else go(S.step - 1); };
    $('next').onclick = function () { var l = chosen(); if (S.step === 3 && S.sub < l.length - 1) { S.sub++; save(); render(); push(); } else if (S.step === STEPS.length - 1) window.scrollTo(0, 0); else go(S.step + 1); };
    render(); status();
    window.addEventListener('pagehide', push);
  }
  function init() {
    fetch('/assets/gongmuwon/data.json', { cache: 'no-cache' }).then(function (r) { if (!r.ok) throw new Error(); return r.json(); })
      .then(function (d) { D = d; start(); })
      .catch(function () { $('loading').textContent = '자료를 불러오지 못했습니다. 인터넷 연결을 확인하고 화면을 새로 고칩니다.'; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
