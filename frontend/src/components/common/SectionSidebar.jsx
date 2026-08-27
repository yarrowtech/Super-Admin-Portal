import React, { memo, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import SidebarPortalIdentity from './SidebarPortalIdentity';
import SidebarUserCard from './SidebarUserCard';

const MiniTooltip = memo(({ label }) => (
  <span
    className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-white dark:text-neutral-900"
    aria-hidden="true"
  >
    {label}
    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-white" />
  </span>
));

// A group item ({ id, label, icon, children: [...] }) renders as a collapsible
// disclosure instead of a plain button. Flat items (no `children`) are unaffected —
// this keeps Finance/IT, which only ever pass flat items, pixel-identical.
const isGroupActive = (item, activeId) => Array.isArray(item.children) && item.children.some((child) => child.id === activeId);

const SectionSidebar = ({
  title = 'Portal',
  icon = 'dashboard',
  items = [],
  activeId = '',
  onSelect,
  footerItems = [],
}) => {
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const { collapsed, toggle } = useSidebar();
  const [manualGroups, setManualGroups] = useState({});

  // Derived, not effect-driven: whichever group contains the active section is
  // open by default, unless the user has explicitly toggled it since.
  const openGroups = useMemo(() => {
    const computed = { ...manualGroups };
    items.forEach((item) => {
      if (isGroupActive(item, activeId) && !(item.id in manualGroups)) computed[item.id] = true;
    });
    return computed;
  }, [items, activeId, manualGroups]);

  const toggleGroup = (id) => setManualGroups((prev) => ({ ...prev, [id]: !(openGroups[id] ?? false) }));

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const sidebarW = collapsed ? 'w-16' : 'w-[250px]';

  return (
    <aside
      className={`fixed left-0 top-0 z-[1000] hidden h-screen shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white shadow-sidebar transition-[width] duration-300 ease-out-expo dark:border-neutral-800 dark:bg-neutral-950 md:flex ${sidebarW}`}
    >
      <SidebarPortalIdentity icon={icon} title={title} collapsed={collapsed} onToggleCollapse={toggle} />

      <SidebarUserCard user={user} collapsed={collapsed} />

      {!collapsed && <div className="mx-3 mb-1 mt-0.5 h-px bg-neutral-100 dark:bg-neutral-800" />}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
        <div className="space-y-0.5">
          {items.map((item, idx) => {
            const hasChildren = Array.isArray(item.children) && item.children.length > 0;
            // A group is never the *selected* page itself — only a leaf can be. When a
            // descendant is active, the group should read as "open context", not "selected",
            // so exactly one item in the tree ever gets the solid active fill.
            const isActive = !hasChildren && activeId === item.id;
            const groupHasActiveChild = hasChildren && isGroupActive(item, activeId);
            const groupActive = groupHasActiveChild;
            const isOpen = openGroups[item.id] ?? false;
            // Groups always get a breathing-room break above them (a hairline rule
            // when collapsed-open state changes context) so sibling sections never
            // read as one continuous list — this is what the flat rendering lacked.
            const sectionBreak = idx > 0 && hasChildren;
            // Groups don't carry their own badge — roll up children's counts so the
            // total is visible on the header itself, collapsed rail included. Once
            // the group is open, the children show their own badges instead.
            const groupBadge = hasChildren ? item.children.reduce((sum, child) => sum + (Number(child.badge) || 0), 0) : item.badge;
            const showHeaderBadge = groupBadge > 0 && !isActive && !groupHasActiveChild && !(hasChildren && isOpen && !collapsed);
            // Icon reads "filled" whenever this item is the selected leaf, or is the
            // group currently containing it — same signal the soft-tint background uses.
            const iconFilled = isActive || groupHasActiveChild;

            return (
              <div
                key={item.id}
                className={sectionBreak ? 'mt-3 border-t border-neutral-100 pt-3 dark:border-neutral-800' : ''}
              >
                <button
                  type="button"
                  onClick={() => (hasChildren ? toggleGroup(item.id) : onSelect?.(item.id))}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : hasChildren && (groupHasActiveChild || isOpen)
                      ? 'bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]'
                      : 'text-neutral-600 hover:translate-x-0.5 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  aria-label={collapsed ? item.label : undefined}
                  aria-expanded={hasChildren ? isOpen : undefined}
                  aria-current={isActive ? 'page' : undefined}
                >
                  <span
                    className={`material-symbols-outlined shrink-0 text-[20px] ${collapsed ? 'mx-auto' : ''}`}
                    style={{ fontVariationSettings: `'FILL' ${iconFilled ? 1 : 0}` }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && (
                    <>
                      <div className="min-w-0 flex-1 text-left">
                        <div
                          title={item.label}
                          className={`${hasChildren ? 'text-[12px] font-semibold leading-tight' : 'truncate font-medium leading-none'}`}
                        >
                          {item.label}
                        </div>
                        {item.description && !isActive && !hasChildren && (
                          <div className="mt-0.5 truncate text-[11px] text-neutral-400 dark:text-neutral-500">{item.description}</div>
                        )}
                      </div>
                      {showHeaderBadge && (
                        <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                          {groupBadge > 99 ? '99+' : groupBadge}
                        </span>
                      )}
                      {hasChildren ? (
                        <span
                          className={`material-symbols-outlined shrink-0 text-[18px] transition-transform duration-200 ${isOpen ? 'rotate-180' : ''} ${groupActive || isOpen ? 'text-[var(--portal-accent)]/70' : 'text-neutral-400'}`}
                        >
                          expand_more
                        </span>
                      ) : isActive ? (
                        <span className="material-symbols-outlined shrink-0 text-[14px] text-white/70">chevron_right</span>
                      ) : null}
                    </>
                  )}
                  {collapsed && groupBadge > 0 && !isActive && !groupHasActiveChild && (
                    <span className="absolute -right-1 -top-1 flex h-3.5 min-w-[14px] items-center justify-center rounded-full bg-rose-500 px-0.5 text-[8px] font-bold text-white ring-2 ring-white dark:ring-neutral-950">
                      {groupBadge > 99 ? '99+' : groupBadge}
                    </span>
                  )}
                  {collapsed && <MiniTooltip label={groupBadge > 0 ? `${item.label} (${groupBadge})` : item.label} />}
                </button>

                {hasChildren && !collapsed && (
                  <div
                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out-expo ${
                      isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="overflow-hidden">
                      <div className="relative mb-0.5 ml-[19px] mt-1 space-y-1 border-l border-neutral-200 pl-3 dark:border-neutral-800">
                        {item.children.map((child) => {
                          const childActive = activeId === child.id;
                          return (
                            <button
                              key={child.id}
                              type="button"
                              onClick={() => onSelect?.(child.id)}
                              aria-current={childActive ? 'page' : undefined}
                              className={`relative flex w-full items-center gap-2 rounded-lg py-2 pl-2.5 pr-2 text-[13px] font-medium transition-all ${
                                childActive
                                  ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                                  : 'text-neutral-500 hover:translate-x-0.5 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                              }`}
                            >
                              {childActive && (
                                <span className="absolute -left-[15px] top-1/2 h-6 w-0.5 -translate-y-1/2 rounded-full bg-[var(--portal-accent)]" />
                              )}
                              <span
                                className="material-symbols-outlined text-[16px] shrink-0"
                                style={{ fontVariationSettings: `'FILL' ${childActive ? 1 : 0}` }}
                              >
                                {child.icon || 'chevron_right'}
                              </span>
                              <span className="flex-1 truncate text-left">{child.label}</span>
                              {child.badge > 0 && !childActive && (
                                <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">
                                  {child.badge > 99 ? '99+' : child.badge}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-neutral-100 px-2 pb-3 pt-2 dark:border-neutral-800">
        {footerItems.length > 0 && (
          <div className="mb-0.5 space-y-0.5">
            {footerItems.map((item) => {
              const isActive = activeId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onSelect?.(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                      : 'border border-transparent text-neutral-600 hover:translate-x-0.5 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                  } ${collapsed ? 'justify-center px-0' : ''}`}
                  aria-label={collapsed ? item.label : undefined}
                >
                  <span
                    className={`material-symbols-outlined shrink-0 text-[20px] ${collapsed ? 'mx-auto' : ''}`}
                    style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                  >
                    {item.icon}
                  </span>
                  {!collapsed && <span className="flex-1 truncate text-left leading-none">{item.label}</span>}
                  {collapsed && <MiniTooltip label={item.label} />}
                </button>
              );
            })}
          </div>
        )}
        <button
          type="button"
          onClick={handleLogout}
          className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-rose-600 transition-all duration-150 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20 ${collapsed ? 'justify-center px-0' : ''}`}
          aria-label={collapsed ? 'Logout' : undefined}
        >
          <span className={`material-symbols-outlined shrink-0 text-[20px] ${collapsed ? 'mx-auto' : ''}`}>logout</span>
          {!collapsed && <span className="flex-1 text-left">Logout</span>}
          {collapsed && <MiniTooltip label="Logout" />}
        </button>
      </div>
    </aside>
  );
};

export default SectionSidebar;
