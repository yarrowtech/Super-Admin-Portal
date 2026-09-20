import React, { useEffect, useRef, useState } from 'react';
import { findMatches } from './extensions';
import { readPictureAsDataUrl } from './exportImport';
import {
  Dialog, Icon, MenuItem, focusRing, inputClass, primaryBtnClass, ghostBtnClass,
} from './EditorUi';

// ── Find & replace ────────────────────────────────────────────────────────────
export const FindPanel = ({ editor, withReplace, canReplace = true, initialTerm, onClose }) => {
  const [term, setTerm] = useState(initialTerm || '');
  const [replacement, setReplacement] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [showReplace, setShowReplace] = useState(Boolean(withReplace) && canReplace);
  const [message, setMessage] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
    if (initialTerm) {
      editor.commands.setSearch(initialTerm, false);
      editor.commands.searchStep(1, true);
    }
    return () => {
      if (!editor.isDestroyed) editor.commands.setSearch('', false);
    };
    // Runs once per open (the parent remounts the panel with a new key).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const store = editor.storage.searchReplace;
  const total = term ? store.results.length : 0;

  const update = (nextTerm, nextCase) => {
    setMessage('');
    editor.commands.setSearch(nextTerm, nextCase);
    if (nextTerm) editor.commands.searchStep(1, true);
  };
  const step = (dir) => { setMessage(''); editor.commands.searchStep(dir); };
  const replaceOne = () => {
    if (!term) return;
    setMessage('');
    if (editor.commands.replaceCurrentMatch(replacement)) editor.commands.searchStep(1, true);
    else editor.commands.searchStep(1);
  };
  const replaceAll = () => {
    if (!term) return;
    const count = findMatches(editor.state.doc, term, matchCase).length;
    if (!count) { setMessage('Nothing to replace.'); return; }
    editor.commands.replaceAllMatches(replacement);
    setMessage(`Replaced ${count} ${count === 1 ? 'match' : 'matches'}.`);
  };

  const onKeyDown = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    else if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1); }
  };

  const small = `flex h-9 min-w-9 items-center justify-center rounded-lg px-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 disabled:opacity-40 dark:text-neutral-200 dark:hover:bg-neutral-700 ${focusRing}`;

  return (
    <div role="search" aria-label="Find and replace" onKeyDown={onKeyDown} className="no-print absolute right-4 top-3 z-30 w-[22rem] max-w-[calc(100%-2rem)] rounded-xl border border-neutral-200 bg-white p-3 shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
      <div className="flex items-center gap-1">
        {canReplace ? (
          <button type="button" onClick={() => setShowReplace((s) => !s)} aria-expanded={showReplace} title={showReplace ? 'Hide replace' : 'Show replace'} aria-label={showReplace ? 'Hide replace' : 'Show replace'} className={small}>
            <Icon name={showReplace ? 'expand_more' : 'chevron_right'} />
          </button>
        ) : <span className="w-9" aria-hidden="true" />}
        <input
          ref={inputRef}
          value={term}
          onChange={(e) => { setTerm(e.target.value); update(e.target.value, matchCase); }}
          placeholder="Find in document"
          aria-label="Find"
          className={inputClass}
        />
        <button type="button" onClick={() => step(-1)} disabled={!total} title="Previous match (Shift+Enter)" aria-label="Previous match" className={small}><Icon name="keyboard_arrow_up" /></button>
        <button type="button" onClick={() => step(1)} disabled={!total} title="Next match (Enter)" aria-label="Next match" className={small}><Icon name="keyboard_arrow_down" /></button>
        <button type="button" onClick={onClose} title="Close (Esc)" aria-label="Close find" className={small}><Icon name="close" /></button>
      </div>
      {showReplace && (
        <div className="mt-2 flex items-center gap-1 pl-10">
          <input value={replacement} onChange={(e) => setReplacement(e.target.value)} placeholder="Replace with" aria-label="Replace with" className={inputClass} />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-2 pl-10">
        <label className="flex min-h-9 cursor-pointer items-center gap-1.5 text-xs text-neutral-700 dark:text-neutral-200">
          <input type="checkbox" checked={matchCase} onChange={(e) => { setMatchCase(e.target.checked); update(term, e.target.checked); }} />
          Match case
        </label>
        <span role="status" aria-live="polite" className="ml-auto text-xs text-neutral-500 dark:text-neutral-400">
          {message || (term ? (total ? `${Math.min(store.index + 1, total)} of ${total}` : 'No results') : '')}
        </span>
      </div>
      {showReplace && (
        <div className="mt-1 flex gap-2 pl-10">
          <button type="button" onClick={replaceOne} disabled={!total} className={`${ghostBtnClass} border border-neutral-300 dark:border-neutral-600`}>Replace</button>
          <button type="button" onClick={replaceAll} disabled={!total} className={`${ghostBtnClass} border border-neutral-300 dark:border-neutral-600`}>Replace all</button>
        </div>
      )}
    </div>
  );
};

// ── Link ──────────────────────────────────────────────────────────────────────
const normalizeUrl = (raw) => {
  const value = String(raw || '').trim();
  if (!value) return '';
  if (/^(https?:|mailto:|tel:|#|\/)/i.test(value)) return value;
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return null; // unsupported scheme such as javascript:
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return `mailto:${value}`;
  return `https://${value}`;
};

export const LinkDialog = ({ editor, onClose }) => {
  const existing = editor.getAttributes('link').href || '';
  const hasSelection = !editor.state.selection.empty;
  const [url, setUrl] = useState(existing);
  const [text, setText] = useState('');
  const [error, setError] = useState('');

  const apply = () => {
    const href = normalizeUrl(url);
    if (!href) { setError(href === null ? 'Only web, email (mailto:) and phone (tel:) links are allowed.' : 'Type or paste a web address.'); return; }
    if (hasSelection || existing) {
      editor.chain().focus().extendMarkRange('link').setLink({ href }).run();
    } else {
      const label = text.trim() || url.trim();
      editor.chain().focus().insertContent({ type: 'text', text: label, marks: [{ type: 'link', attrs: { href } }] }).run();
    }
    onClose();
  };
  const remove = () => { editor.chain().focus().extendMarkRange('link').unsetLink().run(); onClose(); };

  return (
    <Dialog
      title={existing ? 'Edit link' : 'Insert link'}
      onClose={onClose}
      footer={(
        <>
          {existing && <button type="button" onClick={remove} className={ghostBtnClass}>Remove link</button>}
          <button type="button" onClick={onClose} className={ghostBtnClass}>Cancel</button>
          <button type="button" onClick={apply} className={primaryBtnClass}>{existing ? 'Update' : 'Insert'}</button>
        </>
      )}
    >
      <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300" htmlFor="legal-link-url">Web address</label>
      <input id="legal-link-url" autoFocus value={url} onChange={(e) => { setUrl(e.target.value); setError(''); }} onKeyDown={(e) => e.key === 'Enter' && apply()} placeholder="https://example.com" className={inputClass} />
      {!hasSelection && !existing && (
        <>
          <label className="mb-1 mt-3 block text-xs font-semibold text-neutral-600 dark:text-neutral-300" htmlFor="legal-link-text">Text to show (optional)</label>
          <input id="legal-link-text" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && apply()} placeholder="e.g. Our privacy policy" className={inputClass} />
        </>
      )}
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </Dialog>
  );
};

// ── Picture ───────────────────────────────────────────────────────────────────
export const ImageDialog = ({ onInsert, onClose }) => {
  const [dataUrl, setDataUrl] = useState('');
  const [fileName, setFileName] = useState('');
  const [alt, setAlt] = useState('');
  const [width, setWidth] = useState('50%');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const choose = async (file) => {
    if (!file) return;
    setError('');
    setBusy(true);
    try {
      setDataUrl(await readPictureAsDataUrl(file));
      setFileName(file.name);
    } catch (err) {
      setDataUrl('');
      setFileName('');
      setError(err.message || 'The picture could not be added.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      title="Insert picture"
      onClose={onClose}
      footer={(
        <>
          <button type="button" onClick={onClose} className={ghostBtnClass}>Cancel</button>
          <button type="button" disabled={!dataUrl || busy} onClick={() => onInsert({ src: dataUrl, alt: alt.trim(), width })} className={primaryBtnClass}>Insert</button>
        </>
      )}
    >
      <label className={`flex min-h-[88px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-neutral-300 bg-neutral-50 px-3 py-3 text-center hover:border-[var(--portal-accent)] dark:border-neutral-600 dark:bg-neutral-900 focus-within:ring-2 focus-within:ring-[var(--portal-accent)]`}>
        {dataUrl
          ? <img src={dataUrl} alt="Preview of the chosen picture" className="max-h-32 max-w-full rounded" />
          : <><Icon name="add_photo_alternate" size={28} /><span className="mt-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200">{busy ? 'Reading picture…' : 'Choose a picture from your computer'}</span></>}
        <input type="file" accept="image/png,image/jpeg,image/gif,image/webp" className="sr-only" onChange={(e) => choose(e.target.files?.[0])} />
      </label>
      {fileName && <p className="mt-1 truncate text-[11px] text-neutral-500 dark:text-neutral-400">{fileName}</p>}
      <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">PNG, JPG, GIF or WebP up to 8 MB. Large pictures are shrunk automatically.</p>
      <label className="mb-1 mt-3 block text-xs font-semibold text-neutral-600 dark:text-neutral-300" htmlFor="legal-img-alt">Description (for screen readers)</label>
      <input id="legal-img-alt" value={alt} onChange={(e) => setAlt(e.target.value)} placeholder="e.g. Company seal" className={inputClass} />
      <label className="mb-1 mt-3 block text-xs font-semibold text-neutral-600 dark:text-neutral-300" htmlFor="legal-img-size">Size on the page</label>
      <select id="legal-img-size" value={width} onChange={(e) => setWidth(e.target.value)} className={inputClass}>
        <option value="25%">Small (25% of width)</option>
        <option value="50%">Medium (50% of width)</option>
        <option value="75%">Large (75% of width)</option>
        <option value="100%">Full width</option>
      </select>
      {error && <p role="alert" className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-400">{error}</p>}
    </Dialog>
  );
};

export const AltTextForm = ({ initial, onApply }) => {
  const [alt, setAlt] = useState(initial || '');
  return (
    <div className="p-1.5">
      <label className="mb-1 block text-xs font-semibold text-neutral-600 dark:text-neutral-300" htmlFor="legal-alt-edit">Picture description</label>
      <input id="legal-alt-edit" autoFocus value={alt} onChange={(e) => setAlt(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && onApply(alt.trim())} className={inputClass} placeholder="Describe the picture" />
      <button type="button" onClick={() => onApply(alt.trim())} className={`${primaryBtnClass} mt-2 w-full`}>Save description</button>
    </div>
  );
};

// ── Table size picker ─────────────────────────────────────────────────────────
export const TableGrid = ({ onPick }) => {
  const [hover, setHover] = useState({ r: 0, c: 0 });
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(3);
  const R = 8;
  const C = 10;
  return (
    <div className="p-1.5">
      <p className="mb-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200" aria-live="polite">
        {hover.r ? `${hover.c} columns x ${hover.r} rows` : 'Choose a table size'}
      </p>
      <div className="grid gap-0.5" style={{ gridTemplateColumns: `repeat(${C}, 1.25rem)` }} onMouseLeave={() => setHover({ r: 0, c: 0 })}>
        {Array.from({ length: R * C }, (_, i) => {
          const r = Math.floor(i / C) + 1;
          const c = (i % C) + 1;
          const on = r <= hover.r && c <= hover.c;
          return (
            <button
              key={i}
              type="button"
              tabIndex={-1}
              aria-label={`${c} columns by ${r} rows`}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHover({ r, c })}
              onClick={() => onPick(r, c)}
              className={`h-5 w-5 rounded-sm border ${on ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]' : 'border-neutral-300 bg-white dark:border-neutral-600 dark:bg-neutral-900'}`}
            />
          );
        })}
      </div>
      <div className="mt-2 flex items-end gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800">
        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">Rows
          <input type="number" min={1} max={30} value={rows} onChange={(e) => setRows(Number(e.target.value))} className={`${inputClass} mt-0.5 w-16`} />
        </label>
        <label className="text-[11px] font-semibold text-neutral-600 dark:text-neutral-300">Columns
          <input type="number" min={1} max={10} value={cols} onChange={(e) => setCols(Number(e.target.value))} className={`${inputClass} mt-0.5 w-16`} />
        </label>
        <button type="button" onClick={() => onPick(Math.max(1, Math.min(30, rows || 1)), Math.max(1, Math.min(10, cols || 1)))} className={primaryBtnClass}>Insert</button>
      </div>
    </div>
  );
};

// ── Special characters ────────────────────────────────────────────────────────
const SYMBOLS = ['©', '®', '™', '§', '¶', '†', '‡', '•', '…', '–', '—', '‘', '’', '“', '”', '«', '»', '°', '±', '×', '÷', '≠', '≤', '≥', '∞', '₹', '€', '£', '¥', '¢', '¼', '½', '¾', '²', '³', 'α', 'β', 'γ', 'π', 'Ω', 'µ', '→', '←', '↑', '↓', '✓', '✗', '☐', '☑'];

export const SymbolGrid = ({ onPick }) => (
  <div className="p-1.5">
    <p className="mb-1 text-xs font-semibold text-neutral-700 dark:text-neutral-200">Special characters</p>
    <div className="grid grid-cols-8 gap-0.5">
      {SYMBOLS.map((s) => (
        <button
          key={s}
          type="button"
          title={`Insert ${s}`}
          aria-label={`Insert ${s}`}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => onPick(s)}
          className={`flex h-9 w-full items-center justify-center rounded-md text-base text-neutral-800 hover:bg-neutral-100 dark:text-neutral-100 dark:hover:bg-neutral-800 ${focusRing}`}
        >
          {s}
        </button>
      ))}
    </div>
  </div>
);

// ── Word count ────────────────────────────────────────────────────────────────
export const WordCountBody = ({ editor, pages }) => {
  const words = editor.storage.characterCount.words();
  const characters = editor.storage.characterCount.characters();
  const text = editor.getText();
  const noSpaces = text.replace(/\s/g, '').length;
  let paragraphs = 0;
  editor.state.doc.descendants((node) => {
    if (node.isTextblock && node.textContent.trim()) paragraphs += 1;
    return true;
  });
  const { from, to, empty } = editor.state.selection;
  const selected = empty ? 0 : editor.state.doc.textBetween(from, to, ' ').split(/\s+/).filter(Boolean).length;
  const rows = [
    ['Pages (approx.)', pages],
    ['Words', words.toLocaleString()],
    ['Characters (with spaces)', characters.toLocaleString()],
    ['Characters (no spaces)', noSpaces.toLocaleString()],
    ['Paragraphs', paragraphs.toLocaleString()],
    ['Reading time', `${Math.max(1, Math.round(words / 200))} min`],
  ];
  if (selected) rows.push(['Selected words', selected.toLocaleString()]);
  return (
    <dl className="p-2 text-xs">
      {rows.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-4 py-1">
          <dt className="text-neutral-500 dark:text-neutral-400">{k}</dt>
          <dd className="font-semibold text-neutral-900 dark:text-neutral-100">{v}</dd>
        </div>
      ))}
    </dl>
  );
};

// ── Keyboard shortcuts ────────────────────────────────────────────────────────
const SHORTCUTS = [
  ['Save draft', 'Ctrl + S'],
  ['Undo / Redo', 'Ctrl + Z / Ctrl + Y'],
  ['Bold / Italic / Underline', 'Ctrl + B / I / U'],
  ['Find', 'Ctrl + F'],
  ['Find and replace', 'Ctrl + H'],
  ['Insert link', 'Ctrl + K'],
  ['Heading 1 / 2 / 3', 'Ctrl + Alt + 1 / 2 / 3'],
  ['Normal text', 'Ctrl + Alt + 0'],
  ['Bulleted list', 'Ctrl + Shift + L'],
  ['Numbered list', 'Ctrl + Shift + 7'],
  ['Align left / centre / right / justify', 'Ctrl + L / E / R / J'],
  ['Page break', 'Ctrl + Enter'],
  ['Paste without formatting', 'Ctrl + Shift + V'],
  ['Move in / out of a list level', 'Tab / Shift + Tab'],
  ['Move between table cells', 'Tab / Shift + Tab'],
  ['Select everything', 'Ctrl + A'],
];

export const ShortcutsDialog = ({ onClose }) => (
  <Dialog title="Keyboard shortcuts" onClose={onClose} width="w-[30rem]" footer={<button type="button" onClick={onClose} className={primaryBtnClass}>Close</button>}>
    <p className="mb-2 text-xs text-neutral-500 dark:text-neutral-400">On a Mac, use Cmd instead of Ctrl.</p>
    <table className="w-full text-xs">
      <tbody>
        {SHORTCUTS.map(([action, keys]) => (
          <tr key={action} className="border-t border-neutral-100 dark:border-neutral-700">
            <td className="py-1.5 pr-3 text-neutral-800 dark:text-neutral-100">{action}</td>
            <td className="py-1.5 text-right font-mono text-[11px] text-neutral-600 dark:text-neutral-300">{keys}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </Dialog>
);

// ── Right-click menu ──────────────────────────────────────────────────────────
export const ContextMenu = ({ x, y, items, onClose }) => {
  const ref = useRef(null);
  useEffect(() => {
    const onDown = (e) => { if (!ref.current?.contains(e.target)) onClose(); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey, true);
    window.addEventListener('resize', onClose);
    window.addEventListener('scroll', onClose, true);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey, true);
      window.removeEventListener('resize', onClose);
      window.removeEventListener('scroll', onClose, true);
    };
  }, [onClose]);
  const left = Math.max(8, Math.min(x, window.innerWidth - 248));
  const top = Math.max(8, Math.min(y, window.innerHeight - Math.min(items.length * 38 + 16, window.innerHeight - 16) - 8));
  return (
    <div ref={ref} role="menu" aria-label="Editing menu" style={{ position: 'fixed', left, top, width: 240, maxHeight: window.innerHeight - 16 }} className="no-print z-[90] overflow-y-auto rounded-xl border border-neutral-200 bg-white p-1.5 shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
      {items.map((item, i) => (
        item.divider
          ? <div key={`d${i}`} className="my-1 border-t border-neutral-100 dark:border-neutral-800" />
          : <MenuItem key={item.label} icon={item.icon} label={item.label} disabled={item.disabled} onClick={() => { onClose(); item.run(); }} />
      ))}
    </div>
  );
};
