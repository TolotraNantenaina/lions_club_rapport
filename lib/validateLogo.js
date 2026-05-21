import { getFileExtension, getFileNameWithoutExtension, slugifyUpper } from './slugify';

export const ALLOWED_LOGO_EXTENSIONS = ['png', 'jpg', 'jpeg'];
export const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

export function findClubByLogoFileName(fileName, clubs) {
  const extension = getFileExtension(fileName);
  const baseName = getFileNameWithoutExtension(fileName);
  const fileSlug = slugifyUpper(baseName);
  const errors = [];

  if (!baseName.trim()) {
    errors.push('Le nom du fichier image est vide.');
  }

  if (!ALLOWED_LOGO_EXTENSIONS.includes(extension)) {
    errors.push('Extension invalide. Formats acceptés : .png, .jpg, .jpeg.');
  }

  if (!fileSlug) {
    errors.push('Le nom du fichier doit contenir un slug valide.');
  }

  const club = clubs.find((candidate) => slugifyUpper(candidate.nomClub) === fileSlug);

  if (!club && fileSlug) {
    errors.push(`Aucun club ne correspond au slug "${fileSlug}".`);
  }

  return {
    ok: errors.length === 0,
    club,
    clubSlug: fileSlug,
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
