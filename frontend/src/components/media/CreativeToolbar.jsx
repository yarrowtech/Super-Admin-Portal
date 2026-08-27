import React from 'react';
import Button from '../common/Button';

const selectClass = 'h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-slate-950 outline-none transition focus:border-[var(--portal-accent)] focus:ring-4 focus:ring-[var(--portal-accent)]/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';

/**
 * One reusable toolbar for every Creative section: search + status + optional category
 * + sort + refresh, with removable filter chips underneath (only rendered when a filter
 * is active) — spec explicitly asks that the toolbar stay quiet when nothing is filtered.
 */
const CreativeToolbar = ({
  searchTerm,
  onSearchChange,
  searchPlaceholder = 'Search...',
  statusFilter,
  onStatusChange,
  statusOptions = [],
  categoryFilter,
  onCategoryChange,
  categoryOptions,
  sortValue,
  onSortChange,
  sortOptions = [],
  onRefresh,
  busy,
  filterChips = [],
  onClearFilters,
}) => (
  <div className="space-y-2">
    <div className="flex flex-wrap items-center gap-2">
      <div className="relative min-w-[220px] flex-1">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => onSearchChange?.(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--portal-accent)] focus:ring-4 focus:ring-[var(--portal-accent)]/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>
      {statusOptions.length ? (
        <select value={statusFilter} onChange={(e) => onStatusChange?.(e.target.value)} className={selectClass}>
          {statusOptions.map((option) => (
            <option key={option} value={option}>{option === 'all' ? 'All Statuses' : option}</option>
          ))}
        </select>
      ) : null}
      {categoryOptions ? (
        <select value={categoryFilter} onChange={(e) => onCategoryChange?.(e.target.value)} className={selectClass}>
          <option value="all">All Categories</option>
          {categoryOptions.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </select>
      ) : null}
      {sortOptions.length ? (
        <select value={sortValue} onChange={(e) => onSortChange?.(e.target.value)} className={selectClass}>
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>{option.label}</option>
          ))}
        </select>
      ) : null}
      {onRefresh ? (
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={onRefresh}
          disabled={busy}
          icon={<span className="material-symbols-outlined text-[18px]">refresh</span>}
          className="h-10"
        >
          Refresh
        </Button>
      ) : null}
    </div>

    {filterChips.length ? (
      <div className="flex flex-wrap items-center gap-2">
        {filterChips.map((chip) => (
          <button
            key={chip.key}
            type="button"
            onClick={chip.onRemove}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
          >
            {chip.label}
            <span className="material-symbols-outlined text-[14px]">close</span>
          </button>
        ))}
        <button type="button" onClick={onClearFilters} className="text-xs font-semibold text-[var(--portal-accent)] hover:underline">
          Clear all
        </button>
      </div>
    ) : null}
  </div>
);

export default CreativeToolbar;
