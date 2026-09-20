// Document-level settings (page size, margins, header/footer, language).
//
// Storage: legal documents keep ONE html string (`latestContent`). Page settings are
// stored as an invisible HTML comment at the very start of that string:
//   <!--legal-meta:BASE64(JSON)-->
// * Old documents have no comment and simply load with the defaults.
// * Browsers, the version-preview modal and the server PDF (puppeteer) ignore comments.
// * The comment is only written when a setting differs from the defaults, so untouched
//   documents are stored byte-for-byte as before.

export const PAGE_SIZES = {
  A4: { label: 'A4', w: 210, h: 297, hint: '210 x 297 mm' },
  Letter: { label: 'Letter', w: 215.9, h: 279.4, hint: '8.5 x 11 in' },
  Legal: { label: 'Legal', w: 215.9, h: 355.6, hint: '8.5 x 14 in' },
};

// "Normal" equals the margins the server PDF has always used (20mm / 25mm).
export const MARGIN_PRESETS = {
  normal: { label: 'Normal', top: 20, right: 25, bottom: 20, left: 25 },
  narrow: { label: 'Narrow', top: 12.7, right: 12.7, bottom: 12.7, left: 12.7 },
  wide: { label: 'Wide', top: 25.4, right: 38, bottom: 25.4, left: 38 },
};

export const LANGUAGES = [
  { value: 'en-IN', label: 'English (India)' },
  { value: 'en-GB', label: 'English (UK)' },
  { value: 'en-US', label: 'English (US)' },
  { value: 'hi-IN', label: 'Hindi' },
];

export const DEFAULT_META = {
  size: 'A4',
  orientation: 'portrait',
  margin: 'normal',
  header: '',
  footer: '',
  pageNumbers: false,
  lang: 'en-IN',
};

const META_RE = /^\s*<!--legal-meta:([A-Za-z0-9+/=]+)-->/;

const toBase64 = (text) => {
  const bytes = new TextEncoder().encode(text);
  let bin = '';
  bytes.forEach((b) => { bin += String.fromCharCode(b); });
  return btoa(bin);
};

const fromBase64 = (b64) => {
  const bin = atob(b64);
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

export const normalizeMeta = (raw = {}) => {
  const m = { ...DEFAULT_META, ...(raw || {}) };
  if (!PAGE_SIZES[m.size]) m.size = DEFAULT_META.size;
  if (m.orientation !== 'landscape') m.orientation = 'portrait';
  if (!MARGIN_PRESETS[m.margin]) m.margin = DEFAULT_META.margin;
  m.header = String(m.header || '').slice(0, 200);
  m.footer = String(m.footer || '').slice(0, 200);
  m.pageNumbers = Boolean(m.pageNumbers);
  if (!LANGUAGES.some((l) => l.value === m.lang)) m.lang = DEFAULT_META.lang;
  return m;
};

export const isDefaultMeta = (meta) => {
  const m = normalizeMeta(meta);
  return Object.keys(DEFAULT_META).every((k) => m[k] === DEFAULT_META[k]);
};

/** Split stored content into { meta, body }. Never throws. */
export const parseDocContent = (stored) => {
  const html = typeof stored === 'string' ? stored : '';
  const match = META_RE.exec(html);
  if (!match) return { meta: { ...DEFAULT_META }, body: html };
  let meta = { ...DEFAULT_META };
  try {
    meta = normalizeMeta(JSON.parse(fromBase64(match[1])));
  } catch {
    meta = { ...DEFAULT_META };
  }
  return { meta, body: html.slice(match[0].length) };
};

/** Join editor html and settings back into the single stored string. */
export const serializeDoc = (bodyHtml, meta) => {
  const body = bodyHtml || '';
  if (isDefaultMeta(meta)) return body;
  return `<!--legal-meta:${toBase64(JSON.stringify(normalizeMeta(meta)))}-->${body}`;
};

/** Page geometry in millimetres. */
export const getPageGeometry = (meta) => {
  const m = normalizeMeta(meta);
  const size = PAGE_SIZES[m.size];
  const landscape = m.orientation === 'landscape';
  const width = landscape ? size.h : size.w;
  const height = landscape ? size.w : size.h;
  const margins = MARGIN_PRESETS[m.margin];
  return {
    width,
    height,
    margins,
    contentHeight: Math.max(50, height - margins.top - margins.bottom),
    contentWidth: Math.max(50, width - margins.left - margins.right),
  };
};

export const MM_TO_PX = 96 / 25.4;
