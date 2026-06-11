import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { lawApi } from '../../services/law';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import { LAW_SECTIONS, getLawSection } from './lawModuleConfig';
import LegalDocManagement from './LegalDocManagement';
import LSWLegalLibrary from './LSWLegalLibrary';
import LawOpsPage from './pages/LawOpsPage';

const pageComponents = {
  'legal-docs': LegalDocManagement,
  'legal-library': LSWLegalLibrary,
};
const AGREEMENTS_CACHE_KEY = 'law_agreements_cache_v1';
const CACHE_TTL = 5 * 60 * 1000;
const RECORDS_CACHE_TTL = 60 * 1000;
const LAW_STRICT_PROJECTS = ['EEC', 'EDIFIGHT8', 'EFMB', 'RMS', 'THE BETTER PASS'];
const LAW_PROJECT_FALLBACK_ORDER = ['EEC', 'EDIFIGHT8', 'EFMB', 'RMS', 'THE BETTER PASS'];
const CHART_COLORS = ['#22d3ee', '#38bdf8', '#10b981', '#f59e0b', '#a78bfa', '#ec4899', '#ef4444'];
const cardClass = 'rounded-3xl border border-neutral-200 bg-white p-5 shadow-sm';
const OPEN_STATUSES = new Set(['pending', 'in review', 'attention']);
const RESOLVED_STATUSES = new Set(['active', 'ready', 'archived']);

const formatDate = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
};

const normalizeLawStatus = (value = '') => String(value || '').trim().toLowerCase();
const normalizePriority = (value = '') => String(value || '').trim().toLowerCase();
const toCount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const isPastDue = (record) => {
  if (!record?.dueDate) return false;
  const due = new Date(record.dueDate);
  return !Number.isNaN(due.getTime()) && due.getTime() < Date.now();
};

const moduleToSection = (pathname = '') => {
  if (pathname.startsWith('/law/legal-docs')) return 'legal-docs';
  if (pathname.startsWith('/law/legal-library')) return 'legal-library';
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
  if (section === 'agreements') return '/law/agreements';
  if (section === 'privacy-policy') return '/law/policy';
  if (section === 'disputes-fraud') return '/law/disputes';
  if (section === 'ip-copyright') return '/law/ip';
  if (section === 'work-hire') return '/law/work-hire';
  if (section === 'third-party') return '/law/third-party';
  return '/law/dashboard';
};

const LawDashboard = () => {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('projectId') || '';
  const activeSection = moduleToSection(location.pathname);
  const isCreateMode = location.pathname.endsWith('/create');
  const [searchTerm, setSearchTerm] = useState('');
  const [apiSummary, setApiSummary] = useState(null);
  const [records, setRecords] = useState([]);
  const [projects, setProjects] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [agreementsLoading, setAgreementsLoading] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null);
  const agreementCache = useRef({});
  const recordsCache = useRef({});

  const readCache = (projectId) => {
    const row = agreementCache.current?.[projectId];
    if (!row) return null;
    if (Date.now() - row.timestamp > CACHE_TTL) return null;
    return row;
  };

  const writeCache = (projectId, data) => {
    agreementCache.current[projectId] = { data, timestamp: Date.now() };
    try {
      localStorage.setItem(AGREEMENTS_CACHE_KEY, JSON.stringify(agreementCache.current));
    } catch {
      // ignore storage failures
    }
  };

  const fetchAgreementsByProject = async (projectId) => {
    if (!projectId) return;
    const cached = readCache(projectId);
    if (cached) {
      setAgreementsLoading(false);
      setRecords(cached.data || []);
      setLastUpdatedAt(cached.timestamp);
      return;
    }

    setAgreementsLoading(true);
    const res = await lawApi.getProjectModuleData(token, 'agreements', projectId);
    const data = res?.data?.items || res?.data || [];
    writeCache(projectId, data);
    setRecords(data);
    setLastUpdatedAt(Date.now());
    setAgreementsLoading(false);
  };

  const buildRecordsCacheKey = () => `${activeSection}::${selectedProjectId || 'all'}`;

  const readRecordsCache = (key) => {
    const entry = recordsCache.current[key];
    if (!entry) return null;
    if (Date.now() - entry.timestamp > RECORDS_CACHE_TTL) return null;
    return entry;
  };

  const writeRecordsCache = (key, data) => {
    recordsCache.current[key] = { data, timestamp: Date.now() };
  };

  const loadLawData = async () => {
    if (!token) return;
    setError('');
    try {
      const projectsRes = await lawApi.getProjects(token, { limit: 100 });
      const projectItems = projectsRes?.data?.items || [];
      const strictProjects = LAW_STRICT_PROJECTS.map((name) => {
        const matched = projectItems.find(
          (p) => String(p?.name || '').trim().toLowerCase() === name.toLowerCase()
        );
        return matched || { _id: `virtual-${name}`, name };
      });
      setProjects(strictProjects);

      const fallbackProject = LAW_PROJECT_FALLBACK_ORDER.map((name) =>
        strictProjects.find((p) => String(p?.name || '').trim().toLowerCase() === name.toLowerCase())
      ).find(Boolean);
      const effectiveProjectId =
        selectedProjectId ||
        fallbackProject?._id ||
        fallbackProject?.id ||
        strictProjects[0]?._id ||
        strictProjects[0]?.id ||
        '';
      const hasRealProjectId = effectiveProjectId && !String(effectiveProjectId).startsWith('virtual-');
      if (activeSection !== 'dashboard' && effectiveProjectId && !selectedProjectId) {
        setSearchParams({ projectId: effectiveProjectId });
        try { localStorage.setItem('activeProjectId', String(effectiveProjectId)); } catch {}
      }

      const recordsCacheKey = buildRecordsCacheKey();
      const cached = readRecordsCache(recordsCacheKey);
      if (cached && activeSection !== 'agreements') {
        setRecords(cached.data || []);
        setLastUpdatedAt(cached.timestamp);
      }

      const recordsPromise = activeSection === 'agreements'
        ? Promise.resolve({ data: [] })
        : hasRealProjectId && activeSection !== 'dashboard'
          ? lawApi.getProjectModuleData(
              token,
              activeSection === 'privacy-policy' ? 'policy' : activeSection === 'disputes-fraud' ? 'disputes' : activeSection === 'ip-copyright' ? 'ip' : activeSection,
              effectiveProjectId
            )
          : lawApi.getRecords(token, activeSection !== 'dashboard' ? { section: activeSection, projectId: effectiveProjectId } : {});

      const contractsPromise = activeSection === 'dashboard' || !effectiveProjectId
        ? Promise.resolve({ data: { contracts: [] } })
        : hasRealProjectId ? lawApi.getContracts(token, { projectId: effectiveProjectId }) : Promise.resolve({ data: { contracts: [] } });
      const compliancePromise = activeSection === 'dashboard' || !effectiveProjectId
        ? Promise.resolve({ data: { compliance: [] } })
        : hasRealProjectId ? lawApi.getCompliance(token, { projectId: effectiveProjectId }) : Promise.resolve({ data: { compliance: [] } });

      const [dashboardRes, recordsRes, contractsRes, complianceRes] = await Promise.allSettled([
        lawApi.getDashboard(token),
        recordsPromise,
        contractsPromise,
        compliancePromise,
      ]);

      setApiSummary({
        message: dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data?.message || '' : '',
        permissions: dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data?.permissions || [] : [],
        totals: dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data?.totals || {} : {},
        bySection: dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data?.bySection || [] : [],
        byStatus: dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data?.byStatus || [] : [],
        recentRecords: dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data?.recentRecords || [] : [],
        contracts: contractsRes.status === 'fulfilled' ? contractsRes.value?.data?.contracts?.length || 0 : 0,
        compliance: complianceRes.status === 'fulfilled' ? complianceRes.value?.data?.compliance?.length || 0 : 0,
      });

      if (recordsRes.status === 'fulfilled') {
        const items = recordsRes.value?.data?.items || recordsRes.value?.data || [];
        setRecords(items);
        writeRecordsCache(recordsCacheKey, items);
        setLastUpdatedAt(Date.now());
      }
      const failed = [dashboardRes, recordsRes, contractsRes, complianceRes].find(
        (result) => result.status === 'rejected'
      );
      if (failed) {
        setError(failed.reason?.message || 'Some Law data could not be loaded.');
      }
    } catch (err) {
      setError(err.message || 'Failed to load Law module data.');
    }
  };

  useEffect(() => {
    try {
      const cached = localStorage.getItem(AGREEMENTS_CACHE_KEY);
      if (cached) agreementCache.current = JSON.parse(cached);
    } catch {
      agreementCache.current = {};
    }
  }, []);

  useEffect(() => {
    loadLawData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, activeSection, selectedProjectId]);

  useEffect(() => {
    if (!token || activeSection !== 'agreements' || !selectedProjectId || String(selectedProjectId).startsWith('virtual-')) return;
    try { localStorage.setItem('activeProjectId', String(selectedProjectId)); } catch {}
    fetchAgreementsByProject(selectedProjectId).catch((err) => {
      setAgreementsLoading(false);
      setError(err.message || 'Failed to load agreements.');
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const renderDashboard = () => {
    const dashboardCard = 'rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm';
    const topKPIs = [
      ['Total Records', analytics.totalRecords, 'description', 'blue', 'ALL'],
      ['Action Needed', analytics.needsAttention, 'warning', 'red', 'ATTN'],
      ['In Review', analytics.openPipeline, 'hourglass_top', 'orange', 'OPEN'],
      ['Resolved', analytics.activeResolved, 'verified', 'green', `${analytics.completionRate}%`],
    ];

    return (
      <main className="portal-page">
        <div className="portal-page-inner">
          <PortalHeader
            title="Law Analytics"
            subtitle="Executive legal platform overview"
            user={user}
            icon="gavel"
            showSearch={false}
            showNotifications
            showThemeToggle={false}
          >
            <div className="flex flex-wrap gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  const nextProjectId = e.target.value;
                  if (nextProjectId) {
                    try { localStorage.setItem('activeProjectId', String(nextProjectId)); } catch {}
                  }
                  setSearchParams(nextProjectId ? { projectId: nextProjectId } : {});
                }}
                className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-primary"
              >
                <option value="">All Projects</option>
                {projectOptions.map((project) => (
                  <option key={project.value} value={project.value}>
                    {project.label}
                  </option>
                ))}
              </select>
              <select
                value={activeSection}
                onChange={(e) => navigate(sectionToPath(e.target.value))}
                className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-primary"
              >
                {LAW_SECTIONS.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.navLabel}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={loadLawData}
                className="min-h-10 rounded-lg bg-white px-3 text-xs font-bold uppercase text-neutral-700 transition-colors hover:bg-neutral-100"
              >
                Refresh
              </button>
            </div>
          </PortalHeader>

          <section className="portal-kpi-grid mb-4">
            {topKPIs.map(([title, value, icon, color, subtitle]) => (
              <KPICard
                key={title}
                title={title}
                value={value}
                icon={icon}
                colorScheme={color}
                subtitle={subtitle}
                compact
                className="min-h-[150px]"
              />
            ))}
          </section>

          <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            <div className={dashboardCard}>
              <p className="text-xs font-bold uppercase text-neutral-500">Sections Tracked</p>
              <p className="mt-2 text-2xl font-black text-neutral-900">{analytics.sectionCount}</p>
            </div>
            <div className={dashboardCard}>
              <p className="text-xs font-bold uppercase text-neutral-500">Due Soon</p>
              <p className="mt-2 text-2xl font-black text-neutral-900">{analytics.dueSoon}</p>
            </div>
            <div className={dashboardCard}>
              <p className="text-xs font-bold uppercase text-neutral-500">Permissions</p>
              <p className="mt-2 text-2xl font-black text-neutral-900">{apiSummary?.permissions?.length || 0}</p>
            </div>
          </section>

          <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className={`${dashboardCard} lg:col-span-2 lg:p-5`}>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase text-primary">Executive Focus</p>
                  <h2 className="mt-1 text-xl font-black text-neutral-900 sm:text-2xl">Decision signals</h2>
                  <p className="mt-1 text-sm text-neutral-600">
                    Monitor legal records, priorities, due dates, and compliance posture from one analytics workspace.
                  </p>
                </div>
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Healthy
                </span>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  `Completion ${analytics.completionRate}%`,
                  `Risk ${analytics.riskRate}%`,
                  `Backlog ${analytics.backlogRate}%`,
                  `Open ${analytics.openPipeline}`,
                ].map((item) => (
                  <div key={item} className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3 text-[11px] font-semibold text-neutral-700">
                    {item}
                  </div>
                ))}
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-2">
                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Records by section</p>
                      <p className="text-xs text-neutral-500">Top legal modules</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={analytics.sectionData}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                        <YAxis stroke="#94a3b8" fontSize={12} allowDecimals={false} />
                        <Tooltip />
                        <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-neutral-900">Priority distribution</p>
                      <p className="text-xs text-neutral-500">Critical legal posture</p>
                    </div>
                  </div>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={analytics.priorityData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4}>
                          {analytics.priorityData.map((entry, index) => (
                            <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </div>

            <aside className={`${dashboardCard} lg:p-5`}>
              <h2 className="text-lg font-bold text-neutral-900">Executive Snapshot</h2>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                  <span className="text-sm text-neutral-600">Needs Attention</span>
                  <span className="text-sm font-bold text-neutral-900">{analytics.needsAttention}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                  <span className="text-sm text-neutral-600">Overdue</span>
                  <span className="text-sm font-bold text-neutral-900">{analytics.overdue}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                  <span className="text-sm text-neutral-600">Due Within 7 Days</span>
                  <span className="text-sm font-bold text-neutral-900">{analytics.dueSoon}</span>
                </div>
                <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                  <span className="text-sm text-neutral-600">Resolved Matters</span>
                  <span className="text-sm font-bold text-neutral-900">{analytics.activeResolved}</span>
                </div>
              </div>

              <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Permissions</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {apiSummary?.permissions?.length ? apiSummary.permissions.map((permission) => (
                    <span key={permission} className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-neutral-700">
                      {permission}
                    </span>
                  )) : (
                    <span className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-neutral-500">
                      No permission data
                    </span>
                  )}
                </div>
              </div>
            </aside>
          </section>

          <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
            <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm xl:col-span-7 lg:p-5">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-neutral-900">Recent Legal Records</h2>
                  <p className="text-sm text-neutral-600">Latest agreement, policy, dispute, IP, and compliance items.</p>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl border border-neutral-200">
                <table className="min-w-full divide-y divide-neutral-200 text-sm">
                  <thead className="bg-neutral-50 text-left text-xs uppercase tracking-[0.2em] text-neutral-500">
                    <tr>
                      <th className="px-4 py-3">Title</th>
                      <th className="px-4 py-3">Section</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Priority</th>
                      <th className="px-4 py-3">Due</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200">
                    {analytics.recentRecords.length ? analytics.recentRecords.map((record) => (
                      <tr key={record._id || record.id}>
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          <div>{record.title || 'Untitled record'}</div>
                          <div className="mt-1 text-xs text-neutral-500">{record.referenceNumber || 'No reference'}</div>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{record.section || 'Unknown'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-700">
                            {record.status || 'Draft'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{record.priority || 'Medium'}</td>
                        <td className="px-4 py-3 text-neutral-700">{formatDate(record.dueDate)}</td>
                      </tr>
                    )) : (
                      <tr>
                        <td className="px-4 py-8 text-center text-neutral-500" colSpan={5}>
                          No legal records available yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </article>

            <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm xl:col-span-5 lg:p-5">
              <h2 className="text-lg font-bold text-neutral-900">Workflow Controls</h2>
              <div className="mt-4 space-y-3">
                {[
                  ['Project Scoped', selectedProjectLabel],
                  ['Sections Tracked', analytics.sectionCount],
                  ['Due Soon', analytics.dueSoon],
                  ['Backlog', analytics.backlogRate ? `${analytics.backlogRate}%` : '0%'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                    <span className="text-sm text-neutral-600">{label}</span>
                    <span className="text-sm font-bold text-neutral-900">{value}</span>
                  </div>
                ))}
              </div>
              <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
                <p className="text-xs font-bold uppercase text-neutral-500">Status mix</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {analytics.statusData.map((item) => (
                    <span key={item.name} className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-neutral-700">
                      {item.name}: {item.value}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          </section>
        </div>
      </main>
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
        const res = await lawApi.updateRecord(token, recordId, requestPayload);
        setRecords((prev) => prev.map((record) => (record._id === recordId ? res.data : record)));
      } else {
        const res = await lawApi.createRecord(token, requestPayload);
        setRecords((prev) => [res.data, ...prev]);
      }
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
      setRecords((prev) => prev.filter((record) => record._id !== recordId));
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
        <ActivePage records={records} onSectionChange={(section) => navigate(sectionToPath(section))} />
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
          onSectionChange={(section) => navigate(sectionToPath(section))}
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
