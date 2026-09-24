#!/usr/bin/env node
/**
 * Synchronise clubLogoUrl dans public/data/clubs.json à partir des fichiers
 * présents dans public/clubsIcons/.
 *
 * Usage :
 *   node scripts/sync-club-logo-urls.mjs --dry-run
 *   node scripts/sync-club-logo-urls.mjs
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const PROJECT_ROOT = path.resolve(import.meta.dirname, '..');
const CLUBS_JSON_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'clubs.json');
const LOGOS_DIR = path.join(PROJECT_ROOT, 'public', 'clubsIcons');
const IMAGE_EXT = new Set(['png', 'jpg', 'jpeg']);
const dryRun = process.argv.includes('--dry-run');

function slugify(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/œ/g, 'oe')
    .replace(/Œ/g, 'oe')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function normalizeClubType(typeClub) {
  const t = String(typeClub ?? 'LION').trim().toUpperCase();
  return t === 'LEO' ? 'LEO' : 'LION';
}

function getClubCompositeKey(nomClub, typeClub) {
  const clubSlug = slugify(nomClub);
  return clubSlug ? `${clubSlug}::${normalizeClubType(typeClub)}` : '';
}

function getFileExtension(fileName) {
  const extension = fileName.split('.').pop();
  return extension ? extension.toLowerCase() : '';
}

function getFileNameWithoutExtension(fileName) {
  return fileName.replace(/\.[^/.]+$/, '');
}

function parseImportedTypeClub(value) {
  const normalized = String(value ?? '').trim().toUpperCase();
  if (normalized === 'LION' || normalized === 'LEO') {
    return { valid: true, normalized };
  }
  return { valid: false, normalized: null };
}

function parseLogoFileBaseName(baseName) {
  const trimmed = String(baseName ?? '').trim();
  const lastDashIndex = trimmed.lastIndexOf('-');

  if (lastDashIndex <= 0) {
    return { valid: false, compositeKey: '' };
  }

  const typeSegment = trimmed.slice(lastDashIndex + 1);
  const clubSlug = slugify(trimmed.slice(0, lastDashIndex));
  const parsedTypeClub = parseImportedTypeClub(typeSegment);

  if (!clubSlug || !parsedTypeClub.valid) {
    return { valid: false, compositeKey: '' };
  }

  return { valid: true, compositeKey: `${clubSlug}::${parsedTypeClub.normalized}` };
}

function findClubByLogoFileName(fileName, clubs) {
  const baseName = getFileNameWithoutExtension(fileName);
  const parsed = parseLogoFileBaseName(baseName);

  if (!parsed.valid) {
    return null;
  }

  return clubs.find((club) => getClubCompositeKey(club.nomClub, club.typeClub) === parsed.compositeKey) ?? null;
}

async function collectLogoFiles(dir, prefix = '') {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

    if (entry.isDirectory()) {
      files.push(...await collectLogoFiles(path.join(dir, entry.name), relativePath));
      continue;
    }

    if (IMAGE_EXT.has(getFileExtension(entry.name))) {
      files.push(relativePath);
    }
  }

  return files;
}

function findClubByNameSlug(clubs, nameSlug) {
  return clubs.filter((club) => slugify(club.nomClub) === nameSlug);
}

async function main() {
  const clubs = JSON.parse(await readFile(CLUBS_JSON_PATH, 'utf-8'));

  if (!Array.isArray(clubs)) {
    throw new Error('clubs.json doit contenir un tableau.');
  }

  const logoFiles = await collectLogoFiles(LOGOS_DIR);
  const updates = new Map();
  const unmatched = [];
  const ambiguous = [];

  for (const relativePath of logoFiles.sort()) {
    const fileName = path.basename(relativePath);
    const logoUrl = `/clubsIcons/${relativePath.split(path.sep).join('/')}`;
    const typedClub = findClubByLogoFileName(fileName, clubs);

    if (typedClub) {
      updates.set(getClubCompositeKey(typedClub.nomClub, typedClub.typeClub), {
        club: typedClub,
        logoUrl,
        file: relativePath,
      });
      continue;
    }

    const baseName = getFileNameWithoutExtension(
      relativePath.includes('/')
        ? relativePath.replace(/^[^/]+\//, '')
        : fileName,
    );
    const candidates = findClubByNameSlug(clubs, slugify(baseName));

    if (candidates.length === 1) {
      const club = candidates[0];
      updates.set(getClubCompositeKey(club.nomClub, club.typeClub), { club, logoUrl, file: relativePath });
      continue;
    }

    if (candidates.length > 1) {
      const preferred = candidates.find((c) => normalizeClubType(c.typeClub) === 'LION') ?? candidates[0];
      updates.set(getClubCompositeKey(preferred.nomClub, preferred.typeClub), {
        club: preferred,
        logoUrl,
        file: relativePath,
      });
      ambiguous.push({
        file: relativePath,
        resolved: `${preferred.nomClub} (${preferred.typeClub})`,
        candidates: candidates.map((c) => `${c.nomClub} (${c.typeClub})`),
      });
      continue;
    }

    const fullSlug = slugify(relativePath.replace(/\.[^/.]+$/, '').replace(/\//g, ' '));
    const fullCandidates = findClubByNameSlug(clubs, fullSlug);

    if (fullCandidates.length === 1) {
      const club = fullCandidates[0];
      updates.set(getClubCompositeKey(club.nomClub, club.typeClub), { club, logoUrl, file: relativePath });
      continue;
    }

    unmatched.push(relativePath);
  }

  let changed = 0;
  const nextClubs = clubs.map((club) => {
    const key = getClubCompositeKey(club.nomClub, club.typeClub);
    const update = updates.get(key);

    if (!update || club.clubLogoUrl === update.logoUrl) {
      return club;
    }

    changed += 1;
    return { ...club, clubLogoUrl: update.logoUrl };
  });

  console.log(`Fichiers logos analysés : ${logoFiles.length}`);
  console.log(`Clubs associés       : ${updates.size}`);
  console.log(`URLs mises à jour    : ${changed}`);

  if (ambiguous.length > 0) {
    console.log('\nAmbigu (LION prioritaire) :');
    for (const item of ambiguous) {
      console.log(`  - ${item.file} → ${item.resolved} [${item.candidates.join(', ')}]`);
    }
  }

  if (unmatched.length > 0) {
    console.log('\nSans correspondance club :');
    for (const file of unmatched) {
      console.log(`  - ${file}`);
    }
  }

  if (changed > 0) {
    console.log('\nMises à jour :');
    for (const club of nextClubs) {
      const key = getClubCompositeKey(club.nomClub, club.typeClub);
      const before = clubs.find((c) => getClubCompositeKey(c.nomClub, c.typeClub) === key);
      if (before?.clubLogoUrl !== club.clubLogoUrl && club.clubLogoUrl) {
        console.log(`  ${club.nomClub} (${club.typeClub})`);
        console.log(`    ${before?.clubLogoUrl ?? '(absent)'} → ${club.clubLogoUrl}`);
      }
    }
  }

  if (dryRun) {
    console.log('\n[dry-run] Aucune écriture effectuée.');
    return;
  }

  if (changed > 0) {
    await writeFile(CLUBS_JSON_PATH, `${JSON.stringify(nextClubs, null, 4)}\n`, 'utf-8');
    console.log(`\nÉcrit : ${CLUBS_JSON_PATH}`);
  } else {
    console.log('\nclubs.json déjà à jour.');
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
