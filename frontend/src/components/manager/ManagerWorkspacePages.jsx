import ManagerContextDialog from './ManagerContextDialog';
import React, { useMemo, useState } from 'react';
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
// common/Button (not ui/Button) so the primary CTA can use variant="accent",
// which resolves to var(--portal-accent) — the Manager Portal's orange brand
// color — instead of ui/Button's generic app-wide blue "primary".
import Button from '../common/Button';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import Skeleton from '../ui/Skeleton';
import Pagination from '../ui/Pagination';
import FilterToolbar from '../common/FilterToolbar';
import { statusToTone } from '../../utils/statusTone';

const unwrap = (res) => res?.data ?? res ?? {};
const humanize = (v) => String(v || '').replace(/[_-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
const date = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : 'Not set');
const initials = (u = {}) => `${u.firstName?.[0] || ''}${u.lastName?.[0] || ''}`.toUpperCase() || '?';

const Page = ({ title, description, icon = 'supervisor_account', action, children }) => {
  const { user } = useAuth();
  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader title={title} subtitle={description} user={user} icon={icon} actions={action} />
        {children}
      </div>
    </main>
  );
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

/** Card shell shared by Team/Projects grids so both stay visually identical. */
const GridCard = ({ children, className = '' }) => (
  <div className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900 ${className}`}>
    {children}
  </div>
);

/* ────────────────────────────── Dashboard ────────────────────────────── */

export const ManagerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, reload } = useManagerData(managerApi.getDashboard, QK.manager.dashboard());
  const project = data?.projectSummary || {};
  const task = data?.taskSummary || {};
  const team = data?.teamSummary || {};
  const approvals = data?.pendingApprovals || {};

  const attentionItems = (data?.attention || []).map((item) => ({
    id: item.type,
    label: `${item.count} ${item.title.toLowerCase()}`,
    context: item.context,
    tone: item.severity === 'high' ? 'danger' : 'warning',
    actionLabel: item.action.label,
    onAction: () => navigate(item.action.route),
  }));

  const topWorkload = useMemo(
    () => [...(team.members || [])].sort((a, b) => (b.overdueTasks - a.overdueTasks) || (b.openTasks - a.openTasks)).slice(0, 5),
    [team.members]
  );

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader title="IT Manager" subtitle="Team delivery, task execution, and approvals" icon="supervisor_account" user={user} onRefresh={reload} />
        <WarmGreeting user={user} message="Here's what needs your attention across projects and your team." />

        {loading || error ? (
          error ? <ErrorState title="Unable to load dashboard" description={error} onRetry={reload} /> : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
            </div>
          )
        ) : (
          <>
            <div className="portal-kpi-grid">
              <KPICard
                title="Active Projects" value={project.active || 0} icon="folder_open" priority="primary"
                context={`${project.total || 0} total`} onClick={() => navigate('/manager/projects')}
              />
              <KPICard
                title="Open Tasks" value={(task.total || 0) - (task.breakdown?.completed || 0) - (task.breakdown?.cancelled || 0)}
                icon="task_alt" priority="primary" tone={task.overdue > 0 ? 'warning' : 'accent'}
                context={`${task.overdue || 0} overdue`} onClick={() => navigate('/manager/tasks')}
              />
              <KPICard
                title="Overdue Tasks" value={task.overdue || 0} icon="event_busy" priority="primary"
                tone={task.overdue > 0 ? 'danger' : 'accent'} context="Past due date"
                onClick={() => navigate('/manager/tasks')}
              />
              <KPICard
                title="Team Members" value={team.totalMembers || 0} icon="groups" priority="primary"
                context={`${team.activeMembers || 0} active`} onClick={() => navigate('/manager/team')}
              />
              <KPICard
                title="Pending Work Reviews" value={approvals.workReports || 0} icon="fact_check" priority="primary"
                tone={approvals.workReports > 0 ? 'warning' : 'accent'} context="Employee submissions"
                onClick={() => navigate('/manager/work-reviews')}
              />
              <KPICard
                title="Pending Leave Approvals" value={approvals.leaves || 0} icon="event_available" priority="primary"
                tone={approvals.leaves > 0 ? 'warning' : 'accent'} context="Awaiting your review"
                onClick={() => navigate('/manager/leave')}
              />
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

            <div className="grid gap-4 lg:grid-cols-3">
              <SectionCard title="Upcoming Tasks" icon="event_upcoming" loading={loading} empty={!loading && !(task.upcoming || []).length} emptyTitle="No upcoming deadlines" emptyDescription="Nothing due in the next 7 days.">
                <div className="space-y-3">
                  {(task.upcoming || []).map((t) => (
                    <div key={t.id} className="flex justify-between gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{t.title}</p>
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
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{p.name}</p>
                        <p className="text-xs text-neutral-500">{p.progress == null ? 'Not started / No tasks' : `${p.progress}% complete`}</p>
                      </div>
                      <StatusBadge tone={statusToTone(p.status)} label={humanize(p.status)} dot={false} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Team Workload" icon="groups" loading={loading} empty={!loading && !topWorkload.length} emptyTitle="No workload data" emptyDescription="No team members with active tasks.">
                <div className="space-y-3">
                  {topWorkload.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-xl bg-neutral-50 p-3 dark:bg-neutral-800">
                      <div className="min-w-0">
                        <p className="truncate font-semibold">{m.name}</p>
                        <p className="text-xs text-neutral-500">{humanize(m.role)}</p>
                      </div>
                      <div className="flex shrink-0 items-center gap-1.5">
                        <StatusBadge tone="info" label={`${m.openTasks} open`} dot={false} />
                        {m.overdueTasks > 0 && <StatusBadge tone="danger" label={`${m.overdueTasks} overdue`} dot={false} />}
                      </div>
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

/* ──────────────────────────────── Team ─────────────────────────────────── */

const availabilityOf = (u) => (u.onLeave ? 'on-leave' : u.isActive ? 'active' : 'inactive');
const AVAILABILITY_LABEL = { active: 'Active', 'on-leave': 'On approved leave', inactive: 'Inactive' };
const AVAILABILITY_TONE = { active: 'success', 'on-leave': 'warning', inactive: 'neutral' };

export const ManagerTeamPage = () => {
  const [selection, setSelection] = useState(null);
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('');
  const [availability, setAvailability] = useState('');
  const [workload, setWorkload] = useState('');
  const { data, loading, error, reload } = useManagerData(managerApi.getTeam, QK.manager.team());
  const rows = useMemo(() => data?.team || [], [data]);

  const roleOptions = useMemo(
    () => [{ value: '', label: 'All roles' }, ...Array.from(new Set(rows.map((u) => u.role).filter(Boolean))).sort().map((r) => ({ value: r, label: humanize(r) }))],
    [rows]
  );

  const filtered = useMemo(() => rows.filter((u) => {
    if (role && u.role !== role) return false;
    if (availability && availabilityOf(u) !== availability) return false;
    if (workload === 'overdue' && !(u.workload?.overdueTasks > 0)) return false;
    if (workload === 'open' && !(u.workload?.openTasks > 0)) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const haystack = `${u.firstName || ''} ${u.lastName || ''} ${u.email || ''}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  }), [rows, role, availability, workload, search]);

  const hasFilters = Boolean(search || role || availability || workload);

  return (
    <Page title="IT Team" description="Managed employees, current availability, and open workload." icon="groups">
      <FilterToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Search name or email…' }}
        primaryFilters={[
          { key: 'role', label: 'Role', value: role, onChange: setRole, options: roleOptions },
          { key: 'availability', label: 'Availability', value: availability, onChange: setAvailability, options: [
            { value: '', label: 'All availability' }, { value: 'active', label: 'Active' }, { value: 'on-leave', label: 'On leave' }, { value: 'inactive', label: 'Inactive' },
          ] },
          { key: 'workload', label: 'Workload', value: workload, onChange: setWorkload, options: [
            { value: '', label: 'Any workload' }, { value: 'open', label: 'Has open tasks' }, { value: 'overdue', label: 'Has overdue tasks' },
          ] },
        ]}
        className="mb-5"
      />

      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState title="Unable to load team" description={error} onRetry={reload} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon="groups"
          title={hasFilters ? 'No team members match the selected filters' : 'No team members yet'}
          description={hasFilters ? 'Try a different search term or clear the filters.' : 'Employees assigned to you will appear here.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((u) => {
            const availabilityKey = availabilityOf(u);
            return (
              <GridCard key={u._id || u.id}>
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-orange-100 font-bold text-orange-700 dark:bg-orange-900/30 dark:text-orange-300">
                    {initials(u)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-bold text-neutral-900 dark:text-neutral-100">{u.firstName} {u.lastName}</p>
                    <p className="truncate text-sm text-neutral-500 dark:text-neutral-400">{humanize(u.role)} · {u.department || 'No department'}</p>
                  </div>
                </div>
                <p className="mt-3 truncate text-sm text-neutral-500 dark:text-neutral-400">{u.email}</p>
                <div className="mt-2">
                  <StatusBadge tone={AVAILABILITY_TONE[availabilityKey]} label={AVAILABILITY_LABEL[availabilityKey]} />
                </div>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800">
                    <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">Open</dt>
                    <dd className="font-bold text-neutral-900 dark:text-neutral-100">{u.workload?.openTasks ?? 0}</dd>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800">
                    <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">Overdue</dt>
                    <dd className={`font-bold ${u.workload?.overdueTasks ? 'text-rose-600 dark:text-rose-400' : 'text-neutral-900 dark:text-neutral-100'}`}>{u.workload?.overdueTasks ?? 0}</dd>
                  </div>
                  <div className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800">
                    <dt className="text-[11px] text-neutral-500 dark:text-neutral-400">Projects</dt>
                    <dd className="font-bold text-neutral-900 dark:text-neutral-100">{u.workload?.projectCount ?? 0}</dd>
                  </div>
                </dl>
                <Button
                  variant="secondary" size="sm" className="mt-3 w-full"
                  onClick={() => setSelection({ kind: 'employee', id: u._id || u.id, title: [u.firstName, u.lastName].filter(Boolean).join(' ') })}
                >
                  View details
                </Button>
              </GridCard>
            );
          })}
        </div>
      )}
      <ManagerContextDialog selection={selection} onClose={() => setSelection(null)} />
    </Page>
  );
};

/* ─────────────────────────────── Projects ──────────────────────────────── */

const PROJECT_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'planning', label: 'Planning' },
  { value: 'in-progress', label: 'In Progress' },
  { value: 'on-hold', label: 'On Hold' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];
const PROJECT_SORT_OPTIONS = [
  { value: 'recent', label: 'Most recent' },
  { value: 'name', label: 'Name A–Z' },
  { value: 'due', label: 'Due soonest' },
  { value: 'progress', label: 'Highest progress' },
];

export const ManagerProjectsPage = () => {
  const [selection, setSelection] = useState(null);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const { data, loading, error, reload } = useManagerData(managerApi.getProjects, QK.manager.projects(), { page, status, search, limit: 12 });
  const rows = useMemo(() => data?.projects || [], [data]);

  const sorted = useMemo(() => {
    const copy = [...rows];
    if (sort === 'name') copy.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    else if (sort === 'due') copy.sort((a, b) => new Date(a.deadline || 8640000000000000) - new Date(b.deadline || 8640000000000000));
    else if (sort === 'progress') copy.sort((a, b) => (b.progress ?? -1) - (a.progress ?? -1));
    return copy;
  }, [rows, sort]);

  const hasFilters = Boolean(status || search);

  return (
    <Page title="Projects" description="Projects you actively manage. Progress reflects completed tasks, excluding cancelled work." icon="folder_open">
      <FilterToolbar
        search={{ value: search, onChange: (v) => { setSearch(v); setPage(1); }, placeholder: 'Search projects…' }}
        primaryFilters={[
          { key: 'status', label: 'Status', value: status, onChange: (v) => { setStatus(v); setPage(1); }, options: PROJECT_STATUS_OPTIONS },
          { key: 'sort', label: 'Sort by', value: sort, onChange: setSort, options: PROJECT_SORT_OPTIONS },
        ]}
        className="mb-5"
      />

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-52 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState title="Unable to load projects" description={error} onRetry={reload} />
      ) : sorted.length === 0 ? (
        <EmptyState
          icon="folder_off"
          title={hasFilters ? 'No projects match your filters' : 'No projects are currently assigned to you'}
          description={hasFilters ? 'Try a different search term or clear the status filter.' : 'Projects where you are the assigned manager will appear here.'}
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sorted.map((p) => (
              <GridCard key={p._id || p.id} className="flex flex-col">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-bold text-neutral-900 dark:text-neutral-100">{p.name}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{p.projectCode || '—'}</p>
                  </div>
                  <StatusBadge tone={statusToTone(p.status)} label={humanize(p.status)} />
                </div>

                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">event</span>Start {date(p.startDate)}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">event_busy</span>Due {date(p.deadline)}</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span>{(p.teamMembers || []).length} team</span>
                  <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">task_alt</span>{p.taskCount || 0} tasks</span>
                </div>

                <div className="mt-3 flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
                  <span>{p.progress === null ? 'Not started / No tasks' : `${p.progress}% complete`}</span>
                  {p.overdueTasks > 0 && <StatusBadge tone="danger" label={`${p.overdueTasks} overdue`} dot={false} />}
                </div>
                <div className="mt-1.5 h-2 rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div className="h-2 rounded-full bg-orange-600" style={{ width: `${p.progress || 0}%` }} />
                </div>

                <Button
                  variant="secondary" size="sm" className="mt-4"
                  onClick={() => setSelection({ kind: 'project', id: p._id || p.id, title: p.name })}
                >
                  View details
                </Button>
              </GridCard>
            ))}
          </div>
          {data?.totalPages > 1 && (
            <div className="mt-4 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <Pagination page={data?.currentPage || page} totalPages={data?.totalPages || 1} total={data?.total} onPageChange={setPage} />
            </div>
          )}
        </>
      )}
      <ManagerContextDialog selection={selection} onClose={() => setSelection(null)} />
    </Page>
  );
};

/* ────────────────────────────── shared review UI ───────────────────────── */

// ManagerTasksPage moved to the shared task/Kanban system — see
// frontend/src/components/manager/ManagerTasksBoardPage.jsx

const ReviewActions = ({ onDecide, approveLabel = 'Approve' }) => {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const decide = async (approve) => {
    if (busy || (!approve && !reason.trim())) return;
    setBusy(true);
    setError('');
    try {
      await onDecide(approve, reason);
    } catch (e) {
      setError(e.message || 'Unable to save. Please retry.');
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      {rejecting && (
        <label className="block text-sm">
          Reason for returning this request
          <textarea
            autoFocus maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-neutral-200 bg-white p-2 text-sm dark:border-neutral-700 dark:bg-neutral-800"
          />
        </label>
      )}
      <div className="flex gap-2">
        <Button variant="accent" size="sm" disabled={busy} onClick={() => decide(true)}>{busy ? 'Saving…' : approveLabel}</Button>
        <Button
          variant="secondary" size="sm" disabled={busy || (rejecting && !reason.trim())}
          onClick={() => (rejecting ? decide(false) : setRejecting(true))}
        >
          {rejecting ? 'Submit rejection' : 'Request changes'}
        </Button>
        {rejecting && <Button variant="ghost" size="sm" disabled={busy} onClick={() => setRejecting(false)}>Cancel</Button>}
      </div>
      {error && <p role="alert" className="text-sm text-rose-600">{error}</p>}
    </div>
  );
};

/* ───────────────────────────── Work Reviews ────────────────────────────── */

const WORK_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'submitted', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Changes Requested' },
];

export const ManagerWorkReviewsPage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error, reload, token } = useManagerData(managerApi.getEmployeeWork, QK.manager.workReviews(), { page, status, limit: 10 });
  const allRows = useMemo(() => data?.work || data?.items || (Array.isArray(data) ? data : []), [data]);
  const rows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter((w) => `${w.title || ''} ${w.task?.title || ''} ${w.employee?.firstName || ''} ${w.employee?.lastName || ''} ${w.project?.name || ''}`.toLowerCase().includes(q));
  }, [allRows, search]);

  const decide = async (id, ok, reason) => {
    if (ok) await managerApi.approveWork(token, id);
    else await managerApi.rejectWork(token, id, reason);
    await reload();
  };

  const hasFilters = Boolean(status || search);

  return (
    <Page title="Work Reviews" description="Approve submitted employee work or return it for changes." icon="fact_check">
      <FilterToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Search employee, task, or project…' }}
        primaryFilters={[{ key: 'status', label: 'Status', value: status, onChange: (v) => { setStatus(v); setPage(1); }, options: WORK_STATUS_OPTIONS }]}
        className="mb-5"
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState title="Unable to load work reviews" description={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="fact_check"
          title={hasFilters ? 'No work reports match your filters' : 'No work is waiting for review'}
          description={hasFilters ? 'Try a different search term or clear the status filter.' : "You're all caught up — new submissions will appear here."}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((w) => (
            <GridCard key={w._id || w.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">{w.title || w.task?.title || 'Work submission'}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {w.employee?.firstName || w.employee?.name || 'Employee'} · {humanize(w.reportType)} · {date(w.reportDate)}
                  </p>
                  {w.reviewedBy && <p className="mt-1 text-xs text-neutral-400 dark:text-neutral-500">Reviewed by {w.reviewedBy?.firstName || w.reviewedBy?.name || 'Manager'}</p>}
                </div>
                {w.status === 'submitted' ? (
                  <ReviewActions onDecide={(ok, reason) => decide(w._id || w.id, ok, reason)} />
                ) : (
                  <StatusBadge tone={statusToTone(w.status)} label={humanize(w.status)} />
                )}
              </div>
            </GridCard>
          ))}
        </div>
      )}
      {data?.totalPages > 1 && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <Pagination page={data?.currentPage || page} totalPages={data?.totalPages || 1} total={data?.total} onPageChange={setPage} />
        </div>
      )}
    </Page>
  );
};

/* ─────────────────────────────── Leave ─────────────────────────────────── */

const LEAVE_STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'manager-approved', label: 'Manager Approved' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
];

/** Employee Request → Manager Review → HR Review, so it's visible that a manager's
 * "approve" is a forward, not a final decision. */
const LeaveWorkflowSteps = ({ leave }) => {
  const managerDone = ['manager-approved', 'approved', 'rejected'].includes(leave.status) || leave.managerApprovalStatus === 'approved';
  const managerRejected = leave.status === 'rejected' && leave.managerApprovalStatus !== 'approved';
  const hrDone = leave.status === 'approved' || (leave.status === 'rejected' && leave.managerApprovalStatus === 'approved');
  const hrRejected = leave.status === 'rejected' && leave.managerApprovalStatus === 'approved';

  const steps = [
    { label: 'Employee Request', tone: 'info', done: true },
    { label: 'Manager Review', tone: managerRejected ? 'danger' : managerDone ? 'success' : 'warning', done: managerDone || managerRejected },
    { label: 'HR Review', tone: hrRejected ? 'danger' : hrDone ? 'success' : 'neutral', done: hrDone || hrRejected },
  ];

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {steps.map((step, i) => (
        <React.Fragment key={step.label}>
          {i > 0 && <span className="material-symbols-outlined text-[14px] text-neutral-300 dark:text-neutral-600">arrow_forward</span>}
          <StatusBadge tone={step.tone} label={step.label} dot={step.done} />
        </React.Fragment>
      ))}
    </div>
  );
};

export const ManagerLeavePage = () => {
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const { data, loading, error, reload, token } = useManagerData(managerApi.getLeaveRequests, QK.manager.leaveRequests(), { page, status, limit: 10 });
  const allRows = useMemo(() => data?.leaves || data?.items || (Array.isArray(data) ? data : []), [data]);
  const rows = useMemo(() => {
    if (!search.trim()) return allRows;
    const q = search.trim().toLowerCase();
    return allRows.filter((l) => `${l.employee?.firstName || ''} ${l.employee?.lastName || ''} ${l.employee?.name || ''}`.toLowerCase().includes(q));
  }, [allRows, search]);

  const decide = async (id, ok, reason) => {
    if (ok) await managerApi.approveLeave(token, id);
    else await managerApi.rejectLeave(token, id, reason);
    await reload();
  };

  const hasFilters = Boolean(status || search);

  return (
    <Page title="Leave Approvals" description="Review team leave requests. Approved requests go to HR for the final decision." icon="event_available">
      <FilterToolbar
        search={{ value: search, onChange: setSearch, placeholder: 'Search employee…' }}
        primaryFilters={[{ key: 'status', label: 'Status', value: status, onChange: (v) => { setStatus(v); setPage(1); }, options: LEAVE_STATUS_OPTIONS }]}
        className="mb-5"
      />

      {loading ? (
        <div className="space-y-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}</div>
      ) : error ? (
        <ErrorState title="Unable to load leave requests" description={error} onRetry={reload} />
      ) : rows.length === 0 ? (
        <EmptyState
          icon="event_available"
          title={hasFilters ? 'No leave requests match your filters' : 'No leave requests require your attention'}
          description={hasFilters ? 'Try a different search term or clear the status filter.' : "You're all caught up — new requests will appear here."}
        />
      ) : (
        <div className="space-y-3">
          {rows.map((l) => (
            <GridCard key={l._id || l.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-bold text-neutral-900 dark:text-neutral-100">{l.employee?.firstName || l.employee?.name || 'Employee'} · {humanize(l.leaveType)}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    {date(l.startDate)} — {date(l.endDate)} · {l.totalDays || 0} day{l.totalDays === 1 ? '' : 's'}
                  </p>
                  {l.reason && <p className="mt-1 max-w-md text-xs text-neutral-400 dark:text-neutral-500">{l.reason}</p>}
                  <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">Requested {date(l.createdAt)}</p>
                  <div className="mt-2"><LeaveWorkflowSteps leave={l} /></div>
                </div>
                {l.status === 'pending' ? (
                  <ReviewActions approveLabel="Approve and forward to HR" onDecide={(ok, reason) => decide(l._id || l.id, ok, reason)} />
                ) : (
                  <StatusBadge tone={statusToTone(l.status)} label={humanize(l.status)} />
                )}
              </div>
            </GridCard>
          ))}
        </div>
      )}
      {data?.totalPages > 1 && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <Pagination page={data?.currentPage || page} totalPages={data?.totalPages || 1} total={data?.total} onPageChange={setPage} />
        </div>
      )}
    </Page>
  );
};
