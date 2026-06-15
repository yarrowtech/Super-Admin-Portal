import React from 'react';

const PortalTopNavbar = ({ title = 'Workspace', subtitle = '', user }) => (
  <header className="sticky top-0 z-30 hidden h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-5 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 md:flex">
    <div className="min-w-0">
      <h1 className="truncate text-base font-semibold text-neutral-900 dark:text-neutral-100">{title}</h1>
      {subtitle ? <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p> : null}
    </div>
    <div className="text-right">
      <p className="text-sm font-semibold text-neutral-800 dark:text-neutral-100">
        {[user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'User'}
      </p>
      <p className="text-xs uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{user?.role || 'member'}</p>
    </div>
  </header>
);

export default PortalTopNavbar;
