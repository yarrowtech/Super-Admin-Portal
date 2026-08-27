import React from 'react';
import ProgressBar from './ProgressBar';

const TONE_BAR = {
  accent: 'bg-(--portal-accent,var(--color-primary))',
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
};

/**
 * Progress block with real context (not a bare "0%"): title, big percentage,
 * a supporting label (e.g. "18 of 29 tasks completed"), the bar itself, and
 * an optional remaining/comparison line.
 */
const ProgressCard = ({ title, percent = 0, label, remainingLabel, tone = 'accent', className = '' }) => {
  const clamped = Math.min(100, Math.max(0, percent));

  return (
    <div className={`rounded-xl border border-neutral-100 p-4 dark:border-neutral-800 ${className}`}>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        {title && <p className="text-sm font-bold text-neutral-800 dark:text-neutral-100">{title}</p>}
        <p className="text-lg font-black text-neutral-900 dark:text-neutral-100">{clamped}%</p>
      </div>
      <ProgressBar value={clamped} colorClass={TONE_BAR[tone] || TONE_BAR.accent} />
      <div className="mt-2 flex items-center justify-between gap-2 text-xs text-neutral-500 dark:text-neutral-400">
        {label && <span>{label}</span>}
        {remainingLabel && <span className="font-semibold">{remainingLabel}</span>}
      </div>
    </div>
  );
};

export default ProgressCard;
