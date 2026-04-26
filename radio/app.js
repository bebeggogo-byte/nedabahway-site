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
  loadTimer: null,
  sleepTimer: null,
  sleepTickTimer: null,
  sleepEndAt: 0,
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

  clearTimeout(state.loadTimer);
  setPlayingUI(false, { loading: true });

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
  els.playerFrameInner.replaceChildren();
  closePlayerDock();
  if (els.audio) {
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
    setPlayingUI(true);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'playing';
  });
  els.audio.addEventListener('pause', () => {
    if (!state.playing) return;
    setPlayingUI(false);
    if ('mediaSession' in navigator) navigator.mediaSession.playbackState = 'paused';
  });
  els.audio.addEventListener('error', () => {
    console.warn('audio error, falling back to external player');
    openExternalPlayer();
  });
  els.audio.addEventListener('waiting', () => setPlayingUI(state.playing, { loading: true }));
}

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
function clearSleepTimer() {
  clearTimeout(state.sleepTimer);
  clearInterval(state.sleepTickTimer);
  state.sleepTimer = null;
  state.sleepTickTimer = null;
  state.sleepEndAt = 0;
  els.sleepTimer.classList.remove('is-active');
  els.sleepLabel.textContent = '슬립 타이머';
}
function setSleepTimer(minutes) {
  clearSleepTimer();
  if (!minutes) return;
  state.sleepEndAt = Date.now() + minutes * 60 * 1000;
  const tick = () => {
    const left = state.sleepEndAt - Date.now();
    if (left <= 0) {
      clearSleepTimer();
      if (state.playing) stopStream();
      els.sleepLabel.textContent = '슬립 종료';
      setTimeout(() => { els.sleepLabel.textContent = '슬립 타이머'; }, 2500);
      return;
    }
    els.sleepLabel.textContent = formatRemaining(left);
  };
  tick();
  state.sleepTickTimer = setInterval(tick, 1000);
  state.sleepTimer = setTimeout(tick, minutes * 60 * 1000);
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
}

function geoError(err) {
  const map = {
    1: '위치 권한이 거부되었습니다 — 설정에서 허용 후 재시도',
    2: '위치를 가져올 수 없습니다 (GPS 신호 없음)',
    3: '위치 요청 시간 초과',
  };
  setGeoSub(map[err.code] || '위치 오류');
  setTimeout(() => disableGeo({ silent: true }), 2000);
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
  localStorage.removeItem(GEO_KEY);
  if (state.geoWatchId !== null) {
    navigator.geolocation.clearWatch(state.geoWatchId);
    state.geoWatchId = null;
  }
  if (!silent) setGeoSub('제주↔서귀포 이동 시 주파수 자동 선택');
}

if (els.geoToggle) {
  els.geoToggle.addEventListener('click', () => {
    if (state.geoEnabled) disableGeo();
    else enableGeo();
  });
}

// ===== Media Session (car / lock screen controls) =====

function updateMediaMetadata() {
  if (!('mediaSession' in navigator) || !state.current) return;
  const r = state.current;
  navigator.mediaSession.metadata = new MediaMetadata({
    title: 'KBS 클래식FM',
    artist: `${r.city} · ${r.freq.toFixed(1)} MHz`,
    album: 'KBS 1FM Classic',
    artwork: [
      { src: './icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: './icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  });
}

function setupMediaSession() {
  if (!('mediaSession' in navigator)) return;
  const ms = navigator.mediaSession;
  ms.setActionHandler('play', () => {
    if (els.audio && els.audio.src) {
      els.audio.play().catch(() => startStream());
    } else {
      startStream();
    }
  });
  ms.setActionHandler('pause', () => {
    if (els.audio && !els.audio.paused) {
      els.audio.pause();
    }
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

(async () => {
  try {
    state.data = await loadStations();
    renderGroups(state.data);
    setCurrent(pickDefault(state.data));
    if (localStorage.getItem(GEO_KEY) === '1') enableGeo();
  } catch (err) {
    console.error(err);
    els.heroHint.textContent = '데이터 로드 실패 — 네트워크 확인 후 새로고침';
  }
})();
