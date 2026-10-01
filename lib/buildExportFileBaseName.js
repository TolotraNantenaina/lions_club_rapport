/**
 * Règle de nommage export (route `/`, commit a33dd424) :
 * `{meetingDate}_{clubName}[_{clubType}]_{H-M-S}`
 * Les JPG ajoutent `_{numPage}` via JpgDownloadModal.
 */

export function buildExportFileBaseName({
  meetingDate,
  clubName,
  clubType,
  at = new Date(),
} = {}) {
  const stamp = `${at.getHours()}-${at.getMinutes()}-${at.getSeconds()}`;
  const datePart = meetingDate || at.toISOString().split('T')[0];
  const name = clubName || 'rapport';
  const typeSuffix = clubType ? `_${clubType}` : '';
  return `${datePart}_${name}${typeSuffix}_${stamp}`;
}

/** Champs formulaire CR V1 (`formData`) */
export function buildExportFileBaseNameFromFormData(formData, at = new Date()) {
  return buildExportFileBaseName({
    meetingDate: formData?.meetingDate,
    clubName: formData?.clubName,
    clubType: formData?.clubType,
    at,
  });
}

/** Objet club éditeur (`selectedClub` / note.club) */
export function buildExportFileBaseNameFromClub(club, at = new Date()) {
  return buildExportFileBaseName({
    clubName: club?.nomClub,
    clubType: club?.typeClub,
    at,
  });
}
