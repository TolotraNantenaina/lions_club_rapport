import { NextResponse } from 'next/server';
import { parseExcelFile } from '../../../../lib/parseExcel';
import { applyClubUpdates, buildClubChanges, validateImportedClubRows } from '../../../../lib/validateClubData';
import { readClubsJson, writeClubsJson } from '../../../../lib/serverClubStorage';

export const runtime = 'nodejs';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, errors: ['Aucun fichier XLSX valide reçu.'] },
        { status: 400 },
      );
    }

    const currentClubs = await readClubsJson();
    const parsed = await parseExcelFile(file);
    const validationIssues = validateImportedClubRows(parsed.rows, currentClubs, parsed.columns);
    const errors = [...parsed.issues, ...validationIssues].filter((issue) => issue.type === 'error');

    if (errors.length > 0) {
      return NextResponse.json(
        { ok: false, errors: errors.map((issue) => issue.message), issues: [...parsed.issues, ...validationIssues] },
        { status: 422 },
      );
    }

    const changes = buildClubChanges(currentClubs, parsed.rows, parsed.columns);
    const nextClubs = applyClubUpdates(currentClubs, parsed.rows, parsed.columns);

    await writeClubsJson(nextClubs);

    return NextResponse.json({
      ok: true,
      rowCount: parsed.rows.length,
      totalClubs: nextClubs.length,
      changes,
      updatedCount: changes.filter((change) => change.status === 'updated').length,
      createdCount: changes.filter((change) => change.status === 'created').length,
      unchangedCount: changes.filter((change) => change.status === 'unchanged').length,
      deletedCount: changes.filter((change) => change.status === 'deleted').length,
    });
  } catch (error) {
    console.error('Erreur import XLSX', error);

    return NextResponse.json(
      { ok: false, errors: ['Une erreur serveur est survenue pendant l’import XLSX.'] },
      { status: 500 },
    );
  }
}
