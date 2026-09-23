'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useClubsData } from '../helpers/useClubsData';
import FormulaireV1 from './FormulaireV1';
import { ProcessingLoader } from '../components/processingLoader';
import { JpgDownloadModal } from '../components/JpgDownloadModal';
import { useCrFormStorage } from './useCrFormStorage';
import {
  exportMultiPageJpg,
  exportMultiPagePdf,
  downloadSingleJpg,
  generatePreviewImagesFromFormData,
} from './exportUtils';

/**
 * CR Version 1 — Page principale.
 *
 * Copie exacte de la page d'origine avec les modifications ciblées :
 *  1. Champ "Divers" remplacé par un éditeur TipTap riche
 *  2. Persistance localStorage (Offline-First)
 *  3. Export JPG multi-pages avec logique anti-coupure
 */
export default function CrVersion1Page() {
  const { formData, setFormData, resetForm: storageReset, initialized } = useCrFormStorage();
  const [toast, setToast] = useState('');
  const [apercuUrls, setApercuUrls] = useState([]);
  const [apercuValide, setApercuValide] = useState(false);
  const [apercuLoading, setApercuLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const { clubsData, clubsLoading, clubsError } = useClubsData();
  const [downloadModal, setDownloadModal] = useState(null);
  const [pdfExporting, setPdfExporting] = useState(false);

  /* ── Derived state ─────────────────────────────────────── */
  const isEmpty = apercuUrls.length === 0;
  const isProcessing = apercuUrls.length === 0 && apercuLoading;
  const isSuccess = apercuUrls.length > 0 && apercuValide && !apercuLoading;
  const isError = apercuUrls.length === 0 && !apercuLoading && apercuValide;

  useEffect(() => {
    if (apercuUrls.length > 0) setCurrentPage(0);
  }, [apercuUrls.length]);

  const currentImage = apercuUrls[currentPage] ?? apercuUrls[0] ?? '';
  const hasMultiple = apercuUrls.length > 1;

  /* ── Toast ─────────────────────────────────────────────── */
  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(window.toastTimeout);
    window.toastTimeout = window.setTimeout(() => setToast(''), 3500);
  }, []);

  /* ── Reset ─────────────────────────────────────────────── */
  const resetForm = useCallback(() => {
    if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les champs ?')) {
      storageReset();
      setApercuUrls([]);
      setApercuValide(false);
      setApercuLoading(false);
      setCurrentPage(0);
      showToast('✓ Formulaire réinitialisé');
    }
  }, [storageReset, showToast]);

  /* ── Aperçu ────────────────────────────────────────────── */
  const apercuJpg = useCallback(async () => {
    setApercuLoading(true);
    setApercuValide(false);

    const validImages = await generatePreviewImagesFromFormData(formData, showToast);
    setApercuUrls(validImages);
    setApercuValide(true);
    setCurrentPage(0);
    setApercuLoading(false);
  }, [formData, showToast]);

  /* ── Export JPG ─────────────────────────────────────────── */
  const exportJpg = useCallback(async () => {
    setDownloadModal({ baseName: '', images: [], isLoading: true });

    const { baseName, images } = await exportMultiPageJpg(formData, showToast);

    if (images.length === 0) {
      setDownloadModal(null);
      return;
    }

    setDownloadModal({ baseName, images, isLoading: false });
  }, [formData, showToast]);

  /* ── Export PDF ─────────────────────────────────────────── */
  const exportPdf = useCallback(async () => {
    if (pdfExporting) return;
    setPdfExporting(true);
    try {
      const ok = await exportMultiPagePdf(formData, showToast);
      if (ok) showToast('PDF téléchargé');
    } catch (err) {
      console.error(err);
      showToast('❌ Erreur lors de la génération du PDF');
    } finally {
      setPdfExporting(false);
    }
  }, [formData, pdfExporting, showToast]);

  /* ── Don't render until localStorage is loaded ──────────── */
  if (!initialized) {
    return (
      <main className="mx-8 min-h-screen">
        <div className="flex items-center justify-center py-32">
          <ProcessingLoader label="Chargement du formulaire…" />
        </div>
      </main>
    );
  }

  return (
    <main className="mx-8 max-[480px]:mx-4 min-h-screen">

      {/* ═══ Global header ═══════════════════════════════════ */}
      <div className="text-slate-900 pt-8 bg-transparent">
        <header className="relative mb-7 text-white mx-auto w-full min-[1200px]:max-w-[990px]">
          <div className="text-center">
            <div className="mx-auto flex h-[60px] items-center justify-center gap-2 py-3">
              <img src="/ico_lions_club_transparent.png" alt="Logo Lions Club" className="mb-2 h-[55px] w-[55px]" />
              <h1 className="mb-2 text-[1.8rem] font-bold tracking-tight sm:text-[2.5rem]">Lions Club</h1>
            </div>
            <p className="text-[1.1em]">Compte-Rendu de Réunion Statutaire — V1 TipTap</p>
          </div>
          <Link
            href="/"
            className="absolute left-0 top-1/4 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full text-white transition hover:text-white/80"
            aria-label="Retour à l'accueil"
          >
            <svg aria-hidden="true" viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
            </svg>
          </Link>
        </header>
      </div>

      {/* ═══ Formulaire (TipTap "Divers") ═══════════════════ */}
      <div className={pdfExporting ? 'pointer-events-none select-none' : undefined}>
        <FormulaireV1
          data={formData}
          onChange={setFormData}
          clubsData={clubsData}
          clubsLoading={clubsLoading}
          clubsError={clubsError}
          showToast={showToast}
        />
      </div>

      {/* ═══ Buttons ═════════════════════════════════════════ */}
      <div className="text-slate-900 pt-4 pb-8 bg-transparent">
        <div className="mx-auto grid gap-8">
          <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto">
            <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
              <div className="grid gap-4 grid-cols-2">
                <button type="button" onClick={apercuJpg} disabled={pdfExporting} className="btn-primary hover:scale-105 transition-all disabled:pointer-events-none disabled:opacity-60">
                  📊 Aperçu du rapport
                </button>
                <button type="button" onClick={resetForm} disabled={pdfExporting} className="btn-reset hover:scale-105 transition-all disabled:pointer-events-none disabled:opacity-60">
                  🔄 Réinitialiser
                </button>
              </div>
              <div className="grid gap-4 grid-cols-2">
                <button type="button" onClick={exportJpg} disabled={pdfExporting} className="btn-secondary hover:scale-105 transition-all disabled:pointer-events-none disabled:opacity-60">
                  📸 Exporter JPG
                </button>
                <button
                  type="button"
                  onClick={exportPdf}
                  disabled={pdfExporting}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#7a1f2b] px-[1.25rem] py-[0.95rem] font-bold text-white shadow-lg shadow-[#7a1f2b]/30 transition-all hover:scale-105 hover:bg-[#952636] hover:shadow-xl active:scale-95 disabled:pointer-events-none disabled:opacity-60"
                >
                  <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm1 7V3.5L19.5 9zM8.5 17.5v-4H10c.8 0 1.3.4 1.3 1.1 0 .7-.5 1.1-1.3 1.1H9.3v1.8zm.8-2.4h.6c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-.6zm3 2.4v-4h1.1c1.1 0 1.8.6 1.8 2s-.7 2-1.8 2zm.8-1.6h.3c.5 0 .9-.3.9-1.1s-.4-1.1-.9-1.1h-.3zm2.6 1.6v-4H17c.9 0 1.4.4 1.4 1.1 0 .5-.3.9-.7 1l.9 1.9h-.9l-.8-1.7h-.4v1.7zm.8-2.4h.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-.5z" />
                  </svg>
                  Exporter PDF
                </button>
              </div>
            </section>
          </div>

          {/* ═══ Preview area ═════════════════════════════════ */}
          <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto">
            <section className="rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
              <div className="mb-6 text-center items-center px-4 py-3 text-primary text-[1.4em] text-semibold">
                <h1 className="text-2xl text-center font-bold text-primary">📄 Aperçu du Rapport</h1>
              </div>
              <div className={`relative rounded-xl border border-border overflow-hidden bg-muted min-h-64 transition-all duration-300`}>

                {/* Empty state */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 ${isEmpty ? 'opacity-100' : 'opacity-0 pointer-events-none'} light-bg`}>
                  <div className="text-center mb-5">
                    <h2 className="text-2xl font-bold text-primary">LIONS CLUB</h2>
                    <p className="text-sm text-muted-foreground text-center text-accent">Compte-Rendu de Réunion Statutaire</p>
                  </div>
                  <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center">
                    <svg className="w-6 h-6 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground text-center text-dark-grey">Cliquez sur &quot;Aperçu du Rapport&quot; pour générer un aperçu</p>
                </div>

                {/* Processing */}
                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300 ${isProcessing ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <ProcessingLoader label="Conversion du document en image…" />
                </div>

                {/* Success */}
                <div className={`transition-opacity duration-500 ${isSuccess ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="p-3 flex flex-col items-center gap-4">
                    {hasMultiple && (
                      <button type="button" disabled={currentPage === 0}
                        onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                        className="text-sm text-muted-foreground disabled:opacity-40 text-left mr-auto"
                      >Précédent</button>
                    )}
                    {hasMultiple && (
                      <button type="button" disabled={currentPage >= apercuUrls.length - 1}
                        onClick={() => setCurrentPage((p) => Math.min(p + 1, apercuUrls.length - 1))}
                        className="text-sm text-muted-foreground disabled:opacity-40 text-right ml-auto mt-[-35px]"
                      >Suivant</button>
                    )}
                    <img src={currentImage} alt="Converted document preview"
                      className="w-full rounded-lg shadow-custom object-contain max-h-[520px] animate-fade-in-up" />
                  </div>
                </div>

                {/* Error */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300 ${isError ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                  <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950 flex items-center justify-center">
                    <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                  </div>
                  <p className="text-sm text-muted-foreground">La conversion a échoué — veuillez réessayer</p>
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>

      {pdfExporting && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-white px-8 py-4 shadow-2xl">
            <ProcessingLoader label="Génération du PDF…" />
          </div>
        </div>
      )}

      {/* ═══ Toast ═══════════════════════════════════════════ */}
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15">
          {toast}
        </div>
      )}

      {/* ═══ Download modal ══════════════════════════════════ */}
      {downloadModal && (
        <JpgDownloadModal
          baseName={downloadModal.baseName}
          images={downloadModal.images}
          isLoading={downloadModal.isLoading}
          onClose={() => setDownloadModal(null)}
          onDownloadPage={downloadSingleJpg}
        />
      )}

      {/* ═══ Footer ══════════════════════════════════════════ */}
      <footer className="fixed bottom-2 right-6 z-40 opacity-70 pointer-events-none select-none text-center">
        <span className="text-xs text-slate-500 font-mono">
          v{require('../../package.json').version_1} - cr-v1-tiptap
        </span>
      </footer>
    </main>
  );
}
