// Service worker for the Classic Radio Tuner PWA (public, hand-off version).
const CACHE = 'tuner-v1';
const SHELL = ['./', './index.html', './icons/icon-192.png', './icons/icon-512.png', './manifest.webmanifest'];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== location.origin) return; // never intercept KBS/YouTube navigations
  e.respondWith(caches.match(e.request).then((r) => r || fetch(e.request)));
});
