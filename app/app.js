/* 네다바 SBM 관찰 앱 — 무의존 바닐라 SPA.
   오프라인·무계정·무추적. 데이터는 /app/data/ 정적 JSON. */
'use strict';

const DATA = '/app/data';
const $ = (s, r = document) => r.querySelector(s);
const main = $('#main');
const topTitle = $('#topTitle');
const backBtn = $('#backBtn');

/* ---------- 로컬 상태(무계정) ---------- */
const LS = {
  get(k, d) { try { return JSON.parse(localStorage.getItem('sbm.' + k)) ?? d; } catch { return d; } },
  set(k, v) { try { localStorage.setItem('sbm.' + k, JSON.stringify(v)); } catch {} },
};
const state = {
  settings: LS.get('settings', { theme: 'auto', size: 'm' }),
  progress: LS.get('progress', null),        // 마지막 읽은 id
  bookmarks: new Set(LS.get('bookmarks', [])),
  notes: LS.get('notes', {}),                // id -> 메모
};
function saveBookmarks() { LS.set('bookmarks', [...state.bookmarks]); }

/* ---------- 데이터 캐시 ---------- */
let books = null, searchIdx = null;
const obsCache = new Map();
async function getBooks() { return books ||= await (await fetch(`${DATA}/books.json`)).json(); }
async function getSearchIdx() { return searchIdx ||= await (await fetch(`${DATA}/search-index.json`)).json(); }
async function getObs(id) {
  if (obsCache.has(id)) return obsCache.get(id);
  const r = await fetch(`${DATA}/obs/${id}.json`);
  if (!r.ok) throw new Error('not found');
  const j = await r.json(); obsCache.set(id, j); return j;
}

/* ---------- 유틸 ---------- */
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function toast(msg) {
  const t = $('#toast'); t.textContent = msg; t.hidden = false;
  clearTimeout(toast._t); toast._t = setTimeout(() => t.hidden = true, 1800);
}
function highlight(text, q) {
  if (!q) return esc(text);
  const re = new RegExp('(' + q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
  return esc(text).replace(re, '<mark>$1</mark>');
}

/* ---------- 설정 적용 ---------- */
function applySettings() {
  const r = document.documentElement;
  if (state.settings.theme === 'auto') r.removeAttribute('data-theme');
  else r.setAttribute('data-theme', state.settings.theme);
  r.setAttribute('data-size', state.settings.size);
}

/* ---------- 라우터 ---------- */
function parseHash() {
  const h = location.hash.replace(/^#\/?/, '');
  const [route, ...rest] = h.split('/');
  return { route: route || 'today', arg: rest.join('/') };
}
async function render() {
  const { route, arg } = parseHash();
  setTab(route === 'read' ? null : route);
  backBtn.hidden = !(route === 'read' || (route === 'library' && arg));
  main.scrollTo?.(0, 0); window.scrollTo(0, 0);
  try {
    if (route === 'today') await viewToday();
    else if (route === 'library') arg ? await viewBookChapters(arg) : await viewLibrary();
    else if (route === 'search') await viewSearch(arg);
    else if (route === 'read') await viewReader(arg);
    else if (route === 'my') viewMy();
    else if (route === 'settings') viewSettings();
    else await viewToday();
  } catch (e) {
    main.innerHTML = `<div class="empty">불러오지 못했습니다.<br><small>${esc(e.message || '')}</small><br><br>
      <button class="btn btn--ghost" onclick="location.reload()">다시 시도</button></div>`;
  }
  main.focus({ preventScroll: true });
}
function setTab(route) {
  document.querySelectorAll('.tab').forEach(t =>
    t.setAttribute('aria-current', t.dataset.tab === route ? 'page' : 'false'));
}
function go(hash) { location.hash = hash; }
backBtn.onclick = () => history.length > 1 ? history.back() : go('#/today');

/* ---------- 뷰: 오늘 ---------- */
async function viewToday() {
  topTitle.textContent = '오늘의 관찰';
  const idx = await getSearchIdx();
  const id = state.progress || idx[0].id;
  const meta = idx.find(x => x.id === id) || idx[0];
  const pos = idx.findIndex(x => x.id === meta.id) + 1;
  const pct = Math.round(pos / idx.length * 100);
  main.innerHTML = `
    <section class="today-hero">
      <div class="today-hero__k">${state.progress ? '이어서 읽기' : '처음 시작'} · ${esc(meta.genre || '')}</div>
      <div class="today-hero__t">${esc(meta.title)}</div>
      <div class="today-hero__e">${esc(meta.snippet)}…</div>
      <div class="btn-row">
        <a class="btn" href="#/read/${meta.id}">이 장 관찰 열기 →</a>
      </div>
    </section>
    <p class="lead">성경 66권 1189장을 9단계로 관찰합니다. 가르침이 아니라, 본문을 함께 바라봅니다.</p>
    <div class="set-row__d">전체 진도 ${pos} / ${idx.length}장</div>
    <div class="progress"><div class="progress__b" style="width:${pct}%"></div></div>`;
}

/* ---------- 뷰: 성경(책 목록) ---------- */
async function viewLibrary() {
  topTitle.textContent = '성경';
  const bs = await getBooks();
  const groups = { OT: [], NT: [] };
  bs.forEach(b => groups[b.testament].push(b));
  const sec = (label, arr) => `
    <h2 class="section-h">${label}</h2>
    <div class="grid">${arr.map(b => `
      <a class="card" href="#/library/${b.book}">
        <div class="card__k">${b.book_en}</div>
        <div class="card__t">${esc(b.book_ko)}</div>
        <div class="card__s">${b.chapters}장</div>
      </a>`).join('')}</div>`;
  main.innerHTML = sec('구약 (39권)', groups.OT) + sec('신약 (27권)', groups.NT);
}

/* ---------- 뷰: 장 목록 ---------- */
async function viewBookChapters(book) {
  const idx = await getSearchIdx();
  const chs = idx.filter(x => x.book === book).sort((a, b) => a.ch - b.ch);
  if (!chs.length) { main.innerHTML = '<div class="empty">해당 책을 찾지 못했습니다.</div>'; return; }
  topTitle.textContent = chs[0].book_ko;
  main.innerHTML = `<ul class="rowlist">${chs.map(c => `
    <li><a class="row" href="#/read/${c.id}">
      <span class="row__n">${c.ch}장</span>
      <span class="row__b"><span class="row__s">${esc(c.snippet)}…</span></span>
      <span class="row__chev">›</span>
    </a></li>`).join('')}</ul>`;
}

/* ---------- 뷰: 리더 ---------- */
async function viewReader(id) {
  const o = await getObs(id);
  state.progress = id; LS.set('progress', id);
  topTitle.textContent = o.book_ko + ' ' + o.chapter + '장';
  const paras = o.synthesis.split(/(?<=[.。」”])\s+(?=[A-J] ·|[가-힣“"])/).filter(Boolean);
  const isBm = state.bookmarks.has(id);
  main.innerHTML = `
    <article class="reader">
      <div class="reader__meta">${esc(o.id)} · ${esc(o.genre)} · ${esc(o.language)}</div>
      <h2 class="reader__title">${esc(o.book_ko)} ${o.chapter}장</h2>
      ${o.essence ? `<div class="reader__essence">${esc(o.essence)}</div>` : ''}
      <div class="reader__body">${paras.map(p => `<p>${esc(p)}</p>`).join('')}</div>
      ${o.keywords?.length ? `<div class="kw">${o.keywords.map(k => `<span class="kw__t">${esc(k)}</span>`).join('')}</div>` : ''}
      <div class="reader-actions">
        <button class="ra" ${o.prev ? '' : 'disabled'} onclick="location.hash='#/read/${o.prev}'"><span class="ra__i">‹</span>이전</button>
        <button class="ra" id="bmBtn" aria-pressed="${isBm}"><span class="ra__i">${isBm ? '★' : '☆'}</span>북마크</button>
        <button class="ra" id="noteBtn"><span class="ra__i">✎</span>메모</button>
        <button class="ra" id="extractBtn"><span class="ra__i">⎘</span>꺼내쓰기</button>
        <button class="ra" ${o.next ? '' : 'disabled'} onclick="location.hash='#/read/${o.next}'"><span class="ra__i">›</span>다음</button>
      </div>
    </article>`;
  $('#bmBtn').onclick = () => {
    if (state.bookmarks.has(id)) { state.bookmarks.delete(id); toast('북마크 해제'); }
    else { state.bookmarks.add(id); toast('북마크 저장'); }
    saveBookmarks(); render();
  };
  $('#noteBtn').onclick = () => openNote(o);
  $('#extractBtn').onclick = () => openExtract(o);
}

/* ---------- 뷰: 검색 ---------- */
async function viewSearch(preset) {
  topTitle.textContent = '검색';
  const idx = await getSearchIdx();
  main.innerHTML = `
    <div class="search-wrap">
      <input class="search-in" id="q" type="search" inputmode="search" placeholder="관찰 검색 — 예: 새 언약, 목자, 여호와의 날"
        autocomplete="off" aria-label="관찰 검색" value="${esc(preset || '')}">
      <div class="chips" id="filters">
        <button class="chip" data-f="all" aria-pressed="true">전체</button>
        <button class="chip" data-f="OT" aria-pressed="false">구약</button>
        <button class="chip" data-f="NT" aria-pressed="false">신약</button>
      </div>
    </div>
    <div id="results"><p class="lead">1189장 관찰 본문에서 찾습니다. 오프라인에서도 작동합니다.</p></div>`;
  const q = $('#q'), results = $('#results'); let filter = 'all';
  const run = () => {
    const term = q.value.trim();
    if (!term) { results.innerHTML = '<p class="lead">검색어를 입력하세요.</p>'; return; }
    const low = term.toLowerCase();
    let hits = idx.filter(x => {
      if (filter !== 'all' && x.testament !== filter) return false;
      return (x.title + ' ' + x.snippet + ' ' + (x.keywords || []).join(' ') + ' ' + x.book_ko)
        .toLowerCase().includes(low);
    });
    // 관련도: 제목·키워드 일치를 상단으로
    hits.sort((a, b) => score(b, low) - score(a, low));
    results.innerHTML = hits.length
      ? `<p class="set-row__d">${hits.length}장</p><ul class="rowlist">${hits.slice(0, 200).map(c => `
          <li><a class="row" href="#/read/${c.id}">
            <span class="row__n">${esc(c.book_ko)} ${c.ch}</span>
            <span class="row__b"><span class="row__s">${highlight(c.snippet, term)}…</span></span>
          </a></li>`).join('')}</ul>`
      : '<div class="empty">일치하는 관찰이 없습니다.</div>';
  };
  const score = (x, low) =>
    (x.title.toLowerCase().includes(low) ? 3 : 0) +
    ((x.keywords || []).some(k => k.toLowerCase().includes(low)) ? 2 : 0) +
    (x.snippet.toLowerCase().includes(low) ? 1 : 0);
  q.oninput = run;
  $('#filters').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    filter = b.dataset.f;
    document.querySelectorAll('#filters .chip').forEach(c => c.setAttribute('aria-pressed', c === b));
    run();
  };
  if (preset) run(); q.focus();
}

/* ---------- 뷰: 내 서재 ---------- */
async function viewMy() {
  topTitle.textContent = '내 서재';
  const idx = await getSearchIdx();
  const byId = Object.fromEntries(idx.map(x => [x.id, x]));
  const bm = [...state.bookmarks].map(id => byId[id]).filter(Boolean);
  const notes = Object.keys(state.notes).map(id => byId[id]).filter(Boolean);
  const sec = (title, arr, note) => arr.length ? `
    <h2 class="section-h">${title}</h2>
    <ul class="rowlist">${arr.map(c => `
      <li><a class="row" href="#/read/${c.id}">
        <span class="row__n">${esc(c.book_ko)} ${c.ch}</span>
        <span class="row__b"><span class="row__s">${note ? esc(state.notes[c.id]) : esc(c.snippet) + '…'}</span></span>
      </a></li>`).join('')}</ul>` : '';
  const html = sec('북마크', bm, false) + sec('메모', notes, true);
  main.innerHTML = html || '<div class="empty">아직 북마크나 메모가 없습니다.<br>관찰을 읽으며 ☆·✎로 담아 보세요.</div>';
}

/* ---------- 뷰: 설정 ---------- */
function viewSettings() {
  topTitle.textContent = '설정';
  const s = state.settings;
  const seg = (name, opts, cur) => `<div class="seg" role="group">${opts.map(([v, l]) =>
    `<button data-set="${name}" data-v="${v}" aria-pressed="${cur === v}">${l}</button>`).join('')}</div>`;
  main.innerHTML = `
    <div class="set-group">
      <div class="set-row"><div><div class="set-row__t">글자 크기</div></div>
        ${seg('size', [['m', '보통'], ['l', '크게'], ['xl', '아주 크게']], s.size)}</div>
      <div class="set-row"><div><div class="set-row__t">화면 테마</div></div>
        ${seg('theme', [['auto', '자동'], ['light', '밝게'], ['dark', '어둡게']], s.theme)}</div>
    </div>
    <div class="set-group">
      <div class="set-row"><div><div class="set-row__t">전체 저장(오프라인)</div>
        <div class="set-row__d">1189장 전체를 기기에 담아 네트워크 없이 사용합니다.</div></div>
        <button class="btn" id="dlAll">저장</button></div>
      <div class="set-row"><div><div class="set-row__t">진도·메모 초기화</div>
        <div class="set-row__d">이 기기의 기록만 지웁니다(서버 전송 없음).</div></div>
        <button class="btn btn--ghost" id="resetAll">초기화</button></div>
    </div>
    <div class="set-group">
      <div class="set-row" style="display:block">
        <div class="set-row__t">이 앱에 대하여</div>
        <div class="set-row__d" style="margin-top:8px;line-height:1.7">
          성경 66권 1189장 SBM 9단계 관찰. <b>관찰이지 가르침이 아닙니다.</b>
          이해하지 못할 때 건넨 메시지처럼, 본문 스스로 말하게 합니다.<br>
          무계정·무추적, 기록은 이 기기에만 저장됩니다.
        </div>
      </div>
    </div>`;
  main.querySelectorAll('[data-set]').forEach(b => b.onclick = () => {
    state.settings[b.dataset.set] = b.dataset.v; LS.set('settings', state.settings);
    applySettings(); viewSettings();
  });
  $('#dlAll').onclick = downloadAll;
  $('#resetAll').onclick = () => {
    if (!confirm('이 기기의 진도·북마크·메모를 모두 지울까요?')) return;
    state.progress = null; state.bookmarks = new Set(); state.notes = {};
    LS.set('progress', null); saveBookmarks(); LS.set('notes', {});
    toast('초기화했습니다'); viewSettings();
  };
}

/* ---------- 전체 저장(오프라인 캐시) ---------- */
async function downloadAll() {
  const btn = $('#dlAll'); btn.disabled = true;
  const idx = await getSearchIdx();
  const urls = idx.map(x => `${DATA}/obs/${x.id}.json`);
  let done = 0;
  const batch = 24;
  for (let i = 0; i < urls.length; i += batch) {
    await Promise.all(urls.slice(i, i + batch).map(u =>
      fetch(u).then(() => {}).catch(() => {})));   // SW가 캐시(cache-first)
    done = Math.min(i + batch, urls.length);
    btn.textContent = `${Math.round(done / urls.length * 100)}%`;
  }
  btn.textContent = '완료 ✓'; toast('전체 저장 완료 — 오프라인 준비됨');
}

/* ---------- 메모 모달 ---------- */
function openNote(o) {
  const cur = state.notes[o.id] || '';
  const box = modal(`${o.book_ko} ${o.chapter}장 — 메모`, `
    <textarea id="noteTa" placeholder="이 관찰에서 붙든 것, 떠오른 질문을 적어 두세요.">${esc(cur)}</textarea>
    <div class="btn-row"><button class="btn" id="noteSave">저장</button>
      <button class="btn btn--ghost" id="noteDel">삭제</button></div>`);
  $('#noteSave').onclick = () => {
    const v = $('#noteTa').value.trim();
    if (v) state.notes[o.id] = v; else delete state.notes[o.id];
    LS.set('notes', state.notes); box.remove(); toast('메모 저장');
  };
  $('#noteDel').onclick = () => { delete state.notes[o.id]; LS.set('notes', state.notes); box.remove(); toast('메모 삭제'); };
}

/* ---------- 꺼내쓰기(추출 템플릿, 오프라인 규칙 기반) ---------- */
function openExtract(o) {
  const box = modal(`${o.book_ko} ${o.chapter}장 — 꺼내쓰기`, `
    <p class="set-row__d">관찰을 용도에 맞게 정리합니다. 결과를 복사해 설교·강의·묵상에 쓰세요.</p>
    <div class="pick">
      <button data-t="sermon">설교 개요 뼈대</button>
      <button data-t="meditate">묵상 질문</button>
      <button data-t="keyverse">핵심 어구 · 근거</button>
      <button data-t="cross">교차 참조(같은 주제 장)</button>
    </div>
    <div id="exOut"></div>`);
  box.querySelectorAll('.pick button').forEach(b => b.onclick = () => buildExtract(o, b.dataset.t));
}
async function buildExtract(o, type) {
  const out = $('#exOut'); out.innerHTML = '정리 중…';
  let text = '';
  const kw = (o.keywords || []).slice(0, 6);
  if (type === 'sermon') {
    text =
`[${o.book_ko} ${o.chapter}장 — 설교 개요 뼈대]  ※ 관찰에서 추출, 해석은 준비자의 몫

본문 관찰(요지)
- ${o.essence}

관찰이 드러내는 축(핵심 어구)
${kw.map((k, i) => `${i + 1}. "${k}"`).join('\n')}

개요 초안(관찰 → 적용은 직접)
1. 본문은 무엇을 말하는가 — 위 요지
2. 반복·대조·긴장은 어디에 있는가 — 핵심 어구 참조
3. 이 장이 여는 질문 — (묵상 질문 탭 참조)

출처: nedabah.org${o.url}`;
  } else if (type === 'meditate') {
    text =
`[${o.book_ko} ${o.chapter}장 — 묵상 질문]

오늘의 한 구절/어구
${kw.slice(0, 3).map(k => `· "${k}"`).join('\n')}

붙들 질문
1. 이 장에서 하나님은 어떤 분으로 나타나는가?
2. 본문이 반복하거나 대조하는 것은 무엇이며, 왜인가?
3. 위 어구 중 오늘 나에게 걸리는 하나는? 그 앞에 어떻게 머물겠는가?

요지: ${o.essence}
출처: nedabah.org${o.url}`;
  } else if (type === 'keyverse') {
    text =
`[${o.book_ko} ${o.chapter}장 — 핵심 어구·근거]
${kw.map(k => `· "${k}"`).join('\n')}

관찰 요지
${o.essence}

출처: nedabah.org${o.url}`;
  } else if (type === 'cross') {
    const idx = await getSearchIdx();
    const related = new Set();
    (o.keywords || []).slice(0, 4).forEach(k => {
      const key = k.slice(0, 4);
      idx.forEach(x => { if (x.id !== o.id && (x.keywords || []).some(w => w.includes(key))) related.add(x.id); });
    });
    const byId = Object.fromEntries(idx.map(x => [x.id, x]));
    const rel = [...related].slice(0, 12).map(id => byId[id]);
    text =
`[${o.book_ko} ${o.chapter}장 — 교차 참조]
같은 어구가 관찰된 다른 장:
${rel.length ? rel.map(r => `· ${r.book_ko} ${r.ch}장`).join('\n') : '· (뚜렷한 교차 장 없음)'}

기준 어구: ${kw.slice(0, 4).map(k => `"${k}"`).join(', ')}
출처: nedabah.org${o.url}`;
  }
  out.innerHTML = `<div class="extract-out">${esc(text)}</div>
    <div class="btn-row"><button class="btn" id="cpBtn">복사</button></div>`;
  $('#cpBtn').onclick = async () => {
    try { await navigator.clipboard.writeText(text); toast('복사됨'); }
    catch { toast('복사 실패 — 길게 눌러 선택하세요'); }
  };
}

/* ---------- 모달 헬퍼 ---------- */
function modal(title, inner) {
  const el = document.createElement('div');
  el.className = 'modal'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true');
  el.innerHTML = `<div class="modal__box"><div class="modal__h">${esc(title)}
    <button class="modal__x" aria-label="닫기">×</button></div>${inner}</div>`;
  el.querySelector('.modal__x').onclick = () => el.remove();
  el.onclick = e => { if (e.target === el) el.remove(); };
  document.addEventListener('keydown', function onEsc(e) {
    if (e.key === 'Escape') { el.remove(); document.removeEventListener('keydown', onEsc); }
  });
  document.body.appendChild(el);
  return el;
}

/* ---------- 부팅 ---------- */
applySettings();
window.addEventListener('hashchange', render);
render();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () =>
    navigator.serviceWorker.register('/app/sw.js', { scope: '/app/' }).catch(() => {}));
}
