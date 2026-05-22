import * as XLSX from 'xlsx';
import {
  normalizeImportedRows,
  normalizeHeader,
  getDisplayColumns,
  validateImportedHeaders,
} from './validateClubData';

export async function parseExcelFile(file) {
  const extension = file.name.split('.').pop()?.toLowerCase();

  if (extension !== 'xlsx') {
    return {
      rows: [],
      columns: [],
      issues: [{ type: 'error', message: 'Le fichier doit être au format .xlsx.' }],
    };
  }

  if (file.size === 0) {
    return {
      rows: [],
      columns: [],
      issues: [{ type: 'error', message: 'Le fichier XLSX est vide.' }],
    };
  }

  try {
    const buffer = await file.arrayBuffer();
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      return {
        rows: [],
        columns: [],
        issues: [{ type: 'error', message: 'Le fichier XLSX ne contient aucune feuille.' }],
      };
    }

    const sheet = workbook.Sheets[firstSheetName];
    const headerRows = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });

    if (headerRows.length === 0) {
      return {
        rows: [],
        columns: [],
        issues: [{ type: 'error', message: 'La première feuille est vide.' }],
      };
    }

    const headers = Array.isArray(headerRows[0])
      ? headerRows[0].map((header) => normalizeHeader(String(header ?? '')))
      : [];
    const columns = getDisplayColumns(headers);
    const headerIssues = validateImportedHeaders(headers);

    if (headerIssues.length > 0) {
      return {
        rows: [],
        columns: [],
        issues: headerIssues,
      };
    }

    const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

    if (rawRows.length === 0) {
      return {
        rows: [],
        columns: [],
        issues: [{ type: 'error', message: 'La feuille ne contient aucune donnée après l’en-tête.' }],
      };
    }

    return {
      rows: normalizeImportedRows(rawRows),
      columns,
      issues: [],
    };
  } catch (error) {
    console.error('Erreur de lecture XLSX', error);

    return {
      rows: [],
      columns: [],
      issues: [{ type: 'error', message: 'Le fichier XLSX est corrompu ou impossible à convertir.' }],
    };
  }
}
