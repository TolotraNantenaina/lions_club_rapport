'use client';

import { ProcessingLoader } from './processingLoader';

export function JpgDownloadModal({ baseName, images = [], isLoading = false, onClose, onDownloadPage }) {
    if (!baseName && !isLoading) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[28px] border border-white/20 bg-white p-6 shadow-[0_30px_90px_rgba(15,23,42,0.45)] dark:bg-slate-950">
                <div className="mb-6 flex flex-col gap-3 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <span className="inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-black uppercase tracking-wide text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200">
                            Export JPG
                        </span>
                        <h2 className="mt-3 text-2xl font-black text-slate-900 dark:text-white">
                            Télécharger le rapport page par page
                        </h2>
                        <p className="mt-1 text-sm text-slate-500 dark:text-slate-300">
                            Cliquez sur chaque page pour la télécharger individuellement.
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-slate-200 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
                    >
                        Fermer
                    </button>
                </div>

                {isLoading ? (
                    <div className="py-12">
                        <ProcessingLoader label="Génération des images JPG…" />
                    </div>
                ) : (
                    <div className="space-y-4">
                        {images.map((imageUrl, index) => {
                            const fileName = `${baseName}_${index + 1}.jpg`;

                            return (
                                <div
                                    key={fileName}
                                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-900 sm:flex-row sm:items-center"
                                >
                                <div className="overflow-hidden rounded-xl border border-slate-200 bg-light-grey dark:border-slate-700 max-[640px]:w-full">
                                        <img
                                            src={imageUrl}
                                            alt={`Aperçu page ${index + 1}`}
                                            className="h-32 w-auto object-contain max-[640px]:mx-auto"
                                        />
                                    </div>

                                    <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                                        <div>
                                            <p className="text-sm font-black text-slate-900 dark:text-white">
                                                Page {index + 1} / {images.length}
                                            </p>
                                            <p className="mt-1 break-all text-xs text-slate-500 dark:text-slate-300">
                                                {fileName}
                                            </p>
                                        </div>

                                        <button
                                            type="button"
                                            onClick={() => onDownloadPage(imageUrl, fileName)}
                                            className="rounded-xl bg-primary px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-950/20 transition hover:translate-y-[-1px] hover:brightness-110"
                                        >
                                            Télécharger la page {index + 1}
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
