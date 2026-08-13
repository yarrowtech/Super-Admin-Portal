import React, { memo } from 'react';

/**
 * tone: 'accent' (default, uses --portal-accent) | 'success' | 'warning' | 'danger' | 'info'
 * Matches the same tone vocabulary as StatusBadge so a KPI's severity is
 * visually distinguishable from a plain count, not just its label text.
 */
const TONE_COLORS = {
  accent: { icon: 'var(--portal-accent)', bg: 'var(--portal-accent-soft)' },
  success: { icon: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  warning: { icon: '#d97706', bg: 'rgba(217, 119, 6, 0.12)' },
  danger: { icon: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' },
  info: { icon: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },
};

const KPICard = memo(({
  title = 'KPI Title',
  value = 0,
  icon = 'analytics',
  subtitle = '',
  trend,
  tone = 'accent',
  className = '',
  compact = false,
  // Legacy colorScheme prop accepted but ignored — accent comes from --portal-accent
  colorScheme,
}) => {
  const { icon: iconColor, bg } = TONE_COLORS[tone] || TONE_COLORS.accent;

  return (
  <div
    className={`group relative overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${
      compact ? 'p-4' : 'p-5 lg:p-6'
    } ${className}`}
    style={{ boxShadow: 'var(--erp-shadow-soft)' }}
  >
    {/* Decorative blob */}
    <div
      className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 transition-transform duration-300 group-hover:scale-125"
      style={{ background: bg }}
    />

    <div className="relative">
      <div className={`${compact ? 'mb-3' : 'mb-4'} flex items-center justify-between`}>
        <div
          className={`flex ${compact ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl'} shrink-0 items-center justify-center`}
          style={{ background: bg }}
        >
          <span
            className={`material-symbols-outlined ${compact ? 'text-[20px]' : 'text-[22px]'}`}
            style={{ color: iconColor }}
          >
            {icon}
          </span>
        </div>
        {subtitle && (
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
            {subtitle}
          </span>
        )}
      </div>

      <p
        className={`${compact ? 'text-2xl' : 'text-3xl'} font-black tracking-tight text-neutral-900 dark:text-neutral-100`}
      >
        {value}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-neutral-500 dark:text-neutral-400">{title}</p>
        {trend && (
          <span
            className={`flex shrink-0 items-center gap-0.5 text-[11px] font-bold ${
              trend.direction === 'up'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-rose-600 dark:text-rose-400'
            }`}
          >
            <span className="material-symbols-outlined text-[14px]">
              {trend.direction === 'up' ? 'trending_up' : 'trending_down'}
            </span>
            {trend.value}
          </span>
        )}
      </div>
    </div>
  </div>
  );
});

export default KPICard;
