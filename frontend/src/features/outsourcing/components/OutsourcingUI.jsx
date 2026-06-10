import { memo } from 'react';

const statusTone = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  accepted: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  draft: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300',
};

export const OutsourcingCard = memo(({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950 lg:p-5 ${className}`}>
    {children}
  </section>
));

export const OutsourcingBadge = memo(({ value }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[String(value || '').toLowerCase()] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'}`}>
    {String(value || 'unknown').replaceAll('_', ' ')}
  </span>
));

export const OutsourcingPageHeader = memo(({ title, subtitle, right }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold tracking-tight text-neutral-900 dark:text-white lg:text-2xl">{title}</h1>
      {subtitle ? <p className="text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p> : null}
    </div>
    <div className="w-full sm:w-auto">{right}</div>
  </div>
));

export const OutsourcingEmptyState = memo(({ title, subtitle }) => (
  <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
    <p className="font-semibold text-neutral-700 dark:text-neutral-200">{title}</p>
    {subtitle ? <p className="mt-1">{subtitle}</p> : null}
  </div>
));

export const OutsourcingErrorState = memo(({ message = 'Failed to load data.', onRetry }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
    <p className="font-semibold">Something went wrong</p>
    <p className="mt-1">{message}</p>
    {onRetry ? (
      <button onClick={onRetry} className="mt-3 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white dark:bg-rose-500">
        Retry
      </button>
    ) : null}
  </div>
));

export const OutsourcingLoadingList = memo(({ rows = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="animate-pulse rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    ))}
  </div>
));
