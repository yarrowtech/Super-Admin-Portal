import { useId, useMemo, useState } from 'react';

const inputCls = 'w-full rounded-lg border border-neutral-200 px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900';

// Searchable client field. Picking a saved client links the invoice to that record
// (so the directory and balances stay joined up), while a free-typed name is still
// allowed for one-off customers — the backend accepts either.
export default function ClientPicker({ clients, value, clientId, onPick, disabled, required, label = 'Client name' }) {
  // The parent owns the name, so render straight from `value` — no mirrored state to resync.
  const query = value || '';
  const [open, setOpen] = useState(false);
  const listId = useId();

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    const pool = clients || [];
    if (!q) return pool.slice(0, 8);
    return pool.filter((c) => `${c.name} ${c.contactEmail || ''}`.toLowerCase().includes(q)).slice(0, 8);
  }, [clients, query]);

  const linked = clientId ? (clients || []).find((c) => String(c._id) === String(clientId)) : null;

  const choose = (client) => {
    onPick({ client: String(client._id), clientName: client.name, clientEmail: client.contactEmail || '' });
    setOpen(false);
  };

  return (
    <div className="relative">
      <label className="block">
        <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</span>
        <input
          className={inputCls}
          value={query}
          placeholder="Search saved clients, or type a new name"
          disabled={disabled}
          required={required}
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-autocomplete="list"
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onChange={(e) => {
            setOpen(true);
            // Typing past a linked client unlinks it; the name alone is then used.
            onPick({ client: '', clientName: e.target.value, clientEmail: '' });
          }}
        />
      </label>
      {linked && <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-300">Linked to {linked.name}{linked.contactEmail ? ` · ${linked.contactEmail}` : ''}</p>}
      {open && matches.length > 0 && (
        <ul id={listId} role="listbox" className="absolute z-20 mt-1 max-h-60 w-full overflow-auto rounded-lg border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900">
          {matches.map((c) => (
            <li key={c._id}>
              <button
                type="button"
                role="option"
                aria-selected={String(c._id) === String(clientId)}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => choose(c)}
                className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <span className="font-semibold text-neutral-900 dark:text-white">{c.name}</span>
                {(c.contactEmail || c.paymentTerms) && (
                  <span className="text-xs text-neutral-500">{[c.contactEmail, c.paymentTerms].filter(Boolean).join(' · ')}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
