/** Types de réunion — liste officielle du formulaire */

/** Options communes (page d’accueil + base CR V1), sans les visites officielles */
export const REUNION_OPTIONS_STANDARD = [
  'AG',
  'RS',
  'AG EXTRA',
  'RS EXTRA',
  'AG MIXTE',
  'RS MIXTE',
  'CA',
  'CA EXTRA',
  'AUTRE',
];

/** Option unique regroupant les visites officielles (GD / PZ / PDL) et les autres réunions */
export const REUNION_AUTRE_VISITE = 'Autre (Visite GD / PZ / PDL)';

/** Options CR V1 : « AUTRE » et les visites sont regroupés sous une seule option */
export const REUNION_OPTIONS = [
  ...REUNION_OPTIONS_STANDARD.filter((type) => type !== 'AUTRE'),
  REUNION_AUTRE_VISITE,
];

/** Anciennes options de visite (brouillons localStorage) — toujours en mode éditeur libre */
const LEGACY_VISITE_REUNION_TYPES = [
  'Visite Gouverneur de District',
  'Visite Président de Zone / Président de District Leo',
];

export const VISITE_LIBRE_REUNION_TYPES = new Set([
  REUNION_AUTRE_VISITE,
  ...LEGACY_VISITE_REUNION_TYPES,
]);

/** Libellés développés pour le titre du compte-rendu */
const REUNION_DEVELOPED_LABELS = {
  AG: 'Assemblée Générale',
  RS: 'Réunion Statutaire',
  'AG EXTRA': 'Assemblée Générale Extraordinaire',
  'RS EXTRA': 'Réunion Statutaire Extraordinaire',
  'AG MIXTE': 'Assemblée Générale Mixte',
  'RS MIXTE': 'Réunion Statutaire Mixte',
  CA: 'Réunion Statutaire du Conseil d’Administration',
  'CA EXTRA': 'Réunion Extraordinaire du Conseil d’Administration',
  AUTRE: 'Autre réunion',
  [REUNION_AUTRE_VISITE]: 'Visite (GD / PZ / PDL)',
};

/**
 * Anciennes valeurs enregistrées (ex. localStorage) — affichage / export uniquement.
 * Ne pas proposer dans les listes déroulantes ; pas de migration automatique.
 */
const LEGACY_REUNION_DEVELOPED_LABELS = {
  'AG/RS': 'Assemblée Générale / Réunion Statutaire',
  'AG/RS EXTRA': 'Assemblée Générale / Réunion Statutaire Extraordinaire',
  'AG/RS MIXTE': 'Assemblée Générale / Réunion Statutaire Mixte',
  'Visite Gouverneur de District': 'Visite du Gouverneur de District',
  'Visite Président de Zone / Président de District Leo':
    'Visite du Président de Zone / Président de District Leo',
};

export function isVisiteLibreReunion(reunionType) {
  return VISITE_LIBRE_REUNION_TYPES.has(reunionType);
}

export function getReunionDevelopedLabel(reunionType) {
  if (!reunionType) return 'Réunion Statutaire';
  if (LEGACY_REUNION_DEVELOPED_LABELS[reunionType]) {
    return LEGACY_REUNION_DEVELOPED_LABELS[reunionType];
  }
  return REUNION_DEVELOPED_LABELS[reunionType] || reunionType;
}

/**
 * En-tête du compte-rendu : « Compte-Rendu - Réunion Statutaire du {date} ».
 * @param {string} reunionType
 * @param {string} [dateText] — date déjà formatée ; omise → pas de suffixe « du … »
 */
export function getCompteRenduTitle(reunionType, dateText) {
  const base = `Compte-Rendu - ${getReunionDevelopedLabel(reunionType)}`;
  return dateText ? `${base} du ${dateText}` : base;
}

export function getCompteRenduPageSubtitle(reunionType, dateText) {
  return getCompteRenduTitle(reunionType, dateText);
}
