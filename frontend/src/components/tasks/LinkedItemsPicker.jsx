import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskAdapters } from '../../features/tasks/taskAdapters';
import { lawApi } from '../../services/law';

export const MODULE_LABELS = {
  record: 'Compliance / risk record',
  contract: 'Contract',
  document: 'Legal document',
  outsourcing_contract: 'Outsourcing contract',
};

export const humanize = (value) => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
const keyOf = (item) => `${item.module}:${item.recordId}`;
const DOC_TYPES = ['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other'];

/**
 * Law head only: pick the documents / contracts / records to attach to a task.
 * Value is [{ module, recordId, title, canEdit }]. `canEdit` (documents only) lets the
 * assignee edit the document and add notes / key points through this task; everything
 * else stays read-only. The server re-validates every entry and re-reads titles.
 *
 * With a `projectId`, the list defaults to that project's items and the head can create
 * a blank project document right here.
 */
const LinkedItemsPicker = ({ portal, value, onChange, projectId = '', projectName = '' }) => {
  const { token } = useAuth();
  const adapter = taskAdapters[portal];
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [creating, setCreating] = useState(null);
  const [createError, setCreateError] = useState('');

  // Project-wise legal documents only — nothing is listed until a project is chosen.
  useEffect(() => {
    if (!projectId) return undefined;
    let active = true;
    setLoading(true);
    adapter.fetchLinkableItems(token, { projectId })
      .then((rows) => { if (active) { setOptions(rows); setError(''); } })
      .catch(() => { if (active) setError('Unable to load this project’s legal documents.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [adapter, token, projectId, reloadKey]);

  // Changing project drops documents from the previous project (the server rejects them anyway).
  useEffect(() => {
    if (!projectId || loading || error) return;
    const allowed = new Set(options.map(keyOf));
    if (value.some((v) => !allowed.has(keyOf(v)))) onChange(value.filter((v) => allowed.has(keyOf(v))));
  }, [options, projectId, loading, error]); // eslint-disable-line react-hooks/exhaustive-deps

  const selected = useMemo(() => new Map(value.map((v) => [keyOf(v), v])), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || `${o.title} ${o.type} ${MODULE_LABELS[o.module] || ''}`.toLowerCase().includes(q)).slice(0, 80);
  }, [options, query]);

  const toggle = (option) => {
    if (selected.has(keyOf(option))) onChange(value.filter((v) => keyOf(v) !== keyOf(option)));
    // Default to editable: sharing a document with an assignee is usually so they work on it.
    else onChange([...value, { module: 'document', recordId: option.recordId, title: option.title, canEdit: true }]);
  };

  const setEdit = (item, canEdit) => onChange(value.map((v) => (keyOf(v) === keyOf(item) ? { ...v, canEdit } : v)));

  const createDocument = async () => {
    if (!creating?.title.trim()) { setCreateError('Give the document a title.'); return; }
    setCreateError('');
    setCreating((c) => ({ ...c, saving: true }));
    try {
      const res = await lawApi.createProjectDocument(token, {
        title: creating.title.trim(),
        type: creating.type,
        scope: 'project',
        projectId,
        projectName,
        sourceType: 'blank',
      });
      const doc = res?.data;
      if (doc?._id) onChange([...value, { module: 'document', recordId: String(doc._id), title: doc.title, canEdit: true }]);
      setCreating(null);
      setReloadKey((k) => k + 1);
    } catch (err) {
      setCreateError(err?.message || 'Unable to create the document.');
      setCreating((c) => ({ ...c, saving: false }));
    }
  };

  const inputCls = 'w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';

  if (!projectId) {
    return (
      <div className="rounded-xl border border-dashed border-neutral-300 p-4 text-center dark:border-neutral-700">
        <span className="material-symbols-outlined text-neutral-400">folder</span>
        <p className="mt-1 text-sm font-semibold text-neutral-700 dark:text-neutral-200">Legal documents</p>
        <p className="text-xs text-neutral-500">Choose a project above to share its legal documents with the assignee.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">Legal documents · {projectName || 'this project'}</p>
          <p className="text-xs text-neutral-500">Shared with the assignee through this task only. Turn on “Can edit” to let them work on a document.</p>
        </div>
        {!creating && (
          <button type="button" onClick={() => setCreating({ title: '', type: 'Agreement', saving: false })} className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15">
            <span className="material-symbols-outlined text-[16px]">note_add</span>New project document
          </button>
        )}
      </div>

      {creating && (
        <div className="space-y-2 rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800/60">
          <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">New blank document for {projectName || 'this project'}</p>
          <div className="grid gap-2 sm:grid-cols-[1fr_9rem]">
            <input autoFocus value={creating.title} onChange={(e) => setCreating((c) => ({ ...c, title: e.target.value }))} placeholder="e.g. Master Services Agreement" aria-label="Document title" className={inputCls} />
            <select value={creating.type} onChange={(e) => setCreating((c) => ({ ...c, type: e.target.value }))} aria-label="Document type" className={inputCls}>
              {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          {createError && <p role="alert" className="text-xs text-rose-600">{createError}</p>}
          <div className="flex gap-2">
            <button type="button" disabled={creating.saving} onClick={createDocument} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60">{creating.saving ? 'Creating…' : 'Create & attach'}</button>
            <button type="button" onClick={() => { setCreating(null); setCreateError(''); }} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-semibold dark:border-neutral-700">Cancel</button>
          </div>
        </div>
      )}

      {value.length > 0 && (
        <ul className="space-y-1.5">
          {value.map((v) => (
            <li key={keyOf(v)} className="flex items-center gap-2 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs dark:bg-emerald-900/20">
              <span className="material-symbols-outlined text-[16px] text-emerald-700 dark:text-emerald-300">{v.module === 'document' ? 'description' : 'contract'}</span>
              <span className="min-w-0 flex-1 truncate font-semibold text-emerald-800 dark:text-emerald-200">{v.title || MODULE_LABELS[v.module]}</span>
              {v.module === 'document' ? (
                <label className="flex shrink-0 cursor-pointer items-center gap-1 font-semibold text-neutral-700 dark:text-neutral-200">
                  <input type="checkbox" checked={Boolean(v.canEdit)} onChange={(e) => setEdit(v, e.target.checked)} />
                  Can edit
                </label>
              ) : (
                <span className="shrink-0 text-neutral-500">Read-only</span>
              )}
              <button type="button" aria-label={`Remove ${v.title}`} onClick={() => onChange(value.filter((x) => keyOf(x) !== keyOf(v)))} className="material-symbols-outlined shrink-0 text-[16px] leading-none text-neutral-500 hover:text-rose-600">close</button>
            </li>
          ))}
        </ul>
      )}

      <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search this project’s legal documents…" aria-label="Search legal documents" className={inputCls} />
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {loading ? <p className="text-sm text-neutral-500">Loading…</p> : (
        <ul className="max-h-52 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
          {filtered.length === 0 && (
            <li className="px-3 py-2 text-sm text-neutral-500">{query ? 'No matching documents.' : 'This project has no legal documents yet — create one with “New project document”.'}</li>
          )}
          {filtered.map((option) => (
            <li key={keyOf(option)}>
              <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                <input type="checkbox" className="mt-0.5" checked={selected.has(keyOf(option))} onChange={() => toggle(option)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{option.title}</span>
                  <span className="block text-xs text-neutral-500">
                    {humanize(option.type)} · {humanize(option.status)}{option.referenceNumber ? ` · ${option.referenceNumber}` : ''}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default LinkedItemsPicker;
