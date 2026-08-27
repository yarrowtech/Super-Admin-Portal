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
import { PortalHeader, WarmGreeting, KPICard, StatusBadge, AttentionPanel, QuickActions } from '../common';
import { SectionCard, DataTable, CardSkeleton } from '../ui';
import { statusToTone } from '../../utils/statusTone';

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
// Priority values observed in Law records are low/medium/high/critical (see the
// analytics.priorityData buckets below) — these don't map cleanly onto the
// 5-tone status vocabulary, so they're graded by urgency instead.
const priorityToTone = (value) => {
  const priority = normalizePriority(value);
  if (priority === 'critical' || priority === 'high') return 'danger';
  if (priority === 'medium') return 'warning';
  return 'neutral';
};
const toCount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const formatRelativeTime = (timestamp) => {
  if (!timestamp) return '';
  const diffMs = Date.now() - timestamp;
  const diffMin = Math.round(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin} min ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hr ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay} day${diffDay > 1 ? 's' : ''} ago`;
};
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
const isDueSoon = (record, days = 7) => {
  if (!record?.dueDate) return false;
  const due = new Date(record.dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const diff = due.getTime() - Date.now();
  return diff > 0 && diff <= days * 24 * 60 * 60 * 1000;
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

// Legal Modules nav grid — shared by the grid itself and the dashboard's
// QuickActions (which shortcuts to whichever modules actually have records).
const LAW_DASHBOARD_SECTIONS = [
  { id: 'contracts',      label: 'Contracts',        icon: 'contract',       path: '/law/contracts' },
  { id: 'legal-docs',     label: 'Legal Documents',  icon: 'description',    path: '/law/legal-docs' },
  { id: 'agreements',     label: 'Agreements',       icon: 'handshake',      path: '/law/agreements' },
  { id: 'privacy-policy', label: 'Privacy & Policy', icon: 'policy',         path: '/law/policy' },
  { id: 'disputes-fraud', label: 'Disputes & Fraud', icon: 'balance',        path: '/law/disputes' },
  { id: 'ip-copyright',   label: 'IP & Copyright',   icon: 'copyright',      path: '/law/ip' },
  { id: 'work-hire',      label: 'Work on Hire',     icon: 'assignment_ind', path: '/law/work-hire' },
  { id: 'third-party',    label: 'Third Party',      icon: 'groups',         path: '/law/third-party' },
];
const sectionLabel = (id) => LAW_DASHBOARD_SECTIONS.find((s) => s.id === id)?.label || id || 'Unknown';

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
    const dueSoon = dashboardRecords.filter((record) => isDueSoon(record)).length;
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

  // AttentionPanel items, built from the same overdue/attention/due-soon
  // record sets `analytics` above already derives from `records` — reshaped
  // into the panel's {id,label,context,tone,statusLabel,action} contract,
  // one entry per real record (using its actual title), most urgent first.
  const attentionItems = useMemo(() => {
    if (activeSection !== 'dashboard') return [];
    const dashboardRecords = Array.isArray(records) ? records : [];
    const seen = new Set();
    const items = [];
    const addItem = (record, index, itemTone, statusLabel, context) => {
      const id = String(record._id || record.id || `${record.section}-${record.title}-${index}`);
      if (seen.has(id)) return;
      seen.add(id);
      items.push({
        id,
        label: record.title || 'Untitled record',
        context,
        tone: itemTone,
        statusLabel,
        actionLabel: 'View',
        onAction: () => navigate(withProjectContext(sectionToPath(record.section))),
      });
    };

    dashboardRecords
      .filter((record) => isPastDue(record) && !RESOLVED_STATUSES.has(normalizeLawStatus(record?.status)))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .forEach((record, index) => addItem(
        record, index, 'danger', 'Overdue',
        `Due ${formatDate(record.dueDate)} · ${sectionLabel(record.section)}`
      ));

    dashboardRecords
      .filter((record) => {
        const status = normalizeLawStatus(record?.status);
        const priority = normalizePriority(record?.priority);
        return status === 'attention' || priority === 'critical';
      })
      .forEach((record, index) => addItem(
        record, index, 'danger', 'Attention',
        `Flagged · ${sectionLabel(record.section)}`
      ));

    dashboardRecords
      .filter((record) => isDueSoon(record))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .forEach((record, index) => addItem(
        record, index, 'warning', 'Due Soon',
        `Due ${formatDate(record.dueDate)} · ${sectionLabel(record.section)}`
      ));

    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, records, navigate, selectedProjectId]);

  // Reuses the exact same section-tile navigation as the Legal Modules grid
  // below — shortcuts to whichever modules actually hold real records
  // (analytics.sectionData is already sorted highest-count-first), never an
  // invented "create" action since none is wired up anywhere in this file.
  const quickActions = useMemo(() => {
    if (activeSection !== 'dashboard') return [];
    return analytics.sectionData
      .map((item) => ({ ...item, meta: LAW_DASHBOARD_SECTIONS.find((sec) => sec.id === item.name) }))
      .filter((item) => item.meta && item.value > 0)
      .slice(0, 3)
      .map((item) => ({
        label: item.meta.label,
        icon: item.meta.icon,
        onClick: () => navigate(withProjectContext(item.meta.path)),
      }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection, analytics.sectionData, navigate, selectedProjectId]);

  // ─────────────────────────────────────────────────────────────────────────
  // Dashboard render
  // ─────────────────────────────────────────────────────────────────────────
  const renderDashboard = () => {
    const SECTIONS = LAW_DASHBOARD_SECTIONS;
    const loading = !apiSummary;
    const refreshing = dashboardQuery.isFetching || recordsQuery.isFetching;
    const lastUpdatedLabel = formatRelativeTime(dashboardQuery.dataUpdatedAt || recordsQuery.dataUpdatedAt);

    const recentRecordsColumns = [
      {
        key: 'title',
        header: 'Title',
        render: (rec) => (
          <div>
            <p className="font-semibold text-neutral-900 dark:text-white">{rec.title || 'Untitled'}</p>
            {rec.referenceNumber && <p className="text-xs text-neutral-400">{rec.referenceNumber}</p>}
          </div>
        ),
      },
      { key: 'section', header: 'Section', render: (rec) => <span className="text-neutral-500">{sectionLabel(rec.section)}</span> },
      { key: 'status', header: 'Status', render: (rec) => <StatusBadge tone={statusToTone(rec.status || 'draft')} label={rec.status || 'Draft'} /> },
      { key: 'priority', header: 'Priority', render: (rec) => <StatusBadge tone={priorityToTone(rec.priority)} label={rec.priority || 'Medium'} dot={false} /> },
      { key: 'dueDate', header: 'Due Date', render: (rec) => <span className="text-xs text-neutral-500">{formatDate(rec.dueDate)}</span> },
    ];

    return (
      <div className="space-y-5 p-4 md:p-6">
        <PortalHeader
          title="Law Portal"
          subtitle={`Legal operations & compliance${selectedProjectLabel !== 'All Projects' ? ` · ${selectedProjectLabel}` : ''}`}
          icon="balance"
          user={user}
          lastUpdated={lastUpdatedLabel || undefined}
          onRefresh={loadLawData}
          refreshing={refreshing}
        >
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
        </PortalHeader>

        <WarmGreeting user={user} message="Wishing you a focused and productive day ahead." />

        {error && (
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300">
            <span className="material-symbols-outlined text-[18px] text-amber-500">info</span>
            <span className="flex-1">Dashboard summary unavailable — showing cached data. <span className="opacity-60 text-xs">{error}</span></span>
            <button onClick={loadLawData} className="shrink-0 rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:bg-transparent dark:text-amber-300">Retry</button>
          </div>
        )}

        {/* KPI cards — the 4 business-critical headline metrics */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <KPICard
              title="Total Records"
              value={analytics.totalRecords}
              icon="description"
              tone="accent"
              priority="primary"
              context={`${analytics.sectionCount} legal modules tracked`}
            />
            <KPICard
              title="Needs Attention"
              value={analytics.needsAttention}
              icon="warning"
              tone="danger"
              priority="primary"
              context={`${analytics.riskRate}% of all records`}
              tooltip="Records with status 'Attention' or priority 'Critical'"
            />
            <KPICard
              title="Overdue"
              value={analytics.overdue}
              icon="hourglass_top"
              tone="danger"
              priority="primary"
              context="Past due date, unresolved"
            />
            <KPICard
              title="Resolved"
              value={analytics.activeResolved}
              icon="verified"
              tone="success"
              priority="primary"
              context={`${analytics.completionRate}% complete`}
            />
          </div>
        )}

        {/* Secondary stats row */}
        {loading ? (
          <CardSkeleton count={4} />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <KPICard title="In Review" value={analytics.openPipeline} icon="find_in_page" tone="info" priority="secondary" />
            <KPICard title="Due in 7 Days" value={analytics.dueSoon} icon="schedule" tone="warning" priority="secondary" />
            <KPICard title="Sections" value={analytics.sectionCount} icon="folder_open" tone="neutral" priority="secondary" />
            <KPICard title="Permissions" value={apiSummary?.permissions?.length || 0} icon="lock" tone="neutral" priority="secondary" />
          </div>
        )}

        {quickActions.length > 0 && <QuickActions actions={quickActions} />}

        <AttentionPanel
          title="Needs Attention"
          items={attentionItems}
          loading={loading}
          emptyTitle="Nothing needs attention"
          emptyDescription="No overdue, flagged, or soon-due legal records right now."
        />

        {/* Law sections navigation grid */}
        <SectionCard title="Legal Modules" icon="apps">
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
        </SectionCard>

        {/* Charts row */}
        <div className="grid gap-4 lg:grid-cols-2">
          <SectionCard
            title="Records by Section"
            icon="bar_chart"
            empty={analytics.sectionData.length === 0}
            emptyIcon="bar_chart"
            emptyTitle="No section data yet"
          >
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
          </SectionCard>

          <SectionCard
            title="Priority Distribution"
            icon="assessment"
            empty={analytics.priorityData.every((d) => d.value === 0)}
            emptyIcon="assessment"
            emptyTitle="No priority data yet"
          >
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
          </SectionCard>
        </div>

        {/* Recent records table */}
        <SectionCard
          title="Recent Legal Records"
          icon="description"
          description={`${analytics.recentRecords.length} item${analytics.recentRecords.length === 1 ? '' : 's'} across all legal modules`}
          noBodyPadding
          loading={loading}
          empty={analytics.recentRecords.length === 0}
          emptyIcon="description"
          emptyTitle="No records yet"
          emptyDescription="Records from all legal modules will appear here."
        >
          <DataTable
            columns={recentRecordsColumns}
            rows={analytics.recentRecords}
            rowKey={(rec) => rec._id || rec.id}
            onRowClick={(rec) => navigate(withProjectContext(sectionToPath(rec.section)))}
            emptyTitle="No records yet"
            emptyDescription="Records from all legal modules will appear here."
          />
        </SectionCard>
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
