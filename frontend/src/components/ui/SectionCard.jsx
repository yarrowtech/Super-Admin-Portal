import React from 'react';
import Skeleton from './Skeleton';
import EmptyState from './EmptyState';
import ErrorState from './ErrorState';

/**
 * Standard dashboard section wrapper: title + optional icon/description +
 * optional "View all" action, with built-in loading/error/empty states so
 * every portal stops hand-rolling its own Card/Inner/SectionHdr/EmptyState
 * combo. Also means an empty section collapses to a compact EmptyState
 * instead of reserving a large fixed-height blank card.
 *
 * action: { label, onClick, icon } — e.g. "View all →"
 * error: pass the caught error (or true) to show ErrorState + onRetry
 * empty: pass true when loaded successfully but there's no data to show
 */
const SectionCard = ({
  title,
  icon,
  description,
  action,
  loading = false,
  error = null,
  onRetry,
  empty = false,
  emptyIcon = 'inbox',
  emptyTitle = 'No data yet',
  emptyDescription,
  emptyAction,
  skeletonRows = 3,
  noBodyPadding = false,
  className = '',
  children,
}) => {
  return (
    <section
      className={`overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}
      style={{ boxShadow: 'var(--erp-shadow-soft)' }}
    >
      {(title || action) && (
        <div className="flex items-center justify-between gap-3 border-b border-neutral-100 px-4 py-3.5 dark:border-neutral-800 lg:px-5">
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-black text-neutral-900 dark:text-neutral-100">
              {icon && (
                <span className="material-symbols-outlined text-[18px]" style={{ color: 'var(--portal-accent)' }}>
                  {icon}
                </span>
              )}
              {title}
            </h2>
            {description && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{description}</p>}
          </div>
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className="flex shrink-0 items-center gap-1 whitespace-nowrap text-xs font-bold transition-colors hover:underline"
              style={{ color: 'var(--portal-accent)' }}
            >
              {action.label}
              <span className="material-symbols-outlined text-sm">{action.icon || 'arrow_forward'}</span>
            </button>
          )}
        </div>
      )}

      <div className={noBodyPadding && !loading && !error && !empty ? '' : 'p-4 lg:p-5'}>
        {loading && (
          <div className="space-y-2.5">
            {Array.from({ length: skeletonRows }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {!loading && error && (
          <ErrorState
            title="Unable to load this section"
            description={typeof error === 'string' ? error : error?.message}
            onRetry={onRetry}
          />
        )}

        {!loading && !error && empty && (
          <EmptyState icon={emptyIcon} title={emptyTitle} description={emptyDescription} actionLabel={emptyAction?.label} onAction={emptyAction?.onClick} />
        )}

        {!loading && !error && !empty && children}
      </div>
    </section>
  );
};

export default SectionCard;
