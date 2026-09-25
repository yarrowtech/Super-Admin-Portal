import React, { useRef, useState } from 'react';
import { BubbleMenu } from '@tiptap/react';

import { NOTE_STYLES, PLAIN_MARKERS } from './noteColors';

// Same order and colours as the Key point / Critical / Note buttons, then plain markers.
const MEANINGFUL_MARKERS = ['highlight', 'critical', 'note'].map((k) => ({
  color: NOTE_STYLES[k].mark,
  label: `${NOTE_STYLES[k].label} colour`,
}));
const QUICK = ['highlight', 'critical', 'note'].map((key) => ({ key, ...NOTE_STYLES[key] }));

const selectedText = (editor) => {
  const { from, to } = editor.state.selection;
  return from === to ? '' : editor.state.doc.textBetween(from, to, ' ').trim();
};

/**
 * Floating toolbar on text selection, like Word / Google Docs:
 *  - marker colours + remove highlight (when the document is editable)
 *  - Key point / Critical / Note: write a short point and pin it, with the selected text
 *    as its quote, straight into the notes panel (via onQuickNote). Works read-only too.
 */
const SelectionHighlighter = ({ editor, canHighlight, onQuickNote }) => {
  const [draft, setDraftState] = useState(null); // { kind, quote, text, saving, error }
  // The bubble plugin captures shouldShow once, so it reads "is a point being written?" from a
  // ref — otherwise typing in the input (editor loses focus) would hide the bubble mid-sentence.
  const draftOpen = useRef(false);
  const setDraft = (next) => setDraftState((prev) => {
    const value = typeof next === 'function' ? next(prev) : next;
    draftOpen.current = Boolean(value);
    return value;
  });

  if (!editor || (!canHighlight && !onQuickNote)) return null;

  const mark = (color) => editor.chain().focus().setHighlight({ color }).run();
  const clear = () => editor.chain().focus().unsetHighlight().run();

  const startQuick = (kind) => {
    const quote = selectedText(editor);
    if (!quote) return;
    setDraft({ kind, quote: quote.slice(0, 500), text: '', saving: false, error: '' });
  };

  const saveQuick = async () => {
    const text = draft.text.trim();
    if (!text) { setDraft((d) => ({ ...d, error: 'Write the point first.' })); return; }
    setDraft((d) => ({ ...d, saving: true, error: '' }));
    try {
      // Colour the passage while it is still selected, then pin the note.
      if (canHighlight && selectedText(editor) === draft.quote) mark(NOTE_STYLES[draft.kind].mark);
      await onQuickNote({
        kind: draft.kind === 'note' ? 'note' : 'highlight',
        critical: draft.kind === 'critical',
        text,
        quote: draft.quote,
      });
      setDraft(null);
    } catch (err) {
      setDraft((d) => ({ ...d, saving: false, error: err?.message || 'Could not save.' }));
    }
  };

  const btn = 'flex h-8 items-center gap-1 rounded-md px-2 text-xs font-semibold text-neutral-700 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800';

  return (
    <BubbleMenu
      editor={editor}
      pluginKey="legalSelectionHighlighter"
      tippyOptions={{ duration: 120, placement: 'top', maxWidth: 'none' }}
      // Shown for any non-empty text selection, even in read-only documents (for notes).
      shouldShow={({ editor: ed, state, from, to }) => draftOpen.current || (from !== to && ed.view.hasFocus() && state.doc.textBetween(from, to, ' ').trim().length > 0)}
    >
      <div className="rounded-xl border border-neutral-200 bg-white p-1 shadow-xl dark:border-neutral-700 dark:bg-neutral-900" onMouseDown={(e) => { if (e.target.tagName !== 'INPUT') e.preventDefault(); }}>
        {!draft ? (
          <div className="flex items-center gap-0.5">
            {canHighlight && (
              <>
                {[...MEANINGFUL_MARKERS, null, ...PLAIN_MARKERS].map((c, i) => (c === null ? (
                  <span key="sep" className="mx-0.5 h-4 w-px bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />
                ) : (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => mark(c.color)}
                    title={i < 3 ? `Highlight only — ${c.label.toLowerCase()} (no note)` : `Highlight ${c.label.toLowerCase()}`}
                    aria-label={`Highlight ${c.label.toLowerCase()}`}
                    className={`mx-0.5 h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${editor.isActive('highlight', { color: c.color }) ? 'border-neutral-800 dark:border-white' : 'border-white shadow-sm dark:border-neutral-700'}`}
                    style={{ backgroundColor: c.color }}
                  />
                )))}
                <button type="button" onClick={clear} title="Remove highlight" aria-label="Remove highlight" className={btn}>
                  <span className="material-symbols-outlined text-[18px]">format_color_reset</span>
                </button>
              </>
            )}
            {canHighlight && onQuickNote && <span className="mx-1 h-6 w-px bg-neutral-200 dark:bg-neutral-700" aria-hidden="true" />}
            {onQuickNote && QUICK.map((q) => (
              <button key={q.key} type="button" onClick={() => startQuick(q.key)} title={`Highlight ${q.label === 'Critical' ? 'red' : q.key === 'note' ? 'blue' : 'yellow'} and pin a ${q.label.toLowerCase()} to this text`} className={btn}>
                <span className="h-3 w-3 rounded-full border border-black/10" style={{ backgroundColor: q.mark }} aria-hidden="true" />
                <span className={`material-symbols-outlined text-[17px] ${q.iconCls}`} style={{ fontVariationSettings: "'FILL' 1" }}>{q.icon}</span>
                {q.label}
              </button>
            ))}
          </div>
        ) : (
          <div className="w-80 space-y-1.5 p-1.5">
            <p className={`line-clamp-2 border-l-4 pl-2 text-[11px] italic text-neutral-600 dark:text-neutral-300 ${NOTE_STYLES[draft.kind].barCls}`}>“{draft.quote}”</p>
            <input
              autoFocus
              value={draft.text}
              onChange={(e) => setDraft((d) => ({ ...d, text: e.target.value }))}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); saveQuick(); } if (e.key === 'Escape') setDraft(null); }}
              maxLength={2000}
              placeholder={draft.kind === 'critical' ? 'Why is this critical?' : draft.kind === 'note' ? 'Your note…' : 'The key point…'}
              aria-label="Point text"
              className="w-full rounded-md border border-neutral-200 px-2 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-800"
            />
            {draft.error && <p className="text-[11px] text-rose-600">{draft.error}</p>}
            <div className="flex justify-end gap-1.5">
              <button type="button" onClick={() => { setDraft(null); editor.commands.focus(); }} className="rounded-md px-2 py-1 text-xs font-semibold text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800">Cancel</button>
              <button type="button" disabled={draft.saving} onClick={saveQuick} className={`rounded-md px-2.5 py-1 text-xs font-semibold text-white disabled:opacity-60 ${NOTE_STYLES[draft.kind].btnCls}`}>
                {draft.saving ? 'Saving…' : `Pin ${draft.kind === 'critical' ? 'critical point' : draft.kind === 'note' ? 'note' : 'key point'}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </BubbleMenu>
  );
};

export default SelectionHighlighter;
