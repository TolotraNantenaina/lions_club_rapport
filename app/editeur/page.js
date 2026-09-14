'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import html2canvas from 'html2canvas';

import { useClubsData } from '../helpers/useClubsData';
import { useEditeurNotes } from './useEditeurNotes';
import Sidebar from './Sidebar';
import { EditorHeader } from '../components/editor/EditorHeader';
import { TipTapEditor } from '../components/editor/TipTapEditor';
import { base64ToBlob } from '../helpers/bas64ToBlob';
import { prepareHtml2CanvasClone } from '../helpers/html2canvasUtils';
import { JpgDownloadModal } from '../components/JpgDownloadModal';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { CLUB_TYPE, filterClubsByTypeAndQuery, normalizeClubType } from '../../lib/clubSearchFilter';

const CAPTURE_WIDTH = 1240;
const A4_HEIGHT = 1740;

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
  const [toolbarHidden, setToolbarHidden] = useState(false);
  const editorRef = useRef(null);
  const scaleContainerRef = useRef(null);
  const captureRef = useRef(null);

  /* ── Zoom directly on #rapport-capture ─────────────────── */
  useEffect(() => {
    const container = scaleContainerRef.current;
    const capture = captureRef.current;
    if (!container || !capture) return;

    const updateZoom = () => {
      const available = container.clientWidth;
      const ratio = available / CAPTURE_WIDTH;
      const z = Math.min(1, Math.max(0.4, ratio));
      capture.style.zoom = z;
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

  /* ── Multi-page JPG export ────────────────────────────── */
  const exportJpg = useCallback(async () => {
    const captureZone = document.getElementById('rapport-capture');
    if (!captureZone) return;

    // Reset zoom for accurate capture
    const prevZoom = captureZone.style.zoom;
    captureZone.style.zoom = '1';

    const club = selectedClub?.nomClub || 'rapport';
    const type = selectedClub?.typeClub ? `_${selectedClub.typeClub}` : '';
    const baseName = `Rapport_${club}${type}`;

    setDownloadModal({ baseName, images: [], isLoading: true });

    try {
      await document.fonts.ready;

      const totalHeight = captureZone.scrollHeight || captureZone.offsetHeight;
      const totalPages = Math.max(1, Math.ceil(totalHeight / A4_HEIGHT));

      const images = [];

      for (let page = 0; page < totalPages; page++) {
        const y = page * A4_HEIGHT;
        const h = Math.min(A4_HEIGHT, totalHeight - y);

        // Anti-cut: find elements that cross the boundary and push them
        if (page < totalPages - 1) {
          const boundary = (page + 1) * A4_HEIGHT;
          applyAntiCutStyles(captureZone, boundary);
        }

        const canvas = await html2canvas(captureZone, {
          scale: 2,
          backgroundColor: '#ffffff',
          useCORS: true,
          allowTaint: true,
          width: CAPTURE_WIDTH,
          height: totalHeight,
          windowWidth: CAPTURE_WIDTH,
          windowHeight: totalHeight,
          x: 0,
          y: y,
          logging: false,
          letterRendering: true,
          onclone: (clonedDocument, clonedElement) => {
            const el = clonedElement.firstElementChild || clonedElement;
            prepareHtml2CanvasClone(captureZone, clonedDocument, el);

            // Force white background on cloned capture
            const clonedCapture = clonedDocument.getElementById('rapport-capture');
            if (clonedCapture) {
              clonedCapture.style.background = '#ffffff';
              clonedCapture.style.minHeight = 'auto';
              clonedCapture.style.height = `${totalHeight}px`;
              clonedCapture.style.overflow = 'visible';

              // Apply anti-cut styles on clone
              if (page < totalPages - 1) {
                const boundary = (page + 1) * A4_HEIGHT;
                applyAntiCutStylesOnClone(clonedCapture, boundary, y);
              }
            }
          },
        });

        // Clean up anti-cut styles
        if (page < totalPages - 1) {
          removeAntiCutStyles(captureZone);
        }

        const imageUrl = canvas.toDataURL('image/jpeg', 0.95);
        images.push(imageUrl);
      }

      setDownloadModal({ baseName, images, isLoading: false });
    } catch (err) {
      console.error(err);
      showToast('Erreur lors de la génération du JPG');
      setDownloadModal(null);
    } finally {
      captureZone.style.zoom = prevZoom;
    }
  }, [selectedClub, showToast]);

  const downloadSingleJpg = useCallback((imageUrl, fileName) => {
    const blob = base64ToBlob(imageUrl, 'image/jpeg');
    const link = document.createElement('a');
    const objectUrl = URL.createObjectURL(blob);
    link.href = objectUrl;
    link.download = fileName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
  }, []);

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
          <button
            type="button"
            onClick={exportJpg}
            className="inline-flex items-center gap-2 rounded-xl bg-[#d4af37] px-6 py-3 text-sm font-bold text-[#1a3a52] shadow-lg shadow-[#d4af37]/25 transition-all hover:scale-105 hover:bg-[#e5c158] hover:shadow-xl active:scale-95 h-[52px]"
          >
            📸 Exporter JPG
          </button>
        </div>

        {/* ── Editor card ───────────────────────────────── */}
        <section className="overflow-hidden rounded-2xl bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.12)]">
          <div ref={scaleContainerRef} className="overflow-hidden">
            <div
              ref={captureRef}
              id="rapport-capture"
              className="bg-white text-black border border-gray-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] select-none"
            >
              <EditorToolbar editorRef={editorRef} showToast={showToast} hidden={toolbarHidden} onToggleHide={() => setToolbarHidden((v) => !v)} />
              <EditorHeader clubType={clubType} selectedClub={selectedClub} />
              <TipTapEditor
                editorRef={editorRef}
                content={activeNote?.html || ''}
                onUpdate={handleEditorUpdate}
                showToast={showToast}
              />
            </div>
          </div>
        </section>
      </div>

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
          onDownloadPage={downloadSingleJpg}
        />
      )}

      {/* ── Footer ──────────────────────────────────────── */}
      <footer className="fixed bottom-2 right-6 z-40 opacity-70 pointer-events-none select-none text-center">
        <span className="text-xs text-slate-500 font-mono">
          v{require('../../package.json').version} - éditeur
        </span>
      </footer>
    </main>
  );
}

/* ── Anti-cut helpers ───────────────────────────────────── */
const ANTI_CUT_ATTR = 'data-anti-cut';

/**
 * Scan block-level elements and table rows. If an element crosses
 * the page boundary, push it to the next page via break-before.
 * For <tr>: if the row straddles the boundary, push the entire row.
 */
function applyAntiCutStyles(container, boundary) {
  // First handle <tr> specifically — they must not be split
  const rows = container.querySelectorAll('tr');
  rows.forEach((tr) => {
    const rect = tr.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elTop = rect.top - containerRect.top;
    const elBottom = elTop + rect.height;

    if (elTop < boundary && elBottom > boundary + 5) {
      tr.setAttribute(ANTI_CUT_ATTR, 'true');
      tr.style.breakBefore = 'page';
    }
  });

  // Then handle other block elements
  const blocks = container.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, img');
  blocks.forEach((el) => {
    // Skip if inside a table (handled above)
    if (el.closest('table')) return;

    const rect = el.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const elTop = rect.top - containerRect.top;
    const elBottom = elTop + rect.height;

    if (elTop < boundary && elBottom > boundary + 5) {
      el.setAttribute(ANTI_CUT_ATTR, 'true');
      el.style.breakBefore = 'page';
    }
  });
}

function applyAntiCutStylesOnClone(clone, boundary, offset) {
  const rows = clone.querySelectorAll('tr');
  rows.forEach((tr) => {
    const elTop = tr.offsetTop;
    const elBottom = elTop + tr.offsetHeight;
    const relBoundary = boundary - offset;

    if (elTop < relBoundary && elBottom > relBoundary + 5) {
      // Force the row to render fully on next page
      tr.style.breakBefore = 'page';
      tr.style.pageBreakBefore = 'always';
    }
  });

  const blocks = clone.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, blockquote, img');
  blocks.forEach((el) => {
    if (el.closest('table')) return;
    const elTop = el.offsetTop;
    const elBottom = elTop + el.offsetHeight;
    const relBoundary = boundary - offset;

    if (elTop < relBoundary && elBottom > relBoundary + 5) {
      el.style.breakBefore = 'page';
      el.style.pageBreakBefore = 'always';
    }
  });
}

function removeAntiCutStyles(container) {
  container.querySelectorAll(`[${ANTI_CUT_ATTR}]`).forEach((el) => {
    el.removeAttribute(ANTI_CUT_ATTR);
    el.style.breakBefore = '';
    el.style.pageBreakBefore = '';
  });
}
