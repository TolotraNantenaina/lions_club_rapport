'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

const DB_NAME = 'lions-editeur-notes';
const DB_VERSION = 1;
const STORE_NAME = 'notes';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('updatedAt', 'updatedAt');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getAllNotes() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req = store.getAll();
    req.onsuccess = () => {
      const notes = req.result.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      resolve(notes);
    };
    req.onerror = () => reject(req.error);
  });
}

async function putNote(note) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.put(note);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function deleteNoteFromDB(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export function useEditeurNotes() {
  const [notes, setNotes] = useState([]);
  const [activeNoteId, setActiveNoteId] = useState(null);
  const [initialized, setInitialized] = useState(false);
  const saveTimerRef = useRef(null);
  const activeNoteRef = useRef(null);

  /* ── Load all notes on mount ──────────────────────────── */
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await getAllNotes();
        if (cancelled) return;
        setNotes(all);
        if (all.length > 0) {
          setActiveNoteId(all[0].id);
          activeNoteRef.current = all[0];
        }
      } catch {
        /* IndexedDB unavailable — start empty */
      } finally {
        setInitialized(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* ── Active note ──────────────────────────────────────── */
  const activeNote = notes.find((n) => n.id === activeNoteId) || notes[0] || null;

  useEffect(() => {
    activeNoteRef.current = activeNote;
  }, [activeNote]);

  /* ── Create a new note ────────────────────────────────── */
  const createNote = useCallback(async () => {
    const note = {
      id: makeId(),
      title: 'Nouveau rapport',
      html: '',
      club: null,
      clubType: 'LION',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await putNote(note);
    setNotes((prev) => [note, ...prev]);
    setActiveNoteId(note.id);
    return note;
  }, []);

  /* ── Delete a note ────────────────────────────────────── */
  const deleteNote = useCallback(async (id) => {
    await deleteNoteFromDB(id);
    setNotes((prev) => {
      const next = prev.filter((n) => n.id !== id);
      if (activeNoteId === id) {
        const newActive = next[0] || null;
        setActiveNoteId(newActive?.id || null);
      }
      return next;
    });
  }, [activeNoteId]);

  /* ── Update a note (debounced) ────────────────────────── */
  const updateNote = useCallback((id, patch) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, ...patch, updatedAt: Date.now() } : n)),
    );

    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      try {
        const current = notes.find((n) => n.id === id);
        if (!current) return;
        const updated = { ...current, ...patch, updatedAt: Date.now() };
        await putNote(updated);
      } catch { /* silent */ }
    }, 400);
  }, [notes]);

  /* ── Switch active note ───────────────────────────────── */
  const selectNote = useCallback((id) => {
    setActiveNoteId(id);
  }, []);

  return {
    notes,
    activeNote,
    activeNoteId,
    initialized,
    createNote,
    deleteNote,
    updateNote,
    selectNote,
  };
}
