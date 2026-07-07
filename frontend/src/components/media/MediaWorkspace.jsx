import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { findCanonicalProject } from '../../config/projectNames';
import PortalHeader from '../common/PortalHeader';
import AdminProjectsPage from '../admin/AdminProjectsPage';
import CampaignLifecycleStepper from './CampaignLifecycleStepper';
import ApprovalHistoryTimeline from './ApprovalHistoryTimeline';
import CampaignTaskBoard from './CampaignTaskBoard';
import BudgetTracker from './BudgetTracker';
import KpiFunnelChart from './KpiFunnelChart';
import MarketingCalendar from './MarketingCalendar';
import WeeklyPlanner from './WeeklyPlanner';
import ProjectChecklists from './ProjectChecklists';
import MarketingReportPanel from './MarketingReportPanel';

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
  { id: 'tasks', label: 'Tasks', icon: 'checklist' },
  { id: 'budget', label: 'Budget', icon: 'payments' },
  { id: 'funnel', label: 'KPI & Funnel', icon: 'insights' },
  { id: 'calendar', label: 'Calendar', icon: 'calendar_month' },
  { id: 'weekly-planning', label: 'Weekly Planning', icon: 'event_note' },
  { id: 'checklists', label: 'Checklists', icon: 'checklist_rtl' },
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
  tasks: ['Campaign Tasks', 'Auto-generated task board across all campaigns', 'checklist'],
  budget: ['Budget Logic', 'Total budget, allocations, expenses, ROI, ROAS, and cost per lead', 'payments'],
  funnel: ['KPI & Marketing Funnel', 'Traffic-to-revenue KPIs and the awareness-to-referral funnel', 'insights'],
  calendar: ['Marketing Calendar', 'Every campaign, task, publish, and approval date in one view', 'calendar_month'],
  'weekly-planning': ['Weekly Planning', 'Objectives, owners, deadlines, and progress for the current week', 'event_note'],
  checklists: ['Project Checklists', 'Website, SEO, CRM, Ads, Email, WhatsApp, and reporting readiness', 'checklist_rtl'],
  advertisements: ['Advertisement Management', 'CPC, CPM, CTR, and ROI', 'credit_card'],
  seo: ['SEO Management', 'Keywords, rankings, backlinks, and technical SEO', 'search'],
  website: ['Website Media', 'Publishing workflow and approval tracking', 'public'],
  testimonials: ['Testimonial Management', 'Client proof, ratings, and success stories', 'reviews'],
  'case-studies': ['Case Studies', 'Impact stories and approvals', 'description'],
  approvals: ['Approval Center', 'Multi-level approvals and revision control', 'fact_check'],
  reporting: ['Reporting Center', 'Exportable marketing and operational reports', 'bar_chart'],
  audit: ['Audit Trail', 'Immutable activity and compliance logging', 'history'],
};

const EDITABLE_SECTIONS = new Set(['assets', 'content', 'brand', 'design', 'video', 'social']);
const SECTION_ACTIONS = {
  assets: {
    label: 'Asset',
    create: 'Create asset',
    createFn: 'createMediaAsset',
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
    requestApprovalFn: 'requestMediaContentApproval',
  },
  brand: {
    label: 'Brand Asset',
    create: 'Create brand asset',
    createFn: 'createMediaBrandAsset',
    updateFn: 'updateMediaBrandAsset',
    deleteFn: 'deleteMediaBrandAsset',
    requestApprovalFn: 'requestMediaBrandApproval',
  },
  design: {
    label: 'Design Item',
    create: 'Create design item',
    createFn: 'createMediaDesignItem',
    updateFn: 'updateMediaDesignItem',
    deleteFn: 'deleteMediaDesignItem',
    requestApprovalFn: 'requestMediaDesignApproval',
  },
  video: {
    label: 'Video Item',
    create: 'Create video item',
    createFn: 'createMediaVideoItem',
    updateFn: 'updateMediaVideoItem',
    deleteFn: 'deleteMediaVideoItem',
    requestApprovalFn: 'requestMediaVideoApproval',
  },
  social: {
    label: 'Social Post',
    create: 'Create social post',
    createFn: 'createMediaSocialPost',
    updateFn: 'updateMediaSocialPost',
    deleteFn: 'deleteMediaSocialPost',
    requestApprovalFn: 'requestMediaSocialApproval',
  },
};
const STATUS_OPTIONS = ['all', 'draft', 'pending', 'in review', 'approved', 'live', 'active', 'published', 'needs revision', 'rejected'];

const EXPORT_OPTIONS = ['PDF', 'Excel', 'CSV', 'PPT'];
const COLORS = ['#22d3ee', '#38bdf8', '#10b981', '#f59e0b', '#a78bfa', '#ec4899'];

const card = 'rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] dark:border-neutral-800 dark:bg-neutral-900';
const soft = 'rounded-[1.5rem] border border-slate-200 bg-[#fbfeff] p-4 dark:border-neutral-800 dark:bg-neutral-900/60';
const glass = 'rounded-[1.75rem] border border-teal-200 bg-teal-50/80 p-5 dark:border-teal-900/60 dark:bg-teal-500/10';
const tone = (status = '') => {
  const v = String(status).toLowerCase();
  if (v.includes('approved') || v.includes('live') || v.includes('published')) return 'border-emerald-300 bg-emerald-50 text-emerald-700';
  if (v.includes('pending') || v.includes('review') || v.includes('draft')) return 'border-amber-300 bg-amber-50 text-amber-700';
  if (v.includes('reject') || v.includes('revision') || v.includes('hold')) return 'border-rose-300 bg-rose-50 text-rose-700';
  return 'border-teal-300 bg-teal-50 text-teal-700';
};
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const money = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(num(value));
const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'pending';
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
  const [campaignTasks, setCampaignTasks] = useState([]);
  const [content, setContent] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [designItems, setDesignItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [approvals, setApprovals] = useState([]);
  const [reporting, setReporting] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [reloadTick, setReloadTick] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionBusy, setActionBusy] = useState(false);
  const [actionMessage, setActionMessage] = useState('');
  const [campaignFormOpen, setCampaignFormOpen] = useState(false);
  const [campaignForm, setCampaignForm] = useState({ name: '', objective: '', platform: '', budgetAllocated: '' });
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
        const canonicalProject = findCanonicalProject(project);
        if (!canonicalProject) return null;

        const value = String(project?._id || project?.id || '').trim();
        const code = canonicalProject.code;
        const name = canonicalProject.name;
        const description = canonicalProject.description;

        if (!value) return null;

        return {
          code,
          name,
          description,
          status: String(project?.status || 'active').trim() || 'active',
          accessGranted: true,
          assigned: false,
          label: name,
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
          departmentApi.getMediaCampaignTasks(token, projectParams),
          departmentApi.getMediaDesignItems(token, { ...projectParams, limit: 12 }),
          departmentApi.getMediaVideoItems(token, { ...projectParams, limit: 12 }),
          departmentApi.getMediaSocialPosts(token, { ...projectParams, limit: 12 }),
        ]);
        if (!alive) return;
        const [dash, ass, camp, cont, brand, appr, report, campTasks, design, video, social] = results;
        setDashboard(dash.status === 'fulfilled' ? dash.value?.data || null : null);
        setProjects(projectList);
        setAssets(ass.status === 'fulfilled' ? arr(ass.value?.data?.items) : []);
        setCampaigns(camp.status === 'fulfilled' ? arr(camp.value?.data?.items) : []);
        setContent(cont.status === 'fulfilled' ? arr(cont.value?.data?.items) : []);
        setBrandAssets(brand.status === 'fulfilled' ? arr(brand.value?.data?.items) : []);
        setApprovals(appr.status === 'fulfilled' ? arr(appr.value?.data?.items) : []);
        setReporting(report.status === 'fulfilled' ? report.value?.data || null : null);
        setCampaignTasks(campTasks.status === 'fulfilled' ? arr(campTasks.value?.data?.items) : []);
        setDesignItems(design.status === 'fulfilled' ? arr(design.value?.data?.items) : []);
        setVideoItems(video.status === 'fulfilled' ? arr(video.value?.data?.items) : []);
        setSocialPosts(social.status === 'fulfilled' ? arr(social.value?.data?.items) : []);
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
  const selectedProjectLabel = projectOptions.find((item) => item.value === effectiveProjectId)?.code || 'All Projects';
  const lastSyncLabel = formatTime(lastUpdated);

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
    tags: toInputValue(arr(record.tags).join(', ')),
    projectName: toInputValue(record.projectName || record.project?.name || ''),
    ownerName: toInputValue(record.ownerName || record.owner || record.author || record.assignedTo || ''),
    storageUrl: toInputValue(record.storageUrl),
    storageKey: toInputValue(record.storageKey),
    storageProvider: toInputValue(record.storageProvider),
    thumbnailUrl: toInputValue(record.thumbnailUrl),
    mimeType: toInputValue(record.mimeType),
    fileSizeBytes: record.fileSizeBytes || 0,
    file: null,
    section,
  });

  const openEditor = (mode, section, record = null) => {
    setActionMessage('');
    setEditor({ open: true, mode, section, record });
    setDraft(buildDraftFromRecord(record || {}, section));
  };

  const closeEditor = () => {
    setEditor({ open: false, mode: 'create', section: activeSection, record: null });
    setDraft(buildDraftFromRecord({}, activeSection));
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
      ...arr(record?.tags),
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

  const sectionStateSetter = (section) => {
    switch (section) {
      case 'assets': return setAssets;
      case 'content': return setContent;
      case 'brand': return setBrandAssets;
      case 'design': return setDesignItems;
      case 'video': return setVideoItems;
      case 'social': return setSocialPosts;
      default: return null;
    }
  };

  const upsertLocalRecord = (section, record) => {
    const setter = sectionStateSetter(section);
    if (!setter || !record) return;
    const id = resolveRecordId(record);
    setter((prev) => {
      const exists = prev.some((item) => resolveRecordId(item) === id);
      return exists ? prev.map((item) => (resolveRecordId(item) === id ? record : item)) : [record, ...prev];
    });
  };

  const removeLocalRecord = (section, id) => {
    const setter = sectionStateSetter(section);
    if (!setter || !id) return;
    setter((prev) => prev.filter((item) => resolveRecordId(item) !== id));
  };

  const patchLocalRecord = (section, id, patch) => {
    const setter = sectionStateSetter(section);
    if (!setter || !id) return;
    setter((prev) => prev.map((item) => (resolveRecordId(item) === id ? { ...item, ...patch } : item)));
  };

  const persistRecord = async (mode, section, recordId) => {
    const config = getSectionAction(section);
    if (!config) throw new Error('Unsupported editor section');
    if (mode === 'create' && !effectiveProjectId) throw new Error('Select a project before creating media records.');

    const moduleType = MODULE_FOR_SECTION[section] || section;

    setActionBusy(true);
    try {
      let fileFields = {
        storageUrl: draft.storageUrl,
        storageKey: draft.storageKey,
        storageProvider: draft.storageProvider,
        thumbnailUrl: draft.thumbnailUrl,
        mimeType: draft.mimeType,
        fileSizeBytes: draft.fileSizeBytes,
      };

      if (draft.file) {
        const uploadRes = await departmentApi.uploadMediaFile(token, draft.file, {
          section: moduleType,
          projectId: effectiveProjectId,
        });
        const uploaded = uploadRes?.data || {};
        fileFields = {
          storageUrl: uploaded.url || '',
          storageKey: uploaded.storageKey || '',
          storageProvider: uploaded.storageProvider || 'cloudinary',
          thumbnailUrl: uploaded.thumbnailUrl || '',
          mimeType: uploaded.mimeType || '',
          fileSizeBytes: uploaded.fileSizeBytes || 0,
        };
      }

      const payload = {
        title: draft.title.trim(),
        description: draft.description.trim(),
        status: draft.status.trim() || 'Draft',
        priority: draft.priority.trim() || 'Medium',
        category: draft.category.trim(),
        tags: draft.tags.split(',').map((tag) => tag.trim()).filter(Boolean),
        projectName: draft.projectName.trim(),
        ownerName: draft.ownerName.trim(),
        section: moduleType,
        moduleType,
        projectId: effectiveProjectId || undefined,
        ...fileFields,
      };

      let saved;
      if (mode === 'edit') {
        const res = await departmentApi[config.updateFn](token, recordId, payload);
        saved = res?.data;
        setActionMessage(`${config.label} updated.`);
      } else {
        const res = await departmentApi[config.createFn](token, payload);
        saved = res?.data;
        setActionMessage(`${config.label} created.`);
      }
      upsertLocalRecord(section, saved);
      closeEditor();
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
      removeLocalRecord(section, id);
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
      patchLocalRecord(section, id, { approvalStatus: 'pending', status: 'In Review' });
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
      const nextStatus = decision === 'approve' ? 'Approved' : 'Needs Revision';
      const patch = { approvalStatus: decision === 'approve' ? 'approved' : 'rejected', status: nextStatus };
      const matchesWorkflow = (item) => item?.approvalWorkflowId === workflowId || item?.workflowId === workflowId;
      [setAssets, setContent, setBrandAssets, setDesignItems, setVideoItems, setSocialPosts, setApprovals].forEach((setter) => {
        setter((prev) => prev.map((item) => (matchesWorkflow(item) ? { ...item, ...patch } : item)));
      });
    } catch (err) {
      setError(err.message || 'Failed to update approval decision.');
    } finally {
      setActionBusy(false);
    }
  };

  const createCampaignRecord = async (event) => {
    event.preventDefault();
    if (!effectiveProjectId) {
      setError('Select a project before creating a campaign.');
      return;
    }
    setActionBusy(true);
    try {
      const res = await departmentApi.createMediaCampaign(token, {
        projectId: effectiveProjectId,
        name: campaignForm.name.trim(),
        objective: campaignForm.objective.trim(),
        platform: campaignForm.platform.split(',').map((item) => item.trim()).filter(Boolean),
        budgetAllocated: Number(campaignForm.budgetAllocated) || 0,
      });
      if (res?.data) setCampaigns((prev) => [res.data, ...prev]);
      setActionMessage('Campaign created.');
      setCampaignForm({ name: '', objective: '', platform: '', budgetAllocated: '' });
      setCampaignFormOpen(false);
    } catch (err) {
      setError(err.message || 'Failed to create campaign.');
    } finally {
      setActionBusy(false);
    }
  };

  const advanceCampaignStage = async (campaignId, nextStage) => {
    setActionBusy(true);
    try {
      const res = await departmentApi.advanceMediaCampaignStage(token, campaignId, nextStage);
      if (res?.data) {
        setCampaigns((prev) => prev.map((item) => (String(item._id) === String(campaignId) ? res.data : item)));
      }
      setActionMessage(`Campaign moved to ${nextStage.replace(/-/g, ' ')}.`);
    } catch (err) {
      setError(err.message || 'Failed to update campaign stage.');
    } finally {
      setActionBusy(false);
    }
  };

  const deleteCampaignRecord = async (campaignId) => {
    const ok = window.confirm('Delete this campaign? This cannot be undone.');
    if (!ok) return;
    setActionBusy(true);
    try {
      await departmentApi.deleteMediaCampaign(token, campaignId);
      setActionMessage('Campaign deleted.');
      setCampaigns((prev) => prev.filter((item) => String(item._id) !== String(campaignId)));
    } catch (err) {
      setError(err.message || 'Failed to delete campaign.');
    } finally {
      setActionBusy(false);
    }
  };

  const renderCampaigns = () => {
    const rows = filterRecords(campaigns);
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-neutral-500 dark:text-neutral-400">{rows.length} campaign{rows.length === 1 ? '' : 's'}</p>
          <button
            type="button"
            onClick={() => setCampaignFormOpen((value) => !value)}
            className="rounded-full border border-blue-200 bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            {campaignFormOpen ? 'Cancel' : 'New Campaign'}
          </button>
        </div>

        {campaignFormOpen ? (
          <form onSubmit={createCampaignRecord} className={`${card} grid grid-cols-1 gap-3 md:grid-cols-4`}>
            <input required value={campaignForm.name} onChange={(e) => setCampaignForm((f) => ({ ...f, name: e.target.value }))} placeholder="Campaign name" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 md:col-span-2" />
            <input value={campaignForm.platform} onChange={(e) => setCampaignForm((f) => ({ ...f, platform: e.target.value }))} placeholder="Platforms (comma separated)" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 md:col-span-2" />
            <textarea value={campaignForm.objective} onChange={(e) => setCampaignForm((f) => ({ ...f, objective: e.target.value }))} placeholder="Objective" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500 md:col-span-3" rows={2} />
            <input type="number" min="0" value={campaignForm.budgetAllocated} onChange={(e) => setCampaignForm((f) => ({ ...f, budgetAllocated: e.target.value }))} placeholder="Budget" className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100 dark:placeholder:text-neutral-500" />
            <button type="submit" disabled={actionBusy} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-4">
              Create campaign
            </button>
          </form>
        ) : null}

        {rows.length ? (
          <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
            {rows.map((campaign) => (
              <article key={campaign._id} className={card}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-lg font-bold text-neutral-950 dark:text-neutral-100">{campaign.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-neutral-400">{campaign.objective || 'No objective set'}</p>
                  </div>
                  <button type="button" onClick={() => deleteCampaignRecord(campaign._id)} className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20">
                    Delete
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2 text-xs text-neutral-500 dark:text-neutral-400">
                  {(campaign.platform || []).map((p) => (
                    <span key={p} className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 dark:border-neutral-700 dark:bg-neutral-800">{p}</span>
                  ))}
                  <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 dark:border-neutral-700 dark:bg-neutral-800">Budget: {money(campaign.budgetAllocated)}</span>
                </div>
                <div className="mt-4">
                  <CampaignLifecycleStepper
                    status={campaign.status}
                    busy={actionBusy}
                    onAdvance={(nextStage) => advanceCampaignStage(campaign._id, nextStage)}
                  />
                </div>
              </article>
            ))}
          </div>
        ) : empty('No campaigns found', 'Create a campaign to start the objective, platform, budget, team, and content pipeline.')}
      </div>
    );
  };

  const moveCampaignTask = async (task, nextStatus) => {
    setActionBusy(true);
    try {
      const res = await departmentApi.updateMediaCampaignTaskStatus(token, task.campaignId, task._id, nextStatus);
      const saved = res?.data;
      setCampaignTasks((prev) => prev.map((item) => (String(item._id) === String(task._id) ? (saved || { ...item, status: nextStatus }) : item)));
      setActionMessage(`Task moved to ${nextStatus.replace(/-/g, ' ')}.`);
    } catch (err) {
      setError(err.message || 'Failed to update task status.');
    } finally {
      setActionBusy(false);
    }
  };

  const renderCampaignTasks = () => (
    <div className="space-y-4">
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Tasks are generated automatically once a campaign moves into content production. {campaignTasks.length} task{campaignTasks.length === 1 ? '' : 's'} across all campaigns.
      </p>
      {campaignTasks.length ? (
        <CampaignTaskBoard tasks={campaignTasks} busy={actionBusy} onMove={moveCampaignTask} />
      ) : empty('No campaign tasks yet', 'Advance a campaign to "Content in progress" to auto-generate its Design/Write/Reel/Review/Approval/Publish tasks.')}
    </div>
  );

  const renderMetric = (label, value, icon, detail) => (
    <article className="rounded-[1.5rem] border border-slate-200 bg-white p-4 transition-colors hover:border-teal-300 hover:bg-teal-50/40 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-teal-800 dark:hover:bg-teal-500/10">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500 dark:text-neutral-400">{label}</p>
          <p className="mt-2 text-3xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
        </div>
        <span className="material-symbols-outlined rounded-2xl border border-teal-200 bg-teal-100 p-3 text-2xl text-teal-700 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300">
          {icon}
        </span>
      </div>
      {detail ? <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">{detail}</p> : null}
    </article>
  );

  const empty = (title, message) => <div className={soft}><p className="text-sm font-semibold text-slate-950 dark:text-neutral-100">{title}</p><p className="mt-2 text-sm leading-6 text-slate-600 dark:text-neutral-400">{message}</p></div>;
  const renderFileCell = (item) =>
    item?.storageUrl ? (
      <div className="flex items-center gap-2">
        {item.thumbnailUrl ? (
          <img src={item.thumbnailUrl} alt="" className="h-8 w-8 rounded-lg border border-slate-200 object-cover dark:border-neutral-700" />
        ) : (
          <span className="material-symbols-outlined text-base text-neutral-400">
            {String(item.mimeType || '').startsWith('video/') ? 'movie' : 'description'}
          </span>
        )}
        <a
          href={item.storageUrl}
          target="_blank"
          rel="noreferrer"
          className="text-xs font-semibold text-teal-700 hover:underline dark:text-teal-300"
        >
          View file{item.fileSizeBytes ? ` (${bytes(item.fileSizeBytes)})` : ''}
        </a>
      </div>
    ) : (
      <span className="text-xs text-neutral-400 dark:text-neutral-500">No file</span>
    );
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
      <div className="overflow-hidden rounded-3xl border border-slate-200 dark:border-neutral-800">
        <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-neutral-800">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-[0.2em] text-neutral-500 dark:bg-neutral-900 dark:text-neutral-400">
            <tr>
              {columns.map((column) => <th key={column.label} className="px-4 py-3">{column.label}</th>)}
              {actionsEnabled ? <th className="px-4 py-3">Actions</th> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white dark:divide-neutral-800 dark:bg-neutral-900">
            {rows.map((item) => (
              <tr key={item._id || item.id || item.title}>
                {columns.map((column) => (
                  <td key={column.label} className="px-4 py-3 align-top text-neutral-700 dark:text-neutral-300">
                    {column.render ? column.render(item) : pick(item?.[column.key], item?.metadata?.[column.key], '-')}
                  </td>
                ))}
                {actionsEnabled ? (
                  <td className="px-4 py-3 align-top text-neutral-700 dark:text-neutral-300">
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

  const renderProjectHub = () => <AdminProjectsPage />;

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
            className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition hover:border-blue-300 hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
          >
            Edit
          </button>
        ) : null}
        {config ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => requestApproval(section, item)}
            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 transition hover:border-amber-300 hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20"
          >
            Request approval
          </button>
        ) : null}
        {config ? (
          <button
            type="button"
            disabled={actionBusy}
            onClick={() => deleteRecord(section, item)}
            className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
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
              className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:border-emerald-300 hover:bg-emerald-100 disabled:opacity-50 dark:border-emerald-900/60 dark:bg-emerald-500/10 dark:text-emerald-300 dark:hover:bg-emerald-500/20"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={actionBusy}
              onClick={() => decideApproval(workflowId, 'reject')}
              className="rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:border-rose-300 hover:bg-rose-100 disabled:opacity-50 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20"
            >
              Reject
            </button>
          </>
        ) : null}
        {!config && !workflowId ? <span className="text-xs text-neutral-500 dark:text-neutral-400">No actions</span> : null}
        {workflowId && approvalState !== 'pending' ? (
          <span className="text-xs text-neutral-500 dark:text-neutral-400">Workflow: {approvalState || 'n/a'}</span>
        ) : null}
        {!id ? <span className="text-xs text-neutral-500 dark:text-neutral-400">No ID</span> : null}
      </>
    );
  };

  const renderSection = () => {
    if (activeSection === 'dashboard') return renderDashboard();
    if (activeSection === 'project-hub') return renderProjectHub();
    if (activeSection === 'assets') return renderTable(assets, [
      { key: 'title', label: 'Asset', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || item.moduleType || 'Asset'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'version', label: 'Version', render: (item) => item?.version?.current || 'v1.0' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No assets uploaded yet', 'Upload images, logos, banners, PDFs, videos, or creative files to populate the DAM view.', {
      rowActions: (item) => renderRowActions('assets', item),
    });
    if (activeSection === 'campaigns') return renderCampaigns();
    if (activeSection === 'tasks') return renderCampaignTasks();
    if (activeSection === 'budget') return <BudgetTracker projectId={effectiveProjectId} />;
    if (activeSection === 'funnel') return <KpiFunnelChart projectId={effectiveProjectId} />;
    if (activeSection === 'calendar') return <MarketingCalendar projectId={effectiveProjectId} />;
    if (activeSection === 'weekly-planning') return <WeeklyPlanner projectId={effectiveProjectId} />;
    if (activeSection === 'checklists') return <ProjectChecklists projectId={effectiveProjectId} />;
    if (activeSection === 'content') return renderTable(content, [
      { key: 'title', label: 'Content', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description || 'Editorial item'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No content pieces found', 'Use the content studio to manage blogs, articles, landing pages, newsletters, and press releases.', {
      rowActions: (item) => renderRowActions('content', item),
    });
    if (activeSection === 'brand') return renderTable(brandAssets, [
      { key: 'title', label: 'Brand Asset', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Brand guide'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No brand assets found', 'Store brand guidelines, logo variations, typography rules, palette references, and templates.', {
      rowActions: (item) => renderRowActions('brand', item),
    });
    if (activeSection === 'design') return renderTable(designItems, [
      { key: 'title', label: 'Design Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Design request'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No design requests found', 'Track banners, creatives, and layouts from intake through revision to final delivery.', {
      rowActions: (item) => renderRowActions('design', item),
    });
    if (activeSection === 'video') return renderTable(videoItems, [
      { key: 'title', label: 'Video Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Video production'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No video items found', 'Track scripts, footage, edits, reviews, and publishing for every video production.', {
      rowActions: (item) => renderRowActions('video', item),
    });
    if (activeSection === 'social') return renderTable(socialPosts, [
      { key: 'title', label: 'Social Post', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Social post'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'reach', label: 'Reach', render: (item) => num(item?.metadata?.reach || item?.analytics?.reach).toLocaleString() },
      { key: 'engagement', label: 'Engagement', render: (item) => num(item?.metadata?.engagement || item?.analytics?.engagement).toLocaleString() },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No social posts found', 'Plan and track scheduled posts, captions, and performance across every platform.', {
      rowActions: (item) => renderRowActions('social', item),
    });
    if (activeSection === 'approvals') return renderTable(approvals, [
      { key: 'title', label: 'Request', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description || 'Approval request'}</p></div> },
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
        <MarketingReportPanel projectId={effectiveProjectId} />
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
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Tags</span>
              <input
                value={draft.tags}
                onChange={(e) => setDraft((prev) => ({ ...prev, tags: e.target.value }))}
                className="h-11 w-full rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white outline-none focus:border-cyan-400"
                placeholder="Comma separated tags"
              />
            </label>
            <label className="space-y-2 md:col-span-2">
              <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">File</span>
              <input
                type="file"
                onChange={(e) => setDraft((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                className="w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-neutral-200 outline-none file:mr-3 file:rounded-full file:border-0 file:bg-cyan-400/20 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-cyan-50 focus:border-cyan-400"
              />
              {draft.file ? (
                <p className="text-xs text-cyan-300">Selected: {draft.file.name} ({bytes(draft.file.size)}) - will upload to Cloudinary on save.</p>
              ) : draft.storageUrl ? (
                <p className="text-xs text-neutral-400">
                  Current file:{' '}
                  <a href={draft.storageUrl} target="_blank" rel="noreferrer" className="font-semibold text-cyan-300 hover:underline">
                    view{draft.fileSizeBytes ? ` (${bytes(draft.fileSizeBytes)})` : ''}
                  </a>{' '}
                  - choose a new file to replace it.
                </p>
              ) : (
                <p className="text-xs text-neutral-500">No file attached yet. Images, video, PDFs, and docs are stored on Cloudinary.</p>
              )}
            </label>
          </div>

          {editor.section === 'content' && editor.mode === 'edit' && arr(editor.record?.approvalSteps).length ? (
            <div className="mt-6 rounded-2xl bg-white p-4">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-neutral-500">Approval history</p>
              <ApprovalHistoryTimeline steps={editor.record.approvalSteps} />
            </div>
          ) : null}

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

  const isProjectHub = activeSection === 'project-hub';

  return (
    <main className="portal-page">
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
          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[760px]">
            <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-semibold">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Last sync {lastSyncLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-cyan-700">
                <span className="material-symbols-outlined text-[14px]">folder_copy</span>
                Scope {selectedProjectLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
                <span className="material-symbols-outlined text-[14px]">checklist</span>
                {summary.recent.length} recent
              </span>
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {!isProjectHub ? (
                <div className="relative min-w-[220px] flex-1 xl:flex-none">
                  <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[20px] text-slate-400">search</span>
                  <input
                    type="search"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={`Search ${activeSection === 'dashboard' ? 'media records' : activeSection}...`}
                    className="h-10 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm text-slate-950 outline-none placeholder:text-slate-400 focus:border-[var(--portal-accent)]"
                  />
                </div>
              ) : null}
              {!isProjectHub ? (
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
              ) : null}
              {activeSectionAction ? (
                <button
                  type="button"
                  onClick={() => openEditor('create', activeSection)}
                  disabled={actionBusy || !effectiveProjectId}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-teal-200 bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  {activeSectionAction.create}
                </button>
              ) : null}
              {!isProjectHub ? (
                <button
                  type="button"
                  onClick={refreshData}
                  disabled={actionBusy}
                  className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:border-slate-400 hover:bg-slate-50 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">refresh</span>
                  Refresh
                </button>
              ) : null}
              <select
                value={activeSection}
                onChange={(e) => onSectionChange?.(e.target.value)}
                className="h-10 rounded-xl border border-slate-300 bg-white px-3 text-sm font-medium text-slate-950 outline-none focus:border-[var(--portal-accent)]"
              >
                {MEDIA_SECTIONS.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
              </select>
            </div>
            {activeSection !== 'project-hub' ? (
              <div className="rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm">
                <div className="mb-2 flex items-center justify-between px-1">
                  <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-slate-500">Project scope</p>
                  <button
                    type="button"
                    onClick={() => updateProject('')}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition ${
                      !effectiveProjectId
                        ? 'bg-teal-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All
                  </button>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {projectOptions.map((project, index) => {
                    const isActive = effectiveProjectId === project.value;
                    const accentClasses = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500'];
                    const accent = accentClasses[index % accentClasses.length];

                    return (
                      <button
                        key={project.value || project.code}
                        type="button"
                        onClick={() => updateProject(project.value)}
                        className={`group rounded-xl border p-3 text-left transition ${
                          isActive
                            ? 'border-teal-500 bg-teal-50 shadow-sm'
                            : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-sm'
                        }`}
                      >
                        <div className={`h-1 w-full rounded-full ${accent}`} />
                        <p className="mt-2 truncate text-sm font-black text-slate-950">{project.name || project.code}</p>
                        <p className="mt-1 truncate text-xs text-slate-500">{project.description || 'Project workspace'}</p>
                      </button>
                    );
                  })}
                  {!projectOptions.length ? (
                    <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-semibold text-slate-500 sm:col-span-3">
                      No approved projects found.
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </PortalHeader>

        {!isProjectHub ? (
          <section className="mb-4 rounded-3xl border border-cyan-200 bg-cyan-50 p-4 text-sm text-cyan-900">
            {user?.role ? `Signed in as ${user.role}.` : 'Media portal ready.'} Every media record should be linked to project, department, client, team, campaign, and assigned employees.
          </section>
        ) : null}

        {actionMessage ? (
          <section className="mb-4 rounded-3xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
            {actionMessage}
          </section>
        ) : null}

        {loading ? <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-slate-100" /> : error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</div> : renderSection()}
        {renderEditorModal()}
      </div>
    </main>
  );
};

export { MEDIA_SECTIONS };
export default MediaWorkspace;
