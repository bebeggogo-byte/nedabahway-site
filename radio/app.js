const GROUP_ORDER = ['즐겨찾기', '수도권', '강원', '충청', '호남', '영남', '제주'];
const STORAGE_KEY = 'classicfm.lastCity';

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
  audio: document.getElementById('audio'),
  install: document.getElementById('install'),
  installBtn: document.getElementById('installBtn'),
};

const ICON_PLAY = '<path d="M8 5v14l11-7z"/>';
const ICON_STOP = '<path d="M6 6h12v12H6z"/>';
const ICON_OPEN = '<path d="M14 3h7v7M10 14L21 3M21 14v5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>';

const state = {
  data: null,
  current: null,
  playing: false,
  externalOpened: false,
};

async function loadStations() {
  const res = await fetch('./stations.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('stations load failed');
  return res.json();
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
      btn.innerHTML = `
        <span class="station__city">${r.city}</span>
        <span class="station__freq">${r.freq.toFixed(1)}<span class="station__unit">MHz</span></span>
      `;
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        setCurrent(r);
        triggerPlay();
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

function setPlayingUI(isPlaying) {
  state.playing = isPlaying;
  els.hero.classList.toggle('is-playing', isPlaying);
  if (isPlaying) {
    els.statusText.textContent = 'ON AIR';
    els.actionIcon.innerHTML = ICON_OPEN;
    els.actionText.textContent = '재생 중 · KBS Kong';
    els.heroHint.textContent = '다시 탭하면 플레이어 새로 열기';
  } else {
    els.statusText.textContent = 'OFF AIR';
    els.actionIcon.innerHTML = ICON_PLAY;
    els.actionText.textContent = '탭하여 재생';
    els.heroHint.textContent = '화면 아무데나 터치';
  }
}

function triggerPlay() {
  if (!state.data || !state.current) return;
  const { streamUrl, streamType } = state.data;

  if (streamType === 'external') {
    const win = window.open(streamUrl, 'classicfm_player');
    if (win) {
      state.externalOpened = true;
      setPlayingUI(true);
    } else {
      els.heroHint.textContent = '팝업이 차단되었습니다 — 브라우저 설정 확인';
    }
    return;
  }

  els.audio.src = streamUrl;
  els.audio.play().catch(err => {
    console.error('play failed', err);
    els.heroHint.textContent = '재생 실패 — 네트워크 확인';
  });
}

els.hero.addEventListener('click', () => {
  triggerPlay();
});
els.hero.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    triggerPlay();
  }
});

els.audio.addEventListener('playing', () => setPlayingUI(true));
els.audio.addEventListener('pause', () => setPlayingUI(false));
els.audio.addEventListener('ended', () => setPlayingUI(false));
els.audio.addEventListener('error', () => {
  setPlayingUI(false);
  els.heroHint.textContent = '재생 실패';
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

(async () => {
  try {
    state.data = await loadStations();
    renderGroups(state.data);
    setCurrent(pickDefault(state.data));
  } catch (err) {
    console.error(err);
    els.heroHint.textContent = '데이터 로드 실패';
  }
})();
