import React from 'react';
import ThemeToggleButton from './ThemeToggleButton';
import Button from './Button';

/**
 * dateRange: { value, options: [{key,label}], onChange } — renders a segmented
 *   control (e.g. [7D] [30D] [90D]). Omit entirely if the dashboard has no
 *   time-scoped data to filter.
 * lastUpdated: string, e.g. "2 min ago" — omit if freshness isn't tracked.
 * onRefresh / refreshing: optional manual refresh affordance.
 * primaryAction / secondaryAction: { label, icon, onClick } — only pass one if
 *   a real action exists behind it (e.g. "Create User" -> opens the real modal).
 */
const PortalHeader = ({
  title = 'Dashboard',
  subtitle = '',
  user,
  icon = 'dashboard',
  showThemeToggle = true,
  actions,
  children,
  dateRange,
  lastUpdated,
  onRefresh,
  refreshing = false,
  primaryAction,
  secondaryAction,
  // Legacy props accepted but no-op
  showSearch,
  showNotifications,
  onSearchChange,
  searchPlaceholder,
}) => {
  const getGreeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () =>
    new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });

  const hasMetaRow = Boolean(lastUpdated || onRefresh || dateRange || primaryAction || secondaryAction);

  return (
    <header className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
      {/* Accent top bar */}
      <div className="h-1 w-full" style={{ background: 'var(--portal-accent)' }} />

      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6 md:py-4">
        {/* Left — icon + title */}
        <div className="flex min-w-0 items-center gap-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ background: 'var(--portal-accent)' }}
          >
            <span className="material-symbols-outlined text-[22px] text-white">{icon}</span>
          </div>
          <div className="min-w-0">
            <h1 className="truncate text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">
              {title}
            </h1>
            <p className="truncate text-[12px] text-neutral-500 dark:text-neutral-400">
              {subtitle
                ? subtitle
                : user
                ? `${getGreeting()}, ${user.firstName || 'User'}`
                : formatDate()}
            </p>
          </div>
        </div>

        {/* Right — actions + theme toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {children}
          {actions}
          {showThemeToggle && <ThemeToggleButton />}
        </div>
      </div>

      {hasMetaRow && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-neutral-100 px-4 py-3 dark:border-neutral-800 md:px-6">
          <div className="flex flex-wrap items-center gap-3">
            {lastUpdated && (
              <span className="flex items-center gap-1 text-xs text-neutral-400 dark:text-neutral-500">
                <span className="material-symbols-outlined text-[14px]">schedule</span>
                Updated {lastUpdated}
              </span>
            )}
            {onRefresh && (
              <button
                type="button"
                onClick={onRefresh}
                disabled={refreshing}
                aria-label="Refresh dashboard data"
                title="Refresh"
                className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-neutral-500 transition-colors hover:bg-neutral-100 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-neutral-800"
              >
                <span className={`material-symbols-outlined text-[14px] ${refreshing ? 'animate-spin' : ''}`}>
                  refresh
                </span>
                {refreshing ? 'Refreshing…' : 'Refresh'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {dateRange?.options?.length > 0 && (
              <div
                role="group"
                aria-label="Date range"
                className="inline-flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-800 dark:bg-neutral-900"
              >
                {dateRange.options.map((opt) => {
                  const active = opt.key === dateRange.value;
                  return (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => dateRange.onChange(opt.key)}
                      aria-pressed={active}
                      className={`min-h-8 rounded-md px-3 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
                        active
                          ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                          : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            )}
            {secondaryAction && (
              <Button variant="secondary" size="sm" icon={secondaryAction.icon && <span className="material-symbols-outlined text-base">{secondaryAction.icon}</span>} onClick={secondaryAction.onClick}>
                {secondaryAction.label}
              </Button>
            )}
            {primaryAction && (
              <Button variant="primary" size="sm" icon={primaryAction.icon && <span className="material-symbols-outlined text-base">{primaryAction.icon}</span>} onClick={primaryAction.onClick}>
                {primaryAction.label}
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default PortalHeader;
