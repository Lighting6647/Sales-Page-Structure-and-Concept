// NexusCore Production Service Worker (PWA Offline Caching)
const CACHE_NAME = 'nexuscore-v1';
const STATIC_ASSETS = [
    './',
    './index.html',
    './robots.txt',
    './sitemap.xml',
    './images/it_dashboard.png',
    './images/pass_app.png',
    './images/asset_monitor.png',
    './images/task_tracking.png',
    './images/accounting.png',
    './images/inventory.png',
    './images/fitpulse.png'
];

// Install: Cache critical assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(STATIC_ASSETS);
        }).then(() => self.skipWaiting())
    );
});

// Activate: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
            );
        }).then(() => self.clients.claim())
    );
});

// Fetch: Network-first for navigation, Cache-first / Stale-While-Revalidate for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET requests and browser extensions
    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // HTML Navigation requests: Network first, fallback to cache
    if (request.mode === 'navigate') {
        event.respondWith(
            fetch(request)
                .then((networkResponse) => {
                    if (networkResponse && networkResponse.status === 200) {
                        const responseClone = networkResponse.clone();
                        caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                    }
                    return networkResponse;
                })
                .catch(() => caches.match('./index.html') || caches.match(request))
        );
        return;
    }

    // Static Assets & Images: Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
