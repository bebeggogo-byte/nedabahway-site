/*
 * features.js — cinema UI features for the KBS Classic FM PWA.
 *
 * Classic script loaded AFTER app.js. It may READ app.js top-level globals
 * (`state`, `els`) but never calls app.js internals; it only interacts with
 * app.js by clicking app.js-owned elements (#aboutClose, #installBtn,
 * #sleepToggle).
 *
 * Adds: menu sheet, playlist sheet, "remember this moment" history,
 * now-playing card fed by the KBS live API, today's schedule (best effort).
 * Every network path is failure-tolerant and isolated from playback.
 */
// @MX:NOTE: [AUTO] Owns #menuSheet/#playlistSheet/#nowCard/#rememberBtn; app.js owns playback, #aboutSheet, sleep timer, geo, share, install.
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  // KBS 온에어 클래식FM 페이지(편성·선곡 포함). 옛 program.kbs.co.kr 주소는 열리지 않음.
  const KBS_PAGE = 'https://onair.kbs.co.kr/index.html?sname=onair&stype=live&ch_code=24&ch_type=radioList';
  const NOW_API = 'https://cfpwwwapi.kbs.co.kr/api/v1/landing/live/channel_code/24';
  const SCHED_API = 'https://static.api.kbs.co.kr/mediafactory/v1/schedule/weekly?rtype=json&local_station_code=00&channel_code=24';
  const HIST_KEY = 'nw.radio.hist';
  const HIST_MAX = 50;
  const DEFAULT_THUMB = './icons/icon-192.png';
  const DEFAULT_TITLE = '클래식 FM 생방송';
  const NOW_EVERY_MS = 60_000;
  const SCHED_MIN_GAP_MS = 10 * 60_000;
  const FETCH_TIMEOUT_MS = 6_000;
  const SAVED_FLASH_MS = 1_600;
  const HIDE_AFTER_MS = 340; // matches the .sheet__panel transition

  const appState = () => { try { return typeof state !== 'undefined' ? state : null; } catch { return null; } };

  // Interactive controls nested inside #hero must not bubble to app.js's
  // hero click/keydown handlers (which toggle playback).
  function guardHeroChild(el, onActivate) {
    if (!el) return;
    el.addEventListener('click', (e) => { e.stopPropagation(); onActivate(e); });
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') e.stopPropagation();
    });
  }

  // ---------- time helpers (KST) ----------
  const KST_FMT = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  function kst(date = new Date()) {
    const p = {};
    for (const part of KST_FMT.formatToParts(date)) p[part.type] = part.value;
    const H = p.hour === '24' ? '00' : p.hour;
    return {
      dateKey: `${p.year}-${p.month}-${p.day}`,
      day: `${p.year}${p.month}${p.day}`,
      hm: `${H}:${p.minute}`,
      stamp: `${p.year}${p.month}${p.day}${H}${p.minute}00`,
    };
  }
  const digits = (s) => String(s == null ? '' : s).replace(/\D/g, '');
  function hmOf(raw) {
    const t = digits(raw);
    return t.length >= 12 ? `${t.slice(8, 10)}:${t.slice(10, 12)}` : '';
  }
  const stamp14 = (raw) => { const t = digits(raw); return t.length >= 12 ? (t + '00').slice(0, 14) : ''; };

  // ---------- defensive JSON helpers ----------
  function walk(node, visit, depth = 0) {
    if (!node || typeof node !== 'object' || depth > 14) return false;
    if (visit(node)) return true;
    const kids = Array.isArray(node) ? node : Object.values(node);
    for (const k of kids) if (walk(k, visit, depth + 1)) return true;
    return false;
  }
  function pickImage(o) {
    for (const key of ['image_w', 'image_h', 'image', 'program_image']) {
      const v = o && o[key];
      if (typeof v === 'string' && /^https:\/\/\S+$/i.test(v.trim())) return v.trim();
    }
    return '';
  }

  const loggedKinds = new Set();
  function logOnce(scope, kind, detail) {
    const key = `${scope}:${kind}`;
    if (loggedKinds.has(key)) return;
    loggedKinds.add(key);
    console.info(`[features] ${scope} unavailable (${kind})${detail ? ': ' + detail : ''}`);
  }
  function failKind(err) {
    if (!err) return 'unknown';
    if (err.kind) return err.kind;
    if (err.name === 'TimeoutError' || err.name === 'AbortError') return 'timeout';
    if (err.name === 'SyntaxError') return 'parse';
    return 'network';
  }

  // @MX:WARN: [AUTO] Cross-origin fetch to KBS hosts; CORS/timeouts are expected in the wild.
  // @MX:REASON: Callers must catch — a rejection here must never reach playback or the main UI.
  async function fetchJson(url) {
    const opts = { cache: 'no-store' };
    try {
      if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
        opts.signal = AbortSignal.timeout(FETCH_TIMEOUT_MS);
      }
    } catch { /* older webviews */ }
    const res = await fetch(url, opts);
    if (!res.ok) { const e = new Error(`HTTP ${res.status}`); e.kind = 'http'; throw e; }
    return res.json();
  }

  // ---------- now playing ----------
  const nowCard = $('nowCard');
  const nowThumb = $('nowThumb');
  const nowTitle = $('nowTitle');
  const nowSub = $('nowSub');
  const plNow = $('plNow');
  let nowInfo = null;      // { title, start, end, image } from the last successful fetch
  let nowInFlight = null;

  function cityName() {
    const s = appState();
    return (s && s.current && s.current.city) || '제주';
  }
  function nowStillOnAir(info) {
    if (!info) return false;
    const end = stamp14(info.endRaw);
    return !end || kst().stamp < end;
  }
  function setThumb(img, src) {
    if (!img) return;
    const want = src || DEFAULT_THUMB;
    if (img.getAttribute('src') !== want) img.setAttribute('src', want);
  }
  [nowThumb, plNow && plNow.querySelector('img')].forEach((img) => {
    if (img) img.addEventListener('error', () => { if (img.getAttribute('src') !== DEFAULT_THUMB) img.setAttribute('src', DEFAULT_THUMB); });
  });

  function renderNow() {
    const live = nowStillOnAir(nowInfo) ? nowInfo : null;
    const title = live ? live.title : DEFAULT_TITLE;
    const range = live && live.start ? `${live.start}${live.end ? '–' + live.end : ''}` : '';
    const sub = live ? (range ? `${range} · KBS Classic FM` : 'KBS Classic FM') : `KBS 1FM · ${cityName()}`;
    if (nowTitle) nowTitle.textContent = title;
    if (nowSub) nowSub.textContent = sub;
    setThumb(nowThumb, live && live.image);
    if (plNow) {
      const t = plNow.querySelector('.pl-now__title');
      const m = plNow.querySelector('.pl-now__meta');
      if (t) t.textContent = title;
      if (m) m.textContent = sub;
      setThumb(plNow.querySelector('img'), live && live.image);
    }
  }

  function parseNow(json) {
    let hit = null;
    walk(json, (o) => {
      if (!Array.isArray(o) && typeof o.program_title === 'string' && o.program_title.trim()) { hit = o; return true; }
      return false;
    });
    if (!hit) return null;
    return {
      title: hit.program_title.trim(),
      start: hmOf(hit.program_planned_start_time),
      end: hmOf(hit.program_planned_end_time),
      endRaw: hit.program_planned_end_time || '',
      image: pickImage(hit),
    };
  }

  function refreshNow() {
    if (nowInFlight) return nowInFlight;
    nowInFlight = (async () => {
      try {
        const info = parseNow(await fetchJson(NOW_API));
        if (!info) { const e = new Error('no program_title'); e.kind = 'shape'; throw e; }
        nowInfo = info;
      } catch (err) {
        logOnce('now-playing', failKind(err), err && err.message);
      } finally {
        try { renderNow(); } catch { /* never throw into the page */ }
        nowInFlight = null;
      }
    })();
    return nowInFlight;
  }

  // Keep the default subtitle in sync when app.js changes city (geo / load).
  const heroCity = $('heroCity');
  if (heroCity && typeof MutationObserver === 'function') {
    new MutationObserver(() => { try { renderNow(); } catch { /* ignore */ } })
      .observe(heroCity, { childList: true, characterData: true, subtree: true });
  }

  // ---------- today's schedule (best effort) ----------
  const plSchedule = $('plSchedule');
  let schedItems = null;   // null = never loaded, [] or array on success, 'fail' on failure
  let schedAttemptAt = 0;
  let schedInFlight = null;

  function parseSchedule(json, todayDay) {
    const seen = new Set();
    const out = [];
    walk(json, (o) => {
      if (Array.isArray(o) || typeof o.program_title !== 'string' || !o.program_planned_start_time) return false;
      const start = stamp14(o.program_planned_start_time);
      if (!start || start.slice(0, 8) !== todayDay) return false;
      const title = o.program_title.trim();
      const key = start + '|' + title;
      if (!title || seen.has(key)) return false;
      seen.add(key);
      out.push({ title, start, end: stamp14(o.program_planned_end_time) });
      return false;
    });
    out.sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));
    out.forEach((it, i) => { if (!it.end && out[i + 1]) it.end = out[i + 1].start; });
    return out;
  }

  function renderSchedule() {
    if (!plSchedule) return;
    plSchedule.replaceChildren();
    if (schedItems === null) {
      plSchedule.appendChild(msgLi('불러오는 중…'));
      return;
    }
    if (schedItems === 'fail' || !schedItems.length) {
      const li = msgLi('편성표 불러오기 실패 · ');
      const a = document.createElement('a');
      a.href = KBS_PAGE; a.target = '_blank'; a.rel = 'noopener';
      a.textContent = 'KBS 편성표 보기';
      li.appendChild(a);
      plSchedule.appendChild(li);
      return;
    }
    const now = kst().stamp;
    let current = null;
    for (const it of schedItems) {
      const li = document.createElement('li');
      const t = document.createElement('span');
      t.className = 'sched__time';
      t.textContent = hmOf(it.start);
      const n = document.createElement('span');
      n.textContent = it.title;
      li.append(t, n);
      if (it.start <= now && (!it.end || now < it.end)) {
        li.classList.add('is-now');
        li.setAttribute('aria-current', 'true');
        current = li;
      }
      plSchedule.appendChild(li);
    }
    if (current) plSchedule.scrollTop = Math.max(0, current.offsetTop - plSchedule.offsetTop - 40);
  }
  function msgLi(text) {
    const li = document.createElement('li');
    li.className = 'sched__msg';
    li.textContent = text;
    return li;
  }

  function loadSchedule() {
    if (schedInFlight) return schedInFlight;
    if (schedItems !== null && Date.now() - schedAttemptAt < SCHED_MIN_GAP_MS) {
      renderSchedule();
      return Promise.resolve();
    }
    schedAttemptAt = Date.now();
    schedInFlight = (async () => {
      try {
        const items = parseSchedule(await fetchJson(SCHED_API), kst().day);
        if (!items.length) { const e = new Error('no programs for today'); e.kind = 'shape'; throw e; }
        schedItems = items;
      } catch (err) {
        schedItems = 'fail';
        logOnce('schedule', failKind(err), err && err.message);
      } finally {
        try { renderSchedule(); } catch { /* ignore */ }
        schedInFlight = null;
      }
    })();
    return schedInFlight;
  }

  // ---------- remember (history) ----------
  const rememberBtn = $('rememberBtn');
  const rememberCount = $('rememberCount');
  const rememberStatus = $('rememberStatus');
  const plHistory = $('plHistory');
  const plClear = $('plClear');
  let savedTimer = null;
  let clearArmTimer = null;

  function loadHist() {
    try {
      const v = JSON.parse(localStorage.getItem(HIST_KEY) || '[]');
      return Array.isArray(v) ? v.filter((x) => x && typeof x === 'object') : [];
    } catch { return []; }
  }
  function saveHist(list) {
    try { localStorage.setItem(HIST_KEY, JSON.stringify(list.slice(0, HIST_MAX))); return true; } catch { return false; }
  }

  function updateCount(list = loadHist()) {
    if (!rememberCount) return;
    rememberCount.textContent = String(list.length);
    rememberCount.hidden = list.length === 0;
  }

  function youtubeUrl(e) {
    const q = e.program
      ? `KBS 클래식FM ${e.program} ${e.dateKey} ${e.hm}`
      : `KBS 클래식FM 선곡 ${e.dateKey} ${e.hm}`;
    return 'https://www.youtube.com/results?search_query=' + encodeURIComponent(q);
  }

  function renderHistory() {
    if (!plHistory) return;
    const list = loadHist();
    plHistory.replaceChildren();
    if (!list.length) {
      const li = document.createElement('li');
      li.className = 'hist__empty';
      li.textContent = '하트를 누르면 지금 듣는 순간을 기록합니다.';
      plHistory.appendChild(li);
    }
    for (const e of list) {
      const li = document.createElement('li');
      const when = document.createElement('div');
      when.className = 'hist__when';
      when.textContent = `${e.dateKey || ''} · ${e.hm || ''}`;
      const where = document.createElement('div');
      where.className = 'hist__where';
      const f = Number(e.freq);
      where.textContent = `${e.city || ''} · ${Number.isFinite(f) ? f.toFixed(1) + ' MHz' : ''}`;
      li.append(when, where);
      if (e.program) {
        const p = document.createElement('div');
        p.className = 'hist__prog';
        p.textContent = e.program;
        li.appendChild(p);
      }
      const actions = document.createElement('div');
      actions.className = 'hist__actions';
      const kbs = document.createElement('a');
      kbs.href = KBS_PAGE; kbs.target = '_blank'; kbs.rel = 'noopener';
      kbs.textContent = 'KBS 선곡표';
      const yt = document.createElement('a');
      yt.href = youtubeUrl(e); yt.target = '_blank'; yt.rel = 'noopener';
      yt.textContent = 'YouTube 검색';
      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'hist__del';
      del.dataset.ts = String(e.ts);
      del.textContent = '삭제';
      del.setAttribute('aria-label', `${e.dateKey || ''} ${e.hm || ''} 기록 삭제`);
      actions.append(kbs, yt, del);
      li.appendChild(actions);
      plHistory.appendChild(li);
    }
    if (plClear) {
      plClear.hidden = list.length === 0;
      disarmClear();
    }
    updateCount(list);
  }

  function currentProgram() {
    return nowStillOnAir(nowInfo) ? nowInfo.title : '';
  }

  function remember() {
    const s = appState();
    const cur = (s && s.current) || {};
    const t = kst();
    const freqText = parseFloat(($('heroFreq') || {}).textContent);
    const entry = {
      ts: Date.now(),
      dateKey: t.dateKey,
      hm: t.hm,
      city: cur.city || (($('heroCity') || {}).textContent || '').trim(),
      freq: typeof cur.freq === 'number' ? cur.freq : (Number.isFinite(freqText) ? freqText : null),
      program: currentProgram(),
    };
    const list = [entry, ...loadHist()].slice(0, HIST_MAX);
    const ok = saveHist(list);
    renderHistory();
    if (!rememberBtn) return;
    rememberBtn.classList.add('is-saved');
    rememberBtn.setAttribute('aria-pressed', 'true');
    if (rememberStatus) rememberStatus.textContent = ok ? `지금 순간을 기록했습니다 · 총 ${list.length}개` : '기록을 저장하지 못했습니다';
    clearTimeout(savedTimer);
    savedTimer = setTimeout(() => {
      rememberBtn.classList.remove('is-saved');
      rememberBtn.setAttribute('aria-pressed', 'false');
    }, SAVED_FLASH_MS);
  }

  function disarmClear() {
    clearTimeout(clearArmTimer);
    if (!plClear) return;
    plClear.classList.remove('is-confirm');
    plClear.textContent = '모두 지우기';
  }

  if (plHistory) {
    plHistory.addEventListener('click', (e) => {
      const btn = e.target.closest('.hist__del');
      if (!btn) return;
      const ts = btn.dataset.ts;
      saveHist(loadHist().filter((x) => String(x.ts) !== ts));
      renderHistory();
      const next = plHistory.querySelector('.hist__del') || $('playlistClose');
      if (next) next.focus();
    });
  }
  if (plClear) {
    plClear.addEventListener('click', () => {
      if (!plClear.classList.contains('is-confirm')) {
        plClear.classList.add('is-confirm');
        plClear.textContent = '정말 지우기';
        clearTimeout(clearArmTimer);
        clearArmTimer = setTimeout(disarmClear, 4000);
        return;
      }
      try { localStorage.removeItem(HIST_KEY); } catch { /* ignore */ }
      renderHistory();
      const close = $('playlistClose');
      if (close) close.focus();
    });
  }

  // ---------- sheets ----------
  // @MX:ANCHOR: [AUTO] makeSheet — open/close contract shared by menu + playlist sheets and the Escape router.
  // @MX:REASON: Focus return, body scroll lock and hidden-after-transition timing must stay consistent with app.js's about sheet.
  function makeSheet(sheet, closeBtn, { onOpen, onClose } = {}) {
    if (!sheet) return null;
    let opener = null;
    let hideTimer = null;
    const isOpen = () => !sheet.hidden && sheet.classList.contains('is-open');

    function open(from) {
      if (isOpen()) return;
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      opener = from || document.activeElement;
      sheet.hidden = false;
      void sheet.offsetWidth; // commit the closed transform before sliding up
      sheet.classList.add('is-open');
      document.body.style.overflow = 'hidden';
      if (opener && opener.setAttribute && opener.hasAttribute('aria-expanded')) opener.setAttribute('aria-expanded', 'true');
      try { onOpen && onOpen(); } catch (err) { console.info('[features] sheet open hook failed', err); }
      (closeBtn || sheet).focus({ preventScroll: true });
    }
    function close() {
      if (sheet.hidden) return;
      sheet.classList.remove('is-open');
      document.body.style.overflow = '';
      try { onClose && onClose(); } catch { /* ignore */ }
      if (hideTimer) clearTimeout(hideTimer);
      hideTimer = setTimeout(() => { sheet.hidden = true; hideTimer = null; }, HIDE_AFTER_MS);
      if (opener && opener.hasAttribute && opener.hasAttribute('aria-expanded')) opener.setAttribute('aria-expanded', 'false');
      if (opener && opener.focus && document.contains(opener)) opener.focus({ preventScroll: true });
      opener = null;
    }
    function forceClosed() {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
      sheet.classList.remove('is-open');
      sheet.hidden = true;
    }

    if (closeBtn) closeBtn.addEventListener('click', (e) => { e.stopPropagation(); close(); });
    sheet.querySelectorAll('[data-sheet-close]').forEach((el) => el.addEventListener('click', (e) => { e.stopPropagation(); close(); }));
    // Keep Tab focus inside the open dialog.
    sheet.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || !isOpen()) return;
      const f = [...sheet.querySelectorAll('a[href],button:not([disabled]),[tabindex]:not([tabindex="-1"])')]
        .filter((el) => !el.closest('[hidden]') && el.getClientRects().length);
      if (!f.length) return;
      const first = f[0];
      const last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
    return { open, close, isOpen, forceClosed };
  }

  const sleepMenu = $('sleepMenu');
  const sleepToggle = $('sleepToggle');
  const menuInstall = $('menuInstall');
  const menuInstallSub = $('menuInstallSub');

  const menu = makeSheet($('menuSheet'), $('menuClose'), {
    onClose() {
      // Collapse the sleep chips via app.js's own toggle so its state stays in sync.
      if (sleepMenu && !sleepMenu.hidden && sleepToggle) sleepToggle.click();
      // (install row text is set once at load per browser; nothing to reset here)
    },
  });
  const playlist = makeSheet($('playlistSheet'), $('playlistClose'), {
    onOpen() {
      renderHistory();
      renderSchedule();
      refreshNow();
      loadSchedule();
    },
    onClose: disarmClear,
  });
  const sheets = [menu, playlist].filter(Boolean);

  const menuBtn = $('menuBtn');
  if (menuBtn && menu) menuBtn.addEventListener('click', (e) => { e.stopPropagation(); menu.open(menuBtn); });

  // Install guidance. Samsung Internet on the owner's phone offers no "홈 화면" entry for
  // this site, while Chrome does (⋮ → 홈 화면에 추가). So on Android outside Chrome the
  // row opens the same URL in Chrome via an intent: URL; elsewhere it explains the menu path.
  const UA = navigator.userAgent || '';
  const IS_ANDROID = /Android/i.test(UA);
  const IS_IOS = /iP(hone|ad|od)/.test(UA) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const IS_CHROME = /Chrome\/\d+/.test(UA) && !/SamsungBrowser|EdgA|OPR|Whale|NAVER|KAKAOTALK/i.test(UA);
  const IS_STANDALONE = (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true;
  const chromeIntentUrl = () => {
    const u = new URL('./', location.href);
    const bare = u.href.replace(/^https?:\/\//, '');
    return `intent://${bare}#Intent;scheme=https;package=com.android.chrome;S.browser_fallback_url=${encodeURIComponent(u.href)};end`;
  };
  if (menuInstallSub && IS_STANDALONE) menuInstallSub.textContent = '이미 홈 화면에 설치된 앱입니다';
  else if (menuInstallSub && IS_ANDROID && !IS_CHROME) menuInstallSub.textContent = '크롬에서만 됩니다 — 누르면 크롬으로 엽니다';
  else if (menuInstallSub && IS_ANDROID) menuInstallSub.textContent = '크롬 오른쪽 위 ⋮ → 홈 화면에 추가';
  else if (menuInstallSub && IS_IOS) menuInstallSub.textContent = 'Safari 공유 버튼 → 홈 화면에 추가';
  if (menuInstall) {
    menuInstall.addEventListener('click', (e) => {
      e.stopPropagation();
      const inst = $('install');
      const btn = $('installBtn');
      if (IS_STANDALONE) return;
      if (inst && btn && inst.classList.contains('is-shown')) {
        if (menu) menu.close();
        btn.click(); // app.js shows the native install prompt (user activation preserved)
      } else if (IS_ANDROID && !IS_CHROME) {
        location.href = chromeIntentUrl(); // Samsung Internet etc. → hand off to Chrome
      } else if (menuInstallSub) {
        menuInstallSub.textContent = IS_ANDROID ? '크롬 오른쪽 위 ⋮ → 홈 화면에 추가'
          : IS_IOS ? 'Safari 공유 버튼 → 홈 화면에 추가'
          : '브라우저 메뉴 → 홈 화면에 추가 / 앱 설치';
      }
    });
  }

  guardHeroChild(rememberBtn, remember);
  guardHeroChild($('playlistBtn'), () => { if (playlist) playlist.open($('playlistBtn')); });

  if (nowCard && playlist) {
    nowCard.addEventListener('click', (e) => { e.stopPropagation(); playlist.open(nowCard); });
    nowCard.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
        e.preventDefault();
        e.stopPropagation();
        playlist.open(nowCard);
      }
    });
  }

  // @MX:WARN: [AUTO] Capture-phase Escape router runs before app.js's document-level Escape handler.
  // @MX:REASON: app.js stops playback on Escape; closing a sheet must not also stop the stream.
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' && e.key !== 'Esc') return;
    if (sleepMenu && !sleepMenu.hidden) return; // let app.js collapse the sleep chips first
    for (const s of sheets) {
      if (s.isOpen()) { e.stopPropagation(); e.preventDefault(); s.close(); return; }
    }
    const about = $('aboutSheet');
    const aboutClose = $('aboutClose');
    if (about && aboutClose && !about.hidden && about.classList.contains('is-open')) {
      e.stopPropagation();
      e.preventDefault();
      aboutClose.click();
    }
  }, true);

  // bfcache restore / relaunch → land on the main screen with sheets closed.
  window.addEventListener('pageshow', () => {
    let any = false;
    for (const s of sheets) { if (s.isOpen()) any = true; s.forceClosed(); }
    if (any) document.body.style.overflow = '';
  });

  // ---------- boot ----------
  updateCount();
  renderHistory();
  renderNow();
  refreshNow();
  setInterval(() => { if (document.visibilityState !== 'hidden') refreshNow(); }, NOW_EVERY_MS);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') refreshNow();
  });
  // @MX:TODO: [AUTO] parseNow/parseSchedule are only exercised by the Playwright cinema check; add unit fixtures once the KBS response shape is confirmed.
})();
