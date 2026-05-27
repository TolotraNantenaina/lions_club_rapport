import { normalizeClubType } from './clubSearchFilter';
import { slugify } from './slugify';

export const REQUIRED_XLSX_COLUMNS = [
  'nom_club',
  'type_club',
];

export const OPTIONAL_XLSX_COLUMNS = [
  'numero',
  'region',
  'zone',
  'president',
  'secretaire',
  'vice_president',
  'supprimer',
];

export const ALL_XLSX_COLUMNS = [...REQUIRED_XLSX_COLUMNS, ...OPTIONAL_XLSX_COLUMNS];

export const COLUMN_LABELS = {
  nom_club: 'Club',
  type_club: 'Type de club',
  numero: 'N° affiliation',
  region: 'Région',
  zone: 'Zone',
  president: 'Président',
  secretaire: 'Secrétaire',
  vice_president: 'Vice-président',
  supprimer: 'Supprimer',
};

const FIELD_MAPPINGS = [
  { source: 'numero', target: 'numeroAffiliation' },
  { source: 'president', target: 'President' },
  { source: 'vice_president', target: 'vicePresident' },
  { source: 'secretaire', target: 'Secretaire' },
  { source: 'region', target: 'Region' },
  { source: 'zone', target: 'Zone' },
  { source: 'type_club', target: 'typeClub' },
];

const VALID_IMPORTED_TYPE_CLUB_VALUES = new Set(['LION', 'LEO']);

export function parseImportedTypeClub(rawValue) {
  const value = String(rawValue ?? '').trim().toUpperCase();

  if (!value) {
    return { valid: false, normalized: null };
  }

  if (value === 'LEO') {
    return { valid: true, normalized: 'LEO' };
  }

  if (VALID_IMPORTED_TYPE_CLUB_VALUES.has(value)) {
    return { valid: true, normalized: 'LION' };
  }

  return { valid: false, normalized: null };
}

export function getClubCompositeKey(nomClub, typeClub) {
  const clubSlug = slugify(nomClub);

  if (!clubSlug) {
    return '';
  }

  return `${clubSlug}::${normalizeClubType(typeClub)}`;
}

export function getImportedRowCompositeKey(row) {
  const clubSlug = slugify(row.nom_club);
  const parsedTypeClub = parseImportedTypeClub(row.type_club);

  if (!clubSlug || !parsedTypeClub.valid) {
    return '';
  }

  return `${clubSlug}::${parsedTypeClub.normalized}`;
}

function formatClubIdentity(nomClub, typeClub) {
  return `${nomClub} (${normalizeClubType(typeClub)})`;
}

export function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function getColumnLabel(column) {
  if (COLUMN_LABELS[column]) {
    return COLUMN_LABELS[column];
  }

  return column
    .split('_')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function getDisplayColumns(headers) {
  const normalizedHeaders = headers
    .map((header) => normalizeHeader(String(header ?? '')))
    .filter(Boolean);

  const knownColumns = ALL_XLSX_COLUMNS.filter((column) => normalizedHeaders.includes(column));
  const extraColumns = normalizedHeaders.filter((column) => !ALL_XLSX_COLUMNS.includes(column));

  return [...knownColumns, ...extraColumns];
}

export function isDeleteRow(row) {
  return String(row.supprimer ?? '').trim().toLowerCase() === 'oui';
}

export function isExplicitEmptyMarker(value) {
  return String(value ?? '').trim().toLowerCase() === 'vide';
}

export function isBlankImportedCell(value) {
  return String(value ?? '').trim() === '';
}

export function resolveOptionalFieldValue(rawValue, existingValue = '') {
  if (isBlankImportedCell(rawValue)) {
    return existingValue;
  }

  if (isExplicitEmptyMarker(rawValue)) {
    return '';
  }

  return String(rawValue).trim();
}

export function hasOptionalColumnUpdate(row, importedColumns) {
  const optionalColumns = importedColumns.filter((column) => OPTIONAL_XLSX_COLUMNS.includes(column));

  return optionalColumns.some((column) => !isBlankImportedCell(row[column]));
}

export function normalizeImportedRows(rawRows) {
  return rawRows.map((row) => {
    const normalized = {};

    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = normalizeHeader(key);

      if (normalizedKey) {
        normalized[normalizedKey] = String(value ?? '').trim();
      }
    });

    return normalized;
  });
}

export function getPresentOptionalColumns(headers) {
  return OPTIONAL_XLSX_COLUMNS.filter((column) => headers.includes(column));
}

export function validateImportedHeaders(headers) {
  const issues = [];
  const missingRequired = REQUIRED_XLSX_COLUMNS.filter((column) => !headers.includes(column));
  const presentOptional = getPresentOptionalColumns(headers);

  if (missingRequired.length > 0) {
    issues.push({
      type: 'error',
      message: `Colonne obligatoire manquante : ${missingRequired.join(', ')}. Les colonnes nom_club et type_club forment ensemble la clé primaire.`,
    });
  }

  if (presentOptional.length === 0) {
    issues.push({
      type: 'error',
      message: `Ajoutez au moins une colonne optionnelle pour modifier les clubs : ${OPTIONAL_XLSX_COLUMNS.join(', ')}.`,
    });
  }

  return issues;
}

export function validateImportedClubRows(rows, existingClubs = [], importedColumns = []) {
  const issues = [];
  const seenCompositeKeys = new Map();
  const existingByCompositeKey = new Map(
    existingClubs.map((club) => [getClubCompositeKey(club.nomClub, club.typeClub), club]),
  );

  const presentOptionalColumns = importedColumns.filter((column) => OPTIONAL_XLSX_COLUMNS.includes(column));

  if (rows.length === 0) {
    return [{ type: 'error', message: 'La feuille XLSX ne contient aucune ligne exploitable.' }];
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const clubSlug = slugify(row.nom_club);
    const parsedTypeClub = parseImportedTypeClub(row.type_club);
    const compositeKey = getImportedRowCompositeKey(row);

    if (!row.nom_club) {
      issues.push({
        type: 'error',
        row: rowNumber,
        field: 'nom_club',
        message: `La colonne "nom_club" est obligatoire à la ligne ${rowNumber}.`,
      });
    } else if (!clubSlug) {
      issues.push({
        type: 'error',
        row: rowNumber,
        field: 'nom_club',
        message: `Le nom du club est invalide à la ligne ${rowNumber}.`,
      });
    }

    if (!String(row.type_club ?? '').trim()) {
      issues.push({
        type: 'error',
        row: rowNumber,
        field: 'type_club',
        message: `La colonne "type_club" est obligatoire à la ligne ${rowNumber}.`,
      });
    } else if (!parsedTypeClub.valid) {
      issues.push({
        type: 'error',
        row: rowNumber,
        field: 'type_club',
        message: `Le type de club est invalide à la ligne ${rowNumber}. Valeurs acceptées : LION ou LEO.`,
      });
    }

    if (isDeleteRow(row)) {
      if (compositeKey && !existingByCompositeKey.has(compositeKey)) {
        issues.push({
          type: 'error',
          row: rowNumber,
          field: 'supprimer',
          message: `Suppression impossible : le club "${formatClubIdentity(row.nom_club, parsedTypeClub.normalized)}" est introuvable (ligne ${rowNumber}).`,
        });
      }
    } else if (
      clubSlug
      && parsedTypeClub.valid
      && presentOptionalColumns.length > 0
      && !hasOptionalColumnUpdate(row, importedColumns)
    ) {
      issues.push({
        type: 'error',
        row: rowNumber,
        field: presentOptionalColumns[0],
        message: `Renseignez au moins une colonne optionnelle à la ligne ${rowNumber}, ou saisissez "vide" pour effacer une valeur.`,
      });
    }

    if (!compositeKey) {
      return;
    }

    const firstSeenRow = seenCompositeKeys.get(compositeKey);

    if (firstSeenRow) {
      issues.push({
        type: 'error',
        row: rowNumber,
        field: 'type_club',
        message: `Doublon détecté pour "${formatClubIdentity(row.nom_club, parsedTypeClub.normalized)}" aux lignes ${firstSeenRow} et ${rowNumber}.`,
      });
    } else {
      seenCompositeKeys.set(compositeKey, rowNumber);
    }
  });

  return issues;
}

export function buildClubChanges(existingClubs, importedRows, importedColumns = ALL_XLSX_COLUMNS) {
  const existingByCompositeKey = new Map(
    existingClubs.map((club) => [getClubCompositeKey(club.nomClub, club.typeClub), club]),
  );

  return importedRows.map((row) => {
    const compositeKey = getImportedRowCompositeKey(row);
    const parsedTypeClub = parseImportedTypeClub(row.type_club);

    if (isDeleteRow(row)) {
      const existingClub = existingByCompositeKey.get(compositeKey);

      return {
        clubName: existingClub
          ? formatClubIdentity(existingClub.nomClub, existingClub.typeClub)
          : formatClubIdentity(row.nom_club, parsedTypeClub.normalized),
        status: 'deleted',
        changes: [{ field: 'suppression', before: 'actif', after: 'supprimé' }],
      };
    }

    const existingClub = existingByCompositeKey.get(compositeKey);

    if (!existingClub) {
      return {
        clubName: formatClubIdentity(row.nom_club, parsedTypeClub.normalized),
        status: 'created',
        changes: [
          {
            field: 'typeClub',
            before: '',
            after: parsedTypeClub.normalized,
          },
          ...FIELD_MAPPINGS
            .filter(({ source }) => importedColumns.includes(source))
            .map(({ source, target }) => ({
              field: target,
              before: '',
              after: resolveOptionalFieldValue(row[source], ''),
            })),
        ],
      };
    }

    const changes = FIELD_MAPPINGS
      .filter(({ source }) => importedColumns.includes(source))
      .map(({ source, target }) => ({
        field: target,
        before: existingClub[target] ?? '',
        after: resolveOptionalFieldValue(row[source], existingClub[target] ?? ''),
      }))
      .filter((change) => String(change.before).trim() !== String(change.after).trim());

    return {
      clubName: formatClubIdentity(existingClub.nomClub, existingClub.typeClub),
      status: changes.length > 0 ? 'updated' : 'unchanged',
      changes,
    };
  });
}

export function applyClubUpdates(existingClubs, importedRows, importedColumns = ALL_XLSX_COLUMNS) {
  const deleteCompositeKeys = new Set(
    importedRows
      .filter(isDeleteRow)
      .map(getImportedRowCompositeKey)
      .filter(Boolean),
  );
  const upsertRows = importedRows.filter((row) => !isDeleteRow(row));
  const importedByCompositeKey = new Map(
    upsertRows.map((row) => [getImportedRowCompositeKey(row), row]),
  );
  const updatedCompositeKeys = new Set();

  const updatedClubs = existingClubs
    .filter((club) => !deleteCompositeKeys.has(getClubCompositeKey(club.nomClub, club.typeClub)))
    .map((club) => {
      const compositeKey = getClubCompositeKey(club.nomClub, club.typeClub);
      const importedRow = importedByCompositeKey.get(compositeKey);

      if (!importedRow) {
        return club;
      }

      updatedCompositeKeys.add(compositeKey);

      const nextClub = { ...club };

      FIELD_MAPPINGS.forEach(({ source, target }) => {
        if (importedColumns.includes(source)) {
          nextClub[target] = resolveOptionalFieldValue(importedRow[source], club[target] ?? '');
        }
      });

      return nextClub;
    });

  const newClubs = upsertRows
    .filter((row) => !updatedCompositeKeys.has(getImportedRowCompositeKey(row)))
    .map((row) => {
      const parsedTypeClub = parseImportedTypeClub(row.type_club);
      const club = {
        nomClub: row.nom_club,
        typeClub: parsedTypeClub.normalized,
      };

      FIELD_MAPPINGS.forEach(({ source, target }) => {
        if (importedColumns.includes(source)) {
          club[target] = resolveOptionalFieldValue(row[source], '');
        }
      });

      return club;
    });

  return [...updatedClubs, ...newClubs];
}
