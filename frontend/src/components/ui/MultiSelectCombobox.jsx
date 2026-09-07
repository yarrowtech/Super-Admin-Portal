import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '../../lib/cn';

/**
 * Searchable multi-select with removable chips — a production replacement for a
 * native `<select multiple>`. Presentation only: `value`/`onChange` still deal in
 * the same array of option `value`s (e.g. employee ids), so callers that send
 * that array straight to an API payload don't need to change anything.
 *
 * options: [{ value, label, meta? }]
 */
const MultiSelectCombobox = ({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = 'Search…',
  triggerLabel = 'Select…',
  disabled = false,
  loading = false,
  helperText,
  emptyMessage = 'No matches found.',
  className = '',
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);
  const searchRef = useRef(null);

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  useEffect(() => {
    if (!open) return undefined;
    const onPointer = (e) => {
      if (!rootRef.current?.contains(e.target)) close();
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close();
    };
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const selectedOptions = useMemo(
    () => value.map((v) => options.find((o) => o.value === v)).filter(Boolean),
    [value, options]
  );

  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return options;
    return options.filter((o) => `${o.label} ${o.meta || ''}`.toLowerCase().includes(needle));
  }, [options, query]);

  const toggle = (optionValue) => {
    onChange(value.includes(optionValue) ? value.filter((v) => v !== optionValue) : [...value, optionValue]);
  };

  const selectAllFiltered = () => {
    const next = new Set(value);
    filteredOptions.forEach((o) => next.add(o.value));
    onChange(Array.from(next));
  };

  const clearAll = () => onChange([]);

  return (
    <div ref={rootRef} className={cn('relative', className)}>
      {label && <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">{label}</span>}

      <button
        type="button"
        disabled={disabled}
        onClick={() => (open ? close() : setOpen(true))}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-left text-sm text-neutral-900 transition focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
      >
        <span className="truncate text-neutral-500 dark:text-neutral-400">
          {loading ? 'Loading…' : value.length ? `${value.length} selected` : triggerLabel}
        </span>
        <span className="material-symbols-outlined shrink-0 text-[18px] text-neutral-400">
          {open ? 'expand_less' : 'expand_more'}
        </span>
      </button>

      {open && (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute z-20 mt-1.5 w-full overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
        >
          <div className="border-b border-neutral-100 p-2 dark:border-neutral-800">
            <input
              ref={searchRef}
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholder}
              aria-label={placeholder}
              className="h-9 w-full rounded-lg border border-neutral-200 bg-white px-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-950"
            />
          </div>

          <div className="flex items-center justify-between gap-2 border-b border-neutral-100 px-3 py-1.5 text-xs font-semibold dark:border-neutral-800">
            <button type="button" onClick={selectAllFiltered} disabled={!filteredOptions.length} className="text-primary disabled:opacity-40">
              Select all{query ? ' (matching)' : ''}
            </button>
            <button type="button" onClick={clearAll} disabled={!value.length} className="text-neutral-500 disabled:opacity-40 dark:text-neutral-400">
              Clear
            </button>
          </div>

          <div className="max-h-56 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <p className="px-3 py-3 text-center text-xs text-neutral-400">{emptyMessage}</p>
            ) : (
              filteredOptions.map((option) => {
                const checked = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="option"
                    aria-selected={checked}
                    onClick={() => toggle(option.value)}
                    className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm hover:bg-neutral-50 dark:hover:bg-neutral-800"
                  >
                    <span
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                        checked
                          ? 'border-primary bg-primary text-white'
                          : 'border-neutral-300 dark:border-neutral-600'
                      )}
                      aria-hidden="true"
                    >
                      {checked && <span className="material-symbols-outlined text-[13px] leading-none">check</span>}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-neutral-800 dark:text-neutral-100">{option.label}</span>
                      {option.meta && <span className="block truncate text-xs text-neutral-400">{option.meta}</span>}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {selectedOptions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {selectedOptions.map((option) => (
            <span
              key={option.value}
              className="inline-flex max-w-full items-center gap-1 rounded-full bg-primary/10 py-1 pl-2.5 pr-1.5 text-xs font-semibold text-primary dark:bg-primary/20"
            >
              <span className="truncate">{option.label}</span>
              <button
                type="button"
                onClick={() => toggle(option.value)}
                aria-label={`Remove ${option.label}`}
                className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full hover:bg-primary/20"
              >
                <span className="material-symbols-outlined text-[13px] leading-none">close</span>
              </button>
            </span>
          ))}
        </div>
      )}

      {helperText && <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">{helperText}</p>}
    </div>
  );
};

export default MultiSelectCombobox;
