'use client';

import { useEffect } from 'react';

const BUILD_ID = process.env.NEXT_PUBLIC_BUILD_ID || 'dev';
const UPDATE_INTERVAL_MS = 30 * 60 * 1000;

export function PWARegister() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      return;
    }

    if (process.env.NODE_ENV !== 'production') {
      return;
    }

    let registration = null;
    let intervalId = null;
    let reloading = false;
    // false à la toute première installation : dans ce cas `clients.claim()`
    // déclenche un controllerchange qu'il ne faut pas transformer en reload.
    let hadController = Boolean(navigator.serviceWorker.controller);

    const onControllerChange = () => {
      if (!hadController) {
        hadController = true;
        return;
      }

      if (reloading) {
        return;
      }

      reloading = true;
      window.location.reload();
    };

    const activateNow = (worker) => {
      if (worker) {
        worker.postMessage({ type: 'SKIP_WAITING' });
      }
    };

    const watchInstalling = () => {
      const installing = registration && registration.installing;

      if (!installing) {
        return;
      }

      installing.addEventListener('statechange', () => {
        // Un contrôleur existe déjà => c'est une mise à jour, pas une
        // première installation : on remplace immédiatement l'ancien SW.
        if (installing.state === 'installed' && navigator.serviceWorker.controller) {
          activateNow(installing);
        }
      });
    };

    const checkForUpdate = () => {
      if (registration) {
        registration.update().catch(() => {});
      }
    };

    const onVisibilityChange = () => {
      if (!document.hidden) {
        checkForUpdate();
      }
    };

    const register = async () => {
      try {
        navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);

        // `?v=` garantit un diff d'octets à chaque build, `updateViaCache:'none'`
        // empêche que le script du SW soit lui-même servi depuis le cache HTTP.
        registration = await navigator.serviceWorker.register(`/sw.js?v=${BUILD_ID}`, {
          scope: '/',
          updateViaCache: 'none',
        });

        activateNow(registration.waiting);
        registration.addEventListener('updatefound', watchInstalling);
        watchInstalling();

        // Une PWA installée peut rester ouverte des jours sans jamais
        // revérifier : on force la vérification au retour au premier plan.
        document.addEventListener('visibilitychange', onVisibilityChange);
        window.addEventListener('online', checkForUpdate);
        intervalId = window.setInterval(checkForUpdate, UPDATE_INTERVAL_MS);
      } catch (error) {
        console.error('Erreur lors de l’enregistrement du Service Worker', error);
      }
    };

    register();

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      window.removeEventListener('online', checkForUpdate);

      if (intervalId) {
        window.clearInterval(intervalId);
      }
    };
  }, []);

  return null;
}
