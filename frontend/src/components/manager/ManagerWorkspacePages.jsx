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
const Page = ({ title, description, action, children }) => <div className="min-h-screen bg-neutral-50 px-4 py-6 dark:bg-neutral-950 sm:px-6 lg:px-8"><div className="mx-auto max-w-7xl"><div className="mb-6 flex items-end justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-blue-600">IT Management</p><h1 className="mt-1 text-3xl font-bold">{title}</h1><p className="mt-2 text-sm text-neutral-500">{description}</p></div>{action}</div>{children}</div></div>;

// Backed by TanStack Query (Phase 2E) — was plain useState/useEffect, which
// meant every manager page fetched independently with no caching/dedup and
// nothing else in the app could invalidate it (e.g. a task status change
// couldn't refresh the dashboard's task counts). Same external shape
// ({data, loading, error, reload, token}) so no call site below changed
// beyond passing a real query key.
const useManagerData = (loader, queryKey) => {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const key = queryKey || QK.manager.root();
  const query = useQuery({
    queryKey: key,
    queryFn: () => unwrap(loader(token)),
    enabled: Boolean(token),
    ...cachePolicyFor(key),
  });
  return {
    data: query.data ?? null,
    loading: query.isLoading,
    error: query.isError ? (query.error?.message || 'Unable to load manager data.') : '',
    reload: () => queryClient.invalidateQueries({ queryKey: key }),
    token,
  };
};
const State = ({ loading, error, empty, children }) => loading ? <Card><p className="animate-pulse text-sm text-neutral-500">Loading manager workspace...</p></Card> : error ? <Card><p className="text-sm text-rose-600">{error}</p></Card> : empty ? <Card><p className="text-sm text-neutral-500">No records found.</p></Card> : children;

export const ManagerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useManagerData(managerApi.getDashboard, QK.manager.dashboard());
  const project = data?.projectSummary || {};
  const task = data?.taskSummary || {};
  const team = data?.teamSummary || {};
  const approvals = data?.pendingApprovals || {};
  const alerts = data?.alerts || {};

  const attentionItems = [
    alerts.overdueProjects > 0 && {
      id: 'overdue-projects', label: `${alerts.overdueProjects} project${alerts.overdueProjects === 1 ? '' : 's'} overdue`,
      context: 'Past deadline and still open', tone: 'danger', actionLabel: 'View projects', onAction: () => navigate('/manager/projects'),
    },
    task.overdue > 0 && {
      id: 'overdue-tasks', label: `${task.overdue} task${task.overdue === 1 ? '' : 's'} overdue`,
      context: 'Past due date', tone: 'danger', actionLabel: 'View tasks', onAction: () => navigate('/manager/tasks'),
    },
    approvals.leaves > 0 && {
      id: 'pending-leaves', label: `${approvals.leaves} leave request${approvals.leaves === 1 ? '' : 's'} awaiting approval`,
      context: 'Requested by your team', tone: 'warning', actionLabel: 'Review', onAction: () => navigate('/manager/leave'),
    },
    approvals.workReports > 0 && {
      id: 'pending-work-reports', label: `${approvals.workReports} work report${approvals.workReports === 1 ? '' : 's'} awaiting review`,
      context: 'Submitted for review', tone: 'warning', actionLabel: 'Review', onAction: () => navigate('/manager/work-reviews'),
    },
  ].filter(Boolean);

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader title="IT Manager" subtitle="Team delivery, task execution, and approvals" icon="supervisor_account" user={user} onRefresh={reload} />
        <WarmGreeting user={user} message="Here's what needs your attention across projects and your team." />

        {error ? (
          <State loading={false} error={error} />
        ) : (
          <>
            <div className="portal-kpi-grid">
              <KPICard title="Active Projects" value={project.active || 0} icon="folder_open" priority="primary" context={`${project.total || 0} total`} />
              <KPICard title="Open Tasks" value={(task.total || 0) - (task.breakdown?.completed || 0)} icon="task_alt" priority="primary" tone={task.overdue > 0 ? 'warning' : 'accent'} context={`${task.overdue || 0} overdue`} />
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
                        <p className="text-xs text-neutral-500">{p.progress || 0}% complete</p>
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

export const ManagerTeamPage = () => { const { data, loading, error } = useManagerData(managerApi.getTeam, QK.manager.team()); const rows = data?.team || []; return <Page title="IT Team" description="Employees allocated to your department and available for project assignment."><State loading={loading} error={error} empty={!rows.length}><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map((u) => <Card key={u._id || u.id}><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-100 font-bold text-blue-700">{u.firstName?.[0]}{u.lastName?.[0]}</div><div><p className="font-bold">{u.firstName} {u.lastName}</p><p className="text-sm text-neutral-500">{humanize(u.role)}</p></div></div><p className="mt-4 truncate text-sm text-neutral-500">{u.email}</p></Card>)}</div></State></Page>; };
export const ManagerProjectsPage = () => { const { data, loading, error } = useManagerData(managerApi.getProjects, QK.manager.projects()); const rows = data?.projects || []; return <Page title="Projects" description="Projects owned by you and their current delivery status."><State loading={loading} error={error} empty={!rows.length}><div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{rows.map((p) => <Card key={p._id || p.id}><div className="flex justify-between gap-3"><p className="font-bold">{p.name}</p><Badge>{p.status}</Badge></div><p className="mt-2 text-sm text-neutral-500">Due {date(p.deadline)}</p><div className="mt-4 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800"><div className="h-2 rounded-full bg-blue-600" style={{ width: `${p.progress || 0}%` }} /></div></Card>)}</div></State></Page>; };
// ManagerTasksPage moved to the shared task/Kanban system — see
// frontend/src/components/manager/ManagerTasksBoardPage.jsx
export const ManagerWorkReviewsPage = () => { const { data, loading, error, reload, token } = useManagerData(managerApi.getEmployeeWork, QK.manager.workReviews()); const rows = data?.work || data?.items || (Array.isArray(data) ? data : []); const decide = async (id, ok) => { if (ok) await managerApi.approveWork(token, id); else await managerApi.rejectWork(token, id, 'Changes requested by manager'); reload(); }; return <Page title="Work Reviews" description="Approve submitted employee work or return it for changes."><State loading={loading} error={error} empty={!rows.length}><div className="space-y-3">{rows.map((w) => <Card key={w._id || w.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{w.title || w.task?.title || 'Work submission'}</p><p className="text-sm text-neutral-500">{w.employee?.firstName || w.employee?.name || 'Employee'} · {humanize(w.reportType)} · {date(w.reportDate)}</p>{w.reviewedBy && <p className="mt-1 text-xs text-neutral-400">Reviewed by {w.reviewedBy?.firstName || w.reviewedBy?.name || 'Manager'}</p>}</div>{w.status === 'submitted' ? <div className="flex gap-2"><button onClick={() => decide(w._id || w.id, true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve</button><button onClick={() => decide(w._id || w.id, false)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Request changes</button></div> : <Badge>{w.status}</Badge>}</div></Card>)}</div></State></Page>; };
export const ManagerLeavePage = () => { const { data, loading, error, reload, token } = useManagerData(managerApi.getLeaveRequests, QK.manager.leaveRequests()); const rows = data?.leaves || data?.items || (Array.isArray(data) ? data : []); const decide = async (id, ok) => { if (ok) await managerApi.approveLeave(token, id); else await managerApi.rejectLeave(token, id, 'Not approved by manager'); reload(); }; return <Page title="Leave Approvals" description="Review leave requests from your IT team."><State loading={loading} error={error} empty={!rows.length}><div className="space-y-3">{rows.map((l) => <Card key={l._id || l.id}><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="font-bold">{l.employee?.firstName || l.employee?.name || 'Employee'} · {humanize(l.leaveType)}</p><p className="text-sm text-neutral-500">{date(l.startDate)} — {date(l.endDate)} · {l.totalDays || 0} day{l.totalDays === 1 ? '' : 's'}</p>{l.reason && <p className="mt-1 max-w-md text-xs text-neutral-400">{l.reason}</p>}<p className="mt-1 text-[11px] text-neutral-400">Requested {date(l.createdAt)}</p></div>{l.status === 'pending' ? <div className="flex gap-2"><button onClick={() => decide(l._id || l.id, true)} className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white">Approve</button><button onClick={() => decide(l._id || l.id, false)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">Reject</button></div> : <Badge>{l.status}</Badge>}</div></Card>)}</div></State></Page>; };
