import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../services/employee';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import { resolvePortalMenu } from '../../config/portalMenus';
import PortalSidebar from '../common/PortalSidebar';
import { useSidebar } from '../../context/SidebarContext';
import { createLogger } from '../../utils/logger';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const employeeSidebarLogger = createLogger({ module: 'employee-sidebar' });

const BASE_NAV_ITEMS = resolvePortalMenu('user').map(({ label, icon, path }) => ({ label, icon, path }));

const getThreadId = (thread) =>
  thread?._id?.toString?.() || thread?.id?.toString?.() || thread?._id || thread?.id || null;

const deriveUnreadCount = (thread) => {
  if (!thread) return 0;
  if (typeof thread.unreadCount === 'number') return thread.unreadCount;
  if (typeof thread.unread === 'number') return thread.unread;
  if (typeof thread.unreadMessages === 'number') return thread.unreadMessages;
  return 0;
};

const EmployeeSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, token } = useAuth();
  const { collapsed } = useSidebar();
  const [chatUnread, setChatUnread] = useState(0);
  const [threadIds, setThreadIds] = useState([]);
  const [mobileOpen, setMobileOpen] = useState(false);
  const threadIdsRef = useRef([]);
  const unreadMapRef = useRef({});
  const socketRef = useRef(null);
  const joinedThreadsRef = useRef(new Set());

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login');
  }, [logout, navigate]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  const navItems = useMemo(
    () => BASE_NAV_ITEMS.map((item) =>
      item.path === '/employee/chat' ? { ...item, badge: chatUnread } : item
    ),
    [chatUnread]
  );

  const mergeUnreadMap = useCallback((map) => {
    unreadMapRef.current = map;
    const total = Object.values(map).reduce(
      (sum, count) => sum + (Number.isFinite(count) ? count : 0),
      0
    );
    setChatUnread(total);
  }, []);

  const joinThreads = useCallback((threadsOrIds) => {
    const socket = socketRef.current;
    if (!socket) return;
    (Array.isArray(threadsOrIds) ? threadsOrIds : []).forEach((entry) => {
      const id = typeof entry === 'string' ? entry : getThreadId(entry);
      if (!id || joinedThreadsRef.current.has(id)) return;
      socket.emit('joinThread', id);
      joinedThreadsRef.current.add(id);
    });
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!token) { mergeUnreadMap({}); setThreadIds([]); return; }
    try {
      const res = await employeeApi.getChatThreads(token);
      const list = res?.data || res || [];
      const nextMap = {};
      const ids = [];
      list.forEach((thread) => {
        const id = getThreadId(thread);
        if (!id) return;
        ids.push(id);
        nextMap[id] = deriveUnreadCount(thread);
      });
      mergeUnreadMap(nextMap);
      setThreadIds(ids);
      joinThreads(list);
    } catch (err) {
      employeeSidebarLogger.error({ err }, 'Failed to fetch chat unread count');
    }
  }, [token, mergeUnreadMap, joinThreads]);

  useEffect(() => { refreshThreads(); }, [refreshThreads]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(refreshThreads, 60000);
    return () => clearInterval(interval);
  }, [token, refreshThreads]);

  useEffect(() => {
    if (!token) {
      mergeUnreadMap({});
      setThreadIds([]);
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
      return undefined;
    }
    const socket = io(SOCKET_URL, { withCredentials: true, transports: ['websocket'] });
    socketRef.current = socket;
    joinedThreadsRef.current = new Set();

    const handler = (message) => {
      const threadId = message?.thread?.toString?.() || message?.threadId?.toString?.();
      if (!threadId) return;
      const sender = (message?.senderId || message?.sender || '')?.toString?.();
      const currentUserId = (user?.id || user?._id)?.toString?.();
      if (sender && currentUserId && sender === currentUserId) return;
      const nextMap = { ...unreadMapRef.current };
      nextMap[threadId] = (nextMap[threadId] || 0) + 1;
      mergeUnreadMap(nextMap);
    };

    socket.on('chat:message', handler);
    joinThreads(threadIdsRef.current);
    return () => {
      socket.off('chat:message', handler);
      socket.disconnect();
      socketRef.current = null;
      joinedThreadsRef.current = new Set();
    };
  }, [token, user, mergeUnreadMap, joinThreads]);

  useEffect(() => {
    threadIdsRef.current = threadIds;
    if (threadIds.length) joinThreads(threadIds);
  }, [threadIds, joinThreads]);

  useEffect(() => {
    const handler = (e) => {
      const detail = e?.detail || {};
      const entries = Array.isArray(detail.threadCounts) ? detail.threadCounts : null;
      if (entries) {
        const map = {};
        const ids = [];
        entries.forEach(({ id, count }) => {
          if (!id) return;
          ids.push(id);
          map[id] = typeof count === 'number' ? count : 0;
        });
        mergeUnreadMap(map);
        setThreadIds(ids);
        joinThreads(ids);
      } else if (typeof detail.count === 'number') {
        setChatUnread(detail.count);
      }
    };
    window.addEventListener('employee-chat-unread-changed', handler);
    return () => window.removeEventListener('employee-chat-unread-changed', handler);
  }, [mergeUnreadMap, joinThreads]);

  if (!canAccessPortal(user, PORTALS.EMPLOYEE)) return null;

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
          <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">Employee Portal</p>
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
      <div className={`fixed left-0 top-0 z-[1000] hidden h-screen shadow-lg md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
        <PortalSidebar
          brandingTitle="Employee Portal"
          brandingSubtitle="Work hub"
          brandingIcon="person"
          user={user}
          navItems={navItems}
          currentPath={location.pathname}
          onLogout={handleLogout}
          footerItems={[
            { path: '/employee/settings', label: 'Settings', icon: 'settings' },
            { path: '/employee/support',  label: 'Support',  icon: 'support_agent' },
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
              brandingTitle="Employee Portal"
              brandingSubtitle="Work hub"
              brandingIcon="person"
              user={user}
              navItems={navItems}
              currentPath={location.pathname}
              onLogout={handleLogout}
              onNavigate={closeMobile}
              footerItems={[
                { path: '/employee/settings', label: 'Settings', icon: 'settings' },
                { path: '/employee/support',  label: 'Support',  icon: 'support_agent' },
              ]}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default EmployeeSidebar;
