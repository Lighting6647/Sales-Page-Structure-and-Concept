// NexusCore Production Service Worker (Zero-Stale-HTML Auto-Updater)
const CACHE_NAME = 'nexuscore-v7';
const STATIC_ASSETS = [
    './images/it_dashboard.png',
    './images/pass_app.png',
    './images/asset_monitor.png',
    './images/task_tracking.png',
    './images/accounting.png',
    './images/inventory.png',
    './images/fitpulse.png',
    './images/tikkethub.png',
    './images/tamsang.png'
];

// Install: Precache images only (never cache stale HTML) and activate immediately
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(STATIC_ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate: Delete ALL legacy nexuscore-* caches & take immediate control
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim())
    );
});

// Fetch: Strict network-no-store for HTML documents; SWR for images/static files
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    if (request.method !== 'GET' || !url.protocol.startsWith('http')) {
        return;
    }

    // HTML documents must ALWAYS come fresh from network so visitors see latest UI immediately
    if (request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname === '/') {
        event.respondWith(
            fetch(new Request(request, { cache: 'no-store' })).catch(() => fetch(request))
        );
        return;
    }

    // Static image assets: Stale-While-Revalidate
    event.respondWith(
        caches.match(request).then((cachedResponse) => {
            const fetchPromise = fetch(request).then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200 && url.origin === self.location.origin) {
                    const responseClone = networkResponse.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
                }
                return networkResponse;
            }).catch(() => cachedResponse);

            return cachedResponse || fetchPromise;
        })
    );
});
