import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { lawApi } from '../../services/law';
import { useAuth } from '../../context/AuthContext';
import { CANONICAL_PROJECT_NAMES } from '../../config/projectNames';
import { QK } from '../../utils/queryKeys';
import { LAW_SECTIONS, getLawSection } from './lawModuleConfig';
import LegalDocManagement from './LegalDocManagement';
import LSWLegalLibrary from './LSWLegalLibrary';
import LawOpsPage from './pages/LawOpsPage';
import LawContractsPage from './LawContractsPage';

// ─────────────────────────────────────────────────────────────────────────────
// Design System
// ─────────────────────────────────────────────────────────────────────────────
const tone = {
  active:     'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  pending:    'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  in_review:  'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  attention:  'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  draft:      'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  archived:   'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  ready:      'bg-emerald-50 text-emerald-700 ring-emerald-200',
  critical:   'bg-rose-50 text-rose-700 ring-rose-200',
  high:       'bg-amber-50 text-amber-700 ring-amber-200',
  medium:     'bg-blue-50 text-blue-700 ring-blue-200',
  low:        'bg-neutral-100 text-neutral-600 ring-neutral-200',
};

const Pill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[String(value || '').toLowerCase().replace(/ /g, '_')] || tone.draft}`}>
    {String(value || 'Unknown')}
  </span>
);

const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>{children}</section>
);

const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);

const PageHdr = ({ title, subtitle, icon = 'gavel', action }) => (
  <header className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="h-1 w-full bg-indigo-600" />
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-white">{icon}</span>
        </div>
        <div>
          <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  </header>
);

const StatCard = ({ icon, label, value, color = 'bg-indigo-600', loading }) => (
  <Card>
    <Inner className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
        <span className={`material-symbols-outlined rounded-xl p-2 text-[18px] text-white ${color}`}>{icon}</span>
      </div>
      {loading
        ? <div className="h-8 w-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
        : <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{value}</p>}
    </Inner>
  </Card>
);

const EmptyState = ({ icon = 'description', title, subtitle }) => (
  <div className="flex flex-col items-center gap-2 py-12 text-center">
    <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">{icon}</span>
    <p className="font-semibold text-neutral-600 dark:text-neutral-300">{title}</p>
    {subtitle && <p className="text-sm text-neutral-400 dark:text-neutral-500">{subtitle}</p>}
  </div>
);

const Skeleton = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-2 h-4 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    ))}
  </div>
);

const Btn = ({ children, onClick, variant = 'primary', className = '', ...props }) => (
  <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${variant === 'primary' ? 'bg-indigo-600 text-white hover:bg-indigo-700' : 'border border-neutral-200 bg-white text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300'} ${className}`} {...props}>{children}</button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Constants (kept intact)
// ─────────────────────────────────────────────────────────────────────────────
const pageComponents = {
  'legal-docs': LegalDocManagement,
  'legal-library': LSWLegalLibrary,
  'contracts': LawContractsPage,
};
const LAW_STRICT_PROJECTS = CANONICAL_PROJECT_NAMES;
const LAW_PROJECT_FALLBACK_ORDER = CANONICAL_PROJECT_NAMES;
const OPEN_STATUSES = new Set(['pending', 'in review', 'attention']);
const RESOLVED_STATUSES = new Set(['active', 'ready', 'archived']);
const isRealProjectId = (projectId) => Boolean(projectId) && !String(projectId).startsWith('virtual-');

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizeLawStatus = (value = '') => String(value || '').trim().toLowerCase();
const normalizePriority = (value = '') => String(value || '').trim().toLowerCase();
const toCount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const MODULE_DATA_KEYS = {
  agreements: 'agreements',
  'privacy-policy': 'policy',
  'disputes-fraud': 'disputes',
  'ip-copyright': 'ip',
  'third-party': 'third-party',
  'work-hire': 'work-hire',
};
const isPastDue = (record) => {
  if (!record?.dueDate) return false;
  const due = new Date(record.dueDate);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
};

const moduleToSection = (pathname = '') => {
  if (pathname.startsWith('/law/legal-docs')) return 'legal-docs';
  if (pathname.startsWith('/law/legal-library')) return 'legal-library';
  if (pathname.startsWith('/law/contracts')) return 'contracts';
  if (pathname.startsWith('/law/agreements')) return 'agreements';
  if (pathname.startsWith('/law/policy')) return 'privacy-policy';
  if (pathname.startsWith('/law/disputes')) return 'disputes-fraud';
  if (pathname.startsWith('/law/ip')) return 'ip-copyright';
  if (pathname.startsWith('/law/work-hire')) return 'work-hire';
  if (pathname.startsWith('/law/third-party')) return 'third-party';
  return 'dashboard';
};

const sectionToPath = (section = 'dashboard') => {
  if (section === 'legal-docs') return '/law/legal-docs';
  if (section === 'legal-library') return '/law/legal-library';
  if (section === 'contracts') return '/law/contracts';
  if (section === 'agreements') return '/law/agreements';
  if (section === 'privacy-policy') return '/law/policy';
  if (section === 'disputes-fraud') return '/law/disputes';
  if (section === 'ip-copyright') return '/law/ip';
  if (section === 'work-hire') return '/law/work-hire';
  if (section === 'third-party') return '/law/third-party';
  return '/law/dashboard';
};

// ─────────────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────────────
const LawDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawSelectedProjectId = searchParams.get('projectId') || '';
  const selectedProjectId = isRealProjectId(rawSelectedProjectId) ? rawSelectedProjectId : '';
  const activeSection = moduleToSection(location.pathname);
  const isCreateMode = location.pathname.endsWith('/create');
  const [searchTerm, setSearchTerm] = useState('');
  const [actionError, setActionError] = useState('');
  const [saving, setSaving] = useState(false);
  const enabled = Boolean(token);

  const withProjectContext = (path, projectId = selectedProjectId) => (
    isRealProjectId(projectId) ? `${path}?projectId=${encodeURIComponent(projectId)}` : path
  );

  // Projects list — needed on every section to resolve a fallback project
  // when none is explicitly selected.
  const projectsQuery = useQueries({
    queries: [{ queryKey: QK.law.projects({ limit: 100 }), queryFn: () => lawApi.getProjects(token, { limit: 100 }), enabled }],
  })[0];
  const projects = useMemo(() => {
    const projectItems = projectsQuery.data?.data?.items || [];
    return LAW_STRICT_PROJECTS.map((name) => projectItems.find(
      (p) => String(p?.name || '').trim().toLowerCase() === name.toLowerCase()
    )).filter(Boolean);
  }, [projectsQuery.data]);

  const fallbackProject = useMemo(
    () => LAW_PROJECT_FALLBACK_ORDER.map((name) =>
      projects.find((p) => String(p?.name || '').trim().toLowerCase() === name.toLowerCase())
    ).find(Boolean),
    [projects]
  );
  const effectiveProjectId = selectedProjectId || (activeSection === 'dashboard' ? '' : fallbackProject?._id || fallbackProject?.id || '');
  const hasRealProjectId = isRealProjectId(effectiveProjectId);

  // Auto-promote the resolved fallback project into the URL/localStorage the
  // first time a project-scoped section is visited with none selected yet —
  // purely local, no extra network call.
  useEffect(() => {
    if (activeSection !== 'dashboard' && effectiveProjectId && !selectedProjectId) {
      setSearchParams({ projectId: effectiveProjectId });
      try { localStorage.setItem('activeProjectId', String(effectiveProjectId)); } catch {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, effectiveProjectId, selectedProjectId]);

  const moduleKey = MODULE_DATA_KEYS[activeSection];
  // Records — the single source for whatever section is active, superseding
  // both hand-rolled caches (agreementCache/recordsCache) that used to live
  // here: the 'agreements' section's own fetch used the exact same endpoint
  // (getProjectModuleData(token, 'agreements', projectId)) as this generic
  // path already did, just through a second, redundant cache.
  const recordsQuery = useQueries({
    queries: [{
      queryKey: activeSection === 'dashboard'
        ? QK.law.records('dashboard', { projectId: hasRealProjectId ? effectiveProjectId : undefined })
        : hasRealProjectId && moduleKey
          ? QK.law.moduleData(moduleKey, effectiveProjectId)
          : QK.law.records(activeSection, { projectId: effectiveProjectId }),
      queryFn: () => activeSection === 'dashboard'
        ? lawApi.getRecords(token, hasRealProjectId ? { projectId: effectiveProjectId } : {})
        : hasRealProjectId && moduleKey
          ? lawApi.getProjectModuleData(token, moduleKey, effectiveProjectId)
          : lawApi.getRecords(token, { section: activeSection, projectId: effectiveProjectId }),
      enabled,
    }],
  })[0];
  const records = useMemo(() => recordsQuery.data?.data?.items || recordsQuery.data?.data || [], [recordsQuery.data]);
  const lastUpdatedAt = recordsQuery.dataUpdatedAt || null;
  const agreementsLoading = recordsQuery.isLoading;

  const dashboardEnabled = enabled && activeSection === 'dashboard';
  const dashboardQuery = useQueries({
    queries: [{
      queryKey: QK.law.dashboard(hasRealProjectId ? { projectId: effectiveProjectId } : {}),
      queryFn: () => lawApi.getDashboard(token, hasRealProjectId ? { projectId: effectiveProjectId } : {}),
      enabled: dashboardEnabled,
    }],
  })[0];

  const contractsEnabled = enabled && activeSection === 'dashboard' && hasRealProjectId;
  const contractsQuery = useQueries({
    queries: [{ queryKey: QK.law.contracts(effectiveProjectId), queryFn: () => lawApi.getContracts(token, { projectId: effectiveProjectId }), enabled: contractsEnabled }],
  })[0];

  const complianceEnabled = enabled && activeSection === 'dashboard' && hasRealProjectId;
  const complianceQuery = useQueries({
    queries: [{ queryKey: QK.law.compliance(effectiveProjectId), queryFn: () => lawApi.getCompliance(token, { projectId: effectiveProjectId }), enabled: complianceEnabled }],
  })[0];

  const apiSummary = useMemo(() => (
    activeSection === 'dashboard' && (dashboardQuery.isSuccess || dashboardQuery.isError)
      ? {
          message: dashboardQuery.data?.data?.message || '',
          permissions: dashboardQuery.data?.data?.permissions || [],
          totals: dashboardQuery.data?.data?.totals || {},
          bySection: dashboardQuery.data?.data?.bySection || [],
          byStatus: dashboardQuery.data?.data?.byStatus || [],
          recentRecords: dashboardQuery.data?.data?.recentRecords || [],
          contracts: contractsQuery.data?.data?.contracts?.length || 0,
          compliance: complianceQuery.data?.data?.compliance?.length || 0,
        }
      : null
  ), [activeSection, dashboardQuery.isSuccess, dashboardQuery.isError, dashboardQuery.data, contractsQuery.data, complianceQuery.data]);

  // Only records-fetch failures surface as an error; the dashboard summary
  // gracefully shows zeros when unavailable, matching the original behaviour.
  const error = actionError || (recordsQuery.isError ? (recordsQuery.error?.message || 'Could not load Law records.') : '');
  const setError = setActionError;

  const loadLawData = () => {
    setError('');
    queryClient.invalidateQueries({ queryKey: ['law'] });
  };

  useEffect(() => {
    if (!rawSelectedProjectId || isRealProjectId(rawSelectedProjectId)) return;
    setSearchParams({});
    try {
      if (localStorage.getItem('activeProjectId') === rawSelectedProjectId) {
        localStorage.removeItem('activeProjectId');
      }
    } catch {
      // ignore storage failures
    }
  }, [rawSelectedProjectId, setSearchParams]);

  useEffect(() => {
    if (!token || activeSection !== 'agreements' || !selectedProjectId || String(selectedProjectId).startsWith('virtual-')) return;
    try { localStorage.setItem('activeProjectId', String(selectedProjectId)); } catch {}
  }, [token, activeSection, selectedProjectId]);

  const ActivePage = pageComponents[activeSection];
  const sectionInfo = getLawSection(activeSection);
  const sectionRecords = records.filter((record) => record.section === activeSection);
  const projectOptions = useMemo(
    () =>
      projects
        .map((project) => ({
          label: project.name || 'Untitled Project',
          value: String(project._id || project.id || ''),
        }))
        .filter((item) => item.value),
    [projects]
  );
  const selectedProjectLabel = projectOptions.find((item) => item.value === selectedProjectId)?.label || 'All Projects';

  const analytics = useMemo(() => {
    const dashboardRecords = Array.isArray(records) ? [...records] : [];
    const sourceSections = Array.isArray(apiSummary?.bySection) && apiSummary.bySection.length
      ? apiSummary.bySection
      : dashboardRecords.reduce((acc, record) => {
          const key = record?.section || 'unknown';
          const row = acc.find((item) => item._id === key);
          if (row) row.count += 1;
          else acc.push({ _id: key, count: 1 });
          return acc;
        }, []);
    const sourceStatuses = Array.isArray(apiSummary?.byStatus) && apiSummary.byStatus.length
      ? apiSummary.byStatus
      : dashboardRecords.reduce((acc, record) => {
          const key = record?.status || 'Unknown';
          const row = acc.find((item) => item._id === key);
          if (row) row.count += 1;
          else acc.push({ _id: key, count: 1 });
          return acc;
        }, []);

    const totalRecords = toCount(apiSummary?.totals?.totalRecords || dashboardRecords.length);
    const needsAttention = toCount(apiSummary?.totals?.needsAttention || dashboardRecords.filter((record) => {
      const status = normalizeLawStatus(record?.status);
      const priority = normalizePriority(record?.priority);
      return status === 'attention' || priority === 'critical';
    }).length);
    const activeResolved = dashboardRecords.filter((record) => RESOLVED_STATUSES.has(normalizeLawStatus(record?.status))).length;
    const openPipeline = dashboardRecords.filter((record) => OPEN_STATUSES.has(normalizeLawStatus(record?.status))).length;
    const overdue = dashboardRecords.filter((record) => isPastDue(record) && !RESOLVED_STATUSES.has(normalizeLawStatus(record?.status))).length;
    const dueSoon = dashboardRecords.filter((record) => {
      if (!record?.dueDate) return false;
      const due = new Date(record.dueDate);
      if (Number.isNaN(due.getTime())) return false;
      const diff = due.getTime() - Date.now();
      return diff > 0 && diff <= 7 * 24 * 60 * 60 * 1000;
    }).length;
    const sectionCount = toCount(apiSummary?.totals?.sections || sourceSections.length);
    const completionRate = totalRecords ? Math.round((activeResolved / totalRecords) * 100) : 0;
    const riskRate = totalRecords ? Math.round((needsAttention / totalRecords) * 100) : 0;
    const backlogRate = totalRecords ? Math.round((openPipeline / totalRecords) * 100) : 0;
    const recentRecords = (apiSummary?.recentRecords?.length ? apiSummary.recentRecords : dashboardRecords)
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 6);
    const topOwners = dashboardRecords.reduce((acc, record) => {
      const owner = record?.owner || 'Unassigned';
      const row = acc.find((item) => item.label === owner);
      if (row) row.value += 1;
      else acc.push({ label: owner, value: 1 });
      return acc;
    }, []).sort((a, b) => b.value - a.value).slice(0, 5);

    return {
      totalRecords,
      needsAttention,
      activeResolved,
      openPipeline,
      overdue,
      dueSoon,
      sectionCount,
      completionRate,
      riskRate,
      backlogRate,
      recentRecords,
      topOwners,
      sectionData: sourceSections
        .map((item) => ({
          name: item._id || item.name || 'Unknown',
          value: toCount(item.count ?? item.value ?? 0),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 8),
      statusData: sourceStatuses
        .map((item) => ({
          name: item._id || item.name || 'Unknown',
          value: toCount(item.count ?? item.value ?? 0),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      priorityData: ['Low', 'Medium', 'High', 'Critical'].map((priority) => ({
        name: priority,
        value: dashboardRecords.filter((record) => normalizePriority(record?.priority) === priority.toLowerCase()).length,
      })),
    };
  }, [apiSummary, records]);

  // ─────────────────────────────────────────────────────────────────────────
  // Dashboard render
  // ─────────────────────────────────────────────────────────────────────────
  const renderDashboard = () => {
    const SECTIONS = [
      { id: 'contracts',      label: 'Contracts',        icon: 'contract',       path: '/law/contracts' },
      { id: 'legal-docs',     label: 'Legal Documents',  icon: 'description',    path: '/law/legal-docs' },
      { id: 'agreements',     label: 'Agreements',       icon: 'handshake',      path: '/law/agreements' },
      { id: 'privacy-policy', label: 'Privacy & Policy', icon: 'policy',         path: '/law/policy' },
      { id: 'disputes-fraud', label: 'Disputes & Fraud', icon: 'balance',        path: '/law/disputes' },
      { id: 'ip-copyright',   label: 'IP & Copyright',   icon: 'copyright',      path: '/law/ip' },
      { id: 'work-hire',      label: 'Work on Hire',     icon: 'assignment_ind', path: '/law/work-hire' },
      { id: 'third-party',    label: 'Third Party',      icon: 'groups',         path: '/law/third-party' },
    ];

    const loading = !apiSummary;

    return (
      <div className="space-y-5 p-4 md:p-6">
        <PageHdr
          title="Law Portal"
          subtitle={`Legal operations & compliance${selectedProjectLabel !== 'All Projects' ? ` · ${selectedProjectLabel}` : ''}`}
          icon="balance"
          action={
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const next = e.target.value;
                  if (next) { try { localStorage.setItem('activeProjectId', next); } catch {} }
                  setSearchParams(next ? { projectId: next } : {});
                }}
                className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-xs font-semibold text-neutral-700 outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <option value="">All Projects</option>
                {projectOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
              </select>
              <Btn variant="ghost" onClick={loadLawData} className="h-9 border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900">
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Refresh
              </Btn>
            </div>
          }
        />

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <span className="material-symbols-outlined text-[18px] text-amber-500">info</span>
            <span className="flex-1">Dashboard summary unavailable — showing cached data. <span className="opacity-60 text-xs">{error}</span></span>
            <button onClick={loadLawData} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:bg-transparent dark:text-amber-300">Retry</button>
          </div>
        )}

        {/* KPI cards */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard icon="description"   label="Total Records"    value={analytics.totalRecords}                                           color="bg-indigo-600"  loading={loading} />
          <StatCard icon="warning"       label="Needs Attention"  value={analytics.needsAttention}                                         color="bg-rose-500"    loading={loading} />
          <StatCard icon="hourglass_top" label="Overdue"          value={analytics.overdue}                                                color="bg-amber-500"   loading={loading} />
          <StatCard icon="verified"      label="Resolved"         value={`${analytics.activeResolved} (${analytics.completionRate}%)`}     color="bg-emerald-600" loading={loading} />
        </div>

        {/* Secondary stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'In Review',    value: analytics.openPipeline,               icon: 'find_in_page' },
            { label: 'Due in 7 Days',value: analytics.dueSoon,                    icon: 'schedule' },
            { label: 'Sections',     value: analytics.sectionCount,               icon: 'folder_open' },
            { label: 'Permissions',  value: apiSummary?.permissions?.length || 0, icon: 'lock' },
          ].map(({ label, value, icon }) => (
            <div key={label} className="flex items-center gap-3 rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
              <span className="material-symbols-outlined text-[20px] text-indigo-500">{icon}</span>
              <div>
                <p className="text-xs text-neutral-500">{label}</p>
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{value}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Law sections navigation grid */}
        <Card>
          <Inner>
            <h2 className="mb-4 text-base font-bold text-neutral-900 dark:text-white">Legal Modules</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SECTIONS.map((sec) => {
                const count = analytics.sectionData.find((s) => s.name === sec.id)?.value ?? 0;
                return (
                  <button
                    key={sec.id}
                    type="button"
                    onClick={() => navigate(withProjectContext(sec.path))}
                    className="group flex flex-col items-center gap-2 rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center transition hover:border-indigo-300 hover:bg-indigo-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-indigo-700 dark:hover:bg-indigo-950/20"
                  >
                    <span className="material-symbols-outlined text-[28px] text-neutral-500 transition group-hover:text-indigo-600 dark:text-neutral-400 dark:group-hover:text-indigo-400">{sec.icon}</span>
                    <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{sec.label}</span>
                    {count > 0 && <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300">{count}</span>}
                  </button>
                );
              })}
            </div>
          </Inner>
        </Card>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <Inner>
              <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">Records by Section</h3>
              {analytics.sectionData.length === 0 ? (
                <EmptyState icon="bar_chart" title="No section data yet" />
              ) : (
                <div className="space-y-2">
                  {analytics.sectionData.slice(0, 6).map((item) => {
                    const max = Math.max(...analytics.sectionData.map((s) => s.value), 1);
                    return (
                      <div key={item.name} className="flex items-center gap-3">
                        <span className="w-28 truncate text-xs text-neutral-500">{item.name}</span>
                        <div className="flex-1 rounded-full bg-neutral-100 dark:bg-neutral-800" style={{ height: 8 }}>
                          <div className="h-2 rounded-full bg-indigo-500" style={{ width: `${Math.round((item.value / max) * 100)}%` }} />
                        </div>
                        <span className="w-6 text-right text-xs font-bold text-neutral-700 dark:text-neutral-300">{item.value}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </Inner>
          </Card>

          <Card>
            <Inner>
              <h3 className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">Priority Distribution</h3>
              {analytics.priorityData.every((d) => d.value === 0) ? (
                <EmptyState icon="assessment" title="No priority data yet" />
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {analytics.priorityData.map((item) => {
                    const total = analytics.priorityData.reduce((s, d) => s + d.value, 0) || 1;
                    const pct = Math.round((item.value / total) * 100);
                    const colors = { Low: 'text-neutral-600 bg-neutral-100', Medium: 'text-blue-700 bg-blue-50', High: 'text-amber-700 bg-amber-50', Critical: 'text-rose-700 bg-rose-50' };
                    return (
                      <div key={item.name} className={`rounded-2xl p-4 ${colors[item.name] || 'bg-neutral-50 text-neutral-700'}`}>
                        <p className="text-xs font-semibold uppercase opacity-70">{item.name}</p>
                        <p className="mt-1 text-2xl font-bold">{item.value}</p>
                        <p className="text-xs opacity-60">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </Inner>
          </Card>
        </div>

        {/* Recent records table */}
        <Card>
          <Inner>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-neutral-900 dark:text-white">Recent Legal Records</h2>
              <span className="text-xs text-neutral-400">{analytics.recentRecords.length} items</span>
            </div>
            {analytics.recentRecords.length === 0 ? (
              <EmptyState icon="description" title="No records yet" subtitle="Records from all legal modules will appear here." />
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                  <thead className="bg-neutral-50 text-left dark:bg-neutral-900">
                    <tr>
                      {['Title', 'Section', 'Status', 'Priority', 'Due Date'].map((h) => (
                        <th key={h} className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {analytics.recentRecords.map((rec) => (
                      <tr key={rec._id || rec.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-neutral-900 dark:text-white">{rec.title || 'Untitled'}</p>
                          <p className="text-xs text-neutral-400">{rec.referenceNumber || ''}</p>
                        </td>
                        <td className="px-4 py-3 capitalize text-neutral-500">{rec.section || '—'}</td>
                        <td className="px-4 py-3"><Pill value={rec.status || 'draft'} /></td>
                        <td className="px-4 py-3"><Pill value={rec.priority || 'medium'} /></td>
                        <td className="px-4 py-3 text-xs text-neutral-500">{rec.dueDate ? new Date(rec.dueDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Inner>
        </Card>
      </div>
    );
  };

  const handleSaveRecord = async (payload, recordId) => {
    if (!token) return;
    setSaving(true);
    setError('');
    try {
      const requestPayload = { ...payload, projectId: selectedProjectId || payload.projectId };
      if (!requestPayload.projectId) {
        throw new Error('Please select a project before creating or updating records.');
      }
      const referenceFiles = Array.isArray(requestPayload.referenceFiles) ? requestPayload.referenceFiles : [];
      delete requestPayload.referenceFiles;

      if (referenceFiles.length > 0) {
        const uploadRes = await lawApi.uploadReferencePdfs(token, requestPayload.projectId, referenceFiles);
        const uploadedPdfs = uploadRes?.data || [];
        requestPayload.metadata = {
          ...(requestPayload.metadata || {}),
          referencePdfs: [
            ...((requestPayload.metadata?.referencePdfs && Array.isArray(requestPayload.metadata.referencePdfs))
              ? requestPayload.metadata.referencePdfs
              : []),
            ...uploadedPdfs,
          ],
        };
      }

      if (recordId) {
        await lawApi.updateRecord(token, recordId, requestPayload);
      } else {
        await lawApi.createRecord(token, requestPayload);
      }
      queryClient.invalidateQueries({ queryKey: ['law', 'records'] });
      queryClient.invalidateQueries({ queryKey: ['law', 'moduleData'] });
    } catch (err) {
      setError(err.message || 'Unable to save Law record.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRecord = async (recordId) => {
    if (!token || !recordId) return;
    setSaving(true);
    setError('');
    try {
      await lawApi.deleteRecord(token, recordId);
      queryClient.invalidateQueries({ queryKey: ['law', 'records'] });
      queryClient.invalidateQueries({ queryKey: ['law', 'moduleData'] });
    } catch (err) {
      setError(err.message || 'Unable to delete Law record.');
    } finally {
      setSaving(false);
    }
  };

  if (activeSection === 'dashboard') {
    return renderDashboard();
  }

  return (
    <>
      {ActivePage ? (
        <ActivePage records={records} onSectionChange={(section) => navigate(withProjectContext(sectionToPath(section)))} />
      ) : (
        <LawOpsPage
          sectionId={activeSection}
          searchTerm={searchTerm}
          error={error}
          subtitle={`${user?.role?.toUpperCase() || 'LAW'} view • ${sectionInfo.summary}`}
          records={sectionRecords}
          projects={projects}
          selectedProjectId={selectedProjectId}
          onProjectChange={(projectId) => {
            if (projectId) {
              try { localStorage.setItem('activeProjectId', String(projectId)); } catch {}
            }
            setSearchParams(projectId ? { projectId } : {});
          }}
          loading={agreementsLoading}
          lastUpdatedAt={lastUpdatedAt}
          saving={saving}
          onSearchChange={setSearchTerm}
          onSectionChange={(section) => navigate(withProjectContext(sectionToPath(section)))}
          onSaveRecord={handleSaveRecord}
          onDeleteRecord={handleDeleteRecord}
          onRefresh={loadLawData}
          forceOpenForm={isCreateMode}
        />
      )}
    </>
  );
};

export default LawDashboard;
