#!/usr/bin/env node
/**
 * Redimensionne les logos de clubs déjà présents sur disque.
 *
 * Le script est idempotent : un fichier n'est réécrit que si l'optimisation
 * fait gagner au moins MIN_GAIN_RATIO. Un second passage ne touche donc à
 * rien.
 *
 * Usage :
 *   node scripts/optimize-club-logos.mjs --dry-run
 *   node scripts/optimize-club-logos.mjs
 *   node scripts/optimize-club-logos.mjs --dir=/chemin/vers/clubsIcons
 *
 * En production, les logos sont montés en volume bind (docker-compose.yml) :
 * lancer le script sur le serveur contre ce dossier met à jour la source de
 * vérité. Les fichiers changeant de taille et de mtime, /api/assets-manifest
 * renvoie de nouvelles signatures et le Service Worker réconcilie son cache
 * tout seul — rien à faire côté client.
 */

import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import sharp from 'sharp';
import { LOGO_MAX_EDGE, isOptimizableLogoExtension, optimizeLogoBuffer } from '../lib/optimizeLogo.mjs';

/** En dessous, la réécriture ne vaut pas la perte de qualité ni le churn. */
const MIN_GAIN_RATIO = 0.05;

/**
 * Un fichier déjà aux bonnes dimensions et déjà léger est laissé tel quel.
 * Sans ce garde-fou, réencoder un JPEG déjà compressé regagne encore 5 à 7 %
 * — mais au prix d'une perte générationnelle qui s'accumulerait à chaque
 * exécution du script.
 */
const ALREADY_SMALL_BYTES = 150 * 1024;

/**
 * Le script traite des fichiers déjà connus et versionnés, dont un PNG de
 * 143 Mpx : la limite stricte de la route d'import ne s'applique pas ici.
 */
const SCRIPT_MAX_INPUT_PIXELS = 400 * 1000 * 1000;

function parseArgs(argv) {
    const options = {
        dir: path.join(process.cwd(), 'public', 'clubsIcons'),
        dryRun: false,
        maxEdge: LOGO_MAX_EDGE,
    };

    for (const arg of argv) {
        if (arg === '--dry-run') {
            options.dryRun = true;
        } else if (arg.startsWith('--dir=')) {
            options.dir = path.resolve(arg.slice('--dir='.length));
        } else if (arg.startsWith('--max-edge=')) {
            options.maxEdge = Number.parseInt(arg.slice('--max-edge='.length), 10);
        } else {
            throw new Error(`Option inconnue : ${arg}`);
        }
    }

    if (!Number.isInteger(options.maxEdge) || options.maxEdge < 64) {
        throw new Error('--max-edge doit être un entier >= 64.');
    }

    return options;
}

async function collectImages(directory, relativeBase = '') {
    const entries = await readdir(directory, { withFileTypes: true }).catch(() => []);
    const files = [];

    for (const entry of entries) {
        if (entry.name.startsWith('.')) {
            continue;
        }

        const relativePath = relativeBase ? path.join(relativeBase, entry.name) : entry.name;
        const absolutePath = path.join(directory, entry.name);

        if (entry.isDirectory()) {
            files.push(...await collectImages(absolutePath, relativePath));
            continue;
        }

        const extension = path.extname(entry.name).slice(1).toLowerCase();

        if (isOptimizableLogoExtension(extension)) {
            files.push({ absolutePath, relativePath, extension });
        }
    }

    return files;
}

async function isAlreadyOptimized(buffer, maxEdge) {
    if (buffer.length > ALREADY_SMALL_BYTES) {
        return false;
    }

    const metadata = await sharp(buffer, { limitInputPixels: SCRIPT_MAX_INPUT_PIXELS })
        .metadata()
        .catch(() => null);

    if (!metadata || !metadata.width || !metadata.height) {
        return false;
    }

    return metadata.width <= maxEdge && metadata.height <= maxEdge;
}

function formatBytes(bytes) {
    if (bytes >= 1024 * 1024) {
        return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
    }

    return `${Math.round(bytes / 1024)} Ko`;
}

async function main() {
    const options = parseArgs(process.argv.slice(2));
    const directoryStat = await stat(options.dir).catch(() => null);

    if (!directoryStat || !directoryStat.isDirectory()) {
        throw new Error(`Dossier introuvable : ${options.dir}`);
    }

    const images = await collectImages(options.dir);

    console.log(`Dossier   : ${options.dir}`);
    console.log(`Images    : ${images.length}`);
    console.log(`Côté long : ${options.maxEdge} px`);
    console.log(options.dryRun ? 'Mode      : SIMULATION (aucune écriture)\n' : 'Mode      : ÉCRITURE\n');

    let totalBefore = 0;
    let totalAfter = 0;
    let rewritten = 0;
    let skipped = 0;
    const failures = [];

    for (const image of images) {
        const original = await readFile(image.absolutePath);
        totalBefore += original.length;

        if (await isAlreadyOptimized(original, options.maxEdge)) {
            totalAfter += original.length;
            skipped += 1;
            console.log(`  =  ${image.relativePath} — déjà optimisé (${formatBytes(original.length)})`);
            continue;
        }

        let result;

        try {
            result = await optimizeLogoBuffer(original, image.extension, {
                maxEdge: options.maxEdge,
                limitInputPixels: SCRIPT_MAX_INPUT_PIXELS,
            });
        } catch (error) {
            failures.push({ relativePath: image.relativePath, message: error.message });
            totalAfter += original.length;
            continue;
        }

        const gain = 1 - (result.size / original.length);

        if (gain < MIN_GAIN_RATIO) {
            totalAfter += original.length;
            skipped += 1;
            console.log(`  =  ${image.relativePath} — déjà optimisé (${formatBytes(original.length)})`);
            continue;
        }

        if (!options.dryRun) {
            await writeFile(image.absolutePath, result.buffer);
        }

        totalAfter += result.size;
        rewritten += 1;

        console.log(
            `  ↓  ${image.relativePath}\n`
            + `     ${result.sourceWidth}x${result.sourceHeight} ${formatBytes(original.length)}`
            + ` → ${result.width}x${result.height} ${formatBytes(result.size)}`
            + ` (-${Math.round(gain * 100)} %)`,
        );
    }

    console.log(`\nAvant   : ${formatBytes(totalBefore)}`);
    console.log(`Après   : ${formatBytes(totalAfter)}`);
    console.log(`Gain    : ${formatBytes(totalBefore - totalAfter)} (-${Math.round((1 - totalAfter / totalBefore) * 100)} %)`);
    console.log(`Traités : ${rewritten} réécrits, ${skipped} inchangés`);

    if (failures.length > 0) {
        console.log(`\n${failures.length} échec(s) :`);
        failures.forEach((failure) => console.log(`  ✗ ${failure.relativePath} — ${failure.message}`));
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
});
