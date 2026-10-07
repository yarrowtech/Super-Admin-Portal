import React, { memo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import { useSidebar } from '../../context/SidebarContext';
import SidebarPortalIdentity from '../common/SidebarPortalIdentity';
import SidebarUserCard from '../common/SidebarUserCard';
import useSupportUnread from '../../hooks/useSupportUnread';

const MiniTooltip = memo(({ label }) => (
  <span
    className="pointer-events-none absolute left-full top-1/2 z-[9999] ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-neutral-900 px-2.5 py-1.5 text-xs font-semibold text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 dark:bg-white dark:text-neutral-900"
    aria-hidden="true"
  >
    {label}
    <span className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-neutral-900 dark:border-r-white" />
  </span>
));

// Grouped by business function rather than listed flat: fourteen peers give no clue which
// module answers which question, and scanning them costs more than reading a heading. Keys,
// labels and icons are unchanged — only the arrangement is new, so every existing view
// still resolves exactly as before.
const menuSections = [
  {
    section: 'Overview',
    items: [{ key: 'dashboard', label: 'Overview Dashboard', icon: 'dashboard' }],
  },
  {
    section: 'Projects',
    items: [
      { key: 'projectOverview', label: 'Project Overview', icon: 'folder_copy' },
      { key: 'projectUpdates', label: 'Project Updates', icon: 'update' },
    ],
  },
  {
    section: 'Finance',
    items: [{ key: 'revenueAnalytics', label: 'Revenue Analytics', icon: 'payments' }],
  },
  {
    section: 'People',
    items: [
      { key: 'employees', label: 'Employee Analytics', icon: 'groups' },
      { key: 'departmentStats', label: 'Department Insights', icon: 'bar_chart' },
    ],
  },
  {
    section: 'Product',
    items: [{ key: 'productInsights', label: 'Product Insights', icon: 'insights' }],
  },
  {
    section: 'Marketing',
    items: [
      { key: 'mediaAnalysis', label: 'Media Analysis', icon: 'analytics' },
      { key: 'marketingAnalytics', label: 'Marketing Analytics', icon: 'trending_up' },
      { key: 'salesQueryAnalytics', label: 'Sales Query Analytics', icon: 'query_stats' },
    ],
  },
  {
    section: 'Governance',
    items: [{ key: 'legalApproval', label: 'Legal Approval', icon: 'gavel' }],
  },
  {
    section: 'Reporting',
    items: [{ key: 'reports', label: 'Reports', icon: 'summarize' }],
  },
  {
    section: 'Communication',
    items: [
      { key: 'chat', label: 'Chat', icon: 'chat' },
      { key: 'notifications', label: 'Notifications', icon: 'notifications' },
    ],
  },
];

const CEOSidebar = ({ currentView = 'dashboard', onViewChange }) => {
  const { logout, user } = useAuth();
  const navigate = useNavigate();
  const { collapsed, toggle } = useSidebar();
  const supportUnread = useSupportUnread();

  if (!canAccessPortal(user, PORTALS.CEO)) return null;

  const handleViewChange = (view) => {
    onViewChange?.(view);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const sidebarW = collapsed ? 'w-16' : 'w-[250px]';

  return (
    <aside
      className={`fixed left-0 top-0 z-[1000] hidden h-screen shrink-0 flex-col overflow-hidden border-r border-neutral-200 bg-white shadow-sidebar transition-[width] duration-300 ease-out-expo dark:border-neutral-800 dark:bg-neutral-950 md:flex ${sidebarW}`}
    >
      <SidebarPortalIdentity
        icon="business_center"
        title="CEO Console"
        collapsed={collapsed}
        onToggleCollapse={toggle}
      />

      <SidebarUserCard user={user} collapsed={collapsed} />

      {!collapsed && <div className="mx-3 mb-1 mt-0.5 h-px bg-neutral-100 dark:bg-neutral-800" />}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 pt-1 [scrollbar-width:thin] [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-neutral-200 dark:[&::-webkit-scrollbar-thumb]:bg-neutral-700">
        {/* Each group is its own labelled list, so a screen reader announces the section
            as well as the item. Collapsed, the headings would not fit, so the groups are
            separated by a rule instead and the tooltip carries the label. */}
        {menuSections.map((group, groupIndex) => (
          <div key={group.section} className={groupIndex > 0 ? 'mt-3' : ''}>
            {!collapsed ? (
              <p className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                {group.section}
              </p>
            ) : (
              groupIndex > 0 && <div className="mx-3 mb-2 h-px bg-neutral-100 dark:bg-neutral-800" />
            )}
            <div className="space-y-0.5" role="group" aria-label={group.section}>
              {group.items.map((item) => {
                const active = currentView === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => handleViewChange(item.key)}
                    aria-current={active ? 'page' : undefined}
                    className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      active
                        ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                        : 'text-neutral-600 hover:translate-x-0.5 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                    } ${collapsed ? 'justify-center px-0' : ''}`}
                    aria-label={collapsed ? `${group.section}: ${item.label}` : undefined}
                  >
                    <span
                      className={`material-symbols-outlined shrink-0 text-[20px] transition-none ${collapsed ? 'mx-auto' : ''}`}
                      style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}
                    >
                      {item.icon}
                    </span>
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate text-left leading-none">{item.label}</span>
                        {active && <span className="material-symbols-outlined shrink-0 text-[14px] text-white/70">chevron_right</span>}
                      </>
                    )}
                    {collapsed && <MiniTooltip label={item.label} />}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="shrink-0 border-t border-neutral-100 px-2 pb-3 pt-2 dark:border-neutral-800">
        <div className="space-y-0.5">
          {[
            { key: 'settings', label: 'Settings', icon: 'settings' },
            { key: 'support',  label: 'Support',  icon: 'support_agent' },
          ].map((item) => {
            const active = currentView === item.key;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => handleViewChange(item.key)}
                aria-current={active ? 'page' : undefined}
                className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                  active
                    ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                    : 'text-neutral-600 hover:translate-x-0.5 hover:bg-[var(--portal-accent-soft)] hover:text-[var(--portal-accent)] dark:text-neutral-400'
                } ${collapsed ? 'justify-center px-0' : ''}`}
                aria-label={collapsed ? item.label : undefined}
              >
                <span
                  className={`material-symbols-outlined shrink-0 text-[20px] transition-none ${collapsed ? 'mx-auto' : ''}`}
                  style={{ fontVariationSettings: `'FILL' ${active ? 1 : 0}` }}
                >
                  {item.icon}
                </span>
                {!collapsed && <span className="flex-1 truncate text-left leading-none">{item.label}</span>}
                {!collapsed && item.key === 'support' && supportUnread > 0 && (
                  <span className="shrink-0 rounded-full bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold leading-none text-white">{supportUnread > 99 ? '99+' : supportUnread}</span>
                )}
                {collapsed && <MiniTooltip label={item.label} />}
              </button>
            );
          })}
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
      </div>
    </aside>
  );
};

export default CEOSidebar;
