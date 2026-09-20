import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { projectAccessApi } from '../../services/projectAccess';
import { CANONICAL_PROJECTS, findCanonicalProject } from '../../config/projectNames';
import ThemeToggleButton from '../common/ThemeToggleButton';
import StatusBadge from '../common/StatusBadge';
import Button from '../common/Button';
import { EmptyState, ErrorState, Skeleton } from '../ui';
import { statusToTone } from '../../utils/statusTone';
import { getFirstName, getGreetingParts } from '../../utils/greeting';

const PORTAL_DEFAULTS = {
  law: { name: 'Law Portal', icon: 'gavel' },
  it: { name: 'IT Portal', icon: 'memory' },
  hr: { name: 'HR Portal', icon: 'badge' },
  finance: { name: 'Finance Portal', icon: 'account_balance' },
  manager: { name: 'Manager Portal', icon: 'supervisor_account' },
  employee: { name: 'Employee Portal', icon: 'person' },
  research: { name: 'Research Portal', icon: 'science' },
};

const PORTAL_BG = {
  law: 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f3_100%)]',
  it: 'bg-[linear-gradient(180deg,#f8fafc_0%,#edf5fb_100%)]',
  hr: 'bg-[linear-gradient(180deg,#f8fafc_0%,#f3eefb_100%)]',
  finance: 'bg-[linear-gradient(180deg,#f8fafc_0%,#ebf7f0_100%)]',
  manager: 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef6f3_100%)]',
  employee: 'bg-[linear-gradient(180deg,#f8fafc_0%,#eef3fb_100%)]',
  research: 'bg-[linear-gradient(180deg,#f8fafc_0%,#f8f1eb_100%)]',
};

const SECTION_ICONS = {
  records: 'description',
  contracts: 'contract',
  assets: 'devices',
  tickets: 'confirmation_number',
  invoices: 'receipt_long',
  expenses: 'request_quote',
  budgets: 'account_balance_wallet',
  workReports: 'assignment',
  tasks: 'task_alt',
  milestones: 'flag',
  employeeProjects: 'folder_open',
  employeeTasks: 'task_alt',
};

// Only Law has a confirmed, correct destination for "create/view more" links —
// other portals' record/task semantics haven't been audited, so guessing a
// route for them risks sending someone to the wrong page. Extend this map
// once another portal's equivalent pages are confirmed.
const LAW_SECTION_LINKS = {
  'Recent Legal Documents': '/law/legal-docs',
  'Recent Compliance Records': '/law/policy',
  'Recent Contracts': '/law/contracts',
};
const LAW_METRIC_LINKS = {
  'Legal Documents': '/law/legal-docs',
  Compliance: '/law/policy',
  Contracts: '/law/contracts',
  Disputes: '/law/disputes',
};

// Card shell shared by every panel on this page — subtle border, no heavy
// shadow, content-driven height (never a fixed/min height that leaves dead
// space when a section has little to show).
const cardClass = 'rounded-xl border border-slate-200 bg-white p-4 sm:p-5 dark:border-neutral-800 dark:bg-neutral-900';

const priorityToTone = (value) => {
  const priority = String(value || '').trim().toLowerCase();
  if (priority === 'critical') return 'danger';
  if (priority === 'high') return 'warning';
  if (priority === 'medium') return 'info';
  return 'neutral';
};

const EMPTY_SECTIONS = [
  { title: 'Recent Work', type: 'records', rows: [] },
  { title: 'Pending Items', type: 'tasks', rows: [] },
];

const getProjectId = (project) => String(project?._id || project?.id || project?.value || project?.code || project?.projectCode || '');
const canonicalProjectRows = () => CANONICAL_PROJECTS.map((project) => ({
  id: project.code,
  code: project.code,
  projectCode: project.code,
  name: project.name,
  description: project.description,
  status: 'in-progress',
  progress: 0,
  virtual: true,
}));

const defaultMetrics = (portalKey, project = {}) => {
  const progress = Number(project?.progress) || 0;
  const map = {
    law: [
      { label: 'Legal Records', value: 0, icon: 'description' },
      { label: 'Contracts', value: 0, icon: 'contract' },
      { label: 'Pending Approval', value: 0, icon: 'pending_actions' },
      { label: 'Expiring Soon', value: 0, icon: 'event_busy' },
      { label: 'Disputes', value: 0, icon: 'balance' },
    ],
    it: [
      { label: 'Assets', value: 0, icon: 'devices' },
      { label: 'Open Tickets', value: 0, icon: 'confirmation_number' },
      { label: 'Critical Tickets', value: 0, icon: 'priority_high' },
      { label: 'Health Score', value: '100%', icon: 'monitor_heart' },
    ],
    finance: [
      { label: 'Invoices', value: 0, icon: 'receipt_long' },
      { label: 'Payments', value: 0, icon: 'payments' },
      { label: 'Expenses', value: 'INR 0', icon: 'request_quote' },
      { label: 'Budget Used', value: '0%', icon: 'account_balance_wallet' },
    ],
    hr: [
      { label: 'Attendance Rows', value: 0, icon: 'calendar_month' },
      { label: 'Leave Requests', value: 0, icon: 'event_note' },
      { label: 'Work Reports', value: 0, icon: 'assignment' },
      { label: 'HR Tasks', value: 0, icon: 'task_alt' },
    ],
    employee: [
      { label: 'Assigned Tasks', value: 0, icon: 'task_alt' },
      { label: 'Completed Tasks', value: 0, icon: 'check_circle' },
      { label: 'Pending Tasks', value: 0, icon: 'pending' },
    ],
    manager: [
      { label: 'Progress', value: `${progress}%`, icon: 'trending_up' },
      { label: 'Team Members', value: 0, icon: 'group' },
      { label: 'Milestones', value: 0, icon: 'flag' },
      { label: 'Open Tasks', value: 0, icon: 'pending_actions' },
    ],
  };
  return map[portalKey] || map.manager;
};

const safeRows = (rows) => (Array.isArray(rows) ? rows : []);

// "Not set" for genuinely missing data, distinct from a real 0 — never render
// a bare "-", "undefined", or "NaN" for a value the backend didn't supply.
const formatDate = (value) => {
  if (!value) return 'Not set';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not set' : date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const displayValue = (value) => {
  if (value === null || value === undefined || value === '' || (typeof value === 'number' && Number.isNaN(value))) return 'Not set';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-IN');
  return String(value);
};

const rowTitle = (row = {}) =>
  row.title ||
  row.name ||
  row.invoiceNumber ||
  row.assetTag ||
  row.contractType ||
  row.department ||
  row.category ||
  row.week ||
  row.task ||
  'Record';

const ProjectAvatar = ({ name, logo, size = 44 }) =>
  logo?.url ? (
    <img
      src={logo.url}
      alt={name}
      className="shrink-0 rounded-xl object-cover shadow-sm"
      style={{ height: size, width: size }}
    />
  ) : (
    <span
      className="flex shrink-0 items-center justify-center rounded-xl bg-[var(--portal-accent)] text-[16px] font-black uppercase text-white shadow-sm"
      style={{ height: size, width: size }}
    >
      {(name || '?').trim().charAt(0)}
    </span>
  );

// One row inside a "Recent …" list — icon, title, status/priority/type
// badges, and a right-aligned date. Replaces the old ad hoc chip-soup with
// the shared StatusBadge component so tone resolution stays consistent with
// the rest of the app.
const RecordRow = ({ row }) => {
  const typeLabel = row.type || row.section || row.category || row.contractType || row.fiscalYear;
  return (
    <div className="flex items-center gap-3 py-2.5">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 dark:bg-neutral-800 dark:text-neutral-400">
        <span className="material-symbols-outlined text-[16px]">description</span>
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-900 dark:text-neutral-100">{rowTitle(row)}</p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {row.status && <StatusBadge tone={statusToTone(row.status)} label={row.status} dot={false} />}
          {row.priority && <StatusBadge tone={priorityToTone(row.priority)} label={row.priority} dot={false} />}
          {typeLabel && <span className="text-[11px] font-medium text-slate-400 dark:text-neutral-500">{typeLabel}</span>}
        </div>
      </div>
      <span className="shrink-0 whitespace-nowrap text-[11px] font-medium text-slate-400 dark:text-neutral-500">
        {formatDate(row.updatedAt || row.createdAt || row.dueDate || row.expiryDate)}
      </span>
    </div>
  );
};

// A single "Recent …" panel: header (+ optional View All link), then either
// the row list or an EmptyState — never a hand-rolled italic placeholder.
const RecordSection = ({ section, viewAllLink, navigate }) => {
  const rows = safeRows(section.rows);
  return (
    <div className={cardClass}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[16px] text-[var(--portal-accent)]">{SECTION_ICONS[section.type] || 'insights'}</span>
          <h3 className="text-sm font-semibold text-slate-900 dark:text-neutral-100">{section.title}</h3>
        </div>
        {viewAllLink && rows.length > 0 && (
          <button
            type="button"
            onClick={() => navigate(viewAllLink)}
            className="shrink-0 text-xs font-semibold text-[var(--portal-accent)] hover:underline"
          >
            View All
          </button>
        )}
      </div>
      <div className="mt-3">
        {rows.length === 0 ? (
          <EmptyState
            icon={SECTION_ICONS[section.type] || 'inbox'}
            title={`No ${section.title.replace(/^Recent /, '').toLowerCase()} yet`}
            description={`${section.title.replace(/^Recent /, '')} for this project will appear here once created.`}
            compact
          />
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-neutral-800">
            {rows.map((row, idx) => <RecordRow key={row._id || row.id || `${section.title}-${idx}`} row={row} />)}
          </div>
        )}
      </div>
    </div>
  );
};

const ContextField = ({ label, children }) => (
  <div>
    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">{label}</p>
    <div className="mt-1 text-sm font-semibold text-slate-900 dark:text-neutral-100">{children}</div>
  </div>
);

const MetricCardSkeleton = () => (
  <div className={cardClass}>
    <div className="flex items-center gap-2.5">
      <Skeleton className="h-9 w-9 rounded-lg" />
      <Skeleton className="h-3 w-16" />
    </div>
    <Skeleton className="mt-3 h-6 w-12" />
  </div>
);

const ProjectOverviewPage = ({ portalKey = 'manager', portalName, titleOverride }) => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const fallback =PORTAL_DEFAULTS[portalKey] || PORTAL_DEFAULTS.manager;
  const [projects, setProjects] = useState([]);

  // Project selection lives in the URL (?projectId=…) rather than purely
  // local state — so a sidebar link, browser refresh, or back/forward
  // navigation all land on the same project instead of silently resetting
  // to the project grid.
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedId = searchParams.get('projectId') || '';
  const selectProject = (id) => {
    const next = new URLSearchParams(searchParams);
    if (id) next.set('projectId', id); else next.delete('projectId');
    setSearchParams(next);
  };

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [error, setError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [detailRetryToken, setDetailRetryToken] = useState(0);
  // Re-evaluate the greeting once a minute so it flips at hour boundaries.
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    let alive = true;
    if (!token) return undefined;
    setLoading(true);
    setError('');
    departmentApi
      .getProjectOverviewProjects(token, { portal: portalKey, limit: 200 }, { forceRefresh: true })
      .then((res) => {
        if (!alive) return;
        const rows = res?.data?.items || res?.data?.data?.items || [];
        const visibleRows = rows.length ? rows : canonicalProjectRows();
        setProjects(visibleRows);
      })
      .catch(() => {
        projectAccessApi.getMyProjects(token)
          .then((res) => {
            if (!alive) return;
            const payload = res?.data || res?.data?.data || {};
            const rows = payload.accessibleProjects || payload.assignedProjects || payload.projects || [];
            const visibleRows = rows.filter((project) => String(project.status || '').toLowerCase() !== 'blocked');
            const resolvedRows = visibleRows.length ? visibleRows : canonicalProjectRows();
            setProjects(resolvedRows);
          })
          .catch((err) => {
            if (alive) setError(err.message || 'Failed to load project overview.');
          });
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, portalKey]);

  useEffect(() => {
    let alive = true;
    if (!token || !selectedId) {
      setDetail(null);
      setDetailError('');
      return undefined;
    }
    setDetailLoading(true);
    setDetailError('');
    departmentApi
      .getProjectOverviewDetail(token, selectedId, { portal: portalKey }, { forceRefresh: true })
      .then((res) => {
        if (alive) setDetail(res?.data || null);
      })
      .catch((err) => {
        if (!alive) return;
        setDetail(null);
        setDetailError(err?.status === 404 ? 'not_found' : 'error');
      })
      .finally(() => {
        if (alive) setDetailLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [token, selectedId, portalKey, detailRetryToken]);

  const selectedProject = useMemo(
    () => (selectedId ? projects.find((project) => getProjectId(project) === selectedId) || null : null),
    [projects, selectedId]
  );
  const statusOptions = useMemo(
    () => Array.from(new Set(projects.map((project) => project.status).filter(Boolean))).sort(),
    [projects]
  );
  const visibleProjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return projects.filter((project) => {
      if (statusFilter && String(project.status || '') !== statusFilter) return false;
      if (!q) return true;
      const haystack = [project.name, project.description, project.projectCode, project.code]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [projects, search, statusFilter]);

  const portalLabel = portalName || fallback.name;
  const project = detail?.project || selectedProject || {};
  const canonical = project ? findCanonicalProject(project) : null;
  const projectName = project?.name || canonical?.name || project?.projectCode || project?.code || 'Project';
  const projectDescription = project?.description || canonical?.description || 'Project workspace.';
  const metrics = selectedProject ? (safeRows(detail?.metrics).length ? safeRows(detail?.metrics) : defaultMetrics(portalKey, project)) : [];
  const sections = selectedProject ? (safeRows(detail?.sections).length ? safeRows(detail?.sections) : EMPTY_SECTIONS) : [];
  const [primarySection, ...restSections] = sections;
  const greeting = getGreetingParts(now);
  const firstName = getFirstName(user);
  const greetingText = firstName ? `${greeting.greeting}, ${firstName}` : greeting.greeting;
  // Law employees have no direct access to the document/contract/compliance modules.
  const lawLinksAllowed = portalKey === 'law' && String(user?.role || '').toLowerCase() !== 'law_employee';
  const sectionLinks = lawLinksAllowed ? LAW_SECTION_LINKS : {};
  const metricLinks = lawLinksAllowed ? LAW_METRIC_LINKS : {};

  return (
    <main className={`min-h-screen w-full ${PORTAL_BG[portalKey] || PORTAL_BG.manager} text-neutral-900 dark:bg-background-dark dark:text-neutral-100`}>
      <div className="mx-auto w-full max-w-[1440px] space-y-5 p-4 md:p-5 lg:p-6">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <header className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="h-[3px] w-full bg-[var(--portal-accent)]" />
          <div className="bg-gradient-to-br from-[var(--portal-accent-soft)] via-transparent to-transparent p-4 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--portal-accent)]">
                  {portalLabel} · {titleOverride || 'Project Overview'}
                </p>
                <h1 className="mt-2 text-2xl font-bold leading-tight tracking-tight text-slate-950 dark:text-neutral-100 sm:text-3xl">
                  {greetingText}
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-neutral-400">
                  {greeting.message}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {selectedId && (
                  <Button variant="secondary" size="sm" onClick={() => selectProject('')} icon={<span className="material-symbols-outlined text-[16px]">arrow_back</span>}>
                    Back to Projects
                  </Button>
                )}
                <ThemeToggleButton />
              </div>
            </div>
          </div>
        </header>

        {error && (
          <ErrorState title="Could not load project overview" description={error} />
        )}

        {/* ── Project grid ────────────────────────────────────────────── */}
        <section>
          <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
            <h2 className="text-base font-semibold text-slate-950 dark:text-neutral-100">Project workspaces</h2>
            {projects.length > 6 && (
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative w-full max-w-xs">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-slate-400">search</span>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search projects…"
                    aria-label="Search projects"
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-sm text-slate-900 shadow-sm transition placeholder:text-slate-400 focus:border-[var(--portal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100 dark:placeholder:text-neutral-500"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      aria-label="Clear search"
                      className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] dark:hover:bg-neutral-800"
                    >
                      <span className="material-symbols-outlined text-[16px]" aria-hidden="true">close</span>
                    </button>
                  )}
                </div>
                {statusOptions.length > 1 && (
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    aria-label="Filter by status"
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm shadow-sm text-slate-900 focus:border-[var(--portal-accent)] focus:outline-none focus:ring-2 focus:ring-[var(--portal-accent-soft)] dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                  >
                    <option value="">All statuses</option>
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
              {[1, 2, 3, 4, 5, 6].map((item) => <Skeleton key={item} className="h-[132px] rounded-xl" />)}
            </div>
          ) : visibleProjects.length ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {visibleProjects.map((item) => {
                const id = getProjectId(item);
                const itemCanonical = findCanonicalProject(item);
                const name = item?.name || itemCanonical?.name || item?.projectCode || item?.code || 'Project';
                const active = id === selectedId;
                const code = itemCanonical?.code || item?.projectCode || item?.code || 'Project';
                return (
                  <button
                    key={id || name}
                    type="button"
                    onClick={() => selectProject(id)}
                    aria-pressed={active}
                    aria-label={`${name} project overview`}
                    className={`group flex h-full min-h-[132px] flex-col rounded-xl border p-4 text-left transition duration-150 hover:-translate-y-0.5 hover:border-[var(--portal-accent)] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-neutral-950 ${
                      active
                        ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)] ring-1 ring-[var(--portal-accent)] dark:bg-neutral-900'
                        : 'border-slate-200 bg-white dark:border-neutral-800 dark:bg-neutral-950/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950 dark:text-neutral-100" title={name}>{name}</p>
                        <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500 dark:text-neutral-400">{item?.description || itemCanonical?.description || 'Project workspace.'}</p>
                      </div>
                      <span className="max-w-[40%] shrink-0 truncate rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400" title={code}>
                        {code}
                      </span>
                    </div>
                    <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                      <StatusBadge tone={statusToTone(item.status)} label={item.status || 'in-progress'} />
                      <span className={`inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--portal-accent)] transition ${active ? 'opacity-100' : 'opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100'}`}>
                        {active ? 'Selected' : 'View overview'}
                        <span className="material-symbols-outlined text-[14px]" aria-hidden="true">{active ? 'check_circle' : 'arrow_forward'}</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <EmptyState
              icon="folder_off"
              title={projects.length ? 'No projects match your search or filter' : 'No projects are available for this overview'}
              description={projects.length ? 'Try a different search term or status.' : 'Project cards will appear here once project data is available.'}
            />
          )}
        </section>

        {/* ── Selected project detail ─────────────────────────────────── */}
        {selectedId && detailError === 'not_found' && (
          <div className={`${cardClass} flex flex-col items-center py-10 text-center`}>
            <span className="material-symbols-outlined text-[32px] text-slate-300 dark:text-neutral-700">search_off</span>
            <h3 className="mt-3 text-base font-semibold text-slate-900 dark:text-neutral-100">Project not found</h3>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-neutral-400">The requested project does not exist or you may not have access.</p>
            <Button variant="secondary" size="sm" className="mt-4" onClick={() => selectProject('')}>Back to Projects</Button>
          </div>
        )}

        {selectedId && detailError === 'error' && (
          <ErrorState
            title="Unable to load project"
            description="We could not retrieve the selected project."
            onRetry={() => setDetailRetryToken((t) => t + 1)}
          />
        )}

        {selectedProject && !detailError && (
          <>
            {/* Metrics */}
            {detailLoading ? (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {[1, 2, 3, 4].map((item) => <MetricCardSkeleton key={item} />)}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4 2xl:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]" aria-label="Project metrics">
                {metrics.map((metric) => (
                  <div key={metric.label} className={`${cardClass} flex min-w-0 flex-col transition-shadow hover:shadow-sm`}>
                    <div className="flex items-start gap-2.5">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--portal-accent-soft)] text-[var(--portal-accent)]">
                        <span className="material-symbols-outlined text-[18px]" aria-hidden="true">{metric.icon || 'analytics'}</span>
                      </span>
                      <p
                        title={metric.label}
                        className="min-w-0 flex-1 break-words text-[11px] font-semibold uppercase leading-4 tracking-wide text-slate-500 dark:text-neutral-400"
                      >
                        {metric.label}
                      </p>
                    </div>
                    <p className="mt-3 truncate text-2xl font-bold tabular-nums text-slate-950 dark:text-neutral-100" title={String(displayValue(metric.value))}>
                      {displayValue(metric.value)}
                    </p>
                    <div className="mt-auto min-h-[24px] pt-1">
                      {metricLinks[metric.label] && (
                        <button
                          type="button"
                          onClick={() => navigate(metricLinks[metric.label])}
                          aria-label={`View all ${metric.label}`}
                          className="rounded text-xs font-semibold text-[var(--portal-accent)] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--portal-accent)]"
                        >
                          View all →
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Project Context + primary recent section */}
            {detailLoading ? (
              <div className="grid gap-4 xl:grid-cols-12">
                <Skeleton className="h-64 rounded-xl xl:col-span-5" />
                <Skeleton className="h-64 rounded-xl xl:col-span-7" />
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-12">
                <div className={`${cardClass} xl:col-span-5`}>
                  <div className="flex items-center gap-3">
                    <ProjectAvatar name={projectName} logo={project?.logo} size={40} />
                    <div className="min-w-0">
                      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-neutral-500">Project Context</p>
                      <h3 className="truncate text-base font-bold text-slate-950 dark:text-neutral-100" title={projectName}>{projectName}</h3>
                    </div>
                  </div>
                  <p className="mt-3 line-clamp-3 text-xs leading-5 text-slate-500 dark:text-neutral-400">{projectDescription}</p>
                  <div className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4">
                    <ContextField label="Status"><StatusBadge tone={statusToTone(project.status)} label={project.status || 'Not set'} /></ContextField>
                    <ContextField label="Priority">{project.priority ? <StatusBadge tone={priorityToTone(project.priority)} label={project.priority} dot={false} /> : 'Not set'}</ContextField>
                    <ContextField label="Progress">{Number.isFinite(Number(project.progress)) ? `${Number(project.progress)}%` : 'Not set'}</ContextField>
                    <ContextField label="Start Date">{formatDate(project.startDate)}</ContextField>
                    <ContextField label="Deadline">{formatDate(project.endDate)}</ContextField>
                    <ContextField label="Budget Est.">{project.budget?.estimated ? `INR ${Number(project.budget.estimated).toLocaleString('en-IN')}` : 'Not set'}</ContextField>
                    {(project.client?.name || project.client?.company) && (
                      <ContextField label="Client">{[project.client?.name, project.client?.company].filter(Boolean).join(' · ')}</ContextField>
                    )}
                  </div>
                  {safeRows(project.technologies).length ? (
                    <div className="mt-4 flex flex-wrap gap-1.5 border-t border-slate-100 pt-4 dark:border-neutral-800">
                      {project.technologies.map((item) => (
                        <span key={item} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 dark:bg-neutral-800 dark:text-neutral-300">{item}</span>
                      ))}
                    </div>
                  ) : null}
                </div>

                {primarySection && (
                  <div className="xl:col-span-7">
                    <RecordSection section={primarySection} viewAllLink={sectionLinks[primarySection.title]} navigate={navigate} />
                  </div>
                )}
              </div>
            )}

            {/* Remaining recent sections */}
            {!detailLoading && restSections.length > 0 && (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {restSections.map((section) => (
                  <RecordSection key={section.title} section={section} viewAllLink={sectionLinks[section.title]} navigate={navigate} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default ProjectOverviewPage;
