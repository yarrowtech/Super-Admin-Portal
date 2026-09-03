import React, { memo } from 'react';
import TrendIndicator from './TrendIndicator';

/**
 * tone: 'accent' (default, uses --portal-accent) | 'success' | 'warning' | 'danger' | 'info' | 'neutral'
 * Matches the same tone vocabulary as StatusBadge so a KPI's severity is
 * visually distinguishable from a plain count, not just its label text.
 *
 * priority: 'primary' (default) | 'secondary' — secondary KPIs render smaller
 * and less prominently so a dashboard can visually rank ~4 headline metrics
 * above supporting ones instead of giving every stat equal weight.
 *
 * context: short supporting text shown under the value when there's no real
 * trend to compare against (e.g. "No projects assigned") — use this instead
 * of a fabricated percentage.
 *
 * action: { label, onClick } — optional "View X →" link at the bottom of the card.
 * tooltip: optional help text for an info icon next to the title, for KPIs whose
 * calculation isn't self-evident (e.g. "Platform Health").
 *
 * onClick: makes the whole card act as a filter toggle (e.g. a "Pending" stat
 * that jumps the list below to the matching filter). `active` highlights it
 * with the tone color when that filter is currently selected.
 *
 * variant: 'default' (current look, unchanged) | 'minimal' — a quieter Linear/Notion-style
 * tile (no decorative blob, hairline border, no hover lift) for callers that want a
 * restrained stat row instead of the default's bolder card treatment.
 */
const TONE_COLORS = {
  accent: { icon: 'var(--portal-accent)', bg: 'var(--portal-accent-soft)' },
  success: { icon: '#059669', bg: 'rgba(5, 150, 105, 0.12)' },
  warning: { icon: '#d97706', bg: 'rgba(217, 119, 6, 0.12)' },
  danger: { icon: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' },
  info: { icon: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },
  neutral: { icon: '#525252', bg: 'rgba(82, 82, 82, 0.1)' },
};

const KPICard = memo(({
  title = 'KPI Title',
  value = 0,
  icon = 'analytics',
  subtitle = '',
  trend,
  context,
  action,
  tooltip,
  tone = 'accent',
  priority = 'primary',
  className = '',
  compact = false,
  onClick,
  active = false,
  variant = 'default',
  // Legacy colorScheme prop accepted but ignored — accent comes from --portal-accent
  colorScheme,
}) => {
  const { icon: iconColor, bg } = TONE_COLORS[tone] || TONE_COLORS.accent;
  const isCompact = compact || priority === 'secondary';
  const Tag = onClick ? 'button' : 'div';

  if (variant === 'minimal') {
    return (
      <Tag
        type={onClick ? 'button' : undefined}
        onClick={onClick}
        aria-pressed={onClick ? active : undefined}
        className={`flex flex-col gap-2 rounded-xl border text-left transition-colors duration-150 ${
          active
            ? 'border-[var(--portal-accent)]/40 bg-[var(--portal-accent-soft)]'
            : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-neutral-700'
        } ${onClick ? 'w-full cursor-pointer' : ''} p-4 ${className}`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            <span className="material-symbols-outlined shrink-0 text-[15px]" style={{ color: iconColor }}>{icon}</span>
            <span className="truncate">{title}</span>
            {tooltip && (
              <span className="material-symbols-outlined shrink-0 cursor-help text-[13px] text-neutral-400 dark:text-neutral-500" title={tooltip} aria-label={tooltip}>
                info
              </span>
            )}
          </span>
          {trend && <TrendIndicator direction={trend.direction} value={trend.value} tone={trend.tone} />}
        </div>
        <p className="text-2xl font-semibold tracking-tight text-neutral-900 dark:text-neutral-100">{value}</p>
        {!trend && context && <p className="text-xs text-neutral-400 dark:text-neutral-500">{context}</p>}
      </Tag>
    );
  }

  return (
  <Tag
    type={onClick ? 'button' : undefined}
    onClick={onClick}
    aria-pressed={onClick ? active : undefined}
    className={`group relative overflow-hidden rounded-2xl border bg-white text-left shadow-sm transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md dark:bg-neutral-900 ${
      active ? 'border-[var(--portal-accent)] ring-2 ring-[var(--portal-accent)]/20' : 'border-neutral-200 dark:border-neutral-800'
    } ${onClick ? 'w-full cursor-pointer' : ''} ${
      isCompact ? 'p-4' : 'p-5 lg:p-6'
    } ${className}`}
    style={{ boxShadow: 'var(--erp-shadow-soft)' }}
  >
    {/* Decorative blob */}
    <div
      className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full opacity-40 transition-transform duration-300 group-hover:scale-125"
      style={{ background: bg }}
    />

    <div className="relative">
      <div className={`${isCompact ? 'mb-3' : 'mb-4'} flex items-center justify-between`}>
        <div
          className={`flex ${isCompact ? 'h-10 w-10 rounded-xl' : 'h-12 w-12 rounded-2xl'} shrink-0 items-center justify-center`}
          style={{ background: bg }}
        >
          <span
            className={`material-symbols-outlined ${isCompact ? 'text-[20px]' : 'text-[22px]'}`}
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
        className={`${isCompact ? 'text-2xl' : 'text-3xl'} font-black tracking-tight text-neutral-900 dark:text-neutral-100`}
      >
        {value}
      </p>

      <div className="mt-1 flex items-center justify-between gap-2">
        <p className="flex items-center gap-1 text-sm font-medium text-neutral-500 dark:text-neutral-400">
          {title}
          {tooltip && (
            <span
              className="material-symbols-outlined cursor-help text-[14px] text-neutral-400 dark:text-neutral-500"
              title={tooltip}
              aria-label={tooltip}
            >
              info
            </span>
          )}
        </p>
        {trend && (
          <TrendIndicator direction={trend.direction} value={trend.value} tone={trend.tone} />
        )}
      </div>

      {!trend && context && (
        <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">{context}</p>
      )}

      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="mt-3 inline-flex items-center gap-1 text-xs font-bold transition-colors hover:underline"
          style={{ color: 'var(--portal-accent)' }}
        >
          {action.label}
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </button>
      )}
    </div>
  </Tag>
  );
});

export default KPICard;
