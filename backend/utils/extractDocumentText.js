const { PDFParse } = require('pdf-parse');
const mammoth = require('mammoth');

const PDF_MIME = 'application/pdf';
const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

const escapeHtml = (value) => String(value || '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;');

// Turns extracted plain text into the simple paragraph HTML the rich-text
// editor expects (LegalDocEditor renders latestContent as HTML) — escape
// first, then wrap, so the escaping never touches the tags we add.
const textToHtml = (text) => escapeHtml(text)
  .split(/\r?\n{2,}/)
  .map((block) => block.trim())
  .filter(Boolean)
  .map((block) => `<p>${block.replace(/\r?\n/g, '<br>')}</p>`)
  .join('');

// Best-effort text extraction for the "Upload" document source — supports
// PDF and DOCX (the two types covered by SOURCE_UPLOAD_TYPES on the
// frontend). Legacy .doc and anything unrecognized returns '' so the caller
// falls back to an empty editor rather than failing document creation.
const extractTextFromFile = async (file) => {
  if (!file?.buffer) return '';
  try {
    if (file.mimetype === PDF_MIME) {
      const parser = new PDFParse({ data: file.buffer });
      try {
        const result = await parser.getText();
        // pdf-parse inserts a "-- N of M --" marker between pages; strip it
        // rather than let it leak into the document as visible text.
        const cleaned = result.text.replace(/^\s*--\s*\d+\s*of\s*\d+\s*--\s*$/gm, '');
        return textToHtml(cleaned);
      } finally {
        await parser.destroy();
      }
    }
    if (file.mimetype === DOCX_MIME) {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      return textToHtml(result.value);
    }
    return '';
  } catch {
    return '';
  }
};

module.exports = { extractTextFromFile, textToHtml };
