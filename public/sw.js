// SIMAQ PWA Service Worker (v2 - Production VPS & Inertia SPA Ready)
const STATIC_CACHE = 'simaq-static-v2';
const PAGES_CACHE = 'simaq-pages-v2';
const INERTIA_CACHE = 'simaq-inertia-v2';
const VALID_CACHES = [STATIC_CACHE, PAGES_CACHE, INERTIA_CACHE];

const CORE_STATIC_ASSETS = [
    '/manifest.webmanifest',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/icons/icon-maskable.png',
    '/captura.png',
];

// Endpoints that must ALWAYS hit the network and never be cached by the SW
const NETWORK_ONLY_PREFIXES = [
    '/api/v1/sync/',
    '/api/notifications/',
    '/up',
    '/login',
    '/logout',
    '/auth/',
    '/sanctum/',
];

// Install Event: Pre-cache core shell assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(STATIC_CACHE).then((cache) => {
            return cache.addAll(CORE_STATIC_ASSETS).catch((err) => {
                console.warn('[SW] Non-critical install cache failure:', err);
            });
        })
    );
    self.skipWaiting();
});

// Activate Event: Clean up obsolete caches from older deploys
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.map((key) => {
                    if (!VALID_CACHES.includes(key)) {
                        return caches.delete(key);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Allow client to trigger immediate activation after deploy
self.addEventListener('message', (event) => {
    if (event.data && event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
});

// Helper: check if URL belongs to network-only endpoints
function isNetworkOnly(pathname) {
    return NETWORK_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

// Helper: check if URL is an immutable/static asset
function isStaticAsset(pathname) {
    return (
        pathname.startsWith('/build/') ||
        pathname.startsWith('/icons/') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.webp') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.woff2') ||
        pathname.endsWith('.woff')
    );
}

// Fetch Event:
// - Non-GET / Network-only -> Network directly
// - Static assets -> Cache First (fast offline boot)
// - Inertia SPA requests (X-Inertia: true) -> Network First with dedicated INERTIA_CACHE (JSON)
// - Full HTML page navigations -> Network First with dedicated PAGES_CACHE (HTML)
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests (POST, PUT, DELETE, etc.)
    if (request.method !== 'GET') {
        return;
    }

    // Skip non-HTTP(S) schemes (e.g., chrome-extension://) and cross-origin requests
    if (!url.protocol.startsWith('http') || url.origin !== self.location.origin) {
        return;
    }

    // Never intercept sync/auth/health endpoints
    if (isNetworkOnly(url.pathname)) {
        return;
    }

    // 1. Static assets (Vite build chunks, icons, fonts, images): Cache First
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            caches.open(STATIC_CACHE).then((cache) =>
                cache.match(request).then((cachedResponse) => {
                    if (cachedResponse) {
                        return cachedResponse;
                    }
                    return fetch(request).then((networkResponse) => {
                        if (networkResponse && networkResponse.status === 200) {
                            cache.put(request, networkResponse.clone());
                        }
                        return networkResponse;
                    });
                })
            )
        );
        return;
    }

    // 2. Inertia SPA navigation requests (JSON responses): Network First -> INERTIA_CACHE
    if (request.headers.get('X-Inertia') === 'true') {
        const cacheKey = url.pathname + url.search;
        event.respondWith(
            caches.open(INERTIA_CACHE).then((cache) =>
                fetch(request)
                    .then((networkResponse) => {
                        const contentType = networkResponse.headers.get('content-type') || '';
                        if (networkResponse && networkResponse.status === 200 && contentType.includes('application/json')) {
                            cache.put(cacheKey, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() =>
                        cache.match(cacheKey).then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            return new Response(
                                JSON.stringify({ error: 'offline_uncached_page' }),
                                { status: 503, headers: { 'Content-Type': 'application/json' } }
                            );
                        })
                    )
            )
        );
        return;
    }

    // 3. Full HTML page navigations (F5 / direct URL): Network First -> PAGES_CACHE
    if (request.mode === 'navigate') {
        const cacheKey = url.pathname + url.search;
        event.respondWith(
            caches.open(PAGES_CACHE).then((cache) =>
                fetch(request)
                    .then((networkResponse) => {
                        const contentType = networkResponse.headers.get('content-type') || '';
                        // Only cache valid HTML pages (avoid caching redirects to /login)
                        if (
                            networkResponse &&
                            networkResponse.status === 200 &&
                            contentType.includes('text/html') &&
                            !networkResponse.url.includes('/login')
                        ) {
                            cache.put(cacheKey, networkResponse.clone());
                        }
                        return networkResponse;
                    })
                    .catch(() =>
                        cache.match(cacheKey).then((cachedResponse) => {
                            if (cachedResponse) {
                                return cachedResponse;
                            }
                            return cache.match('/dashboard').then((dash) => dash || cache.match('/'));
                        })
                    )
            )
        );
        return;
    }
});
