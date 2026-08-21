import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../services/employee';
import EmployeeProfilePage from '../shared/EmployeeProfilePage';
import PortalChat from '../common/PortalChat';

const unwrap = (response) => response?.data ?? response ?? {};
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not set';
const formatTime = (value) => value ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '--:--';
const humanize = (value) => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const departmentWorkspace = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role.startsWith('it_')) return { label: 'Open IT workspace', path: '/it/dashboard', icon: 'memory' };
  if (role.startsWith('law_')) return { label: 'Open Law workspace', path: '/law/dashboard', icon: 'gavel' };
  if (role.startsWith('finance_')) return { label: 'Open Finance workspace', path: '/finance/dashboard', icon: 'account_balance' };
  if (role.startsWith('media_')) return { label: 'Open Media workspace', path: '/media/dashboard', icon: 'campaign' };
  return null;
};

const Page = ({ eyebrow, title, description, actions, children }) => (
  <div className="min-h-screen bg-neutral-50 px-4 py-6 dark:bg-neutral-950 sm:px-6 lg:px-8">
    <div className="mx-auto max-w-7xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-600">{eyebrow}</p>
          <h1 className="mt-1 text-2xl font-bold text-neutral-950 dark:text-white sm:text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-neutral-500 dark:text-neutral-400">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
      </div>
      {children}
    </div>
  </div>
);

const Card = ({ children, className = '' }) => <section className={`rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>{children}</section>;
const Badge = ({ children, tone = 'neutral' }) => {
  const tones = { completed: 'bg-emerald-100 text-emerald-700', approved: 'bg-emerald-100 text-emerald-700', pending: 'bg-amber-100 text-amber-700', review: 'bg-violet-100 text-violet-700', overdue: 'bg-rose-100 text-rose-700', neutral: 'bg-neutral-100 text-neutral-700', 'in-progress': 'bg-blue-100 text-blue-700' };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${tones[tone] || tones.neutral}`}>{humanize(children)}</span>;
};

const useEmployeeData = (loader, deps = []) => {
  const { token } = useAuth();
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const dependencyKey = JSON.stringify(deps);
  const load = useCallback(async () => {
    if (!token) return;
    setState((current) => ({ ...current, loading: true, error: '' }));
    try { setState({ data: unwrap(await loader(token)), loading: false, error: '' }); }
    catch (error) { setState({ data: null, loading: false, error: error?.message || 'Unable to load this page.' }); }
  }, [token, dependencyKey]); // eslint-disable-line react-hooks/exhaustive-deps
  // The initial API request intentionally synchronizes remote employee data into local UI state.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, token };
};

const DataState = ({ loading, error, empty, children }) => {
  if (loading) return <Card><p className="animate-pulse text-sm text-neutral-500">Loading your workspace...</p></Card>;
  if (error) return <Card><p className="text-sm font-medium text-rose-600">{error}</p></Card>;
  if (empty) return <Card><p className="text-sm text-neutral-500">Nothing to show yet.</p></Card>;
  return children;
};

export const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const { data, loading, error } = useEmployeeData(employeeApi.getDashboard);
  const workspace = departmentWorkspace(user);
  return <Page eyebrow={user?.department || 'Employee'} title={`Good to see you, ${user?.firstName || 'there'}`} description="Your work, attendance, deadlines, and department updates in one place." actions={workspace && <Link to={workspace.path} className="inline-flex items-center gap-2 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900"><span className="material-symbols-outlined text-lg">{workspace.icon}</span>{workspace.label}</Link>}>
    <DataState loading={loading} error={error}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{(data?.stats || []).map((stat) => <Card key={stat.label}><p className="text-sm font-medium text-neutral-500">{stat.label}</p><p className="mt-2 text-3xl font-bold">{stat.value}</p><p className="mt-2 text-xs text-neutral-400">{stat.meta} · {stat.delta}</p></Card>)}</div>
      <div className="mt-4 grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
        <Card><div className="mb-4 flex items-center justify-between"><h2 className="font-bold">Upcoming work</h2><Link to="/employee/tasks" className="text-sm font-semibold text-emerald-600">View tasks</Link></div><div className="space-y-3">{(data?.schedule || []).length ? data.schedule.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800"><div><p className="font-semibold">{item.title}</p><p className="text-xs text-neutral-500">{item.project || 'General'} · {formatDate(item.dueDate)}</p></div><Badge tone={item.status}>{item.status}</Badge></div>) : <p className="text-sm text-neutral-500">No upcoming deadlines.</p>}</div></Card>
        <div className="space-y-4"><Card><p className="text-sm text-neutral-500">Today’s attendance</p><p className="mt-2 text-xl font-bold">{data?.attendance?.checkedIn ? 'Checked in' : 'Not checked in'}</p><p className="mt-1 text-sm text-neutral-500">{formatTime(data?.attendance?.checkIn)} — {formatTime(data?.attendance?.checkOut)}</p><Link to="/employee/attendance" className="mt-4 inline-block text-sm font-semibold text-emerald-600">Manage attendance</Link></Card><Card><p className="text-sm text-neutral-500">Sprint progress</p><p className="mt-2 text-2xl font-bold">{data?.sprint?.progress || 0}%</p><div className="mt-3 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${data?.sprint?.progress || 0}%` }} /></div></Card></div>
      </div>
    </DataState>
  </Page>;
};

export const EmployeeTasksPage = () => {
  const [status, setStatus] = useState('');
  const { data, loading, error, reload, token } = useEmployeeData((authToken) => employeeApi.getTasks(authToken, { view: 'list', limit: 50, ...(status ? { status } : {}) }), [status]);
  const updateStatus = async (id, nextStatus) => { await employeeApi.updateTaskStatus(token, id, { status: nextStatus }); reload(); };
  return <Page eyebrow="My work" title="Tasks" description="Track assignments from your department and keep progress visible." actions={<select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"><option value="">All statuses</option><option value="pending">Pending</option><option value="in-progress">In progress</option><option value="review">Review</option><option value="completed">Completed</option></select>}><DataState loading={loading} error={error} empty={!data?.tasks?.length}><div className="grid gap-4 lg:grid-cols-2">{(data?.tasks || []).map((task) => <Card key={task.id}><div className="flex items-start justify-between gap-3"><div><p className="font-bold">{task.title}</p><p className="mt-1 text-sm text-neutral-500">{task.project?.name || 'General task'}</p></div><Badge tone={task.isOverdue ? 'overdue' : task.status}>{task.isOverdue ? 'Overdue' : task.status}</Badge></div><p className="mt-3 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{task.description || 'No description provided.'}</p><div className="mt-4 flex items-center justify-between gap-3"><p className="text-xs text-neutral-500">Due {formatDate(task.dueDate)}</p><select value={task.status} onChange={(event) => updateStatus(task.id, event.target.value)} className="rounded-lg border border-neutral-200 bg-white px-2 py-1.5 text-xs dark:border-neutral-700 dark:bg-neutral-800"><option value="pending">Pending</option><option value="in-progress">In progress</option><option value="review">Review</option><option value="completed">Completed</option></select></div></Card>)}</div></DataState></Page>;
};

export const EmployeeProjectsPage = () => {
  const { data, loading, error } = useEmployeeData(employeeApi.getProjects);
  return <Page eyebrow="Department delivery" title="Projects" description="Projects assigned to you and the work board connected to them."><DataState loading={loading} error={error} empty={!data?.projects?.length}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(data?.projects || []).map((project) => <Card key={project._id || project.id}><div className="flex justify-between gap-3"><p className="font-bold">{project.name}</p><Badge tone={project.status}>{project.status}</Badge></div><p className="mt-2 text-xs text-neutral-500">{project.projectCode || 'Department project'} · Due {formatDate(project.deadline)}</p><div className="mt-4 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${project.progress || 0}%` }} /></div><p className="mt-2 text-right text-xs font-semibold">{project.progress || 0}%</p></Card>)}</div></DataState></Page>;
};

export const EmployeeAttendancePage = () => {
  const { data, loading, error, reload, token } = useEmployeeData((authToken) => employeeApi.getAttendance(authToken));
  const attendance = data?.attendance || data?.today || data;
  const act = async (type) => { if (type === 'in') await employeeApi.checkIn(token); else await employeeApi.checkOut(token); reload(); };
  return <Page eyebrow="Workday" title="Attendance" description="Check in and out, and review today’s work status."><DataState loading={loading} error={error}><div className="grid gap-4 md:grid-cols-3"><Card><p className="text-sm text-neutral-500">Status</p><p className="mt-2 text-2xl font-bold">{humanize(attendance?.status || (attendance?.checkedIn ? 'present' : 'not checked in'))}</p></Card><Card><p className="text-sm text-neutral-500">Check in</p><p className="mt-2 text-2xl font-bold">{formatTime(attendance?.checkIn)}</p></Card><Card><p className="text-sm text-neutral-500">Check out</p><p className="mt-2 text-2xl font-bold">{formatTime(attendance?.checkOut)}</p></Card></div><Card className="mt-4"><div className="flex flex-wrap gap-3"><button onClick={() => act('in')} disabled={Boolean(attendance?.checkIn || attendance?.checkedIn)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Check in</button><button onClick={() => act('out')} disabled={!attendance?.checkIn && !attendance?.checkedIn} className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-semibold disabled:opacity-40 dark:border-neutral-700">Check out</button></div></Card></DataState></Page>;
};

export const EmployeeLeavePage = () => {
  const { data, loading, error, reload, token } = useEmployeeData((authToken) => employeeApi.getLeaves(authToken));
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
  const leaves = data?.leaves || data?.items || (Array.isArray(data) ? data : []);
  const submit = async (event) => { event.preventDefault(); await employeeApi.requestLeave(token, form); setFormOpen(false); setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' }); reload(); };
  return <Page eyebrow="Time away" title="Leave" description="Request leave and follow approval status without contacting HR manually." actions={<button onClick={() => setFormOpen((value) => !value)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">{formOpen ? 'Close form' : 'Request leave'}</button>}>{formOpen && <Card className="mb-4"><form onSubmit={submit} className="grid gap-3 md:grid-cols-2"><select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="rounded-xl border p-3 dark:border-neutral-700 dark:bg-neutral-800"><option value="casual">Casual leave</option><option value="sick">Sick leave</option><option value="earned">Earned leave</option></select><input type="text" required placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="rounded-xl border p-3 dark:border-neutral-700 dark:bg-neutral-800"/><input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-xl border p-3 dark:border-neutral-700 dark:bg-neutral-800"/><input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="rounded-xl border p-3 dark:border-neutral-700 dark:bg-neutral-800"/><button className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">Submit request</button></form></Card>}<DataState loading={loading} error={error} empty={!leaves.length}><div className="space-y-3">{leaves.map((leave) => <Card key={leave.id || leave._id}><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{humanize(leave.leaveType)} leave</p><p className="mt-1 text-sm text-neutral-500">{formatDate(leave.startDate)} — {formatDate(leave.endDate)} · {leave.totalDays || 1} day(s)</p></div><Badge tone={leave.status}>{leave.status}</Badge></div></Card>)}</div></DataState></Page>;
};

export const EmployeeTeamPage = () => {
  const { user } = useAuth();
  const { data, loading, error } = useEmployeeData(employeeApi.getTeam);
  return <Page eyebrow={user?.department || 'Department'} title="My team" description="A department-only directory so every employee sees the right colleagues."><DataState loading={loading} error={error} empty={!data?.members?.length}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(data?.members || []).map((member) => <Card key={member.id}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">{member.name?.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="min-w-0"><p className="truncate font-bold">{member.name}</p><p className="truncate text-sm text-neutral-500">{humanize(member.title || member.role)}</p></div><span className={`ml-auto h-2.5 w-2.5 rounded-full ${member.status === 'Available' ? 'bg-emerald-500' : 'bg-neutral-300'}`} /></div><p className="mt-4 truncate text-sm text-neutral-500">{member.email}</p></Card>)}</div></DataState></Page>;
};

export const EmployeeDocumentsPage = () => {
  const { data, loading, error } = useEmployeeData(employeeApi.getDocuments);
  return <Page eyebrow="My records" title="Documents" description="Work reports, leave records, notices, and uploaded employee documents."><DataState loading={loading} error={error} empty={!data?.items?.length}><div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(data?.folders || []).map((folder) => <Card key={folder.id}><p className="text-sm text-neutral-500">{folder.name}</p><p className="mt-2 text-2xl font-bold">{folder.count}</p></Card>)}</div><Card><div className="divide-y divide-neutral-100 dark:divide-neutral-800">{(data?.items || []).map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-3"><span className="material-symbols-outlined text-neutral-400">description</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.name}</p><p className="text-xs text-neutral-500">{humanize(item.type)} · {formatDate(item.updatedAt)}</p></div><Badge tone={item.status}>{item.status}</Badge></div>)}</div></Card></DataState></Page>;
};

export const EmployeeProfileRoute = () => <EmployeeProfilePage portalLabel="Employee" />;
export const EmployeeChatPage = () => <PortalChat homePath="/employee/dashboard" headerTitle="Team messages" storageKeyPrefix="employee" />;
