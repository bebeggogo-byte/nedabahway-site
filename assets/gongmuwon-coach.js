/* Coach screen for the civil-service interview answer note — /edu/gongmuwon/coach/
 * The password is checked by the database (gm_coach_* RPCs). Two views:
 *   - "화면에 띄우기": class-wide aggregates only (no names), for the classroom screen.
 *   - "학생별 분석": one card per student with progress, gaps, rule-based coaching tips
 *     and the full answer note.
 * Analysis runs in the browser on the drafts the students chose to share.
 */
(function () {
  'use strict';
  var PASS_KEY = 'gm-coach-pass', pass = '', D = null, notes = [], nowMs = 0, view = 'board', timer = null;
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

  // ---------- analysis ----------
  function chosen(d) { return (d.chosen || []).slice().sort(); }
  function exp(d, n) { return (d.exp || {})[n] || {}; }
  function sentences(x) { return (t(x).match(/[^.!?]+[.!?]*/g) || []).map(t).filter(Boolean); }
  function analyse(n) {
    var d = n.data || {}, list = chosen(d), a = { tips: [], longs: 0, filled: 0, slots: list.length * 6, blanks: [], self: 0, selfMax: 0 };
    a.done = d.done || [];
    a.doneCount = a.done.filter(Boolean).length;
    a.mins = Math.max(0, Math.round((nowMs - new Date(n.updated_at).getTime()) / 60000));
    a.stuck = a.mins >= 8 && a.doneCount < 7;
    if (!d.track) a.tips.push('직렬을 아직 고르지 않았습니다.');
    if (!t(d.q1) || !t(d.q2who) || !t(d.q2what)) a.tips.push('질문 1·2(누구를 위해 일하는가)가 비어 있습니다. 직렬별 "일이 향하는 사람" 표를 함께 짚습니다.');
    var titled = list.filter(function (x) { return t(exp(d, x).title); });
    if (titled.length < 3) a.tips.push('경험 한 줄 기록이 ' + titled.length + '개입니다. 장면 목록을 함께 짚으며 "이런 일 해 본 적 있어요?"라고 묻습니다.');
    var seen = {};
    list.forEach(function (x) {
      var e = exp(d, x);
      SENT.forEach(function (k) { if (t(e[k])) a.filled++; sentences(e[k]).forEach(function (s) { if (s.length > 70) a.longs++; }); });
      if (t(e.title)) { if (seen[t(e.title)]) a.tips.push('주제 ' + seen[t(e.title)] + '와 주제 ' + x + '에 같은 경험을 썼습니다. 한 경험은 한 주제에만 씁니다.'); seen[t(e.title)] = x; }
      if (t(e.title) && !t(e.act)) a.tips.push('주제 ' + x + ': "내가 한 일"이 비어 있습니다. "가장 어려웠던 순간에 내가 직접 한 행동은?"을 묻습니다.');
      else if (t(e.act) && !/저는|제가/.test(e.act)) a.tips.push('주제 ' + x + ': "내가 한 일"에 "저는"이 없습니다. 조가 한 일인지, 내가 한 일인지 확인합니다.');
      if (t(e.act) && !t(e.learn)) a.tips.push('주제 ' + x + ': "배운 것"이 비어 있습니다. 꼬리질문 "다시 한다면?"에 답할 문장이 없습니다.');
    });
    if (a.longs) a.tips.push('숨이 찰 만큼 긴 문장(70자 넘음)이 ' + a.longs + '개 있습니다.');
    if (a.done[3] && (!d.mainG || !d.mainV)) a.tips.push('대표 키워드를 아직 정하지 않았습니다. 표시한 단어를 같이 세어 줍니다.');
    var at = d.ansText || {};
    Object.keys(at).forEach(function (q) {
      var m = (at[q] || '').match(/\[빈칸: [^\]]+\]/g) || [];
      m.forEach(function (b) { a.blanks.push(Q_TITLES[q] + ': ' + b.slice(5, -1)); });
    });
    var intro = t((at[1] || '').replace(/\[빈칸: [^\]]+\]/g, ''));
    if (intro.length > 156) a.tips.push('자기소개가 ' + intro.length + '자입니다. 30초(약 120자)에 맞게 장면 문장부터 줄입니다.');
    Object.keys(d.self || {}).forEach(function (q) { (d.self[q] || []).forEach(function (v) { a.selfMax++; if (v) a.self++; }); });
    if (!a.tips.length && !a.blanks.length) a.tips.push({ good: '기본 형태를 갖췄습니다. 꼬리질문 3단("반대한 사람은?" → "다시 한다면?" → "공직에서 같은 일이 생기면?")으로 확인합니다.' });
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
  function students() {
    if (!notes.length) return '<p class="lead">아직 공유한 학생이 없습니다. 학생 화면 첫 단계에서 「강사님과 공유합니다」를 누르면 여기에 나옵니다.</p>';
    var order = notes.slice().sort(function (x, y) { return (analyse(y).stuck ? 1 : 0) - (analyse(x).stuck ? 1 : 0) || (x.alias < y.alias ? -1 : 1); });
    return '<p class="q">카드 테두리가 주황색이면 8분 넘게 저장이 없고 아직 끝나지 않은 학생입니다. 먼저 다가갑니다.</p>' + order.map(function (x) {
      var d = x.data || {}, a = analyse(x), list = chosen(d), at = d.ansText || {};
      var bar = '<div class="bar7" aria-label="단계 진행">' + STEP_NAMES.map(function (s, i) { return '<i class="' + (a.done[i] ? 'ok' : '') + (i === x.step ? ' now' : '') + '" title="' + s + '"></i>'; }).join('') + '</div>';
      var tips = '<ul class="tips">' + a.tips.map(function (tp) { return typeof tp === 'string' ? '<li>' + esc(tp) + '</li>' : '<li class="good">' + esc(tp.good) + '</li>'; }).join('') +
        (a.blanks.length ? '<li>답변노트 빈칸 ' + a.blanks.length + '개: ' + esc(a.blanks.slice(0, 6).join(', ')) + (a.blanks.length > 6 ? ' 외' : '') + '</li>' : '') + '</ul>';
      var full = '<details><summary>답변노트 전체 보기</summary>' +
        '<p><b>질문 1·2</b> 공무원은 ' + esc(t(d.q1) || '-') + '을(를) 위해 일한다 · ' + esc(t(d.q2who) || '-') + '이(가) ' + esc(t(d.q2what) || '-') + ' 수 있게</p>' +
        list.map(function (k) { var e = exp(d, k); return '<p><b>주제 ' + k + ' ' + esc(t(e.title) || '') + '</b><br>' + SENT.map(function (s) { return t(e[s]) ? SENT_KO[s] + ': ' + esc(e[s]) : ''; }).filter(Boolean).join('<br>') + '</p>'; }).join('') +
        Object.keys(at).map(function (q) { return '<p><b>' + esc(Q_TITLES[q]) + '</b><br>' + esc(at[q]) + '</p>'; }).join('') +
        '<p><b>각오와 포부</b><br>' + esc(t(d.vow) || '-') + '</p></details>';
      return '<div class="stu' + (a.stuck ? ' stuck' : '') + '"><h3><span>' + esc(x.alias) + '</span><small>' + esc(x.track || '직렬 미정') + ' · ' + STEP_NAMES[x.step] + ' · ' + a.mins + '분 전 저장</small></h3>' + bar +
        '<div class="kv"><span>경험 <b>' + list.filter(function (k) { return t(exp(d, k).title); }).length + '/' + list.length + '</b></span><span>여섯 문장 채움 <b>' + a.filled + '/' + a.slots + '</b></span><span>대표 강점 <b>' + esc(d.mainG || '-') + '</b></span><span>대표 가치관 <b>' + esc(d.mainV || '-') + '</b></span><span>자기 체크 <b>' + a.self + '/' + (a.selfMax || 18) + '</b></span></div>' +
        (t(d.first) ? '<p class="q">첫 문장: ' + esc(d.first) + '</p>' : '') + tips + full +
        '<div class="btns"><button type="button" class="btn sm" data-del="' + esc(x.id) + '" data-alias="' + esc(x.alias) + '">이 기록 지우기</button></div></div>';
    }).join('');
  }
  function shareText() {
    return '[1일차 답변노트 공유표] ' + $('cls').value + '\n' + notes.map(function (x) {
      var d = x.data || {};
      return '- ' + x.alias + ' · ' + (x.track || '-') + ' · 대표 키워드 ' + (d.mainV || '-') + '/' + (d.mainG || '-') + '\n  첫 문장: ' + (t(d.first) || '-') + '\n  경험: ' + chosen(d).map(function (k) { return k + '.' + (t(exp(d, k).title) || '-'); }).join(' / ');
    }).join('\n');
  }
  function render() {
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) { b.className = 'btn sm' + (b.getAttribute('data-view') === view ? ' pri' : ''); });
    $('result').innerHTML = view === 'board' ? board() : students();
  }

  function init() {
    $('lockForm').onsubmit = function (e) { e.preventDefault(); if ($('pw').value) login($('pw').value); };
    $('cls').onchange = load;
    $('reload').onclick = load;
    $('logout').onclick = function () { $('pw').value = ''; lock(''); };
    Array.prototype.forEach.call(document.querySelectorAll('[data-view]'), function (b) { b.onclick = function () { view = b.getAttribute('data-view'); render(); }; });
    $('copyShare').onclick = function () {
      var txt = shareText(), m = $('copyMsg');
      try { navigator.clipboard.writeText(txt).then(function () { m.textContent = '공유표를 복사했습니다. 단톡방에 붙여 넣습니다.'; }, function () { m.textContent = '자동 복사가 막혔습니다.'; }); } catch (e) { m.textContent = '자동 복사가 막혔습니다.'; }
    };
    $('result').onclick = function (ev) {
      var b = ev.target.closest('[data-del]'); if (!b) return;
      if (!window.confirm('「' + b.getAttribute('data-alias') + '」 학생의 공유 기록을 지웁니다. 학생 기기에 저장된 글은 그대로 남습니다.')) return;
      rpc('gm_coach_delete', { p_class: $('cls').value, p_device: b.getAttribute('data-del'), p_pass: pass }).then(load);
    };
    var saved = ''; try { saved = sessionStorage.getItem(PASS_KEY) || ''; } catch (e) { /* ignore */ }
    if (saved) login(saved);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
