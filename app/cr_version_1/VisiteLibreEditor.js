'use client';

import { useCallback, useRef, useState } from 'react';
import { TipTapEditor } from '../components/editor/TipTapEditor';
import { EditorToolbar } from '../components/editor/EditorToolbar';
import { ProcessingLoader } from '../components/processingLoader';
import { CLUB_TYPE, normalizeClubType } from '../../lib/clubSearchFilter';
import { importFileToEditor } from '../components/editor/useFileImport';

/**
 * Éditeur pleine page (même UX que /editeur) pour les visites officielles.
 */
export function VisiteLibreEditor({ formData, content, onUpdate, showToast }) {
  const editorRef = useRef(null);
  const scaleContainerRef = useRef(null);
  const captureRef = useRef(null);
  const dragCounterRef = useRef(0);

  const [toolbarHidden, setToolbarHidden] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  const clubType = normalizeClubType(formData.clubType) === CLUB_TYPE.LEO
    ? CLUB_TYPE.LEO
    : CLUB_TYPE.LION;

  const selectedClub = {
    nomClub: formData.clubName,
    Region: formData.region,
    Zone: formData.zone,
    numeroAffiliation: formData.numeroAffiliation,
    clubLogoUrl: formData.clubLogoUrl,
  };

  const handleImportFile = useCallback(async (file) => {
    const editor = editorRef.current;
    if (!editor || !file) return;
    setIsImporting(true);
    try {
      await importFileToEditor(editor, file, showToast, { replace: true });
    } catch (err) {
      console.error('Import error:', err);
      showToast?.("Erreur lors de l'import du fichier");
    } finally {
      setIsImporting(false);
    }
  }, [showToast]);

  return (
    <div className="grid gap-8 min-[1200px]:min-w-[990px] min-[1200px]:mx-auto">
      <section className={`overflow-hidden rounded-[12px] bg-white/95 shadow-[0_20px_60px_rgba(0,0,0,0.12)] ${isImporting ? 'pointer-events-none select-none' : ''}`}>
        <div ref={scaleContainerRef} className="relative flex w-full flex-col items-center overflow-hidden">
          {isImporting && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-white/85 backdrop-blur-[2px]">
              <ProcessingLoader label="Import du document…" color="text-slate-900" />
            </div>
          )}

          <div className="sticky top-0 z-30 w-full max-w-[1240px] border border-b-0 border-gray-200/50 bg-slate-50 shadow-sm">
            <EditorToolbar
              editorRef={editorRef}
              showToast={showToast}
              hidden={toolbarHidden}
              onToggleHide={() => setToolbarHidden((v) => !v)}
              sticky={false}
            />
          </div>

          <div className="w-full max-w-[1240px]">
            <TipTapEditor
              editorRef={editorRef}
              content={content || ''}
              clubType={clubType}
              selectedClub={selectedClub}
              typeFor="editor"
              hideToolbar
              captureRef={captureRef}
              scaleContainerRef={scaleContainerRef}
              onUpdate={onUpdate}
              showToast={showToast}
              toolbarHidden={toolbarHidden}
              onToggleHide={() => setToolbarHidden((v) => !v)}
              onImportingChange={setIsImporting}
              showDropOverlay={isDragging && !isImporting}
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
            />
          </div>
        </div>
      </section>
    </div>
  );
}
