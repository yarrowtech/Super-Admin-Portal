import React from 'react';

/**
 * Canonical status pill used across every admin page.
 * tone: 'success' | 'warning' | 'danger' | 'info' | 'neutral'
 */
const toneStyles = {
  success: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  warning: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  danger: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400',
  info: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  neutral: 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300',
};

const dotStyles = {
  success: 'bg-emerald-600',
  warning: 'bg-amber-600',
  danger: 'bg-rose-600',
  info: 'bg-sky-600',
  neutral: 'bg-neutral-500',
};

const StatusBadge = ({ tone = 'neutral', label, dot = true, className = '' }) => {
  const resolvedTone = toneStyles[tone] ? tone : 'neutral';
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${toneStyles[resolvedTone]} ${className}`}
    >
      {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${dotStyles[resolvedTone]}`} aria-hidden="true" />}
      {label}
    </span>
  );
};

export default StatusBadge;
