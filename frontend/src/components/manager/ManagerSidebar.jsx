import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../services/employee';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { useSidebar } from '../../context/SidebarContext';
import { createLogger } from '../../utils/logger';

const BASE_NAV_ITEMS = [
  { label: 'Dashboard',   icon: 'dashboard',       path: '/manager/dashboard' },
  { label: 'Project Overview', icon: 'folder_copy', path: '/manager/project-overview' },
  { label: 'Work Board',  icon: 'work_history',    path: '/manager/work-board' },
  { label: 'Tasks',       icon: 'task_alt',        path: '/manager/tasks' },
  { label: 'Recruitment', icon: 'person_search',   path: '/manager/recruitment' },
  { label: 'Outsourcing', icon: 'handshake',       path: '/manager/outsourcing' },
  { label: 'Products',    icon: 'inventory_2',     path: '/manager/products' },
  { label: 'Team',        icon: 'group',           path: '/manager/team' },
  { label: 'Leave',       icon: 'event_note',      path: '/manager/leave' },
  { label: 'Reports',     icon: 'assessment',      path: '/manager/reports' },
  { label: 'Chat',        icon: 'forum',           path: '/manager/chat', showBadge: true },
];
const managerSidebarLogger = createLogger({ module: 'manager-sidebar' });

const deriveUnreadCount = (thread) => {
  if (!thread) return 0;
  if (typeof thread.unreadCount === 'number') return thread.unreadCount;
  if (typeof thread.unread === 'number') return thread.unread;
  if (typeof thread.unreadMessages === 'number') return thread.unreadMessages;
  return 0;
};

const ManagerSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { collapsed } = useSidebar();
  const [chatUnread, setChatUnread] = useState(0);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const navItems = useMemo(
    () => BASE_NAV_ITEMS.map((item) =>
      item.showBadge ? { ...item, badge: chatUnread } : item
    ),
    [chatUnread]
  );

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const res = await employeeApi.getChatThreads(token);
        if (cancelled) return;
        const list = res?.data || res || [];
        setChatUnread(list.reduce((sum, t) => sum + deriveUnreadCount(t), 0));
      } catch (err) {
        managerSidebarLogger.error({ err }, 'Failed to fetch manager chat unread count');
      }
    })();
    return () => { cancelled = true; };
  }, [token]);

  useEffect(() => {
    const handler = (e) => {
      if (typeof e?.detail?.count === 'number') setChatUnread(e.detail.count);
    };
    window.addEventListener('manager-chat-unread-changed', handler);
    return () => window.removeEventListener('manager-chat-unread-changed', handler);
  }, []);

  if (!canAccessPortal(user, PORTALS.MANAGER)) return null;

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-700 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-200 dark:hover:bg-neutral-800"
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">Manager Portal</p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user?.firstName} {user?.lastName}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 dark:text-red-400 dark:hover:bg-red-900/20"
          aria-label="Logout"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className={`fixed left-0 top-0 z-1000 hidden h-screen shadow-lg md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
        <PortalSidebar
          brandingTitle="Manager Portal"
          brandingSubtitle="Team operations"
          brandingIcon="supervisor_account"
          user={user}
          navItems={navItems}
          currentPath={location.pathname}
          onLogout={handleLogout}
          footerItems={[
            { path: '/manager/settings', label: 'Settings', icon: 'settings' },
            { path: '/manager/support',  label: 'Support',  icon: 'support_agent' },
          ]}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={closeMobile}
            aria-label="Close navigation overlay"
          />
          <div className="relative h-full w-[min(250px,86vw)] shadow-2xl">
            <PortalSidebar
              brandingTitle="Manager Portal"
              brandingSubtitle="Team operations"
              brandingIcon="supervisor_account"
              user={user}
              navItems={navItems}
              currentPath={location.pathname}
              onLogout={handleLogout}
              onNavigate={closeMobile}
              footerItems={[
                { path: '/manager/settings', label: 'Settings', icon: 'settings' },
                { path: '/manager/support',  label: 'Support',  icon: 'support_agent' },
              ]}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ManagerSidebar;
