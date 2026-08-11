import React from 'react';

/**
 * Shared mobile filter-drawer shell (overlay + slide-in panel with a title/close
 * header). Extracted from the working pattern shipped in UserRoleManagement.jsx.
 * Filter *content* stays page-specific — pass it as children.
 *
 * `hiddenAbove` controls at which breakpoint the drawer stops applying (the page
 * shows its filters inline instead) — defaults to hidden at md (768px) and up.
 */
const FilterDrawer = ({
  open,
  onClose,
  title = 'Filters',
  subtitle = 'Refine results',
  children,
  hiddenAbove = 'md:hidden',
}) => {
  if (!open) return null;

  return (
    <div className={`fixed inset-0 z-40 ${hiddenAbove}`} role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-label="Close filters"
      />
      <div className="absolute inset-y-0 right-0 flex w-[min(24rem,90vw)] flex-col border-l border-neutral-200 bg-neutral-50 shadow-2xl dark:border-neutral-800 dark:bg-neutral-950">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
          <div>
            <p className="text-base font-bold text-neutral-900 dark:text-neutral-100">{title}</p>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-600 hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-300 dark:hover:bg-neutral-800"
            aria-label="Close filters"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-3">{children}</div>
      </div>
    </div>
  );
};

export default FilterDrawer;
