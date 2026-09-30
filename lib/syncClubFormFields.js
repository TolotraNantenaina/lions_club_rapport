import { CLUB_TYPE, normalizeClubType } from './clubSearchFilter';

/** Champs formulaire remplis depuis clubs.json */
export const CLUB_FORM_FIELD_KEYS = [
  'president',
  'vicePresident',
  'secretary',
  'region',
  'zone',
  'clubLogoUrl',
  'numeroAffiliation',
  'clubType',
];

/**
 * @param {Array} clubsData
 * @param {string} clubName
 * @param {string} [selectedClubType] — toggle Lion/Leo UI
 * @param {string} [savedClubType] — typeClub déjà enregistré dans le formulaire
 */
export function findClubInList(clubsData, clubName, selectedClubType, savedClubType) {
  const trimmed = clubName?.trim();
  if (!trimmed || !Array.isArray(clubsData) || clubsData.length === 0) {
    return null;
  }

  const typeFromUi = selectedClubType ? normalizeClubType(selectedClubType) : null;
  const typeFromForm = savedClubType ? normalizeClubType(savedClubType) : null;
  const preferredType = typeFromUi || typeFromForm;

  if (preferredType) {
    const match = clubsData.find(
      (club) => club.nomClub?.trim() === trimmed
        && normalizeClubType(club.typeClub) === preferredType,
    );
    if (match) return match;
  }

  return clubsData.find((club) => club.nomClub?.trim() === trimmed) || null;
}

export function mapClubRecordToFormFields(club) {
  if (!club) return null;
  return {
    president: club.President || '',
    vicePresident: club.vicePresident || '',
    secretary: club.Secretaire || '',
    region: club.Region || '',
    zone: club.Zone || '',
    clubLogoUrl: club.clubLogoUrl || '',
    numeroAffiliation: club.numeroAffiliation || '',
    clubType: club.typeClub || '',
  };
}

/**
 * Patch à appliquer pour realigner le formulaire sur clubs.json.
 * Région / zone / logo / n° : toujours synchronisés si le club existe.
 * Bureau : rempli seulement si vide (évite d’écraser une saisie manuelle).
 */
export function buildClubFormSyncPatch(formData, clubFields) {
  if (!clubFields) return null;

  const patch = {};
  const alwaysSync = ['region', 'zone', 'clubLogoUrl', 'numeroAffiliation', 'clubType'];

  for (const key of alwaysSync) {
    const next = clubFields[key] ?? '';
    const cur = formData[key] ?? '';
    if (next !== cur) {
      patch[key] = next;
    }
  }

  for (const key of ['president', 'vicePresident', 'secretary']) {
    const next = clubFields[key] ?? '';
    const cur = formData[key] ?? '';
    if (!String(cur).trim() && next) {
      patch[key] = next;
    }
  }

  return Object.keys(patch).length > 0 ? patch : null;
}

export function clubTypeToToggleValue(typeClub) {
  return normalizeClubType(typeClub) === CLUB_TYPE.LEO ? CLUB_TYPE.LEO : CLUB_TYPE.LION;
}
