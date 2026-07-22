/*
 * Service Worker — deux cycles de vie séparés :
 *
 *  1. Le CODE (shell, chunks Next) est versionné par le build : chaque
 *     déploiement produit une nouvelle URL `/sw.js?v=<buildId>`, donc une
 *     nouvelle installation, puis un rechargement automatique de la page.
 *
 *  2. Les DONNÉES (clubs.json, logos) vivent dans des caches NON versionnés,
 *     invalidés par le manifeste serveur `/api/assets-manifest`. Elles sont
 *     montées en volume bind et changent hors déploiement : un numéro de
 *     version ne peut pas les invalider. À l'inverse, un déploiement ne doit
 *     pas provoquer le retéléchargement des ~36 Mo de logos.
 */

const BUILD = new URL(self.location.href).searchParams.get('v') || 'dev';

const SHELL_CACHE = `lcr-shell-${BUILD}`; // versionné : purgé à chaque déploiement
const STATIC_CACHE = 'lcr-static'; // /_next/static/** (noms hashés, immuables)
const DATA_CACHE = 'lcr-data'; // clubs.json + état du manifeste
const LOGOS_CACHE = 'lcr-logos'; // /clubsIcons/**

const PERSISTENT_CACHES = [STATIC_CACHE, DATA_CACHE, LOGOS_CACHE];

const CLUBS_URL = '/data/clubs.json';
const MANIFEST_URL = '/api/assets-manifest';
const MANIFEST_STATE_KEY = '/__lcr_manifest_state';
const LOGOS_PREFIX = '/clubsIcons/';

const STATIC_SHELL_ASSETS = [
    '/manifest.json',
    '/favicon.ico',
    '/ico_app_pv_lc.png',
    '/ico_lions_club.png',
    '/ico_lions_club_transparent.png',
    '/og-image.png',
];

const NAVIGATION_TIMEOUT_MS = 4000;
const SYNC_MIN_INTERVAL_MS = 5 * 60 * 1000;
const LOGO_FETCH_CONCURRENCY = 3;
const BULK_PREFETCH_THRESHOLD = 5;

let syncInFlight = null;
let lastSyncAt = 0;

/* ------------------------------------------------------------------ */
/* Cycle de vie                                                        */
/* ------------------------------------------------------------------ */

self.addEventListener('install', (event) => {
    event.waitUntil(
        (async () => {
            const cache = await caches.open(SHELL_CACHE);

            // Uniquement le shell : aucun préchargement de logos ici, il
            // bloquerait l'installation (et donc toute mise à jour) le temps
            // de télécharger des dizaines de Mo sur une connexion mobile.
            await Promise.allSettled(
                STATIC_SHELL_ASSETS.map((asset) => cache.add(asset)),
            );
        })(),
    );
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        (async () => {
            const cacheNames = await caches.keys();

            await Promise.all(
                cacheNames
                    // `lions-club-rapport-*` : caches des versions antérieures
                    // au renommage. Sans ce préfixe ils resteraient sur les
                    // appareils indéfiniment.
                    .filter((name) => name.startsWith('lcr-') || name.startsWith('lions-club-rapport-'))
                    .filter((name) => name !== SHELL_CACHE && !PERSISTENT_CACHES.includes(name))
                    .map((name) => caches.delete(name)),
            );

            await self.clients.claim();

            // Le préchargement des données démarre seulement une fois le SW
            // actif, en tâche de fond.
            syncClubAssets().catch(() => {});
        })(),
    );
});

self.addEventListener('message', (event) => {
    const type = event.data && event.data.type;

    if (type === 'SKIP_WAITING') {
        self.skipWaiting();
        return;
    }

    // Émis par la page paramètres après un import : les fichiers du serveur
    // viennent de changer, on resynchronise sans attendre le throttle.
    if (type === 'REFRESH_CLUB_ASSETS') {
        event.waitUntil(syncClubAssets({ force: true }).catch(() => {}));
    }
});

/* ------------------------------------------------------------------ */
/* Routage                                                             */
/* ------------------------------------------------------------------ */

self.addEventListener('fetch', (event) => {
    const { request } = event;

    if (request.method !== 'GET') {
        return;
    }

    const url = new URL(request.url);

    if (url.origin !== self.location.origin) {
        return;
    }

    // API et payloads RSC : jamais de cache, ils dépendent de l'état serveur.
    if (url.pathname.startsWith('/api/') || url.searchParams.has('_rsc')) {
        return;
    }

    // Chunks Next : noms hashés donc immuables, cache-first sans versionnage.
    if (url.pathname.startsWith('/_next/static/')) {
        event.respondWith(cacheFirst(request, STATIC_CACHE));
        return;
    }

    if (url.pathname.startsWith('/_next/')) {
        return;
    }

    if (url.pathname === CLUBS_URL) {
        event.respondWith(handleClubsData(request));
        return;
    }

    if (url.pathname.startsWith(LOGOS_PREFIX)) {
        event.respondWith(handleLogo(request));
        return;
    }

    // Navigations : réseau d'abord (le HTML référence les chunks du build
    // courant), repli sur le cache si hors ligne ou réseau trop lent.
    if (request.mode === 'navigate') {
        event.respondWith(navigationStrategy(request));
        return;
    }

    if (STATIC_SHELL_ASSETS.includes(url.pathname)) {
        event.respondWith(cacheFirst(request, SHELL_CACHE));
    }
});

/* ------------------------------------------------------------------ */
/* Stratégies                                                          */
/* ------------------------------------------------------------------ */

async function navigationStrategy(request) {
    const cache = await caches.open(SHELL_CACHE);

    try {
        const response = await withTimeout(fetch(request), NAVIGATION_TIMEOUT_MS);

        if (response && response.ok) {
            await cache.put(request, response.clone());
        }

        return response;
    } catch (error) {
        const cached = await cache.match(request, { ignoreSearch: true });

        if (cached) {
            return cached;
        }

        throw error;
    }
}

async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
        await cache.put(request, response.clone());
    }

    return response;
}

/**
 * clubs.json : offline-first. Le cache répond immédiatement, la revalidation
 * se fait en tâche de fond via le manifeste (qui décide aussi du sort des logos).
 */
async function handleClubsData(request) {
    const cache = await caches.open(DATA_CACHE);
    const cached = await cache.match(CLUBS_URL);

    if (cached) {
        scheduleSync();
        return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
        await cache.put(CLUBS_URL, response.clone());
        scheduleSync({ force: true });
    }

    return response;
}

/**
 * Logos : cache-first sur une clé normalisée. Les noms contiennent accents,
 * espaces et sous-dossiers ; on aligne l'encodage et la forme Unicode (NFC)
 * des deux côtés pour éviter les faux ratés de cache. Le réseau, lui, est
 * toujours interrogé avec l'URL d'origine (le fichier sur disque peut être
 * en NFD).
 */
async function handleLogo(request) {
    const cache = await caches.open(LOGOS_CACHE);
    const key = logoCacheKey(request.url);
    const cached = await cache.match(key);

    if (cached) {
        return cached;
    }

    const response = await fetch(request);

    if (response.ok) {
        await cache.put(key, response.clone());
    }

    return response;
}

/* ------------------------------------------------------------------ */
/* Synchronisation pilotée par le manifeste                            */
/* ------------------------------------------------------------------ */

function scheduleSync(options) {
    const force = Boolean(options && options.force);

    if (!force && Date.now() - lastSyncAt < SYNC_MIN_INTERVAL_MS) {
        return;
    }

    syncClubAssets({ force }).catch(() => {});
}

async function syncClubAssets(options) {
    const force = Boolean(options && options.force);

    // Une seule synchronisation à la fois : sinon chaque image de la page
    // déclencherait sa propre réconciliation.
    if (syncInFlight) {
        return syncInFlight;
    }

    syncInFlight = runSync(force).finally(() => {
        syncInFlight = null;
    });

    return syncInFlight;
}

async function runSync(force) {
    const manifest = await fetchManifest();

    if (!manifest) {
        return false; // hors ligne : on conserve le cache existant tel quel
    }

    lastSyncAt = Date.now();

    const dataCache = await caches.open(DATA_CACHE);
    const previous = await readJson(dataCache, MANIFEST_STATE_KEY);
    const hasClubsCopy = Boolean(await dataCache.match(CLUBS_URL));

    const clubsChanged = force
        || !hasClubsCopy
        || !previous
        || previous.clubs !== manifest.clubs;

    if (clubsChanged) {
        await refreshClubsData(dataCache);
    }

    const logosChanged = await reconcileLogos(
        manifest.logos || {},
        (previous && previous.logos) || {},
        force,
    );

    await dataCache.put(MANIFEST_STATE_KEY, jsonResponse(manifest));

    if (clubsChanged || logosChanged) {
        await notifyClients({
            type: 'CLUB_ASSETS_UPDATED',
            clubsChanged,
            logosChanged,
        });
    }

    return true;
}

async function fetchManifest() {
    try {
        const response = await fetch(MANIFEST_URL, { cache: 'no-store' });

        return response.ok ? await response.json() : null;
    } catch (error) {
        return null;
    }
}

async function refreshClubsData(dataCache) {
    try {
        const response = await fetch(CLUBS_URL, { cache: 'reload' });

        if (response.ok) {
            await dataCache.put(CLUBS_URL, response.clone());
        }
    } catch (error) {
        console.warn('clubs.json : revalidation impossible', error);
    }
}

/**
 * Ajoute les nouveaux logos, remplace ceux dont la signature a changé,
 * supprime ceux qui ont disparu du serveur.
 */
async function reconcileLogos(current, previous, force) {
    const cache = await caches.open(LOGOS_CACHE);
    const cachedKeys = new Set((await cache.keys()).map((request) => request.url));

    const obsolete = Object.keys(previous).filter((logoPath) => !(logoPath in current));

    await Promise.all(
        obsolete.map((logoPath) => cache.delete(logoCacheKey(logoPath))),
    );

    let outdated = Object.keys(current).filter((logoPath) => {
        if (force || previous[logoPath] !== current[logoPath]) {
            return true;
        }

        return !cachedKeys.has(logoCacheKey(logoPath));
    });

    // Le lot complet pèse plusieurs dizaines de Mo. Sur connexion limitée on
    // ne précharge pas en masse : les logos restent mis en cache à la demande
    // (cache-first) et la prochaine synchro sur bon réseau complètera le lot.
    if (!force && outdated.length > BULK_PREFETCH_THRESHOLD && isConstrainedNetwork()) {
        outdated = [];
    }

    await runWithConcurrency(
        outdated,
        LOGO_FETCH_CONCURRENCY,
        (logoPath) => cacheLogo(cache, logoPath),
    );

    return obsolete.length > 0 || outdated.length > 0;
}

async function cacheLogo(cache, logoPath) {
    try {
        const response = await fetch(absoluteUrl(logoPath), { cache: 'reload' });

        if (response.ok) {
            await cache.put(logoCacheKey(logoPath), response.clone());
        }
    } catch (error) {
        console.warn(`Logo non mis en cache : ${logoPath}`, error);
    }
}

/* ------------------------------------------------------------------ */
/* Utilitaires                                                         */
/* ------------------------------------------------------------------ */

function absoluteUrl(pathOrUrl) {
    return new URL(pathOrUrl, self.location.origin).href;
}

function logoCacheKey(pathOrUrl) {
    const url = new URL(pathOrUrl, self.location.origin);
    let pathname = url.pathname;

    try {
        pathname = decodeURI(pathname);
    } catch (error) {
        // pathname déjà décodé ou mal encodé : on le garde tel quel
    }

    return new URL(encodeURI(pathname.normalize('NFC')), self.location.origin).href;
}

function isConstrainedNetwork() {
    const connection = self.navigator && self.navigator.connection;

    if (!connection) {
        return false;
    }

    return Boolean(connection.saveData)
        || ['slow-2g', '2g'].includes(connection.effectiveType);
}

function jsonResponse(payload) {
    return new Response(JSON.stringify(payload), {
        headers: { 'Content-Type': 'application/json' },
    });
}

async function readJson(cache, key) {
    const cached = await cache.match(key);

    if (!cached) {
        return null;
    }

    try {
        return await cached.json();
    } catch (error) {
        return null;
    }
}

async function notifyClients(message) {
    const clients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });

    clients.forEach((client) => client.postMessage(message));
}

function withTimeout(promise, timeoutMs) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);

        promise.then(
            (value) => {
                clearTimeout(timer);
                resolve(value);
            },
            (error) => {
                clearTimeout(timer);
                reject(error);
            },
        );
    });
}

async function runWithConcurrency(items, limit, task) {
    const queue = [...items];

    const workers = Array.from({ length: Math.min(limit, queue.length) }, async () => {
        while (queue.length > 0) {
            await task(queue.shift());
        }
    });

    await Promise.all(workers);
}
