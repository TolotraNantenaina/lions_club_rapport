'use client';

import { useCallback, useEffect, useState, useRef } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { CLUBS_DATA_URL } from '../constantes/clubsData';

const FileImportDropzone = dynamic(
    () => import('../components/import/FileImportDropzone').then((mod) => mod.FileImportDropzone),
    {
        ssr: false,
        loading: () => (
            <section className="w-full rounded-[24px] bg-white/95 p-6 shadow-[0_20px_60px_rgba(0,0,0,0.12)] dark:bg-slate-950">
                <p className="text-sm text-slate-500 dark:text-slate-300">Chargement de l’import…</p>
            </section>
        ),
    }
);

export default function ParametrePage() {
    const [toast, setToast] = useState('');
    const [clubsData, setClubsData] = useState([]);
    const [clubsLoading, setClubsLoading] = useState(true);
    const [isTall, setIsTall] = useState(false);
    const ref = useRef(null);

    useEffect(() => {
        const observer = new ResizeObserver(([entry]) => {
            console.log(entry.contentRect.height);
            setIsTall(entry.contentRect.height > 780);
          });
      
          if (ref.current) {
            observer.observe(ref.current);
          }
      
          return () => observer.disconnect();
    }, []);

    const loadClubsData = useCallback(async () => {
        setClubsLoading(true);

        try {
            const response = await fetch(CLUBS_DATA_URL);

            if (!response.ok) {
                throw new Error('Impossible de charger les clubs');
            }

            const clubs = await response.json();
            setClubsData(Array.isArray(clubs) ? clubs : []);
        } catch (error) {
            console.error(error);
            setClubsData([]);
        } finally {
            setClubsLoading(false);
        }
    }, []);

    useEffect(() => {
        loadClubsData();
    }, [loadClubsData]);

    const showToast = (message) => {
        setToast(message);
        window.clearTimeout(window.toastTimeout);
        window.toastTimeout = window.setTimeout(() => setToast(''), 3500);
    };

    return (
        <main className="mx-8 flex min-h-screen max-[480px]:mx-4 flex-col" ref={ref}>
            <div className="pt-8 text-slate-900 bg-transparent">
                <header className="relative mx-auto mb-7 w-full min-[1200px]:max-w-[990px] text-white">
                    <Link
                        href="/"
                        className="absolute left-0 top-[6%] flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition hover:text-white/80"
                        aria-label="Retour à l’accueil"
                    >
                        <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 18l-6-6 6-6" />
                        </svg>
                    </Link>

                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#39ff14]">Paramètres</p>
                        <h1 className="mt-2 text-[1.8rem] font-bold tracking-tight sm:text-[2.2rem]">
                            Import clubs & logos
                        </h1>
                        <p className="mt-1 text-[1.05em] text-white/90">
                            Mettez à jour la liste des clubs et leurs icônes
                        </p>
                    </div>

                    <span
                        className="absolute right-0 top-[6%] flex h-11 w-11 -translate-y-1/2 items-center justify-center text-[#39ff14] drop-shadow-[0_0_8px_rgba(57,255,20,0.85)]"
                        aria-hidden="true"
                    >
                        <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9c.26.604.852.997 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
                        </svg>
                    </span>
                </header>
            </div>

            <div className={`mx-auto flex w-full min-[1200px]:max-w-[990px] flex-1 items-center justify-center ${isTall ? 'mb-48' : 'mb-8'}`}>
                <FileImportDropzone
                    clubsData={clubsData}
                    clubsLoading={clubsLoading}
                    onImportComplete={async () => {
                        await loadClubsData();
                        showToast('✓ Données importées avec succès');
                    }}
                />
            </div>

            {toast && (
                <div className="fixed right-5 top-5 z-50 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15">
                    {toast}
                </div>
            )}

            <footer className="pointer-events-none fixed bottom-2 right-6 z-40 select-none text-center opacity-70">
                <span className="font-mono text-xs text-slate-500">
                    v{require('../../package.json').version} - {require('../../package.json').name}
                </span>
            </footer>
        </main>
    );
}
