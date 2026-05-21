import { useState, useEffect, useMemo } from "react";
import { SectionHeading } from "./sectionHeading";
import { FormField } from "./formField";
import { TextareaField } from "./textareaField";
import { formatDate } from "../helpers/formatDate";

export default function Formulaire({ data, onChange, clubsData = [], clubsLoading = false, clubsError = '' }) {
    const [formData, setFormData] = useState(data);
    const [clubSearch, setClubSearch] = useState(data.clubName || '');
    const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
    const [isReunionDropdownOpen, setIsReunionDropdownOpen] = useState(false);
    const memberFields = ['memberPresent', 'memberExcused', 'memberAbsent'];
    const reunionOptions = ['', 'AG', 'AG EXTRA', 'CA', 'CA EXTRA', 'AGM', 'AUTRE'];
    const clubOptions = useMemo(() => (
        clubsData
            .map((club) => club.nomClub.trim())
            .filter(Boolean)
            .sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }))
    ), [clubsData]);

    useEffect(() => {
        setFormData(data);
        setClubSearch(data.clubName || '');
    }, [data]);

    const filteredClubOptions = useMemo(() => {
        const query = clubSearch.trim().toLowerCase();

        if (!query) {
            return clubOptions;
        }

        return clubOptions.filter((clubName) => clubName.toLowerCase().includes(query));
    }, [clubOptions, clubSearch]);

    const calculateMemberTotal = (dataToCalculate) => {
        return memberFields.reduce((total, field) => {
            return total + (Number(dataToCalculate[field]) || 0);
        }, 0).toString();
    };

    const updateField = (key, value) => {
        const newData = { ...formData, [key]: value };

        if (memberFields.includes(key)) {
            newData.memberTotal = calculateMemberTotal(newData);
        }

        if (key === 'clubName') {
            const selectedClub = clubsData.find((club) => club.nomClub?.trim() === value);

            newData.president = selectedClub?.President || '';
            newData.vicePresident = selectedClub?.vicePresident || '';
            newData.secretary = selectedClub?.Secretaire || '';
            newData.region = selectedClub?.Region || '';
            newData.zone = selectedClub?.Zone || '';
            newData.clubLogoUrl = selectedClub?.clubLogoUrl || '';
            newData.numeroAffiliation = selectedClub?.numeroAffiliation || '';
        }

        setFormData(newData);
        onChange(newData);
    };

    const selectClub = (clubName) => {
        setClubSearch(clubName);
        setIsClubDropdownOpen(false);
        updateField('clubName', clubName);
    };

    const selectReunionType = (reunionType) => {
        setIsReunionDropdownOpen(false);
        updateField('reunionType', reunionType);
    };

    return (
        <div className="min-h-screen text-slate-900 pb-4 bg-transparent">

            <div className="mx-auto grid gap-8">
                <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📋 Informations de la réunion" />
                        <div className="grid gap-6 sm:grid-cols-1">
                            <FormField label="Club" htmlFor="clubName">
                                <div className="relative">
                                    <input
                                        id="clubName"
                                        type="text"
                                        placeholder="Rechercher un club..."
                                        value={clubSearch}
                                        autoComplete="off"
                                        onChange={(e) => {
                                            setClubSearch(e.target.value);
                                            setIsClubDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsClubDropdownOpen(true)}
                                        onBlur={() => window.setTimeout(() => setIsClubDropdownOpen(false), 120)}
                                        className="form-input bg-light-grey pt-[12px] pr-10"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Afficher la liste des clubs"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setIsClubDropdownOpen((isOpen) => !isOpen)}
                                        className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-500 transition hover:text-primary"
                                    >
                                        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
                                            <path
                                                fill="none"
                                                stroke="currentColor"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                                d="m6 8 4 4 4-4"
                                            />
                                        </svg>
                                    </button>

                                    {isClubDropdownOpen && (
                                        <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border-2 border-[var(--border)] bg-white shadow-[0_16px_35px_rgba(0,0,0,0.14)]">
                                            {clubsLoading ? (
                                                <p className="px-4 py-3 text-[0.95em] text-dark-grey">Chargement des clubs...</p>
                                            ) : clubsError ? (
                                                <p className="px-4 py-3 text-[0.95em] text-red-600">{clubsError}</p>
                                            ) : filteredClubOptions.length > 0 ? (
                                                filteredClubOptions.map((clubName) => (
                                                    <button
                                                        key={clubName}
                                                        type="button"
                                                        onMouseDown={(e) => e.preventDefault()}
                                                        onClick={() => selectClub(clubName)}
                                                        className="block w-full px-4 py-3 text-left text-[0.95em] text-slate-800 transition hover:bg-[rgba(44,90,160,0.08)] hover:text-primary"
                                                    >
                                                        {clubName}
                                                    </button>
                                                ))
                                            ) : (
                                                <p className="px-4 py-3 text-[0.95em] text-dark-grey">Aucun club trouvé</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </FormField>
                            <FormField label="Réunion" htmlFor="reunionType">
                                <div className="relative">
                                    <input
                                        id="reunionType"
                                        type="text"
                                        value={formData.reunionType}
                                        placeholder="Sélectionner..."
                                        readOnly
                                        onFocus={() => setIsReunionDropdownOpen(true)}
                                        onClick={() => setIsReunionDropdownOpen(true)}
                                        onBlur={() => window.setTimeout(() => setIsReunionDropdownOpen(false), 120)}
                                        className="form-input cursor-pointer bg-light-grey pt-[12px] pr-10"
                                    />
                                    <button
                                        type="button"
                                        aria-label="Afficher la liste des types de réunion"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => setIsReunionDropdownOpen((isOpen) => !isOpen)}
                                        className="absolute right-3 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center text-slate-500 transition hover:text-primary"
                                    >
                                        <svg aria-hidden="true" viewBox="0 0 20 20" className="h-4 w-4">
                                            <path
                                                fill="none"
                                                stroke="currentColor"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth="1.5"
                                                d="m6 8 4 4 4-4"
                                            />
                                        </svg>
                                    </button>

                                    {isReunionDropdownOpen && (
                                        <div className="absolute z-20 mt-2 w-full overflow-hidden rounded-lg border-2 border-[var(--border)] bg-white shadow-[0_16px_35px_rgba(0,0,0,0.14)]">
                                            {reunionOptions.map((reunionType) => (
                                                <button
                                                    key={reunionType || 'empty-reunion-type'}
                                                    type="button"
                                                    onMouseDown={(e) => e.preventDefault()}
                                                    onClick={() => selectReunionType(reunionType)}
                                                    className="block w-full h-[40px] px-4 py-3 text-left text-[0.95em] text-slate-800 transition hover:bg-[rgba(44,90,160,0.08)] hover:text-primary"
                                                >
                                                    {reunionType || 'Sélectionner...'}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
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

                <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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
                                    readOnly
                                    className="form-input bg-slate-100 pt-[12px]"
                                />
                            </FormField>
                        </div>
                    </section>
                </div>

                <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="🎤 Interventions générales" />
                        <TextareaField label="Mot éventuel du président" placeholder="Entrez le mot du président..." htmlFor="presidentWord" value={formData.presidentWord} onChange={(value) => updateField('presidentWord', value)} />
                        <TextareaField label="Rappel de l'ordre du jour" placeholder="Rappel de l'ordre du jour..." htmlFor="orderOfDay" value={formData.orderOfDay} onChange={(value) => updateField('orderOfDay', value)} />
                        <TextareaField label="Approbation du compte-rendu de réunion statutaire" placeholder="Approbation du compte-rendu..." htmlFor="approvalPV" value={formData.approvalPV} onChange={(value) => updateField('approvalPV', value)} />
                    </section>
                </div>

                <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📬 Secrétariat" />
                        <TextareaField label="Courriers reçus" placeholder="Détail les courriers reçus..." htmlFor="receivedMails" value={formData.receivedMails} onChange={(value) => updateField('receivedMails', value)} />
                        <TextareaField label="Courriers envoyés" placeholder="Détail les courriers envoyés..." htmlFor="sentMails" value={formData.sentMails} onChange={(value) => updateField('sentMails', value)} />
                    </section>
                </div>

                <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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

                <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                    <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                        <SectionHeading title="📊 Commissions" />
                        <TextareaField label="POINT EME (Effectif)" placeholder="Points sur l'effectif..." htmlFor="pointEME" value={formData.pointEME} onChange={(value) => updateField('pointEME', value)} />
                        <TextareaField label="POINT EML (Formation)" placeholder="Points sur la formation..." htmlFor="pointEML" value={formData.pointEML} onChange={(value) => updateField('pointEML', value)} />
                        <TextareaField label="POINT EMS (Service-Oeuvres)" placeholder="Points sur le service-oeuvres..." htmlFor="pointEMS" value={formData.pointEMS} onChange={(value) => updateField('pointEMS', value)} />
                        <TextareaField label="Point sur les actions en cours (EMS)" placeholder="Action actuelle en cours..." htmlFor="ongoingActions" value={formData.ongoingActions} onChange={(value) => updateField('ongoingActions', value)} />
                        <TextareaField label="Point LCIF" placeholder="Informations sur le LCIF..." htmlFor="pointLCIF" value={formData.pointLCIF} onChange={(value) => updateField('pointLCIF', value)} />
                    </section>
                </div>

                <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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