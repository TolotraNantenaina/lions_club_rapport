'use client';

import { getReunionDevelopedLabel, isVisiteLibreReunion } from '../../lib/reunionTypes';
import { getCurrencySymbol } from '../../lib/treasuryCurrency';
import { formatDate } from '../helpers/formatDate';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function linesToHtml(value) {
  if (!value || !String(value).trim()) return '<p><em>Non renseigné</em></p>';
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p>${escapeHtml(line)}</p>`)
    .join('');
}

function sectionHtml(title, bodyHtml) {
  return `<h2>${escapeHtml(title)}</h2>${bodyHtml}`;
}

function buildClassicWordBody(formData) {
  const sym = getCurrencySymbol(formData.treasuryCurrency);
  const money = (v) => (v ? `${escapeHtml(v)} ${sym}`.trim() : 'Non renseigné');

  const parts = [
    sectionHtml('1/ Mot éventuel du président', linesToHtml(formData.presidentWord)),
    sectionHtml("2/ Rappel de l'ordre du jour", linesToHtml(formData.orderOfDay)),
    sectionHtml('3/ Approbation du compte-rendu', linesToHtml(formData.approvalPV)),
    sectionHtml('4/ Secrétariat', [
      '<h3>Courriers reçus</h3>',
      linesToHtml(formData.receivedMails),
      '<h3>Courriers envoyés</h3>',
      linesToHtml(formData.sentMails),
    ].join('')),
    sectionHtml('5/ Trésorerie', [
      `<p><strong>Solde compte administratif :</strong> ${money(formData.adminBalance)}</p>`,
      `<p><strong>Solde compte œuvre :</strong> ${money(formData.worksBalance)}</p>`,
      `<p><strong>Cotisation Siège :</strong> ${money(formData.headQuartersFees)}</p>`,
      `<p><strong>Cotisation District :</strong> ${money(formData.districtFees)}</p>`,
      `<p><strong>Cotisation Région :</strong> ${money(formData.regionFees)}</p>`,
      linesToHtml(formData.treasuryOther),
    ].join('')),
    sectionHtml('6/ Commissions et actions', [
      '<h3>POINT EME (Effectif)</h3>', linesToHtml(formData.pointEME),
      '<h3>POINT EML (Formation)</h3>', linesToHtml(formData.pointEML),
      '<h3>POINT EMS (Service-Oeuvres)</h3>', linesToHtml(formData.pointEMS),
      '<h3>Actions en cours</h3>', linesToHtml(formData.ongoingActions),
      '<h3>Point Marketing et Communication</h3>', linesToHtml(formData.marketing),
    ].join('')),
    sectionHtml('7/ Autres points', [
      '<h3>Point LCIF</h3>', linesToHtml(formData.pointLCIF),
      '<h3>Interventions LEO</h3>', linesToHtml(formData.interventionsLeo),
      '<h3>Programme du mois</h3>', linesToHtml(formData.monthProgram),
      '<h3>Divers</h3>',
      formData.miscellaneous && formData.miscellaneous !== '<p></p>'
        ? formData.miscellaneous
        : '<p><em>Non renseigné</em></p>',
    ].join('')),
  ];

  return parts.join('');
}

function buildWordDocumentHtml(formData) {
  const developed = getReunionDevelopedLabel(formData.reunionType);
  const titleDate = formData.meetingDate ? formatDate(formData.meetingDate) : 'date non renseignée';
  const location = formData.location || 'Non renseigné';
  const participants = isVisiteLibreReunion(formData.reunionType)
    ? ''
    : [
      `${formData.memberPresent || '0'} présents`,
      `${formData.memberExcused || '0'} excusés`,
      `${formData.memberAbsent || '0'} absents`,
      `${formData.guests || '0'} invités`,
      `${formData.memberTotal || '0'} membres au total`,
    ].join(' — ');

  const body = isVisiteLibreReunion(formData.reunionType)
    ? (formData.visiteLibreHtml && formData.visiteLibreHtml !== '<p></p>' ? formData.visiteLibreHtml : '<p><em>Non renseigné</em></p>')
    : buildClassicWordBody(formData);

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head><meta charset="utf-8"><title>Compte-Rendu Lions Club</title></head>
<body>
  <h1 style="text-align:center;text-transform:uppercase;">Compte-Rendu de ${escapeHtml(developed)}</h1>
  <p style="text-align:center;"><strong>du ${escapeHtml(titleDate)}</strong></p>
  <p style="text-align:center;">Lieu : ${escapeHtml(location)}</p>
  ${participants ? `<p><strong>Présents :</strong> ${escapeHtml(participants)}</p>` : ''}
  <p><strong>Début :</strong> ${escapeHtml(formData.startTime || 'Non renseigné')}</p>
  <hr/>
  ${body}
  <hr/>
  <p><strong>Fin de séance :</strong> ${escapeHtml(formData.endTime || 'Non renseigné')}</p>
  <p><strong>Club :</strong> ${escapeHtml(formData.clubName || 'Non renseigné')}</p>
</body>
</html>`;
}

function sanitizeExportName(name) {
  return String(name || 'rapport')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'rapport';
}

/**
 * Exporte le formulaire CR V1 en document Word (.doc, HTML compatible Word).
 */
export function exportMultiPageWord(formData) {
  const html = buildWordDocumentHtml(formData);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const baseName = sanitizeExportName(formData.clubName || 'rapport');
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `Rapport_Lions_${baseName}.doc`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
