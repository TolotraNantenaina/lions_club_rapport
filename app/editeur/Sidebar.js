'use client';

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';

export default function Sidebar({ notes, activeNoteId, onSelect, onCreate, onDelete, onRename }) {
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState(null);
  const editInputRef = useRef(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return notes;
    const q = search.toLowerCase();
    return notes.filter(
      (n) =>
        (n.title || '').toLowerCase().includes(q) ||
        (n.club?.nomClub || '').toLowerCase().includes(q),
    );
  }, [notes, search]);

  const fmt = (ts) => {
    if (!ts) return '';
    const d = new Date(ts);
    const now = new Date();
    const diffMs = now - d;
    if (diffMs < 60_000) return "à l'instant";
    if (diffMs < 3_600_000) return `il y a ${Math.floor(diffMs / 60_000)} min`;
    if (diffMs < 86_400_000) return `il y a ${Math.floor(diffMs / 3_600_000)}h`;
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  /* ── Inline rename ────────────────────────────────────── */
  const startRename = useCallback((note) => {
    setEditingId(note.id);
    setEditValue(note.title || '');
    setContextMenu(null);
  }, []);

  const commitRename = useCallback(() => {
    if (editingId && editValue.trim()) {
      onRename?.(editingId, editValue.trim());
    }
    setEditingId(null);
    setEditValue('');
  }, [editingId, editValue, onRename]);

  const cancelRename = useCallback(() => {
    setEditingId(null);
    setEditValue('');
  }, []);

  useEffect(() => {
    if (editingId && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingId]);

  /* ── Context menu ─────────────────────────────────────── */
  const handleContextMenu = useCallback((e, note) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, note });
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close, { once: true });
    window.addEventListener('keydown', close, { once: true });
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('keydown', close);
    };
  }, [contextMenu]);

  return (
    <>
      {/* Toggle button — visible when sidebar closed */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-xl bg-[#2c5aa0] shadow-lg transition hover:bg-[#1e4a8a]"
          aria-label="Ouvrir la barre latérale"
        >
          <svg className="h-5 w-5 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
      )}

      {/* Backdrop — closes sidebar on click outside */}
      {open && (
        <div
          className="fixed inset-0 z-30 bg-black/20 backdrop-blur-sm"
          onClick={() => setOpen(false)}
        />
      )}

      {/* Sidebar panel */}
      <aside
        className={[
          'fixed top-0 left-0 z-40 flex h-full w-[320px] flex-col border-r border-slate-200/60 bg-[#f7f7f7] transition-transform duration-300 ease-out',
          open ? 'translate-x-0' : '-translate-x-full',
        ].join(' ')}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <h2 className="text-[15px] font-semibold text-slate-800">Mes rapports</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onCreate}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900"
              aria-label="Nouveau rapport"
              title="Nouveau rapport"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
            <button
              onClick={() => setOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-200/70 hover:text-slate-900"
              aria-label="Masquer la barre latérale"
              title="Masquer"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="px-4 pb-3">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              placeholder="Rechercher…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-[13px] text-slate-700 placeholder-slate-400 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
            />
          </div>
        </div>

        {/* Note list */}
        <div className="flex-1 overflow-y-auto px-2 pb-4">
          {filtered.length === 0 && (
            <p className="px-3 py-8 text-center text-[13px] text-slate-400">
              {notes.length === 0 ? 'Aucun rapport encore' : 'Aucun résultat'}
            </p>
          )}
          {filtered.map((note) => (
            <div
              key={note.id}
              onDoubleClick={() => startRename(note)}
              onContextMenu={(e) => handleContextMenu(e, note)}
            >
              {editingId === note.id ? (
                <input
                  ref={editInputRef}
                  type="text"
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') commitRename();
                    if (e.key === 'Escape') cancelRename();
                  }}
                  onBlur={commitRename}
                  className="mb-1 w-full rounded-xl border border-blue-400 bg-white px-3 py-2.5 text-[13px] font-medium text-slate-800 outline-none ring-2 ring-blue-100"
                />
              ) : (
                <button
                  onClick={() => {
                    onSelect(note.id);
                    if (window.innerWidth < 900) setOpen(false);
                  }}
                  className={[
                    'group mb-1 flex w-full flex-col rounded-xl px-3 py-2.5 text-left transition',
                    note.id === activeNoteId
                      ? 'bg-white shadow-sm ring-1 ring-slate-200/60'
                      : 'hover:bg-white/60',
                  ].join(' ')}
                >
                  <span className="text-[13px] font-medium text-slate-800 truncate">
                    {note.title || 'Sans titre'}
                  </span>
                  <span className="text-[12px] text-slate-400 truncate">
                    {note.club?.nomClub || 'Club non défini'} — {fmt(note.updatedAt)}
                  </span>
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Footer — version */}
        <div className="border-t border-slate-200/60 px-4 py-2 text-center">
          <span className="text-[11px] text-slate-400 font-mono">éditeur</span>
        </div>
      </aside>

      {/* ── Context menu ──────────────────────────────────── */}
      {contextMenu && (
        <div
          className="fixed z-50 min-w-[160px] rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          style={{ left: contextMenu.x, top: contextMenu.y }}
        >
          <button
            onClick={() => startRename(contextMenu.note)}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-slate-700 hover:bg-slate-100 transition"
          >
            <svg className="h-4 w-4 text-slate-400" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
            </svg>
            Renommer
          </button>
          <button
            onClick={() => { onDelete(contextMenu.note.id); setContextMenu(null); }}
            className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            Supprimer
          </button>
        </div>
      )}
    </>
  );
}
