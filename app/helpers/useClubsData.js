'use client';

import { useCallback, useEffect, useState } from 'react';
import { CLUBS_DATA_URL } from '../constantes/clubsData';

/**
 * Charge la liste des clubs en offline-first.
 *
 * Pas de `cache: 'no-store'` ici : c'est le Service Worker qui répond depuis
 * son cache (instantané, fonctionne hors ligne) puis revalide en tâche de
 * fond via le manifeste serveur. Quand clubs.json a réellement changé, le SW
 * envoie `CLUB_ASSETS_UPDATED` et on recharge automatiquement.
 */
export function useClubsData() {
    const [clubsData, setClubsData] = useState([]);
    const [clubsLoading, setClubsLoading] = useState(true);
    const [clubsError, setClubsError] = useState('');

    const loadClubsData = useCallback(async () => {
        setClubsLoading(true);

        try {
            const response = await fetch(CLUBS_DATA_URL);

            if (!response.ok) {
                throw new Error('Impossible de charger les clubs');
            }

            const clubs = await response.json();
            setClubsData(Array.isArray(clubs) ? clubs : []);
            setClubsError('');
        } catch (error) {
            console.error(error);
            setClubsData([]);
            setClubsError('Impossible de charger la liste des clubs');
        } finally {
            setClubsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadClubsData();
    }, [loadClubsData]);

    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            return undefined;
        }

        const onMessage = (event) => {
            if (event.data && event.data.type === 'CLUB_ASSETS_UPDATED' && event.data.clubsChanged) {
                loadClubsData();
            }
        };

        navigator.serviceWorker.addEventListener('message', onMessage);

        return () => {
            navigator.serviceWorker.removeEventListener('message', onMessage);
        };
    }, [loadClubsData]);

    return { clubsData, clubsLoading, clubsError, reloadClubsData: loadClubsData };
}

/**
 * À appeler après un import : les fichiers du serveur viennent de changer,
 * on demande au Service Worker de resynchroniser sans attendre son throttle.
 */
export function requestClubAssetsRefresh() {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'REFRESH_CLUB_ASSETS' });
    }
}
