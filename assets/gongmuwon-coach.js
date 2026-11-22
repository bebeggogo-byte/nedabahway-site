/* Coach screen for the civil-service interview answer note — /edu/gongmuwon/coach/
 * The password is checked by the database (gm_coach_* RPCs). Two views:
 *   - "학생별 컨설팅" (default): each student's note read as a whole and turned into
 *     consulting points, follow-up questions and a copyable memo, most-needed first.
 *   - "수업 화면에 띄우기": class-wide aggregates only (no names).
 * Analysis runs in the browser on the drafts the students chose to share.
 */
(function () {
  'use strict';
  var PASS_KEY = 'gm-coach-pass', pass = '', D = null, notes = [], nowMs = 0, view = 'students', timer = null;
  var STEP_NAMES = ['시작', '누구를 위해', '경험 고르기', '경험 쓰기', '키워드', '각오', '답변노트'];
  var SENT = ['s', 'role', 'act', 'res', 'mem', 'learn'];
  var SENT_KO = { s: '상황', role: '역할', act: '내가 한 일', res: '결과', mem: '기억에 남는 이유', learn: '배운 것' };
  var Q_TITLES = { 1: '자기소개', 2: '지원동기', 3: '직렬·기관이 하는 일', 5: '공직관·청렴', 6: '상황 질문', 7: '마지막 말' };

  function $(id) { return document.getElementById(id); }
  function esc(x) { return String(x == null ? '' : x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function t(x) { return (x || '').replace(/\s+/g, ' ').trim(); }
  function rpc(fn, args) {
    var url = window.__SUPABASE_URL__, key = window.__SUPABASE_ANON__;
    if (!url || !key) return Promise.reject(new Error('not_configured'));
    return fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, { method: 'POST', headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, body: JSON.stringify(args) })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  var REASON = { bad_password: '비밀번호가 맞지 않습니다.', locked: '비밀번호를 10번 틀려 잠겼습니다. 10분 뒤에 다시 입력합니다.', not_set: '강사 비밀번호가 아직 등록되지 않았습니다. Supabase SQL Editor에서 등록합니다.' };
  function lock(msg) { pass = ''; try { sessionStorage.removeItem(PASS_KEY); } catch (e) { /* ignore */ } $('lockForm').hidden = false; $('board').hidden = true; $('lockMsg').textContent = msg || ''; clearInterval(timer); }

  function login(p) {
    $('lockMsg').textContent = '확인하는 중입니다.';
    return rpc('gm_coach_classes', { p_pass: p }).then(function (d) {
      if (!d.ok) { lock(REASON[d.reason] || '열 수 없습니다.'); return; }
      pass = p; try { sessionStorage.setItem(PASS_KEY, p); } catch (e) { /* ignore */ }
      var sel = $('cls'), keep = sel.value || ((/[?&]c=([^&#]*)/.exec(location.search) || [])[1] || '');
      sel.innerHTML = d.classes.map(function (c) { return '<option value="' + esc(c.code) + '">' + esc(c.name) + ' (' + esc(c.code) + ') · ' + c.n + '명</option>'; }).join('');
      if (keep) sel.value = keep;
      $('lockForm').hidden = true; $('board').hidden = false; $('lockMsg').textContent = '';
      load();
      clearInterval(timer); timer = setInterval(function () { if (!document.hidden) load(); }, 20000);
    }, function () { lock('서버에 연결하지 못했습니다. 인터넷 연결을 확인합니다.'); });
  }
  function load() {
    var code = $('cls').value; if (!code) { $('result').innerHTML = '<p class="lead">등록된 반이 없습니다.</p>'; return; }
    return rpc('gm_coach_notes', { p_class: code, p_pass: pass }).then(function (d) {
      if (!d.ok) { lock(REASON[d.reason] || '열 수 없습니다.'); return; }
      notes = d.notes; nowMs = new Date(d.now).getTime(); render();
      var dt = new Date(); $('stamp').textContent = '불러온 시각 ' + dt.getHours() + ':' + (dt.getMinutes() < 10 ? '0' : '') + dt.getMinutes() + ' · 20초마다 새로 고칩니다.';
    }, function () { $('stamp').textContent = '불러오지 못했습니다. 「새로 고침」을 누릅니다.'; });
  }

  // ---------- per-student analysis ----------
  // For each student the note is read as a whole and turned into consulting points:
  //   must   - gaps that make an interview answer break down (fix first)
  //   polish - sentence-level fixes
  //   link   - checks across the whole note (keyword evidence, reused experiences, track fit)
  //   ask    - follow-up questions built from the student's own experiences, with
  //            whether the note already holds a sentence to answer them
  //   good   - what is already in place
  function chosen(d) { return (d.chosen || []).slice().sort(); }
  function exp(d, n) { return (d.exp || {})[n] || {}; }
  function sentences(x) { return (t(x).match(/[^.!?]+[.!?]*/g) || []).map(t).filter(Boolean); }
  // Interview countdown for a track with exam info, e.g. ' · 면접 D-5'.
  function examTag(tr) {
    if (!tr || !tr.exam) return '';
    var p = String(tr.exam.date).split('-'), now = new Date(), a = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    var n = Math.round((new Date(+p[0], +p[1] - 1, +p[2]) - a) / 86400000);
    return n > 0 ? ' · 면접 D-' + n : n === 0 ? ' · 면접 D-day' : '';
  }
  function trackOf(d) { var l = (D && D.tracks) || []; for (var i = 0; i < l.length; i++) if (l[i].id === d.track) return l[i]; return null; }
  function themeName(n) { var l = (D && D.themes) || []; for (var i = 0; i < l.length; i++) if (l[i].n === n) return l[i].name; return '주제 ' + n; }
  var TAIL = {
    1: '"업무가 너무 많아지면 어떻게 하겠어요?"', 2: '"그 해결 방안에 반대한 사람은 없었나요?"', 3: '"다시 한다면 무엇을 다르게 하겠어요?"',
    4: '"공무원이 되어 같은 일이 생기면 어떻게 하겠어요?"', 5: '"상사가 부당한 지시를 하면 어떻게 하겠어요?"'
  };
  function analyse(n) {
    var d = n.data || {}, list = chosen(d), tr = trackOf(d), at = d.ansText || {};
    var a = { must: [], polish: [], link: [], ask: [], good: [], longs: 0, filled: 0, slots: list.length * 6, blanks: [] };
    a.done = d.done || []; a.doneCount = a.done.filter(Boolean).length;
    a.mins = Math.max(0, Math.round((nowMs - new Date(n.updated_at).getTime()) / 60000));
    a.stuck = a.mins >= 8 && a.doneCount < 7;
    if (a.stuck) a.must.push(a.mins + '분 동안 저장이 없습니다. 지금 ' + STEP_NAMES[n.step] + ' 단계에서 멈춰 있습니다. 먼저 다가가 무엇이 막혔는지 묻습니다.');
    if (!d.track) a.must.push('직렬을 아직 고르지 않았습니다.');
    if (!t(d.q1) || !t(d.q2who) || !t(d.q2what)) a.must.push('"누구를 위해 일하는가"(질문 1·2)가 비어 있습니다. 지원동기와 각오가 이 문장에서 나오므로, 직렬별 "일이 향하는 사람" 표를 함께 짚습니다.');
    var written = list.filter(function (x) { return t(exp(d, x).title); });
    if (written.length < 3) a.must.push('고른 경험이 ' + written.length + '개뿐입니다. 장면 목록을 함께 짚으며 "이런 일 해 본 적 있어요?"라고 묻습니다.');
    var seen = {};
    list.forEach(function (x) {
      var e = exp(d, x), nm = '주제 ' + x + '(' + (t(e.title) || themeName(x)) + ')';
      SENT.forEach(function (k) { if (t(e[k])) a.filled++; sentences(e[k]).forEach(function (s) { if (s.length > 70) { a.longs++; a.polish.push(nm + ' ' + SENT_KO[k] + ': ' + s.length + '자 문장입니다. 숨이 차지 않게 둘로 나눕니다.'); } }); });
      if (t(e.title)) { if (seen[t(e.title)]) a.must.push('주제 ' + seen[t(e.title)] + '와 주제 ' + x + '에 같은 경험을 썼습니다. 한 경험은 한 주제에만 씁니다.'); seen[t(e.title)] = x; }
      if (t(e.title) && !t(e.act)) a.must.push(nm + ': "내가 한 일"이 비어 있습니다. 면접에서 가장 길게 말할 부분입니다. "가장 어려웠던 순간에 내가 직접 한 행동은?"을 묻습니다.');
      else if (t(e.act) && !/저는|제가/.test(e.act)) a.must.push(nm + ': "내가 한 일"에 "저는"이 없습니다. 조가 한 일인지 내가 한 일인지 확인합니다.');
      else if (t(e.act) && t(e.act).length < 25) a.polish.push(nm + ': "내가 한 일"이 한 줄로 짧습니다(' + t(e.act).length + '자). "그다음엔 무엇을 했어요?"로 한 단계 더 꺼냅니다.');
      if (t(e.act) && !t(e.learn)) a.must.push(nm + ': "배운 것"이 비어 있습니다. 꼬리질문 "다시 한다면?"에 답할 문장이 없습니다.');
      if (t(e.act) && !t(e.res)) a.polish.push(nm + ': "결과"가 비어 있습니다. 그 뒤 무엇이 달라졌는지 묻습니다.');
      else if (t(e.res) && !/\d|["“”']|라고|고 (말|하)/.test(e.res)) a.polish.push(nm + ': 결과에 숫자나 들은 말이 없습니다. 있으면 하나 넣게 합니다.');
      SENT.forEach(function (k) { var v = t(e[k]); if (v && /다\.?$/.test(v) && !/니다\.?$/.test(v)) a.polish.push(nm + ' ' + SENT_KO[k] + ': 반말로 끝납니다. 「~했습니다」로 바꿉니다.'); });
      if (t(e.act)) {
        var ready = !!t(e.learn) || !!t(e.mem);
        a.ask.push({ q: '주제 ' + x + ' 「' + (t(e.title) || themeName(x)) + '」 → ' + TAIL[x], ready: ready, hint: ready ? '답할 문장: ' + (t(e.learn) || t(e.mem)) : '답할 문장이 없습니다. 배운 것을 먼저 쓰게 합니다.' });
      }
    });
    // checks across the whole note
    if (a.done[3] && (!d.mainG || !d.mainV)) a.must.push('대표 키워드를 정하지 않았습니다. 자기소개 첫 문장이 비어 있게 됩니다. 표시한 단어를 같이 세어 줍니다.');
    ['mainG', 'mainV'].forEach(function (key) {
      if (!d[key]) return; var src = key === 'mainG' ? d.kg : d.kv, ev = list.filter(function (x) { return (src && src[x] || []).indexOf(d[key]) >= 0; });
      if (ev.length === 1) a.link.push('대표 ' + (key === 'mainG' ? '강점' : '가치관') + ' "' + d[key] + '"의 근거 경험이 주제 ' + ev[0] + ' 하나뿐입니다. 꼬리질문 "다른 경험도 있나요?"에 대비해 다른 경험에서도 찾게 합니다.');
      else if (ev.length >= 2) a.good.push('대표 ' + (key === 'mainG' ? '강점' : '가치관') + ' "' + d[key] + '"을(를) 경험 ' + ev.length + '개(주제 ' + ev.join('·') + ')가 뒷받침합니다.');
    });
    var used = {}; [1, 5, 6].forEach(function (q) { var m = t(at[q] || ''); list.forEach(function (x) { var s = t(exp(d, x).act); if (s && m.indexOf(s.slice(0, 20)) >= 0) used[x] = (used[x] || []).concat([Q_TITLES[q]]); }); });
    Object.keys(used).forEach(function (x) { if (used[x].length >= 3) a.link.push('주제 ' + x + ' 경험이 ' + used[x].join('·') + ' 답에 모두 들어갑니다. 공직관 답에는 규칙을 지킨 경험(주제 5)을 쓰도록 권합니다.'); });
    if (tr && (tr.id === 'nat-admin' || tr.id === 'army-admin')) {
      var e1 = exp(d, 1), txt1 = [e1.title, e1.s, e1.act].join(' ');
      if (t(e1.title) && !/자격|준비|공부|수업|실습|교육|과정/.test(txt1)) a.link.push('국가직 경험면접은 "직무를 위해 준비한 노력"을 묻습니다. 주제 1이 직무 준비와 이어지는지 확인합니다(전공 수업·자격증·활동).');
    }
    var vow = t(d.vow);
    if (vow && d.q3who && vow.indexOf(t(d.q3who).replace(/[을를]$/, '')) < 0) a.link.push('각오 문단을 직접 고쳐 질문 3의 "누구"가 빠졌습니다. 공무원이 되어 누구를 위해 일할지가 남아 있는지 확인합니다.');
    // answer note
    Object.keys(at).forEach(function (q) { ((at[q] || '').match(/\[빈칸: [^\]]+\]/g) || []).forEach(function (b) { a.blanks.push(Q_TITLES[q] + ': ' + b.slice(5, -1)); }); });
    if (a.blanks.length) a.polish.push('답변노트 빈칸 ' + a.blanks.length + '개: ' + a.blanks.slice(0, 5).join(', ') + (a.blanks.length > 5 ? ' 외' : '') + '.');
    var intro = t((at[1] || '').replace(/\[빈칸: [^\]]+\]/g, ''));
    if (intro.length > 156) a.polish.push('자기소개가 ' + intro.length + '자입니다. 30초(약 120자)에 맞게 장면 문장부터 줄입니다.');
    var self = 0, selfMax = 0; Object.keys(d.self || {}).forEach(function (q) { (d.self[q] || []).forEach(function (v) { selfMax++; if (v) self++; }); });
    a.self = self;
    if (a.doneCount >= 6 && self < 6) a.polish.push('답변노트 자기 체크를 ' + self + '개만 했습니다. 소리 내어 읽고 체크 3칸을 확인하게 합니다.');
    // track questions
    if (tr && tr.situation && tr.situation[0]) a.ask.push({ q: '상황 질문(제안): "' + tr.situation[0] + '"', ready: !!t(at[6]) && !/\[빈칸/.test(at[6] || ''), hint: '답 순서: ' + tr.situation[1] });
    (tr && tr.expect || []).slice(0, 2).forEach(function (q) { a.ask.push({ q: '직렬 예상 질문(제안): "' + q + '"', ready: null, hint: '' }); });
    if (written.length >= 3 && list.every(function (x) { return !t(exp(d, x).title) || (t(exp(d, x).act) && /저는|제가/.test(exp(d, x).act) && t(exp(d, x).learn)); })) a.good.push('고른 경험마다 "저는"으로 시작하는 행동과 배운 것이 있습니다.');
    if (d.first && d.mainG && d.first.indexOf(d.mainG) >= 0) a.good.push('첫 문장에 대표 강점이 들어 있습니다.');
    a.score = a.must.length * 3 + a.link.length * 2 + a.polish.length;
    a.level = a.must.length ? '우선 컨설팅' : a.link.length || a.polish.length > 2 ? '다듬기' : '꼬리질문 연습';
    return a;
  }
  function count(map, w) { if (w) map[w] = (map[w] || 0) + 1; }
  function ranked(map) { return Object.keys(map).map(function (w) { return { w: w, n: map[w] }; }).sort(function (a, b) { return b.n - a.n || (a.w < b.w ? -1 : 1); }); }
  function bars(list, total, max, unit) {
    if (!list.length) return '<p class="q">아직 기록이 없습니다.</p>';
    return '<ol class="rank">' + list.slice(0, max || 8).map(function (x) {
      return '<li><span>' + esc(x.w) + '</span><span class="track"><span class="fill2" style="width:' + (total ? Math.round(x.n / total * 100) : 0) + '%"></span></span><span class="num2">' + x.n + (unit || '명') + '</span></li>';
    }).join('') + '</ol>';
  }

  // ---------- views ----------
  function board() {
    var n = notes.length, stepMap = {}, mg = {}, mv = {}, allG = {}, allV = {}, tr = {}, done = 0, exps = 0;
    STEP_NAMES.forEach(function (s) { stepMap[s] = 0; });
    notes.forEach(function (x) {
      var d = x.data || {}, a = analyse(x);
      stepMap[STEP_NAMES[x.step] || '시작']++; done += a.doneCount; count(tr, x.track || '미정');
      count(mg, d.mainG); count(mv, d.mainV);
      chosen(d).forEach(function (k) { (d.kg && d.kg[k] || []).forEach(function (w) { count(allG, w); }); (d.kv && d.kv[k] || []).forEach(function (w) { count(allV, w); }); if (t(exp(d, k).act)) exps++; });
    });
    var stepList = STEP_NAMES.map(function (s) { return { w: s, n: stepMap[s] }; });
    var h = '<div class="big"><div class="stats">' +
      '<div class="stat"><div class="k">공유한 학생</div><div class="v">' + n + '<small>명</small></div></div>' +
      '<div class="stat"><div class="k">평균 완료 단계</div><div class="v">' + (n ? (done / n).toFixed(1) : '-') + '<small>/ 7</small></div></div>' +
      '<div class="stat"><div class="k">"내가 한 일"을 쓴 경험</div><div class="v">' + exps + '<small>개</small></div></div>' +
      '<div class="stat"><div class="k">대표 키워드를 정한 학생</div><div class="v">' + notes.filter(function (x) { return x.data && x.data.mainG && x.data.mainV; }).length + '<small>명</small></div></div></div>';
    h += '<div class="field"><h2>지금 어느 단계에 있나요</h2>' + bars(stepList, n, 7) + '</div>';
    h += '<div class="cols"><div class="field"><h2>대표 강점</h2>' + bars(ranked(mg), n) + '</div><div class="field"><h2>대표 가치관</h2>' + bars(ranked(mv), n) + '</div></div>';
    h += '<div class="cols"><div class="field"><h2>표시한 강점 단어 (전체 표시 횟수)</h2>' + bars(ranked(allG), Math.max.apply(null, [1].concat(ranked(allG).map(function (x) { return x.n; }))), 8, '번') + '</div><div class="field"><h2>표시한 가치관 단어 (전체 표시 횟수)</h2>' + bars(ranked(allV), Math.max.apply(null, [1].concat(ranked(allV).map(function (x) { return x.n; }))), 8, '번') + '</div></div>';
    h += '<div class="field"><h2>직렬</h2>' + bars(ranked(tr), n) + '</div></div>';
    return h;
  }
  function list(items, cls) { return items.length ? '<ul class="tips ' + (cls || '') + '">' + items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul>' : ''; }
  function students() {
    if (!notes.length) return '<p class="lead">아직 공유한 학생이 없습니다. 학생 화면 첫 단계에서 「강사님과 답변노트를 공유합니다」를 체크하면 여기에 나옵니다.</p>';
    var rows = notes.map(function (x) { return { x: x, a: analyse(x) }; }).sort(function (p, q) { return q.a.score - p.a.score || (p.x.alias < q.x.alias ? -1 : 1); });
    var lv = { '우선 컨설팅': 0, '다듬기': 0, '꼬리질문 연습': 0 }; rows.forEach(function (r) { lv[r.a.level]++; });
    var h = '<div class="box"><p><b>컨설팅 순서</b> · 우선 컨설팅 ' + lv['우선 컨설팅'] + '명 · 다듬기 ' + lv['다듬기'] + '명 · 꼬리질문 연습 ' + lv['꼬리질문 연습'] + '명</p><p class="q">도움이 가장 많이 필요한 학생이 위에 옵니다. 학생마다 이 학생의 글 전체를 엮어 본 결과입니다.</p></div>';
    return h + rows.map(function (r) {
      var x = r.x, a = r.a, d = x.data || {}, cl = chosen(d), at = d.ansText || {};
      var bar = '<div class="bar7" aria-label="단계 진행">' + STEP_NAMES.map(function (s, i) { return '<i class="' + (a.done[i] ? 'ok' : '') + (i === x.step ? ' now' : '') + '" title="' + s + '"></i>'; }).join('') + '</div>';
      var asks = a.ask.length ? '<div class="sec"><p class="sech">이 학생에게 물어볼 꼬리질문</p><ul class="asks">' + a.ask.map(function (q) {
        return '<li><span class="' + (q.ready === false ? 'no' : q.ready ? 'yes' : '') + '">' + (q.ready === false ? '답 없음' : q.ready ? '답 있음' : '확인') + '</span>' + esc(q.q) + (q.hint ? '<br><small>' + esc(q.hint) + '</small>' : '') + '</li>';
      }).join('') + '</ul></div>' : '';
      var full = '<details><summary>이 학생의 답변노트 전체 보기</summary>' +
        '<p><b>질문 1·2</b> 공무원은 ' + esc(t(d.q1) || '-') + '을(를) 위해 일한다 · ' + esc(t(d.q2who) || '-') + '이(가) ' + esc(t(d.q2what) || '-') + ' 수 있게</p>' +
        cl.map(function (k) { var e = exp(d, k); return '<p><b>주제 ' + k + ' ' + esc(t(e.title) || '') + '</b><br>' + SENT.map(function (s) { return t(e[s]) ? SENT_KO[s] + ': ' + esc(e[s]) : ''; }).filter(Boolean).join('<br>') + '</p>'; }).join('') +
        Object.keys(at).map(function (q) { return '<p><b>' + esc(Q_TITLES[q]) + '</b><br>' + esc(at[q]) + '</p>'; }).join('') +
        '<p><b>각오와 포부</b><br>' + esc(t(d.vow) || '-') + '</p></details>';
      return '<div class="stu' + (a.must.length ? ' stuck' : '') + '"><h3><span>' + esc(x.alias) + ' <em class="lv lv' + ['우선 컨설팅', '다듬기', '꼬리질문 연습'].indexOf(a.level) + '">' + a.level + '</em></span><small>' + esc(x.track || '직렬 미정') + examTag(trackOf(d)) + ' · ' + STEP_NAMES[x.step] + ' · ' + a.mins + '분 전 저장</small></h3>' + bar +
        '<div class="kv"><span>경험 <b>' + cl.filter(function (k) { return t(exp(d, k).title); }).length + '/' + cl.length + '</b></span><span>여섯 문장 <b>' + a.filled + '/' + a.slots + '</b></span><span>대표 강점 <b>' + esc(d.mainG || '-') + '</b></span><span>대표 가치관 <b>' + esc(d.mainV || '-') + '</b></span></div>' +
        (t(d.first) ? '<p class="q">첫 문장: ' + esc(d.first) + '</p>' : '') +
        (a.must.length ? '<div class="sec"><p class="sech must">우선 컨설팅</p>' + list(a.must, 'must') + '</div>' : '') +
        (a.link.length ? '<div class="sec"><p class="sech">엮어 보기 (글 전체 점검)</p>' + list(a.link) + '</div>' : '') +
        (a.polish.length ? '<div class="sec"><p class="sech">문장 다듬기</p>' + list(a.polish.slice(0, 8), 'soft') + (a.polish.length > 8 ? '<p class="q">외 ' + (a.polish.length - 8) + '개</p>' : '') + '</div>' : '') +
        asks + (a.good.length ? '<div class="sec"><p class="sech good">잘된 점</p>' + list(a.good, 'goodl') + '</div>' : '') + full +
        '<div class="btns"><button type="button" class="btn sm" data-copy1="' + esc(x.id) + '">이 학생 컨설팅 메모 복사</button><button type="button" class="btn sm" data-del="' + esc(x.id) + '" data-alias="' + esc(x.alias) + '">이 기록 지우기</button></div></div>';
    }).join('');
  }
  function memo(x) {
    var d = x.data || {}, a = analyse(x);
    return '[' + x.alias + ' · ' + (x.track || '-') + '] ' + a.level + '\n대표 키워드: ' + (d.mainV || '-') + ' / ' + (d.mainG || '-') + '\n첫 문장: ' + (t(d.first) || '-') +
      (a.must.length ? '\n우선 컨설팅:\n- ' + a.must.join('\n- ') : '') + (a.link.length ? '\n엮어 보기:\n- ' + a.link.join('\n- ') : '') +
      (a.ask.length ? '\n꼬리질문:\n- ' + a.ask.map(function (q) { return q.q + (q.ready === false ? ' (답 없음)' : ''); }).join('\n- ') : '');
  }
  function shareText() { return '[1일차 컨설팅 공유표] ' + $('cls').value + '\n\n' + notes.map(memo).join('\n\n'); }
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) { b.className = 'btn sm' + (b.getAttribute('data-view') === view ? ' pri' : ''); });
    $('result').innerHTML = view === 'board' ? board() : students();
  }

  function copyText(txt, okMsg) { var m = $('copyMsg'); try { navigator.clipboard.writeText(txt).then(function () { m.textContent = okMsg; }, function () { m.textContent = '자동 복사가 막혔습니다.'; }); } catch (e) { m.textContent = '자동 복사가 막혔습니다.'; } }
  function init() {
    $('lockForm').onsubmit = function (e) { e.preventDefault(); if ($('pw').value) login($('pw').value); };
    $('cls').onchange = load;
    $('reload').onclick = load;
    $('logout').onclick = function () { $('pw').value = ''; lock(''); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) { b.onclick = function () { view = b.getAttribute('data-view'); render(); }; });
    $('copyShare').onclick = function () { copyText(shareText(), '공유표를 복사했습니다. 단톡방에 붙여 넣습니다.'); };
    fetch('/assets/gongmuwon/data.json', { cache: 'no-cache' }).then(function (r) { return r.json(); }).then(function (d) { D = d; if (notes.length) render(); }, function () { /* track questions are optional */ });
    $('result').onclick = function (ev) {
      var c = ev.target.closest('[data-copy1]');
      if (c) { var who = notes.filter(function (x) { return x.id === c.getAttribute('data-copy1'); })[0]; if (who) copyText(memo(who), '「' + who.alias + '」 컨설팅 메모를 복사했습니다.'); return; }
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!window.confirm('「' + b.getAttribute('data-alias') + '」 학생의 공유 기록을 지웁니다. 학생 기기에 저장된 글은 그대로 남습니다.')) return;
      rpc('gm_coach_delete', { p_class: $('cls').value, p_device: b.getAttribute('data-del'), p_pass: pass }).then(load);
    };
    var saved = ''; try { saved = sessionStorage.getItem(PASS_KEY) || ''; } catch (e) { /* ignore */ }
    if (saved) login(saved);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
