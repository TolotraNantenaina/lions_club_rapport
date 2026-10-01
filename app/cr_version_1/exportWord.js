'use client';

import { getReunionDevelopedLabel, isVisiteLibreReunion } from '../../lib/reunionTypes';
import { getCurrencySymbol } from '../../lib/treasuryCurrency';
import { formatDate } from '../helpers/formatDate';
import { buildExportFileBaseNameFromFormData } from '../../lib/buildExportFileBaseName';

const FONT_STACK = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
const COLOR_PRIMARY = '#173d68';
const COLOR_BODY = '#0f172a';
const COLOR_MUTED = '#475569';

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatTime(time) {
  if (!time) return '';
  return time.replace(':', 'h');
}

function resolveAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
    return path;
  }
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

async function imageUrlToBase64(url) {
  if (!url) return null;
  try {
    const res = await fetch(url, { credentials: 'same-origin' });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(typeof reader.result === 'string' ? reader.result : null);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

async function loadWordLogos(formData) {
  const lions = await imageUrlToBase64(resolveAssetUrl('/ico_lions_club.png'));
  const club = formData.clubLogoUrl
    ? await imageUrlToBase64(resolveAssetUrl(formData.clubLogoUrl))
    : null;
  return { lions, club };
}

function wordStylesBlock() {
  return `
<style>
  @page { size: A4; margin: 2cm; }
  body, p, li, td, th, div, span {
    font-family: ${FONT_STACK};
    color: ${COLOR_BODY};
  }
  body {
    font-size: 11pt;
    line-height: 1.35;
    margin: 0;
  }
  .cr-section-title {
    font-family: ${FONT_STACK};
    font-size: 16.5pt;
    font-weight: 900;
    margin: 12pt 0 4pt;
    color: ${COLOR_BODY};
  }
  .cr-subtitle {
    font-family: ${FONT_STACK};
    font-size: 15pt;
    font-weight: 700;
    margin: 6pt 0 2pt;
  }
  .cr-bullet {
    font-family: ${FONT_STACK};
    font-size: 11pt;
    margin: 0 0 4pt 28pt;
    line-height: 1.35;
  }
  .cr-label-line {
    font-family: ${FONT_STACK};
    font-size: 11pt;
    margin: 0 0 4pt 28pt;
  }
  .cr-empty {
    font-family: ${FONT_STACK};
    font-size: 11pt;
    color: #94a3b8;
    font-style: italic;
    margin: 0 0 4pt 22pt;
  }
  .cr-rich {
    font-family: ${FONT_STACK};
    font-size: 11pt;
    line-height: 1.35;
    padding-left: 22pt;
  }
  .cr-rich img { max-width: 100%; height: auto; }
  .cr-rich table { border-collapse: collapse; width: 100%; }
  .cr-rich td, .cr-rich th { border: 1px solid #cbd5e1; padding: 4pt 6pt; font-family: ${FONT_STACK}; }
</style>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->`;
}

function linesToWordHtml(value) {
  if (!value || !String(value).trim()) {
    return '<p class="cr-empty">Non renseigné</p>';
  }
  return String(value)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => `<p class="cr-bullet"><span>•</span> ${escapeHtml(line)}</p>`)
    .join('');
}

function sectionTitleHtml(title) {
  return `<h3 class="cr-section-title" style="font-family:${FONT_STACK};font-size:16.5pt;font-weight:900;color:${COLOR_BODY};">${escapeHtml(title)}</h3>`;
}

function subTitleHtml(title) {
  return `<p class="cr-subtitle" style="font-family:${FONT_STACK};font-size:15pt;font-weight:700;">${escapeHtml(title)}</p>`;
}

function labelLineHtml(label, value) {
  return `<p class="cr-label-line" style="font-family:${FONT_STACK};"><span>•</span> <strong>${escapeHtml(label)} :</strong> ${escapeHtml(value)}</p>`;
}

async function inlineImagesInHtml(html) {
  if (!html || typeof document === 'undefined') return html;
  const wrapper = document.createElement('div');
  wrapper.innerHTML = html;
  const imgs = wrapper.querySelectorAll('img');
  await Promise.all([...imgs].map(async (img) => {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) return;
    const b64 = await imageUrlToBase64(resolveAssetUrl(src));
    if (b64) img.setAttribute('src', b64);
  }));
  return wrapper.innerHTML;
}

async function prepareRichHtmlForWord(html) {
  if (!html || !html.trim()) return '<p class="cr-empty">Non renseigné</p>';
  const withImages = await inlineImagesInHtml(html);
  return `<div class="cr-rich" style="font-family:${FONT_STACK};font-size:11pt;line-height:1.35;">${withImages}</div>`;
}

function buildWordHeaderHtml(formData, logos) {
  const clubType = (formData.clubType || '').toUpperCase() === 'LEO' ? 'LEO' : 'LIONS';
  const clubName = escapeHtml(formData.clubName || '<--clubName non renseigné -->');
  const region = escapeHtml(formData.region || '<--region non renseigné -->');
  const zone = escapeHtml(formData.zone || '<--zone non renseigné -->');
  const num = escapeHtml(formData.numeroAffiliation || '<--numeroAffiliation non renseigné-->');

  const lionsCell = logos.lions
    ? `<img src="${logos.lions}" alt="Logo Lions Club" width="130" height="130" style="width:130px;height:130px;" />`
    : '<span style="font-size:10pt;">Lions</span>';

  let clubCell;
  if (logos.club) {
    clubCell = `<img src="${logos.club}" alt="Logo Club" height="130" style="height:130px;width:auto;" />`;
  } else {
    clubCell = '<div style="width:90px;height:90px;border:2px dashed #1a3a52;text-align:center;line-height:90px;font-weight:700;color:#173d68;">logo</div>';
  }

  return `
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18pt;font-family:${FONT_STACK};">
  <tr>
    <td width="130" align="center" valign="top">${lionsCell}</td>
    <td align="center" valign="top">
      <p style="margin:0;font-family:${FONT_STACK};font-size:27pt;font-weight:900;letter-spacing:0.05em;color:${COLOR_PRIMARY};">${clubType} CLUB</p>
      <p style="margin:4pt 0 0;font-family:${FONT_STACK};font-size:24pt;font-weight:900;letter-spacing:0.05em;color:${COLOR_PRIMARY};">${clubName}</p>
      <p style="margin:6pt 0 0;font-family:${FONT_STACK};font-size:14pt;font-weight:600;color:${COLOR_PRIMARY};">DISTRICT 417 – ${region} - ${zone}</p>
      <p style="margin:6pt 0 0;font-family:${FONT_STACK};font-size:12pt;color:${COLOR_MUTED};">N° Club : ${num}</p>
    </td>
    <td width="130" align="center" valign="top">${clubCell}</td>
  </tr>
</table>`;
}

function buildIntroHtml(formData) {
  const developed = getReunionDevelopedLabel(formData.reunionType);
  const titleDate = formData.meetingDate ? formatDate(formData.meetingDate) : 'date non renseignée';
  const location = formData.location || 'Non renseigné';
  const startTime = formatTime(formData.startTime) || 'Non renseigné';
  const participants = isVisiteLibreReunion(formData.reunionType)
    ? ''
    : [
      `${formData.memberPresent || '0'} présents`,
      `${formData.memberExcused || '0'} excusés`,
      `${formData.memberAbsent || '0'} absents`,
      `${formData.guests || '0'} invités`,
      `${formData.memberTotal || '0'} membres au total`,
    ].join(' - ');

  const locDisplay = location.charAt(0).toUpperCase() + location.slice(1);

  return `
<div style="text-align:center;margin-bottom:12pt;font-family:${FONT_STACK};">
  <p style="margin:0;font-family:${FONT_STACK};font-size:16.5pt;font-weight:900;text-transform:uppercase;color:${COLOR_BODY};">Compte-Rendu de ${escapeHtml(developed)}</p>
  <p style="margin:4pt 0 0;font-family:${FONT_STACK};font-size:15pt;font-weight:700;text-transform:uppercase;">du ${escapeHtml(titleDate)}</p>
  <p style="margin:6pt 0 0;font-family:${FONT_STACK};font-size:13.5pt;font-weight:600;">Lieu : ${escapeHtml(locDisplay)}</p>
</div>
${participants ? `<p style="font-family:${FONT_STACK};font-size:11pt;margin:0 0 8pt;"><strong>Présents :</strong> ${escapeHtml(participants)}</p>` : ''}
<p style="font-family:${FONT_STACK};font-size:11pt;font-weight:700;margin:0 0 12pt;">Début de la réunion : ${escapeHtml(startTime)}</p>`;
}

async function buildClassicWordBody(formData) {
  const sym = getCurrencySymbol(formData.treasuryCurrency);
  const money = (v) => {
    if (!v) return 'Non renseigné';
    return sym ? `${v} ${sym}` : String(v);
  };

  const parts = [
    sectionTitleHtml('1/ Mot éventuel du président') + linesToWordHtml(formData.presidentWord),
    sectionTitleHtml("2/ Rappel de l'ordre du jour") + linesToWordHtml(formData.orderOfDay),
    sectionTitleHtml('3/ Approbation du compte-rendu') + linesToWordHtml(formData.approvalPV),
    sectionTitleHtml('4/ Secrétariat')
      + subTitleHtml('Courriers reçus') + linesToWordHtml(formData.receivedMails)
      + subTitleHtml('Courriers envoyés') + linesToWordHtml(formData.sentMails),
    sectionTitleHtml('5/ Trésorerie')
      + labelLineHtml('Solde compte administratif', money(formData.adminBalance))
      + labelLineHtml('Solde compte œuvre', money(formData.worksBalance))
      + labelLineHtml('Cotisation Siège', money(formData.headQuartersFees))
      + labelLineHtml('Cotisation District', money(formData.districtFees))
      + labelLineHtml('Cotisation Région', money(formData.regionFees))
      + linesToWordHtml(formData.treasuryOther),
    sectionTitleHtml('6/ Commissions et actions')
      + subTitleHtml('POINT EME (Effectif)') + linesToWordHtml(formData.pointEME)
      + subTitleHtml('POINT EML (Formation)') + linesToWordHtml(formData.pointEML)
      + subTitleHtml('POINT EMS (Service-Oeuvres)') + linesToWordHtml(formData.pointEMS)
      + subTitleHtml('Actions en cours') + linesToWordHtml(formData.ongoingActions)
      + subTitleHtml('Point Marketing et Communication') + linesToWordHtml(formData.marketing),
    sectionTitleHtml('7/ Autres points')
      + subTitleHtml('Point LCIF') + linesToWordHtml(formData.pointLCIF)
      + subTitleHtml('Interventions LEO') + linesToWordHtml(formData.interventionsLeo)
      + subTitleHtml('Programme du mois') + linesToWordHtml(formData.monthProgram)
      + subTitleHtml('Divers')
      + await prepareRichHtmlForWord(
        formData.miscellaneous && formData.miscellaneous !== '<p></p>' ? formData.miscellaneous : '',
      ),
  ];

  return parts.join('');
}

function buildFooterHtml(formData) {
  const endTime = formatTime(formData.endTime) || 'Non renseigné';
  const meetingDate = formData.meetingDate
    ? new Date(formData.meetingDate).toLocaleDateString('fr-FR')
    : 'Non renseigné';
  const location = formData.location || 'Non renseigné';
  const locDisplay = location.charAt(0).toUpperCase() + location.slice(1);
  const president = escapeHtml(formData.president || '');
  const vicePresident = escapeHtml(formData.vicePresident || '');
  const secretary = escapeHtml(formData.secretary || '');

  const presBlock = president
    ? `<p style="font-weight:900;margin:0;">Le Président</p><p style="font-weight:700;margin:0;">${president}</p>`
    : vicePresident
      ? `<p style="font-weight:900;margin:0;">Le Vice-Président</p><p style="font-weight:700;margin:0;">${vicePresident}</p>`
      : '<p style="font-weight:900;margin:0;">Le Président</p><p style="font-weight:700;margin:0;">Nom à renseigner</p>';

  const secBlock = secretary
    ? `<p style="font-weight:900;margin:0;">La secrétaire</p><p style="font-weight:700;margin:0;">${secretary}</p>`
    : '<p style="font-weight:900;margin:0;">La secrétaire</p><p style="font-weight:700;margin:0;">Nom à renseigner</p>';

  return `
<hr style="border:none;border-top:1px solid #e2e8f0;margin:18pt 0;" />
<p style="font-family:${FONT_STACK};font-size:11pt;font-weight:700;margin:0 0 12pt;">
  <span>Fin de séance : ${escapeHtml(endTime)}</span>
  &nbsp;&nbsp;&nbsp;
  <span>${escapeHtml(locDisplay)} le ${escapeHtml(meetingDate)}</span>
</p>
<table width="100%" cellpadding="0" cellspacing="0"><tr>
  <td width="50%" valign="top" style="font-family:${FONT_STACK};font-size:11pt;">${presBlock}<p style="margin-top:18pt;height:45pt;">&nbsp;</p></td>
  <td width="50%" valign="top" style="font-family:${FONT_STACK};font-size:11pt;">${secBlock}<p style="margin-top:18pt;height:45pt;">&nbsp;</p></td>
</tr></table>`;
}

async function buildWordDocumentHtml(formData) {
  const logos = await loadWordLogos(formData);

  const body = isVisiteLibreReunion(formData.reunionType)
    ? await prepareRichHtmlForWord(
      formData.visiteLibreHtml && formData.visiteLibreHtml !== '<p></p>' ? formData.visiteLibreHtml : '',
    )
    : await buildClassicWordBody(formData);

  return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word">
<head>
<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<meta name="Generator" content="Microsoft Word">
<title>Compte-Rendu Lions Club</title>
${wordStylesBlock()}
</head>
<body style="font-family:${FONT_STACK};font-size:11pt;color:${COLOR_BODY};">
${buildWordHeaderHtml(formData, logos)}
${buildIntroHtml(formData)}
${body}
${buildFooterHtml(formData)}
</body>
</html>`;
}

/**
 * Exporte le formulaire CR V1 en document Word (.doc, HTML compatible Word).
 */
export async function exportMultiPageWord(formData) {
  const html = await buildWordDocumentHtml(formData);
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const baseName = buildExportFileBaseNameFromFormData(formData);
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.href = url;
  link.download = `${baseName}.doc`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
