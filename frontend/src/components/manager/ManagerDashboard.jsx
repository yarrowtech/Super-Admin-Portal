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
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveListMode, setLeaveListMode] = useState('pending');
  const [leaveLoading, setLeaveLoading] = useState(false);
  const [leaveError, setLeaveError] = useState('');
  const [workUpdates, setWorkUpdates] = useState([]);
  const [workUpdatesLoading, setWorkUpdatesLoading] = useState(false);
  const [workUpdatesError, setWorkUpdatesError] = useState('');
  const [workUpdatesTotal, setWorkUpdatesTotal] = useState(0);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [selectedTaskData, setSelectedTaskData] = useState(null);
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceAction, setAttendanceAction] = useState({ loading: false, error: '', message: '' });
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const ATTENDANCE_STORAGE_KEY = 'manager-dashboard-attendance';
  const socketRef = useRef(null);

  const managerName = useMemo(() => {
    const full = `${user?.firstName || ''} ${user?.lastName || ''}`.trim();
    return full || user?.name || 'Manager';
  }, [user]);

  const normalizeAttendance = (data) => {
    if (!data) return null;
    const payload = data?.data || data;
    if (!payload) return null;
    return {
      ...payload,
      checkedIn: payload.checkedIn ?? Boolean(payload.checkIn && !payload.checkOut),
    };
  };

  const loadStoredAttendance = () => {
    try {
      const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (err) {
      console.warn('Failed to load stored attendance', err);
      return null;
    }
  };

  const persistAttendance = (payload) => {
    try {
      if (!payload) {
        localStorage.removeItem(ATTENDANCE_STORAGE_KEY);
        return;
      }
      localStorage.setItem(ATTENDANCE_STORAGE_KEY, JSON.stringify(payload));
    } catch (err) {
      console.warn('Failed to persist attendance', err);
    }
  };

  const isAttendanceRouteUnavailable = (err) => {
    const message = (err?.message || '').toLowerCase();
    return (
      message.includes('route not found') ||
      message.includes('no available check-in endpoint') ||
      message.includes('attendance endpoint') ||
      err?.status === 404
    );
  };

  const applyOfflineAttendance = (action) => {
    const now = new Date().toISOString();
    setAttendanceStatus((prev) => {
      const next =
        action === 'check-in'
          ? {
              ...(prev || {}),
              checkedIn: true,
              checkIn: now,
              checkOut: null,
            }
          : {
              ...(prev || {}),
              checkedIn: false,
              checkOut: now,
              checkIn: prev?.checkIn || now,
            };
      persistAttendance(next);
      return next;
    });
    setAttendanceAction({
      loading: false,
      error: '',
      message: action === 'check-in' ? 'Checked in (offline mode)' : 'Checked out (offline mode)',
    });
  };

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!attendanceStatus) {
      const stored = loadStoredAttendance();
      if (stored) {
        setAttendanceStatus(stored);
      }
    }
  }, []);

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
        const [dashboardRes, attendanceRes] = await Promise.all([
          managerApi.getDashboard(token),
          managerApi.getAttendance(token).catch(() => null)
        ]);
        
        if (!cancelled) {
          setSnapshot(dashboardRes?.data?.data || dashboardRes?.data || null);
          const normalizedAttendance = normalizeAttendance(attendanceRes?.data || attendanceRes);
          if (normalizedAttendance) {
            setAttendanceStatus(normalizedAttendance);
            persistAttendance(normalizedAttendance);
          } else {
            const stored = loadStoredAttendance();
            if (stored) {
              setAttendanceStatus(stored);
            }
          }
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

  const fetchLeaveRequests = async () => {
    if (!token) return;
    setLeaveLoading(true);
    setLeaveError('');
    try {
      const pendingResponse = await managerApi.getLeaveRequests(token, {
        status: 'pending',
        managerStatus: 'pending',
        limit: 3,
        page: 1,
      });
      const pendingList = pendingResponse?.data?.leaves || [];
      if (pendingList.length > 0) {
        setLeaveRequests(pendingList);
        setLeaveListMode('pending');
        return;
      }
      const recentResponse = await managerApi.getLeaveRequests(token, { limit: 3, page: 1 });
      setLeaveRequests(recentResponse?.data?.leaves || []);
      setLeaveListMode('recent');
    } catch (err) {
      setLeaveError(err.message || 'Failed to load leave requests');
    } finally {
      setLeaveLoading(false);
    }
  };

  const fetchWorkUpdates = async () => {
    if (!token) return;
    setWorkUpdatesLoading(true);
    setWorkUpdatesError('');
    try {
      const response = await managerApi.getWorkReports(token, { page: 1, limit: 3, uniqueTask: true });
      const payload = response?.data || {};
      setWorkUpdates(payload.reports || []);
      setWorkUpdatesTotal(payload.total || 0);
    } catch (err) {
      setWorkUpdatesError(err.message || 'Failed to load work updates');
    } finally {
      setWorkUpdatesLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    fetchLeaveRequests();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    fetchWorkUpdates();
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

    socket.on('manager:work-update', () => {
      fetchWorkUpdates();
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
  const leaveStatusStyles = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
    cancelled: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  };
  const workUpdateStatusStyles = {
    pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
    review: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-200',
    completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-200',
    submitted: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
    reviewed: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
    approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
    rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  };

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

  const handleApproveLeave = async (leaveId) => {
    try {
      await managerApi.approveLeave(token, leaveId);
      await fetchLeaveRequests();
    } catch (err) {
      setLeaveError(err.message || 'Failed to approve leave request');
    }
  };

  const handleRejectLeave = async (leaveId) => {
    const rejectionReason = window.prompt('Rejection reason (optional)') || undefined;
    try {
      await managerApi.rejectLeave(token, leaveId, rejectionReason);
      await fetchLeaveRequests();
    } catch (err) {
      setLeaveError(err.message || 'Failed to reject leave request');
    }
  };

  const formatTime = (value) =>
    value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const handleCheckIn = async () => {
    if (!token || !canCheckIn) return;
    setAttendanceAction({ loading: true, error: '', message: '' });
    try {
      const res = await managerApi.checkIn(token);
      const normalized = normalizeAttendance(res);
      setAttendanceStatus(normalized);
      persistAttendance(normalized);
      setAttendanceAction({
        loading: false,
        error: '',
        message: normalized?.checkIn ? `Checked in at ${formatTime(normalized.checkIn)}` : 'Checked in successfully',
      });
    } catch (err) {
      if (isAttendanceRouteUnavailable(err)) {
        applyOfflineAttendance('check-in');
      } else {
        setAttendanceAction({
          loading: false,
          error: err.message || 'Failed to check in',
          message: '',
        });
      }
    }
  };

  const handleCheckOut = async () => {
    if (!token || !canCheckOut) return;
    setAttendanceAction({ loading: true, error: '', message: '' });
    try {
      const res = await managerApi.checkOut(token);
      const normalized = normalizeAttendance(res);
      setAttendanceStatus(normalized);
      persistAttendance(normalized);
      setAttendanceAction({
        loading: false,
        error: '',
        message: normalized?.checkOut ? `Checked out at ${formatTime(normalized.checkOut)}` : 'Checked out successfully',
      });
    } catch (err) {
      if (isAttendanceRouteUnavailable(err)) {
        applyOfflineAttendance('check-out');
      } else {
        setAttendanceAction({
          loading: false,
          error: err.message || 'Failed to check out',
          message: '',
        });
      }
    }
  };

  const handleAttendanceAction = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canCheckIn) {
      handleCheckIn();
    } else if (canCheckOut) {
      handleCheckOut();
    }
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

  const attendance = attendanceStatus;
  const canCheckIn = !attendance?.checkedIn;
  const canCheckOut = Boolean(attendance?.checkedIn && !attendance?.checkOut);
  const attendanceCtaLabel = canCheckIn ? 'Check In' : canCheckOut ? 'Check Out' : 'Day Complete';

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
            <div className="flex items-center justify-between gap-4">
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                Your live snapshot updates every few seconds.
              </p>
              {attendance?.checkedIn && (
                <p className="text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  ✓ Checked in at {formatTime(attendance.checkIn)}
                  {attendance?.checkOut && ` • Out at ${formatTime(attendance.checkOut)}`}
                </p>
              )}
            </div>
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
            <button
              type="button"
              onClick={handleAttendanceAction}
              disabled={attendanceAction.loading || (!canCheckIn && !canCheckOut)}
              className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold shadow-sm transition ${
                canCheckIn
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                  : canCheckOut
                  ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200'
                  : 'cursor-not-allowed border-gray-200 bg-gray-50 text-gray-400 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-500'
              }`}
            >
              <span className="material-symbols-outlined text-lg">
                {canCheckIn ? 'login' : canCheckOut ? 'logout' : 'task_alt'}
              </span>
              <span className="hidden sm:inline">{attendanceAction.loading ? 'Processing...' : attendanceCtaLabel}</span>
            </button>
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

        {(attendanceAction.error || attendanceAction.message) && (
          <div className={`mb-4 rounded-xl border p-4 text-sm font-semibold ${
            attendanceAction.error 
              ? 'border-red-200 bg-red-50 text-red-600 dark:border-red-900/40 dark:bg-red-950/40 dark:text-red-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100'
          }`}>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-base">
                {attendanceAction.error ? 'error' : 'check_circle'}
              </span>
              {attendanceAction.error || attendanceAction.message}
            </div>
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
          <StatCard
            label="Work Updates"
            value={numberFormatter.format(workUpdatesTotal || 0)}
            trend="Latest task activity"
            icon="task_alt"
          />
          <StatCard
            label="Your Attendance"
            value={attendance?.checkedIn ? 'Checked In' : 'Pending'}
            trend={attendance?.checkIn 
              ? `At ${formatTime(attendance.checkIn)}${attendance?.checkOut ? ` - ${formatTime(attendance.checkOut)}` : ''}`
              : 'Click to check in'
            }
            trendColor={attendance?.checkedIn ? 'text-emerald-500' : 'text-amber-500'}
            icon={attendance?.checkedIn ? 'how_to_reg' : 'schedule'}
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
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                    {leaveListMode === 'pending' ? 'Pending Leave Approvals' : 'Recent Leave Requests'}
                  </h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {leaveListMode === 'pending' ? 'Awaiting your approval' : 'Latest submissions'}
                  </p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{leaveRequests.length} items</span>
              </div>
              {leaveError && (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                  {leaveError}
                </div>
              )}
              {leaveLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading leave requests...</p>
              ) : leaveRequests.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No leave requests found.</p>
              ) : (
                <div className="space-y-3">
                  {leaveRequests.map((leave) => (
                    <div key={leave._id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-gray-800 dark:text-white">
                            {leave.employee?.firstName} {leave.employee?.lastName}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{leave.employee?.email || 'Employee'}</p>
                          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                            {leave.leaveType} • {leave.startDate ? new Date(leave.startDate).toLocaleDateString() : ''}
                            {leave.endDate ? ` - ${new Date(leave.endDate).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${leaveStatusStyles[leave.status] || leaveStatusStyles.pending}`}>
                          {leave.status}
                        </span>
                      </div>
                      {leave.status === 'pending' && leaveListMode === 'pending' && (
                        <div className="mt-3 flex items-center gap-2">
                          <button
                            onClick={() => handleApproveLeave(leave._id)}
                            className="rounded-md border border-emerald-500 px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectLeave(leave._id)}
                            className="rounded-md border border-rose-500 px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Work Updates</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Latest task status changes</p>
                </div>
                <span className="text-xs text-gray-500 dark:text-gray-400">{workUpdates.length} items</span>
              </div>
              {workUpdatesError && (
                <div className="mb-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                  {workUpdatesError}
                </div>
              )}
              {workUpdatesLoading ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading work updates...</p>
              ) : workUpdates.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No updates available.</p>
              ) : (
                <div className="space-y-3">
                  {workUpdates.map((report) => {
                    const employeeName = `${report.employee?.firstName || ''} ${report.employee?.lastName || ''}`.trim() || report.employee?.email || 'Employee';
                    const reportStatus = report.taskStatus || report.status;
                    return (
                      <div key={report._id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{employeeName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{report.title || 'Task update'}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {report.project?.name || report.project?.projectCode || 'General'} •{' '}
                              {report.reportDate ? dateFormatter.format(new Date(report.reportDate)) : 'Today'}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${workUpdateStatusStyles[reportStatus] || workUpdateStatusStyles.submitted}`}>
                            {reportStatus || 'submitted'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
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
