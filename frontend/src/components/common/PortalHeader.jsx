import React from 'react';
import ThemeToggleButton from './ThemeToggleButton';

const PortalHeader = ({
  title = 'Dashboard',
  subtitle = '',
  user,
  icon = 'dashboard',
  showThemeToggle = true,
  actions,
  children,
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
    </header>
  );
};

export default PortalHeader;
