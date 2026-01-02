import React, { useEffect, useMemo, useState } from 'react';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const badgeTone = {
  success: 'text-emerald-600',
  warning: 'text-amber-600',
  danger: 'text-rose-600',
  info: 'text-sky-600',
};

const scheduleTone = {
  green: 'text-emerald-500',
  amber: 'text-amber-600',
  sky: 'text-sky-500',
};

const leaveStatusTone = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
  cancelled: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
};

const leaveTypeOptions = [
  { value: 'sick', label: 'Sick' },
  { value: 'casual', label: 'Casual' },
  { value: 'annual', label: 'Annual' },
  { value: 'maternity', label: 'Maternity' },
  { value: 'paternity', label: 'Paternity' },
  { value: 'unpaid', label: 'Unpaid' },
  { value: 'other', label: 'Other' },
];

const STORAGE_KEY = 'employeeDarkMode';
const WORK_MODE_KEY = 'employeeWorkMode';

const EmployeeDashboard = () => {
  const { token, user } = useAuth();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [projectHighlights, setProjectHighlights] = useState([]);
  const [teamPreview, setTeamPreview] = useState([]);
  const [taskBuckets, setTaskBuckets] = useState({ today: [], upcoming: [], overdue: [], completed: [] });
  const [taskSummary, setTaskSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [leaveError, setLeaveError] = useState('');
  const [leaveModalOpen, setLeaveModalOpen] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leaveType: 'sick',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [leaveActionState, setLeaveActionState] = useState({ saving: false, cancellingId: null });
  const [attendanceStatus, setAttendanceStatus] = useState(null);
  const [attendanceAction, setAttendanceAction] = useState({ loading: false, error: '', message: '' });
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [workMode, setWorkMode] = useState('office');

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === 'true') {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
      return;
    }
    if (stored === 'false') {
      document.documentElement.classList.remove('dark');
      setIsDarkMode(false);
      return;
    }
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      document.documentElement.classList.add('dark');
      setIsDarkMode(true);
    }
  }, []);

  useEffect(() => {
    const storedMode = localStorage.getItem(WORK_MODE_KEY);
    if (storedMode === 'remote' || storedMode === 'office') {
      setWorkMode(storedMode);
    }
  }, []);

  const toggleDarkMode = () => {
    const next = !isDarkMode;
    setIsDarkMode(next);
    document.documentElement.classList.toggle('dark', next);
    localStorage.setItem(STORAGE_KEY, next ? 'true' : 'false');
  };

  const normalizeAttendance = (data) => {
    if (!data) return null;
    const payload = data?.data || data;
    if (!payload) return null;
    return {
      ...payload,
      checkedIn: payload.checkedIn ?? Boolean(payload.checkIn && !payload.checkOut),
      location: payload.location || 'office',
    };
  };

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const [dashboardRes, projectsRes, teamRes, tasksRes, leavesRes] = await Promise.all([
          employeeApi.getDashboard(token),
          employeeApi.getProjects(token),
          employeeApi.getTeam(token),
          employeeApi.getTasks(token, { view: 'overview', limit: 6 }),
          employeeApi.getLeaves(token, { page: 1, limit: 5 }),
        ]);

        setDashboardData(dashboardRes?.data || dashboardRes);
        setProjectHighlights((projectsRes?.data?.projects || []).slice(0, 3));
        setTeamPreview((teamRes?.data?.members || []).slice(0, 3));
        const taskPayload = tasksRes?.data || tasksRes || {};
        setTaskBuckets(taskPayload.buckets || { today: [], upcoming: [], overdue: [], completed: [] });
        setTaskSummary(taskPayload.summary || null);
        setLeaveRequests(leavesRes?.data?.leaves || []);
        setAttendanceStatus(normalizeAttendance(dashboardRes?.data?.attendance || dashboardRes?.attendance));
      } catch (err) {
        setError(err.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  useEffect(() => {
    if (!attendanceStatus?.location) return;
    const normalized = attendanceStatus.location === 'remote' ? 'remote' : 'office';
    setWorkMode(normalized);
    localStorage.setItem(WORK_MODE_KEY, normalized);
  }, [attendanceStatus?.location]);

  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const stats = dashboardData?.stats || [];
  const sprint = dashboardData?.sprint;
  const schedule = dashboardData?.schedule || [];
  const documents = dashboardData?.recentReports || [];
  const updates = dashboardData?.notices || [];
  const attendance = attendanceStatus || normalizeAttendance(dashboardData?.attendance);
  const canCheckIn = !attendance?.checkedIn;
  const canCheckOut = Boolean(attendance?.checkedIn && !attendance?.checkOut);
  const attendanceCtaLabel = canCheckIn ? 'Check In' : canCheckOut ? 'Check Out' : 'Day Complete';
  const workModeLabel = workMode === 'remote' ? 'Work From Home' : 'In Office';
  const modeButtonClass = (value) =>
    `inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-semibold transition ${
      workMode === value
        ? 'bg-slate-900 text-white border-slate-900'
        : 'bg-white/90 text-slate-800 border-slate-200 hover:border-slate-900'
    }`;
  const formatTime = (value) =>
    value ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '';

  const handleWorkModeChange = async (mode) => {
    const normalized = mode === 'remote' ? 'remote' : 'office';
    if (normalized === workMode && (!attendance?.checkedIn || attendance?.location === normalized)) {
      return;
    }
    setWorkMode(normalized);
    localStorage.setItem(WORK_MODE_KEY, normalized);

    if (token && attendance?.checkedIn) {
      try {
        const res = await employeeApi.setAttendanceLocation(token, { location: normalized });
        const updated = normalizeAttendance(res);
        setAttendanceStatus(updated);
        setAttendanceAction({
          loading: false,
          error: '',
          message: normalized === 'remote' ? 'Switched to Work From Home' : 'Switched to In Office',
        });
      } catch (err) {
        setAttendanceAction({
          loading: false,
          error: err.message || 'Failed to update work mode',
          message: '',
        });
      }
    }
  };

  const handleCheckIn = async () => {
    if (!token || !canCheckIn) return;
    setAttendanceAction({ loading: true, error: '', message: '' });
    try {
      const res = await employeeApi.checkIn(token, { location: workMode === 'remote' ? 'remote' : 'office' });
      const normalized = normalizeAttendance(res);
      setAttendanceStatus(normalized);
      setAttendanceAction({
        loading: false,
        error: '',
        message: normalized?.checkIn ? `Checked in at ${formatTime(normalized.checkIn)}` : 'Checked in successfully',
      });
    } catch (err) {
      setAttendanceAction({
        loading: false,
        error: err.message || 'Failed to check in',
        message: '',
      });
    }
  };

  const handleCheckOut = async () => {
    if (!token || !canCheckOut) return;
    setAttendanceAction({ loading: true, error: '', message: '' });
    try {
      const res = await employeeApi.checkOut(token);
      const normalized = normalizeAttendance(res);
      setAttendanceStatus(normalized);
      setAttendanceAction({
        loading: false,
        error: '',
        message: normalized?.checkOut ? `Checked out at ${formatTime(normalized.checkOut)}` : 'Checked out successfully',
      });
    } catch (err) {
      setAttendanceAction({
        loading: false,
        error: err.message || 'Failed to check out',
        message: '',
      });
    }
  };

  const handleAttendanceAction = () => {
    if (canCheckIn) {
      handleCheckIn();
    } else if (canCheckOut) {
      handleCheckOut();
    }
  };

  const handleLeaveSubmit = async () => {
    if (!token) return;
    setLeaveError('');
    setLeaveActionState((prev) => ({ ...prev, saving: true }));

    try {
      const start = leaveForm.startDate ? new Date(leaveForm.startDate) : null;
      const end = leaveForm.endDate ? new Date(leaveForm.endDate) : null;

      if (!start || !end || !leaveForm.reason.trim()) {
        setLeaveError('Start date, end date, and reason are required.');
        setLeaveActionState((prev) => ({ ...prev, saving: false }));
        return;
      }

      const diffMs = end.getTime() - start.getTime();
      const totalDays = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
      if (totalDays <= 0) {
        setLeaveError('End date must be after start date.');
        setLeaveActionState((prev) => ({ ...prev, saving: false }));
        return;
      }

      await employeeApi.requestLeave(token, {
        leaveType: leaveForm.leaveType,
        startDate: leaveForm.startDate,
        endDate: leaveForm.endDate,
        totalDays,
        reason: leaveForm.reason.trim(),
      });

      const refreshed = await employeeApi.getLeaves(token, { page: 1, limit: 5 });
      setLeaveRequests(refreshed?.data?.leaves || []);
      setLeaveModalOpen(false);
      setLeaveForm({ leaveType: 'sick', startDate: '', endDate: '', reason: '' });
    } catch (err) {
      setLeaveError(err.message || 'Failed to submit leave request');
    } finally {
      setLeaveActionState((prev) => ({ ...prev, saving: false }));
    }
  };

  const handleCancelLeave = async (leaveId) => {
    if (!token) return;
    setLeaveActionState((prev) => ({ ...prev, cancellingId: leaveId }));
    try {
      await employeeApi.cancelLeave(token, leaveId);
      const refreshed = await employeeApi.getLeaves(token, { page: 1, limit: 5 });
      setLeaveRequests(refreshed?.data?.leaves || []);
    } catch (err) {
      setLeaveError(err.message || 'Failed to cancel leave request');
    } finally {
      setLeaveActionState((prev) => ({ ...prev, cancellingId: null }));
    }
  };

  const formattedLeaveRequests = useMemo(() => {
    return leaveRequests.map((leave) => {
      const start = leave.startDate ? new Date(leave.startDate) : null;
      const end = leave.endDate ? new Date(leave.endDate) : null;
      return {
        ...leave,
        datesLabel: start
          ? `${start.toLocaleDateString()}${end ? ` - ${end.toLocaleDateString()}` : ''}`
          : '',
        statusClass: leaveStatusTone[leave.status] || leaveStatusTone.pending,
      };
    });
  }, [leaveRequests]);

  const formattedSchedule = useMemo(
    () =>
      schedule.map((item) => ({
        ...item,
        timeLabel: item.dueDate
          ? new Date(item.dueDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          : '',
      })),
    [schedule]
  );

  const { greetingLabel, dayName, dateLabel, timeLabel } = useMemo(() => {
    const now = currentTime;
    const hour = now.getHours();
    let label = 'Good Night';
    if (hour >= 5 && hour < 12) label = 'Good Morning';
    else if (hour >= 12 && hour < 17) label = 'Good Afternoon';
    else if (hour >= 17 && hour < 21) label = 'Good Evening';

    const day = now.toLocaleDateString(undefined, { weekday: 'long' });
    const date = now.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    const time = now.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    return {
      greetingLabel: label,
      dayName: day,
      dateLabel: date,
      timeLabel: time,
    };
  }, [currentTime]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">
        Loading dashboard...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">
        {error}
      </div>
    );
  }

  const greeting = dashboardData?.greeting || user?.firstName || 'there';

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="flex flex-col justify-between gap-4 rounded-3xl border border-slate-200/70 bg-white/80 p-6 shadow-lg shadow-primary/5 ring-1 ring-slate-100 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-900/70 dark:ring-white/5 md:flex-row md:items-end">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-500 dark:text-slate-400">
            {greetingLabel} • {dayName} • {dateLabel} • {timeLabel}
          </p>
          <h1 className="mt-2 text-3xl font-black text-slate-900 dark:text-white">Welcome back, {greeting}</h1>
          <p className="mt-1 flex items-center gap-2 text-sm text-slate-500 dark:text-slate-300">
            <span className="material-symbols-outlined text-base text-amber-500">light_mode</span>
            {attendance?.checkedIn ? 'Checked in today' : 'Don\'t forget to check in'}
          </p>
        </div>
        <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center">
          <button
            onClick={toggleDarkMode}
            className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900/30 dark:text-slate-200"
          >
            <span className="material-symbols-outlined text-base">{isDarkMode ? 'light_mode' : 'dark_mode'}</span>
            {isDarkMode ? 'Light Mode' : 'Dark Mode'}
            <span className="ml-2 inline-flex h-5 w-10 items-center rounded-full bg-slate-200 px-0.5 dark:bg-slate-700">
              <span className={`size-4 rounded-full bg-primary transition-transform ${isDarkMode ? 'translate-x-4' : ''}`}></span>
            </span>
          </button>
          <button
            onClick={handleAttendanceAction}
            disabled={attendanceAction.loading || (!canCheckIn && !canCheckOut)}
            className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-2 text-sm font-semibold shadow-sm transition ${
              canCheckIn
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-200'
                : canCheckOut
                ? 'border-amber-200 bg-amber-50 text-amber-700 hover:border-amber-300 hover:bg-amber-100 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-200'
                : 'cursor-not-allowed border-slate-200 bg-slate-50 text-slate-400 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-500'
            }`}
          >
            <span className="material-symbols-outlined text-base">
              {canCheckIn ? 'login' : canCheckOut ? 'logout' : 'task_alt'}
            </span>
            {attendanceAction.loading ? 'Processing...' : attendanceCtaLabel}
          </button>
          {(attendanceAction.error || attendanceAction.message) && (
            <p
              className={`text-xs font-semibold ${
                attendanceAction.error ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-600 dark:text-emerald-300'
              }`}
            >
              {attendanceAction.error || attendanceAction.message}
            </p>
          )}
          <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white px-4 py-3 dark:border-slate-700 dark:from-slate-900/60 dark:to-slate-900/30">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Current Sprint</p>
              <p className="text-lg font-bold text-slate-900 dark:text-white">{sprint?.name || 'Active Sprint'}</p>
            </div>
            <div className="w-32 rounded-full bg-slate-200/70 dark:bg-slate-800">
              <div className="h-2 rounded-full bg-primary" style={{ width: `${sprint?.progress || 0}%` }}></div>
            </div>
            <p className="text-sm font-semibold text-emerald-500">{sprint?.progress || 0}%</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60"
          >
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.label}</p>
            <div className="mt-2 flex items-center justify-between">
              <p className="text-4xl font-black text-slate-900 dark:text-white">{stat.value}</p>
              {stat.delta && <span className={`text-xs font-semibold ${badgeTone[stat.tone || 'info']}`}>{stat.delta}</span>}
            </div>
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">{stat.meta}</p>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Active projects</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {projectHighlights.map((project) => (
              <div
                key={project._id || project.id}
                className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900/60"
              >
                <div className="flex items-center justify-between">
                  <div className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-indigo-500 text-white">
                    <span className="material-symbols-outlined">folder</span>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-300">
                    {project.status || 'Active'}
                  </span>
                </div>
                <p className="mt-4 text-lg font-bold text-slate-900 dark:text-white">{project.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">
                  Deadline {project.deadline ? new Date(project.deadline).toLocaleDateString('en-GB', { 
                    day: '2-digit', 
                    month: '2-digit', 
                    year: '2-digit' 
                  }) : 'TBD'}
                </p>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs font-semibold text-slate-500">
                    <span>Progress</span>
                    <span className="text-slate-900 dark:text-white">{project.progress || 0}%</span>
                  </div>
                  <div className="mt-1 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress || 0}%` }}></div>
                  </div>
                </div>
              </div>
            ))}
            {projectHighlights.length === 0 && (
              <div className="rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                No projects assigned yet.
              </div>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-b from-white via-slate-50 to-white p-5 shadow-lg shadow-primary/5 dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">Today</p>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300">
              Focus
            </span>
          </div>
          <div className="mt-4 flex flex-col gap-5">
            {formattedSchedule.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No upcoming meetings.</p>
            )}
            {formattedSchedule.map((item) => (
              <div key={item.title + item.timeLabel} className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{item.timeLabel || item.time}</p>
                <h3 className="mt-2 text-base font-semibold text-slate-900 dark:text-white">{item.title}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400">{item.meta}</p>
                {item.badge && (
                  <span className={`mt-3 inline-flex w-fit rounded-full px-3 py-1 text-[11px] font-semibold ${scheduleTone[item.tone] || 'text-slate-500'}`}>
                    {item.badge}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {taskSummary && (
          <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60 lg:col-span-3">
            <div className="flex flex-wrap items-center gap-3 text-sm font-semibold text-slate-600 dark:text-slate-300">
              <span className="rounded-full bg-slate-100 px-3 py-1 dark:bg-white/10">Total {taskSummary.total ?? 0}</span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200">
                Pending {taskSummary.pending ?? 0}
              </span>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200">
                In progress {taskSummary.inProgress ?? 0}
              </span>
              <span className="rounded-full bg-purple-100 px-3 py-1 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200">
                Review {taskSummary.review ?? 0}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200">
                Completed {taskSummary.completed ?? 0}
              </span>
              <span className="rounded-full bg-rose-100 px-3 py-1 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                Overdue {taskSummary.overdue ?? 0}
              </span>
            </div>
          </div>
        )}
        {[
          { key: 'today', label: 'Today', icon: 'sunny' },
          { key: 'upcoming', label: 'Upcoming', icon: 'upcoming' },
          { key: 'overdue', label: 'Overdue', icon: 'error' },
        ].map((bucket) => (
          <div key={bucket.key} className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">{bucket.icon}</span>
                <h3 className="text-base font-semibold text-slate-900 dark:text-white">{bucket.label}</h3>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-500 dark:bg-white/10 dark:text-slate-300">
                {(taskBuckets[bucket.key] || []).length} tasks
              </span>
            </div>
            <div className="mt-4 flex flex-col gap-4">
              {(taskBuckets[bucket.key] || []).map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-100 p-4 shadow-sm transition hover:border-primary/30 dark:border-slate-700">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{task.project?.name || task.status}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-slate-400">schedule</span>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit' 
                      }) : 'No due date'}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                      {task.priority || 'Normal'}
                    </span>
                  </div>
                </div>
              ))}
              {(taskBuckets[bucket.key] || []).length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">No tasks in this bucket.</p>
              )}
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3 rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Recent documents</h3>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {documents.map((doc) => (
              <div key={doc.id || doc._id} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex size-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-200">
                  <span className="material-symbols-outlined">description</span>
                </div>
                <p className="mt-3 text-sm font-semibold text-slate-900 dark:text-white">{doc.title || doc.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{doc.project || doc.type}</p>
                <p className="mt-2 text-xs font-medium text-slate-500">
                  {doc.reportDate ? new Date(doc.reportDate).toLocaleDateString() : ''}
                </p>
              </div>
            ))}
            {documents.length === 0 && <p className="text-sm text-slate-500 dark:text-slate-400">No reports submitted yet.</p>}
          </div>
        </div>
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-6 text-black shadow-xl dark:from-slate-900 dark:to-slate-800 dark:text-white">
          <p className="text-sm font-semibold uppercase tracking-widest text-black">Attendance</p>
          <h3 className="mt-2 text-2xl font-black">{attendance?.checkedIn ? 'You\'re checked in' : 'Check-in pending'}</h3>
          <p className="mt-1 text-sm text-black">
            {attendance?.checkIn
              ? `Checked in at ${new Date(attendance.checkIn).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : 'Tap the attendance widget to log your day'}
          </p>
          {attendance?.checkOut && (
            <p className="text-xs text-black">Checked out at {new Date(attendance.checkOut).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
          )}
          <div className="mt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-black/70">Working mode</p>
            <p className="text-sm font-semibold text-black">{workModeLabel}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              <button
                type="button"
                className={modeButtonClass('office')}
                onClick={() => handleWorkModeChange('office')}
              >
                <span className="material-symbols-outlined text-base">business_center</span>
                In Office
              </button>
              <button
                type="button"
                className={modeButtonClass('remote')}
                onClick={() => handleWorkModeChange('remote')}
              >
                <span className="material-symbols-outlined text-base">home_work</span>
                Work From Home
              </button>
            </div>
            <p className="mt-2 text-xs text-black/70">
              HR sees this selection on your attendance record once you check in.
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Team pulse</h3>
          </div>
          <div className="mt-4 space-y-4">
            {teamPreview.map((member) => (
              <div key={member.id} className="flex items-center gap-4 rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div
                  className="size-12 rounded-full bg-cover bg-center"
                  style={{ backgroundImage: member.avatar ? `url(${member.avatar})` : undefined, backgroundColor: member.avatar ? undefined : '#e2e8f0' }}
                  data-alt={member.name}
                >
                  {!member.avatar && (
                    <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-slate-700">
                      {member.name?.[0] || '?'}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{member.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{member.title || member.role}</p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-200">
                  {member.status || 'Offline'}
                </span>
              </div>
            ))}
            {teamPreview.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No teammates found in your department.</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Latest updates</h3>
          </div>
          <div className="mt-4 space-y-5">
            {updates.map((update) => (
              <div key={update._id} className="relative pl-6">
                <span className="absolute left-0 top-1 size-3 rounded-full bg-primary"></span>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{update.title}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{update.type} • {update.priority}</p>
                <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
                  <span>{update.publishDate ? new Date(update.publishDate).toLocaleDateString() : ''}</span>
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                    Notice
                  </span>
                </div>
              </div>
            ))}
            {updates.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No new notices.</p>
            )}
          </div>
        </div>
        <div className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Leave requests</h3>
            <button
              onClick={() => {
                setLeaveError('');
                setLeaveModalOpen(true);
              }}
              className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-white"
            >
              Request leave
            </button>
          </div>
          {leaveError && (
            <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
              {leaveError}
            </div>
          )}
          <div className="mt-4 space-y-3">
            {formattedLeaveRequests.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">No leave requests yet.</p>
            )}
            {formattedLeaveRequests.map((leave) => (
              <div key={leave._id} className="rounded-2xl border border-slate-100 p-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white capitalize">{leave.leaveType}</p>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${leave.statusClass}`}>
                    {leave.status}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{leave.datesLabel}</p>
                {leave.status === 'pending' && (
                  <button
                    onClick={() => handleCancelLeave(leave._id)}
                    disabled={leaveActionState.cancellingId === leave._id}
                    className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rose-600 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-sm">cancel</span>
                    Cancel request
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {leaveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Request leave</h3>
              <button
                onClick={() => {
                  setLeaveError('');
                  setLeaveModalOpen(false);
                }}
                className="rounded-full p-1 text-slate-500 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {leaveError && (
              <div className="mt-3 rounded-lg border border-rose-200 bg-rose-50 p-2 text-xs text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-200">
                {leaveError}
              </div>
            )}

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Leave type</label>
                <select
                  value={leaveForm.leaveType}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, leaveType: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {leaveTypeOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Start date</label>
                  <input
                    type="date"
                    value={leaveForm.startDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, startDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">End date</label>
                  <input
                    type="date"
                    value={leaveForm.endDate}
                    onChange={(e) => setLeaveForm((prev) => ({ ...prev, endDate: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-600 dark:text-slate-300">Reason</label>
                <textarea
                  rows={3}
                  value={leaveForm.reason}
                  onChange={(e) => setLeaveForm((prev) => ({ ...prev, reason: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setLeaveError('');
                  setLeaveModalOpen(false);
                }}
                className="rounded-full border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                onClick={handleLeaveSubmit}
                disabled={leaveActionState.saving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {leaveActionState.saving ? 'Submitting...' : 'Submit request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default EmployeeDashboard;
