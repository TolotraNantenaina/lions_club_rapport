import { getFileExtension, getFileNameWithoutExtension, slugify } from './slugify';
import { normalizeClubType } from './clubSearchFilter';
import { getClubCompositeKey, parseImportedTypeClub } from './validateClubData';

export const ALLOWED_LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg'];
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;
export const LOGO_FILE_NAME_PATTERN = 'NOM_CLUB-TYPE_CLUB.extension';

export function buildLogoFileBaseName(nomClub, typeClub) {
  const clubName = String(nomClub ?? '')
    .trim()
    .replace(/[\\/:*?"<>|]+/g, ' ')
    .replace(/\s+/g, ' ');
  const normalizedType = normalizeClubType(typeClub);

  if (!clubName) {
    return '';
  }

  return `${clubName}-${normalizedType}`;
}

export function buildLogoFileName(nomClub, typeClub, extension) {
  const baseName = buildLogoFileBaseName(nomClub, typeClub);

  if (!baseName) {
    return '';
  }

  return `${baseName}.${extension.toLowerCase()}`;
}

export function getCompositeKeyFromLogoParts(clubSlugPart, typeClub) {
  const clubSlug = slugify(clubSlugPart);

  if (!clubSlug) {
    return '';
  }

  return `${clubSlug}::${normalizeClubType(typeClub)}`;
}

export function parseLogoFileBaseName(baseName) {
  const trimmed = String(baseName ?? '').trim();
  const errors = [];

  if (!trimmed) {
    return {
      valid: false,
      clubSlug: '',
      typeClub: null,
      compositeKey: '',
      errors: ['Le nom du fichier image est vide.'],
    };
  }

  const lastDashIndex = trimmed.lastIndexOf('-');

  if (lastDashIndex <= 0) {
    return {
      valid: false,
      clubSlug: '',
      typeClub: null,
      compositeKey: '',
      errors: [
        `Le nom du fichier doit inclure le type de club (LION ou LEO), au format ${LOGO_FILE_NAME_PATTERN} (ex. GRAND-BAIE-LION.png).`,
      ],
    };
  }

  const typeSegment = trimmed.slice(lastDashIndex + 1);
  const clubSlug = trimmed.slice(0, lastDashIndex);
  const parsedTypeClub = parseImportedTypeClub(typeSegment);

  if (!clubSlug) {
    errors.push('Le slug du club est invalide.');
  }

  if (!parsedTypeClub.valid) {
    errors.push('Le type de club dans le nom du fichier est obligatoire. Valeurs acceptées : LION ou LEO.');
  }

  if (errors.length > 0) {
    return {
      valid: false,
      clubSlug,
      typeClub: parsedTypeClub.valid ? parsedTypeClub.normalized : null,
      compositeKey: '',
      errors,
    };
  }

  return {
    valid: true,
    clubSlug,
    typeClub: parsedTypeClub.normalized,
    compositeKey: getCompositeKeyFromLogoParts(clubSlug, parsedTypeClub.normalized),
    errors: [],
  };
}

export function findClubByLogoFileName(fileName, clubs) {
  const extension = getFileExtension(fileName);
  const baseName = getFileNameWithoutExtension(fileName);
  const parsedBaseName = parseLogoFileBaseName(baseName);
  const errors = [...parsedBaseName.errors];

  if (!ALLOWED_LOGO_EXTENSIONS.includes(extension)) {
    errors.push('Extension invalide. Formats acceptés : .png, .jpg, .jpeg.');
  }

  const club = parsedBaseName.compositeKey
    ? clubs.find((candidate) => getClubCompositeKey(candidate.nomClub, candidate.typeClub) === parsedBaseName.compositeKey)
    : null;

  if (parsedBaseName.valid && parsedBaseName.compositeKey && !club) {
    errors.push(
      `Aucun club ne correspond à "${parsedBaseName.clubSlug}-${parsedBaseName.typeClub}". Vérifiez le nom et le type (LION ou LEO).`,
    );
  }

  return {
    ok: errors.length === 0,
    club,
    clubSlug: parsedBaseName.clubSlug,
    typeClub: parsedBaseName.typeClub,
    compositeKey: parsedBaseName.compositeKey,
    extension,
    errors,
  };
}

export async function validateLogoFile(file, clubs) {
  const result = findClubByLogoFileName(file.name, clubs);
  const errors = [...result.errors];

  if (file.size === 0) {
    errors.push('Le fichier image est vide.');
  }

  if (file.size > MAX_LOGO_SIZE_BYTES) {
    errors.push('L’image est trop lourde. Taille maximale : 2 Mo.');
  }

  if (!file.type.startsWith('image/')) {
    errors.push('Le fichier sélectionné n’est pas une image valide.');
  }

  try {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    await new Promise((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error('Image illisible'));
      image.src = imageUrl;
    });

    URL.revokeObjectURL(imageUrl);
  } catch {
    errors.push('L’image est corrompue ou illisible.');
  }

  return {
    ...result,
    ok: errors.length === 0,
    errors,
  };
}
