const CACHE_NAME = 'verifiedbizlink-v3';
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

  // Skip Next.js's content-hashed build assets (_next/static/**). These are
  // immutable per-deploy — a page cached from before a new deploy will
  // reference chunk hashes that no longer exist on the server, and letting
  // this handler "help" by synthesizing a fake 503 on that failed fetch
  // reads as a server outage in devtools when it's actually just a stale
  // client-side cache. The browser's own HTTP cache already handles these
  // assets correctly without the service worker's involvement.
  if (event.request.url.includes('/_next/static/')) {
    return;
  }

  // For HTML and other assets: try network first, fallback to cache
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
