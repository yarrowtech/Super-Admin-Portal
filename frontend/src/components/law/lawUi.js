export const LAW_ACCENT = {
  bg: 'bg-[var(--portal-accent)]',
  text: 'text-[var(--portal-accent)]',
  soft: 'bg-[var(--portal-accent-soft)]',
  border: 'border-[var(--portal-accent)]',
  ring: 'focus:ring-[var(--portal-accent)]',
  hoverBg: 'hover:bg-[var(--portal-accent-soft)]',
};

export const lawCardClass = 'rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950';
export const lawPanelClass = 'rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950';
export const lawControlClass = 'h-10 rounded-lg border border-neutral-200 bg-white px-3 text-sm text-neutral-700 outline-none transition focus:border-[var(--portal-accent)] focus:ring-2 focus:ring-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200';
export const lawPrimaryButtonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--portal-accent)] px-4 text-sm font-semibold text-white transition hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent)]/30 disabled:cursor-not-allowed disabled:opacity-60';
export const lawSecondaryButtonClass = 'inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800';

export const LAW_STATUS_BADGE = {
  draft: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:ring-neutral-700',
  pending: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  'pending approval': 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  'in review': 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  active: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  resolved: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  rejected: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-700',
  overdue: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-700',
  critical: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-700',
  attention: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-700',
  'changes requested': 'bg-purple-50 text-purple-700 ring-purple-200 dark:bg-purple-900/20 dark:text-purple-300 dark:ring-purple-700',
  archived: 'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
};

export const LAW_PRIORITY_BADGE = {
  low: 'bg-slate-50 text-slate-600 ring-slate-200 dark:bg-slate-900/30 dark:text-slate-300 dark:ring-slate-700',
  medium: 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  high: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  critical: 'bg-red-50 text-red-700 ring-red-200 dark:bg-red-900/20 dark:text-red-300 dark:ring-red-700',
};

export const getLawBadgeClass = (value, fallback = LAW_STATUS_BADGE.draft) => (
  LAW_STATUS_BADGE[String(value || '').trim().toLowerCase()] || fallback
);

export const getLawPriorityClass = (value) => (
  LAW_PRIORITY_BADGE[String(value || '').trim().toLowerCase()] || LAW_PRIORITY_BADGE.medium
);
