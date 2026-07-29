/* 네다바 SBM 관찰 앱 — 서비스 워커 (scope: /app/).
   전략:
   - install : 앱 셸 + 책 매니페스트 + 검색 인덱스 선캐시(검색이 즉시 오프라인).
   - /app/data/obs/*.json : cache-first (내용 불변 — 한 번 받으면 계속).
   - navigate(/app/*) : network-first → 실패 시 /app/ 셸(SPA 폴백).
   - 기타 /app/ 자산 : stale-while-revalidate.
   - "전체 저장"은 앱이 전 장 URL을 fetch하면 이 SW가 cache-first로 담는다.
   셸/데이터 변경 시 VERSION을 올린다. */
'use strict';

const VERSION = 'sbm-app-v1-2026-07-29';
const SHELL = [
  '/app/',
  '/app/index.html',
  '/app/app.css',
  '/app/app.js',
  '/app/manifest.webmanifest',
  '/app/data/books.json',
  '/app/data/search-index.json',
  '/assets/app-icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isData(url) { return url.pathname.startsWith('/app/data/'); }

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin || !url.pathname.startsWith('/app')) return;

  // 데이터 JSON: cache-first (불변)
  if (isData(url)) {
    e.respondWith(
      caches.match(req).then(hit => hit || fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => hit))
    );
    return;
  }

  // 내비게이션: network-first → SPA 셸 폴백
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => caches.match(req).then(hit => hit || caches.match('/app/')))
    );
    return;
  }

  // 기타 앱 자산: stale-while-revalidate
  e.respondWith(
    caches.match(req).then(hit => {
      const net = fetch(req).then(res => {
        const copy = res.clone();
        caches.open(VERSION).then(c => c.put(req, copy));
        return res;
      }).catch(() => hit);
      return hit || net;
    })
  );
});
