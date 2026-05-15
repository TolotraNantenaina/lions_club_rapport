import { DataRow } from './dataRow';
import { FormField } from './formField';
import { SectionHeading } from './sectionHeading';
import { TextareaField } from './textareaField';
import { formatDate } from '../helpers/formatDate';

const pageClassName = 'h-[1740px] w-[1240px] bg-white px-[110px] py-[70px] text-[26px] leading-snug text-slate-950';

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

function HeaderCR() {
    return (
        <header className="mb-12 grid grid-cols-[120px_1fr_120px] items-start gap-6 text-center">
            <div className="mx-auto flex h-[155px] w-[155px] items-center justify-center">
                <img src="/ico_lions_club.png" alt="Logo Lions Club" className="h-[155px] w-[155px]" />
            </div>
            <div>
                <h1 className="text-[42px] font-black leading-tight tracking-wide text-[#173d68]">LIONS CLUB</h1>
                <h2 className="text-[38px] font-black leading-tight tracking-wide text-[#173d68]">{'<--clubName non renseigné -->'}</h2>
                <p className="mt-2 text-[22px] font-semibold text-[#173d68]">{'<--districtName non renseigné -->'}</p>
                <p className="mt-3 text-[18px] text-slate-700">{'<--dateOfCharter non renseigné - clubNumber non renseigné -->'}</p>
            </div>
            <div className="mx-auto flex h-[155px] w-[155px] items-center justify-center bg-gradient-to-b from-slate-100 to-sky-200 px-3 py-4 text-[18px] font-bold leading-tight text-[#173d68]">
                <div className="flex h-[105px] w-[105px] items-center justify-center border-2 border-dashed border-primary">
                    {'logo non renseigné'}
                </div>
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

export function PreviewCRp1({ data }) {
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

    return (
        <article className={pageClassName}>
            <HeaderCR />

            <div className="mb-10 text-center">
                <h2 className="text-[23px] font-black uppercase">Compte rendu de la réunion statutaire</h2>
                <p className="text-[21px] font-bold uppercase">
                    {valueOrDash(data.reunionType)} du {titleDate}
                </p>
                <p className="mt-2 text-[20px] font-semibold">Lieu : {valueOrDash(data.location)}</p>
            </div>

            <p className="mb-8 text-[21px]">
                <span className="font-black">Présents :</span> {participants}
            </p>

            <p className="mb-10 text-[21px] font-bold">
                Début de la réunion : {formatTime(data.startTime) || 'Non renseigné'}
            </p>

            <TextBlock title="1/ Mot éventuel du président">
                <BulletList value={data.presidentWord} />
            </TextBlock>

            <TextBlock title="2/ Rappel de l’ordre du jour">
                <BulletList value={data.orderOfDay} />
            </TextBlock>

            <TextBlock title="3/ Approbation du compte-rendu de réunion statutaire">
                <BulletList value={data.approvalPV} />
            </TextBlock>

            <TextBlock title="4/ Secrétariat">
                <p className="font-bold">Courriers reçus</p>
                <BulletList value={data.receivedMails} />
                <p className="mt-4 font-bold">Courriers envoyés</p>
                <BulletList value={data.sentMails} />
            </TextBlock>

            <TextBlock title="5/ Trésorerie">
                <ul className="ml-10 list-disc space-y-2">
                    {treasuryItems.map(([label, value]) => (
                        <li key={label}>
                            <span className="font-bold">{label} :</span> {valueOrDash(value)}
                        </li>
                    ))}
                </ul>
                <div className="mt-4">
                    <BulletList value={data.treasuryOther} />
                </div>
            </TextBlock>

        </article>
    );
}

export function PreviewCRp2({ data }) {

    return (
        <article className={pageClassName}>
            <HeaderCR />

            <TextBlock title="6/ Commissions et actions">
                <p className="font-bold">POINT EME (Effectif)</p>
                <BulletList value={data.pointEME} />
                <p className="mt-4 font-bold">POINT EML (Formation)</p>
                <BulletList value={data.pointEML} />
                <p className="mt-4 font-bold">POINT EMS (Service-Oeuvres)</p>
                <BulletList value={data.pointEMS} />
                <p className="mt-4 font-bold">Actions en cours</p>
                <BulletList value={data.ongoingActions} />
                <p className="mt-4 font-bold">Point LCIF</p>
                <BulletList value={data.pointLCIF} />
            </TextBlock>

            <TextBlock title="7/ Divers et tour de table">
                <p className="font-bold">Marketing et communication</p>
                <BulletList value={data.marketing} />
                <p className="mt-4 font-bold">Programme du mois</p>
                <BulletList value={data.monthProgram} />
                <p className="mt-4 font-bold">Divers</p>
                <BulletList value={data.miscellaneous} />
            </TextBlock>

            <footer className="mt-16 text-[21px]">
                <div className="mb-14 flex justify-between font-bold">
                    <p>Fin de séance : {formatTime(data.endTime) || 'Non renseigné'}</p>
                    <p>Saint Denis le {data.meetingDate ? new Date(data.meetingDate).toLocaleDateString('fr-FR') : 'Non renseigné'}</p>
                </div>

                <div className="grid grid-cols-2 gap-28">
                    <SignatureBlock title="Le Président" name="Nom à renseigner" />
                    <SignatureBlock title="La secrétaire" name="Nom à renseigner" />
                </div>
            </footer>
        </article>
    );
}

export function PreviewP1({ data }) {

    return (
        <div className="bg-body min-h-screen px-5 py-2 text-slate-900 pt-4 pb-8" style={{ width: '1240px' }}>

            <header className="text-center text-white mb-7">
                <h1 className='text-[1.8rem] mb-2 font-bold tracking-tight sm:text-[2.5rem]'>🦁 Lions Club</h1>
                <p className='text-[1.1em]'>Compte-Rendu de Réunion Statutaire</p>
            </header>

            <div className="mx-auto grid gap-8">
                <div className="grid gap-8 min-w-[990px] mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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

                <div className="grid gap-8 min-w-[990px] mx-auto"> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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

                <div className="grid gap-8 min-w-[990px] mx-auto"> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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
                <div className="grid gap-8 min-w-[990px] mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📬 Secrétariat" />
                        <TextareaField label="Courriers reçus" placeholder="Détail les courriers reçus..." htmlFor="receivedMails"
                            value={data.receivedMails} readOnly />
                        <TextareaField label="Courriers envoyés" placeholder="Détail les courriers envoyés..." htmlFor="sentMails"
                            value={data.sentMails} readOnly />
                    </section>
                </div>

                <div className="grid gap-8 min-w-[990px] mx-auto"> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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


                <div className="grid gap-8 min-w-[990px] mx-auto"> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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

                <div className="grid gap-8 min-w-[990px] mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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