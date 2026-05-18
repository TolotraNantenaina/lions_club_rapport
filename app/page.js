'use client';

import { useMemo, useRef, useState, useEffect } from 'react';
import { initialData } from './constantes/initialData';
import Formulaire from './components/formulaire';
import { getPreviewCRBlocks, PreviewCRPage , PAGE_HEIGHT, PAGE_WIDTH, PAGE_BOTTOM_SAFE_SPACE} from './components/preview';
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

    const createPreviewContainer = (htmlString) => {
        const tempDiv = document.createElement('div');
        tempDiv.style.width = `${PAGE_WIDTH}px`;
        tempDiv.style.height = `${PAGE_HEIGHT}px`;
        tempDiv.style.background = '#ffffff';
        tempDiv.style.position = 'fixed';
        tempDiv.style.left = '-9999px';
        tempDiv.style.top = '0';
        tempDiv.style.zIndex = '9999';
        tempDiv.innerHTML = htmlString;
        document.body.appendChild(tempDiv);

        return tempDiv;
    };

    const isPreviewPageOverflowing = (blocks, pageNumber) => {
        const htmlString = renderToStaticMarkup(<PreviewCRPage blocks={blocks} pageNumber={pageNumber} headerData={formData} />);
        const tempDiv = createPreviewContainer(htmlString);
        const pageElement = tempDiv.querySelector('article') || tempDiv.firstElementChild;
        const contentElement = tempDiv.querySelector('[data-preview-flow="true"]');

        if (!pageElement || !contentElement) {
            document.body.removeChild(tempDiv);
            return false;
        }

        const pageRect = pageElement.getBoundingClientRect();
        const contentRect = contentElement.getBoundingClientRect();
        const isOverflowing = contentRect.bottom > pageRect.bottom - PAGE_BOTTOM_SAFE_SPACE;

        document.body.removeChild(tempDiv);

        return isOverflowing;
    };

    const buildDynamicPreviewPages = () => {
        const blocks = getPreviewCRBlocks(formData);
        const pages = [];
        let currentBlocks = [];

        blocks.forEach((block) => {
            const candidateBlocks = [...currentBlocks, block];
            const pageNumber = pages.length + 1;

            if (currentBlocks.length > 0 && isPreviewPageOverflowing(candidateBlocks, pageNumber)) {
                pages.push(currentBlocks);
                currentBlocks = [block];
            } else {
                currentBlocks = candidateBlocks;
            }
        });

        if (currentBlocks.length > 0) {
            pages.push(currentBlocks);
        }

        return pages.map((blocks, index) => (
            <PreviewCRPage key={`preview-cr-${index}`} blocks={blocks} pageNumber={index + 1} headerData={formData} />
        ));
    };

    const renderHtmlToJpg = async (htmlString, errorMessage) => {
        const tempDiv = createPreviewContainer(htmlString);

        try {
            const canvas = await html2canvas(tempDiv, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                allowTaint: true,
                width: PAGE_WIDTH,
                height: PAGE_HEIGHT,
                windowHeight: PAGE_HEIGHT,
                logging: false,
                letterRendering: true,
                onclone: (clonedDoc) => {
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
            showToast(errorMessage);
            return null;
        } finally {
            document.body.removeChild(tempDiv);
        }
    };

    const generatePreviewImages = async (errorMessage) => {
        await document.fonts.ready;

        const prevuePages = buildDynamicPreviewPages();
        const htmlStrings = prevuePages.map((Page) => renderToStaticMarkup(Page));
        const imagesUrls = await Promise.all(
            htmlStrings.map((htmlString) => renderHtmlToJpg(htmlString, errorMessage))
        );

        return imagesUrls.filter(Boolean);
    };

    const apercuJpg = async () => {
        setApercuLoading(true);
        setApercuValide(false);

        const validImages = await generatePreviewImages('❌ Erreur lors de la génération de l’aperçu');
        setApercuUrls(validImages);
        setApercuValide(true);
        setApercuLoading(false);
    };

    const exportJpg = async () => {
        showToast('⏳ Génération en cours...');
        const imagesUrls = await generatePreviewImages('❌ Erreur lors de la génération du JPG');

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
        <main className="min-h-screen mx-8">

            <div className="text-slate-900 pt-8 bg-transparent">

                <header className="text-center text-white mb-7">
                    <div className="mx-auto py-3 flex h-[60px] items-center justify-center gap-2">
                        <img src="/ico_lions_club_transparent.png" alt="Logo Lions Club" className="h-[55px] w-[55px] mb-2" />
                        <h1 className='text-[1.8rem] mb-2 font-bold tracking-tight sm:text-[2.5rem]'> Lions Club</h1>
                    </div>
                    <p className='text-[1.1em]'>Compte-Rendu de Réunion Statutaire</p>
                </header>

            </div>

            <Formulaire data={formData} onChange={setFormData} />

            <div className="text-slate-900 pt-4 pb-8 bg-transparent">
                <div className="mx-auto grid gap-8">
                    <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto"> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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

                    <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto"> {/*  xl:grid-cols-[1.2fr_0.8fr]"> */}
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
            
            <footer className="fixed bottom-2 right-6 z-40 opacity-70 pointer-events-none select-none text-center">
                <span className="text-xs text-slate-500 font-mono">
                    v{require('../package.json').version} - {require('../package.json').name}
                </span>
            </footer>
   
        </main >
    );
}


