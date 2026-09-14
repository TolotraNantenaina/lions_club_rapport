'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Color from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import Underline from '@tiptap/extension-underline';
import Highlight from '@tiptap/extension-highlight';
import FontFamily from '@tiptap/extension-font-family';
import TextAlign from '@tiptap/extension-text-align';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';
import Image from '@tiptap/extension-image';

import { useFileImport } from '../components/editor/useFileImport';
import { DropOverlay } from '../components/editor/DropOverlay';
import { EditorToolbar } from '../components/editor/EditorToolbar';

/** Lions club palette + neutrals */
const COLORS = [
  '#000000', // Noir
  '#1a3a52', // Bleu Lions
  '#2c5aa0', // Bleu accent
  '#d4af37', // Or / Jaune Lions
  '#c0392b', // Rouge
  '#27ae60', // Vert
  '#e67e22', // Orange
  '#6b7280', // Gris
];

const GRID_MAX = 8;

/**
 * TipTap rich-text editor for the "Divers" field.
 *
 * Features:
 *  - Dynamic height (auto-grow / shrink on content change)
 *  - Unified floating toolbar (on text-selection AND right-click)
 *  - Table insertion with visual grid picker
 *  - Color palette (Noir, Bleu Lions, Or/Jaune, etc.)
 *  - File import: DOCX (mammoth), PDF (pdfjs-dist), TXT
 *  - Drag & drop overlay with animation
 *
 * @param {{ content: string, onUpdate: (html: string) => void, showToast?: (msg: string) => void }} props
 */
export function DiversEditor({ content, onUpdate, showToast }) {
  const [floatingBar, setFloatingBar] = useState(null);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [gridHover, setGridHover] = useState({ r: 0, c: 0 });
  const containerRef = useRef(null);
  const barRef = useRef(null);
  const gridRef = useRef(null);
  const editorWrapRef = useRef(null);
  const toolbarEditorRef = useRef(null);

  /* ── TipTap instance ─────────────────────────────────── */
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] } }),
      Color,
      TextStyle,
      Underline,
      Highlight,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Saisissez le contenu "Divers" ici…' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
    ],
    content: content || '',
    editorProps: {
      attributes: {
        class: 'tiptap tiptap-divers min-h-[1250px] px-6 py-4 text-[15px] leading-relaxed text-slate-950 focus:outline-none',
      },
      handleDOMEvents: {
        contextmenu: (_view, event) => {
          event.preventDefault();
          setFloatingBar({ x: event.clientX, y: event.clientY, mode: 'context' });
          return true;
        },
      },
    },
    onUpdate: ({ editor: ed }) => {
      onUpdate?.(ed.getHTML());
    },
  });

  /* ── Dynamic height: let the container auto-grow/shrink ─ */
  useEffect(() => {
    const wrap = editorWrapRef.current;
    if (!wrap || !editor) return;

    const sync = () => {
      wrap.style.height = 'auto';
      wrap.style.height = `${wrap.scrollHeight}px`;
    };

    sync();
    editor.on('update', sync);
    return () => editor.off('update', sync);
  }, [editor]);

  /* ── Expose editor to EditorToolbar ────────────────────── */
  useEffect(() => {
    if (editor) toolbarEditorRef.current = editor;
  }, [editor]);

  /* ── Floating bar: show on text selection ──────────────── */
  useEffect(() => {
    if (!editor) return;

    const handleMouseUp = () => {
      window.requestAnimationFrame(() => {
        const { from, to } = editor.state.selection;
        if (from === to) return;
        const sel = window.getSelection();
        if (!sel || sel.rangeCount === 0) return;
        const range = sel.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        setFloatingBar({ x: rect.left + rect.width / 2, y: rect.top - 8, mode: 'selection' });
      });
    };

    const handleKeyDown = () => setFloatingBar(null);

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [editor]);

  /* ── Close floating bar on outside click ───────────────── */
  useEffect(() => {
    if (!floatingBar) return;
    const close = (e) => {
      if (barRef.current && barRef.current.contains(e.target)) return;
      if (gridRef.current && gridRef.current.contains(e.target)) return;
      setFloatingBar(null);
      setShowTableGrid(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [floatingBar]);

  /* ── File import ───────────────────────────────────────── */
  const { isDragging, handleDragEnter, handleDragLeave, handleDragOver, handleDrop, importFile } =
    useFileImport(editor, showToast);

  if (!editor) return null;

  /* ── Helpers ───────────────────────────────────────────── */
  const isActive = (name, attrs) => editor.isActive(name, attrs);
  const run = (cmd) => { cmd(); editor.chain().focus().run(); };

  const insertTable = (rows, cols) => {
    run(() => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run());
    setShowTableGrid(false);
    setFloatingBar(null);
  };

  /* ── Floating bar action definitions ───────────────────── */
  const barActions = [
    {
      type: 'reset',
      label: 'Normal',
      action: () => run(() => editor.chain().focus().setParagraph().unsetAllMarks().run()),
      active: !isActive('bold') && !isActive('italic') && !isActive('heading'),
    },
    { type: 'sep' },
    { type: 'toggle', label: 'B', action: () => run(() => editor.chain().focus().toggleBold().run()), active: isActive('bold'), cls: 'font-bold' },
    { type: 'toggle', label: 'I', action: () => run(() => editor.chain().focus().toggleItalic().run()), active: isActive('italic'), cls: 'italic' },
    { type: 'toggle', label: 'U', action: () => run(() => editor.chain().focus().toggleUnderline().run()), active: isActive('underline'), cls: 'underline' },
    { type: 'sep' },
    { type: 'toggle', label: 'H1', action: () => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run()), active: isActive('heading', { level: 1 }) },
    { type: 'toggle', label: 'H2', action: () => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run()), active: isActive('heading', { level: 2 }) },
    { type: 'sep' },
    { type: 'toggle', label: '•', action: () => run(() => editor.chain().focus().toggleBulletList().run()), active: isActive('bulletList') },
    { type: 'toggle', label: '1.', action: () => run(() => editor.chain().focus().toggleOrderedList().run()), active: isActive('orderedList') },
    { type: 'sep' },
    { type: 'toggle', label: '⫷', action: () => run(() => editor.chain().focus().setTextAlign('left').run()), active: isActive({ textAlign: 'left' }) },
    { type: 'toggle', label: '☰', action: () => run(() => editor.chain().focus().setTextAlign('center').run()), active: isActive({ textAlign: 'center' }) },
    { type: 'toggle', label: '⫸', action: () => run(() => editor.chain().focus().setTextAlign('right').run()), active: isActive({ textAlign: 'right' }) },
  ];

  const inTable = isActive('table');

  return (
    <div ref={containerRef} className="relative" onDragEnter={handleDragEnter} onDragLeave={handleDragLeave} onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* Hidden file input for import */}
      <input id="divers-file-input" type="file" accept=".docx,.txt,.pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />

      <DropOverlay visible={isDragging} />

      {/* Editor wrapper with dynamic height */}
      <div ref={editorWrapRef} className="rounded-lg border-2 border-neutral-300 bg-white transition-all focus-within:border-[#2c5aa0] focus-within:ring-2 focus-within:ring-[#2c5aa0]/10">
        <EditorToolbar editorRef={toolbarEditorRef} showToast={showToast} fileInputId="divers-file-input" />
        <EditorContent editor={editor} />
      </div>

      {/* ── Unified floating toolbar (portal) ──────────────── */}
      {floatingBar && createPortal(
        <div
          ref={barRef}
          className="animate-context-menu fixed z-[9999] flex items-center gap-0.5 rounded-lg bg-slate-900 p-1 shadow-xl"
          style={{ left: `${floatingBar.x}px`, top: `${floatingBar.y}px`, transform: 'translate(-50%, -100%)' }}
        >
          {barActions.map((item, i) => {
            if (item.type === 'sep') {
              return <div key={`s${i}`} className="mx-0.5 h-3 w-px bg-slate-600" />;
            }
            if (item.type === 'reset') {
              return (
                <button key="reset" type="button"
                  onClick={() => { item.action(); setFloatingBar(null); }}
                  className={`flex h-4 items-center rounded px-1 text-[8px] font-semibold transition ${item.active ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                  title="Texte normal"
                >¶</button>
              );
            }
            return (
              <button key={item.label} type="button"
                onClick={() => { item.action(); setFloatingBar(null); }}
                className={`flex h-4 w-4 items-center justify-center rounded text-[8px] font-semibold transition ${item.active ? 'bg-[#2c5aa0] text-white' : 'text-slate-300 hover:bg-slate-700'} ${item.cls || ''}`}
                title={item.label}
              >{item.label}</button>
            );
          })}

          {/* Color dots */}
          <div className="mx-0.5 h-3 w-px bg-slate-600" />
          <div className="flex items-center gap-0.5">
            {COLORS.slice(0, 4).map((c) => (
              <button key={c} type="button"
                onClick={() => { run(() => editor.chain().focus().setColor(c).run()); setFloatingBar(null); }}
                className="h-2.5 w-2.5 rounded-full border border-slate-500 transition hover:scale-125"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          {/* Table insert */}
          <div className="mx-0.5 h-3 w-px bg-slate-600" />
          <div className="relative">
            <button type="button"
              onClick={() => setShowTableGrid(!showTableGrid)}
              className="flex h-4 w-4 items-center justify-center rounded text-[8px] text-slate-300 transition hover:bg-slate-700"
              title="Insérer un tableau"
            >
                <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
              </svg>
            </button>

            {showTableGrid && (
              <div ref={gridRef} className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-slate-700 bg-slate-900 p-2 shadow-xl">
                <p className="mb-1.5 text-[10px] text-slate-400">
                  {gridHover.r > 0 ? `${gridHover.r} × ${gridHover.c}` : 'Lignes × Colonnes'}
                </p>
                <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_MAX}, 1fr)` }}>
                  {Array.from({ length: GRID_MAX * GRID_MAX }, (_, idx) => {
                    const r = Math.floor(idx / GRID_MAX) + 1;
                    const c = (idx % GRID_MAX) + 1;
                    const highlighted = r <= gridHover.r && c <= gridHover.c && gridHover.r > 0;
                    return (
                      <button key={idx} type="button"
                        className={`h-4 w-4 rounded-sm border transition ${highlighted ? 'border-[#2c5aa0] bg-[#2c5aa0]/40' : 'border-slate-600 bg-slate-800 hover:border-slate-400'}`}
                        onMouseEnter={() => setGridHover({ r, c })}
                        onClick={() => insertTable(r, c)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Context-aware table editing buttons */}
          {inTable && (
            <>
              <div className="mx-0.5 h-3 w-px bg-slate-600" />
              <button type="button" onClick={() => { run(() => editor.chain().focus().addRowAfter().run()); setFloatingBar(null); }}
                className="flex h-4 items-center rounded px-1 text-[7px] font-semibold text-slate-300 transition hover:bg-slate-700"
                title="Ajouter une ligne">+L</button>
              <button type="button" onClick={() => { run(() => editor.chain().focus().addColumnAfter().run()); setFloatingBar(null); }}
                className="flex h-4 items-center rounded px-1 text-[7px] font-semibold text-slate-300 transition hover:bg-slate-700"
                title="Ajouter une colonne">+C</button>
              <button type="button" onClick={() => { run(() => editor.chain().focus().deleteColumn().run()); setFloatingBar(null); }}
                className="flex h-4 items-center rounded px-1 text-[7px] font-semibold text-red-400 transition hover:bg-slate-700"
                title="Supprimer la colonne">-C</button>
              <button type="button" onClick={() => { run(() => editor.chain().focus().deleteRow().run()); setFloatingBar(null); }}
                className="flex h-4 items-center rounded px-1 text-[7px] font-semibold text-red-400 transition hover:bg-slate-700"
                title="Supprimer la ligne">-L</button>
              <button type="button" onClick={() => { run(() => editor.chain().focus().deleteTable().run()); setFloatingBar(null); }}
                className="flex h-4 items-center rounded px-1 text-[7px] font-semibold text-red-400 transition hover:bg-slate-700"
                title="Supprimer le tableau">✕</button>
            </>
          )}

          {/* Import */}
          <div className="mx-0.5 h-3 w-px bg-slate-600" />
          <button type="button"
            onClick={() => { document.getElementById('divers-file-input')?.click(); setFloatingBar(null); }}
            className="flex h-4 w-4 items-center justify-center rounded text-[8px] text-slate-300 transition hover:bg-slate-700"
            title="Importer un fichier (.docx, .pdf, .txt)"
          >
            <svg viewBox="0 0 24 24" className="h-2.5 w-2.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
