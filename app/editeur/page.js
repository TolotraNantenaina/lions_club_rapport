'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

import { useClubsData } from '../helpers/useClubsData';
import { useEditeurNotes } from './useEditeurNotes';
import Sidebar from './Sidebar';
import { TipTapEditor } from '../components/editor/TipTapEditor';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { JpgDownloadModal } from '../components/JpgDownloadModal';
import { ProcessingLoader } from '../components/processingLoader';
import { CLUB_TYPE, filterClubsByTypeAndQuery, normalizeClubType } from '../../lib/clubSearchFilter';
import { exportMultiPageJpg, exportMultiPagePdf, downloadSingleJpg } from './exportUtils';
import { DropOverlay } from '../components/editor/DropOverlay';
import { importFileToEditor } from '../components/editor/useFileImport';

export default function EditeurPage() {
  const { clubsData, clubsLoading, clubsError } = useClubsData();
  const { notes, activeNote, activeNoteId, initialized, createNote, deleteNote, updateNote, selectNote } = useEditeurNotes();

  const [selectedClub, setSelectedClub] = useState(null);
  const [clubType, setClubType] = useState(CLUB_TYPE.LION);
  const [clubSearch, setClubSearch] = useState('');
  const [isClubDropdownOpen, setIsClubDropdownOpen] = useState(false);
  const clubSearchInputRef = useRef(null);

  const [toast, setToast] = useState('');
  const [downloadModal, setDownloadModal] = useState(null);
  const [pdfExporting, setPdfExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const editorRef = useRef(null);
  const scaleContainerRef = useRef(null);
  const zoomWrapperRef = useRef(null);
  const captureRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragCounterRef = useRef(0);

  /* ── Zoom on report body only (toolbar stays sticky, unaffected) ─ */
  useEffect(() => {
    const container = scaleContainerRef.current;
    const zoomWrapper = zoomWrapperRef.current;
    if (!container || !zoomWrapper) return;

    const updateZoom = () => {
      const available = container.clientWidth;
      const ratio = available / 1240;
      const z = Math.min(1, Math.max(0.4, ratio));
      zoomWrapper.style.zoom = z;
    };

    updateZoom();
    const ro = new ResizeObserver(updateZoom);
    ro.observe(container);
    return () => ro.disconnect();
  }, []);

  const filteredClubOptions = useMemo(
    () => filterClubsByTypeAndQuery(clubsData, clubType, clubSearch),
    [clubsData, clubType, clubSearch],
  );

  useEffect(() => {
    if (activeNote) {
      setSelectedClub(activeNote.club || null);
      setClubSearch(activeNote.club?.nomClub || '');
      if (activeNote.club?.typeClub) {
        setClubType(normalizeClubType(activeNote.club.typeClub) === CLUB_TYPE.LEO ? CLUB_TYPE.LEO : CLUB_TYPE.LION);
      }
    }
  }, [activeNote]);

  const handleClubTypeChange = useCallback((type, event) => {
    event.preventDefault();
    event.stopPropagation();
    setClubType(type);
    setClubSearch('');
    setIsClubDropdownOpen(true);
    window.requestAnimationFrame(() => clubSearchInputRef.current?.focus());
  }, []);

  const selectClub = useCallback((clubName) => {
    setClubSearch(clubName);
    setIsClubDropdownOpen(false);
    const club = clubsData.find(
      (c) => normalizeClubType(c.typeClub) === normalizeClubType(clubType) && c.nomClub?.trim() === clubName,
    );
    if (club) {
      setSelectedClub(club);
      if (activeNoteId) {
        updateNote(activeNoteId, { club });
      }
    }
  }, [clubsData, clubType, activeNoteId, updateNote]);

  const showToast = useCallback((message) => {
    setToast(message);
    window.clearTimeout(window.toastTimeout);
    window.toastTimeout = window.setTimeout(() => setToast(''), 3500);
  }, []);

  const renameNote = useCallback((id, newTitle) => {
    updateNote(id, { title: newTitle });
  }, [updateNote]);

  const handleEditorUpdate = useCallback((html) => {
    if (activeNoteId) {
      updateNote(activeNoteId, { html });
    }
  }, [activeNoteId, updateNote]);

  /* ── Multi-page JPG export (Node Distribution Loop) ──── */
  const exportJpg = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const html = editor.getHTML();
    setDownloadModal({ baseName: '', images: [], isLoading: true });

    try {
      const result = await exportMultiPageJpg(html, selectedClub, showToast);
      if (result.images.length === 0) {
        setDownloadModal(null);
        return;
      }
      setDownloadModal({ baseName: result.baseName, images: result.images, isLoading: false });
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la génération du JPG');
      setDownloadModal(null);
    }
  }, [selectedClub, showToast]);

  const exportPdf = useCallback(async () => {
    const editor = editorRef.current;
    if (!editor || pdfExporting) return;

    const html = editor.getHTML();
    setPdfExporting(true);
    try {
      const ok = await exportMultiPagePdf(html, selectedClub, activeNote?.title, showToast);
      if (ok) showToast('PDF téléchargé');
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la génération du PDF');
    } finally {
      setPdfExporting(false);
    }
  }, [selectedClub, activeNote?.title, pdfExporting, showToast]);

  const handleDownloadSingleJpg = useCallback((imageUrl, fileName) => {
    downloadSingleJpg(imageUrl, fileName);
  }, []);

  const handleImportFile = useCallback(async (file) => {
    const editor = editorRef.current;
    if (!editor || !file) return;

    setIsImporting(true);
    try {
      await importFileToEditor(editor, file, showToast, { replace: true });
    } catch (err) {
      console.error('Import error:', err);
      showToast("Erreur lors de l'import du fichier");
    } finally {
      setIsImporting(false);
    }
  }, [showToast]);

  return (
    <main className="min-h-screen bg-transparent">
      {/* ── Sidebar ──────────────────────────────────────── */}
      <Sidebar
        notes={notes}
        activeNoteId={activeNoteId}
        onSelect={selectNote}
        onCreate={createNote}
        onDelete={deleteNote}
        onRename={renameNote}
      />

      {/* ── Global header ───────────────────────────────── */}
      <div className="text-slate-900 pt-8 bg-transparent">
        <header className="relative mb-7 mx-auto w-full min-[1200px]:max-w-[990px]">
          <div className="text-center">
            <div className="mx-auto flex h-[60px] items-center justify-center gap-2 py-3">
              <img src="/ico_lions_club_transparent.png" alt="Logo Lions Club" className="mb-2 h-[55px] w-[55px]" />
              <h1 className="mb-2 text-[1.8rem] font-bold tracking-tight text-white sm:text-[2.5rem]">Lions Club</h1>
            </div>
            <p className="text-[1.1em] text-white">Éditeur de Rapport</p>
          </div>
        </header>
      </div>

      {/* ── Main grid ───────────────────────────────────── */}
      <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto w-full min-[1200px]:px-40 min-[900px]:px-32 max-[900px]:px-8 my-8">

        {/* ── Export + Club selector row ────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between w-full">
          <div className="relative flex-1 sm:max-w-[480px]">
            <label className="space-y-2">
              <span className="text-[0.95em] font-semibold text-primary mb-[8px] block">Club</span>
              <div className="relative">
                <input
                  ref={clubSearchInputRef}
                  type="text"
                  placeholder="Rechercher un club..."
                  value={clubSearch}
                  autoComplete="off"
                  onChange={(e) => { setClubSearch(e.target.value); setIsClubDropdownOpen(true); }}
                  onFocus={() => setIsClubDropdownOpen(true)}
                  onBlur={() => window.setTimeout(() => setIsClubDropdownOpen(false), 120)}
                  className="form-input bg-light-grey pt-[12px] pr-[7.5rem]"
                />
                <div
                  className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center rounded-[10px] bg-[#d4af37] p-1"
                  onMouseDown={(event) => event.preventDefault()}
                >
                  <button type="button" aria-pressed={clubType === CLUB_TYPE.LION} onClick={(e) => handleClubTypeChange(CLUB_TYPE.LION, e)}
                    className={['rounded-[8px] px-3 py-1 text-sm font-semibold transition', clubType === CLUB_TYPE.LION ? 'bg-accent text-white shadow-sm' : 'text-slate-800 hover:text-primary'].join(' ')}>Lion</button>
                  <button type="button" aria-pressed={clubType === CLUB_TYPE.LEO} onClick={(e) => handleClubTypeChange(CLUB_TYPE.LEO, e)}
                    className={['rounded-[8px] px-3 py-1 text-sm font-semibold transition', clubType === CLUB_TYPE.LEO ? 'bg-accent text-white shadow-sm' : 'text-slate-800 hover:text-primary'].join(' ')}>Leo</button>
                </div>
                {isClubDropdownOpen && (
                  <div className="absolute z-30 mt-2 max-h-64 w-full overflow-y-auto rounded-lg border-2 border-[var(--border)] bg-white shadow-[0_16px_35px_rgba(0,0,0,0.14)]">
                    {clubsLoading ? (
                      <p className="px-4 py-3 text-[0.95em] text-dark-grey">Chargement des clubs...</p>
                    ) : clubsError ? (
                      <p className="px-4 py-3 text-[0.95em] text-red-600">{clubsError}</p>
                    ) : filteredClubOptions.length > 0 ? (
                      filteredClubOptions.map((clubName) => (
                        <button key={clubName} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => selectClub(clubName)}
                          className="block w-full px-4 py-3 text-left text-[0.95em] text-slate-800 transition hover:bg-[rgba(44,90,160,0.08)] hover:text-primary">{clubName}</button>
                      ))
                    ) : (
                      <p className="px-4 py-3 text-[0.95em] text-dark-grey">Aucun club trouvé</p>
                    )}
                  </div>
                )}
              </div>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3 max-w-[640px]:w-full">
            <button
              type="button"
              onClick={exportJpg}
              disabled={pdfExporting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#d4af37] mt-1 max-w-[640px]:ml-0 px-4 py-3 text-sm font-bold text-[#1a3a52] shadow-lg shadow-[#d4af37]/25 transition-all hover:scale-105 hover:bg-[#e5c158] hover:shadow-xl active:scale-95 h-[50px] disabled:pointer-events-none disabled:opacity-60"
            >
              📸 <span className="truncate">Exporter JPG</span>
            </button>
            <button
              type="button"
              onClick={exportPdf}
              disabled={pdfExporting}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-[#7a1f2b] mt-1 max-w-[640px]:ml-0 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-[#7a1f2b]/30 transition-all hover:scale-105 hover:bg-[#952636] hover:shadow-xl active:scale-95 h-[50px] disabled:pointer-events-none disabled:opacity-60"
            >
              <svg aria-hidden="true" viewBox="0 0 24 24" className="h-6 w-6 shrink-0" fill="#d4af37">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zm1 7V3.5L19.5 9zM8.5 17.5v-4H10c.8 0 1.3.4 1.3 1.1 0 .7-.5 1.1-1.3 1.1H9.3v1.8zm.8-2.4h.6c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-.6zm3 2.4v-4h1.1c1.1 0 1.8.6 1.8 2s-.7 2-1.8 2zm.8-1.6h.3c.5 0 .9-.3.9-1.1s-.4-1.1-.9-1.1h-.3zm2.6 1.6v-4H17c.9 0 1.4.4 1.4 1.1 0 .5-.3.9-.7 1l.9 1.9h-.9l-.8-1.7h-.4v1.7zm.8-2.4h.5c.3 0 .5-.2.5-.5s-.2-.5-.5-.5h-.5z" />
              </svg>
              <span className="truncate">Exporter PDF</span>
            </button>
            </div>

        </div>

        {/* ── Editor card ───────────────────────────────── */}
        <section className={`rounded-2xl bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.12)] ${pdfExporting || isImporting ? 'pointer-events-none select-none' : ''}`}>
          <div
            ref={scaleContainerRef}
            className="relative flex w-full flex-col items-center"
          >
            {isImporting && (
              <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/85 backdrop-blur-[2px]">
                <ProcessingLoader label="Import du document…" color="text-slate-900" />
              </div>
            )}

            {/* Sticky toolbar — outside zoom & #rapport-capture (excluded from export) */}
            <div className="sticky top-0 z-30 w-full max-w-[1240px] border border-b-0 border-gray-200/50 bg-slate-50 shadow-sm">
              <EditorToolbar
                editorRef={editorRef}
                showToast={showToast}
                hidden={toolbarHidden}
                onToggleHide={() => setToolbarHidden((v) => !v)}
                sticky={false}
              />
            </div>

            <div ref={zoomWrapperRef} className="w-full max-w-[1240px]">
              <div
                ref={captureRef}
                id="rapport-capture"
                className="w-[1240px] max-w-full bg-white text-black border border-t-0 border-gray-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] select-none"
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dragCounterRef.current += 1;
                  setIsDragging(true);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dragCounterRef.current -= 1;
                  if (dragCounterRef.current <= 0) {
                    dragCounterRef.current = 0;
                    setIsDragging(false);
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dragCounterRef.current = 0;
                  setIsDragging(false);
                  const file = e.dataTransfer?.files?.[0];
                  if (file) handleImportFile(file);
                }}
              >
                <TipTapEditor
                  editorRef={editorRef}
                  content={activeNote?.html || ''}
                  clubType={clubType}
                  selectedClub={selectedClub}
                  typeFor="editor"
                  hideToolbar
                  onUpdate={handleEditorUpdate}
                  showToast={showToast}
                  toolbarHidden={toolbarHidden}
                  onToggleHide={() => setToolbarHidden((v) => !v)}
                  onImportingChange={setIsImporting}
                />
                <DropOverlay visible={isDragging && !isImporting} />
              </div>
            </div>
          </div>
        </section>
      </div>

      {pdfExporting && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/55 backdrop-blur-[2px]">
          <div className="rounded-2xl bg-white px-8 py-4 shadow-2xl">
            <ProcessingLoader label="Génération du PDF…" />
          </div>
        </div>
      )}

      {/* ── Toast ───────────────────────────────────────── */}
      {toast && (
        <div className="fixed right-5 top-5 z-50 rounded-2xl bg-emerald-500 px-5 py-4 text-sm font-semibold text-white shadow-lg shadow-slate-950/15">
          {toast}
        </div>
      )}

      {/* ── Download modal ──────────────────────────────── */}
      {downloadModal && (
        <JpgDownloadModal
          baseName={downloadModal.baseName}
          images={downloadModal.images}
          isLoading={downloadModal.isLoading}
          onClose={() => setDownloadModal(null)}
          onDownloadPage={handleDownloadSingleJpg}
        />
      )}

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="fixed bottom-2 right-6 z-40 opacity-70 pointer-events-none select-none text-center">
        <span className="text-xs text-slate-500 font-mono">
          v{require('../../package.json').version_editor} - éditeur
        </span>
      </footer>
    </main>
  );
}
