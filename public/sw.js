// v6
// - Only this site's own requests are handled. Images on other origins
//   (Supabase avatars, etc.) go straight to the browser: intercepting them
//   turned every failed avatar into an "Uncaught (in promise) Failed to fetch"
//   and cached opaque responses, which Chrome counts as ~7 MB each of quota.
// - Nothing here ever rejects: a request that can't be served resolves to
//   Response.error(), which is exactly what the page would have seen anyway.
// - Pages are never cached (the home page is a member's personalised feed),
//   but when there's no connection a navigation gets /offline.html instead of
//   the browser's error screen. The Android app shows the same page.
// - Next.js build output under /_next/static/ is content-hashed and never
//   changes, so it is served cache-first: repeat visits skip the network.
const VERSION = 'v6';
const STATIC_CACHE = `vbl-static-${VERSION}`;
const ASSET_CACHE = `vbl-assets-${VERSION}`;
const OFFLINE_URL = '/offline.html';
const PRECACHE = [OFFLINE_URL, '/icon-192.png'];
const MAX_ASSETS = 120;
const MAX_STATIC = 300; // old deploys' chunks age out instead of piling up

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(
        names.filter((n) => n !== STATIC_CACHE && n !== ASSET_CACHE).map((n) => caches.delete(n))
      ))
      .then(() => self.clients.claim())
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  // Oldest first; the precached offline page is never evicted.
  const keys = (await cache.keys()).filter((req) => !PRECACHE.includes(new URL(req.url).pathname));
  for (let i = 0; i < keys.length - max; i++) await cache.delete(keys[i]);
}

function putInBackground(event, cacheName, request, response) {
  if (!response || response.status !== 200 || response.type !== 'basic') return;
  const copy = response.clone();
  event.waitUntil(
    caches.open(cacheName)
      .then((cache) => cache.put(request, copy))
      .then(() => trim(cacheName, cacheName === ASSET_CACHE ? MAX_ASSETS : MAX_STATIC))
      .catch(() => {})
  );
}

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // other sites: browser handles it
  if (url.pathname.startsWith('/api/')) return;     // live data: always network

  // Pages: network only, offline page when there is no network. Redirects
  // (apex -> www) pass through untouched because the response is the network's.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => (await caches.match(OFFLINE_URL)) || Response.error())
    );
    return;
  }

  // Hashed build output: cache first, it never changes for a given URL.
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(
      caches.match(request).then((hit) => hit || fetch(request).then((res) => {
        putInBackground(event, STATIC_CACHE, request, res);
        return res;
      })).catch(() => Response.error())
    );
    return;
  }

  // Images, fonts, manifest: network first so updates show, cache when offline.
  if (/\.(png|jpe?g|gif|svg|webp|avif|ico|woff2?|ttf)$/i.test(url.pathname) || url.pathname === '/manifest.json') {
    event.respondWith(
      fetch(request).then((res) => {
        putInBackground(event, ASSET_CACHE, request, res);
        return res;
      }).catch(async () => (await caches.match(request)) || Response.error())
    );
  }
  // Everything else (RSC/prefetch requests, etc.) goes straight to the network.
});
