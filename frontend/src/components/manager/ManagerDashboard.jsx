import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { managerApi } from '../../api/manager';
import { useAuth } from '../../context/AuthContext';
import { useNotifications } from '../../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import TaskDetailsModal from './TaskDetailsModal';
import NotificationDebug from './NotificationDebug';
import { shouldDeliverToManager } from '../../utils/notificationRouting';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const numberFormatter = new Intl.NumberFormat('en-US', { maximumFractionDigits: 1 });
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const ManagerDashboard = () => {
  const { token, user } = useAuth();
  const { addNotification } = useNotifications();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [realtimeStatus, setRealtimeStatus] = useState('connecting');
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskData, setSelectedTaskData] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const socketRef = useRef(null);

  const managerName = useMemo(() => {
    const full = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return full || user?.name || 'Manager';
  }, [user]);

  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode === 'true') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
      return;
    }
    if (savedDarkMode === 'false') {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
      return;
    }
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (prefersDark) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  }, []);

  const toggleDarkMode = () => {
    const html = document.documentElement;
    if (html.classList.contains('dark')) {
      html.classList.remove('dark');
      setIsDarkMode(false);
      localStorage.setItem('darkMode', 'false');
    } else {
      html.classList.add('dark');
      setIsDarkMode(true);
      localStorage.setItem('darkMode', 'true');
    }
  };

  useEffect(() => {
    if (!token) return undefined;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const res = await managerApi.getDashboard(token);
        if (!cancelled) {
          setSnapshot(res?.data?.data || res?.data || null);
          setError('');
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Failed to load dashboard');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  // Listen for real-time notifications from employee actions
  useEffect(() => {
    const handleManagerNotification = (event) => {
      const detail = event.detail;
      if (!detail) return;
      if (!shouldDeliverToManager(user, detail)) {
        return;
      }
      console.log('Received real-time notification:', detail);
      addNotification(detail);
    };

    // Listen for custom events (cross-component communication)
    window.addEventListener('managerNotification', handleManagerNotification);

    // Check for pending notifications in localStorage (cross-tab communication)
    const checkPendingNotifications = () => {
      const pending = localStorage.getItem('pendingManagerNotification');
      if (pending) {
        try {
          const notificationData = JSON.parse(pending);
          if (shouldDeliverToManager(user, notificationData)) {
            addNotification(notificationData);
          }
          localStorage.removeItem('pendingManagerNotification');
        } catch (err) {
          console.error('Failed to parse pending notification:', err);
        }
      }
    };

    checkPendingNotifications();
    
    return () => {
      window.removeEventListener('managerNotification', handleManagerNotification);
    };
  }, [addNotification, user]);

  useEffect(() => {
    if (!token || !user) return undefined;
    const managerId = user.id || user._id;
    if (!managerId) return undefined;
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
    });
    socketRef.current = socket;
    const payload = { managerId };

    socket.on('connect', () => {
      setRealtimeStatus('connecting');
      socket.emit('manager:subscribe', payload);
    });

    socket.on('manager:dashboard', (data) => {
      setSnapshot(data);
      setRealtimeStatus('live');
      setLoading(false);
      setError('');
    });

    socket.on('manager:dashboard:error', (payload = {}) => {
      setRealtimeStatus('error');
      setError(payload?.message || 'Live updates unavailable');
    });

    socket.on('manager:notification', (notificationData) => {
      if (shouldDeliverToManager(user, notificationData)) {
        addNotification(notificationData);
      }
    });

    socket.emit('manager:subscribe', payload);

    return () => {
      socket.emit('manager:unsubscribe', payload);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [token, user, addNotification]);

  const projectSummary = snapshot?.projectSummary || {};
  const taskSummary = snapshot?.taskSummary || {};
  const teamSummary = snapshot?.teamSummary || {};
  const alerts = snapshot?.alerts || {};
  const upcomingTasks = taskSummary?.upcoming || [];
  const recentProjects = projectSummary?.recent || [];
  const teamMembers = teamSummary?.members || [];

  const handleTaskClick = (taskId, taskData = null) => {
    setSelectedTaskId(taskId);
    setSelectedTaskData(taskData);
    setIsTaskModalOpen(true);
  };

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false);
    setSelectedTaskId(null);
    setSelectedTaskData(null);
  };

  const realtimeLabel = useMemo(() => {
    switch (realtimeStatus) {
      case 'live':
        return { text: 'Live data', color: 'text-emerald-500', dot: 'bg-emerald-500' };
      case 'error':
        return { text: 'Live feed offline', color: 'text-red-500', dot: 'bg-red-500' };
      default:
        return { text: 'Syncing…', color: 'text-amber-500', dot: 'bg-amber-500' };
    }
  }, [realtimeStatus]);

  return (
    <main className="flex-1 overflow-y-auto">
      <div className="mx-auto max-w-6xl p-4 sm:p-6">
        <div className="flex flex-col gap-4 mb-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="lg:hidden flex items-center justify-center w-10 h-10 rounded-lg border border-gray-200 bg-white text-gray-800 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined text-xl">menu</span>
              </button>
              <p className="text-gray-800 dark:text-white text-2xl sm:text-3xl font-black leading-tight tracking-[-0.033em]">
                Welcome back, {managerName}!
              </p>
            </div>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Your live snapshot updates every few seconds.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs font-semibold">
              <span className={`inline-flex size-2 rounded-full ${realtimeLabel.dot}`}></span>
              <span className={`${realtimeLabel.color}`}>{realtimeLabel.text}</span>
              {snapshot?.timestamp && (
                <span className="text-gray-500 dark:text-gray-400 font-normal">
                  Updated {new Date(snapshot.timestamp).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <NotificationPanel onTaskClick={handleTaskClick} />
            <div className="flex items-center gap-2 sm:gap-4">
              <button
                onClick={toggleDarkMode}
                className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:text-gray-200 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined text-base">
                  {isDarkMode ? 'light_mode' : 'dark_mode'}
                </span>
                <span className="hidden sm:inline">{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
                <div className="ml-2 flex items-center">
                  <div
                    className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${
                      isDarkMode ? 'bg-primary' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-3 w-3 transform rounded-full bg-white transition-transform ${
                        isDarkMode ? 'translate-x-5' : 'translate-x-1'
                      }`}
                    />
                  </div>
                </div>
              </button>
              <div className="flex min-w-[84px] cursor-pointer items-center justify-center rounded-lg border border-gray-200 bg-white px-3 sm:px-4 py-2 text-sm font-bold text-gray-800 hover:bg-gray-100 dark:border-gray-800 dark:bg-gray-800/50 dark:text-white dark:hover:bg-gray-800">
                <span className="material-symbols-outlined text-base">sync</span>
                <span className="ml-1 sm:ml-2 text-xs">{realtimeStatus === 'live' ? 'Live' : 'Sync'}</span>
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100">
            {error}
          </div>
        )}

        {loading && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-dashed border-gray-200 bg-white/50 px-4 py-3 text-sm text-gray-600 dark:border-gray-700 dark:bg-gray-800/30 dark:text-gray-300">
            <span className="material-symbols-outlined animate-spin text-base text-primary">progress_activity</span>
            Fetching your latest KPIs…
          </div>
        )}

        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Total Projects"
            value={numberFormatter.format(projectSummary.total || 0)}
            trend={`${projectSummary.active || 0} active`}
            icon="account_tree"
          />
          <StatCard
            label="Overdue Projects"
            value={numberFormatter.format(alerts.overdueProjects || 0)}
            trend={`${projectSummary.completed || 0} completed`}
            trendColor="text-red-500"
            icon="warning"
          />
          <StatCard
            label="Team Members"
            value={numberFormatter.format(teamSummary.totalMembers || 0)}
            trend={`${teamSummary.activeMembers || 0} active`}
            icon="group"
          />
          <StatCard
            label="Pending Tasks"
            value={numberFormatter.format((taskSummary.breakdown?.pending || 0) + (taskSummary.breakdown?.['in-progress'] || 0))}
            trend={`${taskSummary.overdue || 0} overdue`}
            trendColor={taskSummary.overdue ? 'text-red-500' : 'text-green-500'}
            icon="checklist"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Project Status</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Breakdown of all managed projects
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Total {projectSummary.total || 0}
                </span>
              </div>
              <div className="space-y-4">
                {['planning', 'in-progress', 'on-hold', 'completed', 'cancelled'].map((status) => {
                  const count = projectSummary.breakdown?.[status] || 0;
                  const percentage = projectSummary.total
                    ? Math.round((count / projectSummary.total) * 100)
                    : 0;
                  return (
                    <div key={status}>
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium capitalize text-gray-700 dark:text-gray-200">{status.replace('-', ' ')}</p>
                        <span className="text-sm font-semibold text-gray-600 dark:text-gray-300">
                          {count} • {percentage}%
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-indigo-400"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Upcoming Tasks</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Due in the next 7 days ({upcomingTasks.length})
                  </p>
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                  Live Feed
                </span>
              </div>
              {upcomingTasks.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No upcoming tasks.</p>
              ) : (
                <div className="space-y-3">
                  {upcomingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2 dark:border-gray-800"
                    >
                      <div>
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{task.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {task.project?.name || 'Unassigned project'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-medium text-gray-600 dark:text-gray-300">
                          {task.dueDate ? dateFormatter.format(new Date(task.dueDate)) : '—'}
                        </p>
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {task.priority || 'medium'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-4 sm:space-y-6">
            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Team At a Glance</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {teamSummary.department ? `${teamSummary.department} department` : 'Company-wide'}
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300">
                  {teamSummary.activeMembers || 0} active
                </span>
              </div>
              {teamMembers.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No team members found.</p>
              ) : (
                <div className="space-y-3">
                  {teamMembers.slice(0, 6).map((member) => (
                    <div key={member.id} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="flex size-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-indigo-400 text-white text-sm font-bold">
                          {member.name?.[0] || '?'}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">{member.name}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{member.email}</p>
                        </div>
                      </div>
                      <span
                        className={`text-xs font-semibold ${
                          member.isActive ? 'text-emerald-500' : 'text-gray-400'
                        }`}
                      >
                        {member.isActive ? 'Online' : 'Offline'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Recent Projects</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Newest activity first</p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{recentProjects.length} items</span>
              </div>
              {recentProjects.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent project updates.</p>
              ) : (
                <div className="space-y-3">
                  {recentProjects.map((project) => (
                    <div key={project.id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-gray-800 dark:text-white">{project.name}</p>
                        <span className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {project.status}
                        </span>
                      </div>
                      <div className="mt-2 flex items-center justify-between">
                        <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-gray-800">
                          <div
                            className="h-full rounded-full bg-primary"
                            style={{ width: `${project.progress || 0}%` }}
                          />
                        </div>
                        <span className="ml-2 text-xs font-semibold text-gray-600 dark:text-gray-300">
                          {project.progress || 0}%
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                        Updated{' '}
                        {project.updatedAt ? dateFormatter.format(new Date(project.updatedAt)) : 'recently'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <TaskDetailsModal
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        taskId={selectedTaskId}
        taskData={selectedTaskData}
      />
      <NotificationDebug />
    </main>
  );
};

const StatCard = ({ label, value, trend, trendColor = 'text-emerald-500', icon }) => (
  <div className="flex flex-col gap-2 rounded-xl border border-gray-200 bg-white p-5 text-gray-800 dark:border-gray-800 dark:bg-gray-900/40 dark:text-white">
    <div className="flex items-center justify-between">
      <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
      <span className="material-symbols-outlined text-gray-400">{icon}</span>
    </div>
    <p className="text-2xl font-bold">{value}</p>
    {trend && <p className={`text-sm font-medium ${trendColor}`}>{trend}</p>}
  </div>
);

export default ManagerDashboard;
