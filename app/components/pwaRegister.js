'use client';

import { useEffect } from 'react';

export function PWARegister() {
    useEffect(() => {
        if (!('serviceWorker' in navigator)) {
            return;
        }

        navigator.serviceWorker.register('/sw.js').catch((error) => {
            console.error('Erreur lors de l’enregistrement du Service Worker', error);
        });
    }, []);

    return null;
}
