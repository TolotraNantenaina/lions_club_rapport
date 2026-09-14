'use client';

import { useCallback, useRef, useState } from 'react';

const STORAGE_KEY = 'lions-rapport-editor';

/**
 * Persists TipTap editor content and selected club to localStorage.
 *
 * Returns the last saved state on mount and exposes a debounced `save`
 * so the parent can wire it to editor.onUpdate without flooding writes.
 */
export function useEditorStorage() {
  const [savedContent, setSavedContent] = useState('');
  const [savedClub, setSavedClub] = useState(null);
  const timerRef = useRef(null);

  const load = useCallback(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return { html: '', club: null };
      const data = JSON.parse(raw);
      setSavedContent(data.html || '');
      setSavedClub(data.club || null);
      return data;
    } catch {
      return { html: '', club: null };
    }
  }, []);

  const save = useCallback((html, club) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        const payload = { html, club, timestamp: Date.now() };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        setSavedContent(html);
        setSavedClub(club);
      } catch { /* quota exceeded — silently ignore */ }
    }, 500);
  }, []);

  const clear = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setSavedContent('');
    setSavedClub(null);
  }, []);

  return { savedContent, savedClub, load, save, clear };
}
