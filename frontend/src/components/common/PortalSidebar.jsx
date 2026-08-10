import React, { memo, useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useSidebar } from '../../context/SidebarContext';

/* ─── Tooltip for mini mode ─────────────────────────────────────── */
const MiniTooltip = memo(({ label }) => (
  <span
    className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-white dark:text-neutral-900"
    aria-hidden="true"
  >
    {label}
    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-white" />
  </span>
));

/* ─── Single nav item ────────────────────────────────────────────── */
const NavItem = memo(({ item, collapsed, isActive, onClick, suffix }) => {
  const badge = typeof item.badge === 'number' && item.badge > 0 ? item.badge : 0;
  const badgeLabel = badge > 99 ? '99+' : String(badge);
  return (
    <NavLink
      to={item.path}
      onClick={onClick}
      className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
        isActive
          ? 'bg-[var(--portal-accent)] text-white shadow-sm'
          : 'text-neutral-600 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
      } ${collapsed ? 'justify-center px-0' : ''}`}
      aria-label={collapsed ? item.label : undefined}
    >
      <span className={`relative shrink-0 ${collapsed ? 'mx-auto' : ''}`}>
        <span
          className="material-symbols-outlined text-[20px] transition-none"
          style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
        >
          {item.icon}
        </span>
        {collapsed && badge > 0 && (
          <span className="absolute -right-1 -top-1 flex h-[14px] min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white dark:ring-neutral-950">
            {badgeLabel}
          </span>
        )}
      </span>
      {!collapsed && <span className="flex-1 truncate leading-none">{item.label}</span>}
      {!collapsed && badge > 0 && (
        <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
          {badgeLabel}
        </span>
      )}
      {!collapsed && suffix}
      {collapsed && <MiniTooltip label={badge > 0 ? `${item.label} (${badgeLabel})` : item.label} />}
    </NavLink>
  );
});

/* ─── Collapsible group button ───────────────────────────────────── */
const GroupButton = memo(({ item, collapsed, isActive, isOpen, onToggle }) => (
  <button
    type="button"
    onClick={onToggle}
    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
      isActive
        ? 'bg-[var(--portal-accent)] text-white shadow-sm'
        : 'text-neutral-600 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
    } ${collapsed ? 'justify-center px-0' : ''}`}
    aria-expanded={isOpen}
    aria-label={collapsed ? item.label : undefined}
  >
    <span
      className={`material-symbols-outlined shrink-0 text-[20px] ${collapsed ? 'mx-auto' : ''}`}
      style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
    >
      {item.icon}
    </span>
    {!collapsed && (
      <>
        <span className="flex-1 truncate text-left leading-none">{item.label}</span>
        <span
          className={`material-symbols-outlined shrink-0 text-[16px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${isActive ? 'text-white/80' : 'text-neutral-400'}`}
        >
          expand_more
        </span>
      </>
    )}
    {collapsed && <MiniTooltip label={item.label} />}
  </button>
));

/* ─── Main PortalSidebar ─────────────────────────────────────────── */
const PortalSidebar = ({
  brandingTitle = 'Portal',
  brandingSubtitle = 'Management System',
  brandingIcon = 'dashboard',
  showBranding = true,
  user,
  navItems = [],
  currentPath = '',
  onLogout,
  onNavigate,
  footerItems: footerItemsProp,
}) => {
  const { collapsed, toggle } = useSidebar();
  const [openGroups, setOpenGroups] = useState({});
  const resolvedNavItems = useMemo(() => navItems, [navItems]);

  const footerItems = footerItemsProp ?? [];

  const isPathActive  = (path) => {
    if (!path) return false;
    const pathname = String(path).split('?')[0];
    return currentPath === pathname || currentPath.startsWith(pathname + '/');
  };
  const isGroupActive = (item) => Boolean(item?.children?.some((c) => isPathActive(c.path) || isGroupActive(c)));

  // Auto-open the active group on mount / path change
  useEffect(() => {
    const autoOpen = {};
    const collectActive = (items) => {
      items.forEach((item) => {
        if (!Array.isArray(item.children) || item.children.length === 0) return;
        if (isGroupActive(item)) autoOpen[item.path] = true;
        collectActive(item.children);
      });
    };
    collectActive(resolvedNavItems);
    setOpenGroups((prev) => ({ ...prev, ...autoOpen }));
  }, [currentPath]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleGroup = (path) => setOpenGroups((prev) => ({ ...prev, [path]: !prev[path] }));

  const sidebarW = collapsed ? 'w-16' : 'w-[250px]';

  return (
    <aside
      className={`flex h-screen shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white shadow-sidebar transition-[width] duration-300 ease-out-expo dark:border-neutral-800 dark:bg-neutral-950 ${sidebarW}`}
    >
      {/* ── Branding / Collapse toggle ── */}
      <div className={`flex shrink-0 items-center border-b border-neutral-100 dark:border-neutral-800 ${collapsed ? 'justify-center py-3.5' : 'gap-3 px-4 py-3.5'}`}>
        {showBranding && !collapsed && (
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--portal-accent)] to-[var(--portal-accent)]/70 text-white shadow-md">
              <span className="material-symbols-outlined text-[20px]">{brandingIcon}</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{brandingTitle}</p>
              <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{brandingSubtitle}</p>
            </div>
          </div>
        )}
        {/* Collapse toggle button */}
        <button
          type="button"
          onClick={toggle}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition hover:bg-neutral-100 hover:text-neutral-700 dark:hover:bg-neutral-800 dark:hover:text-neutral-200 ${collapsed ? '' : 'ml-auto'}`}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <span className="material-symbols-outlined text-[18px]">
            {collapsed ? 'menu_open' : 'menu'}
          </span>
        </button>
      </div>

      {/* ── User Info ── */}
      {user && !collapsed && (
        <div className="shrink-0 px-3 py-2.5">
          <div className="flex items-center gap-2.5 rounded-xl bg-neutral-50 px-3 py-2.5 dark:bg-neutral-900">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-xs font-bold text-[var(--portal-accent)]">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-semibold text-neutral-900 dark:text-neutral-100">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-[11px] text-neutral-400 dark:text-neutral-500">{user.email}</p>
            </div>
            {user.role && (
              <span className="shrink-0 rounded-full bg-[var(--portal-accent-soft)] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wide text-[var(--portal-accent)]">
                {user.role}
              </span>
            )}
          </div>
        </div>
      )}

      {/* User avatar in mini mode */}
      {user && collapsed && (
        <div className="group relative flex shrink-0 justify-center py-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--portal-accent)]/15 text-xs font-bold text-[var(--portal-accent)]">
            {user.firstName?.[0]}{user.lastName?.[0]}
          </div>
          <MiniTooltip label={`${user.firstName} ${user.lastName} · ${user.role || ''}`} />
        </div>
      )}

      {/* Section divider */}
      {!collapsed && (
        <div className="mx-3 mb-1 mt-0.5 h-px bg-neutral-100 dark:bg-neutral-800" />
      )}

      {/* ── Navigation ── */}
      <nav
        className="flex-1 overflow-y-auto px-2 pb-2 pt-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700"
      >
        <div className="space-y-0.5">
          {resolvedNavItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const isActive = hasChildren
              ? isGroupActive(item)
              : isPathActive(item.path);
            const isOpen = openGroups[item.path] ?? false;

            return (
              <div key={item.path}>
                {hasChildren ? (
                  <GroupButton
                    item={item}
                    collapsed={collapsed}
                    isActive={isActive}
                    isOpen={isOpen}
                    onToggle={() => toggleGroup(item.path)}
                  />
                ) : (
                  <NavItem
                    item={item}
                    collapsed={collapsed}
                    isActive={isActive}
                    onClick={onNavigate}
                    suffix={isActive && !collapsed ? (
                      <span className="material-symbols-outlined shrink-0 text-[14px] text-white/70">chevron_right</span>
                    ) : null}
                  />
                )}

                {/* Children (only when expanded sidebar) */}
                {hasChildren && isOpen && !collapsed && (
                  <div className="mb-0.5 ml-3 mt-0.5 space-y-0.5 border-l-2 border-neutral-100 pl-3 dark:border-neutral-800">
                    {item.children.map((child) => {
                      const childHasChildren = Array.isArray(child.children) && child.children.length > 0;
                      const childActive = isPathActive(child.path) || isGroupActive(child);
                      const childOpen = openGroups[child.path] ?? false;

                      return childHasChildren ? (
                        <div key={child.path}>
                          <button
                            type="button"
                            onClick={() => toggleGroup(child.path)}
                            className={`flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all ${
                              childActive
                                ? 'bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]'
                                : 'text-neutral-500 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                            }`}
                          >
                            <span className="material-symbols-outlined text-[15px]">folder_open</span>
                            <span className="flex-1 truncate text-left">{child.label}</span>
                            <span className={`material-symbols-outlined text-[14px] transition-transform duration-200 ${childOpen ? 'rotate-180' : ''}`}>
                              expand_more
                            </span>
                          </button>
                          {childOpen && (
                            <div className="ml-2 mt-0.5 space-y-0.5 border-l-2 border-neutral-100 pl-3 dark:border-neutral-800">
                              {child.children.map((sub) => (
                                <NavLink
                                  key={sub.path}
                                  to={sub.path}
                                  onClick={onNavigate}
                                  className={({ isActive: a }) =>
                                    `block rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all ${
                                      a
                                        ? 'bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]'
                                        : 'text-neutral-500 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                                    }`
                                  }
                                >
                                  {sub.label}
                                </NavLink>
                              ))}
                            </div>
                          )}
                        </div>
                      ) : (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          onClick={onNavigate}
                          className={({ isActive: a }) =>
                            `block rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all ${
                              a
                                ? 'bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]'
                                : 'text-neutral-500 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                            }`
                          }
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* ── Footer ── */}
      <div className="shrink-0 border-t border-neutral-100 px-2 pb-3 pt-2 dark:border-neutral-800">
        <div className="space-y-0.5">
          {footerItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={onNavigate}
                className={`group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  isActive
                    ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : 'text-neutral-600 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                aria-label={collapsed ? item.label : undefined}
              >
                <span
                  className={`material-symbols-outlined shrink-0 text-[20px] ${collapsed ? 'mx-auto' : ''}`}
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
                {collapsed && <MiniTooltip label={item.label} />}
              </NavLink>
            );
          })}

          <button
            type="button"
            onClick={onLogout}
            className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-all duration-150 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 ${collapsed ? 'justify-center px-0' : ''}`}
            aria-label={collapsed ? 'Logout' : undefined}
          >
            <span className={`material-symbols-outlined shrink-0 text-[20px] ${collapsed ? 'mx-auto' : ''}`}>logout</span>
            {!collapsed && <span className="flex-1 text-left">Logout</span>}
            {collapsed && <MiniTooltip label="Logout" />}
          </button>
        </div>
      </div>
    </aside>
  );
};

export default memo(PortalSidebar);
