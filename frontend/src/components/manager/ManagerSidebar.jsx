import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../api/employee';

const navItems = [
  { label: 'Dashboard', icon: 'dashboard', path: '/manager/dashboard' },
  { label: 'Work Board', icon: 'work_history', path: '/manager/work-board' },
  { label: 'Tasks', icon: 'task_alt', path: '/manager/tasks' },
  { label: 'Products', icon: 'inventory_2', path: '/manager/products' },
  { label: 'Team', icon: 'group', path: '/manager/team' },
  { label: 'Leave', icon: 'event_note', path: '/manager/leave' },
  { label: 'Reports', icon: 'assessment', path: '/manager/reports' },
  { label: 'Chat', icon: 'forum', path: '/manager/chat', showBadge: true },
];

const deriveUnreadCount = (thread) => {
  if (!thread) return 0;
  if (typeof thread.unreadCount === 'number') return thread.unreadCount;
  if (typeof thread.unread === 'number') return thread.unread;
  if (typeof thread.unreadMessages === 'number') return thread.unreadMessages;
  return 0;
};

const ManagerSidebar = () => {
  const location = useLocation();
  const { user, logout, token } = useAuth();
  const [chatUnread, setChatUnread] = useState(0);

  const displayName = useMemo(() => {
    if (!user) return 'Manager';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.name || 'Manager';
  }, [user]);

  const initials = useMemo(() => displayName?.[0]?.toUpperCase() || 'M', [displayName]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await employeeApi.getChatThreads(token);
        if (cancelled) return;
        const list = res?.data || res || [];
        const total = list.reduce((sum, thread) => sum + deriveUnreadCount(thread), 0);
        setChatUnread(total);
      } catch (err) {
        console.error('Failed to fetch manager chat unread count', err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    const handler = (event) => {
      const detail = event?.detail || {};
      if (typeof detail.count === 'number') {
        setChatUnread(detail.count);
      }
    };
    window.addEventListener('manager-chat-unread-changed', handler);
    return () => window.removeEventListener('manager-chat-unread-changed', handler);
  }, []);

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-800/20 -translate-x-full lg:translate-x-0 transition-transform z-50">
      <div className="flex min-h-screen flex-col justify-between p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3 p-2">
            <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-400 text-white text-lg font-semibold">
              {initials}
            </div>
            <div className="flex flex-col">
              <h1 className="text-base font-medium text-gray-800 dark:text-white">{displayName}</h1>
              <p className="text-sm text-gray-600 dark:text-gray-400">{user?.role?.toUpperCase() || 'MANAGER'}</p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            {navItems.map((item) => {
              const isActive = location.pathname.startsWith(item.path);
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-primary/10 text-primary dark:bg-primary/20'
                      : 'text-gray-800 hover:bg-gray-100 dark:text-gray-200 dark:hover:bg-gray-800/50'
                  }`}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                  >
                    {item.icon}
                  </span>
                  {item.label}
                  {item.showBadge && chatUnread > 0 && (
                    <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white">
                      {chatUnread > 99 ? '99+' : chatUnread}
                    </span>
                  )}
                </NavLink>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          <button
            onClick={logout}
            className="flex h-11 items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-600 transition hover:bg-red-100 dark:border-red-500/30 dark:bg-red-900/40 dark:text-red-100 dark:hover:bg-red-900/60"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            Logout
          </button>
        </div>
      </div>
    </aside>
  );
};

export default ManagerSidebar;
