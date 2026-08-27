import React from 'react';
import StatusBadge from './StatusBadge';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Skeleton from '../ui/Skeleton';

/**
 * The "Action Required" section — the single biggest UX gap in a basic
 * dashboard vs. a production one. Renders a ranked list of real, actionable
 * items (locked accounts, overdue invoices, expiring contracts, etc).
 *
 * items: [{
 *   id, label, context, tone: 'danger'|'warning'|'info'|'neutral',
 *   statusLabel, actionLabel, onAction,
 * }]
 * Items are NOT re-sorted here — pass them pre-sorted by priority (most
 * urgent first) since urgency is domain-specific per portal.
 */
const TONE_ICON = {
  danger: 'error',
  warning: 'warning',
  info: 'info',
  neutral: 'radio_button_unchecked',
};

const TONE_DOT_BG = {
  danger: 'bg-rose-50 text-rose-600 dark:bg-rose-900/30 dark:text-rose-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400',
  info: 'bg-sky-50 text-sky-600 dark:bg-sky-900/30 dark:text-sky-400',
  neutral: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
};

const AttentionItem = ({ label, context, tone = 'neutral', statusLabel, actionLabel, onAction }) => (
  <li className="flex items-start gap-3 py-3">
    <span
      className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE_DOT_BG[tone] || TONE_DOT_BG.neutral}`}
      aria-hidden="true"
    >
      <span className="material-symbols-outlined text-[16px]">{TONE_ICON[tone] || TONE_ICON.neutral}</span>
    </span>
    <div className="min-w-0 flex-1">
      <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{label}</p>
      {context && <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">{context}</p>}
    </div>
    <div className="flex shrink-0 items-center gap-2">
      {statusLabel && <StatusBadge tone={tone === 'neutral' ? 'neutral' : tone} label={statusLabel} />}
      {actionLabel && onAction && (
        <button
          type="button"
          onClick={onAction}
          className="whitespace-nowrap text-xs font-bold transition-colors hover:underline"
          style={{ color: 'var(--portal-accent)' }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  </li>
);

const AttentionPanel = ({
  title = 'Needs Attention',
  items = [],
  loading = false,
  error = null,
  onRetry,
  emptyTitle = "Nothing needs attention",
  emptyDescription = "You're all caught up.",
  maxItems = 6,
  viewAllLabel,
  onViewAll,
  className = '',
}) => {
  const visible = items.slice(0, maxItems);

  return (
    <section
      className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5 ${className}`}
      style={{ boxShadow: 'var(--erp-shadow-soft)' }}
    >
      <div className="mb-1 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-sm font-black text-neutral-900 dark:text-neutral-100">
          <span className="material-symbols-outlined text-[18px] text-amber-500">notification_important</span>
          {title}
          {!loading && !error && items.length > 0 && (
            <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] font-bold text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400">
              {items.length}
            </span>
          )}
        </h2>
        {onViewAll && items.length > maxItems && (
          <button type="button" onClick={onViewAll} className="text-xs font-bold hover:underline" style={{ color: 'var(--portal-accent)' }}>
            {viewAllLabel || 'View all'}
          </button>
        )}
      </div>

      {loading && (
        <div className="space-y-3 py-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-8 w-8 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-2.5 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {!loading && error && (
        <ErrorState title="Unable to load attention items" description={error?.message} onRetry={onRetry} />
      )}

      {!loading && !error && visible.length === 0 && (
        <EmptyState icon="task_alt" title={emptyTitle} description={emptyDescription} />
      )}

      {!loading && !error && visible.length > 0 && (
        <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {visible.map((item) => (
            <AttentionItem key={item.id} {...item} />
          ))}
        </ul>
      )}
    </section>
  );
};

export default AttentionPanel;
export { AttentionItem };
