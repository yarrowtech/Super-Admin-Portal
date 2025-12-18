import React from 'react';
import ThemeToggleButton from './ThemeToggleButton';

const PortalHeader = ({
  title = 'Dashboard',
  subtitle = '',
  user,
  icon = 'dashboard',
  showSearch = true,
  showNotifications = true,
  showThemeToggle = true,
  onSearchChange,
  searchPlaceholder = 'Quick search...',
  children,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  const formatDate = () => {
    return new Date().toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <header className="mb-6 rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 dark:from-primary/20 dark:via-primary/10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        {/* Left side - Title and subtitle */}
        <div className="flex-1">
          <div className="mb-2 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-white shadow-lg">
              <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <div>
              <h1 className="text-3xl font-black leading-tight tracking-tight text-neutral-900 dark:text-neutral-100">
                {title}
              </h1>
              {subtitle && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
              )}
              {!subtitle && user && (
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  {getGreeting()}, <span className="font-semibold text-primary">{user.firstName || 'User'}</span>!
                </p>
              )}
            </div>
          </div>

          {/* Quick Stats Pills */}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-lg bg-white px-3 py-1.5 shadow-sm dark:bg-neutral-800">
              <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">
                calendar_today
              </span>
              <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">{formatDate()}</span>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-1.5 dark:bg-green-900/30">
              <span className="material-symbols-outlined text-lg text-green-600 dark:text-green-400">
                trending_up
              </span>
              <span className="text-sm font-semibold text-green-700 dark:text-green-300">
                All Systems Operational
              </span>
            </div>
            {children}
          </div>
        </div>

        {/* Right side - Search, Theme Toggle, Notifications */}
        <div className="flex items-center gap-3">
          {showSearch && (
            <div className="relative">
              <input
                type="text"
                onChange={onSearchChange}
                className="h-10 w-64 rounded-xl border-2 border-neutral-200 bg-white pl-10 pr-4 text-sm font-medium text-neutral-900 placeholder:text-neutral-500 transition-all focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                placeholder={searchPlaceholder}
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 material-symbols-outlined text-lg text-neutral-400">
                search
              </span>
            </div>
          )}

          {showThemeToggle && <ThemeToggleButton />}

          {showNotifications && (
            <button className="relative flex h-10 w-10 items-center justify-center rounded-xl border-2 border-neutral-200 bg-white text-neutral-700 transition-all hover:border-primary hover:text-primary hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              <span className="material-symbols-outlined text-lg">notifications</span>
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};

export default PortalHeader;
