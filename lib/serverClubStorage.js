import { mkdir, readFile, writeFile } from 'fs/promises';
import path from 'path';
import { getFileExtension, slugifyUpper } from './slugify';
import { ALLOWED_LOGO_EXTENSIONS, MAX_LOGO_SIZE_BYTES } from './validateLogo';

const PROJECT_ROOT = process.cwd();
const CLUBS_JSON_PATH = path.join(PROJECT_ROOT, 'public', 'data', 'clubs.json');
const CLUB_LOGOS_DIR = path.join(PROJECT_ROOT, 'public', 'clubsIcons');

export async function readClubsJson() {
  const fileContent = await readFile(CLUBS_JSON_PATH, 'utf-8');
  const clubs = JSON.parse(fileContent);

  if (!Array.isArray(clubs)) {
    throw new Error('Le fichier public/data/clubs.json doit contenir un tableau.');
  }

  return clubs;
}

export async function writeClubsJson(clubs) {
  await writeFile(CLUBS_JSON_PATH, `${JSON.stringify(clubs, null, 4)}\n`, 'utf-8');
}

export function sanitizeLogoFileName(clubName, extension) {
  return `${slugifyUpper(clubName)}.${extension.toLowerCase()}`;
}

export async function saveClubLogo(file, club) {
  const extension = getFileExtension(file.name);

  if (!ALLOWED_LOGO_EXTENSIONS.includes(extension)) {
    throw new Error('Extension image invalide.');
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    throw new Error('L’image est trop lourde. Taille maximale : 2 Mo.');
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  if (!isRealImage(buffer, extension)) {
    throw new Error('Le fichier image est corrompu ou invalide.');
  }

  await mkdir(CLUB_LOGOS_DIR, { recursive: true });

  const fileName = sanitizeLogoFileName(club.nomClub, extension);
  const targetPath = path.join(CLUB_LOGOS_DIR, fileName);

  await writeFile(targetPath, buffer);

  return `/clubsIcons/${fileName}`;
}

function isRealImage(buffer, extension) {
  if (buffer.length < 8) {
    return false;
  }

  if (extension === 'png') {
    return buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  }

  if (extension === 'jpg' || extension === 'jpeg') {
    return buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;
  }

  return false;
}
