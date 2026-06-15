import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { employeeApi } from '../../services/employee';
import { useAuth } from '../../context/AuthContext';

const CACHE_KEY = 'employee_dashboard_modern_v1';
const leaveStatusTone = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  approved: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  rejected: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
};
const attendanceModes = ['manual', 'gps', 'hybrid'];

const normalizeAttendance = (data) => {
  const payload = data?.data || data || null;
  if (!payload) return null;
  return {
    ...payload,
    checkedIn: payload.checkedIn ?? Boolean(payload.checkIn && !payload.checkOut),
    status: payload.status || 'present',
  };
};

const hoursBetween = (start, end) => {
  if (!start) return 0;
  const s = new Date(start).getTime();
  const e = end ? new Date(end).getTime() : Date.now();
  return Math.max((e - s) / (1000 * 60 * 60), 0);
};

const fmtHours = (hrs) => {
  const m = Math.floor(hrs * 60);
  return `${Math.floor(m / 60)}h ${m % 60}m`;
};

const EmployeeDashboardModern = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [data, setData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [tasks, setTasks] = useState({ todo: [], inProgress: [], review: [], completed: [] });
  const [taskSummary, setTaskSummary] = useState(null);
  const [leaves, setLeaves] = useState([]);
  const [leaveBalance, setLeaveBalance] = useState(null);
  const [attendance, setAttendance] = useState(null);
  const [attendanceMode, setAttendanceMode] = useState('manual');
  const [attendanceAction, setAttendanceAction] = useState({ loading: false, error: '', message: '' });
  const [focusMode, setFocusMode] = useState(false);
  const [clock, setClock] = useState(new Date());

  useEffect(() => {
    const iv = setInterval(() => setClock(new Date()), 1000);
    return () => clearInterval(iv);
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [d, p, t, l, b] = await Promise.all([
        employeeApi.getDashboard(token),
        employeeApi.getProjects(token),
        employeeApi.getTasks(token, { view: 'overview', limit: 16 }),
        employeeApi.getLeaves(token, { page: 1, limit: 6 }),
        employeeApi.getLeaveBalance(token).catch(() => null),
      ]);
      const dashboard = d?.data || d || {};
      const taskPayload = t?.data || t || {};
      const columns = {
        todo: [...(taskPayload?.buckets?.today || []), ...(taskPayload?.buckets?.upcoming || [])],
        inProgress: taskPayload?.buckets?.inProgress || [],
        review: taskPayload?.buckets?.review || [],
        completed: taskPayload?.buckets?.completed || [],
      };
      setData(dashboard);
      setProjects((p?.data?.projects || []).slice(0, 4));
      setTasks(columns);
      setTaskSummary(taskPayload.summary || null);
      setLeaves(l?.data?.leaves || []);
      setLeaveBalance(b?.data?.balance || b?.balance || null);
      setAttendance(normalizeAttendance(dashboard.attendance));
      sessionStorage.setItem(CACHE_KEY, JSON.stringify({ dashboard, projects: (p?.data?.projects || []).slice(0, 4), columns, summary: taskPayload.summary || null, leaves: l?.data?.leaves || [], leaveBalance: b?.data?.balance || b?.balance || null }));
    } catch (e) {
      const cached = sessionStorage.getItem(CACHE_KEY);
      if (cached) {
        const c = JSON.parse(cached);
        setData(c.dashboard);
        setProjects(c.projects);
        setTasks(c.columns);
        setTaskSummary(c.summary);
        setLeaves(c.leaves);
        setLeaveBalance(c.leaveBalance);
        setAttendance(normalizeAttendance(c.dashboard?.attendance));
      } else {
        setError(e.message || 'Failed to load employee dashboard');
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { load(); }, [load]);

  const doAttendanceAction = async () => {
    if (!token || attendanceAction.loading) return;
    const canCheckIn = !attendance?.checkedIn;
    const canCheckOut = Boolean(attendance?.checkedIn && !attendance?.checkOut);
    setAttendanceAction({ loading: true, error: '', message: '' });
    try {
      const response = canCheckIn
        ? await employeeApi.checkIn(token, { location: attendanceMode === 'gps' ? 'field' : 'office' })
        : canCheckOut
        ? await employeeApi.checkOut(token)
        : null;
      if (response) setAttendance(normalizeAttendance(response));
      setAttendanceAction({ loading: false, error: '', message: canCheckIn ? 'Checked in' : canCheckOut ? 'Checked out' : 'Completed' });
      await load();
    } catch (e) {
      setAttendanceAction({ loading: false, error: e.message || 'Action failed', message: '' });
    }
  };

  const updateTaskStatus = async (taskId, status) => {
    if (!token) return;
    try {
      await employeeApi.updateTaskStatus(token, taskId, { status });
      await load();
    } catch {}
  };

  const greeting = useMemo(() => {
    const h = clock.getHours();
    if (h < 12) return 'Good Morning';
    if (h < 17) return 'Good Afternoon';
    return 'Good Evening';
  }, [clock]);

  const canCheckIn = !attendance?.checkedIn;
  const canCheckOut = Boolean(attendance?.checkedIn && !attendance?.checkOut);
  const cta = canCheckIn ? 'Check In' : canCheckOut ? 'Check Out' : 'Checked In';
  const worked = fmtHours(hoursBetween(attendance?.checkIn, attendance?.checkOut));
  const performanceScore = data?.performanceScore ?? 78;
  const salaryStatus = data?.salaryStatus || 'Pending';
  const notices = data?.notices || [];

  const kpis = [
    { label: 'Active Projects', value: projects.length, trend: '+2%', icon: 'folder_open' },
    { label: 'Tasks', value: taskSummary?.total || 0, trend: '+4%', icon: 'task' },
    { label: 'Completed', value: taskSummary?.completed || 0, trend: '↑', icon: 'check_circle' },
    { label: 'Leaves', value: leaves.length, trend: '↔', icon: 'event_note' },
    { label: 'Working Hours Today', value: worked, trend: 'Live', icon: 'schedule' },
    { label: 'Attendance Status', value: attendance?.status || 'present', trend: 'Today', icon: 'how_to_reg' },
    { label: 'Performance Score', value: `${performanceScore}%`, trend: 'Weekly', icon: 'insights' },
    { label: 'Salary Status', value: salaryStatus, trend: salaryStatus === 'Paid' ? 'Paid' : 'Pending', icon: 'payments' },
  ];

  if (loading) return <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="h-28 animate-pulse rounded-2xl bg-slate-200/60 dark:bg-slate-800/60" />)}</div>;
  if (error) return <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div>;

  return (
    <main className="mx-auto flex max-w-[1450px] flex-col gap-6">
      <header className="app-card-pad flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/15 text-lg font-bold text-primary">{user?.firstName?.[0] || 'E'}</div>
          <div>
            <p className="text-sm text-slate-500">{greeting}</p>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">{user?.firstName || 'Employee'}</h1>
            <p className="text-sm text-slate-500">{user?.role || 'employee'} • {user?.department || 'General'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={doAttendanceAction} disabled={attendanceAction.loading} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">{attendanceAction.loading ? 'Processing...' : cta}</button>
          <div className="rounded-xl border border-slate-200 px-3 py-2 text-sm dark:border-slate-700"><p className="text-xs text-slate-500">Working Timer</p><p className="font-semibold">{worked}</p></div>
          <div className="relative rounded-xl border border-slate-200 p-2 dark:border-slate-700"><span className="material-symbols-outlined">notifications</span>{Boolean(notices.length) && <span className="absolute -right-1 -top-1 h-3 w-3 rounded-full bg-rose-500" />}</div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k) => (
          <article key={k.label} className="app-card-pad">
            <div className="flex items-center justify-between"><p className="text-sm text-slate-500">{k.label}</p><span className="material-symbols-outlined text-primary">{k.icon}</span></div>
            <p className="mt-2 text-2xl font-black">{k.value}</p>
            <p className="mt-1 text-xs text-emerald-600">{k.trend}</p>
          </article>
        ))}
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="app-card-pad xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Attendance System</h2>
            <div className="flex gap-2">{attendanceModes.map((m) => <button key={m} onClick={() => setAttendanceMode(m)} className={`rounded-full px-3 py-1 text-xs font-semibold ${attendanceMode === m ? 'bg-primary text-white' : 'bg-slate-100 dark:bg-slate-800'}`}>{m}</button>)}</div>
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">Check-in</p><p className="font-semibold">{attendance?.checkIn ? new Date(attendance.checkIn).toLocaleTimeString() : '--'}</p></div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">Check-out</p><p className="font-semibold">{attendance?.checkOut ? new Date(attendance.checkOut).toLocaleTimeString() : '--'}</p></div>
            <div className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">Hours</p><p className="font-semibold">{worked}</p></div>
          </div>
        </div>
        <div className="app-card-pad">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold">Today / Focus</h3>
            <button onClick={() => setFocusMode((v) => !v)} className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold dark:bg-slate-800">{focusMode ? 'Focus On' : 'Focus Off'}</button>
          </div>
          <div className="mt-3 space-y-2">
            {(data?.schedule || []).slice(0, 4).map((s, i) => <div key={`${s.title}-${i}`} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="text-xs text-slate-500">{s.time || 'Today'}</p><p className="text-sm font-semibold">{s.title}</p></div>)}
            {!(data?.schedule || []).length && <p className="text-sm text-slate-500">No meetings or deadlines.</p>}
          </div>
        </div>
      </section>

      <section className="app-card-pad">
        <h2 className="text-lg font-bold">Task Board</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-4">
          {[
            { key: 'todo', label: 'To Do', status: 'pending' },
            { key: 'inProgress', label: 'In Progress', status: 'in-progress' },
            { key: 'review', label: 'Review', status: 'review' },
            { key: 'completed', label: 'Completed', status: 'completed' },
          ].map((col) => (
            <div key={col.key} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-700 dark:bg-slate-900/40">
              <div className="mb-2 flex items-center justify-between"><p className="font-semibold">{col.label}</p><span className="text-xs">{(tasks[col.key] || []).length}</span></div>
              <div className="space-y-2">
                {(tasks[col.key] || []).map((t) => (
                  <article key={t._id || t.id} className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                    <p className="text-sm font-semibold">{t.title}</p>
                    <p className="text-xs text-slate-500">{t.project?.name || 'General'} • {t.priority || 'medium'}</p>
                    <select defaultValue={t.status || col.status} onChange={(e) => updateTaskStatus(t._id || t.id, e.target.value)} className="mt-2 w-full rounded-lg border border-slate-200 px-2 py-1 text-xs dark:border-slate-700 dark:bg-slate-800">
                      <option value="pending">To Do</option><option value="in-progress">In Progress</option><option value="review">Review</option><option value="completed">Completed</option>
                    </select>
                  </article>
                ))}
                {!(tasks[col.key] || []).length && <p className="text-xs text-slate-500">No tasks</p>}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="app-card-pad xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold">Projects</h2>
            {!projects.length && <button className="rounded-xl bg-primary px-3 py-2 text-xs font-semibold text-white">Request Project</button>}
          </div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {projects.map((p) => <article key={p._id || p.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><p className="font-semibold">{p.name}</p><p className="text-xs text-slate-500">Deadline: {p.deadline ? new Date(p.deadline).toLocaleDateString() : 'TBD'}</p><div className="mt-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700"><div className="h-full rounded-full bg-primary" style={{ width: `${p.progress || 0}%` }} /></div></article>)}
            {!projects.length && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-slate-700">No projects assigned. Contact manager.</div>}
          </div>
        </div>
        <div className="app-card-pad">
          <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-bold">Leave</h2><span className="text-xs text-slate-500">Remaining: {leaveBalance?.casual ?? leaveBalance?.annual ?? '--'}d</span></div>
          <div className="space-y-2">
            {leaves.map((l) => <div key={l._id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700"><div className="flex items-center justify-between"><p className="text-sm font-semibold capitalize">{l.leaveType}</p><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${leaveStatusTone[l.status] || leaveStatusTone.pending}`}>{l.status}</span></div></div>)}
            {!leaves.length && <p className="text-sm text-slate-500">No leave requests yet.</p>}
          </div>
        </div>
      </section>
    </main>
  );
};

export default EmployeeDashboardModern;
