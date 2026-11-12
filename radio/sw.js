/*
 * radio/sw.js — 클래식FM 오프라인 지원 (scope: /radio/)
 *   - 페이지·스크립트·데이터(HTML/JS/JSON/manifest): NETWORK-FIRST.
 *     배포 직후에도 항상 최신 파일을 받고, 연결이 없을 때만 캐시로 연다.
 *     (예전 stale-while-revalidate는 옛 파일을 먼저 보여 주고, 새 index.html과
 *      옛 features.js가 섞여 동작이 깨질 수 있었다.)
 *   - 아이콘·배경 사진: 캐시 우선.
 *   - 브라우저 HTTP 캐시(GitHub Pages max-age=600)를 건너뛰도록 cache:'no-cache'로 받는다.
 *   - 같은 사이트의 다른 앱(바이올린 등) 캐시는 건드리지 않는다 — classic-fm-* 만 정리.
 * 파일 구성이 바뀌면 CACHE 이름을 올린다.
 */
const CACHE = 'classic-fm-v36';
const PREFIX = 'classic-fm-';
const ASSETS = [
  './',
  './index.html',
  './app.js',
  './features.js',
  './stations.json',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './bg/scene.webp',
  './bg/scene.jpg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(ASSETS.map(u => new Request(u, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k.startsWith(PREFIX) && k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isCode(url, req) {
  return req.mode === 'navigate' || /\.(html|js|json|webmanifest)$/i.test(url.pathname) || url.pathname.endsWith('/');
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Never cache audio/video streams or live media
  if (url.hostname.includes('youtube.com') || url.hostname.includes('ytimg.com')
      || url.hostname.includes('googlevideo.com') || url.hostname.includes('kbs.co.kr')
      || url.hostname.includes('bsod.kr') || url.hostname.includes('workers.dev')) {
    return;
  }

  if (url.origin === self.location.origin) {
    if (isCode(url, req)) {
      // Network-first: always the deployed version when online
      e.respondWith(
        fetch(req, { cache: 'no-cache' }).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          }
          return res;
        }).catch(() => caches.match(req).then(hit => hit || caches.match('./')))
      );
      return;
    }
    // Images: cache-first
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        }
        return res;
      }))
    );
    return;
  }

  // Cross-origin fonts: cache-first with network fallback
  if (url.hostname.includes('fonts.googleapis.com')
      || url.hostname.includes('fonts.gstatic.com')
      || url.hostname.includes('cdn.jsdelivr.net')) {
    e.respondWith(
      caches.match(req).then(cached => {
        if (cached) return cached;
        return fetch(req).then(res => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then(c => c.put(req, copy));
          }
          return res;
        }).catch(() => cached);
      })
    );
  }
});
