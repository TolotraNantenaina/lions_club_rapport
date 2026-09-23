'use client';

import { renderToStaticMarkup } from 'react-dom/server';
import html2canvas from 'html2canvas';
import {
  PreviewCRPage,
  getPreviewCRBlocks,
  PAGE_HEIGHT,
  PAGE_WIDTH,
  PAGE_PADDING_Y,
  HEADER_HEIGHT,
  BODY_HEIGHT,
  SAFE_BOTTOM_MARGIN,
} from './PreviewV1';
import { prepareHtml2CanvasClone } from '../helpers/html2canvasUtils';
import { base64ToBlob } from '../helpers/bas64ToBlob';

/* ═══ Container helpers ════════════════════════════════════ */

/**
 * Create a measurement container: no overflow, no fixed height,
 * so scrollHeight returns the TRUE content height.
 */
function createMeasurementContainer(widthPx) {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;left:-9999px;top:0;z-index:-1;width:${widthPx}px;background:#fff;overflow:visible;`;
  document.body.appendChild(div);
  return div;
}

/**
 * Create a capture container for html2canvas: exact A4 dimensions.
 */
function createCaptureContainer(widthPx, heightPx) {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;left:-9999px;top:0;z-index:-1;width:${widthPx}px;height:${heightPx}px;background:#fff;`;
  document.body.appendChild(div);
  return div;
}

function removeContainer(div) {
  if (div && div.parentNode) div.parentNode.removeChild(div);
}

/* ═══ Element height measurement ═══════════════════════════ */

/**
 * Measure a single HTML element's rendered height at the content width.
 */
function measureElementHeight(el, widthPx) {
  const m = document.createElement('div');
  m.style.cssText = `position:fixed;left:-9999px;top:0;width:${widthPx}px;font-size:20px;line-height:1.35;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;overflow:visible;`;
  m.appendChild(el.cloneNode(true));
  document.body.appendChild(m);
  const h = m.scrollHeight;
  document.body.removeChild(m);
  return h;
}

/**
 * Render blocks + header into an unconstrained container
 * and return the TRUE total content height (no overflow clipping).
 */
function measureBlocksHeight(blocks, pageNumber, headerData) {
  const html = renderToStaticMarkup(
    <PreviewCRPage blocks={blocks} pageNumber={pageNumber} headerData={headerData} />
  );
  const container = createMeasurementContainer(PAGE_WIDTH);
  container.innerHTML = html;

  // Remove article height/overflow constraints so scrollHeight is accurate
  const article = container.querySelector('article');
  if (article) {
    article.style.height = 'auto';
    article.style.overflow = 'visible';
  }

  const flow = container.querySelector('[data-preview-flow="true"]');
  const h = flow ? flow.scrollHeight : container.scrollHeight;
  removeContainer(container);
  return h;
}

/* ═══ HTML block splitting (Node Distribution Loop) ════════ */

/**
 * Split a TipTap htmlBlock into page-sized HTML chunks.
 *
 * Algorithm:
 *  1. Parse into top-level DOM elements (p, table, h1-h6, ul, ol…)
 *  2. Measure each element's rendered height
 *  3. Accumulate until cumulative height exceeds availableHeight → new chunk
 *  4. If a single <table> exceeds availableHeight, split at <tr> boundary
 *     and clone <thead> on continuation pages
 */
function splitHtmlBlockAcrossPages(html, availableHeight) {
  if (!html || !html.trim()) return [html];

  const contentWidth = PAGE_WIDTH - PAGE_PADDING_Y * 2;
  const measurementDiv = createMeasurementContainer(contentWidth);
  measurementDiv.style.fontSize = '20px';
  measurementDiv.style.lineHeight = '1.35';
  measurementDiv.style.fontFamily = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

  const wrapper = document.createElement('div');
  wrapper.className = 'tiptap-preview-divers';
  wrapper.innerHTML = html;
  measurementDiv.appendChild(wrapper);

  const children = Array.from(wrapper.children);
  if (children.length === 0) {
    removeContainer(measurementDiv);
    return [html];
  }

  function measureEl(el) {
    return measureElementHeight(el, contentWidth);
  }

  /**
   * Split a <table> that is too tall into multiple sub-tables,
   * each with a cloned <thead>.
   */
  function splitTable(tableEl, maxH) {
    const thead = tableEl.querySelector('thead');
    const rows = Array.from(tableEl.querySelectorAll('tbody tr'));
    if (rows.length === 0) return [tableEl.outerHTML];

    const theadHtml = thead ? thead.outerHTML : '';
    const tableStyle = 'border-collapse:collapse;width:100%;margin:0.5em 0;border:1px solid #e5e7eb;';
    const parts = [];
    let currentRows = [];
    let currentH = 0;

    rows.forEach((row) => {
      const rowH = measureEl(row);
      if (currentRows.length > 0 && currentH + rowH > maxH) {
        parts.push(`<table style="${tableStyle}">${theadHtml}<tbody>${currentRows.map((r) => r.outerHTML).join('')}</tbody></table>`);
        currentRows = [row];
        currentH = rowH;
      } else {
        currentRows.push(row);
        currentH += rowH;
      }
    });

    if (currentRows.length > 0) {
      parts.push(`<table style="${tableStyle}">${theadHtml}<tbody>${currentRows.map((r) => r.outerHTML).join('')}</tbody></table>`);
    }

    return parts;
  }

  const chunks = [];
  let currentElements = [];
  let currentH = 0;

  children.forEach((child) => {
    const elH = measureEl(child);

    // Table too tall → flush current chunk, then split the table
    if (child.tagName === 'TABLE' && elH > availableHeight) {
      if (currentElements.length > 0) {
        chunks.push(currentElements.map((e) => e.outerHTML).join(''));
        currentElements = [];
        currentH = 0;
      }
      const tableParts = splitTable(child, availableHeight);
      tableParts.forEach((partHtml) => {
        const holder = document.createElement('div');
        holder.innerHTML = partHtml;
        const tableEl = holder.firstElementChild;
        if (tableEl) {
          const partH = measureEl(tableEl);
          if (currentH + partH > availableHeight && currentElements.length > 0) {
            chunks.push(currentElements.map((e) => e.outerHTML).join(''));
            currentElements = [];
            currentH = 0;
          }
          currentElements.push(tableEl);
          currentH += partH;
        }
      });
      return;
    }

    // Normal element: check if it fits on current chunk
    if (currentH + elH > availableHeight && currentElements.length > 0) {
      chunks.push(currentElements.map((e) => e.outerHTML).join(''));
      currentElements = [child];
      currentH = elH;
    } else {
      currentElements.push(child);
      currentH += elH;
    }
  });

  if (currentElements.length > 0) {
    chunks.push(currentElements.map((e) => e.outerHTML).join(''));
  }

  removeContainer(measurementDiv);
  return chunks.length > 0 ? chunks : [html];
}

/* ═══ Dynamic page builder (Node Distribution Loop) ════════ */

/**
 * Split all blocks into A4-sized pages.
 *
 * Algorithm:
 *  1. Flatten: split htmlBlock into individual DOM elements
 *  2. For each element, measure its rendered height
 *  3. Accumulate elements into a page until the cumulative height
 *     (HEADER_HEIGHT + padding + content) exceeds PAGE_HEIGHT
 *  4. When overflow → push current page, start new page with the element
 *  5. Merge footer-only last page into previous
 *
 * @returns {Array<{ blocks: Array, pageNumber: number }>}
 */
function buildDynamicPages(formData) {
  const allBlocks = getPreviewCRBlocks(formData);
  const maxBodyH = BODY_HEIGHT - SAFE_BOTTOM_MARGIN;

  // Flatten: split htmlBlock into individual elements for granular splitting
  const flatBlocks = [];
  allBlocks.forEach((block) => {
    if (block.type === 'htmlBlock') {
      const chunks = splitHtmlBlockAcrossPages(block.html, maxBodyH);
      chunks.forEach((chunkHtml, idx) => {
        // CRITICAL: use type 'htmlBlock' so CRBlock renders it
        flatBlocks.push({ type: 'htmlBlock', html: chunkHtml, chunkIndex: idx });
      });
    } else {
      flatBlocks.push(block);
    }
  });

  // Build pages by accumulating blocks until overflow
  const pages = [];
  let currentBlocks = [];

  flatBlocks.forEach((block) => {
    const candidate = [...currentBlocks, block];
    const pageNum = pages.length + 1;

    if (currentBlocks.length > 0) {
      const h = measureBlocksHeight(candidate, pageNum, formData);
      if (h > PAGE_HEIGHT - SAFE_BOTTOM_MARGIN) {
        pages.push(currentBlocks);
        currentBlocks = [block];
        return;
      }
    }

    currentBlocks = candidate;
  });

  if (currentBlocks.length > 0) pages.push(currentBlocks);

  // Merge footer-only last page into previous
  if (pages.length > 1) {
    const last = pages[pages.length - 1];
    if (last.length === 1 && last[0].type === 'footer') {
      pages[pages.length - 2] = [...pages[pages.length - 2], last[0]];
      pages.pop();
    }
  }

  return pages.map((blocks, i) => ({ blocks, pageNumber: i + 1 }));
}

/* ═══ Single-page capture to JPG ═══════════════════════════ */

/**
 * Render one page's blocks into a clean off-screen container
 * (exact A4 dimensions, no transforms) and capture via html2canvas.
 *
 * NO overflow:hidden on the parent — only the article's fixed height
 * constrains the content.
 */
async function capturePageAsCanvas(blocks, pageNumber, formData, showToast, errorLabel = 'JPG') {
  const html = renderToStaticMarkup(
    <PreviewCRPage blocks={blocks} pageNumber={pageNumber} headerData={formData} />
  );

  const container = createCaptureContainer(PAGE_WIDTH, PAGE_HEIGHT);
  container.innerHTML = html;
  const sourceRoot = container.firstElementChild || container;

  try {
    return await html2canvas(container, {
      scale: 2,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      windowWidth: PAGE_WIDTH,
      windowHeight: PAGE_HEIGHT,
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: true,
      logging: false,
      letterRendering: true,
      onclone: (clonedDoc, clonedEl) => {
        const clone = clonedEl.firstElementChild || clonedEl;

        // ── Strip ALL transforms/zoom ──
        clone.style.transform = 'none';
        clone.style.zoom = '1';

        // Force exact A4 dimensions on cloned container
        clonedEl.style.width = `${PAGE_WIDTH}px`;
        clonedEl.style.height = `${PAGE_HEIGHT}px`;
        clonedEl.style.transform = 'none';
        clonedEl.style.zoom = '1';
        clonedEl.style.position = 'fixed';
        clonedEl.style.left = '0';
        clonedEl.style.top = '0';

        // Fix the article
        const article = clonedDoc.querySelector('article');
        if (article) {
          article.style.transform = 'none';
          article.style.zoom = '1';
          article.style.width = `${PAGE_WIDTH}px`;
          article.style.height = `${PAGE_HEIGHT}px`;
          article.style.overflow = 'hidden';
        }

        // Strip computed transforms from all descendants
        clonedDoc.querySelectorAll('*').forEach((el) => {
          try {
            const computed = clonedDoc.defaultView?.getComputedStyle(el);
            if (computed && computed.transform && computed.transform !== 'none') {
              el.style.transform = 'none';
            }
          } catch { /* ignore */ }
        });

        // Color sanitization (oklch → fallback)
        prepareHtml2CanvasClone(sourceRoot, clonedDoc, clone);
      },
    });
  } catch (error) {
    console.error(`capturePageAsCanvas error (${errorLabel}):`, error);
    showToast?.(`Erreur lors de la génération du ${errorLabel}`);
    return null;
  } finally {
    removeContainer(container);
  }
}

async function capturePageAsJpg(blocks, pageNumber, formData, showToast) {
  const canvas = await capturePageAsCanvas(blocks, pageNumber, formData, showToast, 'JPG');
  return canvas ? canvas.toDataURL('image/jpeg', 0.95) : null;
}

function sanitizeExportName(name) {
  return String(name || 'rapport')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    || 'rapport';
}

/* ═══ Main export function ══════════════════════════════════ */

/**
 * Multi-page JPG export.
 *
 * 1. buildDynamicPages splits blocks into A4-sized pages.
 * 2. Each page rendered independently via renderToStaticMarkup
 *    into a clean off-screen container (no shared DOM, no zoom/transforms).
 * 3. html2canvas captures each page at 2x scale.
 * 4. Returns { baseName, images[] }.
 */
export async function exportMultiPageJpg(formData, showToast) {
  const clubName = formData.clubName || 'rapport';
  const clubType = formData.clubType ? `_${formData.clubType}` : '';
  const baseName = `Rapport_Lions_${clubName}${clubType}`;

  try {
    await document.fonts.ready;

    const pages = buildDynamicPages(formData);
    const images = [];

    for (let i = 0; i < pages.length; i++) {
      const { blocks, pageNumber } = pages[i];
      const url = await capturePageAsJpg(blocks, pageNumber, formData, showToast);
      if (url) images.push(url);
    }

    return { baseName, images };
  } catch (err) {
    console.error('exportMultiPageJpg error:', err);
    showToast?.('❌ Erreur lors de la génération du JPG');
    return { baseName, images: [] };
  }
}

/* ═══ Multi-page PDF export (jsPDF, client-side) ═══════════ */

/**
 * Reuses buildDynamicPages (A4 1240×1740 blocks), captures each
 * page with html2canvas (scale 2, white background), then fills
 * an A4 portrait PDF (210×297 mm) without extra margins.
 */
export async function exportMultiPagePdf(formData, showToast) {
  const nomDeLaNote = sanitizeExportName(formData.clubName || 'rapport');

  try {
    await document.fonts.ready;

    const { jsPDF } = await import('jspdf');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pages = buildDynamicPages(formData);

    let addedPages = 0;
    for (let index = 0; index < pages.length; index++) {
      const { blocks, pageNumber } = pages[index];
      const canvas = await capturePageAsCanvas(blocks, pageNumber, formData, showToast, 'PDF');
      if (!canvas) continue;

      const imgData = canvas.toDataURL('image/jpeg', 1.0);
      if (addedPages > 0) pdf.addPage();
      pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297);
      addedPages += 1;
    }

    if (addedPages === 0) {
      showToast?.('❌ Erreur lors de la génération du PDF');
      return false;
    }

    pdf.save(`Rapport_Lions_${nomDeLaNote}.pdf`);
    return true;
  } catch (err) {
    console.error('exportMultiPagePdf error:', err);
    showToast?.('❌ Erreur lors de la génération du PDF');
    return false;
  }
}

/* ═══ Preview images (same pipeline as export) ═════════════ */

/**
 * Generate preview images using the EXACT same pipeline as export.
 * WYSIWYG: what the user sees in the preview = what the JPG contains.
 */
export async function generatePreviewImagesFromFormData(formData, showToast) {
  try {
    await document.fonts.ready;

    const pages = buildDynamicPages(formData);
    const images = [];

    for (let i = 0; i < pages.length; i++) {
      const { blocks, pageNumber } = pages[i];
      const url = await capturePageAsJpg(blocks, pageNumber, formData, showToast);
      if (url) images.push(url);
    }

    return images;
  } catch (err) {
    console.error('generatePreviewImagesFromFormData error:', err);
    showToast?.('❌ Erreur lors de la génération de l\'aperçu');
    return [];
  }
}

/* ═══ Download helper ══════════════════════════════════════ */

export function downloadSingleJpg(imageUrl, fileName) {
  const blob = base64ToBlob(imageUrl, 'image/jpeg');
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);
  link.href = objectUrl;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
}
