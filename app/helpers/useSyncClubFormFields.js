'use client';

import { useEffect } from 'react';
import {
  buildClubFormSyncPatch,
  clubTypeToToggleValue,
  findClubInList,
  mapClubRecordToFormFields,
} from '../../lib/syncClubFormFields';

/**
 * Resynchronise région, zone, logo, n° club (etc.) depuis clubs.json
 * quand un nom de club est déjà présent (localStorage, rechargement SW…).
 */
export function useSyncClubFormFields({
  data,
  onChange,
  clubsData,
  clubsLoading,
  selectedClubType,
  setSelectedClubType,
}) {
  useEffect(() => {
    if (!data.clubType) return;
    const toggle = clubTypeToToggleValue(data.clubType);
    setSelectedClubType((prev) => (prev === toggle ? prev : toggle));
  }, [data.clubType, setSelectedClubType]);

  useEffect(() => {
    if (clubsLoading || !clubsData?.length || !data.clubName?.trim()) {
      return;
    }

    // Le type enregistré prime sur le toggle (Lion par défaut au chargement) :
    // sinon un club Leo homonyme d’un club Lion bascule sur la fiche Lion.
    const club = findClubInList(clubsData, data.clubName, data.clubType, selectedClubType);
    const fields = mapClubRecordToFormFields(club);
    const patch = buildClubFormSyncPatch(data, fields);
    if (!patch) return;

    onChange({ ...data, ...patch });
  }, [data, clubsData, clubsLoading, selectedClubType, onChange]);
}
