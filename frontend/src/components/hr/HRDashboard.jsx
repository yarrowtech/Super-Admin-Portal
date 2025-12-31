import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../api/client';
import { hrApi } from '../../api/hr';
import Button from '../common/Button';
import PortalHeader from '../common/PortalHeader';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const dateFormatter = new Intl.DateTimeFormat(undefined, {
  weekday: 'short',
  month: 'short',
  day: 'numeric',
});

const HRDashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [leaveListMode, setLeaveListMode] = useState('pending');
  const [workUpdates, setWorkUpdates] = useState([]);
  const [workUpdatesLoading, setWorkUpdatesLoading] = useState(false);
  const [workUpdatesError, setWorkUpdatesError] = useState('');
  const [workUpdatesTotal, setWorkUpdatesTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());

  const fetchPendingLeaves = async () => {
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
  };

  const fetchWorkUpdates = async () => {
    if (!token) return;
    setWorkUpdatesLoading(true);
    setWorkUpdatesError('');
    try {
      const response = await hrApi.getWorkReports(token, { page: 1, limit: 3, uniqueTask: true });
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
    const fetchDashboard = async () => {
      try {
        setLoading(true);
        const response = await hrApi.getDashboard(token);
        setDashboardData(response.data);
        await fetchPendingLeaves();
        await fetchWorkUpdates();
      } catch (err) {
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchDashboard();
    }
  }, [token]);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
    socket.emit('hr:subscribe');

    socket.on('hr:work-update', () => {
      fetchWorkUpdates();
    });

    return () => {
      socket.emit('hr:unsubscribe');
      socket.disconnect();
    };
  }, [token]);

  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date());
    updateTime(); // Set initial time immediately
    const interval = setInterval(updateTime, 1000);
    
    return () => {
      clearInterval(interval);
    };
  }, []);

  const handleApprove = async (leaveId) => {
    try {
      setActionLoadingId(leaveId);
      await apiClient.put(`/api/dept/hr/leave/${leaveId}/approve`, {}, token);
      await fetchPendingLeaves();
    } catch (err) {
      setError(err.message || 'Failed to approve leave');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async (leaveId) => {
    try {
      setActionLoadingId(leaveId);
      await apiClient.put(`/api/dept/hr/leave/${leaveId}/reject`, {}, token);
      await fetchPendingLeaves();
    } catch (err) {
      setError(err.message || 'Failed to reject leave');
    } finally {
      setActionLoadingId(null);
    }
  };

  const totalEmployees = dashboardData?.totalEmployees || 0;
  const activeEmployees = dashboardData?.activeEmployees || 0;
  const pendingApplicants = dashboardData?.pendingApplicants || 0;
  const openComplaints = dashboardData?.openComplaints || 0;
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
const workUpdateStatusLabels = {
  pending: 'Pending',
  'in-progress': 'In Progress',
  review: 'In Review',
  completed: 'Done',
  cancelled: 'Cancelled',
  submitted: 'Submitted',
  reviewed: 'Reviewed',
  approved: 'Approved',
  rejected: 'Rejected',
};
const normalizeWorkUpdateStatus = (status) => {
  if (!status) return 'submitted';
  const normalized = status.toString().trim().toLowerCase();
  if (['in review', 'in-review', 'review', 'in_review'].includes(normalized)) return 'review';
  if (['done', 'completed', 'complete', 'finished'].includes(normalized)) return 'completed';
  if (['in progress', 'in-progress', 'progress'].includes(normalized)) return 'in-progress';
  return normalized;
};

  const workUpdatesLabel = useMemo(() => {
    if (workUpdatesTotal) return `${workUpdatesTotal} updates`;
    return 'No updates yet';
  }, [workUpdatesTotal]);

  if (loading) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="dot-spinner">
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
              <div className="dot-spinner__dot"></div>
            </div>
            <p className="text-neutral-600 dark:text-neutral-400">Loading dashboard...</p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="flex-1 overflow-y-auto bg-neutral-50 dark:bg-neutral-900">
        <div className="flex h-full items-center justify-center">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 dark:border-red-800 dark:bg-red-900/20">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-red-600">error</span>
              <div>
                <p className="font-semibold text-red-900 dark:text-red-200">Error Loading Dashboard</p>
                <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
              </div>
            </div>
            <Button variant="danger" size="sm" className="mt-4" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </div>
        </div>
      </main>
    );
  }

  const getGreeting = () => {
    const hour = currentTime ? currentTime.getHours() : new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    return 'Good Evening';
  };

  const getTimeDisplay = () => {
    const now = currentTime || new Date();
    const day = now.toLocaleDateString(undefined, { weekday: 'long' });
    const date = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    
    return { day, date, time };
  };

  const { day: dayName, date: dateLabel, time: timeLabel } = getTimeDisplay();
  const greetingLabel = getGreeting();
  const userName = user?.firstName || user?.name || 'HR Manager';

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50/30 via-white to-blue-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">


        {/* Welcome Banner */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-purple-200/50 bg-gradient-to-r from-purple-600 via-purple-500 to-blue-600 p-8 shadow-lg dark:border-purple-900/30">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <p className="text-sm font-semibold uppercase tracking-[0.35em] text-purple-100">
                {greetingLabel} • {dayName} • {dateLabel} • {timeLabel}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white">
                {greetingLabel}, {userName}! 👋
              </h1>
              <p className="mt-2 text-lg text-purple-100">
                Here's what's happening with your workforce today
              </p>
            </div>
            <div className="hidden lg:block">
              <div className="flex h-24 w-24 items-center justify-center rounded-2xl bg-white/20 backdrop-blur-sm">
                <span className="material-symbols-outlined text-6xl text-white">celebration</span>
              </div>
            </div>
          </div>
        </div>

        {/* KPI Cards with Enhanced Design */}
        <section className="mb-8 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="group relative overflow-hidden rounded-2xl border border-blue-200/50 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-blue-100/50 dark:border-blue-900/30 dark:from-blue-950/40 dark:to-blue-900/20 dark:hover:shadow-blue-900/20">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-400/10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20">
                  <span className="material-symbols-outlined text-2xl text-blue-600 dark:text-blue-400">groups</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-blue-600/70 dark:text-blue-400/70">Workforce</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-blue-900 dark:text-blue-100">{totalEmployees}</h3>
                <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Total Employees</p>
                <p className="text-xs text-blue-600/70 dark:text-blue-400/70">{activeEmployees} active today</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-orange-200/50 bg-gradient-to-br from-orange-50 to-orange-100/50 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-orange-100/50 dark:border-orange-900/30 dark:from-orange-950/40 dark:to-orange-900/20 dark:hover:shadow-orange-900/20">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-orange-400/10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-500/20">
                  <span className="material-symbols-outlined text-2xl text-orange-600 dark:text-orange-400">event_busy</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-orange-600/70 dark:text-orange-400/70">Pending</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-orange-900 dark:text-orange-100">{dashboardData?.pendingLeaves || 0}</h3>
                <p className="text-sm font-semibold text-orange-700 dark:text-orange-300">Leave Requests</p>
                <p className="text-xs text-orange-600/70 dark:text-orange-400/70">Awaiting approval</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-emerald-200/50 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-emerald-100/50 dark:border-emerald-900/30 dark:from-emerald-950/40 dark:to-emerald-900/20 dark:hover:shadow-emerald-900/20">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-400/10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20">
                  <span className="material-symbols-outlined text-2xl text-emerald-600 dark:text-emerald-400">task_alt</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-600/70 dark:text-emerald-400/70">Work</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">{workUpdatesTotal}</h3>
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Work Updates</p>
                <p className="text-xs text-emerald-600/70 dark:text-emerald-400/70">{workUpdatesLabel}</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-purple-200/50 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-purple-100/50 dark:border-purple-900/30 dark:from-purple-950/40 dark:to-purple-900/20 dark:hover:shadow-purple-900/20">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-400/10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-purple-500/10 dark:bg-purple-500/20">
                  <span className="material-symbols-outlined text-2xl text-purple-600 dark:text-purple-400">person_search</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-purple-600/70 dark:text-purple-400/70">Pipeline</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-purple-900 dark:text-purple-100">{pendingApplicants}</h3>
                <p className="text-sm font-semibold text-purple-700 dark:text-purple-300">Active Applicants</p>
                <p className="text-xs text-purple-600/70 dark:text-purple-400/70">In recruitment</p>
              </div>
            </div>
          </div>

          <div className="group relative overflow-hidden rounded-2xl border border-red-200/50 bg-gradient-to-br from-red-50 to-red-100/50 p-6 shadow-sm transition-all duration-300 hover:shadow-xl hover:shadow-red-100/50 dark:border-red-900/30 dark:from-red-950/40 dark:to-red-900/20 dark:hover:shadow-red-900/20">
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-red-400/10 blur-2xl"></div>
            <div className="relative">
              <div className="mb-3 flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-red-500/10 dark:bg-red-500/20">
                  <span className="material-symbols-outlined text-2xl text-red-600 dark:text-red-400">report_problem</span>
                </div>
                <span className="text-xs font-bold uppercase tracking-wider text-red-600/70 dark:text-red-400/70">Issues</span>
              </div>
              <div className="space-y-1">
                <h3 className="text-3xl font-bold text-red-900 dark:text-red-100">{openComplaints}</h3>
                <p className="text-sm font-semibold text-red-700 dark:text-red-300">Open Complaints</p>
                <p className="text-xs text-red-600/70 dark:text-red-400/70">Needs attention</p>
              </div>
            </div>
          </div>
        </section>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="flex flex-col gap-6 lg:col-span-2">
            {/* Pending Leave Approvals */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-900/80">
              <div className="border-b border-neutral-200/50 bg-gradient-to-r from-orange-50/50 to-amber-50/50 p-5 dark:border-neutral-800/50 dark:from-orange-950/20 dark:to-amber-950/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500/10 dark:bg-orange-500/20">
                      <span className="material-symbols-outlined text-xl text-orange-600 dark:text-orange-400">pending_actions</span>
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
                        {leaveListMode === 'pending' ? 'Pending Leave Approvals' : 'Recent Leave Requests'}
                      </h2>
                      <p className="text-sm text-neutral-600 dark:text-neutral-400">
                        {pendingLeaves.length} request{pendingLeaves.length !== 1 ? 's' : ''}{' '}
                        {leaveListMode === 'pending' ? 'awaiting your review' : 'submitted recently'}
                      </p>
                    </div>
                  </div>
                  {pendingLeaves.length > 0 && (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                      {pendingLeaves.length}
                    </div>
                  )}
                </div>
              </div>
              <div className="p-5">
                {pendingLeaves.length ? (
                  <div className="space-y-3">
                    {pendingLeaves.map((leave) => (
                      <div key={leave._id} className="group overflow-hidden rounded-xl border border-neutral-200/70 bg-gradient-to-br from-white to-neutral-50/50 p-4 transition-all duration-200 hover:border-orange-300 hover:shadow-md dark:border-neutral-800/70 dark:from-neutral-900 dark:to-neutral-800/50 dark:hover:border-orange-700">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex flex-1 gap-4">
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-900/30">
                              <span className="material-symbols-outlined text-xl text-purple-600 dark:text-purple-400">event_note</span>
                            </div>
                            <div className="flex-1 space-y-2">
                              <div className="flex items-center gap-3">
                                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">
                                  {leave.employee?.firstName} {leave.employee?.lastName}
                                </h3>
                                <span className="rounded-full bg-purple-100 px-3 py-0.5 text-xs font-bold capitalize text-purple-700 dark:bg-purple-900/40 dark:text-purple-300">
                                  {leave.leaveType}
                                </span>
                                <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${leaveStatusStyles[leave.status] || leaveStatusStyles.pending}`}>
                                  {leave.status}
                                </span>
                              </div>
                              <p className="text-sm text-neutral-600 dark:text-neutral-400">{leave.employee?.email}</p>
                              <div className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                                <span className="material-symbols-outlined text-base">calendar_today</span>
                                <span className="font-semibold">{new Date(leave.startDate).toLocaleDateString()}</span>
                                {leave.endDate && (
                                  <>
                                    <span className="text-neutral-400">→</span>
                                    <span className="font-semibold">{new Date(leave.endDate).toLocaleDateString()}</span>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex shrink-0 gap-2">
                            <button
                              onClick={() => handleReject(leave._id)}
                              disabled={actionLoadingId === leave._id}
                              className="flex items-center gap-1.5 rounded-lg bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition-all hover:bg-red-100 disabled:opacity-50 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/40"
                            >
                              <span className="material-symbols-outlined text-base">close</span>
                              {actionLoadingId === leave._id ? 'Processing...' : 'Reject'}
                            </button>
                            <button
                              onClick={() => handleApprove(leave._id)}
                              disabled={actionLoadingId === leave._id}
                              className="flex items-center gap-1.5 rounded-lg bg-green-50 px-4 py-2 text-sm font-bold text-green-600 transition-all hover:bg-green-100 disabled:opacity-50 dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/40"
                            >
                              <span className="material-symbols-outlined text-base">check</span>
                              {actionLoadingId === leave._id ? 'Processing...' : 'Approve'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-green-100 dark:bg-green-900/30">
                      <span className="material-symbols-outlined text-4xl text-green-600 dark:text-green-400">check_circle</span>
                    </div>
                    <h3 className="mt-4 text-lg font-bold text-neutral-800 dark:text-neutral-100">All Caught Up!</h3>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">No pending leave requests at the moment</p>
                  </div>
                )}
              </div>
            </section>

            {/* Recent Activities */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-900/80">
              <div className="border-b border-neutral-200/50 bg-gradient-to-r from-blue-50/50 to-cyan-50/50 p-5 dark:border-neutral-800/50 dark:from-blue-950/20 dark:to-cyan-950/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 dark:bg-blue-500/20">
                    <span className="material-symbols-outlined text-xl text-blue-600 dark:text-blue-400">history</span>
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Recent Activities</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Latest HR actions and updates</p>
                  </div>
                </div>
              </div>
              <div className="p-5">
                {dashboardData?.recentActivities && dashboardData.recentActivities.length > 0 ? (
                  <div className="space-y-3">
                    {dashboardData.recentActivities.map((activity, index) => (
                      <div key={index} className="group flex items-start gap-4 rounded-xl border border-neutral-200/70 bg-gradient-to-br from-white to-neutral-50/50 p-4 transition-all duration-200 hover:border-blue-300 hover:shadow-md dark:border-neutral-800/70 dark:from-neutral-900 dark:to-neutral-800/50 dark:hover:border-blue-700">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/30">
                          <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">{activity.icon || 'info'}</span>
                        </div>
                        <div className="flex-1 space-y-1">
                          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{activity.title}</p>
                          <p className="text-sm text-neutral-600 dark:text-neutral-400">{activity.description}</p>
                        </div>
                        <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">
                          {activity.time || 'Just now'}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-neutral-800">
                      <span className="material-symbols-outlined text-3xl text-neutral-400 dark:text-neutral-600">history</span>
                    </div>
                    <p className="mt-3 text-sm font-medium text-neutral-600 dark:text-neutral-400">No recent activities</p>
                  </div>
                )}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6 lg:col-span-1">
            {/* Work Updates */}
            <section className="rounded-xl border border-gray-200 bg-white p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-900/40">
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
                    const rawStatus = report.taskStatus || report.status || 'submitted';
                    const reportStatus = normalizeWorkUpdateStatus(rawStatus);
                    const statusClass = workUpdateStatusStyles[reportStatus] || workUpdateStatusStyles.submitted;
                    const statusLabel = workUpdateStatusLabels[reportStatus] || workUpdateStatusLabels.submitted;
                    return (
                      <div key={report._id} className="rounded-lg border border-gray-100 p-3 dark:border-gray-800">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-800 dark:text-white">{employeeName}</p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{report.title || 'Task update'}</p>
                            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                              {report.project?.name || report.project?.projectCode || 'General'} -{' '}
                              {report.reportDate ? dateFormatter.format(new Date(report.reportDate)) : 'Today'}
                            </p>
                          </div>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusClass}`}>
                            {statusLabel}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Quick Stats */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-900/80">
              <div className="border-b border-neutral-200/50 bg-gradient-to-r from-purple-50/50 to-pink-50/50 p-4 dark:border-neutral-800/50 dark:from-purple-950/20 dark:to-pink-950/20">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Quick Stats</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Today's overview</p>
              </div>
              <div className="space-y-3 p-4">
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-4 shadow-lg shadow-blue-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:shadow-blue-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-blue-100">Today's Attendance</p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {dashboardData?.todayAttendance || 0}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-2xl text-white">how_to_reg</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-green-500 to-green-600 p-4 shadow-lg shadow-green-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:shadow-green-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-green-100">Active Employees</p>
                      <p className="mt-1 text-2xl font-bold text-white">{activeEmployees}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-2xl text-white">groups</span>
                    </div>
                  </div>
                </div>
                <div className="overflow-hidden rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 p-4 shadow-lg shadow-purple-500/30 transition-all duration-300 hover:scale-105 hover:shadow-xl dark:shadow-purple-900/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs font-medium text-purple-100">Open Positions</p>
                      <p className="mt-1 text-2xl font-bold text-white">
                        {dashboardData?.openPositions || 0}
                      </p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
                      <span className="material-symbols-outlined text-2xl text-white">work</span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Department Overview */}
            <section className="overflow-hidden rounded-2xl border border-neutral-200/50 bg-white/80 shadow-sm backdrop-blur-sm dark:border-neutral-800/50 dark:bg-neutral-900/80">
              <div className="border-b border-neutral-200/50 bg-gradient-to-r from-indigo-50/50 to-violet-50/50 p-4 dark:border-neutral-800/50 dark:from-indigo-950/20 dark:to-violet-950/20">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Departments</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Employee distribution</p>
              </div>
              <div className="space-y-2 p-4">
                {dashboardData?.departmentStats && dashboardData.departmentStats.length > 0 ? (
                  dashboardData.departmentStats.slice(0, 5).map((dept, index) => (
                    <div key={index} className="group flex items-center justify-between rounded-xl border border-neutral-200/70 bg-gradient-to-br from-white to-neutral-50/50 p-3 transition-all duration-200 hover:border-indigo-300 hover:shadow-md dark:border-neutral-800/70 dark:from-neutral-900 dark:to-neutral-800/50 dark:hover:border-indigo-700">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 dark:bg-indigo-900/30">
                          <span className="material-symbols-outlined text-base text-indigo-600 dark:text-indigo-400">corporate_fare</span>
                        </div>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{dept.name}</span>
                      </div>
                      <span className="rounded-full bg-indigo-100 px-3 py-1 text-xs font-bold text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">{dept.count}</span>
                    </div>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-8">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-100 dark:bg-neutral-800">
                      <span className="material-symbols-outlined text-2xl text-neutral-400 dark:text-neutral-600">corporate_fare</span>
                    </div>
                    <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">No department data</p>
                  </div>
                )}
              </div>
            </section>

            {/* Quick Actions */}
            <section className="overflow-hidden rounded-2xl border border-purple-200/50 bg-gradient-to-br from-purple-50 to-pink-50 shadow-sm dark:border-purple-900/30 dark:from-purple-950/40 dark:to-pink-950/20">
              <div className="border-b border-purple-200/50 bg-white/50 p-4 dark:border-purple-900/30 dark:bg-neutral-900/50">
                <h3 className="font-bold text-neutral-900 dark:text-neutral-100">Quick Actions</h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">Common HR tasks</p>
              </div>
              <div className="space-y-2 p-4">
                <button
                  onClick={() => navigate('/hr/employees?new=1')}
                  className="group flex w-full items-center gap-3 rounded-xl border border-purple-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-all duration-200 hover:scale-105 hover:border-purple-400 hover:bg-purple-50 hover:shadow-md dark:border-purple-900/50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-purple-700 dark:hover:bg-purple-900/20"
                >
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-100 group-hover:bg-purple-200 dark:bg-purple-900/40 dark:group-hover:bg-purple-800/60">
                    <span className="material-symbols-outlined text-lg text-purple-600 dark:text-purple-400">person_add</span>
                  </div>
                  Add Employee
                </button>
                <button className="group flex w-full items-center gap-3 rounded-xl border border-blue-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-all duration-200 hover:scale-105 hover:border-blue-400 hover:bg-blue-50 hover:shadow-md dark:border-blue-900/50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-blue-700 dark:hover:bg-blue-900/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-100 group-hover:bg-blue-200 dark:bg-blue-900/40 dark:group-hover:bg-blue-800/60">
                    <span className="material-symbols-outlined text-lg text-blue-600 dark:text-blue-400">post_add</span>
                  </div>
                  Create Notice
                </button>
                <button className="group flex w-full items-center gap-3 rounded-xl border border-green-200 bg-white px-4 py-3 text-sm font-semibold text-neutral-900 shadow-sm transition-all duration-200 hover:scale-105 hover:border-green-400 hover:bg-green-50 hover:shadow-md dark:border-green-900/50 dark:bg-neutral-900 dark:text-neutral-100 dark:hover:border-green-700 dark:hover:bg-green-900/20">
                  <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green-100 group-hover:bg-green-200 dark:bg-green-900/40 dark:group-hover:bg-green-800/60">
                    <span className="material-symbols-outlined text-lg text-green-600 dark:text-green-400">work</span>
                  </div>
                  Post Job
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </main>
  );
};

export default HRDashboard;
