'use client';

import html2canvas from 'html2canvas';
import { prepareHtml2CanvasClone } from '../helpers/html2canvasUtils';
import { base64ToBlob } from '../helpers/bas64ToBlob';

/* ═══ Page constants (must match #rapport-capture CSS) ════ */

const PAGE_WIDTH = 1240;
const PAGE_HEIGHT = 1740;
const CONTENT_PADDING_X = 120;
const CONTENT_WIDTH = PAGE_WIDTH - CONTENT_PADDING_X * 2;
const CONTENT_FONT_SIZE = 26;
const CONTENT_LINE_HEIGHT = 1.375;
const CONTENT_FONT_FAMILY = "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";

/* ═══ Header height (matches EditorHeader structure) ══════ */

// pt-[70px] + 155px logo + mb-[32px] + pb-[10px] = 267px
const HEADER_HEIGHT = 270;
const BODY_BOTTOM_PADDING = 70;
const AVAILABLE_BODY_HEIGHT = PAGE_HEIGHT - HEADER_HEIGHT - BODY_BOTTOM_PADDING;

/* ═══ Container helpers ════════════════════════════════════ */

function createMeasurementContainer(widthPx) {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;left:-9999px;top:0;z-index:-1;width:${widthPx}px;background:#fff;overflow:visible;`;
  document.body.appendChild(div);
  return div;
}

function createCaptureContainer(widthPx, heightPx) {
  const div = document.createElement('div');
  div.style.cssText = `position:fixed;left:-9999px;top:0;z-index:-1;width:${widthPx}px;height:${heightPx}px;background:#fff;`;
  document.body.appendChild(div);
  return div;
}

function removeContainer(div) {
  if (div && div.parentNode) div.parentNode.removeChild(div);
}

/* ═══ Build header HTML from club data═════════════════════ */

function buildHeaderHtml(clubData) {
  const club = clubData || {};
  const logoSrc = club.clubLogoUrl || '';
  const isLeo = (club.typeClub || '').toLowerCase() === 'leo';
  const clubLabel = isLeo ? 'LEO' : 'LIONS';

  return `
    <div style="padding: 70px 70px 10px 70px;">
      <header style="margin-bottom: 32px; display: flex; align-items: flex-start; justify-content: space-between; text-align: center;">
        <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 155px; height: 155px;">
          <img src="/ico_lions_club.png" alt="Logo" style="width: 155px; height: 155px;" crossorigin="anonymous" />
        </div>
        <div style="flex: 1; text-align: center;">
          <h1 style="font-size: 42px; font-weight: 900; line-height: 1.1; letter-spacing: 0.05em; color: #173d68; margin: 0;">${clubLabel} CLUB</h1>
          <h2 style="font-size: 38px; font-weight: 900; line-height: 1.1; letter-spacing: 0.05em; color: #173d68; margin: 0;">${club.nomClub || 'Nom du club'}</h2>
          <p style="margin-top: 8px; font-size: 22px; font-weight: 600; color: #173d68;">DISTRICT 417 – ${club.Region || 'Région'} – ${club.Zone || 'Zone'}</p>
          <p style="margin-top: 12px; font-size: 18px; color: #334155;">N° Club : ${club.numeroAffiliation || '–'}</p>
        </div>
        <div style="flex-shrink: 0; display: flex; align-items: center; justify-content: center; width: 155px; height: 155px;">
          ${logoSrc
            ? `<img src="${logoSrc}" alt="Logo du club" style="width: auto; height: 155px;" crossorigin="anonymous" />`
            : '<div style="width: 105px; height: 105px; display: flex; align-items: center; justify-content: center; border: 2px dashed #2c5aa0; font-size: 12px; color: #173d68;">logo</div>'
          }
        </div>
      </header>
    </div>
  `;
}

/* ═══ Element height measurement ═══════════════════════════ */

function measureElementHeight(el, widthPx) {
  const m = document.createElement('div');
  m.style.cssText = `position:fixed;left:-9999px;top:0;width:${widthPx}px;font-size:${CONTENT_FONT_SIZE}px;line-height:${CONTENT_LINE_HEIGHT};font-family:${CONTENT_FONT_FAMILY};overflow:visible;`;
  m.appendChild(el.cloneNode(true));
  document.body.appendChild(m);
  const h = m.scrollHeight;
  document.body.removeChild(m);
  return h;
}

/* ═══ HTML block splitting (Node Distribution Loop) ════════ */

/**
 * Split TipTap HTML into page-sized chunks.
 *
 * Algorithm (same as cr_version_1):
 *  1. Parse into top-level DOM elements (p, table, h1-h6, ul, ol…)
 *  2. Measure each element's rendered height
 *  3. Accumulate until cumulative height exceeds availableHeight → new chunk
 *  4. If a single <table> exceeds availableHeight, split at <tr> boundary
 *     and clone <thead> on continuation pages
 */
function splitHtmlBlockAcrossPages(html, availableHeight) {
  if (!html || !html.trim()) return [html];

  const measurementDiv = createMeasurementContainer(CONTENT_WIDTH);
  measurementDiv.style.fontSize = `${CONTENT_FONT_SIZE}px`;
  measurementDiv.style.lineHeight = String(CONTENT_LINE_HEIGHT);
  measurementDiv.style.fontFamily = CONTENT_FONT_FAMILY;

  const wrapper = document.createElement('div');
  wrapper.className = 'tiptap';
  wrapper.innerHTML = html;
  measurementDiv.appendChild(wrapper);

  const children = Array.from(wrapper.children);
  if (children.length === 0) {
    removeContainer(measurementDiv);
    return [html];
  }

  function measureEl(el) {
    return measureElementHeight(el, CONTENT_WIDTH);
  }

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

/* ═══ Dynamic page builder ══════════════════════════════════ */

function buildDynamicPages(html, clubData) {
  if (!html || !html.trim()) {
    return [{ headerHtml: buildHeaderHtml(clubData), contentHtml: '' }];
  }

  const contentChunks = splitHtmlBlockAcrossPages(html, AVAILABLE_BODY_HEIGHT);

  return contentChunks.map((contentHtml) => ({
    headerHtml: buildHeaderHtml(clubData),
    contentHtml,
  }));
}

/* ═══ Single-page capture to JPG ═══════════════════════════ */

async function capturePageAsJpg(page, showToast) {
  const { headerHtml, contentHtml } = page;

  const container = createCaptureContainer(PAGE_WIDTH, PAGE_HEIGHT);
  container.innerHTML = `
    <div style="width:${PAGE_WIDTH}px; height:${PAGE_HEIGHT}px; background:#fff; overflow:hidden; position:relative;">
      ${headerHtml}
      <div class="tiptap" style="padding: 0 ${CONTENT_PADDING_X}px ${BODY_BOTTOM_PADDING}px ${CONTENT_PADDING_X}px; font-size: ${CONTENT_FONT_SIZE}px; line-height: ${CONTENT_LINE_HEIGHT}; color: #0f172a;">
        ${contentHtml}
      </div>
    </div>
  `;

  const sourceRoot = container.firstElementChild || container;

  try {
    const canvas = await html2canvas(container, {
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
        clone.style.width = `${PAGE_WIDTH}px`;
        clone.style.height = `${PAGE_HEIGHT}px`;
        clone.style.position = 'fixed';
        clone.style.left = '0';
        clone.style.top = '0';

        // ── Reset child positioning to prevent text overlay ──
        clonedDoc.querySelectorAll('*').forEach((el) => {
          try {
            el.style.transform = 'none';
            el.style.zoom = '1';

            const computed = clonedDoc.defaultView?.getComputedStyle(el);
            if (computed) {
              // Reset absolute/fixed positioning to static
              if (computed.position === 'absolute' || computed.position === 'fixed') {
                el.style.position = 'static';
                el.style.top = 'auto';
                el.style.left = 'auto';
                el.style.right = 'auto';
                el.style.bottom = 'auto';
              }
              // Reset any active transforms
              if (computed.transform && computed.transform !== 'none') {
                el.style.transform = 'none';
              }
            }
          } catch { /* ignore */ }
        });

        // ── Color sanitization (oklch → fallback) ──
        prepareHtml2CanvasClone(sourceRoot, clonedDoc, clone);
      },
    });

    return canvas.toDataURL('image/jpeg', 0.95);
  } catch (error) {
    console.error('capturePageAsJpg error:', error);
    showToast?.('Erreur lors de la génération du JPG');
    return null;
  } finally {
    removeContainer(container);
  }
}

/* ═══ Main export function ══════════════════════════════════ */

export async function exportMultiPageJpg(html, clubData, showToast) {
  try {
    await document.fonts.ready;

    const clubName = clubData?.nomClub || 'rapport';
    const clubType = clubData?.typeClub ? `_${clubData.typeClub}` : '';
    const baseName = `Rapport_${clubName}${clubType}`;

    const pages = buildDynamicPages(html, clubData);
    const images = [];

    for (let i = 0; i < pages.length; i++) {
      const url = await capturePageAsJpg(pages[i], showToast);
      if (url) images.push(url);
    }

    return { baseName, images };
  } catch (err) {
    console.error('exportMultiPageJpg error:', err);
    showToast?.('Erreur lors de la génération du JPG');
    return { baseName: 'rapport', images: [] };
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
