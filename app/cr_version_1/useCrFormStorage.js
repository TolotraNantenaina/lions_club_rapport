'use client';

import { useCallback, useRef, useState, useEffect } from 'react';
import { initialData } from '../constantes/initialData';

const STORAGE_KEY = 'lions-cr-v1-form';

const TREASURY_FIELDS = ['adminBalance', 'worksBalance', 'headQuartersFees', 'districtFees', 'regionFees', 'treasuryOther'];

function hasText(value) {
  return Boolean(String(value ?? '').trim());
}

/**
 * Brouillons antérieurs aux options OUI / NON : on affiche la section
 * si elle contenait déjà des données, pour ne rien perdre à l’export.
 */
function migrateSavedForm(saved) {
  const next = { ...saved };
  if (!next.treasuryEnabled) {
    next.treasuryEnabled = TREASURY_FIELDS.some((key) => hasText(saved[key])) ? 'OUI' : 'NON';
  }
  if (!next.lcifEnabled) {
    next.lcifEnabled = hasText(saved.pointLCIF) ? 'OUI' : 'NON';
  }
  return next;
}

/**
 * Persists the full CR form state (all fields + TipTap "Divers" HTML)
 * to localStorage with debounced writes for Offline-First PWA support.
 *
 * @returns {{ formData: object, setFormData: Function, load: Function, clear: Function }}
 */
export function useCrFormStorage() {
  const [formData, setFormData] = useState(initialData);
  const [initialized, setInitialized] = useState(false);
  const timerRef = useRef(null);

  /* ── Load on mount ─────────────────────────────────────── */
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw);
        if (saved && typeof saved === 'object') {
          setFormData((prev) => ({ ...prev, ...migrateSavedForm(saved) }));
        }
      }
    } catch {
      /* corrupted data — silently ignore */
    } finally {
      setInitialized(true);
    }
  }, []);

  /* ── Debounced save ────────────────────────────────────── */
  const persist = useCallback((data) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...data, _ts: Date.now() }));
      } catch {
        /* quota exceeded — silently ignore */
      }
    }, 400);
  }, []);

  /** Update one or more fields and persist */
  const updateFormData = useCallback(
    (partial) => {
      setFormData((prev) => {
        const next = typeof partial === 'function' ? partial(prev) : { ...prev, ...partial };
        persist(next);
        return next;
      });
    },
    [persist],
  );

  /** Clear localStorage and reset all fields (cancels any pending debounced save) */
  const clear = useCallback(() => {
    clearTimeout(timerRef.current);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage unavailable — silently ignore */
    }
    setFormData({ ...initialData });
  }, []);

  /** Reset all fields */
  const resetFormData = clear;

  return { formData, setFormData: updateFormData, resetFormData, clear, initialized };
}
