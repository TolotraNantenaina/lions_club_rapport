import { readFile, rename, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isAlreadyOptimized, optimizeLogoBuffer } from '../../../../lib/optimizeLogo.mjs';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LOGOS_DIR = path.join(process.cwd(), 'public', 'clubsIcons');

const CONTENT_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
};

/**
 * Les logos hérités peuvent atteindre 143 Mpx (SAINT BENOIT LES EAUX VIVES).
 * La limite stricte de la route d'import ne s'applique pas ici : ces fichiers
 * sont déjà sur le disque, il faut pouvoir les traiter.
 */
const SERVE_MAX_INPUT_PIXELS = 400 * 1000 * 1000;

/**
 * Une optimisation par fichier à la fois. Sans ce verrou, la page d'accueil
 * qui affiche plusieurs logos déclencherait des réencodages concurrents du
 * même fichier, avec des écritures qui se marchent dessus.
 */
const inFlight = new Map();

function optimizeOnce(absolutePath, extension, original) {
    const pending = inFlight.get(absolutePath);

    if (pending) {
        return pending;
    }

    const task = optimizeInPlace(absolutePath, extension, original).finally(() => {
        inFlight.delete(absolutePath);
    });

    inFlight.set(absolutePath, task);

    return task;
}

/**
 * Optimise le fichier sur place et renvoie son nouveau contenu, ou null si
 * l'opération n'apporte rien.
 *
 * L'écriture passe par un fichier temporaire renommé ensuite : `rename` est
 * atomique sur un même système de fichiers, donc une requête concurrente lit
 * soit l'ancien fichier complet, soit le nouveau — jamais un fichier tronqué.
 */
async function optimizeInPlace(absolutePath, extension, original) {
    const optimized = await optimizeLogoBuffer(original, extension, {
        limitInputPixels: SERVE_MAX_INPUT_PIXELS,
    });

    if (optimized.size >= original.length) {
        return null;
    }

    const temporaryPath = `${absolutePath}.tmp-${process.pid}`;

    await writeFile(temporaryPath, optimized.buffer);
    await rename(temporaryPath, absolutePath);

    return optimized.buffer;
}

function notFound() {
    return new Response('Not found', {
        status: 404,
        headers: { 'Cache-Control': 'no-store' },
    });
}

/**
 * Sert les logos de clubs en lisant le disque à chaque requête.
 *
 * Next fige la liste des fichiers de `public/` au démarrage du serveur : un
 * logo uploadé à chaud via /parametre existe bien sur le volume bind mais
 * reste en 404 jusqu'au redémarrage du conteneur. Une réécriture renvoie donc
 * /clubsIcons/** vers cette route, qui elle voit le disque tel qu'il est.
 *
 * Les URL publiques ne changent pas : clubs.json, les balises <img> et le
 * Service Worker continuent d'utiliser /clubsIcons/**.
 */
export async function GET(request, { params }) {
    const segments = Array.isArray(params.path) ? params.path : [];

    if (segments.length === 0) {
        return notFound();
    }

    const absolutePath = path.join(LOGOS_DIR, ...segments);

    // Empêche la remontée hors du dossier des logos (../../etc/passwd).
    if (absolutePath !== LOGOS_DIR && !absolutePath.startsWith(`${LOGOS_DIR}${path.sep}`)) {
        return notFound();
    }

    const extension = path.extname(absolutePath).slice(1).toLowerCase();
    const contentType = CONTENT_TYPES[extension];

    if (!contentType) {
        return notFound();
    }

    let stats = await stat(absolutePath).catch(() => null);

    if (!stats || !stats.isFile()) {
        return notFound();
    }

    // Signature identique à celle de /api/assets-manifest, pour que
    // revalidation HTTP et réconciliation du Service Worker s'accordent sur
    // la même notion de version.
    const buildHeaders = (fileStats) => ({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=0, must-revalidate',
        ETag: `"${fileStats.size}-${Math.round(fileStats.mtimeMs)}"`,
    });

    let headers = buildHeaders(stats);

    // Le 304 est traité avant toute optimisation : le client possède déjà le
    // fichier tel qu'il est sur le disque, inutile de le lire ni de le
    // décoder. C'est le cas majoritaire, il reste à coût nul.
    if (request.headers.get('if-none-match') === headers.ETag) {
        return new Response(null, { status: 304, headers });
    }

    let body = await readFile(absolutePath);

    // Rattrapage des fichiers arrivés hors du parcours d'import : copie
    // manuelle dans le volume, restauration de sauvegarde, ou upload
    // antérieur au redimensionnement automatique.
    //
    // Le test porte sur le tampon déjà lu, donc exactement la même règle que
    // scripts/optimize-club-logos.mjs — un fichier léger mais de très grande
    // définition est bien rattrapé, ce qu'un simple seuil sur la taille du
    // fichier laisserait passer.
    if (!await isAlreadyOptimized(body, { limitInputPixels: SERVE_MAX_INPUT_PIXELS })) {
        try {
            const optimized = await optimizeOnce(absolutePath, extension, body);

            if (optimized) {
                body = optimized;
                stats = await stat(absolutePath);
                headers = buildHeaders(stats);
            }
        } catch (error) {
            // Volume en lecture seule, image corrompue, définition hors
            // limite : on sert l'original plutôt que de renvoyer une erreur.
            console.warn(`Logo non optimisé : ${segments.join('/')}`, error);
        }
    }

    return new Response(body, {
        headers: { ...headers, 'Content-Length': String(body.length) },
    });
}
