import { useState, useEffect } from "react";
import { SectionHeading } from "./sectionHeading";
import { FormField } from "./formField";
import { TextareaField } from "./textareaField";
import { formatDate } from "../helpers/formatDate";

export default function Formulaire({ data, onChange }) {
    const [formData, setFormData] = useState(data);

    useEffect(() => {
        setFormData(data);
    }, [data]);

    const updateField = (key, value) => {
        const newData = { ...formData, [key]: value };
        setFormData(newData);
        onChange(newData);
    };

    return (
        <div className="min-h-screen text-slate-900 pt-8 pb-4 sm:px-8 bg-transparent">

            <header className="text-center text-white mb-7">
                <h1 className='text-[1.8rem] mb-2 font-bold tracking-tight sm:text-[2.5rem]'>🦁 Lions Club</h1>
                <p className='text-[1.1em]'>Compte-Rendu de Réunion Statutaire</p>
            </header>

            <div className="mx-auto grid gap-8">
                <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📋 Informations de la réunion" />
                        <div className="grid gap-6 sm:grid-cols-1">
                            <FormField label="Réunion" htmlFor="reunionType">
                                <select
                                    id="reunionType"
                                    value={formData.reunionType}
                                    onChange={(e) => updateField('reunionType', e.target.value)}
                                    className="form-input pt-[12px]"
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
                                    value={formData.meetingDate}
                                    onChange={(e) => updateField('meetingDate', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                            <FormField label="Lieu" htmlFor="location">
                                <input
                                    id="location"
                                    type="text"
                                    placeholder="Ex: Salle des conférences"
                                    value={formData.location}
                                    onChange={(e) => updateField('location', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                            <FormField label="Début de la réunion" htmlFor="startTime">
                                <input
                                    id="startTime"
                                    type="time"
                                    value={formData.startTime}
                                    onChange={(e) => updateField('startTime', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                            <FormField label="Fin de la réunion" htmlFor="endTime">
                                <input
                                    id="endTime"
                                    type="time"
                                    value={formData.endTime}
                                    onChange={(e) => updateField('endTime', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                        </div>
                    </section>
                </div>

                <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="👥 Participants" />
                        <div className="grid gap-6 sm:grid-cols-2">
                            {['memberPresent', 'memberExcused', 'memberAbsent', 'guests'].map((field, index) => (
                                <FormField key={field} label={field === 'memberPresent' ? 'Membre présent' : field === 'memberExcused' ? 'Membre excusé' : field === 'memberAbsent' ? 'Membre absent' : 'Invité'} htmlFor={field}>
                                    <input
                                        id={field}
                                        type="number"
                                        min="0"
                                        value={formData[field]}
                                        onChange={(e) => updateField(field, e.target.value)}
                                        className="form-input pt-[12px]"
                                    />
                                </FormField>
                            ))}
                            <FormField label="Membre TOTAL" htmlFor="memberTotal" className="sm:col-span-2">
                                <input
                                    id="memberTotal"
                                    type="number"
                                    min="0"
                                    value={formData.memberTotal}
                                    onChange={(e) => updateField('memberTotal', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                        </div>
                    </section>
                </div>

                <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="🎤 Interventions générales" />
                        <TextareaField label="Mot éventuel du président" placeholder="Entrez le mot du président..." htmlFor="presidentWord" value={formData.presidentWord} onChange={(value) => updateField('presidentWord', value)} />
                        <TextareaField label="Rappel de l'ordre du jour" placeholder="Rappel de l'ordre du jour..." htmlFor="orderOfDay" value={formData.orderOfDay} onChange={(value) => updateField('orderOfDay', value)} />
                        <TextareaField label="Approbation du compte-rendu de réunion statutaire" placeholder="Approbation du compte-rendu..." htmlFor="approvalPV" value={formData.approvalPV} onChange={(value) => updateField('approvalPV', value)} />
                    </section>
                </div>

                <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📬 Secrétariat" />
                        <TextareaField label="Courriers reçus" placeholder="Détail les courriers reçus..." htmlFor="receivedMails" value={formData.receivedMails} onChange={(value) => updateField('receivedMails', value)} />
                        <TextareaField label="Courriers envoyés" placeholder="Détail les courriers envoyés..." htmlFor="sentMails" value={formData.sentMails} onChange={(value) => updateField('sentMails', value)} />
                    </section>
                </div>

                <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="💰 Trésorerie" />
                        <div className="grid gap-6 sm:grid-cols-2">
                            <FormField label="Solde compte administratif" htmlFor="adminBalance">
                                <input
                                    id="adminBalance"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.adminBalance}
                                    onChange={(e) => updateField('adminBalance', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                            <FormField label="Solde compte œuvre" htmlFor="worksBalance">
                                <input
                                    id="worksBalance"
                                    type="number"
                                    step="0.01"
                                    placeholder="0.00"
                                    value={formData.worksBalance}
                                    onChange={(e) => updateField('worksBalance', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                            <FormField label="Cotisation Siège" htmlFor="headQuartersFees">
                                <input
                                    id="headQuartersFees"
                                    type="text"
                                    placeholder="Ex: 100€"
                                    value={formData.headQuartersFees}
                                    onChange={(e) => updateField('headQuartersFees', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                            <FormField label="Cotisation District" htmlFor="districtFees">
                                <input
                                    id="districtFees"
                                    type="text"
                                    placeholder="Ex: 50€"
                                    value={formData.districtFees}
                                    onChange={(e) => updateField('districtFees', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                            <FormField label="Cotisation Région" htmlFor="regionFees">
                                <input
                                    id="regionFees"
                                    type="text"
                                    placeholder="Ex: 30€"
                                    value={formData.regionFees}
                                    onChange={(e) => updateField('regionFees', e.target.value)}
                                    className="form-input pt-[12px]"
                                />
                            </FormField>
                        </div>
                        <TextareaField label="Autres points sur la trésorerie" placeholder="Autres informations de trésorerie..." htmlFor="treasuryOther" value={formData.treasuryOther} onChange={(value) => updateField('treasuryOther', value)} />
                    </section>
                </div>

                <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📊 Commissions" />
                        <TextareaField label="POINT EME (Effectif)" placeholder="Points sur l'effectif..." htmlFor="pointEME" value={formData.pointEME} onChange={(value) => updateField('pointEME', value)} />
                        <TextareaField label="POINT EML (Formation)" placeholder="Points sur la formation..." htmlFor="pointEML" value={formData.pointEML} onChange={(value) => updateField('pointEML', value)} />
                        <TextareaField label="POINT EMS (Service-Oeuvres)" placeholder="Points sur le service-oeuvres..." htmlFor="pointEMS" value={formData.pointEMS} onChange={(value) => updateField('pointEMS', value)} />
                        <TextareaField label="Point sur les actions en cours (EMS)" placeholder="Action actuelle en cours..." htmlFor="ongoingActions" value={formData.ongoingActions} onChange={(value) => updateField('ongoingActions', value)} />
                        <TextareaField label="Point LCIF" placeholder="Informations sur le LCIF..." htmlFor="pointLCIF" value={formData.pointLCIF} onChange={(value) => updateField('pointLCIF', value)} />
                    </section>
                </div>

                <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📢 Autres points" />
                        <TextareaField label="Point Marketing et Communication" placeholder="Informations marketing et communication..." htmlFor="marketing" value={formData.marketing} onChange={(value) => updateField('marketing', value)} />
                        <TextareaField label="Programme du mois" placeholder="Programme du mois..." htmlFor="monthProgram" value={formData.monthProgram} onChange={(value) => updateField('monthProgram', value)} />
                        <TextareaField label="Divers" placeholder="Autres diverses..." htmlFor="miscellaneous" value={formData.miscellaneous} onChange={(value) => updateField('miscellaneous', value)} />

                    </section>
                </div>
            </div>
        </div>
    );
}