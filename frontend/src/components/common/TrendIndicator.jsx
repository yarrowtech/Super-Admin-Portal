import React from 'react';

/**
 * Shared up/down trend chip. Semantic color is driven by `tone`, NOT by
 * `direction` alone — a metric like "Security incidents +20%" should render
 * danger even though the direction is "up". Callers decide meaning; this
 * component only renders it consistently.
 *
 * direction: 'up' | 'down' | 'flat'
 * tone: 'positive' | 'negative' | 'neutral' (default: inferred from direction —
 *   up = positive, down = negative, flat = neutral — for the common case where
 *   "more is better")
 */
const TONE_CLASSES = {
  positive: 'text-emerald-600 dark:text-emerald-400',
  negative: 'text-rose-600 dark:text-rose-400',
  neutral: 'text-neutral-500 dark:text-neutral-400',
};

const DIRECTION_ICON = {
  up: 'trending_up',
  down: 'trending_down',
  flat: 'trending_flat',
};

const TrendIndicator = ({ direction = 'flat', value, tone, label, size = 'sm', className = '' }) => {
  const resolvedTone = tone || (direction === 'up' ? 'positive' : direction === 'down' ? 'negative' : 'neutral');
  const textSize = size === 'sm' ? 'text-[11px]' : 'text-xs';
  const iconSize = size === 'sm' ? 'text-[14px]' : 'text-base';

  return (
    <span className={`inline-flex items-center gap-0.5 font-bold ${textSize} ${TONE_CLASSES[resolvedTone]} ${className}`}>
      <span className={`material-symbols-outlined ${iconSize}`} aria-hidden="true">
        {DIRECTION_ICON[direction] || DIRECTION_ICON.flat}
      </span>
      {value}
      {label && <span className="font-medium text-neutral-400 dark:text-neutral-500">{label}</span>}
    </span>
  );
};

export default TrendIndicator;
