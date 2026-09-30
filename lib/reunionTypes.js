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

export const REUNION_OPTIONS = [
  ...REUNION_OPTIONS_STANDARD,
  'Visite Gouverneur de District',
  'Visite Président de Zone / Président de District Leo',
];

export const VISITE_LIBRE_REUNION_TYPES = new Set([
  'Visite Gouverneur de District',
  'Visite Président de Zone / Président de District Leo',
]);

/** Libellés développés pour le titre du compte-rendu */
const REUNION_DEVELOPED_LABELS = {
  AG: 'Assemblée Générale',
  RS: 'Réunion Statutaire',
  'AG EXTRA': 'Assemblée Générale Extraordinaire',
  'RS EXTRA': 'Réunion Statutaire Extraordinaire',
  'AG MIXTE': 'Assemblée Générale Mixte',
  'RS MIXTE': 'Réunion Statutaire Mixte',
  CA: "Conseil d'Administration",
  'CA EXTRA': "Conseil d'Administration Extraordinaire",
  AUTRE: 'Autre réunion',
  'Visite Gouverneur de District': 'Visite du Gouverneur de District',
  'Visite Président de Zone / Président de District Leo':
    'Visite du Président de Zone / Président de District Leo',
};

/**
 * Anciennes valeurs enregistrées (ex. localStorage) — affichage / export uniquement.
 * Ne pas proposer dans les listes déroulantes ; pas de migration automatique.
 */
const LEGACY_REUNION_DEVELOPED_LABELS = {
  'AG/RS': 'Assemblée Générale / Réunion Statutaire',
  'AG/RS EXTRA': 'Assemblée Générale / Réunion Statutaire Extraordinaire',
  'AG/RS MIXTE': 'Assemblée Générale / Réunion Statutaire Mixte',
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

export function getCompteRenduPageSubtitle(reunionType) {
  return `Compte-Rendu de ${getReunionDevelopedLabel(reunionType)}`;
}
