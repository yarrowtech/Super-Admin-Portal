
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../services/employee';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import { resolvePortalMenu } from '../../config/portalMenus';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const navItems = resolvePortalMenu('user').map(({ label, icon, path }) => ({ label, icon, path }));

const quickLinks = [
  { label: 'Standup Notes', icon: 'pending_actions' },
  { label: 'Timesheet', icon: 'schedule' },
  { label: 'Support', icon: 'support_agent' },
];

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
  const { user, logout, token } = useAuth();
  if (!canAccessPortal(user, PORTALS.EMPLOYEE)) return null;
  const navigate = useNavigate();
  const [chatUnread, setChatUnread] = useState(0);
  const [threadIds, setThreadIds] = useState([]);
  const threadIdsRef = useRef([]);
  const unreadMapRef = useRef({});
  const socketRef = useRef(null);
  const joinedThreadsRef = useRef(new Set());

  const displayName = useMemo(() => {
    if (!user) return 'Employee';
    const name = `${user.firstName || ''} ${user.lastName || ''}`.trim();
    return name || user.name || 'Employee';
  }, [user]);

  const initials = displayName?.[0]?.toUpperCase() || 'E';

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
    const list = Array.isArray(threadsOrIds) ? threadsOrIds : [];
    list.forEach((entry) => {
      const id = typeof entry === 'string' ? entry : getThreadId(entry);
      if (!id || joinedThreadsRef.current.has(id)) return;
      socket.emit('joinThread', id);
      joinedThreadsRef.current.add(id);
    });
  }, []);

  const refreshThreads = useCallback(async () => {
    if (!token) {
      mergeUnreadMap({});
      setThreadIds([]);
      return;
    }
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
      console.error('Failed to fetch chat unread count', err.message);
    }
  }, [token, mergeUnreadMap, joinThreads]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    refreshThreads();
  }, [refreshThreads]);

  useEffect(() => {
    if (!token) return undefined;
    const interval = setInterval(() => {
      refreshThreads();
    }, 60000);
    return () => clearInterval(interval);
  }, [token, refreshThreads]);

  useEffect(() => {
    if (!token) {
      mergeUnreadMap({});
      setThreadIds([]);
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      return undefined;
    }

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket'],
    });
    socketRef.current = socket;
    joinedThreadsRef.current = new Set();

    const handler = (message) => {
      const threadId = message?.thread?.toString?.() || message?.threadId?.toString?.();
      if (!threadId) return;
      const senderId = message?.senderId || message?.sender || '';
      const sender = senderId?.toString?.() || senderId;
      const currentUserId = user?.id?.toString?.() || user?._id?.toString?.();
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
    if (!threadIds.length) return;
    joinThreads(threadIds);
  }, [threadIds, joinThreads]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const handler = (event) => {
      const detail = event?.detail || {};
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

  return (
    <aside className="fixed left-0 top-0 z-[1000] hidden h-screen w-[250px] flex-col overflow-hidden border-r border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 md:flex">
      <div className="flex h-full flex-col">
        <div className="border-b border-slate-200 p-4 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-400 text-white shadow-lg shadow-primary/30">
              <span className="material-symbols-outlined text-2xl">blur_on</span>
            </div>
            <div className="flex max-w-[180px] flex-col">
              <p className="truncate text-[10px] font-semibold uppercase tracking-widest text-slate-500" title={displayName}>
                {displayName}
              </p>
              <h1
                className="truncate text-[11px] font-semibold text-slate-900 dark:text-white leading-tight"
                title={user?.email || 'Welcome'}
              >
                {user?.email || 'Welcome'}
              </h1>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3">
          <div className="flex flex-col gap-2">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  [
                    'flex min-h-11 items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm font-medium transition-all',
                    isActive
                      ? 'border-primary bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary'
                      : 'border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-white/5',
                  ].join(' ')
                }
              >
                {({ isActive }) => {
                  const isChatLink = item.path === '/employee/chat';
                  const showBadge = isChatLink && chatUnread > 0;
                  const displayUnread = chatUnread > 99 ? '99+' : chatUnread;
                  return (
                    <>
                      <span
                        className="material-symbols-outlined text-lg"
                        style={{ fontVariationSettings: `'FILL' ${isActive ? 1 : 0}` }}
                      >
                        {item.icon}
                      </span>
                      <span className="flex-1">{item.label}</span>
                      {showBadge && (
                        <span className="ml-auto shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-white dark:bg-primary/80">
                          {displayUnread}
                        </span>
                      )}
                    </>
                  );
                }}
              </NavLink>
            ))}
          </div>
        </nav>
        <div className="border-t border-slate-200 p-4 dark:border-slate-800">
          <button
            onClick={handleLogout}
            className="flex min-h-11 w-full items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-900/30"
          >
            <span className="material-symbols-outlined text-base">logout</span>
            <span className="text-left">Logout</span>
          </button>
        </div>
      </div>
    </aside>
  );
};

export default EmployeeSidebar;
