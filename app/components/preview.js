import { DataRow } from './dataRow';
import { FormField } from './formField';
import { SectionHeading } from './sectionHeading';
import { TextareaField } from './textareaField';
import { formatDate } from '../helpers/formatDate';

export const PAGE_WIDTH = 1240;
export const PAGE_HEIGHT = 1740;
export const PAGE_BOTTOM_SAFE_SPACE = 200;

const pageClassName = 'h-[1740px] w-[1240px] overflow-hidden bg-white px-[110px] py-[70px] text-[26px] leading-snug text-slate-950';

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

function splitLongLine(line, maxLength = 320) {
    if (line.length <= maxLength) return [line];

    const chunks = [];
    let remaining = line;

    while (remaining.length > maxLength) {
        const splitIndex = remaining.lastIndexOf(' ', maxLength);
        const safeIndex = splitIndex > 0 ? splitIndex : maxLength;

        chunks.push(remaining.slice(0, safeIndex).trim());
        remaining = remaining.slice(safeIndex).trim();
    }

    if (remaining) {
        chunks.push(remaining);
    }

    return chunks;
}

function HeaderCR({ clubName, numeroAffiliation, clubLogoUrl, region, zone }) {
    return (
        <header className="mb-12 grid grid-cols-[120px_1fr_120px] items-start gap-6 text-center">
            <div className="mx-auto flex h-[155px] w-[155px] items-center justify-center">
                <img src="/ico_lions_club.png" alt="Logo Lions Club" className="h-[155px] w-[155px]" />
            </div>
            <div>
                <h1 className="text-[42px] font-black leading-tight tracking-wide text-[#173d68]">LIONS CLUB</h1>
                <h2 className="text-[38px] font-black leading-tight tracking-wide text-[#173d68]">{clubName || '<--clubName non renseigné -->'}</h2>
                <p className="mt-2 text-[22px] font-semibold text-[#173d68]">DISTRICT 417 – {region || '<--region non renseigné -->'} - {zone || '<--zone non renseigné -->'}</p>
                <p className="mt-3 text-[18px] text-slate-700">{/*Date de remise de la charte : {'<--dateOfCharter non renseigné-->'} - */}N° Club : { numeroAffiliation || '<--numeroAffiliation non renseigné-->'}</p>
            </div>
            <div className={`mx-auto flex h-[155px] w-[155px] items-center justify-center ${clubLogoUrl ? 'bg-transparent' : 'bg-gradient-to-b from-slate-100 to-sky-200 px-3 py-4 text-[18px] font-bold leading-tight text-[#173d68]'}`}>
                {clubLogoUrl ? <img src={clubLogoUrl} alt="Logo Lions Club" className="h-[155px] w-auto mr-8" /> : 
                <div className="flex h-[105px] w-[105px] items-center justify-center border-2 border-dashed border-primary">
                    {'logo non renseigné'}
                </div>}
            </div>
        </header>
    );
}

function TextBlock({ title, children }) {
    return (
        <section className="mb-9">
            <h3 className="mb-2 text-[23px] font-black">{title}</h3>
            <div className="space-y-2 text-[21px] leading-snug">{children}</div>
        </section>
    );
}

function BulletList({ value }) {
    const lines = toLines(value);

    if (lines.length === 0) {
        return <p className="pl-8 text-slate-500">Non renseigné</p>;
    }

    return (
        <ul className="ml-10 list-disc space-y-2">
            {lines.map((line, index) => (
                <li key={`${line}-${index}`}>{line}</li>
            ))}
        </ul>
    );
}

function SignatureBlock({ title, name }) {
    return (
        <div>
            <p className="font-black">{title}</p>
            <p className="font-bold">{name}</p>
            <div className="mt-7 h-[70px] w-[160px]" />
        </div>
    );
}

function buildBulletBlocks(value) {
    const lines = toLines(value);

    if (lines.length === 0) {
        return [{ type: 'empty' }];
    }

    return lines.flatMap((line) => {
        return splitLongLine(line).map((text, index) => ({
            type: index === 0 ? 'bullet' : 'continuation',
            text,
        }));
    });
}

function buildTextSection(title, value) {
    return [
        { type: 'sectionTitle', title },
        ...buildBulletBlocks(value),
    ];
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

export function getPreviewCRBlocks(data) {
    const titleDate = data.meetingDate ? formatDate(data.meetingDate) : 'date non renseignée';
    const participants = [
        `${valueOrDash(data.memberPresent)} présents`,
        `${valueOrDash(data.memberExcused)} excusés`,
        `${valueOrDash(data.memberAbsent)} absents`,
        `${valueOrDash(data.guests)} invités`,
        `${valueOrDash(data.memberTotal)} membres au total`,
    ].join(' - ');
    const treasuryItems = [
        ['Solde compte administratif', data.adminBalance],
        ['Solde compte œuvre', data.worksBalance],
        ['Cotisation Siège', data.headQuartersFees],
        ['Cotisation District', data.districtFees],
        ['Cotisation Région', data.regionFees],
    ];

    return [
        {
            type: 'intro',
            reunionType: valueOrDash(data.reunionType),
            titleDate,
            location: valueOrDash(data.location),
            participants,
            startTime: formatTime(data.startTime) || 'Non renseigné',
        },
        ...buildTextSection('1/ Mot éventuel du président', data.presidentWord),
        ...buildTextSection('2/ Rappel de l’ordre du jour', data.orderOfDay),
        ...buildTextSection('3/ Approbation du compte-rendu de réunion statutaire', data.approvalPV),
        ...buildGroupedSection('4/ Secrétariat', [
            { title: 'Courriers reçus', value: data.receivedMails },
            { title: 'Courriers envoyés', value: data.sentMails },
        ]),
        { type: 'sectionTitle', title: '5/ Trésorerie' },
        ...treasuryItems.map(([label, value]) => ({ type: 'labelLine', label, value: valueOrDash(value) })),
        ...buildBulletBlocks(data.treasuryOther),
        ...buildGroupedSection('6/ Commissions et actions', [
            { title: 'POINT EME (Effectif)', value: data.pointEME },
            { title: 'POINT EML (Formation)', value: data.pointEML },
            { title: 'POINT EMS (Service-Oeuvres)', value: data.pointEMS },
            { title: 'Actions en cours', value: data.ongoingActions },
            { title: 'Point LCIF', value: data.pointLCIF },
        ]),
        ...buildGroupedSection('7/ Divers et tour de table', [
            { title: 'Marketing et communication', value: data.marketing },
            { title: 'Programme du mois', value: data.monthProgram },
            { title: 'Divers', value: data.miscellaneous },
        ]),
        {
            type: 'footer',
            endTime: formatTime(data.endTime) || 'Non renseigné',
            meetingDate: data.meetingDate ? new Date(data.meetingDate).toLocaleDateString('fr-FR') : 'Non renseigné',
        },
    ];
}

function CRBlock({ block, president, vicePresident, secretary, location }) {
    if (block.type === 'intro') {
        return (
            <>
                <div className="mb-10 text-center">
                    <h2 className="text-[23px] font-black uppercase">Compte rendu de la réunion statutaire</h2>
                    <p className="text-[21px] font-bold uppercase">
                        {block.reunionType} du {block.titleDate}
                    </p>
                    <p className="mt-2 text-[20px] font-semibold">Lieu : {location ? location.charAt(0).toUpperCase() + location.slice(1) : '<--Lieu non renseigné -->'}</p>
                </div>

                <p className="mb-8 text-[21px]">
                    <span className="font-black">Présents :</span> {block.participants}
                </p>

                <p className="mb-10 text-[21px] font-bold">
                    Début de la réunion : {block.startTime}
                </p>
            </>
        );
    }

    if (block.type === 'sectionTitle') {
        return <h3 className="mb-2 mt-8 text-[23px] font-black">{block.title}</h3>;
    }

    if (block.type === 'subTitle') {
        return <p className="mb-1 mt-4 text-[21px] font-bold">{block.title}</p>;
    }

    if (block.type === 'labelLine') {
        return (
            <p className="ml-10 text-[21px] leading-snug">
                <span className="mr-3">•</span>
                <span className="font-bold">{block.label} :</span> {block.value}
            </p>
        );
    }

    if (block.type === 'bullet') {
        return (
            <p className="ml-10 text-[21px] leading-snug">
                <span className="mr-3">•</span>
                {block.text}
            </p>
        );
    }

    if (block.type === 'continuation') {
        return (
            <p className="ml-[72px] text-[21px] leading-snug">
                {block.text}
            </p>
        );
    }

    if (block.type === 'empty') {
        return <p className="pl-8 text-[21px] text-slate-500">Non renseigné</p>;
    }

    if (block.type === 'footer') {
        return (
            <footer className="mt-16 text-[21px]">
                <div className="mb-14 flex justify-between font-bold">
                    <p>Fin de séance : {block.endTime}</p>
                    <p>{location ? location.charAt(0).toUpperCase() + location.slice(1) : '<--Lieu non renseigné -->'} le {block.meetingDate}</p>
                </div>

                <div className="grid grid-cols-2 gap-28">
                    {president ? <SignatureBlock title="Le Président" name={president} /> : (vicePresident ? <SignatureBlock title="Le Vice-Président" name={vicePresident} /> : <SignatureBlock title="Le Président" name="Nom à renseigner" />)}
                    {secretary ? <SignatureBlock title="La secrétaire" name={secretary} /> : <SignatureBlock title="La secrétaire" name="Nom à renseigner" />}
                </div>
            </footer>
        );
    }

    return null;
}

export function PreviewCRPage({ blocks, pageNumber, headerData = {} }) {
    console.log(headerData);
    return (
        <article className={pageClassName}>
            <div data-preview-flow="true">
                <HeaderCR clubName={headerData.clubName} numeroAffiliation={headerData.numeroAffiliation} clubLogoUrl={headerData.clubLogoUrl} region={headerData.region} zone={headerData.zone} />
                <div className="space-y-1">
                    {blocks.map((block, index) => (
                        <CRBlock key={`${block.type}-${block.title || block.label || block.text || index}`} block={block} president={headerData.president} vicePresident={headerData.vicePresident} secretary={headerData.secretary} location={headerData.location} />
                    ))}
                </div>
                {/*<p className="mt-6 text-right text-[16px] text-slate-500">Page {pageNumber}</p>*/}
            </div>
        </article>
    );
}

/**
 * Affichage du formulaire de saisie des informations de la réunion
 * @param {data} data - Données de la réunion
 * @returns {React.ReactNode} - Composant de prévisualisation du formulaire de saisie des informations de la réunion
 *
export function PreviewP1({ data }) {

    return (
        <div className="bg-body min-h-screen px-5 py-2 text-slate-900 pt-4 pb-8" style={{ width: '1240px' }}>

            <header className="text-center text-white mb-7">
                <h1 className='text-[1.8rem] mb-2 font-bold tracking-tight sm:text-[2.5rem]'>🦁 Lions Club</h1>
                <p className='text-[1.1em]'>Compte-Rendu de Réunion Statutaire</p>
            </header>

            <div className="mx-auto grid gap-8">
                <div className="grid gap-8 min-w-[990px] mx-auto "> 
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📋 Informations de la réunion" />
                        <div className="grid gap-6 sm:grid-cols-1">
                            <FormField label="Réunion" htmlFor="reunionType">
                                <select
                                    id="reunionType"
                                    value={data.reunionType}
                                    className="form-input pt-[4px]"
                                    readOnly
                                >
                                    <option value="">-- Sélectionner --</option>
                                    <option value="AG">AG</option>
                                    <option value="AG EXTRA">AG EXTRA</option>
                                    <option value="CA">CA</option>
                                    <option value="CA EXTRA">CA EXTRA</option>
                                    <option value="AGM">AGM</option>
                                    <option value="AUTRE">AUTRE</option>
                                </select>
                            </FormField>
                        </div>
                        <div className="grid gap-6 sm:grid-cols-2">
                            <FormField label="Date de la réunion" htmlFor="meetingDate">
                                <input
                                    id="meetingDate"
                                    type="date"
                                    value={data.meetingDate}
                                    className="form-input pt-[4px]"
                                    readOnly
                                />
                            </FormField>
                            <FormField label="Lieu" htmlFor="location">
                                <input
                                    id="location"
                                    type="text"
                                    placeholder="Ex: Salle des conférences"
                                    value={data.location}
                                    className="form-input pt-[4px]"
                                    readOnly
                                />
                            </FormField>
                            <FormField label="Début de la réunion" htmlFor="startTime">
                                <input
                                    id="startTime"
                                    type="time"
                                    value={data.startTime}
                                    className="form-input pt-[4px]"
                                    readOnly
                                />
                            </FormField>
                            <FormField label="Fin de la réunion" htmlFor="endTime">
                                <input
                                    id="endTime"
                                    type="time"
                                    value={data.endTime}
                                    className="form-input pt-[4px]"
                                    readOnly
                                />
                            </FormField>
                        </div>
                    </section>
                </div>

                <div className="grid gap-8 min-w-[990px] mx-auto"> 
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="👥 Participants" />
                        <div className="grid gap-6 sm:grid-cols-2">
                            {['memberPresent', 'memberExcused', 'memberAbsent', 'guests'].map((field, index) => (
                                <FormField key={field} label={field === 'memberPresent' ? 'Membre présent' : field === 'memberExcused' ? 'Membre excusé' : field === 'memberAbsent' ? 'Membre absent' : 'Invité'} htmlFor={field}>
                                    <input
                                        id={field}
                                        type="number"
                                        min="0"
                                        value={data[field]}
                                        className="form-input pt-[4px]"
                                        readOnly
                                    />
                                </FormField>
                            ))}
                            <FormField label="Membre TOTAL" htmlFor="memberTotal" className="sm:col-span-2">
                                <input
                                    id="memberTotal"
                                    type="number"
                                    min="0"
                                    value={data.memberTotal}
                                    className="form-input pt-[4px]"
                                    readOnly
                                />
                            </FormField>
                        </div>
                    </section>
                </div>

                <div className="grid gap-8 min-w-[990px] mx-auto"> 
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="🎤 Interventions générales" />
                        <TextareaField label="Mot éventuel du président" placeholder="Entrez le mot du président..." htmlFor="presidentWord"
                            value={data.presidentWord} readOnly />
                        <TextareaField label="Rappel de l'ordre du jour" placeholder="Rappel de l'ordre du jour..." htmlFor="orderOfDay"
                            value={data.orderOfDay} readOnly />
                        <TextareaField label="Approbation du compte-rendu de réunion statutaire" placeholder="Approbation du compte-rendu..." htmlFor="approvalPV"
                            value={data.approvalPV} readOnly />
                    </section>
                </div>
            </div>
        </div>
    );
}

export function PreviewP2({ data }) {

    return (
        <div className="bg-body min-h-screen px-8 py-8 text-slate-900" style={{ width: '1240px' }}>
            <div className="mx-auto grid gap-8">
                <div className="grid gap-8 min-w-[990px] mx-auto "> 
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📬 Secrétariat" />
                        <TextareaField label="Courriers reçus" placeholder="Détail les courriers reçus..." htmlFor="receivedMails"
                            value={data.receivedMails} readOnly />
                        <TextareaField label="Courriers envoyés" placeholder="Détail les courriers envoyés..." htmlFor="sentMails"
                            value={data.sentMails} readOnly />
                    </section>
                </div>

                <div className="grid gap-8 min-w-[990px] mx-auto"> 
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="💰 Trésorerie" />
                        <div className="grid gap-6 sm:grid-cols-2">
                            <FormField label="Solde compte administratif" htmlFor="adminBalance">
                                <input
                                    id="adminBalance"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={data.adminBalance}
                                    readOnly
                                    className="form-input pt-[4px]"
                                />
                            </FormField>
                            <FormField label="Solde compte œuvre" htmlFor="worksBalance">
                                <input
                                    id="worksBalance"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={data.worksBalance}
                                    readOnly
                                    className="form-input pt-[4px]"
                                />
                            </FormField>
                            <FormField label="Cotisation Siège" htmlFor="headQuartersFees">
                                <input
                                    id="headQuartersFees"
                                    type="text"
                                    placeholder="Ex: 100€"
                                    value={data.headQuartersFees}
                                    readOnly
                                    className="form-input pt-[4px]"
                                />
                            </FormField>
                            <FormField label="Cotisation District" htmlFor="districtFees">
                                <input
                                    id="districtFees"
                                    type="text"
                                    placeholder="Ex: 50€"
                                    value={data.districtFees}
                                    readOnly
                                    className="form-input pt-[4px]"
                                />
                            </FormField>
                            <FormField label="Cotisation Région" htmlFor="regionFees">
                                <input
                                    id="regionFees"
                                    type="text"
                                    placeholder="Ex: 30€"
                                    value={data.regionFees}
                                    readOnly
                                    className="form-input pt-[4px]"
                                />
                            </FormField>
                        </div>
                        <TextareaField label="Autres points sur la trésorerie" placeholder="Autres informations de trésorerie..." htmlFor="treasuryOther"
                            value={data.treasuryOther} readOnly />
                    </section>
                </div>
            </div>
        </div>
    );
}

export function PreviewP3({ data }) {

    return (
        <div className="bg-body min-h-screen px-8 py-8 text-slate-900" style={{ width: '1240px' }}>
            <div className="mx-auto grid gap-8">


                <div className="grid gap-8 min-w-[990px] mx-auto"> 
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📊 Commissions" />
                        <TextareaField label="POINT EME (Effectif)" placeholder="Points sur l'effectif..." htmlFor="pointEME"
                            value={data.pointEME} readOnly />
                        <TextareaField label="POINT EML (Formation)" placeholder="Points sur la formation..." htmlFor="pointEML"
                            value={data.pointEML} readOnly />
                        <TextareaField label="POINT EMS (Service-Oeuvres)" placeholder="Points sur le service-oeuvres..." htmlFor="pointEMS"
                            value={data.pointEMS} readOnly />
                        <TextareaField label="Point sur les actions en cours (EMS)" placeholder="Action actuelle en cours..." htmlFor="ongoingActions"
                            value={data.ongoingActions} readOnly />
                        <TextareaField label="Point LCIF" placeholder="Informations sur le LCIF..." htmlFor="pointLCIF"
                            value={data.pointLCIF} readOnly />
                    </section>
                </div>

                <div className="grid gap-8 min-w-[990px] mx-auto "> 
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📢 Autres points" />
                        <TextareaField label="Point Marketing et Communication" placeholder="Informations marketing et communication..." htmlFor="marketing"
                            value={data.marketing} readOnly />
                        <TextareaField label="Programme du mois" placeholder="Programme du mois..." htmlFor="monthProgram"
                            value={data.monthProgram} readOnly />
                        <TextareaField label="Divers" placeholder="Autres diverses..." htmlFor="miscellaneous"
                            value={data.miscellaneous} readOnly />
                    </section>
                </div>
            </div>
        </div>
    );
}
*/