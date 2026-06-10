import React, { useEffect, useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import ThemeToggleButton from './ThemeToggleButton';

const PortalSidebar = ({
  brandingTitle = 'Portal',
  brandingSubtitle = 'Management System',
  brandingIcon = 'dashboard',
  showBranding = true,
  user,
  navItems = [],
  currentPath = '',
  onLogout,
}) => {
  const [hoveredItem, setHoveredItem] = useState(null);
  const [openGroups, setOpenGroups] = useState({});
  const resolvedNavItems = useMemo(() => navItems, [navItems]);

  const handleLogout = () => {
    if (onLogout) {
      onLogout();
    }
  };

  const footerItems = [
    { path: '/settings', label: 'Settings', icon: 'settings', description: 'Manage preferences' },
    { path: '/support', label: 'Support', icon: 'help', description: 'Get help' },
  ];

  const isPathActive = (path) => Boolean(path) && (currentPath === path || currentPath.startsWith(path + '/'));

  const isGroupActive = (item) =>
    Boolean(item?.children?.some((child) => isPathActive(child.path) || isGroupActive(child)));

  const collectActiveGroups = (items = [], next = {}) => {
    items.forEach((item) => {
      if (!Array.isArray(item.children) || item.children.length === 0) return;
      if (isGroupActive(item)) {
        next[item.path] = true;
      }
      collectActiveGroups(item.children, next);
    });
    return next;
  };

  useEffect(() => {
    const autoOpen = collectActiveGroups(resolvedNavItems);
    setOpenGroups((prev) => {
      const merged = { ...prev, ...autoOpen };
      const changed = Object.keys(merged).some((key) => merged[key] !== prev[key]) || Object.keys(prev).some((key) => !(key in merged));
      return changed ? merged : prev;
    });
  }, [currentPath, resolvedNavItems]);

  useEffect(() => {
    // Debug hook for role-based rendering validation.
    console.debug('[PortalSidebar] mounted', { role: user?.role || 'unknown', navCount: resolvedNavItems.length });
  }, [resolvedNavItems.length, user?.role]);

  return (
    <aside className="sticky top-0 z-[1000] flex h-screen w-[250px] shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      {/* Branding */}
      {showBranding && (
        <div className="border-b border-neutral-200 p-4 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg">
              <span className="material-symbols-outlined text-xl">{brandingIcon}</span>
            </div>
            <div>
              <h1 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{brandingTitle}</h1>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">{brandingSubtitle}</p>
            </div>
          </div>
        </div>
      )}

      {/* User Info */}
      {user && (
        <div className={`border-neutral-200 p-4 dark:border-neutral-800 ${showBranding ? 'border-b' : ''}`}>
          <div className="flex min-h-11 items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
              {user.firstName?.[0]}{user.lastName?.[0]}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                {user.firstName} {user.lastName}
              </p>
              <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user.email}</p>
            </div>
            {user.role && (
              <span className="rounded-full bg-[color:var(--portal-accent-soft)] px-2 py-0.5 text-[10px] font-semibold uppercase text-[var(--portal-accent)]">
                {user.role}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="space-y-2">
          {resolvedNavItems.map((item) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            const isActive = hasChildren
              ? isGroupActive(item)
              : currentPath === item.path || currentPath.startsWith(item.path + '/');
            const isOpen = openGroups[item.path] ?? false;
            return (
              <div key={item.path}>
                {hasChildren ? (
                  <button
                    type="button"
                    onClick={() => setOpenGroups((prev) => ({ ...prev, [item.path]: !isOpen }))}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`group relative flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-all ${
                      isActive
                        ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white font-semibold shadow-md'
                        : 'border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                    >
                      {item.icon}
                    </span>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{item.label}</div>
                      {hoveredItem === item.path && !isActive && item.description && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{item.description}</div>
                      )}
                    </div>
                    <span className="material-symbols-outlined text-lg">{isOpen ? 'expand_less' : 'chevron_right'}</span>
                  </button>
                ) : (
                  <NavLink
                    to={item.path}
                    onMouseEnter={() => setHoveredItem(item.path)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className={`group relative flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-all ${
                      isActive
                        ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white font-semibold shadow-md'
                        : 'border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined text-xl"
                      style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                    >
                      {item.icon}
                    </span>
                    <div className="flex-1">
                      <div className="font-medium">{item.label}</div>
                      {hoveredItem === item.path && !isActive && item.description && (
                        <div className="text-xs text-neutral-500 dark:text-neutral-400">{item.description}</div>
                      )}
                    </div>
                    {isActive && <span className="material-symbols-outlined text-lg">chevron_right</span>}
                  </NavLink>
                )}
                {hasChildren && isOpen ? (
                  <div className="mt-1 space-y-1 pl-10">
                    {item.children.map((child) => {
                      const childHasChildren = Array.isArray(child.children) && child.children.length > 0;
                      const childActive = isPathActive(child.path) || isGroupActive(child);
                      const childOpen = openGroups[child.path] ?? false;

                      return childHasChildren ? (
                        <div key={child.path}>
                          <button
                            type="button"
                            onClick={() => setOpenGroups((prev) => ({ ...prev, [child.path]: !childOpen }))}
                            className={`group relative flex min-h-10 w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-all ${
                              childActive
                                ? 'bg-[color:var(--portal-accent-soft)] font-semibold text-[var(--portal-accent)]'
                                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                            }`}
                          >
                            <span className="material-symbols-outlined text-base">folder_open</span>
                            <span className="flex-1 text-left">{child.label}</span>
                            <span className="material-symbols-outlined text-base">{childOpen ? 'expand_less' : 'chevron_right'}</span>
                          </button>
                          {childOpen ? (
                            <div className="mt-1 space-y-1 pl-8">
                              {child.children.map((subChild) => {
                                const subActive = isPathActive(subChild.path);
                                return (
                                  <NavLink
                                    key={subChild.path}
                                    to={subChild.path}
                                    className={`block rounded-lg px-3 py-2 text-sm transition-all ${
                                      subActive
                                        ? 'bg-[color:var(--portal-accent-soft)] font-semibold text-[var(--portal-accent)]'
                                        : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                                    }`}
                                  >
                                    {subChild.label}
                                  </NavLink>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      ) : (
                        <NavLink
                          key={child.path}
                          to={child.path}
                          className={`block rounded-lg px-3 py-2 text-sm transition-all ${
                            childActive
                              ? 'bg-[color:var(--portal-accent-soft)] font-semibold text-[var(--portal-accent)]'
                              : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                          }`}
                        >
                          {child.label}
                        </NavLink>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer - Settings, Theme Toggle, Support, Logout */}
      <div className="border-t border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-3 space-y-2">
          {footerItems.map((item) => {
            const isActive = currentPath === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onMouseEnter={() => setHoveredItem(item.path)}
                onMouseLeave={() => setHoveredItem(null)}
                className={`group relative flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-all ${
                  isActive
                    ? 'border-[var(--portal-accent)] bg-[var(--portal-accent)] text-white font-semibold shadow-md'
                    : 'border-transparent text-neutral-600 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800'
                }`}
              >
                <span
                  className="material-symbols-outlined text-lg"
                  style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                >
                  {item.icon}
                </span>
                <div className="flex-1">
                  <div className="font-medium">{item.label}</div>
                  {hoveredItem === item.path && !isActive && item.description && (
                    <div className="text-xs text-neutral-500 dark:text-neutral-400">{item.description}</div>
                  )}
                </div>
              </NavLink>
            );
          })}
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm text-red-600 transition-all hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
        >
          <span className="material-symbols-outlined text-lg">logout</span>
          <span className="flex-1 text-left font-medium">Logout</span>
        </button>
      </div>
    </aside>
  );
};

export default PortalSidebar;
