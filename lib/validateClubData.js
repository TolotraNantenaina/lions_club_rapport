import { slugify } from './slugify';

export const REQUIRED_XLSX_COLUMNS = [
  'nom_club',
  'numero',
  'region',
  'zone',
  'president',
  'secretaire',
  'vice_president',
];

const FIELD_MAPPINGS = [
  { source: 'nom_club', target: 'nomClub' },
  { source: 'numero', target: 'numeroAffiliation' },
  { source: 'president', target: 'President' },
  { source: 'vice_president', target: 'VicePresident' },
  { source: 'secretaire', target: 'Secretaire' },
  { source: 'region', target: 'Region' },
  { source: 'zone', target: 'Zone' },
];

export function normalizeHeader(value) {
  return value.trim().toLowerCase().replace(/\s+/g, '_');
}

export function normalizeImportedRows(rawRows) {
  return rawRows.map((row) => {
    const normalized = {};

    Object.entries(row).forEach(([key, value]) => {
      const normalizedKey = normalizeHeader(key);

      if (REQUIRED_XLSX_COLUMNS.includes(normalizedKey)) {
        normalized[normalizedKey] = String(value ?? '').trim();
      }
    });

    return {
      nom_club: normalized.nom_club ?? '',
      numero: normalized.numero ?? '',
      president: normalized.president ?? '',
      vice_president: normalized.vice_president ?? '',
      secretaire: normalized.secretaire ?? '',
      region: normalized.region ?? '',
      zone: normalized.zone ?? '',
    };
  });
}

export function validateImportedClubRows(rows) {
  const issues = [];
  const seenClubSlugs = new Map();

  if (rows.length === 0) {
    return [{ type: 'error', message: 'La feuille XLSX ne contient aucune ligne exploitable.' }];
  }

  rows.forEach((row, index) => {
    const rowNumber = index + 2;

    REQUIRED_XLSX_COLUMNS.forEach((column) => {
      if (!row[column]) {
        issues.push({
          type: 'error',
          row: rowNumber,
          field: column,
          message: `La colonne "${column}" est obligatoire à la ligne ${rowNumber}.`,
        });
      }
    });

      const clubSlug = slugify(row.nom_club);

    if (!clubSlug) {
      issues.push({
        type: 'error',
        row: rowNumber,
        field: 'nom_club',
        message: `Le nom du club est invalide à la ligne ${rowNumber}.`,
      });
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

export function buildClubChanges(existingClubs, importedRows) {
  const existingBySlug = new Map(existingClubs.map((club) => [slugify(club.nomClub), club]));

  return importedRows.map((row) => {
    const clubSlug = slugify(row.nom_club);
    const existingClub = existingBySlug.get(clubSlug);

    if (!existingClub) {
      return {
        clubName: row.nom_club,
        status: 'created',
        changes: FIELD_MAPPINGS.map(({ source, target }) => ({
          field: target,
          before: '',
          after: row[source],
        })),
      };
    }

    const changes = FIELD_MAPPINGS
      .map(({ source, target }) => ({
        field: target,
        before: existingClub[target] ?? '',
        after: row[source],
      }))
      .filter((change) => change.before.trim() !== change.after.trim());

    if ('treasurer' in existingClub || 'Tresorier' in existingClub) {
      const target = 'vice_president' in existingClub ? 'vice_president' : 'VicePresident';
      const before = existingClub[target] ?? '';

      if (before.trim() !== row.vice_president.trim()) {
        changes.push({
          field: target,
          before,
            after: row.vice_president,
        });
      }
    }

    return {
      clubName: existingClub.nomClub,
      status: changes.length > 0 ? 'updated' : 'unchanged',
      changes,
    };
  });
}

export function applyClubUpdates(existingClubs, importedRows) {
  const importedBySlug = new Map(importedRows.map((row) => [slugify(row.nom_club), row]));
  const updatedSlugs = new Set();

  const updatedClubs = existingClubs.map((club) => {
    const clubSlug = slugify(club.nomClub);
    const importedRow = importedBySlug.get(clubSlug);

    if (!importedRow) {
      return club;
    }

    updatedSlugs.add(clubSlug);

    const nextClub = {
      ...club,
      numeroAffiliation: importedRow.numero,
      President: importedRow.president,
      vicePresident: importedRow.vice_president,
      Secretaire: importedRow.secretaire,
      Region: importedRow.region,
      Zone: importedRow.zone,
    };

    return nextClub;
  });

  const newClubs = importedRows
    .filter((row) => !updatedSlugs.has(slugify(row.nom_club)))
    .map((row) => ({
      nomClub: row.nom_club,
      numeroAffiliation: row.numero,
      President: row.president,
      vicePresident: row.vice_president,
      Secretaire: row.secretaire,
      Region: row.region,
      Zone: row.zone,
    }));

  return [...updatedClubs, ...newClubs];
}
