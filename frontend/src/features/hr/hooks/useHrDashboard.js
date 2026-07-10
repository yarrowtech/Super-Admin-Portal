import { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { hrApi } from '../../../services/hr';
import { QK } from '../../../utils/queryKeys';
import { createLogger } from '../../../utils/logger';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const ATTENDANCE_STORAGE_KEY = 'hr-dashboard-attendance';
const hrDashboardLogger = createLogger({ module: 'hr-dashboard' });

const loadStoredAttendance = () => {
  try {
    const raw = localStorage.getItem(ATTENDANCE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    hrDashboardLogger.warn({ err }, 'Failed to load stored attendance');
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
    hrDashboardLogger.warn({ err }, 'Failed to persist attendance');
  }
};

const normalizeAttendance = (data) => {
  if (!data) return null;
  const payload = data?.data || data;
  if (!payload) return null;
  return {
    ...payload,
    checkedIn: payload.checkedIn ?? Boolean(payload.checkIn && !payload.checkOut),
  };
};

const isAttendanceRouteUnavailable = (err) => {
  const message = (err?.message || '').toLowerCase();
  return message.includes('route not found') || message.includes('route not available') || err?.status === 404;
};

const isProjectContextError = (err) => {
  const message = (err?.message || '').toLowerCase();
  return message.includes('projectid required') || message.includes('project id required');
};

const WORK_UPDATES_PARAMS = { page: 1, limit: 3, uniqueTask: true };

export const useHrDashboard = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [actionError, setActionError] = useState('');
  const [attendanceStatus, setAttendanceStatus] = useState(() => loadStoredAttendance());
  const [attendanceAction, setAttendanceAction] = useState({ loading: false, error: '', message: '' });
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const enabled = Boolean(token);

  const [dashboardQuery, attendanceQuery, analyticsQuery, predictiveQuery, automationQuery, pendingLeavesQuery, workUpdatesQuery] =
    useQueries({
      queries: [
        { queryKey: QK.hr.dashboard(), queryFn: () => hrApi.getDashboard(token), enabled },
        {
          queryKey: QK.hr.attendance({ status: true }),
          queryFn: () => hrApi.getAttendanceStatus(token),
          enabled,
          retry: false,
        },
        { queryKey: QK.hr.analytics(), queryFn: () => hrApi.getAnalyticsOverview(token), enabled, retry: false },
        { queryKey: QK.hr.predictive(), queryFn: () => hrApi.getPredictiveAlerts(token), enabled, retry: false },
        { queryKey: QK.hr.automation(), queryFn: () => hrApi.getAutomationOverview(token), enabled, retry: false },
        {
          queryKey: QK.hr.leave({ pendingDashboard: true }),
          queryFn: async () => {
            const pendingResponse = await hrApi.getLeaveRequests(token, { status: 'pending', limit: 3, page: 1 });
            const pendingList = pendingResponse?.data?.leaves || [];
            if (pendingList.length > 0) return { mode: 'pending', leaves: pendingList };
            const recentResponse = await hrApi.getLeaveRequests(token, { limit: 3, page: 1 });
            return { mode: 'recent', leaves: recentResponse?.data?.leaves || [] };
          },
          enabled,
        },
        {
          queryKey: QK.hr.workReports(WORK_UPDATES_PARAMS),
          queryFn: () => hrApi.getWorkReports(token, WORK_UPDATES_PARAMS),
          enabled,
        },
      ],
    });

  // Dashboard data can legitimately fail with a project-context error (no
  // project selected yet) — that's tolerated everywhere else in this hook via
  // isProjectContextError, so surface it the same way here instead of as a
  // hard page-level error.
  const dashboardData = dashboardQuery.data?.data || null;
  const error =
    actionError ||
    (dashboardQuery.isError && !isProjectContextError(dashboardQuery.error)
      ? dashboardQuery.error?.message || 'Failed to load dashboard data'
      : '');
  const loading = dashboardQuery.isLoading;

  const analyticsOverview = analyticsQuery.data?.data || null;
  const predictiveApiAlerts = useMemo(() => predictiveQuery.data?.data?.alerts || [], [predictiveQuery.data]);
  const automationOverview = automationQuery.data?.data || null;
  const pendingLeaves = pendingLeavesQuery.data?.leaves || [];
  const leaveListMode = pendingLeavesQuery.data?.mode || 'pending';
  const workUpdates = workUpdatesQuery.data?.data?.reports || [];
  const workUpdatesTotal = workUpdatesQuery.data?.data?.total || 0;
  const workUpdatesLoading = workUpdatesQuery.isLoading;
  const workUpdatesError =
    workUpdatesQuery.isError && !isProjectContextError(workUpdatesQuery.error)
      ? workUpdatesQuery.error?.message || 'Failed to load work updates'
      : '';

  // Attendance is a hybrid: the query above is the cached/cacheable read, but
  // check-in/check-out and the offline fallback (below) mutate local state
  // directly, so keep syncing the query result into that same local state
  // rather than reading the query directly everywhere.
  useEffect(() => {
    if (attendanceQuery.data !== undefined) {
      const normalized = normalizeAttendance(attendanceQuery.data?.data || attendanceQuery.data);
      if (normalized) {
        setAttendanceStatus(normalized);
        persistAttendance(normalized);
        return;
      }
    }
    if (attendanceQuery.isError) {
      const stored = loadStoredAttendance();
      if (stored) setAttendanceStatus(stored);
    }
  }, [attendanceQuery.data, attendanceQuery.isError]);

  const refreshDashboard = useCallback(() => {
    setActionError('');
    queryClient.invalidateQueries({ queryKey: ['hr', 'dashboard'] });
    queryClient.invalidateQueries({ queryKey: ['hr', 'attendance'] });
    queryClient.invalidateQueries({ queryKey: ['hr', 'analytics'] });
    queryClient.invalidateQueries({ queryKey: ['hr', 'predictive'] });
    queryClient.invalidateQueries({ queryKey: ['hr', 'automation'] });
    queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
    queryClient.invalidateQueries({ queryKey: ['hr', 'workReports'] });
  }, [queryClient]);

  const invalidatePendingLeaves = () => queryClient.invalidateQueries({ queryKey: ['hr', 'leave'] });
  const invalidateWorkUpdates = () => queryClient.invalidateQueries({ queryKey: ['hr', 'workReports'] });

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.emit('hr:subscribe');
    socket.on('hr:work-update', invalidateWorkUpdates);

    return () => {
      socket.off('hr:work-update', invalidateWorkUpdates);
      socket.emit('hr:unsubscribe');
      socket.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = useCallback(
    (value) => (value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''),
    []
  );

  const applyOfflineAttendance = useCallback(
    (action) => {
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
    },
    []
  );

  const attendance = attendanceStatus;
  const canCheckIn = !attendance?.checkedIn;
  const canCheckOut = Boolean(attendance?.checkedIn && !attendance?.checkOut);
  const attendanceCtaLabel = canCheckIn ? 'Check In' : canCheckOut ? 'Check Out' : 'Day Complete';

  const handleApprove = useCallback(
    async (leaveId) => {
      try {
        setActionLoadingId(leaveId);
        setActionError('');
        await hrApi.approveLeave(leaveId, token);
        invalidatePendingLeaves();
      } catch (err) {
        setActionError(err.message || 'Failed to approve leave');
      } finally {
        setActionLoadingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  const handleReject = useCallback(
    async (leaveId) => {
      try {
        setActionLoadingId(leaveId);
        setActionError('');
        await hrApi.rejectLeave(leaveId, {}, token);
        invalidatePendingLeaves();
      } catch (err) {
        setActionError(err.message || 'Failed to reject leave');
      } finally {
        setActionLoadingId(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [token]
  );

  const handleCheckIn = useCallback(async () => {
    if (!token || !canCheckIn) return;

    setAttendanceAction({ loading: true, error: '', message: '' });
    try {
      const res = await hrApi.checkIn(token);
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
  }, [applyOfflineAttendance, canCheckIn, formatTime, token]);

  const handleCheckOut = useCallback(async () => {
    if (!token || !canCheckOut) return;

    setAttendanceAction({ loading: true, error: '', message: '' });
    try {
      const res = await hrApi.checkOut(token);
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
  }, [applyOfflineAttendance, canCheckOut, formatTime, token]);

  const handleAttendanceAction = useCallback(() => {
    if (canCheckIn) {
      handleCheckIn();
    } else if (canCheckOut) {
      handleCheckOut();
    }
  }, [canCheckIn, canCheckOut, handleCheckIn, handleCheckOut]);

  const summary = useMemo(
    () => ({
      totalEmployees: dashboardData?.totalEmployees || 0,
      activeEmployees: dashboardData?.activeEmployees || 0,
      pendingApplicants: dashboardData?.pendingApplicants || 0,
      openComplaints: dashboardData?.openComplaints || 0,
      pendingLeavesCount: dashboardData?.pendingLeaves || 0,
      openPositions: dashboardData?.openPositions || 0,
      todayAttendance: dashboardData?.todayAttendance || 0,
      monthAttendanceRecords: dashboardData?.modules?.attendanceManagement?.monthSummary?.totalRecords || 0,
      taskQueueTotal: dashboardData?.modules?.taskAndWorkUpdates?.total || 0,
      taskQueuePending: dashboardData?.modules?.taskAndWorkUpdates?.pending || 0,
      appraisalCyclesActive: dashboardData?.modules?.performanceAndAppraisal?.appraisalCyclesActive || 0,
    }),
    [dashboardData]
  );

  const advancedMetrics = useMemo(() => {
    const total = analyticsOverview?.totalEmployees ?? summary.totalEmployees ?? 0;
    const active = analyticsOverview?.activeEmployees ?? summary.activeEmployees ?? 0;
    const inactive = Math.max(total - active, 0);
    const activeRatio = total > 0 ? Math.round((active / total) * 100) : 0;
    const inactiveRatio = total > 0 ? Math.round((inactive / total) * 100) : 0;
    const leaveTrend = summary.pendingLeavesCount > 5 ? 'up' : summary.pendingLeavesCount > 0 ? 'steady' : 'down';
    const attritionRate = analyticsOverview?.attritionRate ?? (total > 0 ? Number(((inactive / total) * 100).toFixed(1)) : 0);
    const openPositions = analyticsOverview?.openPositions ?? summary.openPositions ?? 0;
    const pendingApplicants = summary.pendingApplicants || 0;
    const hiringPipelineHealth =
      openPositions === 0 ? 'healthy' : pendingApplicants >= openPositions ? 'on-track' : 'risk';

    return {
      activeRatio,
      inactiveRatio,
      attritionRate,
      leaveTrend,
      hiringPipelineHealth,
      overworkedEmployees: analyticsOverview?.overworkedEmployees ?? (dashboardData?.modules?.attendanceManagement?.overtimeCount || 0),
      lowPerformanceCount: dashboardData?.modules?.performanceAndAppraisal?.lowPerformers || 0,
    };
  }, [analyticsOverview, dashboardData, summary]);

  const aiInsights = useMemo(() => {
    const insights = [];
    if (advancedMetrics.leaveTrend === 'up') {
      insights.push({
        id: 'leave-spike',
        severity: 'warning',
        text: 'High leave rate detected. Consider workload balancing for teams with repeated leave spikes.',
      });
    }
    if (advancedMetrics.lowPerformanceCount > 0) {
      insights.push({
        id: 'performance-dip',
        severity: 'critical',
        text: `Low performance detected for ${advancedMetrics.lowPerformanceCount} employee(s). Schedule focused coaching.`,
      });
    }
    if (advancedMetrics.hiringPipelineHealth === 'risk') {
      insights.push({
        id: 'hiring-risk',
        severity: 'info',
        text: 'Hiring pipeline is behind demand. Increase sourcing for critical roles.',
      });
    }
    if (!insights.length) {
      insights.push({
        id: 'stable',
        severity: 'success',
        text: 'Workforce health is stable this cycle. Continue current operating plan.',
      });
    }
    return insights;
  }, [advancedMetrics]);

  const predictiveAlerts = useMemo(() => {
    const alerts = [];
    if (advancedMetrics.attritionRate >= 20) {
      alerts.push({
        id: 'attrition-risk',
        title: 'Attrition Risk',
        detail: `Attrition risk is elevated at ${advancedMetrics.attritionRate}%.`,
        level: 'high',
      });
    }
    if (advancedMetrics.overworkedEmployees > 0) {
      alerts.push({
        id: 'overworked',
        title: 'Overworked Employees',
        detail: `${advancedMetrics.overworkedEmployees} employee(s) show overtime pattern anomalies.`,
        level: 'medium',
      });
    }
    if (predictiveApiAlerts.length) {
      return predictiveApiAlerts.map((alert) => ({
        id: alert.id || alert.title,
        title: alert.title || 'Predictive alert',
        detail: alert.detail || alert.message || 'Alert generated by analytics engine.',
        level: alert.level || 'medium',
      }));
    }
    return alerts;
  }, [advancedMetrics, predictiveApiAlerts]);

  const workUpdatesLabel = useMemo(() => {
    if (workUpdatesTotal) return `${workUpdatesTotal} updates`;
    return 'No updates yet';
  }, [workUpdatesTotal]);

  return {
    user,
    token,
    loading,
    error,
    dashboardData,
    pendingLeaves,
    leaveListMode,
    workUpdates,
    workUpdatesLoading,
    workUpdatesError,
    workUpdatesTotal,
    workUpdatesLabel,
    actionLoadingId,
    attendance,
    attendanceAction,
    attendanceCtaLabel,
    canCheckIn,
    canCheckOut,
    currentTime,
    summary,
    advancedMetrics,
    aiInsights,
    predictiveAlerts,
    automationOverview,
    modules: dashboardData?.modules || {},
    formatTime,
    handleApprove,
    handleReject,
    handleAttendanceAction,
    refreshDashboard,
  };
};
