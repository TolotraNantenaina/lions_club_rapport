'use client';

import { useCallback, useRef, useState, useEffect } from 'react';

const COLORS = ['#1a3a52', '#2c5aa0', '#d4af37', '#c0392b', '#27ae60', '#2c2c2c', '#000000', '#e67e22'];
const GRID_MAX = 8;

/**
 * Fixed formatting toolbar rendered inside the capture zone.
 * Reads editor instance from the shared editorRef.
 */
export function EditorToolbar({ editorRef, showToast }) {
  const [editor, setEditor] = useState(null);
  const [showColors, setShowColors] = useState(false);
  const [showTableGrid, setShowTableGrid] = useState(false);
  const [gridHover, setGridHover] = useState({ r: 0, c: 0 });
  const colorRef = useRef(null);
  const gridRef = useRef(null);

  useEffect(() => {
    const check = () => {
      if (editorRef?.current) {
        setEditor(editorRef.current);
      } else {
        const id = setTimeout(check, 200);
        return () => clearTimeout(id);
      }
    };
    const id = setTimeout(check, 200);
    return () => clearTimeout(id);
  }, [editorRef]);

  useEffect(() => {
    if (!showColors && !showTableGrid) return;
    const close = (e) => {
      if (colorRef.current && colorRef.current.contains(e.target)) return;
      if (gridRef.current && gridRef.current.contains(e.target)) return;
      setShowColors(false);
      setShowTableGrid(false);
    };
    window.addEventListener('mousedown', close);
    return () => window.removeEventListener('mousedown', close);
  }, [showColors, showTableGrid]);

  const run = useCallback((cmd) => {
    if (!editor) return;
    cmd();
    editor.chain().focus().run();
  }, [editor]);

  if (!editor) return null;

  const isActive = (name, attrs) => editor.isActive(name, attrs);

  const insertTable = (rows, cols) => {
    run(() => editor.chain().focus().insertTable({ rows, cols, withHeaderRow: true }).run());
    setShowTableGrid(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5 border-t border-slate-200 bg-slate-50 px-4 pt-4 pb-3">

      {/* ── Headings ──────────────────────────────────── */}
      <Group label="Titres">
        <TBtn active={isActive('heading', { level: 1 })} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 1 }).run())} title="Titre 1">
          <span className="text-sm font-bold leading-none">H1</span>
        </TBtn>
        <TBtn active={isActive('heading', { level: 2 })} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} title="Titre 2">
          <span className="text-sm font-bold leading-none">H2</span>
        </TBtn>
        <TBtn active={isActive('heading', { level: 3 })} onClick={() => run(() => editor.chain().focus().toggleHeading({ level: 3 }).run())} title="Titre 3">
          <span className="text-sm font-bold leading-none">H3</span>
        </TBtn>
      </Group>

      <Sep />

      {/* ── Inline formatting ─────────────────────────── */}
      <Group label="Texte">
        <TBtn active={isActive('bold')} onClick={() => run(() => editor.chain().focus().toggleBold().run())} title="Gras">
          <span className="font-bold">B</span>
        </TBtn>
        <TBtn active={isActive('italic')} onClick={() => run(() => editor.chain().focus().toggleItalic().run())} title="Italique">
          <span className="italic">I</span>
        </TBtn>
        <TBtn active={isActive('underline')} onClick={() => run(() => editor.chain().focus().toggleUnderline().run())} title="Souligné">
          <span className="underline">U</span>
        </TBtn>
        <TBtn active={isActive('strike')} onClick={() => run(() => editor.chain().focus().toggleStrike().run())} title="Barré">
          <span className="line-through">S</span>
        </TBtn>
      </Group>

      <Sep />

      {/* ── Lists ─────────────────────────────────────── */}
      <Group label="Listes">
        <TBtn active={isActive('bulletList')} onClick={() => run(() => editor.chain().focus().toggleBulletList().run())} title="Liste à puces">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
        </TBtn>
        <TBtn active={isActive('orderedList')} onClick={() => run(() => editor.chain().focus().toggleOrderedList().run())} title="Liste numérotée">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10 6h11M10 12h11M10 18h11M4 6V2l-1 1M3 10h2M3 14h2M4 18l-1 1"/></svg>
        </TBtn>
        <TBtn active={isActive('blockquote')} onClick={() => run(() => editor.chain().focus().toggleBlockquote().run())} title="Citation">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><path d="M6 17h3l2-4V7H5v6h3zm8 0h3l2-4V7h-6v6h3z"/></svg>
        </TBtn>
      </Group>

      <Sep />

      {/* ── Alignment ─────────────────────────────────── */}
      <Group label="Alignement">
        <TBtn active={isActive({ textAlign: 'left' })} onClick={() => run(() => editor.chain().focus().setTextAlign('left').run())} title="Gauche">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h12M3 18h16"/></svg>
        </TBtn>
        <TBtn active={isActive({ textAlign: 'center' })} onClick={() => run(() => editor.chain().focus().setTextAlign('center').run())} title="Centré">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M6 12h12M4 18h16"/></svg>
        </TBtn>
        <TBtn active={isActive({ textAlign: 'right' })} onClick={() => run(() => editor.chain().focus().setTextAlign('right').run())} title="Droite">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M9 12h12M5 18h16"/></svg>
        </TBtn>
        <TBtn active={isActive({ textAlign: 'justify' })} onClick={() => run(() => editor.chain().focus().setTextAlign('justify').run())} title="Justifié">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </TBtn>
      </Group>

      <Sep />

      {/* ── Table insert ─────────────────────────────── */}
      <div className="relative" ref={gridRef}>
        <TBtn active={showTableGrid} onClick={() => { setShowTableGrid(!showTableGrid); setShowColors(false); }} title="Insérer un tableau">
          <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="18" height="18" rx="2" /><path d="M3 9h18M3 15h18M9 3v18M15 3v18" />
          </svg>
        </TBtn>
        {showTableGrid && (
          <div className="absolute left-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white p-2.5 shadow-xl">
            <p className="mb-1.5 text-xs text-slate-500">
              {gridHover.r > 0 ? `${gridHover.r} × ${gridHover.c}` : 'Lignes × Colonnes'}
            </p>
            <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${GRID_MAX}, 1fr)` }}>
              {Array.from({ length: GRID_MAX * GRID_MAX }, (_, idx) => {
                const r = Math.floor(idx / GRID_MAX) + 1;
                const c = (idx % GRID_MAX) + 1;
                const highlighted = r <= gridHover.r && c <= gridHover.c && gridHover.r > 0;
                return (
                  <button key={idx} type="button"
                    className={`h-4 w-4 rounded-sm border transition
                      ${highlighted ? 'border-[#2c5aa0] bg-[#2c5aa0]/30' : 'border-slate-200 bg-slate-100 hover:border-slate-400'}`}
                    onMouseEnter={() => setGridHover({ r, c })}
                    onClick={() => insertTable(r, c)} />
                );
              })}
            </div>
          </div>
        )}
      </div>

      <Sep />

      {/* ── Color picker ──────────────────────────────── */}
      <div className="relative" ref={colorRef}>
        <TBtn active={showColors} onClick={() => { setShowColors(!showColors); setShowTableGrid(false); }} title="Couleur du texte">
          <div className="flex flex-col items-center">
            <span className="text-sm font-bold">A</span>
            <div className="h-1.5 w-4 rounded-sm bg-[#c0392b]" />
          </div>
        </TBtn>
        {showColors && (
          <div className="absolute left-0 top-full z-50 mt-1 flex gap-1.5 rounded-lg border border-slate-200 bg-white p-2 shadow-xl">
            {COLORS.map((c) => (
              <button key={c} type="button"
                onClick={() => { run(() => editor.chain().focus().setColor(c).run()); setShowColors(false); }}
                className="h-7 w-7 rounded-full border border-slate-200 transition hover:scale-125"
                style={{ backgroundColor: c }} title={c} />
            ))}
          </div>
        )}
      </div>

      <Sep />

      {/* ── Import ────────────────────────────────────── */}
      <TBtn onClick={() => document.getElementById('editor-file-input')?.click()} title="Importer un fichier">
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></svg>
      </TBtn>

    </div>
  );
}

/* ── Helpers ────────────────────────────────────────────── */
function Group({ label, children }) {
  return (
    <div className="flex items-center gap-1" title={label}>
      {children}
    </div>
  );
}

function Sep() {
  return <div className="mx-1 h-7 w-px bg-slate-300" />;
}

function TBtn({ active, onClick, title, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`flex h-10 w-10 items-center justify-center rounded-lg text-base transition
        ${active ? 'bg-[#2c5aa0] text-white shadow-sm' : 'text-slate-600 hover:bg-slate-200'}`}
    >
      {children}
    </button>
  );
}
