// Word import/export, printing and picture helpers. Heavy libraries are imported
// lazily, only when the matching button is clicked.
import { buildDocumentHtml } from './docStyles';
import { PAGE_SIZES, getPageGeometry, normalizeMeta } from './docMeta';

const MAX_IMPORT_BYTES = 15 * 1024 * 1024;
const MAX_IMPORT_HTML_CHARS = 8 * 1024 * 1024; // server request limit is 10 MB
export const MAX_PICTURE_BYTES = 8 * 1024 * 1024;
const MAX_PICTURE_DATA_CHARS = 1.6 * 1024 * 1024;

const safeFileName = (title) => String(title || 'legal-document').trim().replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').slice(0, 100) || 'legal-document';

export const downloadBlob = (blob, filename) => {
  const url = window.URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
};

const MM_TO_TWIPS = 56.6929;
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const escapeHtml = (value) => String(value || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Native .docx (real Word paragraphs, tables and pictures), built in the browser. */
export const exportWord = async ({ title, bodyHtml, meta }) => {
  const { default: htmlToDocx } = await import('@turbodocx/html-to-docx');
  const m = normalizeMeta(meta);
  const size = PAGE_SIZES[m.size];
  const { margins } = getPageGeometry(m);
  const html = buildDocumentHtml({ title, bodyHtml, meta: m });
  const hasHeader = Boolean(m.header);
  const hasFooter = Boolean(m.footer) || m.pageNumbers;
  const out = await htmlToDocx(
    html,
    hasHeader ? `<p style="text-align:center">${escapeHtml(m.header)}</p>` : null,
    {
      orientation: m.orientation,
      pageSize: { width: Math.round(size.w * MM_TO_TWIPS), height: Math.round(size.h * MM_TO_TWIPS) },
      margins: {
        top: Math.round(margins.top * MM_TO_TWIPS),
        right: Math.round(margins.right * MM_TO_TWIPS),
        bottom: Math.round(margins.bottom * MM_TO_TWIPS),
        left: Math.round(margins.left * MM_TO_TWIPS),
      },
      font: 'Times New Roman',
      fontSize: 24,
      title: title || 'Legal Document',
      header: hasHeader,
      footer: hasFooter,
      pageNumber: m.pageNumbers,
    },
    m.footer ? `<p style="text-align:center">${escapeHtml(m.footer)}</p>` : null
  );
  const blob = out instanceof Blob ? out : new Blob([out], { type: DOCX_MIME });
  downloadBlob(blob, `${safeFileName(title)}.docx`);
};

/** Returns editor-ready html converted from a .docx file. Throws Error with a friendly message. */
export const importWord = async (file) => {
  if (!file) throw new Error('No file chosen.');
  if (!/\.docx$/i.test(file.name || '')) throw new Error('Please choose a Word file that ends in .docx. Older .doc files must be re-saved as .docx first.');
  if (file.size > MAX_IMPORT_BYTES) throw new Error('That file is larger than 15 MB.');
  const mammothModule = await import('mammoth/mammoth.browser');
  const mammoth = mammothModule.default || mammothModule;
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.convertToHtml({ arrayBuffer }, {
    styleMap: [
      "p[style-name='Title'] => h1:fresh",
      "p[style-name='Heading 1'] => h2:fresh",
      "p[style-name='Heading 2'] => h3:fresh",
      "p[style-name='Heading 3'] => h4:fresh",
      "p[style-name='Subtitle'] => p:fresh",
    ],
  });
  const html = result.value || '';
  if (!html.trim()) throw new Error('That Word file appears to be empty.');
  if (html.length > MAX_IMPORT_HTML_CHARS) throw new Error('That file contains too many or too large pictures to import. Remove some pictures and try again.');
  return { html, warnings: (result.messages || []).length };
};

/** Prints through a hidden frame so page size, margins and page numbers match the document settings. */
export const printDocument = ({ title, bodyHtml, meta }) => new Promise((resolve) => {
  const frame = window.document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  window.document.body.appendChild(frame);
  const cleanup = () => { window.setTimeout(() => { frame.remove(); resolve(); }, 1000); };
  const frameWindow = frame.contentWindow;
  frameWindow.document.open();
  frameWindow.document.write(buildDocumentHtml({ title, bodyHtml, meta, forPrint: true }));
  frameWindow.document.close();
  frameWindow.onafterprint = cleanup;
  window.setTimeout(() => {
    frameWindow.focus();
    frameWindow.print();
    // Some browsers never fire afterprint for frames.
    window.setTimeout(cleanup, 60000);
  }, 250);
});

/** Reads a picture file, shrinks it if large and returns a data URL. Throws a friendly Error. */
export const readPictureAsDataUrl = (file) => new Promise((resolve, reject) => {
  if (!file || !/^image\/(png|jpe?g|gif|webp)$/i.test(file.type)) {
    reject(new Error('Please choose a PNG, JPG, GIF or WebP picture.'));
    return;
  }
  if (file.size > MAX_PICTURE_BYTES) {
    reject(new Error('That picture is larger than 8 MB. Please choose a smaller one.'));
    return;
  }
  const reader = new FileReader();
  reader.onerror = () => reject(new Error('The picture could not be read.'));
  reader.onload = () => {
    const original = String(reader.result || '');
    if (file.type === 'image/gif') {
      if (original.length > MAX_PICTURE_DATA_CHARS) reject(new Error('This GIF is too large. Please use a smaller picture.'));
      else resolve(original);
      return;
    }
    const img = new window.Image();
    img.onerror = () => reject(new Error('The picture could not be opened.'));
    img.onload = () => {
      const maxSide = 1600;
      const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
      const canvas = window.document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));
      const ctx = canvas.getContext('2d');
      const keepsTransparency = file.type === 'image/png' || file.type === 'image/webp';
      if (!keepsTransparency) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      let out = canvas.toDataURL(keepsTransparency ? 'image/png' : 'image/jpeg', 0.85);
      if (out.length > MAX_PICTURE_DATA_CHARS) out = canvas.toDataURL('image/jpeg', 0.7);
      if (out.length > MAX_PICTURE_DATA_CHARS) {
        reject(new Error('This picture is still too large after shrinking. Please use a smaller one.'));
        return;
      }
      resolve(out);
    };
    img.src = original;
  };
  reader.readAsDataURL(file);
});
