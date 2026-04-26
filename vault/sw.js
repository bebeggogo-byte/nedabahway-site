// 네다바 Vault Monitor — Service Worker
// 오프라인 지원 + 빠른 재방문 (통계 데이터는 항상 최신 시도)
const CACHE = 'vault-monitor-v2';
const ASSETS = [
  '/vault/',
  '/vault/index.html',
  '/vault/manifest.webmanifest',
  '/vault/icon-192.png',
  '/vault/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (!url.pathname.startsWith('/vault/')) return;

  // stats.json: network-first, cache fallback
  if (url.pathname.endsWith('stats.json')) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const clone = res.clone();
        caches.open(CACHE).then((c) => c.put(e.request, clone)).catch(() => {});
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // shell: cache-first
  e.respondWith(caches.match(e.request).then((c) => c || fetch(e.request)));
});
