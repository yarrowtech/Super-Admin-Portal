import { useCallback, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from '../../../context/AuthContext';
import { hrApi } from '../../../services/hr';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const ATTENDANCE_STORAGE_KEY = 'hr-dashboard-attendance';

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

export const useHrDashboard = () => {
  const { token, user } = useAuth();
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [leaveListMode, setLeaveListMode] = useState('pending');
  const [workUpdates, setWorkUpdates] = useState([]);
  const [workUpdatesLoading, setWorkUpdatesLoading] = useState(false);
  const [workUpdatesError, setWorkUpdatesError] = useState('');
  const [workUpdatesTotal, setWorkUpdatesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [analyticsOverview, setAnalyticsOverview] = useState(null);
  const [predictiveApiAlerts, setPredictiveApiAlerts] = useState([]);
  const [automationOverview, setAutomationOverview] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [attendanceStatus, setAttendanceStatus] = useState(() => loadStoredAttendance());
  const [attendanceAction, setAttendanceAction] = useState({ loading: false, error: '', message: '' });
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const fetchPendingLeaves = useCallback(async () => {
    if (!token) return;

    try {
      const pendingResponse = await hrApi.getLeaveRequests(token, { status: 'pending', limit: 3, page: 1 });
      const pendingList = pendingResponse?.data?.leaves || [];

      if (pendingList.length > 0) {
        setPendingLeaves(pendingList);
        setLeaveListMode('pending');
        return;
      }

      const recentResponse = await hrApi.getLeaveRequests(token, { limit: 3, page: 1 });
      setPendingLeaves(recentResponse?.data?.leaves || []);
      setLeaveListMode('recent');
    } catch (err) {
      if (!isProjectContextError(err)) {
        console.warn('Failed to load HR leave requests', err);
      }
      setPendingLeaves([]);
      setLeaveListMode('recent');
    }
  }, [token]);

  const fetchWorkUpdates = useCallback(async () => {
    if (!token) return;

    setWorkUpdatesLoading(true);
    setWorkUpdatesError('');
    try {
      const response = await hrApi.getWorkReports(token, { page: 1, limit: 3, uniqueTask: true });
      const payload = response?.data || {};
      setWorkUpdates(payload.reports || []);
      setWorkUpdatesTotal(payload.total || 0);
    } catch (err) {
      if (!isProjectContextError(err)) {
        setWorkUpdatesError(err.message || 'Failed to load work updates');
      } else {
        setWorkUpdates([]);
        setWorkUpdatesTotal(0);
      }
    } finally {
      setWorkUpdatesLoading(false);
    }
  }, [token]);

  const refreshDashboard = useCallback(async () => {
    if (!token) return;

    try {
      setLoading(true);
      setError('');

      const [dashboardRes, attendanceRes, analyticsRes, predictiveRes, automationRes] = await Promise.allSettled([
        hrApi.getDashboard(token),
        hrApi.getAttendanceStatus(token).catch(() => null),
        hrApi.getAnalyticsOverview(token).catch(() => null),
        hrApi.getPredictiveAlerts(token).catch(() => null),
        hrApi.getAutomationOverview(token).catch(() => null),
      ]);

      if (dashboardRes.status === 'fulfilled') {
        setDashboardData(dashboardRes.value?.data || null);
      } else if (!isProjectContextError(dashboardRes.reason)) {
        throw dashboardRes.reason;
      }

      if (attendanceRes.status === 'fulfilled') {
        const normalizedAttendance = normalizeAttendance(attendanceRes.value?.data || attendanceRes.value);
        if (normalizedAttendance) {
          setAttendanceStatus(normalizedAttendance);
          persistAttendance(normalizedAttendance);
        } else {
          const storedAttendance = loadStoredAttendance();
          if (storedAttendance) {
            setAttendanceStatus(storedAttendance);
          }
        }
      } else {
        const storedAttendance = loadStoredAttendance();
        if (storedAttendance) {
          setAttendanceStatus(storedAttendance);
        }
      }

      if (analyticsRes.status === 'fulfilled') {
        setAnalyticsOverview(analyticsRes.value?.data || null);
      }

      if (predictiveRes.status === 'fulfilled') {
        setPredictiveApiAlerts(predictiveRes.value?.data?.alerts || []);
      }

      if (automationRes.status === 'fulfilled') {
        setAutomationOverview(automationRes.value?.data || null);
      }

      await Promise.allSettled([fetchPendingLeaves(), fetchWorkUpdates()]);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [fetchPendingLeaves, fetchWorkUpdates, token]);

  useEffect(() => {
    if (token) {
      refreshDashboard();
    }
  }, [refreshDashboard, token]);

  useEffect(() => {
    if (!token) return undefined;

    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    socket.emit('hr:subscribe');
    socket.on('hr:work-update', fetchWorkUpdates);

    return () => {
      socket.off('hr:work-update', fetchWorkUpdates);
      socket.emit('hr:unsubscribe');
      socket.disconnect();
    };
  }, [fetchWorkUpdates, token]);

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
        setError('');
        await hrApi.approveLeave(leaveId, token);
        await fetchPendingLeaves();
      } catch (err) {
        setError(err.message || 'Failed to approve leave');
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchPendingLeaves, token]
  );

  const handleReject = useCallback(
    async (leaveId) => {
      try {
        setActionLoadingId(leaveId);
        setError('');
        await hrApi.rejectLeave(leaveId, {}, token);
        await fetchPendingLeaves();
      } catch (err) {
        setError(err.message || 'Failed to reject leave');
      } finally {
        setActionLoadingId(null);
      }
    },
    [fetchPendingLeaves, token]
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
