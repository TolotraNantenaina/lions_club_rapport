'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { initialData } from './constantes/initialData';
import Formulaire from './components/formulaire';
import { PreviewP1, PreviewP2, PreviewP3 } from './components/preview';
import { renderToStaticMarkup } from 'react-dom/server';
import { ProcessingLoader } from './components/processingLoader';
import { base64ToBlob } from './helpers/bas64ToBlob';
import JSZip from 'jszip';
import html2canvas from 'html2canvas';


export default function Home() {
    const [formData, setFormData] = useState(initialData);
    const [toast, setToast] = useState('');
    const [apercuUrls, setApercuUrls] = useState([]);
    const [apercuValide, setApercuValide] = useState(false);
    const [apercuLoading, setApercuLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(0);

    const isEmpty = apercuUrls.length === 0;
    const isProcessing = apercuUrls.length === 0 && apercuLoading;
    const isSuccess = apercuUrls.length > 0 && apercuValide && !apercuLoading;
    const isError = apercuUrls.length === 0 && !apercuLoading && apercuValide;

    useEffect(() => {
        if (apercuUrls.length > 0) {
        setCurrentPage(0);
        }
    }, [apercuUrls.length]);

    const currentImage = apercuUrls[currentPage] ?? apercuUrls[0] ?? "";
    const hasMultiple = apercuUrls.length > 1;

    const showToast = (message) => {
        setToast(message);
        window.clearTimeout(window.toastTimeout);
        window.toastTimeout = window.setTimeout(() => setToast(''), 3500);
    };

    const resetForm = () => {
        if (window.confirm('Êtes-vous sûr de vouloir réinitialiser tous les champs ?')) {
            setFormData(initialData);
            showToast('✓ Formulaire réinitialisé');
            setApercuUrls([]);
            setApercuValide(false);
            setApercuLoading(false);
            setCurrentPage(0);
        }
    };

    const apercuJpg = async () => {
        const prevuePages = [<PreviewP1 data={formData} />, <PreviewP2 data={formData} />, <PreviewP3 data={formData} />];

        const htmlStrings = prevuePages.map((Page) => renderToStaticMarkup(Page));

        const imagesUrls = await Promise.all(htmlStrings.map(async (htmlString) => {
            const tempDiv = document.createElement('div');
            tempDiv.style.width = '1240px';
            tempDiv.style.height = '1740px';
            tempDiv.style.background = '#ffffff';
            tempDiv.style.position = 'fixed';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '0';
            tempDiv.style.zIndex = '9999';
            tempDiv.innerHTML = htmlString;
            document.body.appendChild(tempDiv);

            try {
                const canvas = await html2canvas(tempDiv, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true,
                    width: 1240,
                    height: 1740,
                    windowHeight: tempDiv.scrollHeight,
                    logging: false, // Disable logging for cleaner output
                    letterRendering: true, // Better text rendering
                });

                return canvas.toDataURL('image/jpeg', 0.95);
            } catch (error) {
                console.error(error);
                showToast('❌ Erreur lors de la génération de l’aperçu');
                return null;
            }
        }));

        const validImages = imagesUrls.filter(url => url !== null);
        setApercuUrls(validImages);
        setApercuValide(true);
    };

    const exportJpg = async () => {
        showToast('⏳ Génération en cours...');

        // Wait for fonts to load
        await document.fonts.ready;


        const prevuePages = [<PreviewP1 data={formData} />, <PreviewP2 data={formData} />, <PreviewP3 data={formData} />];

        const htmlStrings = prevuePages.map((Page) => renderToStaticMarkup(Page));

        const imagesUrls = await Promise.all(htmlStrings.map(async (htmlString) => {

            const tempDiv = document.createElement('div');
            tempDiv.style.width = '1240px';
            tempDiv.style.height = '1740px';
            tempDiv.style.background = '#ffffff';
            tempDiv.style.position = 'fixed';
            tempDiv.style.left = '-9999px';
            tempDiv.style.top = '0';
            tempDiv.style.zIndex = '9999';
            tempDiv.innerHTML = htmlString;
            document.body.appendChild(tempDiv);

            try {
                const canvas = await html2canvas(tempDiv, {
                    scale: 2,
                    backgroundColor: '#ffffff',
                    useCORS: true,
                    allowTaint: true,
                    width: 1240,
                    height: 1740,
                    windowHeight: tempDiv.scrollHeight,
                    logging: false, // Disable logging for cleaner output
                    letterRendering: true, // Better text rendering
                    onclone: (clonedDoc) => {
                        // Ensure all elements have proper styles in cloned document
                        const inputs = clonedDoc.querySelectorAll('input, select, textarea');
                        inputs.forEach(input => {
                            input.style.boxSizing = 'border-box';
                            input.style.appearance = 'none';
                            input.style.webkitAppearance = 'none';
                        });
                    }
                });

                return canvas.toDataURL('image/jpeg', 0.95);
            } catch (error) {
                console.error(error);
                showToast('❌ Erreur lors de la génération du JPG');
                return null;
            } finally {
                document.body.removeChild(tempDiv);
            }
        }));

        const our = new Date().getHours();
        const min = new Date().getMinutes();
        const sec = new Date().getSeconds();
        const _ = `${our}-${min}-${sec}`;

        const zip = new JSZip();

        imagesUrls.forEach((img, index) => {
            const blob = base64ToBlob(img, 'image/jpg');
            const fileName = `lions-club-rapport_${formData.meetingDate}_${_}_${index + 1}.jpg`;
            zip.file(fileName, blob);
        });
        zip.generateAsync({ type: 'blob' }).then((content) => {
            const link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = `lions-club-rapport_${formData.meetingDate}_${_}.zip`;
            link.click();
        });

    };

    return (
        <main className="min-h-screen">
            <Formulaire data={formData} onChange={setFormData} />

            <div className="min-h-screen text-slate-900 pt-4 pb-8 sm:px-8 bg-transparent">
                <div className="mx-auto grid gap-8">
                    <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto "> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                        <section className="space-y-6 rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                            <div className="grid gap-4">
                                <button type="button" onClick={apercuJpg} className="btn-primary">
                                    📊 Aperçu du rapport
                                </button>
                            </div>
                            <div className="grid gap-4 grid-cols-2">
                                <button type="button" onClick={exportJpg} className="btn-secondary">
                                    📸 Générer JPG
                                </button>
                                <button type="button" onClick={resetForm} className="btn-reset">
                                    🔄 Réinitialiser
                                </button>
                            </div>
                        </section>
                    </div>

                    <div className="grid gap-8 min-[990px]:min-w-[990px] min-[990px]:mx-auto"> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
                        <section className="rounded-[12px] bg-white/95 p-8 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
                            <div className="mb-6 text-center items-center px-4 py-3 text-primary text-[1.4em] text-semibold">
                                <h1 className="text-2xl text-center font-bold text-primary">📄 Aperçu du Rapport</h1>
                            </div>
                            {/* Preview area */}
                            <div className={`relative rounded-xl border border-border overflow-hidden bg-muted min-h-64
        transition-all duration-300`}>

                                {/* Empty state */}
                                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300
          ${isEmpty ? `opacity-100` : `opacity-0 pointer-events-none`}  light-bg`}>
                                    <div className='text-center mb-5'>
                                        <h2 className='text-2xl font-bold text-primary'>LIONS CLUB</h2>
                                        <p className="text-sm text-muted-foreground text-center text-accent">Compte-Rendu de Réunion Statutaire</p>
                                    </div>
                                    <div className="w-12 h-12 rounded-2xl bg-border/60 flex items-center justify-center">
                                        <svg className="w-6 h-6 text-muted-foreground/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                        </svg>
                                    </div>
                                    <p className="text-sm text-muted-foreground text-center text-dark-grey">Cliquez sur "Aperçu du Rapport" pour générer un aperçu</p>
                                    <p className="text-sm text-muted-foreground text-center text-dark-grey">Votre image convertie apparaîtra ici</p>
                                </div>

                                {/* Processing state */}
                                <div className={`absolute inset-0 flex items-center justify-center transition-opacity duration-300
          ${isProcessing ? `opacity-100` : `opacity-0 pointer-events-none`}`}>
                                    <ProcessingLoader label="Conversion du document en image…" />
                                </div>

                                {/* Success state */}
                                <div className={`transition-opacity duration-500
          ${isSuccess ? `opacity-100` : `opacity-0 pointer-events-none`}`}>
                                    <div className="p-3 flex flex-col items-center gap-4">
                                        {hasMultiple && (<button
                                            type="button"
                                            disabled={currentPage === 0}
                                            onClick={() => setCurrentPage((p) => Math.max(p - 1, 0))}
                                            className="text-sm text-muted-foreground disabled:opacity-40 text-left mr-auto"
                                        > Précédent </button>)}
                                        {hasMultiple && (<button
                                            type="button"
                                            disabled={currentPage >= apercuUrls.length - 1}
                                            onClick={() => setCurrentPage((p) => Math.min(p + 1, apercuUrls.length - 1))}
                                            className="text-sm text-muted-foreground disabled:opacity-40 text-right ml-auto mt-[-35px]"
                                        > Suivant </button>)}
                                        <img
                                            src={currentImage}
                                            alt="Converted document preview"
                                            className="w-full rounded-lg shadow-custom object-contain max-h-[520px] animate-fade-in-up"
                                        />
                                    </div>
                                </div>

                                {/* Error state */}
                                <div className={`absolute inset-0 flex flex-col items-center justify-center gap-3 transition-opacity duration-300
          ${isError ? `opacity-100` : `opacity-0 pointer-events-none`}`}>
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

            {
                toast && (
                    <div className="fixed right-5 top-5 z-50 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15">
                        {toast}
                    </div>
                )
            }
        </main >
    );
}


