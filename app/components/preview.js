import { DataRow } from './dataRow';
import { FormField } from './formField';
import { SectionHeading } from './sectionHeading';
import { TextareaField } from './textareaField';

export function PreviewP1({ data }) {

    return (
        <div className="bg-body min-h-screen px-5 py-2 text-slate-900 pt-4 pb-8" style={{ width: '1240px'}}>

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
                         value={data.presidentWord} readOnly/>
                        <TextareaField label="Rappel de l'ordre du jour" placeholder="Rappel de l'ordre du jour..." htmlFor="orderOfDay"
                         value={data.orderOfDay} readOnly/>
                        <TextareaField label="Approbation du compte-rendu de réunion statutaire" placeholder="Approbation du compte-rendu..." htmlFor="approvalPV"
                         value={data.approvalPV} readOnly/>
                    </section>
                </div>
            </div>
        </div>
    );
}

export function PreviewP2({ data }) {

    return (
        <div className="bg-body min-h-screen px-8 py-8 text-slate-900" style={{ width: '1240px'}}>
            <div className="mx-auto grid gap-8">
                <div className="grid gap-8 min-w-[990px] mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📬 Secrétariat" />
                        <TextareaField label="Courriers reçus" placeholder="Détail les courriers reçus..." htmlFor="receivedMails"
                            value={data.receivedMails} readOnly/>
                        <TextareaField label="Courriers envoyés" placeholder="Détail les courriers envoyés..." htmlFor="sentMails"
                            value={data.sentMails} readOnly/>
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
                            value={data.treasuryOther} readOnly/>
                    </section>
                </div>
            </div>
        </div>
    );
}

export function PreviewP3({ data }) {

    return (
        <div className="bg-body min-h-screen px-8 py-8 text-slate-900" style={{ width: '1240px'}}>
            <div className="mx-auto grid gap-8">


                <div className="grid gap-8 min-w-[990px] mx-auto"> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📊 Commissions" />
                        <TextareaField label="POINT EME (Effectif)" placeholder="Points sur l'effectif..." htmlFor="pointEME"
                            value={data.pointEME} readOnly/>
                        <TextareaField label="POINT EML (Formation)" placeholder="Points sur la formation..." htmlFor="pointEML"
                            value={data.pointEML} readOnly/>
                        <TextareaField label="POINT EMS (Service-Oeuvres)" placeholder="Points sur le service-oeuvres..." htmlFor="pointEMS"
                            value={data.pointEMS} readOnly/>
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