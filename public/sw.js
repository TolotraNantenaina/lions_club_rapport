const CACHE_VERSION = 'lions-club-rapport-v1';
const APP_CACHE = `${CACHE_VERSION}-app`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const LOGOS_CACHE = `${CACHE_VERSION}-logos`;

const APP_ASSETS = [
    '/',
    '/manifest.json',
    '/favicon.ico',
    '/ico_app_pv_lc.png',
    '/ico_lions_club.png',
    '/ico_lions_club_transparent.png',
    '/og-image.png',
];

self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(APP_CACHE)
            .then((cache) => cache.addAll(APP_ASSETS))
            .then(() => self.skipWaiting())
    );
});

self.addEventListener('activate', (event) => {
    const allowedCaches = [APP_CACHE, DATA_CACHE, LOGOS_CACHE];

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith('lions-club-rapport-') && !allowedCaches.includes(cacheName))
                    .map((cacheName) => caches.delete(cacheName))
            ))
            .then(() => self.clients.claim())
    );
});

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    if (url.pathname === '/data/clubs.json') {
        event.respondWith(networkFirst(request, DATA_CACHE));
        return;
    }

    if (url.pathname.startsWith('/clubsIcons/')) {
        event.respondWith(cacheFirst(request, LOGOS_CACHE));
        return;
    }

    if (url.pathname === '/' || url.pathname === '/manifest.json' || url.pathname.startsWith('/_next/static/')) {
        event.respondWith(cacheFirst(request, APP_CACHE));
    }
});

async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);

    try {
        const response = await fetch(request);

        if (response.ok) {
            await cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cachedResponse = await cache.match(request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse) {
        return cachedResponse;
    }

    const response = await fetch(request);

    if (response.ok) {
        await cache.put(request, response.clone());
    }

    return response;
}
