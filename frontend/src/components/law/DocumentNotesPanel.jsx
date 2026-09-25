import React, { useMemo, useState } from 'react';
import { NOTE_STYLES, styleKeyOf, meaningOfColor } from './editor/noteColors';

const formatWhen = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(v)) : '');

// Critical (red) first, then key points (yellow), then notes (blue); newest first within each.
const RANK = { critical: 0, highlight: 1, note: 2 };
const sortNotes = (list) => [...list].sort((a, b) =>
  (RANK[styleKeyOf(a)] - RANK[styleKeyOf(b)]) || (new Date(b.createdAt) - new Date(a.createdAt)));

const TYPES = ['highlight', 'critical', 'note'];
const Swatch = ({ color, className = '' }) => (
  <span className={`inline-block h-3 w-3 shrink-0 rounded-sm border border-black/10 ${className}`} style={{ backgroundColor: color }} aria-hidden="true" />
);

/**
 * Key points & notes pinned to a legal document — the same panel for the law head (document
 * page) and the employee (task workspace). One colour language throughout (see noteColors):
 * yellow = key point, red = critical, blue = note. Actions are passed in, so each side calls its
 * own secured endpoint; omit `onAdd` for a read-only view.
 */
const DocumentNotesPanel = ({
  annotations = [],
  onAdd,
  onDelete,
  onToggleCritical,
  canDelete = () => false,
  subtitle = 'Pinned to this document for the head and the team.',
  readOnlyHint = 'Read-only access — you can view notes but not add them.',
  // Editor hooks (optional): jump to a quote, list / go to highlighted passages. New points are
  // added by selecting text in the document (the editor's toolbar), never from this panel.
  onJump,
  getHighlights,
  onGoTo,
  emptyHint,
  // Changes whenever the document text changes; re-rendering re-reads the live highlights.
  // eslint-disable-next-line no-unused-vars
  contentVersion,
}) => {
  const [showMarks, setShowMarks] = useState(true);
  const [filterChoice, setFilter] = useState('all');
  const [jumpMiss, setJumpMiss] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  // Read straight from the editor each render, so the list always matches the text.
  const marks = showMarks && getHighlights ? getHighlights() : [];
  const quotedTexts = useMemo(() => new Map(annotations.filter((a) => a.quote).map((a) => [a.quote.trim().toLowerCase(), a])), [annotations]);

  const counts = useMemo(() => annotations.reduce((acc, a) => {
    acc[styleKeyOf(a)] += 1;
    return acc;
  }, { highlight: 0, critical: 0, note: 0 }), [annotations]);

  const filter = filterChoice !== 'all' && counts[filterChoice] === 0 ? 'all' : filterChoice;

  const visible = useMemo(
    () => sortNotes(filter === 'all' ? annotations : annotations.filter((a) => styleKeyOf(a) === filter)),
    [annotations, filter],
  );

  const act = async (fn) => {
    setBusy(true);
    setError('');
    try {
      await fn();
      return true;
    } catch (err) {
      setError(err?.message || 'Something went wrong.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const jump = (a) => {
    if (!onJump || !a.quote) return;
    setJumpMiss(onJump(a.quote) ? '' : a._id);
  };

  const remove = (a) => {
    if (!window.confirm(`Remove this ${NOTE_STYLES[styleKeyOf(a)].label.toLowerCase()}?`)) return;
    act(() => onDelete(a));
  };

  const tabs = [
    { key: 'all', label: 'All', n: annotations.length },
    { key: 'critical', label: 'Critical', n: counts.critical },
    { key: 'highlight', label: 'Key', n: counts.highlight },
    { key: 'note', label: 'Notes', n: counts.note },
  ];

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-neutral-100 px-4 pb-3 pt-4 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[20px] text-amber-500" style={{ fontVariationSettings: "'FILL' 1" }}>star</span>
          <p className="text-sm font-bold text-neutral-900 dark:text-white">Key points &amp; notes</p>
          <span className="ml-auto rounded-full bg-neutral-100 px-2 text-[11px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{annotations.length}</span>
        </div>
        <p className="mt-0.5 text-xs text-neutral-500">{subtitle}</p>

        {/* Colour legend — the same colours are used in the text, the toolbar and the cards. */}
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neutral-600 dark:text-neutral-300">
          {TYPES.map((k) => (
            <span key={k} className="inline-flex items-center gap-1"><Swatch color={NOTE_STYLES[k].mark} />{NOTE_STYLES[k].label}</span>
          ))}
        </div>

        {counts.critical > 0 && (
          <button type="button" onClick={() => setFilter('critical')} className="mt-2 flex w-full items-center gap-1.5 rounded-lg bg-rose-50 px-2.5 py-1.5 text-left text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-300">
            <span className="material-symbols-outlined text-[16px]">priority_high</span>
            {counts.critical} critical point{counts.critical === 1 ? ' needs' : 's need'} attention
            <span className="ml-auto text-[11px] underline">View</span>
          </button>
        )}
        <div className="mt-3 grid grid-cols-4 gap-0.5 rounded-lg bg-neutral-100 p-0.5 dark:bg-neutral-800" role="tablist" aria-label="Filter notes">
          {tabs.map((t) => (
            <button key={t.key} type="button" role="tab" aria-selected={filter === t.key} onClick={() => setFilter(t.key)} className={`inline-flex items-center justify-center gap-1 rounded-md px-1 py-1 text-[11px] font-semibold ${filter === t.key ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-900 dark:text-white' : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400'}`}>
              {t.key !== 'all' && <Swatch color={NOTE_STYLES[t.key].mark} className="h-2.5 w-2.5" />}
              {t.label} <span className="text-neutral-400">{t.n}</span>
            </button>
          ))}
        </div>
      </div>

      {getHighlights && (
        <div className="border-b border-neutral-100 px-4 py-2 dark:border-neutral-800">
          <button type="button" onClick={() => setShowMarks((v) => !v)} aria-expanded={showMarks} className="flex w-full items-center gap-1.5 text-xs font-semibold text-neutral-700 dark:text-neutral-200">
            <span className="material-symbols-outlined text-[16px] text-amber-500">ink_highlighter</span>
            Highlights in the document
            {showMarks && <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] dark:bg-neutral-800">{marks.length}</span>}
            <span className="material-symbols-outlined ml-auto text-[16px] text-neutral-400">{showMarks ? 'expand_less' : 'expand_more'}</span>
          </button>
          {showMarks && (
            <div className="mt-2">
              {marks.length === 0 ? (
                <p className="text-xs text-neutral-500">No highlighted text yet. Select text in the document and pick a colour.</p>
              ) : (
                <ul className="max-h-44 space-y-1 overflow-y-auto">
                  {marks.map((m) => {
                    const meaning = meaningOfColor(m.color);
                    const linked = quotedTexts.get(m.text.trim().toLowerCase());
                    return (
                      <li key={`${m.from}-${m.to}`}>
                        <button type="button" onClick={() => onGoTo?.(m.from, m.to)} title="Show in document" className="flex w-full items-start gap-2 rounded-md px-1.5 py-1 text-left text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800">
                          <Swatch color={m.color} className="mt-0.5" />
                          <span className="min-w-0 flex-1">
                            <span className="line-clamp-2 text-neutral-700 dark:text-neutral-300">{m.text}</span>
                            <span className="mt-0.5 flex flex-wrap gap-1">
                              <span className={`rounded px-1 text-[10px] font-semibold ${meaning ? NOTE_STYLES[meaning].chipCls : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                                {meaning ? NOTE_STYLES[meaning].label : 'Highlight'}
                              </span>
                              {linked && <span className="rounded bg-neutral-100 px-1 text-[10px] font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">has note</span>}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      <ul className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
        {visible.length === 0 && (
          <li className="flex flex-col items-center rounded-xl border border-dashed border-neutral-300 px-4 py-6 text-center dark:border-neutral-700">
            <span className="material-symbols-outlined text-[28px] text-neutral-300 dark:text-neutral-600">{filter === 'all' ? 'ink_highlighter' : 'filter_alt_off'}</span>
            <p className="mt-1 text-sm font-semibold text-neutral-600 dark:text-neutral-300">{filter === 'all' ? 'No key points or notes yet' : 'Nothing in this filter'}</p>
            {filter === 'all' && emptyHint && <p className="mt-1 text-xs text-neutral-500">{emptyHint}</p>}
          </li>
        )}
        {visible.map((a) => {
          const key = styleKeyOf(a);
          const s = NOTE_STYLES[key];
          return (
            <li key={a._id} className={`rounded-xl border p-3 ${s.cardCls}`}>
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <span className={`material-symbols-outlined text-[16px] ${s.iconCls}`} style={{ fontVariationSettings: "'FILL' 1" }}>{s.icon}</span>
                <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${s.chipCls}`}>
                  {key === 'critical' ? (a.kind === 'note' ? 'Critical note' : 'Critical key point') : s.label}
                </span>
                <span className="ml-auto flex items-center gap-1">
                  {onToggleCritical && (
                    <button type="button" disabled={busy} onClick={() => act(() => onToggleCritical(a))} title={a.critical ? 'Unmark critical' : 'Mark critical'} aria-label={a.critical ? 'Unmark critical' : 'Mark critical'} className={`material-symbols-outlined text-[16px] ${a.critical ? 'text-rose-600' : 'text-neutral-400 hover:text-rose-600'}`}>flag</button>
                  )}
                  {onDelete && canDelete(a) && (
                    <button type="button" disabled={busy} onClick={() => remove(a)} title="Remove" aria-label="Remove" className="material-symbols-outlined text-[16px] text-neutral-400 hover:text-rose-600">delete</button>
                  )}
                </span>
              </div>
              {a.quote && (
                <button
                  type="button"
                  onClick={() => jump(a)}
                  disabled={!onJump}
                  title={onJump ? 'Show this passage in the document' : undefined}
                  className={`mt-1.5 block w-full rounded-md border-l-4 bg-white/70 px-2 py-1 text-left text-xs italic text-neutral-600 enabled:hover:bg-white dark:bg-neutral-900/60 dark:text-neutral-300 ${s.barCls}`}
                >
                  “{a.quote.length > 180 ? `${a.quote.slice(0, 180)}…` : a.quote}”
                  {onJump && <span className="ml-1 not-italic font-semibold text-neutral-700 underline dark:text-neutral-200">Show in document</span>}
                </button>
              )}
              {!a.quote && (
                <p className="mt-1 inline-flex items-center gap-1 text-[10px] font-semibold text-neutral-500">
                  <span className="material-symbols-outlined text-[13px]">description</span>General — whole document
                </p>
              )}
              {jumpMiss === a._id && <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-300">That passage is no longer in the document — it may have been edited.</p>}
              <p className="mt-1.5 whitespace-pre-wrap wrap-break-word text-sm text-neutral-800 dark:text-neutral-100">{a.text}</p>
              <p className="mt-1.5 text-[11px] text-neutral-500">{a.createdByName || 'Someone'} · {formatWhen(a.createdAt)}</p>
            </li>
          );
        })}
      </ul>

      {error && <p role="alert" className="mx-4 mb-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

      {onAdd ? (
        <div className="border-t border-neutral-100 p-4 dark:border-neutral-800">
          <p className="text-xs font-bold text-neutral-700 dark:text-neutral-200">How to add a point</p>
          <ol className="mt-1.5 space-y-1 text-xs text-neutral-600 dark:text-neutral-300">
            <li className="flex gap-1.5"><span className="font-bold text-neutral-400">1</span>Select the text in the document.</li>
            <li className="flex flex-wrap items-center gap-1.5">
              <span className="font-bold text-neutral-400">2</span>Choose
              {TYPES.map((k) => (
                <span key={k} className={`inline-flex items-center gap-0.5 rounded px-1 text-[11px] font-semibold ${NOTE_STYLES[k].chipCls}`}>
                  <span className="material-symbols-outlined text-[12px]" style={{ fontVariationSettings: "'FILL' 1" }}>{NOTE_STYLES[k].icon}</span>{NOTE_STYLES[k].label}
                </span>
              ))}
            </li>
            <li className="flex gap-1.5"><span className="font-bold text-neutral-400">3</span>Write the point — the text is highlighted in the same colour.</li>
          </ol>
        </div>
      ) : (
        <p className="border-t border-neutral-100 p-4 text-xs text-neutral-500 dark:border-neutral-800">{readOnlyHint}</p>
      )}
    </div>
  );
};

export default DocumentNotesPanel;
