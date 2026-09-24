'use client';

import { useEffect, useRef, useState } from 'react';
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

import { EditorToolbar } from './EditorToolbar';
import { DropOverlay } from './DropOverlay';
import { useFileImport } from './useFileImport';
import { EditorHeader } from './EditorHeader';

const COLORS = ['#1a3a52', '#2c5aa0', '#d4af37', '#c0392b', '#27ae60', '#2c2c2c', '#000000', '#e67e22'];
const GRID_MAX = 8;
const PAGE_WIDTH = 1240;

export function TipTapEditor({
  editorRef,
  content,
  typeFor,
  clubType,
  selectedClub,
  onUpdate,
  showToast,
  toolbarHidden,
  onToggleHide,
  onImportingChange,
  hideToolbar = false,
  captureRef,
  scaleContainerRef,
  onDragEnter,
  onDragLeave,
  onDragOver,
  onDrop,
  showDropOverlay = false,
}) {
  const isEditorPage = typeFor === 'editor';
  const [floatingBar, setFloatingBar] = useState(null);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [gridHover, setGridHover] = useState({ r: 0, c: 0 });
  const editorWrapRef = useRef(null);
  const barRef = useRef(null);
  const gridRef = useRef(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Color,
      TextStyle,
      Underline,
      Highlight,
      FontFamily,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Commencez à écrire votre rapport…' }),
      Table.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      Image,
    ],
    content,
    editorProps: {
      attributes: {
        class: 'tiptap px-[120px] pb-[70px] text-[26px] leading-snug text-slate-950 focus:outline-none',
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

  const { isImporting, importFile } = useFileImport(editor, showToast, { replace: true });

  useEffect(() => {
    if (editorRef) editorRef.current = editor;
  }, [editor, editorRef]);

  useEffect(() => {
    onImportingChange?.(isImporting);
  }, [isImporting, onImportingChange]);

  /* ── Auto-zoom #rapport-capture (mode éditeur, comme commit 1500e48) ─ */
  useEffect(() => {
    if (!isEditorPage || !editor) return;

    const container = scaleContainerRef?.current;
    const capture = captureRef?.current;
    if (!container || !capture) return;

    const updateZoom = () => {
      const available = container.clientWidth;
      const ratio = available / PAGE_WIDTH;
      const z = Math.min(1, Math.max(0.4, ratio));
      capture.style.zoom = z;
    };

    updateZoom();
    const ro = new ResizeObserver(updateZoom);
    ro.observe(container);
    return () => ro.disconnect();
  }, [isEditorPage, editor, scaleContainerRef, captureRef]);

  const prevContentRef = useRef(content);
  useEffect(() => {
    if (!editor) return;
    if (content !== prevContentRef.current && content !== editor.getHTML()) {
      editor.commands.setContent(content || '', false);
    }
    prevContentRef.current = content;
  }, [content, editor]);

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

  useEffect(() => {
    if (!floatingBar) return;
    const close = (e) => {
      if (barRef.current?.contains(e.target)) return;
      if (gridRef.current?.contains(e.target)) return;
      setFloatingBar(null);
      setShowTableGrid(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [floatingBar]);

  if (!editor) return null;

  const isActive = (name, attrs) => editor.isActive(name, attrs);
  const inTable = isActive('table');
  const run = (cmd) => { cmd(); editor.chain().focus().run(); };

  const insertTable = (rows, cols) => {
    run(() => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run());
    setShowTableGrid(false);
    setFloatingBar(null);
  };

  const barActions = [
    { id: 'reset', type: 'reset', label: 'Normal', action: () => run(() => editor.chain().focus().setParagraph().unsetAllMarks().run()), active: !isActive('bold') && !isActive('italic') && !isActive('heading') },
    { id: 'sep-1', type: 'sep' },
    { id: 'bold', type: 'toggle', label: 'B', action: () => run(() => editor.chain().focus().toggleBold().run()), active: isActive('bold'), cls: 'font-bold' },
    { id: 'italic', type: 'toggle', label: 'I', action: () => run(() => editor.chain().focus().toggleItalic().run()), active: isActive('italic'), cls: 'italic' },
    { id: 'underline', type: 'toggle', label: 'U', action: () => run(() => editor.chain().focus().toggleUnderline().run()), active: isActive('underline'), cls: 'underline' },
    { id: 'sep-2', type: 'sep' },
    { id: 'h1', type: 'toggle', label: 'H1', action: () => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run()), active: isActive('heading', { level: 1 }) },
    { id: 'h2', type: 'toggle', label: 'H2', action: () => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run()), active: isActive('heading', { level: 2 }) },
    { id: 'sep-3', type: 'sep' },
    { id: 'bullet', type: 'toggle', label: '•', action: () => run(() => editor.chain().focus().toggleBulletList().run()), active: isActive('bulletList') },
    { id: 'ordered', type: 'toggle', label: '1.', action: () => run(() => editor.chain().focus().toggleOrderedList().run()), active: isActive('orderedList') },
    { id: 'sep-4', type: 'sep' },
    { id: 'align-left', type: 'toggle', label: '⫷', action: () => run(() => editor.chain().focus().setTextAlign('left').run()), active: isActive({ textAlign: 'left' }) },
    { id: 'align-center', type: 'toggle', label: '☰', action: () => run(() => editor.chain().focus().setTextAlign('center').run()), active: isActive({ textAlign: 'center' }) },
    { id: 'align-right', type: 'toggle', label: '⫸', action: () => run(() => editor.chain().focus().setTextAlign('right').run()), active: isActive({ textAlign: 'right' }) },
  ];

  const rootRef = isEditorPage ? captureRef : editorWrapRef;

  let rootClassName;
  if (isEditorPage) {
    rootClassName = 'relative bg-white text-black border border-t-0 border-gray-200/50 shadow-[0_20px_50px_rgba(0,0,0,0.3)] select-none';
  } else if (hideToolbar) {
    rootClassName = 'relative';
  } else {
    rootClassName = 'relative border-t border-slate-200/80';
  }

  return (
    <div
      ref={rootRef}
      id={isEditorPage ? 'rapport-capture' : undefined}
      className={rootClassName}
      onDragEnter={isEditorPage ? onDragEnter : undefined}
      onDragLeave={isEditorPage ? onDragLeave : undefined}
      onDragOver={isEditorPage ? onDragOver : undefined}
      onDrop={isEditorPage ? onDrop : undefined}
    >
      <input
        id="editor-file-input"
        type="file"
        accept=".docx,.txt,.pdf"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) {
            importFile(f);
          }
          e.target.value = '';
        }}
      />

      {!hideToolbar && (
        <EditorToolbar
          editorRef={editorRef}
          showToast={showToast}
          hidden={toolbarHidden}
          onToggleHide={onToggleHide}
        />
      )}
      {isEditorPage && clubType && (
        <EditorHeader clubType={clubType} selectedClub={selectedClub} />
      )}
      <EditorContent editor={editor} />

      {isEditorPage && <DropOverlay visible={showDropOverlay} />}

      {floatingBar && createPortal(
        <div
          ref={barRef}
          className="animate-context-menu fixed z-[9999] flex items-center gap-1 rounded-lg bg-slate-900 p-1.5 shadow-xl"
          style={{ left: `${floatingBar.x}px`, top: `${floatingBar.y}px`, transform: 'translate(-50%, -100%)' }}
        >
          {barActions.map((item) => {
            if (item.type === 'sep') return <div key={item.id} className="mx-0.5 h-5 w-px bg-slate-600" />;
            if (item.type === 'reset') {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { item.action(); setFloatingBar(null); }}
                  className={`flex h-7 items-center rounded-md px-2 text-xs font-semibold transition ${item.active ? 'bg-slate-700 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                  title="Texte normal"
                >
                  ¶
                </button>
              );
            }
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => { item.action(); setFloatingBar(null); }}
                className={`flex h-7 w-7 items-center justify-center rounded-md text-xs font-semibold transition ${item.active ? 'bg-[#2c5aa0] text-white' : 'text-slate-300 hover:bg-slate-700'} ${item.cls || ''}`}
                title={item.label}
              >
                {item.label}
              </button>
            );
          })}

          <div className="mx-0.5 h-5 w-px bg-slate-600" />
          <div className="flex items-center gap-0.5">
            {COLORS.slice(0, 5).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => { run(() => editor.chain().focus().setColor(c).run()); setFloatingBar(null); }}
                className="h-3.5 w-3.5 rounded-full border border-slate-500 transition hover:scale-125"
                style={{ backgroundColor: c }}
                title={c}
              />
            ))}
          </div>

          <div className="mx-0.5 h-5 w-px bg-slate-600" />
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowTableGrid(!showTableGrid)}
              className="flex h-7 w-7 items-center justify-center rounded-md text-xs text-slate-300 transition hover:bg-slate-700"
              title="Insérer un tableau"
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
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
                      <button
                        key={idx}
                        type="button"
                        className={`h-4 w-4 rounded-sm border transition
                          ${highlighted ? 'border-[#2c5aa0] bg-[#2c5aa0]/40' : 'border-slate-600 bg-slate-800 hover:border-slate-400'}`}
                        onMouseEnter={() => setGridHover({ r, c })}
                        onClick={() => insertTable(r, c)}
                      />
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {inTable && (
            <>
              <div className="mx-0.5 h-5 w-px bg-slate-600" />
              <button type="button" onClick={() => { run(() => editor.chain().focus().addRowAfter().run()); setFloatingBar(null); }}
                className="flex h-7 items-center rounded-md px-2 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700"
                title="Ajouter une ligne">+Ligne</button>
              <button type="button" onClick={() => { run(() => editor.chain().focus().addColumnAfter().run()); setFloatingBar(null); }}
                className="flex h-7 items-center rounded-md px-2 text-[10px] font-semibold text-slate-300 transition hover:bg-slate-700"
                title="Ajouter une colonne">+Col</button>
              <button type="button" onClick={() => { run(() => editor.chain().focus().deleteColumn().run()); setFloatingBar(null); }}
                className="flex h-7 items-center rounded-md px-2 text-[10px] font-semibold text-red-400 transition hover:bg-slate-700"
                title="Supprimer la colonne">−Col</button>
              <button type="button" onClick={() => { run(() => editor.chain().focus().deleteRow().run()); setFloatingBar(null); }}
                className="flex h-7 items-center rounded-md px-2 text-[10px] font-semibold text-red-400 transition hover:bg-slate-700"
                title="Supprimer la ligne">−Ligne</button>
              <button type="button" onClick={() => { run(() => editor.chain().focus().deleteTable().run()); setFloatingBar(null); }}
                className="flex h-7 items-center rounded-md px-2 text-[10px] font-semibold text-red-400 transition hover:bg-slate-700"
                title="Supprimer le tableau">🗑</button>
            </>
          )}

          <div className="mx-0.5 h-5 w-px bg-slate-600" />
          <button
            type="button"
            onClick={() => { document.getElementById('editor-file-input')?.click(); setFloatingBar(null); }}
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs text-slate-300 transition hover:bg-slate-700"
            title="Importer"
          >
            <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
          </button>
        </div>,
        document.body,
      )}
    </div>
  );
}
