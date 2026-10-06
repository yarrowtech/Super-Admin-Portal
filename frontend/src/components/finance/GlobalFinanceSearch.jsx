import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { financeApi } from '../../services/finance';

const inr = (v) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(Number(v) || 0);

// Searches invoices, clients and vendors in one request. Debounced so typing
// does not fire a query per keystroke; results are keyed to the term they belong to, so a
// slow earlier response can never overwrite a newer one.
export default function GlobalFinanceSearch({ token }) {
  const navigate = useNavigate();
  const [term, setTerm] = useState('');
  // `query` records which term the stored results belong to, so "loading" is derived
  // rather than written synchronously, and a stale response is ignored.
  const [state, setState] = useState({ query: '', groups: [], error: '' });
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);
  const trimmed = term.trim();
  const ready = trimmed.length < 2 || state.query === trimmed;

  useEffect(() => {
    const q = term.trim();
    if (q.length < 2) return undefined;
    let alive = true;
    const timer = setTimeout(() => {
      financeApi.search(token, q).then(
        (res) => { if (alive) setState({ query: q, groups: res?.data?.groups || [], error: '' }); },
        (err) => { if (alive) setState({ query: q, groups: [], error: err.message || 'Search failed' }); },
      );
    }, 250);
    return () => { alive = false; clearTimeout(timer); };
  }, [term, token]);

  useEffect(() => {
    const onDocClick = (e) => { if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const go = (group, item) => {
    setOpen(false);
    setTerm('');
    navigate(item.href || group.path);
  };

  const showPanel = open && term.trim().length >= 2;
  return (
    <div ref={boxRef} className="relative min-w-[220px] flex-1 sm:flex-none">
      <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[17px] text-neutral-400">search</span>
      <input
        value={term}
        onChange={(e) => { setTerm(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => { if (e.key === 'Escape') { setOpen(false); setTerm(''); } }}
        placeholder="Search invoices, clients, vendors…"
        aria-label="Search finance records"
        className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm outline-none transition focus:border-emerald-400 focus:ring-2 focus:ring-emerald-100 dark:border-neutral-800 dark:bg-neutral-950 dark:text-neutral-100"
      />
      {showPanel && (
        <div className="absolute right-0 z-30 mt-1 max-h-[26rem] w-[22rem] overflow-auto rounded-xl border border-neutral-200 bg-white p-2 text-left shadow-xl dark:border-neutral-700 dark:bg-neutral-900">
          {!ready && <p className="px-2 py-3 text-sm text-neutral-500">Searching…</p>}
          {ready && state.error && <p role="alert" className="px-2 py-3 text-sm text-rose-600 dark:text-rose-300">{state.error}</p>}
          {ready && !state.error && state.groups.length === 0 && (
            <p className="px-2 py-3 text-sm text-neutral-500">No matches for “{trimmed}”.</p>
          )}
          {ready && state.groups.map((group) => (
            <div key={group.kind} className="mb-1">
              <p className="px-2 py-1 text-[11px] font-bold uppercase tracking-wide text-neutral-400">{group.label}</p>
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => go(group, item)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-neutral-100 dark:hover:bg-neutral-800"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-neutral-900 dark:text-white">{item.title}</span>
                        {item.subtitle && <span className="block truncate text-xs text-neutral-500">{item.subtitle}</span>}
                      </span>
                      {item.amount !== undefined && item.amount !== null && (
                        <span className="shrink-0 text-xs tabular-nums text-neutral-600 dark:text-neutral-300">{inr(item.amount)}</span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
