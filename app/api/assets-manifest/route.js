import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const PUBLIC_DIR = path.join(process.cwd(), 'public');
const CLUBS_FILE = path.join(PUBLIC_DIR, 'data', 'clubs.json');
const LOGOS_DIR = path.join(PUBLIC_DIR, 'clubsIcons');

/**
 * Signature de contenu : taille + date de modification.
 * Suffisant pour détecter un remplacement de fichier sous le même nom,
 * ce que ni le nom de fichier ni le numéro de version du build ne captent.
 */
async function signature(filePath) {
    try {
        const stats = await stat(filePath);
        return `${stats.size}-${Math.round(stats.mtimeMs)}`;
    } catch (error) {
        return null;
    }
}

/**
 * Identifiant du build déployé, lu depuis `.next/BUILD_ID`.
 * next.config.js étant ré-évalué au démarrage du conteneur, une valeur
 * calculée à la volée ne correspondrait pas à celle inlinée côté client.
 */
async function buildId() {
    try {
        return (await readFile(path.join(process.cwd(), '.next', 'BUILD_ID'), 'utf8')).trim();
    } catch (error) {
        return 'dev';
    }
}

async function collectLogos(directory, relativeBase = '') {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    const logos = {};

    for (const entry of entries) {
        if (entry.name.startsWith('.')) {
            continue;
        }

        const relativePath = relativeBase ? `${relativeBase}/${entry.name}` : entry.name;
        const absolutePath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            Object.assign(logos, await collectLogos(absolutePath, relativePath));
            continue;
        }

        const fileSignature = await signature(absolutePath);

        if (fileSignature) {
            logos[`/clubsIcons/${relativePath}`] = fileSignature;
        }
    }

    return logos;
}

/**
 * Manifeste des données servies depuis les volumes bind.
 * Quelques centaines d'octets : le Service Worker le compare à sa copie et ne
 * retélécharge que les fichiers réellement modifiés.
 */
export async function GET() {
    const [build, clubs, logos] = await Promise.all([
        buildId(),
        signature(CLUBS_FILE),
        collectLogos(LOGOS_DIR),
    ]);

    return NextResponse.json(
        {
            buildId: build,
            clubs,
            logos,
        },
        {
            headers: {
                'Cache-Control': 'no-store',
            },
        },
    );
}
