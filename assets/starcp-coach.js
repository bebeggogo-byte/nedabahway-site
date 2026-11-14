/* STARCP coach screen — /diagnosis/starcp/coach/
 * The browser never reads the tables. It sends the coach password to the
 * starcp_coach_* RPCs; the database checks it and returns aggregates only.
 * The password is kept in sessionStorage for this tab so a reload during a
 * consulting session does not ask again.
 */
(function () {
  'use strict';
  var PASS_KEY = 'starcp-coach-pass';
  var pass = '';
  var last = null;

  function $(id) { return document.getElementById(id); }
  function esc(x) { return String(x).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function jong(w) { w = (w || '').trim(); if (!w) return 0; var c = w.charCodeAt(w.length - 1); if (c < 0xAC00 || c > 0xD7A3) return 0; return (c - 0xAC00) % 28; }
  function eul(w) { return w + (jong(w) ? '을' : '를'); }
  function eun(w) { return w + (jong(w) ? '은' : '는'); }
  function pct(a, n) { return n ? Math.round(a / n * 100) : 0; }

  function rpc(fn, args) {
    var url = window.__SUPABASE_URL__, key = window.__SUPABASE_ANON__;
    if (!url || !key) return Promise.reject(new Error('not_configured'));
    return fetch(url.replace(/\/$/, '') + '/rest/v1/rpc/' + fn, {
      method: 'POST',
      headers: { apikey: key, Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify(args)
    }).then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); });
  }
  var REASON = {
    bad_password: '비밀번호가 맞지 않습니다.',
    locked: '비밀번호를 10번 틀려 잠겼습니다. 10분 뒤에 다시 입력합니다.',
    not_set: '강사 비밀번호가 아직 등록되지 않았습니다. Supabase SQL Editor에서 등록합니다.'
  };
  function lockMsg(t) { $('lockMsg').textContent = t; }
  function showLock(t) {
    pass = ''; try { sessionStorage.removeItem(PASS_KEY); } catch (e) { /* ignore */ }
    $('lockForm').hidden = false; $('board').hidden = true; lockMsg(t || '');
  }

  function login(p) {
    lockMsg('확인하는 중입니다.');
    return rpc('starcp_coach_courses', { p_pass: p }).then(function (d) {
      if (!d.ok) { showLock(REASON[d.reason] || '열 수 없습니다.'); return; }
      pass = p; try { sessionStorage.setItem(PASS_KEY, p); } catch (e) { /* ignore */ }
      var sel = $('course'), keep = sel.value || (/[?&]c=([^&#]*)/.exec(location.search) || [])[1] || '';
      sel.innerHTML = '';
      d.courses.forEach(function (c) {
        var o = document.createElement('option'); o.value = c.code;
        o.textContent = c.name + ' (' + c.code + ') · ' + c.n + '명'; sel.appendChild(o);
      });
      if (keep && d.courses.some(function (c) { return c.code === keep; })) sel.value = keep;
      $('lockForm').hidden = true; $('board').hidden = false; lockMsg('');
      return loadSummary();
    }, function () { showLock('서버에 연결하지 못했습니다. 인터넷 연결을 확인합니다.'); });
  }
  function loadSummary() {
    var code = $('course').value;
    if (!code) { $('result').innerHTML = '<p class="lead">등록된 과정이 없습니다.</p>'; return; }
    $('result').innerHTML = '<p class="lead">집계를 불러오는 중입니다.</p>';
    return rpc('starcp_coach_summary', { p_course: code, p_pass: pass }).then(function (d) {
      if (!d.ok) { showLock(REASON[d.reason] || '열 수 없습니다.'); return; }
      last = d; render(d);
    }, function () { $('result').innerHTML = '<p class="msg err">집계를 불러오지 못했습니다. 「새로 고침」을 누릅니다.</p>'; });
  }

  function rank(list, n) {
    if (!list.length) return '<p class="lead">기록이 없습니다.</p>';
    return '<ol class="rank">' + list.map(function (x) {
      return '<li><span>' + esc(x.word) + '</span><span class="track"><span class="fill" style="width:' + pct(x.count, n) + '%"></span></span><span class="num">' + x.count + '명</span></li>';
    }).join('') + '</ol>';
  }
  function stat(k, v, unit) { return '<div class="stat"><div class="k">' + k + '</div><div class="v">' + v + (unit ? ' <small>' + unit + '</small>' : '') + '</div></div>'; }
  // The report names a word only when two or more people chose it (the top word is always named).
  function words(list) { return list.filter(function (x, i) { return i === 0 || x.count >= 2; }).map(function (x) { return x.word + '(' + x.count + '명)'; }).join(', '); }

  // Report paragraph: facts first, interpretation last.
  function report(d) {
    var name = d.name || d.course;
    if (!d.n) return '「' + name + '」 과정에는 아직 완성 기록이 없습니다.';
    var s = '「' + name + '」 과정에서 ' + d.n + '명이 STARCP 자기소개서 작성 도구로 초안을 완성했습니다. ';
    s += '참여자는 자동 검사 5개 항목 가운데 평균 ' + d.avg_checks + '개를 통과했습니다.';
    if (d.masked) return s + ' 참여 인원이 5명 미만이므로 단어 선택과 분량 분포는 싣지 않습니다.';
    var okPct = pct(d.st_ok_count, d.n), v1 = d.top_values[0], g1 = d.top_strengths[0];
    s += ' 상황·과제 분량을 전체의 25% 이하로 쓴 참여자는 ' + d.st_ok_count + '명(' + okPct + '%)이고, 행동·결과 분량은 평균 ' + d.avg_ar + '%입니다. ';
    s += '참여자가 대표 핵심가치로 가장 많이 고른 단어는 ' + words(d.top_values.slice(0, 3)) + '이고, 대표 강점으로 가장 많이 고른 단어는 ' + words(d.top_strengths.slice(0, 3)) + '입니다. ';
    if (d.distinct_words.length) s += '다른 과정보다 이 과정에서 많이 나온 단어는 ' + d.distinct_words.map(function (x) { return x.word + '(' + x.share + '%, 다른 과정 ' + x.other_share + '%)'; }).join(', ') + '입니다. ';
    s += okPct >= 60
      ? '이 수치는 참여자 다수가 상황 설명을 줄이고 자신이 한 행동과 결과를 중심으로 썼다는 점을 보여 줍니다. '
      : '이 수치는 상황 설명이 긴 참여자가 많다는 점을 보여 줍니다. 다음 회차에서는 상황과 과제를 각각 한 문장으로 줄이는 연습이 필요합니다. ';
    s += '이 과정의 참여자는 일하는 기준으로 ' + eul(v1.word) + ', 일하는 방식으로 ' + eul(g1.word) + ' 가장 많이 꼽았습니다.';
    return s;
  }

  function render(d) {
    var h = '<div class="stats">' + stat('참여 인원', d.n, '명') + stat('평균 자동 검사 통과', d.n ? d.avg_checks : '-', '/ 5개');
    if (!d.masked) h += stat('평균 글자 수', d.avg_chars, '자') + stat('평균 작성 시간', d.avg_minutes, '분');
    h += '</div>';
    if (d.masked) {
      h += '<p class="box strong">5명 이상부터 표시합니다. 참여 인원이 적으면 누가 어떤 단어를 골랐는지 드러나므로, 단어 순위와 분량 분포는 가립니다.</p>';
    } else {
      var dist = d.st_dist;
      h += '<div class="cols"><div class="field"><h3>가장 많이 고른 핵심가치</h3>' + rank(d.top_values, d.n) + '</div>' +
        '<div class="field"><h3>가장 많이 고른 강점</h3>' + rank(d.top_strengths, d.n) + '</div></div>';
      h += '<div class="field"><h3>이 과정에서 특징적으로 많이 나온 단어</h3>' + (d.other_n < 5
        ? '<p class="lead">다른 과정의 기록이 5명 이상 쌓이면 비교해서 표시합니다.</p>'
        : (d.distinct_words.length
          ? '<ul class="plain">' + d.distinct_words.map(function (x) { return '<li><b>' + esc(x.word) + '</b> (' + (x.kind === 'value' ? '핵심가치' : '강점') + ') 이 과정 ' + x.share + '% · 다른 과정 ' + x.other_share + '%</li>'; }).join('') + '</ul>'
          : '<p class="lead">다른 과정보다 10%포인트 이상 많이 나온 단어가 없습니다.</p>')) + '</div>';
      h += '<div class="field"><h3>상황·과제 비율 분포</h3><p class="q">25% 이하가 기준입니다. 기준 안에 든 참여자는 ' + d.st_ok_count + '명(' + pct(d.st_ok_count, d.n) + '%)이고, 평균은 ' + d.avg_st + '%입니다. 변화·실천 칸을 쓴 참여자는 ' + d.cp_count + '명입니다.</p>' +
        rank([{ word: '15% 이하', count: dist.b0_15 }, { word: '16~25%', count: dist.b16_25 }, { word: '26~35%', count: dist.b26_35 }, { word: '36% 이상', count: dist.b36 }], d.n) + '</div>';
    }
    h += '<div class="field"><h3>결과보고서용 문단</h3><div class="report" id="report">' + esc(report(d)) + '</div>' +
      '<div class="btns"><button class="btn pri" type="button" id="copyReport">결과보고서용 문단 복사</button></div><p class="msg" id="copyMsg" role="status"></p></div>';
    h += '<div class="field"><h3>한 문장 후기 ' + d.reviews.length + '건</h3>' + (d.reviews.length
      ? '<ul class="plain">' + d.reviews.map(function (t) { return '<li>' + esc(t) + '</li>'; }).join('') + '</ul>'
      : '<p class="lead">아직 받은 후기가 없습니다.</p>') + '</div>';
    $('result').innerHTML = h;
    $('copyReport').onclick = function () {
      var t = report(last), m = $('copyMsg');
      function fail() { var r = document.createRange(); r.selectNodeContents($('report')); var s = window.getSelection(); s.removeAllRanges(); s.addRange(r); m.textContent = '자동 복사가 막혔습니다. 선택된 문단을 직접 복사합니다.'; }
      try { navigator.clipboard.writeText(t).then(function () { m.textContent = '문단을 복사했습니다.'; }, fail); } catch (e) { fail(); }
    };
  }

  function init() {
    $('lockForm').onsubmit = function (e) { e.preventDefault(); var p = $('pw').value; if (p) login(p); };
    $('course').onchange = loadSummary;
    $('reload').onclick = function () { login(pass); };
    $('logout').onclick = function () { $('pw').value = ''; showLock(''); };
    var saved = ''; try { saved = sessionStorage.getItem(PASS_KEY) || ''; } catch (e) { /* ignore */ }
    if (saved) login(saved);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
