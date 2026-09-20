// Shared typography for the on-screen page, Print and Word export. The server PDF
// (backend legalDocument.v2.controller.js) carries an equivalent copy of these rules.
import { getPageGeometry, normalizeMeta } from './docMeta';

export const DEFAULT_FONT = "'Times New Roman', Georgia, serif";

/** Document typography, scoped under `scope` (a CSS selector for the content root). */
export const contentCss = (scope) => `
  ${scope} { font-family: ${DEFAULT_FONT}; font-size: 12pt; line-height: 1.8; color: #1a1a1a; }
  ${scope} h1 { font-size: 20pt; font-weight: 700; margin: 8mm 0 4mm; }
  ${scope} h2 { font-size: 16pt; font-weight: 700; margin: 6mm 0 3mm; }
  ${scope} h3 { font-size: 13pt; font-weight: 700; margin: 4mm 0 2mm; }
  ${scope} h4 { font-size: 12pt; font-weight: 700; font-style: italic; margin: 3mm 0 2mm; }
  ${scope} p { margin: 0 0 4mm; text-align: justify; }
  ${scope} blockquote { margin: 3mm 0 4mm 8mm; padding-left: 4mm; border-left: 3px solid #bbb; color: #444; font-style: italic; }
  ${scope} ul { margin: 2mm 0 4mm; padding-left: 6mm; list-style: disc; }
  ${scope} ol { margin: 2mm 0 4mm; padding-left: 6mm; list-style: decimal; }
  ${scope} ol[data-legal-style="lower-alpha"] { list-style: lower-alpha; }
  ${scope} ol[data-legal-style="lower-roman"] { list-style: lower-roman; }
  ${scope} li { margin: 1mm 0; }
  ${scope} li > p { margin: 0; }
  ${scope} ul[data-type="taskList"] { list-style: none; padding-left: 1mm; }
  ${scope} ul[data-type="taskList"] li { display: flex; gap: 2mm; align-items: flex-start; }
  ${scope} ul[data-type="taskList"] li > label { flex: none; user-select: none; }
  ${scope} ul[data-type="taskList"] li > div { flex: 1; }
  ${scope} table { width: 100%; border-collapse: collapse; margin: 4mm 0; table-layout: fixed; }
  ${scope} td, ${scope} th { border: 1px solid #aaa; padding: 2mm 3mm; vertical-align: top; position: relative; }
  ${scope} th { background: #f1f1f1; font-weight: 700; text-align: left; }
  ${scope} td > p, ${scope} th > p { margin: 0; }
  ${scope} a { color: #1a56db; text-decoration: underline; }
  ${scope} mark { border-radius: 2px; padding: 0 1px; }
  ${scope} img { max-width: 100%; height: auto; }
  ${scope} hr { border: 0; border-top: 1px solid #888; margin: 6mm 0; }
  ${scope} [data-page-break] { page-break-after: always; break-after: page; }
`;

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const escapeCssString = (value) => String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, ' ');

/** A complete, self-contained HTML document for printing / Word export. */
export const buildDocumentHtml = ({ title, bodyHtml, meta, forPrint = false }) => {
  const m = normalizeMeta(meta);
  const { margins } = getPageGeometry(m);
  const pageSize = `${m.size === 'Letter' ? 'letter' : m.size === 'Legal' ? 'legal' : 'A4'} ${m.orientation}`;
  const marginBoxes = forPrint
    ? `${m.header ? `@top-center { content: "${escapeCssString(m.header)}"; font: 9pt 'Times New Roman', serif; color: #555; }` : ''}
       ${(m.footer || m.pageNumbers) ? `@bottom-center { content: "${escapeCssString(m.footer)}${m.footer && m.pageNumbers ? '   |   ' : ''}${m.pageNumbers ? 'Page " counter(page) " of " counter(pages) "' : ''}"; font: 9pt 'Times New Roman', serif; color: #555; }` : ''}`
    : '';
  return `<!DOCTYPE html><html lang="${m.lang}"><head><meta charset="utf-8"><title>${escapeHtml(title || 'Legal Document')}</title><style>
    @page { size: ${pageSize}; margin: ${margins.top}mm ${margins.right}mm ${margins.bottom}mm ${margins.left}mm; ${marginBoxes} }
    body { margin: 0; }
    ${contentCss('.doc')}
  </style></head><body><div class="doc">${bodyHtml || ''}</div></body></html>`;
};
