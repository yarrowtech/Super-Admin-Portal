import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { employeeApi } from '../../services/employee';
import { QK, cachePolicyFor } from '../../utils/queryKeys';
import EmployeeProfilePage from '../shared/EmployeeProfilePage';
import PortalChat from '../common/PortalChat';
import PortalHeader from '../common/PortalHeader';
import WarmGreeting from '../common/WarmGreeting';
import KPICard from '../common/KPICard';
import AttentionPanel from '../common/AttentionPanel';
import QuickActions from '../common/QuickActions';
import StatusBadge from '../common/StatusBadge';
import SectionCard from '../ui/SectionCard';
import ProgressCard from '../ui/ProgressCard';
import { statusToTone } from '../../utils/statusTone';

const unwrap = (response) => response?.data ?? response ?? {};
const formatDate = (value) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not set';
const formatTime = (value) => value ? new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(value)) : '--:--';
const humanize = (value) => String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());

const departmentWorkspace = (user) => {
  const role = String(user?.role || '').toLowerCase();
  if (role === 'it_employee') return null;
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

// Backed by TanStack Query (Phase 2E) — was plain useState/useEffect with no
// caching/dedup, and nothing else in the app could invalidate it (e.g. a
// task status change couldn't refresh the dashboard's task counts). Same
// external shape ({data, loading, error, reload, token}) so page bodies
// below didn't need to change, only the queryKey each one passes in.
const useEmployeeData = (loader, queryKey) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKey || QK.employee.root();
  const query = useQuery({
    queryKey: key,
    queryFn: () => unwrap(loader(token)),
    enabled: Boolean(token),
    ...cachePolicyFor(key),
  });
  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.isError ? (query.error?.message || 'Unable to load this page.') : '',
    reload: () => queryClient.invalidateQueries({ queryKey: key }),
    token,
  };
};

const DataState = ({ loading, error, empty, children }) => {
  if (loading) return <Card><p className="animate-pulse text-sm text-neutral-500">Loading your workspace...</p></Card>;
  if (error) return <Card><p className="text-sm font-medium text-rose-600">{error}</p></Card>;
  if (empty) return <Card><p className="text-sm text-neutral-500">Nothing to show yet.</p></Card>;
  return children;
};

export const EmployeeDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useEmployeeData(employeeApi.getDashboard, QK.employee.dashboard());
  const workspace = departmentWorkspace(user);
  const stats = data?.stats || [];
  const overdueTasks = data?.workbench?.taskAndWorkUpdate?.overdueTasks || 0;
  const pendingLeaves = data?.workbench?.leaveManagement?.pendingLeaves || 0;

  const attentionItems = [
    overdueTasks > 0 && {
      id: 'overdue-tasks', label: `${overdueTasks} task${overdueTasks === 1 ? '' : 's'} overdue`,
      context: 'Past due date', tone: 'danger', actionLabel: 'View tasks', onAction: () => navigate('/employee/tasks'),
    },
    pendingLeaves > 0 && {
      id: 'pending-leaves', label: `${pendingLeaves} leave request${pendingLeaves === 1 ? '' : 's'} pending`,
      context: 'Awaiting approval', tone: 'warning', actionLabel: 'View leave', onAction: () => navigate('/employee/leave'),
    },
    !data?.attendance?.checkedIn && {
      id: 'not-checked-in', label: 'Not checked in today', context: 'Attendance not recorded yet',
      tone: 'warning', actionLabel: 'Check in', onAction: () => navigate('/employee/attendance'),
    },
  ].filter(Boolean);

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader
          title="My Workspace"
          subtitle={workspace ? undefined : (user?.department || 'Employee')}
          icon="person"
          user={user}
          onRefresh={reload}
          secondaryAction={workspace ? { label: workspace.label, icon: workspace.icon, onClick: () => navigate(workspace.path) } : undefined}
        />
        <WarmGreeting user={user} message="Here's your work, tasks, attendance, and upcoming priorities." />

        {error ? (
          <DataState loading={false} error={error} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {stats.map((stat, i) => (
                <KPICard key={stat.label} title={stat.label} value={stat.value} icon={['folder_open', 'task_alt', 'check_circle', 'event_busy'][i] || 'analytics'} priority="primary" context={`${stat.meta} · ${stat.delta}`} />
              ))}
            </div>

            <QuickActions
              actions={[
                { label: 'My Tasks', icon: 'task_alt', onClick: () => navigate('/employee/tasks') },
                { label: 'Attendance', icon: 'calendar_month', onClick: () => navigate('/employee/attendance') },
                { label: 'Request Leave', icon: 'event_available', onClick: () => navigate('/employee/leave') },
              ]}
            />

            <AttentionPanel
              title="Needs Attention"
              items={attentionItems}
              loading={loading}
              emptyTitle="Nothing needs attention"
              emptyDescription="You're all caught up."
            />

            <div className="grid gap-4 lg:grid-cols-[1.35fr_.65fr]">
              <SectionCard
                title="Upcoming Work"
                icon="event_upcoming"
                action={{ label: 'View tasks', onClick: () => navigate('/employee/tasks') }}
                loading={loading}
                empty={!loading && !(data?.schedule || []).length}
                emptyTitle="No upcoming deadlines"
                emptyDescription="You're all caught up."
              >
                <div className="space-y-3">
                  {(data?.schedule || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-4 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                      <div>
                        <p className="font-semibold">{item.title}</p>
                        <p className="text-xs text-neutral-500">{item.project || 'General'} · {formatDate(item.dueDate)}</p>
                      </div>
                      <StatusBadge tone={statusToTone(item.status)} label={humanize(item.status)} dot={false} />
                    </div>
                  ))}
                </div>
              </SectionCard>
              <div className="space-y-4">
                <SectionCard title="Today's Attendance" icon="badge" loading={loading}>
                  <p className="text-xl font-bold">{data?.attendance?.checkedIn ? 'Checked in' : 'Not checked in'}</p>
                  <p className="mt-1 text-sm text-neutral-500">{formatTime(data?.attendance?.checkIn)} — {formatTime(data?.attendance?.checkOut)}</p>
                  <Link to="/employee/attendance" className="mt-4 inline-block text-sm font-semibold text-emerald-600">Manage attendance</Link>
                </SectionCard>
                <SectionCard title="Sprint Progress" icon="trending_up" loading={loading}>
                  <ProgressCard percent={data?.sprint?.progress || 0} label={`${data?.sprint?.name || 'Current sprint'}`} tone="success" />
                </SectionCard>
              </div>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

// EmployeeTasksPage moved to the shared task/Kanban system — see
// frontend/src/components/employee/EmployeeTasksBoardPage.jsx

export const EmployeeProjectsPage = () => {
  const { data, loading, error } = useEmployeeData(employeeApi.getProjects, QK.employee.projects());
  return <Page eyebrow="Department delivery" title="Projects" description="Projects assigned to you and the work board connected to them."><DataState loading={loading} error={error} empty={!data?.projects?.length}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{(data?.projects || []).map((project) => <Card key={project._id || project.id}><div className="flex justify-between gap-3"><p className="font-bold">{project.name}</p><Badge tone={project.status}>{project.status}</Badge></div><p className="mt-2 text-xs text-neutral-500">{project.projectCode || 'Department project'} · Due {formatDate(project.deadline)}</p><div className="mt-4 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-2 rounded-full bg-emerald-500" style={{ width: `${project.progress || 0}%` }} /></div><p className="mt-2 text-right text-xs font-semibold">{project.progress || 0}%</p></Card>)}</div></DataState></Page>;
};

export const EmployeeAttendancePage = () => {
  const { data, loading, error, reload, token } = useEmployeeData((authToken) => employeeApi.getAttendance(authToken), QK.employee.attendance());
  const attendance = data?.attendance || data?.today || data;
  const act = async (type) => { if (type === 'in') await employeeApi.checkIn(token); else await employeeApi.checkOut(token); reload(); };
  return <Page eyebrow="Workday" title="Attendance" description="Check in and out, and review today’s work status."><DataState loading={loading} error={error}><div className="grid gap-4 md:grid-cols-3"><Card><p className="text-sm text-neutral-500">Status</p><p className="mt-2 text-2xl font-bold">{humanize(attendance?.status || (attendance?.checkedIn ? 'present' : 'not checked in'))}</p></Card><Card><p className="text-sm text-neutral-500">Check in</p><p className="mt-2 text-2xl font-bold">{formatTime(attendance?.checkIn)}</p></Card><Card><p className="text-sm text-neutral-500">Check out</p><p className="mt-2 text-2xl font-bold">{formatTime(attendance?.checkOut)}</p></Card></div><Card className="mt-4"><div className="flex flex-wrap gap-3"><button onClick={() => act('in')} disabled={Boolean(attendance?.checkIn || attendance?.checkedIn)} className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-40">Check in</button><button onClick={() => act('out')} disabled={!attendance?.checkIn && !attendance?.checkedIn} className="rounded-xl border border-neutral-300 px-5 py-2.5 text-sm font-semibold disabled:opacity-40 dark:border-neutral-700">Check out</button></div></Card></DataState></Page>;
};

export const EmployeeLeavePage = () => {
  const { data, loading, error, reload, token } = useEmployeeData((authToken) => employeeApi.getLeaves(authToken), QK.employee.leave());
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState({ leaveType: 'casual', startDate: '', endDate: '', reason: '' });
  const leaves = data?.leaves || data?.items || (Array.isArray(data) ? data : []);
  const submit = async (event) => { event.preventDefault(); await employeeApi.requestLeave(token, form); setFormOpen(false); setForm({ leaveType: 'casual', startDate: '', endDate: '', reason: '' }); reload(); };
  return <Page eyebrow="Time away" title="Leave" description="Request leave and follow approval status without contacting HR manually." actions={<button onClick={() => setFormOpen((value) => !value)} className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white">{formOpen ? 'Close form' : 'Request leave'}</button>}>{formOpen && <Card className="mb-4"><form onSubmit={submit} className="grid gap-3 md:grid-cols-2"><select value={form.leaveType} onChange={(e) => setForm({ ...form, leaveType: e.target.value })} className="rounded-xl border p-3 dark:border-neutral-700 dark:bg-neutral-800"><option value="casual">Casual leave</option><option value="sick">Sick leave</option><option value="earned">Earned leave</option></select><input type="text" required placeholder="Reason" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="rounded-xl border p-3 dark:border-neutral-700 dark:bg-neutral-800"/><input type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} className="rounded-xl border p-3 dark:border-neutral-700 dark:bg-neutral-800"/><input type="date" required value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} className="rounded-xl border p-3 dark:border-neutral-700 dark:bg-neutral-800"/><button className="rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white dark:bg-white dark:text-neutral-900">Submit request</button></form></Card>}<DataState loading={loading} error={error} empty={!leaves.length}><div className="space-y-3">{leaves.map((leave) => <Card key={leave.id || leave._id}><div className="flex items-center justify-between gap-3"><div><p className="font-bold">{humanize(leave.leaveType)} leave</p><p className="mt-1 text-sm text-neutral-500">{formatDate(leave.startDate)} — {formatDate(leave.endDate)} · {leave.totalDays || 1} day(s)</p></div><Badge tone={leave.status}>{leave.status}</Badge></div></Card>)}</div></DataState></Page>;
};

export const EmployeeTeamPage = () => {
  const { user } = useAuth();
  const { data, loading, error } = useEmployeeData(employeeApi.getTeam, QK.employee.team());
  return <Page eyebrow={user?.department || 'Department'} title="My team" description="A department-only directory so every employee sees the right colleagues."><DataState loading={loading} error={error} empty={!data?.members?.length}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{(data?.members || []).map((member) => <Card key={member.id}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-emerald-100 font-bold text-emerald-700">{member.name?.split(' ').map((part) => part[0]).slice(0, 2).join('')}</div><div className="min-w-0"><p className="truncate font-bold">{member.name}</p><p className="truncate text-sm text-neutral-500">{humanize(member.title || member.role)}</p></div><span className={`ml-auto h-2.5 w-2.5 rounded-full ${member.status === 'Available' ? 'bg-emerald-500' : 'bg-neutral-300'}`} /></div><p className="mt-4 truncate text-sm text-neutral-500">{member.email}</p></Card>)}</div></DataState></Page>;
};

export const EmployeeDocumentsPage = () => {
  const { data, loading, error } = useEmployeeData(employeeApi.getDocuments, QK.employee.documents());
  return <Page eyebrow="My records" title="Documents" description="Work reports, leave records, notices, and uploaded employee documents."><DataState loading={loading} error={error} empty={!data?.items?.length}><div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{(data?.folders || []).map((folder) => <Card key={folder.id}><p className="text-sm text-neutral-500">{folder.name}</p><p className="mt-2 text-2xl font-bold">{folder.count}</p></Card>)}</div><Card><div className="divide-y divide-neutral-100 dark:divide-neutral-800">{(data?.items || []).map((item) => <div key={`${item.type}-${item.id}`} className="flex items-center gap-3 py-3"><span className="material-symbols-outlined text-neutral-400">description</span><div className="min-w-0 flex-1"><p className="truncate font-semibold">{item.name}</p><p className="text-xs text-neutral-500">{humanize(item.type)} · {formatDate(item.updatedAt)}</p></div><Badge tone={item.status}>{item.status}</Badge></div>)}</div></Card></DataState></Page>;
};

export const EmployeeJobsPage = () => {
  const [applyingJobId, setApplyingJobId] = useState(null);
  const [form, setForm] = useState({ resumeUrl: '', coverLetter: '' });
  const { data: jobsData, loading: jobsLoading, error: jobsError, token } = useEmployeeData(employeeApi.getJobOpenings, QK.employee.jobOpenings());
  const { data: appsData, loading: appsLoading, error: appsError, reload: reloadApps } = useEmployeeData(employeeApi.getMyApplications, QK.employee.myApplications());
  const jobs = Array.isArray(jobsData) ? jobsData : (jobsData?.jobs || []);
  const applications = appsData?.applicants || (Array.isArray(appsData) ? appsData : []);
  const appliedJobIds = new Set(applications.map((application) => String(application.job?._id || application.job || '')));

  const openApply = (job) => { setApplyingJobId(job._id || job.id); setForm({ resumeUrl: '', coverLetter: '' }); };
  const submitApply = async (event, job) => {
    event.preventDefault();
    await employeeApi.applyForJob(token, {
      job: job._id || job.id,
      jobTitle: job.title,
      position: job.title,
      department: job.department,
      resumeUrl: form.resumeUrl || undefined,
      coverLetter: form.coverLetter || undefined,
    });
    setApplyingJobId(null);
    reloadApps();
  };

  return (
    <Page eyebrow="Careers" title="Jobs" description="Browse open internal positions and track the status of your applications.">
      <div className="mb-6">
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">Open positions</h2>
        <DataState loading={jobsLoading} error={jobsError} empty={!jobs.length}>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {jobs.map((job) => {
              const id = job._id || job.id;
              const applied = appliedJobIds.has(String(id));
              return (
                <Card key={id}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold">{job.title}</p>
                      <p className="mt-1 text-xs text-neutral-500">{job.department || 'General'} · {humanize(job.type)}{job.location ? ` · ${job.location}` : ''}</p>
                    </div>
                    <Badge tone={applied ? 'review' : 'neutral'}>{applied ? 'Applied' : humanize(job.status)}</Badge>
                  </div>
                  {job.description && <p className="mt-3 line-clamp-2 text-sm text-neutral-600 dark:text-neutral-300">{job.description}</p>}
                  <div className="mt-4 flex items-center justify-between gap-3">
                    <p className="text-xs text-neutral-500">{job.openings || 1} opening{job.openings === 1 ? '' : 's'}{job.closingDate ? ` · Closes ${formatDate(job.closingDate)}` : ''}</p>
                    {!applied && <button onClick={() => openApply(job)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Apply</button>}
                  </div>
                  {applyingJobId === id && (
                    <form onSubmit={(event) => submitApply(event, job)} className="mt-4 space-y-2 border-t border-neutral-100 pt-4 dark:border-neutral-800">
                      <input type="url" placeholder="Resume link (optional)" value={form.resumeUrl} onChange={(event) => setForm({ ...form, resumeUrl: event.target.value })} className="w-full rounded-lg border border-neutral-200 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
                      <textarea placeholder="Cover note (optional)" value={form.coverLetter} onChange={(event) => setForm({ ...form, coverLetter: event.target.value })} rows={2} className="w-full rounded-lg border border-neutral-200 p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800" />
                      <div className="flex gap-2">
                        <button type="submit" className="rounded-lg bg-neutral-900 px-3 py-2 text-xs font-semibold text-white dark:bg-white dark:text-neutral-900">Submit application</button>
                        <button type="button" onClick={() => setApplyingJobId(null)} className="rounded-lg border border-neutral-300 px-3 py-2 text-xs font-semibold dark:border-neutral-700">Cancel</button>
                      </div>
                    </form>
                  )}
                </Card>
              );
            })}
          </div>
        </DataState>
      </div>
      <div>
        <h2 className="mb-3 text-xs font-bold uppercase tracking-wide text-neutral-500">My applications</h2>
        <DataState loading={appsLoading} error={appsError} empty={!applications.length}>
          <div className="space-y-3">
            {applications.map((application) => (
              <Card key={application._id || application.id}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="font-bold">{application.jobTitle || application.position || 'Application'}</p>
                    <p className="mt-1 text-xs text-neutral-500">Applied {formatDate(application.appliedDate || application.createdAt)}</p>
                  </div>
                  <Badge tone={['hired', 'offered'].includes(application.status) ? 'completed' : application.status === 'rejected' ? 'overdue' : 'pending'}>{application.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </DataState>
      </div>
    </Page>
  );
};

export const EmployeeProfileRoute = () => <EmployeeProfilePage portalLabel="Employee" />;
export const EmployeeChatPage = () => <PortalChat homePath="/employee/dashboard" headerTitle="Team messages" storageKeyPrefix="employee" />;
