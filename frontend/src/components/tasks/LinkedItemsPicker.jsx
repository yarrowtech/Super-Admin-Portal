import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { taskAdapters } from '../../features/tasks/taskAdapters';

export const MODULE_LABELS = {
  record: 'Compliance / risk record',
  contract: 'Contract',
  document: 'Legal document',
  outsourcing_contract: 'Outsourcing contract',
};

export const humanize = (value) => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
const keyOf = (item) => `${item.module}:${item.recordId}`;

/**
 * Law head only: multi-select of Law records / contracts / documents to attach to a task.
 * Value is [{ module, recordId, title }]; the server re-validates each entry and re-reads titles.
 */
const LinkedItemsPicker = ({ portal, value, onChange }) => {
  const { token } = useAuth();
  const adapter = taskAdapters[portal];
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    adapter.fetchLinkableItems(token)
      .then((rows) => { if (active) { setOptions(rows); setError(''); } })
      .catch(() => { if (active) setError('Unable to load documents and contracts.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [adapter, token]);

  const selected = useMemo(() => new Set(value.map(keyOf)), [value]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => !q || `${o.title} ${o.type} ${MODULE_LABELS[o.module] || ''}`.toLowerCase().includes(q)).slice(0, 60);
  }, [options, query]);

  const toggle = (option) => {
    if (selected.has(keyOf(option))) onChange(value.filter((v) => keyOf(v) !== keyOf(option)));
    else onChange([...value, { module: option.module, recordId: option.recordId, title: option.title }]);
  };

  return (
    <div className="space-y-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
      <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Link documents / contracts</p>
      <p className="text-xs text-neutral-500">The assignee gets read-only access to these items through this task only.</p>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((v) => (
            <span key={keyOf(v)} className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              {v.title || MODULE_LABELS[v.module]}
              <button type="button" aria-label={`Remove ${v.title}`} onClick={() => onChange(value.filter((x) => keyOf(x) !== keyOf(v)))} className="material-symbols-outlined text-sm leading-none">close</button>
            </span>
          ))}
        </div>
      )}
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search documents, contracts, records..."
        className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
      />
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
      {loading ? <p className="text-sm text-neutral-500">Loading...</p> : (
        <ul className="max-h-48 divide-y divide-neutral-100 overflow-y-auto rounded-lg border border-neutral-100 dark:divide-neutral-800 dark:border-neutral-800">
          {filtered.length === 0 && <li className="px-3 py-2 text-sm text-neutral-500">No matching items.</li>}
          {filtered.map((option) => (
            <li key={keyOf(option)}>
              <label className="flex cursor-pointer items-start gap-2 px-3 py-2 text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800/60">
                <input type="checkbox" className="mt-0.5" checked={selected.has(keyOf(option))} onChange={() => toggle(option)} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-semibold">{option.title}</span>
                  <span className="block text-xs text-neutral-500">{MODULE_LABELS[option.module]} · {humanize(option.type)} · {humanize(option.status)}</span>
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
