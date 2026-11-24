// SIMAQ PWA Service Worker (v5 - Full Offline Shell, Complete Vite Chunks, Storage & Inertia SPA)
const STATIC_CACHE = 'simaq-static-v5';
const PAGES_CACHE = 'simaq-pages-v5';
const INERTIA_CACHE = 'simaq-inertia-v5';
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

// Warm up ALL Vite build chunks (file, css, imports, dynamicImports, assets) using Promise.allSettled
async function warmupBuildAssets() {
    try {
        const res = await fetch('/build/manifest.json', { cache: 'no-cache' });
        if (!res.ok) return;
        const manifest = await res.json();
        const assetUrls = new Set();

        const collectEntry = (entry) => {
            if (!entry || typeof entry !== 'object') return;
            if (entry.file) {
                assetUrls.add(`/build/${entry.file}`);
            }
            if (Array.isArray(entry.css)) {
                for (const cssFile of entry.css) {
                    assetUrls.add(`/build/${cssFile}`);
                }
            }
            if (Array.isArray(entry.assets)) {
                for (const assetFile of entry.assets) {
                    assetUrls.add(`/build/${assetFile}`);
                }
            }
            if (Array.isArray(entry.imports)) {
                for (const impKey of entry.imports) {
                    if (manifest[impKey]) {
                        collectEntry(manifest[impKey]);
                    }
                }
            }
            if (Array.isArray(entry.dynamicImports)) {
                for (const dynKey of entry.dynamicImports) {
                    if (manifest[dynKey]) {
                        collectEntry(manifest[dynKey]);
                    }
                }
            }
        };

        for (const entry of Object.values(manifest)) {
            collectEntry(entry);
        }

        const cache = await caches.open(STATIC_CACHE);
        const urls = Array.from(assetUrls);
        const batchSize = 15;
        let cachedCount = 0;

        for (let i = 0; i < urls.length; i += batchSize) {
            const batch = urls.slice(i, i + batchSize);
            await Promise.allSettled(
                batch.map(async (url) => {
                    const existing = await cache.match(url, { ignoreVary: true });
                    if (existing) {
                        cachedCount++;
                        return;
                    }
                    const assetRes = await fetch(url);
                    if (assetRes && assetRes.status === 200) {
                        await cache.put(url, assetRes.clone());
                        cachedCount++;
                    }
                })
            );
        }

        // Notify all open tabs that offline asset cache is ready
        const allClients = await self.clients.matchAll({ includeUncontrolled: true });
        for (const client of allClients) {
            client.postMessage({ type: 'WARMUP_COMPLETE', count: cachedCount, total: urls.length });
        }
    } catch {
        // Ignore if offline or manifest unavailable
    }
}

// Allow client to trigger immediate activation or build chunk warmup
self.addEventListener('message', (event) => {
    if (!event.data) return;
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    } else if (event.data.type === 'WARMUP_BUILD_ASSETS') {
        event.waitUntil(warmupBuildAssets());
    }
});

// Helper: check if URL belongs to network-only endpoints
function isNetworkOnly(pathname) {
    return NETWORK_ONLY_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(prefix));
}

// Helper: check if URL is an immutable/static asset or uploaded storage file
function isStaticAsset(pathname) {
    return (
        pathname.startsWith('/build/') ||
        pathname.startsWith('/icons/') ||
        pathname.startsWith('/storage/') ||
        pathname.endsWith('.js') ||
        pathname.endsWith('.css') ||
        pathname.endsWith('.png') ||
        pathname.endsWith('.svg') ||
        pathname.endsWith('.webp') ||
        pathname.endsWith('.jpg') ||
        pathname.endsWith('.jpeg') ||
        pathname.endsWith('.pdf') ||
        pathname.endsWith('.woff2') ||
        pathname.endsWith('.woff')
    );
}

// Fetch Event: ALWAYS resolve to a valid Response (never undefined)
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);

    // Skip non-GET requests (POST, PUT, DELETE, etc.)
    if (request.method !== 'GET') {
        return;
    }

    // Skip non-HTTP(S) schemes and cross-origin requests
    if (!url.protocol.startsWith('http') || url.origin !== self.location.origin) {
        return;
    }

    // Never intercept sync/auth/health endpoints
    if (isNetworkOnly(url.pathname)) {
        return;
    }

    // 1. Static assets (Vite build chunks, icons, fonts, images, uploaded /storage/ files): Cache First
    if (isStaticAsset(url.pathname)) {
        event.respondWith(
            (async () => {
                const cache = await caches.open(STATIC_CACHE);
                const cached =
                    (await cache.match(request, { ignoreVary: true })) ||
                    (await cache.match(url.pathname, { ignoreVary: true }));
                if (cached) {
                    return cached;
                }
                try {
                    const networkResponse = await fetch(request);
                    if (networkResponse && networkResponse.status === 200) {
                        await cache.put(url.pathname, networkResponse.clone());
                    }
                    return networkResponse;
                } catch {
                    return Response.error();
                }
            })()
        );
        return;
    }

    // 2. Inertia SPA navigation requests (JSON responses): Network First -> INERTIA_CACHE
    if (request.headers.get('X-Inertia') === 'true') {
        const fullKey = url.pathname + url.search;
        const baseKey = url.pathname;
        event.respondWith(
            (async () => {
                const cache = await caches.open(INERTIA_CACHE);
                try {
                    const networkResponse = await fetch(request);
                    const contentType = networkResponse.headers.get('content-type') || '';
                    const isInertiaResp =
                        networkResponse.headers.get('X-Inertia') === 'true' ||
                        contentType.includes('application/json');

                    if (networkResponse && networkResponse.status === 200 && isInertiaResp) {
                        await cache.put(fullKey, networkResponse.clone());
                        if (fullKey !== baseKey) {
                            await cache.put(baseKey, networkResponse.clone());
                        }
                    }
                    return networkResponse;
                } catch {
                    const exactMatch = await cache.match(fullKey, { ignoreVary: true });
                    if (exactMatch) return exactMatch;
                    const baseMatch = await cache.match(baseKey, { ignoreVary: true });
                    if (baseMatch) return baseMatch;
                    return Response.error();
                }
            })()
        );
        return;
    }

    // 3. Full HTML page navigations (F5 / direct URL / PWA launch): Network First -> PAGES_CACHE
    if (request.mode === 'navigate' || (request.headers.get('Accept') || '').includes('text/html')) {
        const cacheKey = url.pathname + url.search;
        event.respondWith(
            (async () => {
                const cache = await caches.open(PAGES_CACHE);
                try {
                    const networkResponse = await fetch(request);
                    const contentType = networkResponse.headers.get('content-type') || '';
                    if (
                        networkResponse &&
                        networkResponse.status === 200 &&
                        contentType.includes('text/html') &&
                        !networkResponse.url.includes('/login')
                    ) {
                        await cache.put(cacheKey, networkResponse.clone());
                        if (cacheKey !== url.pathname) {
                            await cache.put(url.pathname, networkResponse.clone());
                        }
                    }
                    return networkResponse;
                } catch {
                    const exact = await cache.match(cacheKey, { ignoreVary: true });
                    if (exact) return exact;
                    const base = await cache.match(url.pathname, { ignoreVary: true });
                    if (base) return base;
                    const dash = await cache.match('/dashboard', { ignoreVary: true });
                    if (dash) return dash;
                    const root = await cache.match('/', { ignoreVary: true });
                    if (root) return root;
                    return Response.error();
                }
            })()
        );
        return;
    }
});
