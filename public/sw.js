const CACHE_VERSION = 'lions-club-rapport-v5';
const APP_CACHE = `${CACHE_VERSION}-app`;
const DATA_CACHE = `${CACHE_VERSION}-data`;
const LOGOS_CACHE = `${CACHE_VERSION}-logos`;

const STATIC_SHELL_ASSETS = [
    '/manifest.json',
    '/favicon.ico',
    '/ico_app_pv_lc.png',
    '/ico_lions_club.png',
    '/ico_lions_club_transparent.png',
    '/og-image.png',
];

const NAVIGATION_PATHS = new Set(['/', '/parametre']);

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const appCache = await caches.open(APP_CACHE);

            await Promise.allSettled(
                STATIC_SHELL_ASSETS.map((asset) => appCache.add(asset)),
            );

            await cacheClubsData();
            await prefetchClubLogos();

            await self.skipWaiting();
        })(),
    );
});

self.addEventListener('activate', (event) => {
    const allowedCaches = [APP_CACHE, DATA_CACHE, LOGOS_CACHE];

    event.waitUntil(
        caches.keys()
            .then((cacheNames) => Promise.all(
                cacheNames
                    .filter((cacheName) => cacheName.startsWith('lions-club-rapport-') && !allowedCaches.includes(cacheName))
                    .map((cacheName) => caches.delete(cacheName)),
            ))
            .then(() => self.clients.claim()),
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
        event.respondWith(handleClubsDataRequest(request));
        return;
    }

    if (url.pathname.startsWith('/clubsIcons/')) {
        event.respondWith(cacheFirst(request, LOGOS_CACHE));
        return;
    }

    if (NAVIGATION_PATHS.has(url.pathname)) {
        event.respondWith(networkFirst(request, APP_CACHE));
        return;
    }

    if (STATIC_SHELL_ASSETS.includes(url.pathname)) {
        event.respondWith(cacheFirst(request, APP_CACHE));
        return;
    }
});

async function handleClubsDataRequest(request) {
    return staleWhileRevalidate(request, DATA_CACHE, () => {
        prefetchClubLogos().catch(() => {});
    });
}

async function cacheClubsData() {
    try {
        const response = await fetch('/data/clubs.json');

        if (response.ok) {
            const cache = await caches.open(DATA_CACHE);
            await cache.put('/data/clubs.json', response.clone());
        }
    } catch (error) {
        console.warn('Impossible de mettre clubs.json en cache à l’installation', error);
    }
}

async function prefetchClubLogos() {
    try {
        const cache = await caches.open(LOGOS_CACHE);
        const dataCache = await caches.open(DATA_CACHE);
        const cachedData = await dataCache.match('/data/clubs.json');
        const response = cachedData || await fetch('/data/clubs.json');

        if (!response || !response.ok) {
            return;
        }

        const clubs = await response.json();
        const logoUrls = [...new Set(
            (Array.isArray(clubs) ? clubs : [])
                .map((club) => club.clubLogoUrl)
                .filter(Boolean),
        )];

        await Promise.allSettled(
            logoUrls.map((logoUrl) => cacheLogoUrl(cache, logoUrl)),
        );
    } catch (error) {
        console.warn('Impossible de précharger les logos clubs', error);
    }
}

async function cacheLogoUrl(cache, logoUrl) {
    const request = new Request(logoUrl);

    if (await matchCached(cache, request)) {
        return;
    }

    try {
        const response = await fetch(request);

        if (response.ok) {
            await cache.put(request, response.clone());
        }
    } catch (error) {
        console.warn(`Logo non mis en cache : ${logoUrl}`, error);
    }
}

async function staleWhileRevalidate(request, cacheName, onRevalidate) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await matchCached(cache, request);

    const revalidate = fetch(request)
        .then(async (response) => {
            if (response.ok) {
                await cache.put(request, response.clone());

                if (onRevalidate) {
                    onRevalidate();
                }
            }

            return response;
        })
        .catch(() => {});

    if (cachedResponse) {
        revalidate.catch(() => {});
        prefetchClubLogos().catch(() => {});
        return cachedResponse;
    }

    const response = await revalidate;

    if (response && response.ok) {
        return response;
    }

    throw new Error('clubs.json indisponible');
}

async function networkFirst(request, cacheName) {
    const cache = await caches.open(cacheName);

    try {
        const response = await fetch(request);

        if (response.ok) {
            await cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cachedResponse = await matchCached(cache, request);

        if (cachedResponse) {
            return cachedResponse;
        }

        throw error;
    }
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cachedResponse = await matchCached(cache, request);

    if (cachedResponse) {
        return cachedResponse;
    }

    try {
        const response = await fetch(request);

        if (response.ok) {
            await cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const fallback = await matchCached(cache, request);

        if (fallback) {
            return fallback;
        }

        throw error;
    }
}

async function matchCached(cache, request) {
    const directMatch = await cache.match(request);

    if (directMatch) {
        return directMatch;
    }

    const targetPath = decodeURIComponent(new URL(request.url).pathname);
    const keys = await cache.keys();

    for (const key of keys) {
        const keyPath = decodeURIComponent(new URL(key.url).pathname);

        if (keyPath === targetPath) {
            return cache.match(key);
        }
    }

    return undefined;
}
