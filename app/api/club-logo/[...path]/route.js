import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const LOGOS_DIR = path.join(process.cwd(), 'public', 'clubsIcons');

const CONTENT_TYPES = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
};

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

    const stats = await stat(absolutePath).catch(() => null);

    if (!stats || !stats.isFile()) {
        return notFound();
    }

    // Même signature que /api/assets-manifest, pour que revalidation HTTP et
    // réconciliation du Service Worker s'accordent sur la notion de version.
    const etag = `"${stats.size}-${Math.round(stats.mtimeMs)}"`;
    const headers = {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=0, must-revalidate',
        ETag: etag,
    };

    if (request.headers.get('if-none-match') === etag) {
        return new Response(null, { status: 304, headers });
    }

    const body = await readFile(absolutePath);

    return new Response(body, {
        headers: { ...headers, 'Content-Length': String(stats.size) },
    });
}
