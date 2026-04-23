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
};

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
  if (isPlaying) {
    els.statusText.textContent = 'ON AIR';
    els.actionIcon.innerHTML = ICON_PLAY;
    els.actionText.textContent = '다시 열기';
    els.heroHint.textContent = 'KBS 공식 라이브 재생 중 · 새 탭에서';
  } else {
    els.statusText.textContent = 'OFF AIR';
    els.actionIcon.innerHTML = ICON_PLAY;
    els.actionText.textContent = '라이브 듣기';
    els.heroHint.textContent = 'KBS 공식 라디오 플레이어 열기';
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

function startStream() {
  if (!state.data) return;
  const d = state.data;

  clearTimeout(state.loadTimer);

  if (d.streamType === 'external' && d.streamUrl) {
    window.open(d.streamUrl, '_blank', 'noopener');
    closePlayerDock();
    setPlayingUI(true);
    return;
  }

  showFallback('재생 설정을 확인할 수 없습니다.');
}

function stopStream() {
  clearTimeout(state.loadTimer);
  els.playerFrameInner.replaceChildren();
  closePlayerDock();
  setPlayingUI(false);
}

function toggleStream() {
  // External player: always (re)open YouTube on tap — we can't control
  // the remote tab/app, so the user gesture always means "play now".
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

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(err => console.warn(err));
  });
}

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
  } catch (err) {
    console.error(err);
    els.heroHint.textContent = '데이터 로드 실패 — 네트워크 확인 후 새로고침';
  }
})();
