'use client';

import { formatDate } from '../helpers/formatDate';
import { getCompteRenduTitle, isVisiteLibreReunion } from '../../lib/reunionTypes';
import { formatTreasuryAmount, isTreasuryEnabled } from '../../lib/treasuryCurrency';

/* ═══ A4 Page constants ═══════════════════════════════════ */
export const PAGE_WIDTH = 1240;
export const PAGE_HEIGHT = 1740;
export const PAGE_PADDING_X = 110;
export const PAGE_PADDING_Y = 70;
export const CONTENT_WIDTH = PAGE_WIDTH - PAGE_PADDING_X * 2; // 1020px

/**
 * Estimated header height in px (logo 155px + gap + text + mb-12).
 * Used for available-height calculation during page splitting.
 */
export const HEADER_HEIGHT = 320;

/** Remaining space for body content on each page */
export const BODY_HEIGHT = PAGE_HEIGHT - PAGE_PADDING_Y * 2 - HEADER_HEIGHT; // ~1020px

/** Safety margin from bottom of page */
export const SAFE_BOTTOM_MARGIN = 60;

/* ═══ Inline page styles (for html2canvas compatibility) ═ */
const PAGE_INLINE_STYLE = {
  width: `${PAGE_WIDTH}px`,
  height: `${PAGE_HEIGHT}px`,
  overflow: 'hidden',
  background: '#ffffff',
  padding: `${PAGE_PADDING_Y}px ${PAGE_PADDING_X}px`,
  boxSizing: 'border-box',
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  fontSize: '26px',
  lineHeight: '1.35',
  color: '#0f172a',
};

/* ═══ Helpers ══════════════════════════════════════════════ */

function valueOrDash(value) {
  return value || 'Non renseigné';
}

function formatTime(time) {
  if (!time) return '';
  return time.replace(':', 'h');
}

function toLines(value) {
  return value
    ? value.split('\n').map((line) => line.trim()).filter(Boolean)
    : [];
}

function splitLongLine(line, maxLength = 280) {
  if (line.length <= maxLength) return [line];
  const chunks = [];
  let remaining = line;
  while (remaining.length > maxLength) {
    const splitIndex = remaining.lastIndexOf(' ', maxLength);
    const safeIndex = splitIndex > 0 ? splitIndex : maxLength;
    chunks.push(remaining.slice(0, safeIndex).trim());
    remaining = remaining.slice(safeIndex).trim();
  }
  if (remaining) chunks.push(remaining);
  return chunks;
}

/* ═══ Header ═══════════════════════════════════════════════ */

function HeaderCR({ clubName, clubType, numeroAffiliation, clubLogoUrl, region, zone }) {
  return (
    <header style={{ marginBottom: '24px', display: 'grid', gridTemplateColumns: '120px 1fr 120px', gap: '20px', textAlign: 'center', alignItems: 'start' }}>
      <div style={{ margin: '0 auto', display: 'flex', width: '130px', height: '130px', alignItems: 'center', justifyContent: 'center' }}>
        <img src="/ico_lions_club.png" alt="Logo Lions Club" style={{ width: '130px', height: '130px' }} />
      </div>
      <div>
        <h1 style={{ fontSize: '36px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '0.05em', color: '#173d68', margin: 0 }}>
          {clubType === 'LEO' ? 'LEO' : 'LIONS'} CLUB
        </h1>
        <h2 style={{ fontSize: '32px', fontWeight: 900, lineHeight: 1.1, letterSpacing: '0.05em', color: '#173d68', margin: '4px 0 0' }}>
          {clubName || '<--clubName non renseigné -->'}
        </h2>
        <p style={{ marginTop: '6px', fontSize: '19px', fontWeight: 600, color: '#173d68' }}>
          DISTRICT 417 – {region || '<--region non renseigné -->'} - {zone || '<--zone non renseigné -->'}
        </p>
        <p style={{ marginTop: '6px', fontSize: '16px', color: '#475569' }}>
          N° Club : {numeroAffiliation || '<--numeroAffiliation non renseigné-->'}
        </p>
      </div>
      <div style={{
        margin: '0 auto', display: 'flex', width: '130px', height: '130px', alignItems: 'center', justifyContent: 'center',
        ...(clubLogoUrl ? { background: 'transparent' } : { background: 'linear-gradient(to bottom, #f1f5f9, #bae6fd)', padding: '10px', fontSize: '15px', fontWeight: 700, color: '#173d68' }),
      }}>
        {clubLogoUrl ? (
          <img src={clubLogoUrl} alt="Logo Club" style={{ height: '130px', width: 'auto', marginRight: '20px' }} />
        ) : (
          <div style={{ width: '90px', height: '90px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #1a3a52' }}>logo</div>
        )}
      </div>
    </header>
  );
}

/* ═══ Block renderers (inline styles for html2canvas) ════ */

function SectionTitle({ title }) {
  return <h3 style={{ marginBottom: '4px', marginTop: '12px', fontSize: '22px', fontWeight: 900 }}>{title}</h3>;
}

function SubTitle({ title }) {
  return <p style={{ marginBottom: '2px', marginTop: '6px', fontSize: '20px', fontWeight: 700 }}>{title}</p>;
}

function BulletItem({ text }) {
  return (
    <p style={{ marginLeft: '36px', fontSize: '20px', lineHeight: 1.35 }}>
      <span style={{ marginRight: '8px' }}>•</span>{text}
    </p>
  );
}

function ContinuationItem({ text }) {
  return <p style={{ marginLeft: '60px', fontSize: '20px', lineHeight: 1.35 }}>{text}</p>;
}

function LabelLine({ label, value }) {
  return (
    <p style={{ marginLeft: '36px', fontSize: '20px', lineHeight: 1.35 }}>
      <span style={{ marginRight: '8px' }}>•</span>
      <span style={{ fontWeight: 700 }}>{label} :</span> {value}
    </p>
  );
}

function EmptyBlock() {
  return <p style={{ paddingLeft: '28px', fontSize: '20px', color: '#94a3b8' }}>Non renseigné</p>;
}

function SignatureBlock({ title, name }) {
  return (
    <div>
      <p style={{ fontWeight: 900 }}>{title}</p>
      <p style={{ fontWeight: 700 }}>{name}</p>
      <div style={{ marginTop: '24px', height: '60px', width: '140px' }} />
    </div>
  );
}

/* ═══ Block builders ═══════════════════════════════════════ */

function buildBulletBlocks(value) {
  const lines = toLines(value);
  if (lines.length === 0) return [{ type: 'empty' }];
  return lines.flatMap((line) =>
    splitLongLine(line).map((text, index) => ({
      type: index === 0 ? 'bullet' : 'continuation',
      text,
    }))
  );
}

function buildTextSection(title, value) {
  return [{ type: 'sectionTitle', title }, ...buildBulletBlocks(value)];
}

function buildGroupedSection(title, groups) {
  return [
    { type: 'sectionTitle', title },
    ...groups.flatMap((group) => [
      { type: 'subTitle', title: group.title },
      ...buildBulletBlocks(group.value),
    ]),
  ];
}

/** Numérote les sections visibles (« 1/ … ») — la trésorerie peut être masquée */
function createSectionNumberer() {
  let current = 0;
  return (title) => {
    current += 1;
    return `${current}/ ${title}`;
  };
}

function getVisiteLibrePreviewBlocks(data) {
  const titleDate = data.meetingDate ? formatDate(data.meetingDate) : 'date non renseignée';
  const html = data.visiteLibreHtml || '';
  const hasHtml = html && html !== '<p></p>' && html.trim() !== '';

  return [
    {
      type: 'intro',
      title: getCompteRenduTitle(data.reunionType, titleDate),
      location: valueOrDash(data.location),
      participants: '',
      startTime: formatTime(data.startTime) || 'Non renseigné',
      hideParticipants: true,
    },
    ...(hasHtml
      ? [{ type: 'htmlBlock', html }]
      : [{ type: 'empty' }]),
    {
      type: 'footer',
      endTime: formatTime(data.endTime) || 'Non renseigné',
      meetingDate: data.meetingDate ? new Date(data.meetingDate).toLocaleDateString('fr-FR') : 'Non renseigné',
    },
  ];
}

/**
 * Build ordered blocks from form data.
 * The "Divers" TipTap HTML is emitted as an htmlBlock.
 */
export function getPreviewCRBlocks(data) {
  if (isVisiteLibreReunion(data.reunionType)) {
    return getVisiteLibrePreviewBlocks(data);
  }

  const titleDate = data.meetingDate ? formatDate(data.meetingDate) : 'date non renseignée';
  const currency = data.treasuryCurrency;
  const numbered = createSectionNumberer();
  const participants = [
    `${valueOrDash(data.memberPresent)} présents`,
    `${valueOrDash(data.memberExcused)} excusés`,
    `${valueOrDash(data.memberAbsent)} absents`,
    `${valueOrDash(data.guests)} invités`,
    `${valueOrDash(data.memberTotal)} membres au total`,
  ].join(' - ');
  // Comptes locaux : devise ; cotisations instances : texte libre (sans devise)
  const treasuryLocalItems = [
    ['Solde compte administratif', data.adminBalance],
    ['Solde compte œuvre', data.worksBalance],
  ];
  const treasuryFeeItems = [
    ['Cotisation Siège', data.headQuartersFees],
    ['Cotisation District', data.districtFees],
    ['Cotisation Région', data.regionFees],
  ];
  // Appelé à sa place dans la liste : le numéro suit celui de « Secrétariat »
  const buildTreasuryBlocks = () => (isTreasuryEnabled(data)
    ? [
        { type: 'sectionTitle', title: numbered('Trésorerie') },
        ...treasuryLocalItems.map(([label, value]) => ({ type: 'labelLine', label, value: valueOrDash(formatTreasuryAmount(value, currency)) })),
        ...treasuryFeeItems.map(([label, value]) => ({ type: 'labelLine', label, value: valueOrDash(value) })),
        ...buildBulletBlocks(data.treasuryOther),
      ]
    : []);
  const lcifBlocks = data.lcifEnabled === 'OUI'
    ? [{ type: 'subTitle', title: 'Point LCIF' }, ...buildBulletBlocks(data.pointLCIF)]
    : [];
  const interventionsLeoBlocks = data.interventionsLeoEnabled === 'OUI'
    ? [{ type: 'subTitle', title: 'Interventions LEO' }, ...buildBulletBlocks(data.interventionsLeo)]
    : [];

  const miscellaneousHtml = data.miscellaneous || '';
  const hasMiscHtml = miscellaneousHtml && miscellaneousHtml !== '<p></p>' && miscellaneousHtml.trim() !== '';

  return [
    {
      type: 'intro',
      title: getCompteRenduTitle(data.reunionType, titleDate),
      location: valueOrDash(data.location),
      participants,
      startTime: formatTime(data.startTime) || 'Non renseigné',
    },
    ...buildTextSection(numbered('Mot éventuel du président'), data.presidentWord),
    ...buildTextSection(numbered("Rappel de l'ordre du jour"), data.orderOfDay),
    ...buildTextSection(numbered('Approbation du compte-rendu'), data.approvalPV),
    ...buildTextSection(numbered('Communications du Président'), data.presidentCommunications),
    ...buildGroupedSection(numbered('Secrétariat'), [
      { title: 'Courriers reçus', value: data.receivedMails },
      { title: 'Courriers envoyés', value: data.sentMails },
    ]),
    ...buildTreasuryBlocks(),
    ...buildGroupedSection(numbered('Commissions et actions'), [
      { title: 'POINT EME (Effectif)', value: data.pointEME },
      { title: 'POINT EML (Formation)', value: data.pointEML },
      { title: 'POINT EMS (Service-Oeuvres)', value: data.pointEMS },
      { title: 'Actions en cours', value: data.ongoingActions },
      { title: 'Point Marketing et Communication', value: data.marketing },
    ]),
    { type: 'sectionTitle', title: numbered('Autres points') },
    ...lcifBlocks,
    ...interventionsLeoBlocks,
    { type: 'subTitle', title: 'Programme du mois' },
    ...buildBulletBlocks(data.monthProgram),
    ...(hasMiscHtml
      ? [
          { type: 'subTitle', title: 'Divers' },
          { type: 'htmlBlock', html: miscellaneousHtml },
        ]
      : [
          { type: 'subTitle', title: 'Divers' },
          { type: 'empty' },
        ]),
    {
      type: 'footer',
      endTime: formatTime(data.endTime) || 'Non renseigné',
      meetingDate: data.meetingDate ? new Date(data.meetingDate).toLocaleDateString('fr-FR') : 'Non renseigné',
    },
  ];
}

/* ═══ Block renderer ═══════════════════════════════════════ */

function CRBlock({ block, president, vicePresident, secretary, location }) {
  if (block.type === 'intro') {
    return (
      <>
        <div style={{ marginBottom: '12px', textAlign: 'center' }}>
          <h2 style={{ fontSize: '22px', fontWeight: 900, margin: 0 }}>
            {block.title}
          </h2>
          <p style={{ marginTop: '6px', fontSize: '18px', fontWeight: 600 }}>
            Lieu : {location ? location.charAt(0).toUpperCase() + location.slice(1) : '<--Lieu non renseigné -->'}
          </p>
        </div>
        {!block.hideParticipants && (
          <p style={{ marginBottom: '8px', fontSize: '20px' }}>
            <span style={{ fontWeight: 900 }}>Présents :</span> {block.participants}
          </p>
        )}
        <p style={{ marginBottom: '12px', fontSize: '20px', fontWeight: 700 }}>Début de la réunion : {block.startTime}</p>
      </>
    );
  }

  if (block.type === 'sectionTitle') return <SectionTitle title={block.title} />;
  if (block.type === 'subTitle') return <SubTitle title={block.title} />;
  if (block.type === 'labelLine') return <LabelLine label={block.label} value={block.value} />;
  if (block.type === 'bullet') return <BulletItem text={block.text} />;
  if (block.type === 'continuation') return <ContinuationItem text={block.text} />;
  if (block.type === 'empty') return <EmptyBlock />;

  if (block.type === 'htmlBlock') {
    return (
      <div style={{ paddingLeft: '28px', fontSize: '20px', lineHeight: 1.35 }} className="tiptap-preview-divers">
        <div dangerouslySetInnerHTML={{ __html: block.html }} />
      </div>
    );
  }

  if (block.type === 'footer') {
    return (
      <footer style={{ marginTop: '20px', fontSize: '20px' }}>
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', fontWeight: 700 }}>
          <p>Fin de séance : {block.endTime}</p>
          <p>{location ? location.charAt(0).toUpperCase() + location.slice(1) : '<--Lieu non renseigné -->'} le {block.meetingDate}</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px' }}>
          {president
            ? <SignatureBlock title="Président" name={president} />
            : (vicePresident
              ? <SignatureBlock title="Vice-Président" name={vicePresident} />
              : <SignatureBlock title="Président" name="Nom à renseigner" />)
          }
          <SignatureBlock title="Secrétaire" name={secretary || 'Nom à renseigner'} />
        </div>
      </footer>
    );
  }

  return null;
}

/* ═══ Page component ═══════════════════════════════════════ */

export function PreviewCRPage({ blocks, pageNumber, headerData = {} }) {
  return (
    <article style={PAGE_INLINE_STYLE}>
      <div data-preview-flow="true">
        <HeaderCR
          clubName={headerData.clubName}
          clubType={headerData.clubType}
          numeroAffiliation={headerData.numeroAffiliation}
          clubLogoUrl={headerData.clubLogoUrl}
          region={headerData.region}
          zone={headerData.zone}
        />
        <div>
          {blocks.map((block, index) => (
            <CRBlock
              key={`${block.type}-${block.title || block.label || block.text || index}`}
              block={block}
              president={headerData.president}
              vicePresident={headerData.vicePresident}
              secretary={headerData.secretary}
              location={headerData.location}
            />
          ))}
        </div>
      </div>
    </article>
  );
}
