import React from 'react';

// One shared sidebar header for every portal: icon + portal name + collapse toggle only — no
// subtitle/description. Portal name is the primary identity in the sidebar, so it gets the
// stronger (but still restrained) weight; the user row below it stays visually secondary.
const SidebarPortalIdentity = ({ icon = 'dashboard', title, collapsed = false, onToggleCollapse }) => (
  <div className={`flex shrink-0 items-center border-b border-neutral-100 dark:border-neutral-800 ${collapsed ? 'justify-center py-3' : 'gap-2.5 px-3 py-3'}`}>
    {!collapsed && title && (
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--portal-accent)] to-[var(--portal-accent)]/70 text-white shadow-md">
          <span className="material-symbols-outlined text-[20px]">{icon}</span>
        </div>
        <p className="min-w-0 truncate text-[15px] font-semibold leading-none text-neutral-900 dark:text-neutral-100">{title}</p>
      </div>
    )}
    <button
      type="button"
      onClick={onToggleCollapse}
      title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]/40 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 ${collapsed ? '' : 'ml-auto'}`}
      aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
    >
      <span className="material-symbols-outlined text-[18px]">{collapsed ? 'menu_open' : 'menu'}</span>
    </button>
  </div>
);

export default SidebarPortalIdentity;
