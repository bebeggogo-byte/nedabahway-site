/*
 * violin/sw.js — 바이올린 놀이 오프라인 지원 (scope: /violin/)
 * 한 파일짜리 앱이라 index.html·아이콘·매니페스트만 캐시한다.
 *   - 페이지: NETWORK-FIRST. 새 버전을 먼저 받고, 연결이 없을 때만 캐시로 연다.
 *   - 그 밖의 같은 출처 GET: 캐시 우선, 없으면 네트워크.
 * 파일 구성이 바뀌면 CACHE 이름을 올린다.
 */
'use strict';
const CACHE = 'violin-v1';
const ASSETS = [
  './',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()).catch(() => {})
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('violin-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./'))
    );
    return;
  }
  e.respondWith(caches.match(req).then((hit) => hit || fetch(req)));
});
