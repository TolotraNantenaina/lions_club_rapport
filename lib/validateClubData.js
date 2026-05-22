import { slugify } from './slugify';

export const REQUIRED_XLSX_COLUMNS = [
  'nom_club',
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
];

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
      message: `Colonne obligatoire manquante : ${missingRequired.join(', ')}. La colonne nom_club sert de clé primaire.`,
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
  const seenClubSlugs = new Map();
  const existingBySlug = new Map(existingClubs.map((club) => [slugify(club.nomClub), club]));

  const presentOptionalColumns = importedColumns.filter((column) => OPTIONAL_XLSX_COLUMNS.includes(column));

  if (rows.length === 0) {
    return [{ type: 'error', message: 'La feuille XLSX ne contient aucune ligne exploitable.' }];
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;
    const clubSlug = slugify(row.nom_club);

    if (isDeleteRow(row)) {
      if (!row.nom_club) {
        issues.push({
          type: 'error',
          row: rowNumber,
          field: 'nom_club',
          message: `Le nom du club est obligatoire pour une suppression à la ligne ${rowNumber}.`,
        });
      } else if (!clubSlug) {
        issues.push({
          type: 'error',
          row: rowNumber,
          field: 'nom_club',
          message: `Le nom du club est invalide à la ligne ${rowNumber}.`,
        });
      } else if (!existingBySlug.has(clubSlug)) {
        issues.push({
          type: 'error',
          row: rowNumber,
          field: 'supprimer',
          message: `Suppression impossible : le club "${row.nom_club}" est introuvable (ligne ${rowNumber}).`,
        });
      }
    } else {
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
      } else if (
        presentOptionalColumns.length > 0
        && !hasOptionalColumnUpdate(row, importedColumns)
      ) {
        issues.push({
          type: 'error',
          row: rowNumber,
          field: presentOptionalColumns[0],
          message: `Renseignez au moins une colonne optionnelle à la ligne ${rowNumber}, ou saisissez "vide" pour effacer une valeur.`,
        });
      }
    }

    if (!clubSlug) {
      return;
    }

    const firstSeenRow = seenClubSlugs.get(clubSlug);

    if (firstSeenRow) {
      issues.push({
        type: 'error',
        row: rowNumber,
        field: 'nom_club',
        message: `Doublon détecté pour "${row.nom_club}" aux lignes ${firstSeenRow} et ${rowNumber}.`,
      });
    } else {
      seenClubSlugs.set(clubSlug, rowNumber);
    }
  });

  return issues;
}

export function buildClubChanges(existingClubs, importedRows, importedColumns = ALL_XLSX_COLUMNS) {
  const existingBySlug = new Map(existingClubs.map((club) => [slugify(club.nomClub), club]));

  return importedRows.map((row) => {
    const clubSlug = slugify(row.nom_club);

    if (isDeleteRow(row)) {
      const existingClub = existingBySlug.get(clubSlug);

      return {
        clubName: existingClub?.nomClub ?? row.nom_club,
        status: 'deleted',
        changes: [{ field: 'suppression', before: 'actif', after: 'supprimé' }],
      };
    }

    const existingClub = existingBySlug.get(clubSlug);

    if (!existingClub) {
      return {
        clubName: row.nom_club,
        status: 'created',
        changes: FIELD_MAPPINGS
          .filter(({ source }) => importedColumns.includes(source))
          .map(({ source, target }) => ({
            field: target,
            before: '',
            after: resolveOptionalFieldValue(row[source], ''),
          })),
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
      clubName: existingClub.nomClub,
      status: changes.length > 0 ? 'updated' : 'unchanged',
      changes,
    };
  });
}

export function applyClubUpdates(existingClubs, importedRows, importedColumns = ALL_XLSX_COLUMNS) {
  const deleteSlugs = new Set(
    importedRows
      .filter(isDeleteRow)
      .map((row) => slugify(row.nom_club))
      .filter(Boolean),
  );
  const upsertRows = importedRows.filter((row) => !isDeleteRow(row));
  const importedBySlug = new Map(upsertRows.map((row) => [slugify(row.nom_club), row]));
  const updatedSlugs = new Set();

  const updatedClubs = existingClubs
    .filter((club) => !deleteSlugs.has(slugify(club.nomClub)))
    .map((club) => {
      const clubSlug = slugify(club.nomClub);
      const importedRow = importedBySlug.get(clubSlug);

      if (!importedRow) {
        return club;
      }

      updatedSlugs.add(clubSlug);

      const nextClub = { ...club };

      FIELD_MAPPINGS.forEach(({ source, target }) => {
        if (importedColumns.includes(source)) {
          nextClub[target] = resolveOptionalFieldValue(importedRow[source], club[target] ?? '');
        }
      });

      return nextClub;
    });

  const newClubs = upsertRows
    .filter((row) => !updatedSlugs.has(slugify(row.nom_club)))
    .map((row) => {
      const club = { nomClub: row.nom_club };

      FIELD_MAPPINGS.forEach(({ source, target }) => {
        if (importedColumns.includes(source)) {
          club[target] = resolveOptionalFieldValue(row[source], '');
        }
      });

      return club;
    });

  return [...updatedClubs, ...newClubs];
}
