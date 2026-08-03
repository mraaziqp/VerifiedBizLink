const CACHE_NAME = 'verifiedbizlink-v4';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/favicon.ico',
  '/_next/static/',
];

// Install event - cache core assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[SW] Installing and caching core assets');
      return cache.addAll(['/']);
    })
  );
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip non-http requests (chrome-extension, etc)
  if (!event.request.url.startsWith('http')) {
    return;
  }

  // Do NOT intercept navigations — let the browser handle them natively so
  // domain redirects (e.g. apex -> www) actually move the address bar instead
  // of being masked by a cached HTML response.
  if (event.request.mode === 'navigate') {
    return;
  }

  // Skip API requests entirely — let them hit the network directly. (Don't
  // synthesize a 503 on failure: that masked real upload/redirect errors.)
  if (event.request.url.includes('/api/')) {
    return;
  }

  // Only intercept actual static assets (images, fonts, the manifest) —
  // NOT page-shaped URLs. Next.js's router prefetches routes (e.g. /settings)
  // with a plain same-origin GET that isn't a navigation and isn't under
  // /_next/static/, so an "intercept everything else" fallback here was
  // catching those too; letting one fail (a transient blip, a stale build
  // after a deploy) surfaced as an uncaught rejection on a URL that looked
  // like a whole page was broken. Everything not matching this allowlist —
  // including _next/static/** and page/RSC prefetch requests — is left
  // alone and goes straight to the network like navigations already do.
  const isStaticAsset = /\.(png|jpe?g|gif|svg|webp|ico|woff2?|ttf|css)$/i.test(event.request.url)
    || event.request.url.endsWith('/manifest.json');
  if (!isStaticAsset) {
    return;
  }

  // For static assets: try network first, fallback to cache
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response
        const responseClone = response.clone();

        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }

        return response;
      })
      .catch(async (networkError) => {
        // Network failed — serve the cached copy if we have one (genuinely
        // useful offline). If we don't, re-throw the real network error
        // instead of fabricating a 503: a manufactured "Service Unavailable"
        // reads as a server outage in devtools when the actual cause could
        // be anything (offline, a 404, a blocked request) — the real error
        // is more useful for diagnosing what actually happened.
        const cachedResponse = await caches.match(event.request);
        if (cachedResponse) return cachedResponse;
        throw networkError;
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-posts') {
    event.waitUntil(syncPosts());
  }
});

async function syncPosts() {
  try {
    const db = await openDB();
    const posts = await db.getAll('pending_posts');

    for (const post of posts) {
      try {
        await fetch('/api/posts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(post),
        });
        await db.delete('pending_posts', post.id);
      } catch (error) {
        console.error('Failed to sync post:', error);
      }
    }
  } catch (error) {
    console.error('Sync failed:', error);
  }
}

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('VerifiedBizLink', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('pending_posts')) {
        db.createObjectStore('pending_posts', { keyPath: 'id' });
      }
    };
  });
}
