import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import PortalHeader from '../common/PortalHeader';

const MEDIA_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'campaign' },
  { id: 'project-hub', label: 'Projects', icon: 'folder_copy' },
  { id: 'assets', label: 'Assets', icon: 'perm_media' },
  { id: 'brand', label: 'Brand', icon: 'palette' },
  { id: 'content', label: 'Content', icon: 'edit_note' },
  { id: 'design', label: 'Design', icon: 'draw' },
  { id: 'video', label: 'Video', icon: 'movie' },
  { id: 'social', label: 'Social', icon: 'chat_bubble' },
  { id: 'campaigns', label: 'Campaigns', icon: 'ads_click' },
  { id: 'advertisements', label: 'Ads', icon: 'credit_card' },
  { id: 'seo', label: 'SEO', icon: 'search' },
  { id: 'website', label: 'Website', icon: 'public' },
  { id: 'testimonials', label: 'Testimonials', icon: 'reviews' },
  { id: 'case-studies', label: 'Case Studies', icon: 'description' },
  { id: 'approvals', label: 'Approvals', icon: 'fact_check' },
  { id: 'reporting', label: 'Reporting', icon: 'bar_chart' },
  { id: 'audit', label: 'Audit Trail', icon: 'history' },
];

const MODULE_FOR_SECTION = {
  assets: 'asset',
  brand: 'brand',
  content: 'content',
  design: 'design',
  video: 'video',
  social: 'social',
  campaigns: 'campaign',
  advertisements: 'advertisement',
  seo: 'seo',
  website: 'website',
  testimonials: 'testimonial',
  'case-studies': 'case-study',
  approvals: 'approval',
  reporting: 'report',
  audit: 'report',
};

const META = {
  dashboard: ['Media Command Center', 'Executive overview of media production, campaigns, approvals, and delivery', 'campaign'],
  'project-hub': ['Project Hub', 'Dedicated workspace for shared projects and EFNBMMS workstreams', 'folder_copy'],
  assets: ['Digital Asset Management', 'Searchable, versioned asset vault', 'perm_media'],
  brand: ['Brand Management', 'Guidelines, templates, and compliance tracking', 'palette'],
  content: ['Content Studio', 'Blogs, copy, web content, and editorial workflow', 'edit_note'],
  design: ['Design Requests', 'Creative intake, assignment, revisions, and delivery', 'draw'],
  video: ['Video Production', 'Scripts, footage, edits, reviews, and publishing', 'movie'],
  social: ['Social Media', 'Calendar, scheduling, and performance', 'chat_bubble'],
  campaigns: ['Campaign Management', 'Planning, budgets, and KPI tracking', 'ads_click'],
  advertisements: ['Advertisement Management', 'CPC, CPM, CTR, and ROI', 'credit_card'],
  seo: ['SEO Management', 'Keywords, rankings, backlinks, and technical SEO', 'search'],
  website: ['Website Media', 'Publishing workflow and approval tracking', 'public'],
  testimonials: ['Testimonial Management', 'Client proof, ratings, and success stories', 'reviews'],
  'case-studies': ['Case Studies', 'Impact stories and approvals', 'description'],
  approvals: ['Approval Center', 'Multi-level approvals and revision control', 'fact_check'],
  reporting: ['Reporting Center', 'Exportable marketing and operational reports', 'bar_chart'],
  audit: ['Audit Trail', 'Immutable activity and compliance logging', 'history'],
};

const EDITABLE_SECTIONS = new Set(['assets', 'campaigns', 'content']);
const SECTION_ACTIONS = {
  assets: {
    label: 'Asset',
    create: 'Create asset',
    createFn: 'createMediaAsset',
    updateFn: 'updateMediaAsset',
    deleteFn: 'deleteMediaAsset',
    requestApprovalFn: 'requestMediaApproval',
  },
  campaigns: {
    label: 'Campaign',
    create: 'Create campaign',
    createFn: 'createMediaCampaign',
    updateFn: 'updateMediaAsset',
    deleteFn: 'deleteMediaAsset',
    requestApprovalFn: 'requestMediaApproval',
  },
  content: {
    label: 'Content',
    create: 'Create content',
    createFn: 'createMediaContent',
    updateFn: 'updateMediaAsset',
    deleteFn: 'deleteMediaAsset',
    requestApprovalFn: 'requestMediaApproval',
  },
};
const STATUS_OPTIONS = ['all', 'draft', 'pending', 'in review', 'approved', 'live', 'active', 'published', 'needs revision', 'rejected'];

const EXPORT_OPTIONS = ['PDF', 'Excel', 'CSV', 'PPT'];
const COLORS = ['#22d3ee', '#38bdf8', '#10b981', '#f59e0b', '#a78bfa', '#ec4899'];

const card = 'rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]';
const soft = 'rounded-[1.5rem] border border-slate-200 bg-[#fbfeff] p-4';
const glass = 'rounded-[1.75rem] border border-teal-200 bg-teal-50/80 p-5';
const tone = (status = '') => {
  const v = String(status).toLowerCase();
  if (v.includes('approved') || v.includes('live') || v.includes('published')) return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (v.includes('pending') || v.includes('review') || v.includes('draft')) return 'border-amber-300 bg-amber-50 text-amber-700';
  if (v.includes('reject') || v.includes('revision') || v.includes('hold')) return 'border-rose-300 bg-rose-50 text-rose-700';
  return 'border-teal-300 bg-teal-50 text-teal-700';
};
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num(value));
const bytes = (value) => {
  const n = num(value);
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};
const arr = (value) => (Array.isArray(value) ? value : []);
const pick = (...values) => values.find((value) => typeof value === 'string' && value.trim()) || '-';
const toInputValue = (value) => (value === undefined || value === null ? '' : String(value));

const MediaWorkspace = ({ activeSection, onSectionChange, selectedProjectId, onProjectChange }) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [content, setContent] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [reporting, setReporting] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectQuery, setProjectQuery] = useState('');
  const [projectVisibilityFilter, setProjectVisibilityFilter] = useState('all');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [editor, setEditor] = useState({ open: false, mode: 'create', section: 'assets', record: null });
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    status: 'Draft',
    priority: 'Medium',
    category: '',
    projectName: '',
    ownerName: '',
  });
  const effectiveProjectId = selectedProjectId !== undefined ? selectedProjectId : activeProjectId;
  const buildProjectOptions = (projectItems = []) =>
    projectItems
      .map((project) => {
        const value = String(project?._id || project?.id || '').trim();
        const code = String(project?.projectCode || project?.code || project?.name || '').trim();
        const name = String(project?.name || '').trim();
        const description = String(project?.description || '').trim();

        if (!value || !code) return null;

        return {
          code,
          name,
          description,
          status: String(project?.status || 'active').trim() || 'active',
          accessGranted: true,
          assigned: false,
          label: `${code}${name && name !== code ? ` - ${name}` : ''}`,
          value,
        };
      })
      .filter(Boolean);

  useEffect(() => {
    if (selectedProjectId !== undefined) {
      setActiveProjectId(String(selectedProjectId || ''));
      return;
    }

    try {
      const stored = localStorage.getItem('activeProjectId');
      if (stored && stored !== 'all' && !stored.startsWith('virtual-')) setActiveProjectId(stored);
      else setActiveProjectId('');
    } catch {
      setActiveProjectId('');
    }
  }, [selectedProjectId]);

  useEffect(() => {
    try {
      if (effectiveProjectId) localStorage.setItem('activeProjectId', String(effectiveProjectId));
      else localStorage.removeItem('activeProjectId');
    } catch {}
  }, [effectiveProjectId]);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const storedProjectId = selectedProjectId !== undefined ? String(selectedProjectId || '') : String(activeProjectId || '');
        const hasRealProjectId = Boolean(storedProjectId && !storedProjectId.startsWith('virtual-'));
        const projectsRes = await departmentApi.getMediaProjects(token, { limit: 200 });
        const projectItems = arr(projectsRes?.data?.items || projectsRes?.data?.data?.items);
        const projectList = buildProjectOptions(projectItems);
        const fallbackProject = projectList.find((project) => project.value) || null;
        const shouldAutoSelectProject =
          activeSection !== 'dashboard' &&
          activeSection !== 'project-hub' &&
          !hasRealProjectId &&
          Boolean(fallbackProject);
        const resolvedProjectId = hasRealProjectId
          ? storedProjectId
          : shouldAutoSelectProject
            ? fallbackProject.value
            : '';
        const projectParams = resolvedProjectId ? { projectId: resolvedProjectId } : {};
        const results = await Promise.allSettled([
          departmentApi.getMediaDashboard(token, projectParams),
          departmentApi.getMediaAssets(token, { ...projectParams, limit: 12 }),
          departmentApi.getMediaCampaigns(token, { ...projectParams, limit: 12 }),
          departmentApi.getMediaContent(token, { ...projectParams, limit: 12 }),
          departmentApi.getMediaBrandAssets(token, { ...projectParams, limit: 12 }),
          departmentApi.getMediaApprovals(token, { ...projectParams, limit: 12 }),
          departmentApi.getMediaReportingSummary(token, projectParams),
        ]);
        if (!alive) return;
        const [dash, ass, camp, cont, brand, appr, report] = results;
        setDashboard(dash.status === 'fulfilled' ? dash.value?.data || null : null);
        setProjects(projectList);
        setAssets(ass.status === 'fulfilled' ? arr(ass.value?.data?.items) : []);
        setCampaigns(camp.status === 'fulfilled' ? arr(camp.value?.data?.items) : []);
        setContent(cont.status === 'fulfilled' ? arr(cont.value?.data?.items) : []);
        setBrandAssets(brand.status === 'fulfilled' ? arr(brand.value?.data?.items) : []);
        setApprovals(appr.status === 'fulfilled' ? arr(appr.value?.data?.items) : []);
        setReporting(report.status === 'fulfilled' ? report.value?.data || null : null);
        setLastUpdated(Date.now());
        if (shouldAutoSelectProject && resolvedProjectId) {
          onProjectChange?.(resolvedProjectId);
        }
      } catch (e) {
        if (alive) setError(e.message || 'Failed to load Media Portal.');
      } finally {
        if (alive) setLoading(false);
      }
    };
    load();
    return () => {
      alive = false;
    };
  }, [token, activeSection, selectedProjectId, activeProjectId, onProjectChange, reloadTick]);

  const summary = useMemo(() => {
    const kpis = dashboard?.kpis || {};
    const recent = arr(dashboard?.charts?.recentItems);
    const moduleRows = arr(dashboard?.charts?.moduleBreakdown);
    const statusRows = arr(dashboard?.charts?.statusBreakdown);
    return {
      activeProjects: num(kpis.activeProjects ?? projects.length),
      runningCampaigns: num(kpis.runningCampaigns ?? campaigns.length),
      pendingApprovals: num(kpis.pendingApprovals ?? approvals.length),
      assetStorage: kpis.assetStorageUsageLabel || bytes(kpis.assetStorageUsage),
      adSpend: money(kpis.advertisementSpend),
      roi: typeof kpis.marketingRoi === 'number' ? `${kpis.marketingRoi.toFixed(1)}%` : `${kpis.marketingRoi || 0}%`,
      productivity: num(kpis.teamProductivity),
      socialReach: num(kpis.socialReach),
      socialEngagement: num(kpis.socialEngagement),
      published: num(kpis.contentProductionStatus?.published),
      inReview: num(kpis.contentProductionStatus?.inReview),
      deadlines: num(kpis.upcomingDeadlines),
      recent,
      moduleRows,
      statusRows,
      reportRows: arr(reporting?.auditRows),
    };
  }, [approvals.length, campaigns.length, dashboard, projects.length, reporting]);

  const projectOptions = useMemo(
    () => projects.filter((project) => project.value),
    [projects]
  );

  const moduleCount = (section) => {
    const key = MODULE_FOR_SECTION[section];
    if (!key) return 0;
    return num(summary.moduleRows.find((row) => String(row.name || row._id).toLowerCase() === key)?.value || 0);
  };

  const updateProject = (projectId) => {
    onProjectChange?.(projectId);
    if (selectedProjectId === undefined) {
      setActiveProjectId(projectId);
    }
  };

  const getSectionAction = (section) => SECTION_ACTIONS[section] || null;

  const buildDraftFromRecord = (record = {}, section = activeSection) => ({
    title: toInputValue(record.title || record.name || record.contentName || record.assetName),
    description: toInputValue(record.description || record.objective || record.summary || ''),
    status: toInputValue(record.status || record.state || 'Draft'),
    priority: toInputValue(record.priority || 'Medium'),
    category: toInputValue(record.category || record.type || ''),
    projectName: toInputValue(record.projectName || record.project?.name || ''),
    ownerName: toInputValue(record.ownerName || record.owner || record.author || record.assignedTo || ''),
    section,
  });

  const openEditor = (mode, section, record = null) => {
    setActionMessage('');
    setEditor({ open: true, mode, section, record });
    setDraft(buildDraftFromRecord(record || {}, section));
  };

  const closeEditor = () => {
    setEditor({ open: false, mode: 'create', section: activeSection, record: null });
    setDraft({
      title: '',
      description: '',
      status: 'Draft',
      priority: 'Medium',
      category: '',
      projectName: '',
      ownerName: '',
    });
  };

  const refreshData = () => setReloadTick((value) => value + 1);

  const resolveRecordId = (record) => String(record?._id || record?.id || '').trim();

  const getRecordStatus = (record) => String(record?.status || record?.state || record?.approvalStatus || '').trim().toLowerCase();

  const matchesSearch = (record) => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return true;
    const haystack = [
      record?.title,
      record?.name,
      record?.contentName,
      record?.assetName,
      record?.description,
      record?.objective,
      record?.summary,
      record?.status,
      record?.state,
      record?.approvalStatus,
      record?.projectName,
      record?.ownerName,
      record?.owner,
      record?.author,
      record?.assignedTo,
      record?.lead,
      record?.category,
      record?.moduleType,
      record?.section,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return haystack.includes(term);
  };

  const matchesStatusFilter = (record) => {
    if (statusFilter === 'all') return true;
    return getRecordStatus(record).includes(statusFilter.toLowerCase());
  };

  const filterRecords = (records = []) => records.filter((record) => matchesSearch(record) && matchesStatusFilter(record));

  const persistRecord = async (mode, section, recordId) => {
    const config = getSectionAction(section);
    if (!config) throw new Error('Unsupported editor section');
    if (mode === 'create' && !effectiveProjectId) throw new Error('Select a project before creating media records.');

    const payload = {
      title: draft.title.trim(),
      description: draft.description.trim(),
      status: draft.status.trim() || 'Draft',
      priority: draft.priority.trim() || 'Medium',
      category: draft.category.trim(),
      projectName: draft.projectName.trim(),
      ownerName: draft.ownerName.trim(),
      section: section === 'assets' ? 'asset' : section === 'campaigns' ? 'campaign' : 'content',
      moduleType: section === 'assets' ? 'asset' : section === 'campaigns' ? 'campaign' : 'content',
      projectId: effectiveProjectId || undefined,
    };

    setActionBusy(true);
    try {
      if (mode === 'edit') {
        await departmentApi[config.updateFn](token, recordId, payload);
        setActionMessage(`${config.label} updated.`);
      } else {
        await departmentApi[config.createFn](token, payload);
        setActionMessage(`${config.label} created.`);
      }
      closeEditor();
      refreshData();
    } catch (err) {
      setError(err.message || `Failed to save ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const deleteRecord = async (section, record) => {
    const config = getSectionAction(section);
    const id = resolveRecordId(record);
    if (!config || !id) return;
    const ok = window.confirm(`Delete this ${config.label.toLowerCase()}? This cannot be undone.`);
    if (!ok) return;

    setActionBusy(true);
    try {
      await departmentApi[config.deleteFn](token, id);
      setActionMessage(`${config.label} deleted.`);
      refreshData();
    } catch (err) {
      setError(err.message || `Failed to delete ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const requestApproval = async (section, record) => {
    const config = getSectionAction(section);
    const id = resolveRecordId(record);
    if (!config || !id) return;
    setActionBusy(true);
    try {
      await departmentApi[config.requestApprovalFn](token, id, {});
      setActionMessage(`${config.label} sent for approval.`);
      refreshData();
    } catch (err) {
      setError(err.message || `Failed to request approval for ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const decideApproval = async (workflowId, decision) => {
    if (!workflowId) return;
    setActionBusy(true);
    try {
      await departmentApi.decideMediaApproval(token, workflowId, { decision, remarks: '' });
      setActionMessage(`Approval ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      refreshData();
    } catch (err) {
      setError(err.message || 'Failed to update approval decision.');
    } finally {
      setActionBusy(false);
    }
  };

  const renderMetric = (label, value, icon, detail) => (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950">{value}</p>
        </div>
        <span className="material-symbols-outlined rounded-2xl border border-teal-200 bg-teal-100 p-3 text-2xl text-teal-700">
          {icon}
        </span>
      </div>
      {detail ? <p className="mt-3 text-sm text-slate-500">{detail}</p> : null}
    </article>
  );

  const empty = (title, message) => <div className={soft}><p className="text-sm font-semibold text-slate-950">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600">{message}</p></div>;
  const sectionMeta = META[activeSection] || META.dashboard;
  const activeSectionAction = getSectionAction(activeSection);

  const renderDashboard = () => (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-teal-200 bg-[linear-gradient(135deg,rgba(8,47,73,0.98),rgba(15,118,110,0.92))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(202,138,4,0.12),transparent_28%)]" />
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-teal-200/40 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-white">
                  Media Command Center
                </span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-teal-50">
                  Project-linked operations
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Media production, approvals, campaigns, and reporting in one executive view.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-teal-50/85 sm:text-lg">
                Use this workspace to manage every asset, content piece, campaign, and media request with the same project association and approval discipline used across the portal.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Last sync: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'pending'}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Projects: {summary.activeProjects}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Approvals: {summary.pendingApprovals}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Deadlines: {summary.deadlines}</span>
                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs text-teal-50">Storage: {summary.assetStorage}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:w-[460px]">
              {[
                ['Active Projects', summary.activeProjects, 'folder_open', 'from-cyan-400 to-sky-500'],
                ['Campaigns Running', summary.runningCampaigns, 'ads_click', 'from-emerald-400 to-teal-500'],
                ['Pending Approvals', summary.pendingApprovals, 'fact_check', 'from-amber-400 to-orange-500'],
                ['Team Productivity', `${summary.productivity}%`, 'groups', 'from-fuchsia-400 to-violet-500'],
                ['Advertisement Spend', summary.adSpend, 'payments', 'from-rose-400 to-pink-500'],
                ['Marketing ROI', summary.roi, 'insights', 'from-lime-400 to-emerald-500'],
              ].map(([label, value, icon, accent]) => (
                <article key={label} className="rounded-[1.4rem] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                  <div className={`inline-flex rounded-2xl bg-gradient-to-br ${accent} p-2 text-white shadow-lg`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>
                  <p className="mt-4 text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-teal-50/70">{label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <article className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">Operational mix</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Where the media organization is actually working</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXPORT_OPTIONS.map((option) => (
                    <button key={option} type="button" className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:border-teal-300 hover:bg-teal-50">
                      Export {option}
                    </button>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className={soft}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Workflow status</p>
                    <span className="text-xs text-neutral-400">records by stage</span>
                  </div>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={summary.statusRows}>
                        <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                        <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 16 }} />
                        <Bar dataKey="value" fill="#22d3ee" radius={[10, 10, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className={soft}>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Module split</p>
                    <span className="text-xs text-neutral-400">assets, content, approvals</span>
                  </div>
                  <div className="mt-3 h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={summary.moduleRows} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={3}>
                          {summary.moduleRows.map((entry, index) => (
                            <Cell key={entry.name || index} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: '#020617', border: '1px solid rgba(148,163,184,0.25)', borderRadius: 16 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </article>

            <article className={card}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Executive signals</p>
                  <h2 className="mt-2 text-2xl font-black text-white">What needs attention now</h2>
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-300">
                  Live feed
                </span>
              </div>

              <div className="mt-5 space-y-3">
                {[
                  ['Advertisement Spend', summary.adSpend, Math.min(summary.runningCampaigns * 12, 100)],
                  ['Marketing ROI', summary.roi, Math.min(Math.max(parseFloat(summary.roi) || 0, 0), 100)],
                  ['Social Reach', summary.socialReach.toLocaleString(), Math.min(summary.socialReach / 100000, 100)],
                  ['Social Engagement', summary.socialEngagement.toLocaleString(), Math.min(summary.socialEngagement / 5000, 100)],
                  ['Upcoming Deadlines', summary.deadlines, Math.min(summary.deadlines * 10, 100)],
                ].map(([label, value, pct]) => (
                  <div key={label} className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
                    <div className="flex items-center justify-between text-sm text-neutral-300">
                      <span>{label}</span>
                      <span className="font-semibold text-white">{value}</span>
                    </div>
                    <div className="mt-3 h-2 rounded-full bg-white/10">
                      <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-emerald-400" style={{ width: `${Math.max(8, Math.min(100, pct))}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {renderMetric('Assets', assets.length, 'image', 'Uploaded and versioned media items')}
        {renderMetric('Content', content.length, 'draft', 'Blogs, copy, newsletters, and web content')}
        {renderMetric('Brand Assets', brandAssets.length, 'brand_family', 'Guidelines, logos, and templates')}
        {renderMetric('Reports', arr(reporting?.recentItems).length, 'assessment', 'Recent reporting and audit outputs')}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <article className={card}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-white">Recent media activity</p>
              <p className="text-xs text-neutral-400">Latest assets, content, campaigns, and approvals</p>
            </div>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold text-neutral-300">
              Updated {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'pending'}
            </span>
          </div>
          <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-white/10">
            <table className="min-w-full divide-y divide-white/10 text-sm">
              <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-neutral-400">
                <tr><th className="px-4 py-3">Title</th><th className="px-4 py-3">Section</th><th className="px-4 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {summary.recent.length ? summary.recent.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-white">{item.title}</td>
                    <td className="px-4 py-3 text-neutral-300">{item.section}</td>
                    <td className="px-4 py-3"><span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span></td>
                  </tr>
                )) : <tr><td className="px-4 py-8 text-center text-neutral-400" colSpan={3}>No media records available yet.</td></tr>}
              </tbody>
            </table>
          </div>
        </article>

        <article className={glass}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">Account controls</p>
              <p className="text-xs text-neutral-400">Project context and operating mode</p>
            </div>
            <span className="material-symbols-outlined text-2xl text-cyan-300">tune</span>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3">
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Reach</p>
              <p className="mt-2 text-3xl font-black text-white">{summary.socialReach.toLocaleString()}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Engagement</p>
              <p className="mt-2 text-3xl font-black text-white">{summary.socialEngagement.toLocaleString()}</p>
            </div>
            <div className="rounded-[1.3rem] border border-white/10 bg-white/[0.04] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">Content review</p>
              <p className="mt-2 text-3xl font-black text-white">{summary.inReview}</p>
            </div>
          </div>
        </article>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          ['Project linked', summary.activeProjects, 'folder_copy'],
          ['Pending approvals', summary.pendingApprovals, 'fact_check'],
          ['Deadline pressure', summary.deadlines, 'schedule'],
        ].map(([label, value, icon]) => (
          <article key={label} className={glass}>
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">{label}</p>
              <span className="material-symbols-outlined text-cyan-300">{icon}</span>
            </div>
            <p className="mt-4 text-3xl font-black text-white">{value}</p>
          </article>
        ))}
      </div>
    </div>
  );

  const renderTable = (items, columns, emptyTitle, emptyMessage, options = {}) => {
    const rows = filterRecords(items);
    const actionsEnabled = Boolean(options.rowActions);

    return rows.length ? (
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-neutral-400">
            <tr>
              {columns.map((column) => <th key={column.label} className="px-4 py-3">{column.label}</th>)}
              {actionsEnabled ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {rows.map((item) => (
              <tr key={item._id || item.id || item.title}>
                {columns.map((column) => (
                  <td key={column.label} className="px-4 py-3 align-top text-neutral-200">
                    {column.render ? column.render(item) : pick(item?.[column.key], item?.metadata?.[column.key], '-')}
                  </td>
                ))}
                {actionsEnabled ? (
                  <td className="px-4 py-3 align-top text-neutral-200">
                    <div className="flex flex-wrap gap-2">
                      {options.rowActions(item)}
                    </div>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {empty(
          items.length ? 'No records match your filters' : emptyTitle,
          items.length ? 'Clear the search or status filter to restore the section rows.' : emptyMessage
        )}
        {empty('Workflow note', 'Every media record must link to project, department, client, team, campaign, and assigned employees.')}
      </div>
    );
  };

  const renderProjectHub = () => (
    <div className="space-y-3">
      <section className="overflow-hidden rounded-[28px] border border-neutral-200 bg-[radial-gradient(circle_at_top_left,_rgba(59,130,246,0.16),_transparent_34%),linear-gradient(135deg,_#ffffff_0%,_#f8fafc_60%,_#eef2ff_100%)] shadow-sm">
        <div className="flex flex-col gap-4 p-4 md:p-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-white/80 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 shadow-sm backdrop-blur">
              <span className="material-symbols-outlined text-[16px]">folder_copy</span>
              Project Hub
            </div>
            <h1 className="mt-3 text-2xl font-black tracking-tight text-neutral-950 md:text-3xl">
              Project workspaces
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-600">
              Shared projects, EFNBMMS workstreams, and linked media records.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-semibold text-neutral-700 shadow-sm ring-1 ring-neutral-200">
                {projects.length} projects
              </span>
              <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-200">
                {projects.filter((project) => project.accessGranted).length} open
              </span>
              <span className="rounded-full bg-rose-500/10 px-3 py-1.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-200">
                0 locked
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshData}
            className="inline-flex items-center gap-2 rounded-2xl border border-neutral-200 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-800 shadow-sm transition hover:-translate-y-0.5 hover:bg-neutral-50"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <article className={card}>
          <div className="absolute inset-x-0 top-0 h-1 bg-blue-500" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Total</p>
          <p className="mt-2 text-3xl font-black text-neutral-950">{projects.length}</p>
          <p className="mt-1 text-xs text-neutral-500">Linked projects</p>
        </article>
        <article className={card}>
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-500" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Assigned</p>
          <p className="mt-2 text-3xl font-black text-neutral-950">0</p>
          <p className="mt-1 text-xs text-neutral-500">Assigned to you</p>
        </article>
        <article className={card}>
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-400" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Accessible</p>
          <p className="mt-2 text-3xl font-black text-neutral-950">{projects.length}</p>
          <p className="mt-1 text-xs text-neutral-500">Ready now</p>
        </article>
        <article className={card}>
          <div className="absolute inset-x-0 top-0 h-1 bg-rose-500" />
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Blocked</p>
          <p className="mt-2 text-3xl font-black text-neutral-950">0</p>
          <p className="mt-1 text-xs text-neutral-500">No access</p>
        </article>
      </div>

      <article className="rounded-[28px] border border-neutral-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900">Filter</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto]">
            <label className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                type="search"
                value={projectQuery}
                onChange={(e) => setProjectQuery(e.target.value)}
                placeholder="Search"
                className="h-11 w-full rounded-2xl border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              />
            </label>
            <div className="inline-flex rounded-2xl border border-neutral-300 bg-white p-1 shadow-sm">
              {[
                { value: 'all', label: 'All', icon: 'apps' },
                { value: 'open', label: 'Open', icon: 'lock_open' },
                { value: 'locked', label: 'Locked', icon: 'lock' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setProjectVisibilityFilter(item.value)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    projectVisibilityFilter === item.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </article>

      {projects.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
          {projects
            .filter((project) => {
              const q = projectQuery.trim().toLowerCase();
              const matchesQuery =
                !q ||
                [project.code, project.name, project.description, project.status]
                  .filter(Boolean)
                  .some((value) => String(value).toLowerCase().includes(q));
              const locked = !project.accessGranted;
              const matchesVisibility =
                projectVisibilityFilter === 'all' ||
                (projectVisibilityFilter === 'open' && !locked) ||
                (projectVisibilityFilter === 'locked' && locked);
              return matchesQuery && matchesVisibility;
            })
            .map((project, index) => {
              const isLocked = !project.accessGranted;
              const accentClasses = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500'];
              const accent = accentClasses[index % accentClasses.length];

              return (
                <article key={project.code || project.value} className="rounded-[28px] border border-neutral-200 bg-white p-4 shadow-sm">
                  <div className={`h-1.5 w-full rounded-full ${accent}`} />
                  <div className="mt-4 flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-neutral-950">{project.code}</p>
                        <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-600">
                          {project.status || 'active'}
                        </span>
                      </div>
                      <p className="mt-1 line-clamp-2 text-sm text-neutral-500">{project.description || 'Project workspace'}</p>
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${isLocked ? 'bg-rose-500/10 text-rose-700 ring-1 ring-rose-200' : 'bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-200'}`}>
                      {isLocked ? 'Locked' : 'Accessible'}
                    </span>
                  </div>
                  <div className="mt-4 flex items-center justify-between rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-2.5">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Role</p>
                      <p className="mt-0.5 text-sm font-semibold text-neutral-950">{project.role || 'all'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Status</p>
                      <p className="mt-0.5 text-sm font-semibold text-neutral-950">{project.status || 'active'}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isLocked}
                    className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:-translate-y-0.5 hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-500"
                  >
                    <span className="material-symbols-outlined text-[18px]">{isLocked ? 'lock' : 'open_in_new'}</span>
                    {isLocked ? 'Locked' : `Open${project.code ? ` ${project.code}` : ''}`}
                  </button>
                </article>
              );
            })}
        </div>
      ) : empty('No projects found', 'The portal only exposes shared projects and EFNBMMS workstreams.')}
    </div>
  );

  const renderGeneric = (section) => {
    const meta = META[section] || META.dashboard;

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {renderMetric('Records', moduleCount(section), meta[2])}
          {renderMetric('Project Scope', summary.activeProjects, 'filter_alt')}
          {renderMetric('Approvals', summary.pendingApprovals, 'verified')}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {empty(meta[0], meta[1])}
          {empty('Workflow', 'Draft -> project link -> approval -> publish -> report -> archive. Keep version history and audit trail attached to every update.')}
        </div>
      </div>
    );
  };

  const renderRowActions = (section, item) => {
    const id = resolveRecordId(item);
    const config = getSectionAction(section);
    const workflowId = item?.approvalWorkflowId || item?.workflowId || item?.metadata?.approvalWorkflowId;
    const approvalState = getRecordStatus(item);

    return (
      <>
        {config ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => openEditor('edit', section, item)}
            className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-semibold text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-400/20 disabled:opacity-50"
          >
            Edit
          </button>
        ) : null}
        {config ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => requestApproval(section, item)}
            className="rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1.5 text-xs font-semibold text-amber-100 transition hover:border-amber-300/40 hover:bg-amber-400/20 disabled:opacity-50"
          >
            Request approval
          </button>
        ) : null}
        {config ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => deleteRecord(section, item)}
            className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/20 disabled:opacity-50"
          >
            Delete
          </button>
        ) : null}
        {workflowId && approvalState === 'pending' ? (
          <>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => decideApproval(workflowId, 'approve')}
              className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-400/20 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => decideApproval(workflowId, 'reject')}
              className="rounded-full border border-rose-400/20 bg-rose-400/10 px-3 py-1.5 text-xs font-semibold text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-400/20 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        ) : null}
        {!config && !workflowId ? <span className="text-xs text-neutral-500">No actions</span> : null}
        {workflowId && approvalState !== 'pending' ? (
          <span className="text-xs text-neutral-500">Workflow: {approvalState || 'n/a'}</span>
        ) : null}
        {!id ? <span className="text-xs text-neutral-500">No ID</span> : null}
      </>
    );
  };

  const renderSection = () => {
    if (activeSection === 'dashboard') return renderDashboard();
    if (activeSection === 'project-hub') return renderProjectHub();
    if (activeSection === 'assets') return renderTable(assets, [
      { key: 'title', label: 'Asset', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.category || item.moduleType || 'Asset'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'version', label: 'Version', render: (item) => item?.version?.current || 'v1.0' },
      { key: 'storageUsageBytes', label: 'Storage', render: (item) => bytes(item.storageUsageBytes || item.fileSizeBytes) },
    ], 'No assets uploaded yet', 'Upload images, logos, banners, PDFs, videos, or creative files to populate the DAM view.', {
      rowActions: (item) => renderRowActions('assets', item),
    });
    if (activeSection === 'campaigns') return renderTable(campaigns, [
      { key: 'title', label: 'Campaign', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.objective || item.description || 'Campaign objective'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'priority', label: 'Priority' },
    ], 'No campaigns found', 'Create campaign records linked to projects, budgets, teams, and KPI targets.', {
      rowActions: (item) => renderRowActions('campaigns', item),
    });
    if (activeSection === 'content') return renderTable(content, [
      { key: 'title', label: 'Content', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.description || 'Editorial item'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
    ], 'No content pieces found', 'Use the content studio to manage blogs, articles, landing pages, newsletters, and press releases.', {
      rowActions: (item) => renderRowActions('content', item),
    });
    if (activeSection === 'brand') return renderTable(brandAssets, [
      { key: 'title', label: 'Brand Asset', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.category || 'Brand guide'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'approvalStatus', label: 'Approval' },
    ], 'No brand assets found', 'Store brand guidelines, logo variations, typography rules, palette references, and templates.');
    if (activeSection === 'approvals') return renderTable(approvals, [
      { key: 'title', label: 'Request', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.description || 'Approval request'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
    ], 'No pending approvals', 'Approval flows will appear here once records are submitted from asset, content, campaign, and design modules.', {
      rowActions: (item) => renderRowActions('approvals', item),
    });
    if (activeSection === 'reporting') return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          {renderMetric('Reports', arr(reporting?.recentItems).length, 'assessment')}
          {renderMetric('Assets', assets.length, 'perm_media')}
          {renderMetric('Published', summary.published, 'publish')}
          {renderMetric('In Review', summary.inReview, 'pending')}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {empty('Export centre', 'Generate PDF, Excel, CSV, and PPT exports for marketing, campaign, social, content, and ROI reporting.')}
          {empty('Report cadence', 'Weekly, monthly, and growth reports should draw from the same project-linked records to keep executive reporting consistent.')}
        </div>
        {arr(reporting?.auditRows).length ? renderTable(reporting.auditRows, [
          { key: 'action', label: 'Action' },
          { key: 'targetType', label: 'Target' },
          { key: 'createdAt', label: 'Timestamp', render: (item) => (item.createdAt ? new Date(item.createdAt).toLocaleString() : '-') },
        ], 'No report data', 'Reporting data is unavailable.') : null}
      </div>
    );
    if (activeSection === 'audit') return renderTable(summary.reportRows, [
      { key: 'action', label: 'Action' },
      { key: 'module', label: 'Module' },
      { key: 'targetType', label: 'Target' },
      { key: 'createdAt', label: 'Timestamp', render: (item) => (item.createdAt ? new Date(item.createdAt).toLocaleString() : '-') },
    ], 'No audit trail entries found', 'Every create, edit, delete, approve, reject, publish, download, and share action should be captured here.');
    return renderGeneric(activeSection);
  };

  const renderEditorModal = () => {
    if (!editor.open || !activeSectionAction) return null;
    const title = editor.mode === 'edit' ? `Edit ${activeSectionAction.label}` : activeSectionAction.create;

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/70 px-4 py-8 backdrop-blur-sm">
        <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-[2rem] border border-white/10 bg-slate-950 p-6 shadow-[0_30px_120px_rgba(0,0,0,0.45)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">{title}</p>
              <h3 className="mt-2 text-2xl font-black text-white">{draft.title || `${activeSectionAction.label} record`}</h3>
              <p className="mt-2 text-sm text-neutral-400">
                Keep the record aligned to the real project, owner, and approval workflow.
              </p>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"
            >
              Close
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Title</span>
              <input
                value={draft.title}
                onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
                placeholder="Enter title"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Project</span>
              <input
                value={draft.projectName}
                onChange={(e) => setDraft((prev) => ({ ...prev, projectName: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
                placeholder="Project name"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Description</span>
              <textarea
                rows={4}
                value={draft.description}
                onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:border-cyan-400"
                placeholder="Describe the record"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Status</span>
              <input
                value={draft.status}
                onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
                placeholder="Draft, Pending, Live..."
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Priority</span>
              <select
                value={draft.priority}
                onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
              >
                {['Low', 'Medium', 'High', 'Critical'].map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Owner</span>
              <input
                value={draft.ownerName}
                onChange={(e) => setDraft((prev) => ({ ...prev, ownerName: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
                placeholder="Owner name"
              />
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Category</span>
              <input
                value={draft.category}
                onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
                placeholder="Category or type"
              />
            </label>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-neutral-400">
              {editor.mode === 'edit' ? 'Updating an existing media record.' : 'Creating a new media record.'}
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={closeEditor}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:bg-white/10"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy || !draft.title.trim()}
                onClick={() => persistRecord(editor.mode, editor.section, resolveRecordId(editor.record))}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-50 transition hover:border-cyan-300/40 hover:bg-cyan-400/20 disabled:opacity-50"
              >
                {actionBusy ? 'Saving...' : editor.mode === 'edit' ? 'Save changes' : 'Create record'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="portal-page bg-[linear-gradient(180deg,#f8fbfd_0%,#eef7f5_100%)]">
      <div className="mx-auto w-full max-w-[1720px] p-3 sm:p-4 lg:p-6 2xl:p-8">
        <PortalHeader
          title={sectionMeta[0]}
          subtitle={sectionMeta[1]}
          user={user}
          icon={sectionMeta[2]}
          showSearch={false}
          showNotifications
          showThemeToggle
        >
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={`Search ${activeSection === 'dashboard' ? 'media records' : activeSection}...`}
            className="h-10 w-[220px] rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-[var(--portal-accent)]"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-[var(--portal-accent)]"
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {option === 'all' ? 'All Statuses' : option}
              </option>
            ))}
          </select>
          {activeSectionAction ? (
            <button
              type="button"
              onClick={() => openEditor('create', activeSection)}
              disabled={actionBusy || !effectiveProjectId}
              className="h-10 rounded-xl border border-teal-200 bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
            >
              {activeSectionAction.create}
            </button>
          ) : null}
          <button
            type="button"
            onClick={refreshData}
            disabled={actionBusy}
            className="h-10 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
          >
            Refresh
          </button>
          {activeSection !== 'project-hub' ? (
            <div className="w-full max-w-[560px] rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
              <div className="mb-2 flex items-center justify-between px-1">
                <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Projects</p>
                <button
                  type="button"
                  onClick={() => updateProject('')}
                  className={`rounded-full px-2.5 py-1 text-[11px] font-semibold transition ${
                    !effectiveProjectId
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Projects
                </button>
              </div>
              <div className="grid max-h-[176px] grid-cols-1 gap-2 overflow-auto pr-1 sm:grid-cols-2">
                {projectOptions.map((project, index) => {
                  const isActive = effectiveProjectId === project.value;
                  const accentClasses = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-orange-500'];
                  const accent = accentClasses[index % accentClasses.length];
                  const isLocked = String(project.status || '').toLowerCase() !== 'active' && String(project.status || '').toLowerCase() !== 'open';

                  return (
                    <button
                      key={project.value || project.code}
                      type="button"
                      onClick={() => updateProject(project.value)}
                      className={`group rounded-2xl border p-3 text-left transition ${
                        isActive
                          ? 'border-teal-500 bg-teal-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`h-1.5 w-full rounded-full ${accent}`} />
                      <div className="mt-3 flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-black text-slate-950">{project.code}</p>
                            <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                              {project.status || 'active'}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                            {project.description || 'Project workspace'}
                          </p>
                        </div>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${isLocked ? 'bg-rose-500/10 text-rose-700' : 'bg-emerald-500/10 text-emerald-700'}`}>
                          {isLocked ? 'Locked' : 'Open'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}
          <select
            value={activeSection}
            onChange={(e) => onSectionChange?.(e.target.value)}
            className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-[var(--portal-accent)]"
          >
            {MEDIA_SECTIONS.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
          </select>
        </PortalHeader>

        <section className="mb-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
          {user?.role ? `Signed in as ${user.role}.` : 'Media portal ready.'} Every media record should be linked to project, department, client, team, campaign, and assigned employees.
        </section>

        {actionMessage ? (
          <section className="mb-4 rounded-3xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
            {actionMessage}
          </section>
        ) : null}

        {loading ? <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5" /> : error ? <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{error}</div> : renderSection()}
        {renderEditorModal()}
      </div>
    </main>
  );
};

export { MEDIA_SECTIONS };
export default MediaWorkspace;
