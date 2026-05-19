/*
 * sw.js — 네다바웨이 site-wide service worker (SPEC-REVISIT-001 REQ-RV-005/006/008)
 * Scope: '/' (registered from page roots via assets/analytics.js).
 *
 * Cache strategy:
 *   - install : pre-cache the minimal offline shell (start URL, CSS bundle,
 *               manifest, offline fallback page).
 *   - navigations (mode === 'navigate'): NETWORK-FIRST. The network response is
 *               preferred so content is never indefinitely stale; on success the
 *               response is copied into the runtime cache; on failure the cached
 *               copy is served, and on a full miss the offline fallback page is
 *               returned.
 *   - other GET requests (CSS/JS/SVG/images): STALE-WHILE-REVALIDATE. The cached
 *               copy is served immediately while a background fetch refreshes it.
 *   - activate : delete every cache whose name does not match the current
 *               versioned CACHE_VERSION, then claim open clients.
 *
 * Out of scope (SPEC-REVISIT-001): Web Push, background sync. The worker provides
 * offline support and re-visit caching only.
 *
 * Versioning: bump CACHE_VERSION whenever the offline shell or this file changes.
 */
'use strict';

const CACHE_VERSION = 'nedabah-v1-2026-05-19';
const OFFLINE_URL = '/offline.html';

// Minimal offline shell — pre-cached on install.
const SHELL = [
  '/',
  '/offline.html',
  '/manifest.webmanifest',
  '/assets/nedabah.bundle.css',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => { /* a missing shell entry must not block install */ })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((key) => key !== CACHE_VERSION).map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;

  // Only handle same-origin GET requests; let everything else pass through.
  if (req.method !== 'GET') return;
  let url;
  try {
    url = new URL(req.url);
  } catch (_) {
    return;
  }
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first with cache fallback, then offline page.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then((cached) => cached || caches.match(OFFLINE_URL)))
    );
    return;
  }

  // Static assets: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
