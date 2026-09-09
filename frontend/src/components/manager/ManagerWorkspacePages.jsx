import ManagerContextDialog from './ManagerContextDialog';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { managerApi } from '../../services/manager';
import { QK, cachePolicyFor } from '../../utils/queryKeys';
import PortalHeader from '../common/PortalHeader';
import WarmGreeting from '../common/WarmGreeting';
import KPICard from '../common/KPICard';
import AttentionPanel from '../common/AttentionPanel';
import QuickActions from '../common/QuickActions';
import SectionCard from '../ui/SectionCard';
import StatusBadge from '../common/StatusBadge';
import { statusToTone } from '../../utils/statusTone';

const unwrap = (res) => res?.data ?? res ?? {};
const humanize = (v) => String(v || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const date = (v) => v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : 'Not set';
const Card = ({ children }) => <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">{children}</section>;
const Badge = ({ children }) => <span className="rounded-full bg-neutral-100 px-2.5 py-1 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{humanize(children)}</span>;
const Page = ({ title, description, action, children }) => {
  const { user } = useAuth();
  return <main className="portal-page"><div className="portal-page-inner space-y-5"><PortalHeader title={title} subtitle={description} user={user} icon="supervisor_account" actions={action} />{children}</div></main>;
};

// Backed by TanStack Query (Phase 2E) — was plain useState/useEffect, which
// meant every manager page fetched independently with no caching/dedup and
// nothing else in the app could invalidate it (e.g. a task status change
// couldn't refresh the dashboard's task counts). Same external shape
// ({data, loading, error, reload, token}) so no call site below changed
// beyond passing a real query key.
const useManagerData = (loader, queryKey, params) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKey || QK.manager.root();
  const query = useQuery({
    queryKey: [...key, token, params || {}],
    queryFn: async () => unwrap(await loader(token, params)),
    enabled: Boolean(token),
    ...cachePolicyFor(key),
  });
  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.isError ? (query.error?.message || 'Unable to load manager data.') : '',
    reload: () => Promise.all([queryClient.invalidateQueries({ queryKey: QK.manager.root() }), queryClient.invalidateQueries({ queryKey: QK.tasks.root() })]),
    token,
  };
};
const State = ({ loading, error, empty, children, retry }) => loading ? <Card><p className="animate-pulse text-sm text-neutral-500">Loading manager workspace...</p></Card> : error ? <Card><p className="text-sm text-rose-600">{error}</p>{retry && <button onClick={retry} className="mt-3 rounded-lg border px-3 py-2 text-sm">Retry</button>}</Card> : empty ? <Card><p className="text-sm text-neutral-500">No records found.</p></Card> : children;

export const ManagerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useManagerData(managerApi.getDashboard, QK.manager.dashboard());
  const project = data?.projectSummary || {};
  const task = data?.taskSummary || {};
  const team = data?.teamSummary || {};
  const approvals = data?.pendingApprovals || {};
  const alerts = data?.alerts || {};

  const attentionItems = (data?.attention || []).map(item => ({
    id: item.type, label: String(item.count) + ' ' + item.title.toLowerCase(), context: item.context,
    tone: item.severity === 'high' ? 'danger' : 'warning',
    actionLabel: item.action.label, onAction: () => navigate(item.action.route),
  }));

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader title="IT Manager" subtitle="Team delivery, task execution, and approvals" icon="supervisor_account" user={user} onRefresh={reload} />
        <WarmGreeting user={user} message="Here's what needs your attention across projects and your team." />

        {loading || error ? (
          <State loading={loading} error={error} retry={reload} />
        ) : (
          <>
            <div className="portal-kpi-grid">
              <KPICard title="Active Projects" value={project.active || 0} icon="folder_open" priority="primary" context={`${project.total || 0} total`} />
              <KPICard title="Open Tasks" value={(task.total || 0) - (task.breakdown?.completed || 0) - (task.breakdown?.cancelled || 0)} icon="task_alt" priority="primary" tone={task.overdue > 0 ? 'warning' : 'accent'} context={`${task.overdue || 0} overdue`} />
              <KPICard title="Team Members" value={team.totalMembers || 0} icon="groups" priority="primary" context={`${team.activeMembers || 0} active`} />
              <KPICard title="Pending Approvals" value={approvals.total || 0} icon="pending_actions" priority="primary" tone={approvals.total > 0 ? 'warning' : 'accent'} context="Leave + work reports" />
            </div>

            <QuickActions
              actions={[
                { label: 'View Projects', icon: 'folder_open', onClick: () => navigate('/manager/projects') },
                { label: 'View Team', icon: 'groups', onClick: () => navigate('/manager/team') },
                { label: 'Task Board', icon: 'view_kanban', onClick: () => navigate('/manager/tasks') },
              ]}
            />

            <AttentionPanel
              title="Needs Attention"
              items={attentionItems}
              loading={loading}
              emptyTitle="Nothing needs attention"
              emptyDescription="No overdue work and no pending approvals."
            />

            <div className="grid gap-4 lg:grid-cols-2">
              <SectionCard title="Upcoming Tasks" icon="event_upcoming" loading={loading} empty={!loading && !(task.upcoming || []).length} emptyTitle="No upcoming deadlines" emptyDescription="Nothing due in the next 7 days.">
                <div className="space-y-3">
                  {(task.upcoming || []).map((t) => (
                    <div key={t.id} className="flex justify-between gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                      <div>
                        <p className="font-semibold">{t.title}</p>
                        <p className="text-xs text-neutral-500">{t.project?.name || 'General'} · {date(t.dueDate)}</p>
                      </div>
                      <StatusBadge tone={statusToTone(t.status)} label={humanize(t.status)} dot={false} />
                    </div>
                  ))}
                </div>
              </SectionCard>
              <SectionCard title="Recent Projects" icon="folder_copy" loading={loading} empty={!loading && !(project.recent || []).length} emptyTitle="No projects yet">
                <div className="space-y-3">
                  {(project.recent || []).map((p) => (
                    <div key={p.id} className="flex justify-between gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                      <div>
                        <p className="font-semibold">{p.name}</p>
                        <p className="text-xs text-neutral-500">{p.progress == null ? 'Not started / No tasks' : String(p.progress) + '% complete'}</p>
                      </div>
                      <StatusBadge tone={statusToTone(p.status)} label={humanize(p.status)} dot={false} />
                    </div>
                  ))}
                </div>
              </SectionCard>
            </div>
          </>
        )}
      </div>
    </main>
  );
};

const ListControls = ({ page, setPage, totalPages, status, setStatus, statuses }) => <div className="flex flex-wrap items-center justify-between gap-3">
  <label className="text-sm">Status <select className="ml-2 rounded-lg border bg-transparent p-2" value={status} onChange={e => { setStatus(e.target.value); setPage(1); }}><option value="">All statuses</option>{statuses.map(value => <option key={value} value={value}>{humanize(value)}</option>)}</select></label>
  <div className="flex items-center gap-3 text-sm"><button className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><span>Page {page} of {Math.max(1, totalPages || 1)}</span><button className="rounded-lg border px-3 py-2 disabled:opacity-40" disabled={page >= (totalPages || 1)} onClick={() => setPage(page + 1)}>Next</button></div>
</div>;
export const ManagerTeamPage = () => { const [selection, setSelection] = React.useState(null); const { data, loading, error, reload } = useManagerData(managerApi.getTeam, QK.manager.team()); const rows = data?.team || []; return <Page title="IT Team" description="Managed employees, current availability, and open workload."><State loading={loading} error={error} retry={reload} empty={!rows.length}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map((u) => <Card key={u._id || u.id}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700">{u.firstName?.[0]}{u.lastName?.[0]}</div><div><p className="font-bold">{u.firstName} {u.lastName}</p><p className="text-sm text-neutral-500">{humanize(u.role)}</p></div></div><p className="mt-4 truncate text-sm text-neutral-500">{u.email}</p><p className="mt-2 text-sm">{u.department} / {u.onLeave ? 'On approved leave' : u.isActive ? 'Active' : 'Inactive'}</p><dl className="mt-3 grid grid-cols-3 gap-2 text-sm"><div><dt>Open tasks</dt><dd className="font-bold">{u.workload?.openTasks ?? 'Unavailable'}</dd></div><div><dt>Overdue</dt><dd className="font-bold">{u.workload?.overdueTasks ?? 'Unavailable'}</dd></div><div><dt>Projects</dt><dd className="font-bold">{u.workload?.projectCount ?? 'Unavailable'}</dd></div></dl><button className="mt-3 rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => setSelection({ kind: 'employee', id: u._id || u.id, title: [u.firstName, u.lastName].filter(Boolean).join(' ') })}>View details</button></Card>)}</div></State><ManagerContextDialog selection={selection} onClose={() => setSelection(null)} /></Page>; };
export const ManagerProjectsPage = () => { const [selection, setSelection] = React.useState(null); const [page, setPage] = React.useState(1); const [status, setStatus] = React.useState(''); const { data, loading, error, reload } = useManagerData(managerApi.getProjects, QK.manager.projects(), { page, status, limit: 10 }); const rows = data?.projects || []; return <Page title="Projects" description="Projects you actively manage. Progress reflects completed tasks, excluding cancelled work."><ListControls page={page} setPage={setPage} totalPages={data?.totalPages} status={status} setStatus={setStatus} statuses={['planning', 'in-progress', 'on-hold', 'completed', 'cancelled']} /><State loading={loading} error={error} retry={reload} empty={!rows.length}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((p) => <Card key={p._id || p.id}><div className="flex justify-between gap-3"><p className="font-bold">{p.name}</p><Badge>{p.status}</Badge></div><p className="mt-2 text-sm text-neutral-500">Due {date(p.deadline)}</p><p className="mt-2 text-sm">{p.progress === null ? 'Not started / No tasks' : String(p.progress) + '% complete'} / {p.openTasks} open tasks</p><button className="mt-3 rounded-lg border px-3 py-2 text-sm font-semibold" onClick={() => setSelection({ kind: 'project', id: p._id || p.id, title: p.name })}>View details</button><div className="mt-4 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-2 rounded-full bg-orange-600" style={{ width: `${p.progress || 0}%` }} /></div></Card>)}</div></State><ManagerContextDialog selection={selection} onClose={() => setSelection(null)} /></Page>; };
// ManagerTasksPage moved to the shared task/Kanban system — see
// frontend/src/components/manager/ManagerTasksBoardPage.jsx
const ReviewActions = ({ onDecide, approveLabel = 'Approve' }) => {
  const [rejecting, setRejecting] = React.useState(false);
  const [reason, setReason] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const decide = async (approve) => {
    if (busy || (!approve && !reason.trim())) return;
    setBusy(true); setError('');
    try { await onDecide(approve, reason); } catch (e) { setError(e.message || 'Unable to save. Please retry.'); } finally { setBusy(false); }
  };
  return <div className="space-y-2">
    {rejecting && <label className="block text-sm">Reason for returning this request<textarea autoFocus maxLength={2000} value={reason} onChange={e => setReason(e.target.value)} className="mt-1 block w-full rounded-lg border bg-transparent p-2" /></label>}
    <div className="flex gap-2">
      <button disabled={busy} onClick={() => decide(true)} className="rounded-lg bg-orange-600 px-3 py-2 text-sm text-white disabled:opacity-50">{busy ? 'Saving...' : approveLabel}</button>
      <button disabled={busy || (rejecting && !reason.trim())} onClick={() => rejecting ? decide(false) : setRejecting(true)} className="rounded-lg border px-3 py-2 text-sm disabled:opacity-50">{rejecting ? 'Submit rejection' : 'Request changes'}</button>
      {rejecting && <button disabled={busy} onClick={() => setRejecting(false)} className="px-2 text-sm">Cancel</button>}
    </div>{error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
  </div>;
};
export const ManagerWorkReviewsPage = () => { const [page, setPage] = React.useState(1); const [status, setStatus] = React.useState(''); const { data, loading, error, reload, token } = useManagerData(managerApi.getEmployeeWork, QK.manager.workReviews(), { page, status, limit: 10 }); const rows = data?.work || data?.items || (Array.isArray(data) ? data : []); const decide = async (id, ok, reason) => { if (ok) await managerApi.approveWork(token, id); else await managerApi.rejectWork(token, id, reason); await reload(); }; return <Page title="Work Reviews" description="Approve submitted employee work or return it for changes."><ListControls page={page} setPage={setPage} totalPages={data?.totalPages} status={status} setStatus={setStatus} statuses={['submitted', 'approved', 'rejected']} /><State loading={loading} error={error} retry={reload} empty={!rows.length}><div className="space-y-3">{rows.map((w) => <Card key={w._id || w.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{w.title || w.task?.title || 'Work submission'}</p><p className="text-sm text-neutral-500">{w.employee?.firstName || w.employee?.name || 'Employee'} · {humanize(w.reportType)} · {date(w.reportDate)}</p>{w.reviewedBy && <p className="mt-1 text-xs text-neutral-400">Reviewed by {w.reviewedBy?.firstName || w.reviewedBy?.name || 'Manager'}</p>}</div>{w.status === 'submitted' ? <ReviewActions onDecide={(ok, reason) => decide(w._id || w.id, ok, reason)} /> : <Badge>{w.status}</Badge>}</div></Card>)}</div></State></Page>; };
export const ManagerLeavePage = () => { const [page, setPage] = React.useState(1); const [status, setStatus] = React.useState(''); const { data, loading, error, reload, token } = useManagerData(managerApi.getLeaveRequests, QK.manager.leaveRequests(), { page, status, limit: 10 }); const rows = data?.leaves || data?.items || (Array.isArray(data) ? data : []); const decide = async (id, ok, reason) => { if (ok) await managerApi.approveLeave(token, id); else await managerApi.rejectLeave(token, id, reason); await reload(); }; return <Page title="Leave Approvals" description="Review team leave requests. Approved requests go to HR for the final decision."><ListControls page={page} setPage={setPage} totalPages={data?.totalPages} status={status} setStatus={setStatus} statuses={['pending', 'manager-approved', 'approved', 'rejected', 'cancelled']} /><State loading={loading} error={error} retry={reload} empty={!rows.length}><div className="space-y-3">{rows.map((l) => <Card key={l._id || l.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{l.employee?.firstName || l.employee?.name || 'Employee'} · {humanize(l.leaveType)}</p><p className="text-sm text-neutral-500">{date(l.startDate)} — {date(l.endDate)} · {l.totalDays || 0} day{l.totalDays === 1 ? '' : 's'}</p>{l.reason && <p className="mt-1 max-w-md text-xs text-neutral-400">{l.reason}</p>}<p className="mt-1 text-[11px] text-neutral-400">Requested {date(l.createdAt)}</p></div>{l.status === 'pending' ? <ReviewActions approveLabel="Approve and forward to HR" onDecide={(ok, reason) => decide(l._id || l.id, ok, reason)} /> : <Badge>{l.status}</Badge>}</div></Card>)}</div></State></Page>; };
