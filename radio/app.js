const GROUP_ORDER = ['즐겨찾기', '수도권', '강원', '충청', '호남', '영남', '제주'];
const STORAGE_KEY = 'classicfm.lastCity';
const IFRAME_LOAD_TIMEOUT_MS = 6000;
const FETCH_RETRY = { attempts: 3, baseDelayMs: 800 };

const els = {
  hero: document.getElementById('hero'),
  heroFreq: document.getElementById('heroFreq'),
  heroCity: document.getElementById('heroCity'),
  heroAction: document.getElementById('heroAction'),
  actionIcon: document.getElementById('actionIcon'),
  actionText: document.getElementById('actionText'),
  heroHint: document.getElementById('heroHint'),
  statusText: document.getElementById('statusText'),
  groups: document.getElementById('groups'),
  install: document.getElementById('install'),
  installBtn: document.getElementById('installBtn'),
  playerFrame: document.getElementById('playerFrame'),
  playerFrameInner: document.getElementById('playerFrameInner'),
  playerFrameClose: document.getElementById('playerFrameClose'),
  sleepTimer: document.getElementById('sleepTimer'),
  sleepToggle: document.getElementById('sleepToggle'),
  sleepMenu: document.getElementById('sleepMenu'),
  sleepLabel: document.getElementById('sleepLabel'),
  audio: document.getElementById('audio'),
  heroNow: document.getElementById('heroNow'),
  geoToggle: document.getElementById('geoToggle'),
  geoSub: document.getElementById('geoSub'),
  regions: document.getElementById('regions'),
  regionsReveal: document.getElementById('regionsReveal'),
  regionsRevealText: document.getElementById('regionsRevealText'),
};

const GEO_KEY = 'classicfm.geoEnabled';
const GEO_OPTS = { enableHighAccuracy: true, maximumAge: 60_000, timeout: 8_000 };
const GEO_WATCH_THROTTLE_MS = 60_000; // re-snap at most once per minute

const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_STOP = '<path d="M6 6h12v12H6z"/>';
const ICON_LOAD = '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2.5" stroke-dasharray="40 20" stroke-linecap="round"><animateTransform attributeName="transform" type="rotate" from="0 12 12" to="360 12 12" dur="1s" repeatCount="indefinite"/></circle>';

const state = {
  data: null,
  current: null,
  playing: false,
  wantsPlayback: false,
  userInitiatedStop: false,
  pausedAt: 0,
  seekLiveOnPlaying: false, // one-shot: re-sync to the live edge on the next 'playing'
  reloadWhenVisible: false, // a source reload was needed while hidden; do it on foreground
  interrupted: false,       // system audio interruption in progress (call, Siri, other app)
  loadTimer: null,
  sleepTimer: null,
  sleepTickTimer: null,
  sleepEndAt: 0,
  sleepFading: false,
  geoEnabled: false,
  geoWatchId: null,
  geoLastSnapAt: 0,
};

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function loadStations() {
  let lastErr;
  for (let i = 0; i < FETCH_RETRY.attempts; i++) {
    try {
      const res = await fetch('./stations.json', { cache: 'no-cache' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      lastErr = err;
      if (i < FETCH_RETRY.attempts - 1) {
        await sleep(FETCH_RETRY.baseDelayMs * Math.pow(2, i));
      }
    }
  }
  throw lastErr;
}

function findRegion(data, city) {
  return data.regions.find(r => r.city === city);
}

function pickDefault(data) {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const hit = findRegion(data, saved);
    if (hit) return hit;
  }
  return data.regions.find(r => r.isDefault) || data.regions[0];
}

function renderGroups(data) {
  const byGroup = {};
  for (const r of data.regions) (byGroup[r.group] ||= []).push(r);
  const order = GROUP_ORDER.filter(g => byGroup[g]);
  const frag = document.createDocumentFragment();
  for (const g of order) {
    const section = document.createElement('section');
    section.className = 'group';
    section.innerHTML = `<div class="group__label">${g}</div><div class="group__grid"></div>`;
    const grid = section.querySelector('.group__grid');
    for (const r of byGroup[g]) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'station';
      btn.dataset.city = r.city;
      btn.setAttribute('aria-label', `${r.city} ${r.freq.toFixed(1)} 메가헤르츠로 재생`);
      btn.innerHTML = `
        <span class="station__city">${r.city}</span>
        <span class="station__freq">${r.freq.toFixed(1)}<span class="station__unit">MHz</span></span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setCurrent(r);
        startStream();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
      grid.appendChild(btn);
    }
    frag.appendChild(section);
  }
  els.groups.replaceChildren(frag);
}

function markActive(city) {
  document.querySelectorAll('.station').forEach(el => {
    el.classList.toggle('is-active', el.dataset.city === city);
  });
}

function setCurrent(region) {
  state.current = region;
  els.heroFreq.textContent = region.freq.toFixed(1);
  els.heroCity.textContent = region.city;
  markActive(region.city);
  localStorage.setItem(STORAGE_KEY, region.city);
  updateMediaMetadata();
}

function setPlayingUI(isPlaying, { loading = false } = {}) {
  state.playing = isPlaying;
  els.hero.classList.toggle('is-playing', isPlaying);
  if (loading) {
    els.statusText.textContent = 'CONNECTING';
    els.actionIcon.innerHTML = ICON_LOAD;
    els.actionText.textContent = '연결 중…';
    els.heroHint.textContent = '잠시만요';
    return;
  }
  const inApp = !!(els.audio && els.audio.src && !els.audio.paused);
  if (isPlaying) {
    els.statusText.textContent = 'ON AIR';
    els.actionIcon.innerHTML = inApp ? ICON_STOP : ICON_PLAY;
    els.actionText.textContent = inApp ? '재생 중지' : '다시 열기';
    els.heroHint.textContent = inApp
      ? '앱 내에서 재생 중 · HLS 스트림'
      : 'KBS 공식 플레이어 재생 중 · 새 탭';
  } else {
    els.statusText.textContent = 'OFF AIR';
    els.actionIcon.innerHTML = ICON_PLAY;
    els.actionText.textContent = '라이브 듣기';
    els.heroHint.textContent = 'KBS 공식 라디오 · 탭하여 재생';
  }
}

function openPlayerDock() {
  els.playerFrame.classList.add('is-open');
  els.playerFrame.setAttribute('aria-hidden', 'false');
  document.body.style.paddingBottom = 'calc(280px + env(safe-area-inset-bottom))';
}

function closePlayerDock() {
  els.playerFrame.classList.remove('is-open');
  els.playerFrame.setAttribute('aria-hidden', 'true');
  document.body.style.paddingBottom = '';
}

function showFallback(reason) {
  clearTimeout(state.loadTimer);
  const d = state.data || {};
  const fallbackUrl = d.fallbackUrl;
  const fallbackLabel = d.fallbackLabel || '대체 플레이어 열기';
  els.playerFrameInner.innerHTML = `
    <div class="player-fallback">
      <div class="player-fallback__msg">${reason}</div>
      ${fallbackUrl ? `<a class="player-fallback__btn" href="${fallbackUrl}" target="_blank" rel="noopener">${fallbackLabel} →</a>` : ''}
      <button class="player-fallback__retry" type="button" id="retryBtn">다시 시도</button>
    </div>
  `;
  openPlayerDock();
  const retry = document.getElementById('retryBtn');
  if (retry) retry.addEventListener('click', (e) => { e.stopPropagation(); startStream(); });
  setPlayingUI(false);
  els.heroHint.textContent = '재생 불가 — 하단에서 다시 시도';
}

async function fetchKbsStreamUrl(apiUrl) {
  const res = await fetch(apiUrl, { cache: 'no-store' });
  if (!res.ok) throw new Error(`KBS API ${res.status}`);
  const data = await res.json();
  const url =
    data?.channel_item?.[0]?.service_url ||
    data?.channel?.item?.[0]?.service_url ||
    data?.channel_item_url ||
    null;
  if (!url) throw new Error('no stream URL in API response');
  return url;
}

function canPlayHls(audio) {
  return audio.canPlayType('application/vnd.apple.mpegurl') !== ''
      || audio.canPlayType('application/x-mpegURL') !== '';
}

function openExternalPlayer() {
  state.wantsPlayback = false;
  clearResumeWatch();
  const d = state.data;
  if (!d || !d.streamUrl) { showFallback('재생 링크가 없습니다.'); return; }
  window.open(d.streamUrl, '_blank', 'noopener');
  closePlayerDock();
  setPlayingUI(true);
  els.heroHint.textContent = 'KBS 공식 플레이어(새 탭) 재생 중';
}

async function tryAudioSrc(src) {
  if (!src || !canPlayHls(els.audio)) return false;
  try {
    els.audio.src = src;
    const played = els.audio.play();
    if (played && typeof played.then === 'function') await played;
    return true;
  } catch (err) {
    console.warn('audio play failed for', src, err);
    return false;
  }
}

async function startStream() {
  if (!state.data) return;
  const d = state.data;

  // Intent to play (in-app). Set before playback so a 'playing' event is
  // recognized as wanted; a fallback to the external player resets this.
  state.wantsPlayback = true;
  state.userInitiatedStop = false;
  clearTimeout(state.loadTimer);
  setPlayingUI(false, { loading: true });
  ensureInterruptionWatch(); // user gesture context: arm the iOS interruption signal

  // 1) Direct HLS via radio.bsod.kr proxy (CORS-OK, in-app playback)
  if (d.audioUrl && canPlayHls(els.audio)) {
    if (await tryAudioSrc(d.audioUrl)) {
      els.heroHint.textContent = '앱 내 재생 중 · 차량 컨트롤 작동';
      return;
    }
    if (d.audioUrlAlt && await tryAudioSrc(d.audioUrlAlt)) {
      els.heroHint.textContent = '앱 내 재생 중 (대체 경로)';
      return;
    }
  }

  // 2) KBS API direct (CORS likely blocked, but try)
  if (d.streamType === 'kbs-api' && d.apiUrl && canPlayHls(els.audio)) {
    try {
      const streamUrl = await fetchKbsStreamUrl(d.apiUrl);
      if (await tryAudioSrc(streamUrl)) {
        els.heroHint.textContent = '앱 내 재생 중 · KBS 직링크';
        return;
      }
    } catch (err) {
      console.warn('KBS API path failed:', err);
    }
  }

  openExternalPlayer();
}

function stopStream() {
  clearTimeout(state.loadTimer);
  state.wantsPlayback = false;
  clearResumeWatch();
  clearResumeStall();
  state.seekLiveOnPlaying = false;
  state.reloadWhenVisible = false;
  releaseInterruptionWatch();
  els.playerFrameInner.replaceChildren();
  closePlayerDock();
  if (els.audio) {
    state.userInitiatedStop = true;
    els.audio.pause();
    els.audio.removeAttribute('src');
    els.audio.load();
  }
  setPlayingUI(false);
}

function toggleStream() {
  if (state.playing && els.audio && !els.audio.paused) {
    stopStream();
    return;
  }
  startStream();
}

els.hero.addEventListener('click', (e) => {
  if (e.target.closest('.player-frame')) return;
  toggleStream();
});
els.hero.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    toggleStream();
  }
});

els.playerFrameClose.addEventListener('click', (e) => {
  e.stopPropagation();
  stopStream();
});

if (els.audio) {
  els.audio.addEventListener('playing', () => {
    if (!state.wantsPlayback) {
      // Spurious auto-resume after a deliberate stop — live streams can emit a
      // stray 'playing' while re-buffering. Keep it stopped so the lock-screen
      // button does not flicker back to the pause icon.
      els.audio.pause();
      msSetPlaybackState('paused');
      return;
    }
    state.userInitiatedStop = false;
    const wasInterrupted = state.pausedAt > 0;
    state.pausedAt = 0;
    clearResumeWatch();
    // (keeper baseline is reset on 'pause'/'loadstart', NOT here: a keeper-initiated
    //  live-edge seek also fires 'playing' and must not restart the stall clock)
    // NOTE: do not clear the resume watchdog here — a stale live stream can fire
    // 'playing' without audible progress; only real currentTime progress clears it.
    if (state.seekLiveOnPlaying) {
      state.seekLiveOnPlaying = false;
      seekToLiveEdge();
    }
    // Back from a system interruption (call, Siri, other app audio): the live stream
    // is stale by now — re-sync to the live edge and verify real progress.
    if (wasInterrupted && resumeStartTime == null) beginResumeWatch(els.audio);
    setPlayingUI(true);
    msSetPlaybackState('playing');
  });
  els.audio.addEventListener('pause', () => {
    keeperNoteProgress(); // fresh stall baseline on the next resume
    const deliberate = state.userInitiatedStop;
    state.userInitiatedStop = false;
    if (deliberate) {
      setPlayingUI(false);
      msSetPlaybackState('paused');
      return;
    }
    if (!state.wantsPlayback) {
      if (!state.playing) return;
      setPlayingUI(false);
      msSetPlaybackState('paused');
      return;
    }
    // External interruption (phone call, other app/tab media, OS ducking):
    // STAY paused for the whole interruption. Do NOT resume on a timer here —
    // that would play over the call/other audio. We resume only when the user
    // actually returns to the app (see resumeOnReturn).
    state.pausedAt = Date.now();
    msSetPlaybackState('paused');
    els.statusText.textContent = 'PAUSED';
    els.heroHint.textContent = '통화·외부 재생 중 일시정지 — 앱으로 돌아오면 재생';
  });
  els.audio.addEventListener('error', () => {
    if (state.wantsPlayback) {
      // The user still wants playback. A genuine startup failure is handled by
      // startStream's own fallback chain (it awaits play() and moves on), so only
      // recover here once playback had actually been established. Reload now if
      // visible, otherwise as soon as the app is visible; never pop the external tab
      // for a mid-play error, and rate-limit so a dead stream cannot loop.
      if (!state.playing) return;
      const now = Date.now();
      if (now - lastErrorRecoveryAt < 8000) return;
      lastErrorRecoveryAt = now;
      setPlayingUI(false, { loading: true });
      clearResumeStall();
      state.seekLiveOnPlaying = false;
      deferOrReload();
      return;
    }
    console.warn('audio error, falling back to external player');
    openExternalPlayer();
  });
  els.audio.addEventListener('loadstart', keeperNoteProgress);
  els.audio.addEventListener('waiting', () => setPlayingUI(state.playing, { loading: true }));
  els.audio.addEventListener('timeupdate', () => {
    // Real progress after a resume → the stream is alive; cancel the plan-B reload.
    if (resumeStartTime != null && els.audio.currentTime - resumeStartTime > 0.5) clearResumeStall();
  });
  els.audio.addEventListener('progress', () => {
    // During a resume, the moment the live playlist refreshes (seekable moves on),
    // re-sync to the live edge by seeking — no reload, so the binding survives.
    if (resumeStartTime == null) return;
    const end = seekableEnd();
    if (end > resumeSeekEnd + 1) {
      resumeSeekEnd = end;
      seekToLiveEdge();
      resumeStartTime = els.audio.currentTime;
    }
  });
}

// ===== Auto-resume after interruptions (calls, other media) =====

let resumeTimer = null;

// Kept so 'playing'/stopStream/openExternalPlayer can cancel any pending resume.
function clearResumeWatch() {
  clearTimeout(resumeTimer);
  resumeTimer = null;
}

async function reacquireStream() {
  const d = state.data;
  if (!d || !els.audio || !canPlayHls(els.audio)) return;
  if (d.audioUrl && await tryAudioSrc(d.audioUrl)) return;
  if (d.audioUrlAlt) await tryAudioSrc(d.audioUrlAlt);
}

// ===== Resume without releasing the lock-screen binding (iOS) =====
//
// iOS keeps the lock-screen / Now Playing controls bound to this page only while
// the <audio> element still holds its media resource. Re-assigning src to
// "reconnect" runs the media load algorithm, which EMPTIES the element for a
// moment — iOS drops the binding and the remote play command falls through to
// the default music app (Apple Music). So on resume we never touch src first:
// play() the existing element (binding kept), then re-sync to the live edge by
// seeking once playback is confirmed. Only if playback genuinely does not start
// do we fall back to reloading the source (the previous behaviour), as plan B.
let resumeStallTimer = null;
let resumeStartTime = null; // currentTime when the resume began (progress baseline)
let resumeSeekEnd = -1;     // seekable end at resume; a later increase = playlist refreshed
let lastErrorRecoveryAt = 0;

// iOS/WebKit only: a freshly loaded resource cannot start while the page is hidden
// (it is paused by the background restriction before it can produce audio, Now
// Playing is lost and the next lock-screen play goes to Apple Music). Android — the
// Chrome PWA or the native app with its foreground service — may reload in the
// background, which is what keeps a pocketed radio alive after a dead stream.
const RELOAD_BLOCKED_WHEN_HIDDEN = /iP(hone|ad|od)/.test(navigator.userAgent)
  || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
function reloadBlockedNow() { return document.hidden && RELOAD_BLOCKED_WHEN_HIDDEN; }

function clearResumeStall() {
  clearTimeout(resumeStallTimer);
  resumeStallTimer = null;
  resumeStartTime = null;
}

function hasLoadedResource() {
  const a = els.audio;
  return !!(a && a.currentSrc && a.networkState !== HTMLMediaElement.NETWORK_EMPTY);
}

// Jump a resumed live stream to the live edge without reloading the source.
function seekToLiveEdge() {
  const a = els.audio;
  if (!a) return;
  try {
    const s = a.seekable;
    if (!s || !s.length) return;
    const end = s.end(s.length - 1);
    if (!Number.isFinite(end)) return;
    const target = Math.max(0, end - 2); // a hair behind the edge avoids stalling on the last segment
    if (Math.abs(a.currentTime - target) > 3) {
      a.currentTime = target;
      // a seek is a jump, not progress — re-baseline the resume watchdog
      if (resumeStartTime != null) resumeStartTime = a.currentTime;
    }
  } catch { /* seeking can be unsupported mid-load; harmless */ }
}

async function resumeLive() {
  const a = els.audio;
  if (!state.data || !a) return;
  state.wantsPlayback = true;
  state.userInitiatedStop = false;
  if (!hasLoadedResource()) {
    // Nothing loaded (after stop / first run). A fresh load cannot start while the
    // page is hidden (WebKit background restriction) — defer it to the foreground.
    if (reloadBlockedNow()) { state.reloadWhenVisible = true; return; }
    startStream();
    return;
  }
  clearTimeout(state.loadTimer);
  setPlayingUI(false, { loading: true });
  state.seekLiveOnPlaying = true;
  clearResumeStall();
  try {
    const p = a.play();
    if (p && typeof p.then === 'function') await p;
  } catch (err) {
    console.warn('resume play() failed', err);
    state.seekLiveOnPlaying = false;
    deferOrReload();
    return;
  }
  beginResumeWatch(a);
}

// After any resume of the existing element (lock screen, interruption ended, stray
// pause): jump to the live edge if the playlist is fresh, then verify REAL progress.
// A stale live HLS "resumes" (paused=false, 'playing' fires, readyState stays high)
// yet never advances — only currentTime is trustworthy.
function beginResumeWatch(a) {
  ensureInterruptionWatch();
  seekToLiveEdge();
  resumeStartTime = a.currentTime;
  resumeSeekEnd = seekableEnd();
  armResumeWatch(a, 0);
}

// ===== System interruption signal (iOS/WebKit) =====
//
// WebKit flips an AudioContext to state 'interrupted' while a call / Siri / another
// app holds the audio session, and back to 'running' when it ends. That is the only
// reliable "the interruption is over" signal a page gets — it lets us resume the
// moment the call ends WITHOUT ever retrying play() over the call (which used to
// leak the radio into calls). Non-WebKit browsers never report 'interrupted'.
let interruptionCtx = null;

function ensureInterruptionWatch() {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  try {
    if (!interruptionCtx) {
      interruptionCtx = new AC();
      interruptionCtx.addEventListener('statechange', () => {
        const s = interruptionCtx.state;
        if (s === 'interrupted') { state.interrupted = true; return; }
        if (s === 'running' && state.interrupted) {
          state.interrupted = false;
          if (state.wantsPlayback && els.audio && els.audio.paused) resumeLive();
        }
      });
    }
    if (interruptionCtx.state === 'suspended') interruptionCtx.resume().catch(() => {});
  } catch { /* no signal available; the keeper + foreground return still recover */ }
}

function releaseInterruptionWatch() {
  state.interrupted = false;
  if (interruptionCtx && interruptionCtx.state === 'running') interruptionCtx.suspend().catch(() => {});
}

// ===== Playback keeper: never stay silent while the user wants playback =====
//
// The user's contract with a radio: it keeps playing until THEY press stop. So while
// wantsPlayback is set, recover on our own from a stalled live stream (no progress),
// a pause we did not ask for (interruption ended, stray pause) and mid-play errors —
// within the iOS rules: seeking is always allowed, a source reload only when visible.
const KEEPER_TICK_MS = 2000;
const STALL_SEEK_MS = 8000;     // below half realtime for 8s → jump to the live edge
const STALL_RELOAD_MS = 20000;  // still stalled → reload (visible) / defer (hidden)
const PAUSED_RETRY_MS = 6000;   // non-user pause while visible → retry resume
let kpTime = -1;                // last checkpoint currentTime
let kpAt = Date.now();          // when that checkpoint was taken
let lastKeeperSeekAt = 0;
let lastKeeperReloadAt = 0;
let lastPausedRetryAt = 0;

function keeperNoteProgress() { kpTime = -1; kpAt = Date.now(); }

function keeperTick() {
  const a = els.audio;
  const now = Date.now();
  if (!a || !state.wantsPlayback || state.sleepFading) { keeperNoteProgress(); return; }
  if (resumeStartTime != null) return; // a resume watch is already driving recovery
  if (a.paused) {
    // Paused without the user asking (interruption ended, stray pause). While hidden
    // or during an interruption we must not guess — play() could leak into a call;
    // the interruption signal and the foreground return handle those. Visible: retry.
    if (document.hidden || state.interrupted) return;
    if (now - lastPausedRetryAt < PAUSED_RETRY_MS) return;
    lastPausedRetryAt = now;
    resumeLive();
    return;
  }
  const t = a.currentTime;
  if (kpTime < 0 || t < kpTime) { kpTime = t; kpAt = now; return; } // baseline, or a reload reset the clock
  const win = (now - kpAt) / 1000;
  if (win < 4) return; // too short a window to judge
  if (t - kpTime >= win * 0.5) { kpTime = t; kpAt = now; return; } // healthy: at least half realtime
  // Stalled or merely crawling for `win` seconds.
  if (win * 1000 >= STALL_SEEK_MS && now - lastKeeperSeekAt >= STALL_SEEK_MS) {
    lastKeeperSeekAt = now;
    seekToLiveEdge();
    kpTime = a.currentTime; // a seek is a jump, not progress — keep the stall clock running
  }
  if (win * 1000 >= STALL_RELOAD_MS && now - lastKeeperReloadAt >= STALL_RELOAD_MS) {
    lastKeeperReloadAt = now;
    deferOrReload(); // hidden → deferred to the foreground, visible → reload now
  }
}
setInterval(keeperTick, KEEPER_TICK_MS);

function seekableEnd() {
  try { const s = els.audio.seekable; return s && s.length ? s.end(s.length - 1) : -1; } catch { return -1; }
}

// Reload the source only while the page is visible. While hidden (screen locked)
// WebKit pauses a freshly loaded resource before it can produce audio: the element
// ends up empty and silent, Now Playing is released, and the next lock-screen play
// goes to the default music app (Apple Music). So while hidden we keep the existing
// (bound) element and do the reload as soon as the app is in the foreground.
function deferOrReload() {
  if (reloadBlockedNow()) { state.reloadWhenVisible = true; return; }
  reacquireStream();
}

const RESUME_WATCH_MS = 3000;
const RESUME_WATCH_MAX_ROUNDS = 2;

function armResumeWatch(a, round) {
  resumeStallTimer = setTimeout(() => {
    resumeStallTimer = null;
    if (!state.wantsPlayback) { resumeStartTime = null; return; }
    const start = resumeStartTime;
    const advanced = start != null && (a.currentTime - start) > 0.5;
    if (advanced && !a.paused) { resumeStartTime = null; return; } // audible progress
    // No progress yet. If Safari refreshed the live playlist (seekable moved on),
    // re-sync by seeking — no reload needed — and give it one more round.
    const end = seekableEnd();
    if (end > resumeSeekEnd + 1 && round < RESUME_WATCH_MAX_ROUNDS) {
      resumeSeekEnd = end;
      seekToLiveEdge();
      resumeStartTime = a.currentTime;
      armResumeWatch(a, round + 1);
      return;
    }
    resumeStartTime = null;
    state.seekLiveOnPlaying = false;
    deferOrReload();
  }, RESUME_WATCH_MS);
}

// Resume ONLY when the user is actually back in the app. The document.hidden
// guard is the key fix: while a call or another audio app is active the page is
// backgrounded (hidden), so we never resume and never play over it.
function attemptResume() {
  if (!state.wantsPlayback || !els.audio) return;
  if (document.hidden || !navigator.onLine || !els.audio.paused) return;
  // Resume on the existing element and re-sync to the live edge by seeking; the
  // source is only reloaded if playback fails to start (see resumeLive).
  resumeLive();
}

// The only resume trigger: the user returned to the app (foreground / focus /
// network back). Never resume on a timer while the interruption is active.
function resumeOnReturn() {
  if (state.wantsPlayback && els.audio && els.audio.paused) attemptResume();
}
document.addEventListener('visibilitychange', () => {
  if (document.hidden) return;
  // A reload was needed while the screen was locked; now that we are visible it is
  // allowed — do it first (the element may be "playing" yet silent, so resumeOnReturn
  // would not trigger on its own).
  if (state.reloadWhenVisible && state.wantsPlayback) {
    state.reloadWhenVisible = false;
    clearResumeStall();
    state.seekLiveOnPlaying = false;
    reacquireStream();
    return;
  }
  resumeOnReturn();
});
window.addEventListener('focus', resumeOnReturn);
window.addEventListener('online', resumeOnReturn);

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (!els.sleepMenu.hidden) { closeSleepMenu(); return; }
    if (state.playing) stopStream();
  }
});

function openSleepMenu() {
  els.sleepMenu.hidden = false;
  els.sleepToggle.setAttribute('aria-expanded', 'true');
}
function closeSleepMenu() {
  els.sleepMenu.hidden = true;
  els.sleepToggle.setAttribute('aria-expanded', 'false');
}
function formatRemaining(ms) {
  if (ms <= 0) return '0분';
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  if (m >= 60) {
    const h = Math.floor(m / 60);
    const rm = m % 60;
    return rm ? `${h}시간 ${rm}분` : `${h}시간`;
  }
  if (m >= 1) return `${m}분 ${s.toString().padStart(2, '0')}초 남음`;
  return `${s}초 남음`;
}
const SLEEP_FADE_MS = 30_000; // gentle volume fade over the final 30s (in-app audio only)
const SLEEP_TICK_MS = 250;    // fine cadence so the fade ramp stays smooth

function isInAppPlaying() {
  return !!(els.audio && els.audio.src && !els.audio.paused);
}
function clearSleepTimer() {
  clearTimeout(state.sleepTimer);
  clearInterval(state.sleepTickTimer);
  state.sleepTimer = null;
  state.sleepTickTimer = null;
  state.sleepEndAt = 0;
  state.sleepFading = false;
  if (els.audio) els.audio.volume = 1; // undo any in-progress fade
  els.sleepTimer.classList.remove('is-active');
  els.sleepLabel.textContent = '슬립 타이머';
}
function setSleepTimer(minutes) {
  clearSleepTimer();
  if (!minutes) return;
  state.sleepEndAt = Date.now() + minutes * 60 * 1000;
  let lastLabel = '';
  const tick = () => {
    const left = state.sleepEndAt - Date.now();
    if (left <= 0) {
      clearSleepTimer();
      if (state.playing) stopStream();
      els.sleepLabel.textContent = '슬립 종료';
      setTimeout(() => {
        if (els.sleepLabel.textContent === '슬립 종료') els.sleepLabel.textContent = '슬립 타이머';
      }, 2500);
      return;
    }
    // Ramp the volume down over the final window — only when playing in-app HLS.
    if (left <= SLEEP_FADE_MS && isInAppPlaying()) {
      state.sleepFading = true;
      els.audio.volume = Math.max(0, Math.min(1, left / SLEEP_FADE_MS));
    } else if (state.sleepFading && !isInAppPlaying()) {
      state.sleepFading = false;
      if (els.audio) els.audio.volume = 1;
    }
    const label = state.sleepFading
      ? `페이드아웃 · ${Math.ceil(left / 1000)}초`
      : formatRemaining(left);
    if (label !== lastLabel) {
      els.sleepLabel.textContent = label;
      lastLabel = label;
    }
  };
  tick();
  state.sleepTickTimer = setInterval(tick, SLEEP_TICK_MS);
  els.sleepTimer.classList.add('is-active');
}

els.sleepToggle.addEventListener('click', (e) => {
  e.stopPropagation();
  if (els.sleepMenu.hidden) openSleepMenu();
  else closeSleepMenu();
});
els.sleepMenu.addEventListener('click', (e) => {
  e.stopPropagation();
  const btn = e.target.closest('button[data-min]');
  if (!btn) return;
  const min = parseInt(btn.dataset.min, 10);
  setSleepTimer(min);
  closeSleepMenu();
});
document.addEventListener('click', (e) => {
  if (!els.sleepMenu.hidden && !els.sleepTimer.contains(e.target)) closeSleepMenu();
});

let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredInstall = e;
  els.install.classList.add('is-shown');
});
els.installBtn.addEventListener('click', async (e) => {
  e.stopPropagation();
  if (!deferredInstall) return;
  deferredInstall.prompt();
  await deferredInstall.userChoice;
  deferredInstall = null;
  els.install.classList.remove('is-shown');
});

const shareBtn = document.getElementById('shareBtn');
if (shareBtn) {
  shareBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    const shareData = {
      title: '클래식FM — 지역별 주파수',
      text: 'KBS 클래식FM 지역별 주파수 + 바로 듣기',
      url: location.origin + '/radio/',
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
    } catch (err) {
      if (err.name === 'AbortError') return;
    }
    try {
      await navigator.clipboard.writeText(shareData.url);
      const prev = shareBtn.innerHTML;
      shareBtn.innerHTML = '<span>링크 복사됨</span>';
      setTimeout(() => { shareBtn.innerHTML = prev; }, 1600);
    } catch {
      window.prompt('아래 링크를 복사하세요', shareData.url);
    }
  });
}

// ===== In-app 소개(intro) sheet =====
(function initAboutSheet() {
  const sheet = document.getElementById('aboutSheet');
  const openBtn = document.getElementById('aboutBtn');
  if (!sheet || !openBtn) return;
  const closeBtn = document.getElementById('aboutClose');
  const returnBtn = document.getElementById('aboutReturn');
  const backdrop = document.getElementById('aboutBackdrop');
  let lastFocus = null;
  let hideTimer = null;

  function openSheet(e) {
    if (e) e.stopPropagation();
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; } // cancel any pending hide → race-free reopen
    lastFocus = document.activeElement;
    sheet.hidden = false;
    // force reflow so the initial translateY(100%) is committed, then transition up.
    // Synchronous + reliable — avoids rAF timing gaps after heavy prior interactions.
    void sheet.offsetWidth;
    sheet.classList.add('is-open');
    document.body.style.overflow = 'hidden';
    (closeBtn || sheet).focus?.();
  }
  function closeSheet(e) {
    if (e) e.stopPropagation();
    if (sheet.hidden) return;
    sheet.classList.remove('is-open');
    document.body.style.overflow = '';
    if (hideTimer) clearTimeout(hideTimer);
    hideTimer = setTimeout(() => { sheet.hidden = true; hideTimer = null; }, 340); // hide after slide-down
    lastFocus?.focus?.();
  }

  openBtn.addEventListener('click', openSheet);
  closeBtn?.addEventListener('click', closeSheet);
  returnBtn?.addEventListener('click', closeSheet);
  backdrop?.addEventListener('click', closeSheet);
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  });

  // Relaunch / bfcache restore → always land on the radio main screen (sheet closed).
  window.addEventListener('pageshow', () => {
    if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
    sheet.classList.remove('is-open');
    sheet.hidden = true;
    document.body.style.overflow = '';
  });
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn(err));
  });
}

// ===== Geolocation auto-select =====

function haversineKm(a, b) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function nearestRegion(lat, lng) {
  if (!state.data) return null;
  let best = null;
  let bestKm = Infinity;
  for (const r of state.data.regions) {
    if (typeof r.lat !== 'number' || typeof r.lng !== 'number') continue;
    const km = haversineKm({ lat, lng }, { lat: r.lat, lng: r.lng });
    if (km < bestKm) { best = r; bestKm = km; }
  }
  return best ? { region: best, km: bestKm } : null;
}

function setGeoSub(text) {
  if (els.geoSub) els.geoSub.textContent = text;
}

function applyGeoFix(pos) {
  const { latitude: lat, longitude: lng } = pos.coords;
  const result = nearestRegion(lat, lng);
  if (!result) { setGeoSub('근처 지역을 찾지 못했습니다'); return; }
  const { region, km } = result;
  if (!state.current || state.current.city !== region.city) {
    setCurrent(region);
    updateMediaMetadata();
  }
  const dist = km < 1 ? `${Math.round(km * 1000)}m` : `${km.toFixed(1)}km`;
  setGeoSub(`${region.city} (${region.freq.toFixed(1)} MHz) · ${dist}`);
  state.geoLastSnapAt = Date.now();
  // Location known → collapse the region list to a clean hero (list stays
  // one tap away via the reveal button).
  setRegionsAuto(true);
}

// Conditional list visibility: hide the region list once location is known,
// show it as a fallback when geo is off/denied/unavailable.
function setRegionsAuto(on) {
  if (!els.regions) return;
  const was = els.regions.classList.contains('is-auto');
  els.regions.classList.toggle('is-auto', on);
  if ((on && !was) || !on) {
    els.regions.classList.remove('is-revealed');
    if (els.regionsReveal) els.regionsReveal.setAttribute('aria-expanded', 'false');
    if (els.regionsRevealText) els.regionsRevealText.textContent = '다른 지역 주파수 보기';
  }
}

function geoError(err) {
  const map = {
    1: '위치 권한이 거부되었습니다 — 설정에서 허용 후 재시도',
    2: '위치를 가져올 수 없습니다 (GPS 신호 없음)',
    3: '위치 요청 시간 초과',
  };
  setGeoSub(map[err.code] || '위치 오류');
  // Only a hard permission denial turns auto-detect off. Transient GPS
  // errors (no signal / timeout) keep the watch alive and retry, so the
  // user never has to grant permission again.
  if (err.code === 1) setTimeout(() => disableGeo({ silent: true }), 2000);
}

function enableGeo() {
  if (!('geolocation' in navigator)) {
    setGeoSub('이 기기는 위치 기능을 지원하지 않습니다');
    return;
  }
  state.geoEnabled = true;
  els.geoToggle.classList.add('is-on');
  els.geoToggle.setAttribute('aria-checked', 'true');
  localStorage.setItem(GEO_KEY, '1');
  setGeoSub('위치 가져오는 중…');
  navigator.geolocation.getCurrentPosition(applyGeoFix, geoError, GEO_OPTS);
  if (state.geoWatchId !== null) navigator.geolocation.clearWatch(state.geoWatchId);
  state.geoWatchId = navigator.geolocation.watchPosition((pos) => {
    if (Date.now() - state.geoLastSnapAt < GEO_WATCH_THROTTLE_MS) return;
    applyGeoFix(pos);
  }, geoError, GEO_OPTS);
}

function disableGeo({ silent = false } = {}) {
  state.geoEnabled = false;
  els.geoToggle.classList.remove('is-on');
  els.geoToggle.setAttribute('aria-checked', 'false');
  localStorage.setItem(GEO_KEY, '0'); // remember explicit opt-out
  if (state.geoWatchId !== null) {
    navigator.geolocation.clearWatch(state.geoWatchId);
    state.geoWatchId = null;
  }
  if (!silent) setGeoSub('제주↔서귀포 이동 시 주파수 자동 선택');
  setRegionsAuto(false); // geo off → show the list as fallback
}

// Auto-detect location on load. Once permission is granted we never prompt
// again — we just start detecting. A manual off (GEO_KEY==='0') is respected.
async function initGeoAuto() {
  if (!('geolocation' in navigator)) return;
  const pref = localStorage.getItem(GEO_KEY); // '1' on · '0' user opted out · null unset
  if (pref === '0') return;
  if (!('permissions' in navigator) || !navigator.permissions || !navigator.permissions.query) {
    if (pref === '1') enableGeo();
    return;
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state === 'granted' || (pref === '1' && status.state !== 'denied')) {
      enableGeo();
    }
    status.onchange = () => {
      if (status.state === 'granted' && localStorage.getItem(GEO_KEY) !== '0') {
        if (!state.geoEnabled) enableGeo();
      } else if (status.state === 'denied') {
        disableGeo({ silent: true });
      }
    };
  } catch {
    if (pref === '1') enableGeo();
  }
}

// Auto-detect location on load. Once permission is granted we never prompt
// again — we just start detecting. A manual off (GEO_KEY==='0') is respected.
async function initGeoAuto() {
  if (!('geolocation' in navigator)) return;
  const pref = localStorage.getItem(GEO_KEY); // '1' on · '0' user opted out · null unset
  if (pref === '0') return;
  if (!('permissions' in navigator) || !navigator.permissions || !navigator.permissions.query) {
    if (pref === '1') enableGeo();
    return;
  }
  try {
    const status = await navigator.permissions.query({ name: 'geolocation' });
    if (status.state === 'granted' || (pref === '1' && status.state !== 'denied')) {
      enableGeo();
    }
    status.onchange = () => {
      if (status.state === 'granted' && localStorage.getItem(GEO_KEY) !== '0') {
        if (!state.geoEnabled) enableGeo();
      } else if (status.state === 'denied') {
        disableGeo({ silent: true });
      }
    };
  } catch {
    if (pref === '1') enableGeo();
  }
}

if (els.geoToggle) {
  els.geoToggle.addEventListener('click', () => {
    if (state.geoEnabled) disableGeo();
    else enableGeo();
  });
}

if (els.regionsReveal) {
  els.regionsReveal.addEventListener('click', () => {
    const revealed = els.regions.classList.toggle('is-revealed');
    els.regionsReveal.setAttribute('aria-expanded', String(revealed));
    if (els.regionsRevealText) {
      els.regionsRevealText.textContent = revealed ? '주파수 목록 접기' : '다른 지역 주파수 보기';
    }
  });
}

// ===== Media Session (car / lock screen controls) =====
//
// Adapter: browsers use the Media Session Web API. The Android WebView has none, so
// the native (Capacitor) app ships the @jofr/capacitor-media-session plugin, which
// provides the same surface plus a foreground service for background playback. The
// plugin's script is only included in the native bundle (radio/store/src/build-
// personal-app.js); on the website `nativeMediaSession` is simply null.
const nativeMediaSession = (typeof window !== 'undefined'
  && window.capacitorMediaSession && window.capacitorMediaSession.MediaSession) || null;
const hasMediaSession = !!nativeMediaSession || ('mediaSession' in navigator);

function msSetPlaybackState(playbackState) {
  if (nativeMediaSession) { nativeMediaSession.setPlaybackState({ playbackState }).catch(() => {}); return; }
  if ('mediaSession' in navigator) navigator.mediaSession.playbackState = playbackState;
}
function msSetMetadata(meta) {
  if (nativeMediaSession) { nativeMediaSession.setMetadata(meta).catch(() => {}); return; }
  if ('mediaSession' in navigator) navigator.mediaSession.metadata = new MediaMetadata(meta);
}
function msSetActionHandler(action, handler) {
  if (nativeMediaSession) { nativeMediaSession.setActionHandler({ action }, handler).catch(() => {}); return; }
  if ('mediaSession' in navigator) navigator.mediaSession.setActionHandler(action, handler);
}

function updateMediaMetadata() {
  if (!hasMediaSession || !state.current) return;
  const r = state.current;
  const abs = (p) => new URL(p, location.href).href; // absolute for the native notification
  msSetMetadata({
    title: 'KBS 클래식FM',
    artist: `${r.city} · ${r.freq.toFixed(1)} MHz`,
    album: 'KBS 1FM Classic',
    artwork: [
      { src: abs('./icons/icon-192.png'), sizes: '192x192', type: 'image/png' },
      { src: abs('./icons/icon-512.png'), sizes: '512x512', type: 'image/png' },
    ],
  });
}

function setupMediaSession() {
  if (!hasMediaSession) return;
  const ms = { setActionHandler: msSetActionHandler };
  ms.setActionHandler('play', () => {
    // Resume WITHOUT reloading the source: reloading empties the element and iOS
    // then hands the lock-screen play command to Apple Music. resumeLive() plays
    // the existing element (binding kept), re-syncs to the live edge, and only
    // reloads if playback fails to start.
    resumeLive();
  });
  ms.setActionHandler('pause', () => {
    // Deliberate user pause (lock screen / headphones / car). Clear the intent
    // so it is not mistaken for an interruption and does not auto-resume, and
    // set the lock-screen state to paused immediately so the button settles on
    // the play icon without flickering.
    state.wantsPlayback = false;
    state.userInitiatedStop = true;
    clearResumeWatch();
    clearResumeStall(); // a pending plan-B reload must not fire after the user paused
    state.seekLiveOnPlaying = false;
    state.reloadWhenVisible = false;
    if (els.audio && !els.audio.paused) els.audio.pause();
    msSetPlaybackState('paused');
  });
  ms.setActionHandler('stop', () => stopStream());
  // togglemuteoff is what some car controls send — handle as play
  try { ms.setActionHandler('seekto', null); } catch {}
  try { ms.setActionHandler('previoustrack', null); } catch {}
  try { ms.setActionHandler('nexttrack', null); } catch {}
}

setupMediaSession();

function tickClock() {
  if (!els.heroNow) return;
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
  const parts = fmt.formatToParts(now);
  const get = (t) => parts.find(p => p.type === t)?.value ?? '';
  els.heroNow.textContent = `${get('year')}.${get('month')}.${get('day')} · ${get('hour')}:${get('minute')} KST`;
}
tickClock();
setInterval(tickClock, 15000);

window.addEventListener('online', () => {
  if (!state.data) {
    loadStations().then(d => {
      state.data = d;
      renderGroups(d);
      setCurrent(pickDefault(d));
      els.heroHint.textContent = '화면 아무데나 터치';
    }).catch(() => {});
  }
});

// Try to start playing as soon as the app opens. Browser autoplay policy may
// block this without a prior user gesture (common on iOS); in that case we
// quietly fall back to the idle "tap to play" state and never open an
// external tab.
async function autoStart() {
  const d = state.data;
  if (!d || !els.audio || !canPlayHls(els.audio)) return;
  state.wantsPlayback = true;
  state.userInitiatedStop = false;
  setPlayingUI(false, { loading: true });
  if ((d.audioUrl && await tryAudioSrc(d.audioUrl)) ||
      (d.audioUrlAlt && await tryAudioSrc(d.audioUrlAlt))) {
    els.heroHint.textContent = '앱 내 재생 중 · 차량 컨트롤 작동';
    return;
  }
  // Autoplay blocked (no user gesture yet) — leave idle so a tap starts it.
  state.wantsPlayback = false;
  setPlayingUI(false);
  els.heroHint.textContent = 'KBS 클래식FM · 탭하여 재생';
}

(async () => {
  try {
    state.data = await loadStations();
    renderGroups(state.data);
    setCurrent(pickDefault(state.data));
    initGeoAuto();
    autoStart();
  } catch (err) {
    console.error(err);
    els.heroHint.textContent = '데이터 로드 실패 — 네트워크 확인 후 새로고침';
  }
})();
