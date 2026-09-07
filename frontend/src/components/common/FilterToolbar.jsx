import React, { useState } from 'react';
import Select from '../ui/Select';
import Input from '../ui/Input';
import Button from '../ui/Button';
import FilterDrawer from './FilterDrawer';

/**
 * One bordered filter toolbar: search + primary filters inline (sized per
 * filter, not one-size-fits-all), an optional "More filters" row for
 * less-used fields, and — when `activeChips` is non-empty — a compact chip
 * row underneath so an enterprise filter state is legible at a glance.
 *
 * search: { value, onChange, placeholder, width? } — width is a Tailwind
 *   width class (defaults sized for a search box vs. a short select).
 * primaryFilters / moreFilters: [{ key, label, value, onChange, options, width? }]
 *   `label` is used as the field's accessible name (aria-label), not shown
 *   as visible text next to the control.
 * activeChips: [{ key, label, onRemove }] — parent computes which filters
 *   are non-default; this component only renders what it's given.
 * onClearAll: shown as a trailing "Clear all" once any chip is active.
 */
const FilterToolbar = ({ search, primaryFilters = [], moreFilters = [], activeChips = [], onClearAll, className = '' }) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const allFilters = [...primaryFilters, ...moreFilters];
  const activeCount = activeChips.length;

  const renderFilter = (filter) => (
    <Select
      key={filter.key}
      aria-label={filter.label}
      value={filter.value}
      onChange={(e) => filter.onChange(e.target.value)}
      options={filter.options || []}
      className={`min-h-10 ${filter.width || 'w-40'}`}
    />
  );

  return (
    <div className={className}>
      <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-900">
        {/* Desktop / tablet — inline toolbar */}
        <div className="hidden flex-wrap items-center gap-2 md:flex">
          {search && (
            <div className={`relative ${search.width || 'w-64'}`}>
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">search</span>
              <Input
                aria-label={search.label || 'Search'}
                placeholder={search.placeholder || 'Search…'}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="min-h-10 pl-9"
              />
            </div>
          )}
          {primaryFilters.map(renderFilter)}
          {moreFilters.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMoreOpen((v) => !v)}
              icon={<span className="material-symbols-outlined text-base">{moreOpen ? 'expand_less' : 'tune'}</span>}
            >
              More filters
            </Button>
          )}
          {activeCount > 0 && onClearAll && (
            <button type="button" onClick={onClearAll} className="ml-auto text-sm font-semibold text-primary">
              Clear all
            </button>
          )}
        </div>
        {moreOpen && moreFilters.length > 0 && (
          <div className="mt-2 hidden flex-wrap items-center gap-2 border-t border-neutral-100 pt-2 dark:border-neutral-800 md:flex">
            {moreFilters.map(renderFilter)}
          </div>
        )}

        {/* Mobile — search + drawer trigger */}
        <div className="flex items-center gap-2 md:hidden">
          {search && (
            <div className="relative flex-1">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">search</span>
              <Input
                aria-label={search.label || 'Search'}
                placeholder={search.placeholder || 'Search…'}
                value={search.value}
                onChange={(e) => search.onChange(e.target.value)}
                className="min-h-10 pl-9"
              />
            </div>
          )}
          {allFilters.length > 0 && (
            <Button
              variant="secondary"
              size="sm"
              icon={<span className="material-symbols-outlined text-base">tune</span>}
              onClick={() => setDrawerOpen(true)}
            >
              Filters{activeCount > 0 ? ` (${activeCount})` : ''}
            </Button>
          )}
        </div>

        {/* Active filter chips */}
        {activeCount > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-neutral-100 pt-2.5 dark:border-neutral-800">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1 rounded-full bg-neutral-100 py-1 pl-2.5 pr-1.5 text-xs font-medium text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200"
              >
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  aria-label={`Remove filter: ${chip.label}`}
                  className="flex h-4 w-4 items-center justify-center rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-700"
                >
                  <span className="material-symbols-outlined text-[13px] leading-none">close</span>
                </button>
              </span>
            ))}
            {onClearAll && (
              <button type="button" onClick={onClearAll} className="ml-1 text-xs font-semibold text-primary md:hidden">
                Clear all
              </button>
            )}
          </div>
        )}
      </div>

      <FilterDrawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Filters" subtitle="Refine this list">
        <div className="space-y-4">
          {allFilters.map((filter) => (
            <div key={filter.key}>
              <p className="mb-1.5 text-sm font-bold text-neutral-700 dark:text-neutral-200">{filter.label}</p>
              <Select
                aria-label={filter.label}
                value={filter.value}
                onChange={(e) => filter.onChange(e.target.value)}
                options={filter.options || []}
              />
            </div>
          ))}
          <Button className="w-full" onClick={() => setDrawerOpen(false)}>
            Apply
          </Button>
        </div>
      </FilterDrawer>
    </div>
  );
};

export default FilterToolbar;
