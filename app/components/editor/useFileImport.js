'use client';

import { useCallback, useRef, useState } from 'react';
import mammoth from 'mammoth';

/**
 * Import a file into a TipTap editor (.docx, .pdf, .txt).
 * @param {import('@tiptap/react').Editor} editor
 * @param {File} file
 * @param {(msg: string) => void} [showToast]
 * @param {{ replace?: boolean }} [options] — replace: setContent vs insertContent
 */
export async function importFileToEditor(editor, file, showToast, { replace = false } = {}) {
  if (!editor) return;

  const name = file.name.toLowerCase();
  const applyHtml = (html) => {
    if (replace) {
      editor.chain().focus().setContent(html).run();
    } else {
      editor.chain().focus().insertContent(html).run();
    }
  };

  if (name.endsWith('.docx')) {
    const buffer = await file.arrayBuffer();
    const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
    const html = result.value || '';
    if (!html.trim()) {
      showToast?.('Le document est vide');
      return;
    }
    applyHtml(html);
    showToast?.('Document Word importé');
  } else if (name.endsWith('.pdf')) {
    const pdfjsLib = await import('pdfjs-dist');
    pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdfjs-dist/build/pdf.worker.mjs';

    const buffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: buffer, useWorkerFetch: false, isEvalSupported: false, useSystemFonts: true }).promise;
    const totalPages = pdf.numPages;
    const paragraphs = [];

    for (let i = 1; i <= totalPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const lines = rebuildLinesFromItems(textContent.items);

      if (totalPages > 1) {
        paragraphs.push(`<p style="font-weight:bold;color:#173d68;">— Page ${i} —</p>`);
      }

      for (const line of lines) {
        if (line.trim()) {
          paragraphs.push(`<p>${escapeHtml(line)}</p>`);
        }
      }
    }

    const html = paragraphs.join('');
    if (!html.trim()) {
      showToast?.('Le PDF ne contient pas de texte extractible');
      return;
    }
    applyHtml(html);
    showToast?.(`PDF importé (${totalPages} page${totalPages > 1 ? 's' : ''})`);
  } else if (name.endsWith('.txt')) {
    const text = await file.text();
    const html = text.split(/\n\n+/).map((p) => `<p>${escapeHtml(p.replace(/\n/g, ' '))}</p>`).join('');
    applyHtml(html);
    showToast?.('Fichier texte importé');
  } else {
    showToast?.('Format non supporté (.docx, .pdf, .txt)');
  }
}

/**
 * Handles drag-and-drop and file import for the TipTap editor.
 */
export function useFileImport(editor, showToast, { replace = false } = {}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const dragCounter = useRef(0);

  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current <= 0) {
      dragCounter.current = 0;
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const importFile = useCallback(async (file) => {
    if (!editor) return;
    setIsImporting(true);
    try {
      await importFileToEditor(editor, file, showToast, { replace });
    } catch (err) {
      console.error('Import error:', err);
      showToast?.("Erreur lors de l'import du fichier");
    } finally {
      setIsImporting(false);
    }
  }, [editor, showToast, replace]);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current = 0;
    setIsDragging(false);

    const file = e.dataTransfer?.files?.[0];
    if (file) importFile(file);
  }, [importFile]);

  return {
    isDragging,
    isImporting,
    handleDragEnter,
    handleDragLeave,
    handleDragOver,
    handleDrop,
    importFile,
  };
}

/* ── Helpers ─────────────────────────────────────────────── */

/**
 * Rebuild logical lines from pdfjs text items.
 * Items have x,y coords; group by similar y → same line.
 */
export function rebuildLinesFromItems(items) {
  if (!items.length) return [];

  const sorted = [...items].sort((a, b) => {
    const dy = a.transform[5] - b.transform[5];
    if (Math.abs(dy) > 2) return dy;
    return a.transform[4] - b.transform[4];
  });

  const lines = [];
  let currentLine = '';
  let lastY = null;

  for (const item of sorted) {
    const y = Math.round(item.transform[5]);
    if (lastY !== null && Math.abs(y - lastY) > 2) {
      lines.push(currentLine);
      currentLine = '';
    }
    currentLine += (currentLine && !currentLine.endsWith(' ') ? ' ' : '') + item.str;
    lastY = y;
  }
  if (currentLine) lines.push(currentLine);

  return lines;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
