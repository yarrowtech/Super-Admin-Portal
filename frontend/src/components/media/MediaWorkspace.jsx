import React, { useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { QK } from '../../utils/queryKeys';
import { findCanonicalProject } from '../../config/projectNames';
import PortalHeader from '../common/PortalHeader';
import MediaProjectList from './MediaProjectList';
import ApprovalHistoryTimeline from './ApprovalHistoryTimeline';

const MEDIA_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'campaign' },
  { id: 'projects', label: 'Projects', icon: 'folder_copy' },
  { id: 'assets', label: 'Assets', icon: 'perm_media' },
  { id: 'brand', label: 'Brand', icon: 'palette' },
  { id: 'content', label: 'Content', icon: 'edit_note' },
  { id: 'design', label: 'Design', icon: 'draw' },
  { id: 'video', label: 'Video', icon: 'movie' },
  { id: 'social', label: 'Social', icon: 'chat_bubble' },
];

const MODULE_FOR_SECTION = {
  assets: 'asset',
  brand: 'brand',
  content: 'content',
  design: 'design',
  video: 'video',
  social: 'social',
};

const META = {
  dashboard: ['Media Command Center', 'Executive overview of media production, approvals, and delivery', 'campaign'],
  projects: ['Projects', 'Click a project to open its full media & marketing plan', 'folder_copy'],
  assets: ['Digital Asset Management', 'Searchable, versioned asset vault', 'perm_media'],
  brand: ['Brand Management', 'Guidelines, templates, and compliance tracking', 'palette'],
  content: ['Content Studio', 'Blogs, copy, web content, and editorial workflow', 'edit_note'],
  design: ['Design Requests', 'Creative intake, assignment, revisions, and delivery', 'draw'],
  video: ['Video Production', 'Scripts, footage, edits, reviews, and publishing', 'movie'],
  social: ['Social Media', 'Calendar, scheduling, and performance', 'chat_bubble'],
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
    updateFn: 'updateMediaContent',
    deleteFn: 'deleteMediaContent',
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
  advertisements: {
    label: 'Advertisement',
    create: 'Create advertisement',
    createFn: 'createMediaAdvertisement',
    updateFn: 'updateMediaAdvertisement',
    deleteFn: 'deleteMediaAdvertisement',
    requestApprovalFn: 'requestMediaAdvertisementApproval',
  },
  seo: {
    label: 'SEO Item',
    create: 'Create SEO item',
    createFn: 'createMediaSeoItem',
    updateFn: 'updateMediaSeoItem',
    deleteFn: 'deleteMediaSeoItem',
    requestApprovalFn: 'requestMediaSeoApproval',
  },
  website: {
    label: 'Website Item',
    create: 'Create website item',
    createFn: 'createMediaWebsiteItem',
    updateFn: 'updateMediaWebsiteItem',
    deleteFn: 'deleteMediaWebsiteItem',
    requestApprovalFn: 'requestMediaWebsiteApproval',
  },
  testimonials: {
    label: 'Testimonial',
    create: 'Create testimonial',
    createFn: 'createMediaTestimonial',
    updateFn: 'updateMediaTestimonial',
    deleteFn: 'deleteMediaTestimonial',
    requestApprovalFn: 'requestMediaTestimonialApproval',
  },
  'case-studies': {
    label: 'Case Study',
    create: 'Create case study',
    createFn: 'createMediaCaseStudy',
    updateFn: 'updateMediaCaseStudy',
    deleteFn: 'deleteMediaCaseStudy',
    requestApprovalFn: 'requestMediaCaseStudyApproval',
  },
};

const DOMAIN_FIELDS = {
  assets: [
    { key: 'assetType', label: 'Asset Type', placeholder: 'Logo, banner, brochure, source file...' },
    { key: 'usageRights', label: 'Usage Rights', placeholder: 'Internal, web, paid ads, client approved...' },
  ],
  brand: [
    { key: 'brandArea', label: 'Brand Area', placeholder: 'Logo, typography, palette, guideline...' },
    { key: 'complianceNotes', label: 'Compliance Notes' },
  ],
  content: [
    { key: 'contentType', label: 'Content Type', placeholder: 'Blog, landing page, email, press release...' },
    { key: 'channel', label: 'Channel', placeholder: 'Website, newsletter, LinkedIn...' },
    { key: 'publishTarget', label: 'Publish Target' },
  ],
  design: [
    { key: 'format', label: 'Format', placeholder: 'Static, carousel, print, presentation...' },
    { key: 'dimensions', label: 'Dimensions', placeholder: '1080x1080, A4, 16:9...' },
    { key: 'revisionRound', label: 'Revision Round', type: 'number' },
  ],
  video: [
    { key: 'videoType', label: 'Video Type', placeholder: 'Reel, explainer, testimonial, ad...' },
    { key: 'durationSeconds', label: 'Duration (seconds)', type: 'number' },
    { key: 'aspectRatio', label: 'Aspect Ratio', placeholder: '9:16, 16:9, 1:1...' },
  ],
  social: [
    { key: 'platform', label: 'Platform', placeholder: 'Instagram, LinkedIn, YouTube...' },
    { key: 'caption', label: 'Caption' },
    { key: 'reach', label: 'Reach', type: 'number' },
    { key: 'engagement', label: 'Engagement', type: 'number' },
  ],
};

const STATUS_OPTIONS = ['all', 'draft', 'pending', 'in review', 'approved', 'live', 'active', 'published', 'needs revision', 'rejected'];
const CREATIVE_SECTION_IDS = new Set(['assets', 'brand', 'content', 'design', 'video', 'social']);
const CREATIVE_DETAILS = {
  assets: ['Asset Library', 'Manage logos, campaign files, source assets, and approved deliverables.', 'assetType', 'Asset types'],
  brand: ['Brand Control', 'Keep guidelines, templates, identity assets, and compliance notes in one place.', 'brandArea', 'Brand areas'],
  content: ['Content Pipeline', 'Create, revise, approve, and publish copy across every channel.', 'contentType', 'Content types'],
  design: ['Design Queue', 'Track design requests, revisions, owners, and delivery files.', 'format', 'Formats'],
  video: ['Video Production', 'Manage scripts, edits, cuts, review files, and publishing status.', 'videoType', 'Video types'],
  social: ['Social Desk', 'Plan posts, attach creatives, and capture platform performance.', 'platform', 'Platforms'],
};
const CREATIVE_WORKFLOWS = {
  assets: [
    ['Intake', 'Upload source file, assign owner, tag usage.'],
    ['Organize', 'Attach category, rights, and project context.'],
    ['Approve', 'Request approval before final use.'],
    ['Publish', 'Use approved files in campaigns and reports.'],
  ],
  brand: [
    ['Guideline', 'Define brand area, notes, and source asset.'],
    ['Compliance', 'Check logo, type, colors, and usage rules.'],
    ['Approve', 'Lock approved versions for reuse.'],
    ['Distribute', 'Share final templates and reference files.'],
  ],
  content: [
    ['Brief', 'Capture type, channel, target, and owner.'],
    ['Draft', 'Write, attach files, and update status.'],
    ['Review', 'Move through approval and revisions.'],
    ['Publish', 'Mark scheduled, live, or published.'],
  ],
  design: [
    ['Request', 'Capture format, size, owner, and brief.'],
    ['Production', 'Attach work files and revision notes.'],
    ['Review', 'Track approval and requested changes.'],
    ['Delivery', 'Store final creative for campaign use.'],
  ],
  video: [
    ['Script', 'Define type, duration, ratio, and owner.'],
    ['Edit', 'Attach cuts, thumbnails, and review files.'],
    ['Approve', 'Route edits through approval.'],
    ['Publish', 'Mark scheduled, live, or archived.'],
  ],
  social: [
    ['Plan', 'Set platform, caption, owner, and asset.'],
    ['Schedule', 'Track status and publish timing.'],
    ['Review', 'Approve creative and caption together.'],
    ['Measure', 'Update reach and engagement.'],
  ],
};
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
const average = (values) => {
  const valid = values.map(num).filter((value) => value > 0);
  if (!valid.length) return 0;
  return valid.reduce((sum, value) => sum + value, 0) / valid.length;
};
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
const recordStatus = (record) => String(record?.status || record?.state || record?.approvalStatus || '').trim().toLowerCase();

const MediaWorkspace = ({ activeSection, onSectionChange, selectedProjectId, onProjectChange }) => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [projects, setProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [content, setContent] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [designItems, setDesignItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
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
    domainFields: {},
  });
  const effectiveProjectId = selectedProjectId !== undefined ? selectedProjectId : activeProjectId;
  const buildProjectOptions = (projectItems = []) =>
    projectItems
      .map((project) => {
        const value = String(project?._id || project?.id || '').trim();
        if (!value) return null;

        const canonicalProject = findCanonicalProject(project);
        if (!canonicalProject) return null;
        const code = canonicalProject?.code || project?.projectCode || project?.code || '';
        const name = canonicalProject?.name || project?.name || project?.projectCode || 'Untitled project';
        const description = canonicalProject?.description || project?.description || 'Project workspace';

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

  // Client-side cache layer: every list below is a TanStack Query, keyed by
  // project + params via QK.media.*. Revisiting a section (or a project you
  // already loaded this session) reads from cache instead of refetching, and
  // the cache itself is persisted to localStorage (see localStorageCache.js)
  // so a page reload shows instant stale-while-revalidate data too.
  const projectParams = useMemo(() => {
    const storedProjectId = String(effectiveProjectId || '');
    const hasRealProjectId = Boolean(storedProjectId && !storedProjectId.startsWith('virtual-'));
    return hasRealProjectId ? { projectId: storedProjectId } : {};
  }, [effectiveProjectId]);
  const listParams = useMemo(() => ({ ...projectParams, limit: 12 }), [projectParams]);
  const enabled = Boolean(token);
  const isProjectHub = activeSection === 'projects';
  const enableWorkspaceData = enabled && !isProjectHub;

  const [
    projectsQuery, dashboardQuery, assetsQuery, contentQuery, brandAssetsQuery,
    designQuery, videoQuery, socialQuery,
  ] = useQueries({
    queries: [
      { queryKey: QK.media.projects({ limit: 200 }), queryFn: () => departmentApi.getMediaProjects(token, { limit: 200 }), enabled },
      { queryKey: QK.media.dashboard(projectParams), queryFn: () => departmentApi.getMediaDashboard(token, projectParams), enabled: enableWorkspaceData },
      { queryKey: QK.media.assets(listParams), queryFn: () => departmentApi.getMediaAssets(token, listParams), enabled: enableWorkspaceData },
      { queryKey: QK.media.content(listParams), queryFn: () => departmentApi.getMediaContent(token, listParams), enabled: enableWorkspaceData },
      { queryKey: QK.media.brandAssets(listParams), queryFn: () => departmentApi.getMediaBrandAssets(token, listParams), enabled: enableWorkspaceData },
      { queryKey: QK.media.design(listParams), queryFn: () => departmentApi.getMediaDesignItems(token, listParams), enabled: enableWorkspaceData },
      { queryKey: QK.media.video(listParams), queryFn: () => departmentApi.getMediaVideoItems(token, listParams), enabled: enableWorkspaceData },
      { queryKey: QK.media.social(listParams), queryFn: () => departmentApi.getMediaSocialPosts(token, listParams), enabled: enableWorkspaceData },
    ],
  });

  // Sync each cached query into the same local state the rest of this component
  // (and every optimistic create/update/delete handler below) already reads and
  // writes — the write path is untouched, only where the initial data comes from.
  useEffect(() => {
    const projectItems = arr(projectsQuery.data?.data?.items || projectsQuery.data?.data?.data?.items);
    setProjects(buildProjectOptions(projectItems));
  }, [projectsQuery.data]);
  useEffect(() => { setDashboard(dashboardQuery.data?.data || null); }, [dashboardQuery.data]);
  useEffect(() => { setAssets(arr(assetsQuery.data?.data?.items)); }, [assetsQuery.data]);
  useEffect(() => { setContent(arr(contentQuery.data?.data?.items)); }, [contentQuery.data]);
  useEffect(() => { setBrandAssets(arr(brandAssetsQuery.data?.data?.items)); }, [brandAssetsQuery.data]);
  useEffect(() => { setDesignItems(arr(designQuery.data?.data?.items)); }, [designQuery.data]);
  useEffect(() => { setVideoItems(arr(videoQuery.data?.data?.items)); }, [videoQuery.data]);
  useEffect(() => { setSocialPosts(arr(socialQuery.data?.data?.items)); }, [socialQuery.data]);

  const anyLoading = [
    projectsQuery, dashboardQuery, assetsQuery, contentQuery, brandAssetsQuery,
    designQuery, videoQuery, socialQuery,
  ].some((q) => q.isLoading);

  useEffect(() => {
    setLoading(anyLoading);
    if (!anyLoading) setLastUpdated(Date.now());
  }, [anyLoading]);

  // Mirrors the previous behaviour: a failure on the critical `projects` fetch
  // surfaces as the page-level error; individual section fetches fail silently
  // (arr()/`|| null` fall back to empty state), same as the old Promise.allSettled.
  useEffect(() => {
    if (projectsQuery.isError) {
      setError(projectsQuery.error?.message || 'Failed to load Media Portal.');
    } else if (projectsQuery.isSuccess) {
      setError('');
    }
  }, [projectsQuery.isError, projectsQuery.isSuccess, projectsQuery.error]);

  // Auto-pick a project the FIRST time the user lands on a project-scoped section
  // with none selected — purely local (reads already-fetched `projects`), so it
  // doesn't reintroduce a network round-trip on every section switch. Guarded by
  // a ref so this only ever fires once: without it, explicitly choosing "All
  // Projects" (which clears effectiveProjectId) would immediately be overridden
  // by this same effect re-picking a project, making "All" unusable.
  const hasAutoPickedProjectRef = React.useRef(false);
  useEffect(() => {
    if (activeSection === 'dashboard' || activeSection === 'projects') return;
    if (hasAutoPickedProjectRef.current) return;
    const storedProjectId = String(effectiveProjectId || '');
    const hasRealProjectId = Boolean(storedProjectId && !storedProjectId.startsWith('virtual-'));
    if (hasRealProjectId) {
      hasAutoPickedProjectRef.current = true;
      return;
    }
    const fallbackProject = projects.find((project) => project.value);
    if (fallbackProject) {
      hasAutoPickedProjectRef.current = true;
      onProjectChange?.(fallbackProject.value);
    }
  }, [activeSection, projects, effectiveProjectId, onProjectChange]);

  const summary = useMemo(() => {
    const kpis = dashboard?.kpis || {};
    const recent = arr(dashboard?.charts?.recentItems);
    const moduleRows = arr(dashboard?.charts?.moduleBreakdown);
    const statusRows = arr(dashboard?.charts?.statusBreakdown);
    return {
      activeProjects: num(kpis.activeProjects ?? projects.length),
      pendingApprovals: num(kpis.pendingApprovals),
      assetStorage: kpis.assetStorageUsageLabel || bytes(kpis.assetStorageUsage),
      productivity: num(kpis.teamProductivity),
      socialReach: num(kpis.socialReach),
      socialEngagement: num(kpis.socialEngagement),
      published: num(kpis.contentProductionStatus?.published),
      inReview: num(kpis.contentProductionStatus?.inReview),
      deadlines: num(kpis.upcomingDeadlines),
      recent,
      moduleRows,
      statusRows,
    };
  }, [dashboard, projects.length]);

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

  const extractDomainFields = (record = {}, section) => {
    const defs = DOMAIN_FIELDS[section] || [];
    const result = {};
    defs.forEach((f) => {
      if (f.top) {
        result[f.key] = toInputValue(f.key === 'spend' ? record?.budgetImpact?.spend : record?.budgetImpact?.roiAtSnapshot);
      } else {
        result[f.key] = toInputValue(record?.metadata?.[f.key]);
      }
    });
    return result;
  };

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
    domainFields: extractDomainFields(record, section),
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

  const refreshData = () => queryClient.invalidateQueries({ queryKey: QK.media.root() });

  const resolveRecordId = (record) => String(record?._id || record?.id || '').trim();

  const getRecordStatus = (record) => recordStatus(record);

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
        storageUrl: draft.storageUrl || undefined,
        storageKey: draft.storageKey || undefined,
        storageProvider: draft.storageProvider === 'cloudinary' ? draft.storageProvider : undefined,
        thumbnailUrl: draft.thumbnailUrl || undefined,
        mimeType: draft.mimeType || undefined,
        fileSizeBytes: draft.fileSizeBytes || undefined,
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

      const domainDefs = DOMAIN_FIELDS[section] || [];
      const domainMetadata = {};
      const domainTopFields = {};
      domainDefs.forEach((f) => {
        const raw = draft.domainFields?.[f.key];
        const value = f.type === 'number' ? (raw === '' || raw === undefined ? undefined : Number(raw)) : (raw || undefined);
        if (value === undefined) return;
        if (f.top) domainTopFields[f.key] = value;
        else domainMetadata[f.key] = value;
      });

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
        ...domainTopFields,
        metadata: domainMetadata,
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
      [setAssets, setContent, setBrandAssets, setDesignItems, setVideoItems, setSocialPosts].forEach((setter) => {
        setter((prev) => prev.map((item) => (matchesWorkflow(item) ? { ...item, ...patch } : item)));
      });
    } catch (err) {
      setError(err.message || 'Failed to update approval decision.');
    } finally {
      setActionBusy(false);
    }
  };

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
                ['Pending Approvals', summary.pendingApprovals, 'fact_check', 'from-amber-400 to-orange-500'],
                ['Team Productivity', `${summary.productivity}%`, 'groups', 'from-fuchsia-400 to-violet-500'],
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
        {renderMetric('Social Posts', socialPosts.length, 'chat_bubble', 'Scheduled and published social content')}
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
      <div className="space-y-4">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <p className="text-lg font-black text-slate-950 dark:text-neutral-100">
            {items.length ? 'No records match your filters' : emptyTitle}
          </p>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-neutral-400">
            {items.length ? 'Clear the search or status filter to restore the section rows.' : emptyMessage}
          </p>
        </div>
        {options.emptyAccessory || null}
      </div>
    );
  };

  const renderCreativeSection = (section, records, columns, emptyTitle, emptyMessage) => {
    const rows = filterRecords(records);
    const config = getSectionAction(section);
    const details = CREATIVE_DETAILS[section] || (META[section] || [config?.label || 'Records', 'Manage records for this section.']);
    const workflow = CREATIVE_WORKFLOWS[section] || [];
    const approvedCount = records.filter((item) => ['approved', 'live', 'published'].some((status) => getRecordStatus(item).includes(status))).length;
    const inReviewCount = records.filter((item) => ['pending', 'review'].some((status) => getRecordStatus(item).includes(status))).length;
    const attachedCount = records.filter((item) => item?.storageUrl || item?.thumbnailUrl).length;
    const metadataKey = details?.[2];
    const metadataLabel = details?.[3] || 'Types';
    const metadataCount = metadataKey
      ? new Set(records.map((item) => String(item?.metadata?.[metadataKey] || item?.category || '').trim()).filter(Boolean)).size
      : 0;
    const ownerCount = new Set(records.map((item) => String(item?.ownerName || '').trim()).filter(Boolean)).size;
    const recentCount = records.filter((item) => {
      const updatedAt = item?.updatedAt ? new Date(item.updatedAt).getTime() : 0;
      return updatedAt && Date.now() - updatedAt <= 1000 * 60 * 60 * 24 * 7;
    }).length;
    const selectedProject = projectOptions.find((project) => project.value === effectiveProjectId);
    const recentRecords = [...records]
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 3);

    return (
      <div className="space-y-4">
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2 text-xs font-semibold">
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Project: {selectedProject?.name || (effectiveProjectId ? 'Selected project' : 'All projects')}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  Showing {rows.length} of {records.length}
                </span>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                  {recentCount} updated this week
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openEditor('create', section)}
              disabled={actionBusy || !effectiveProjectId}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              {config?.create || 'Create record'}
            </button>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-6">
            {[
              ['Total', records.length, 'inventory_2'],
              ['In Review', inReviewCount, 'pending_actions'],
              ['Approved/Live', approvedCount, 'verified'],
              ['Files', attachedCount, 'attach_file'],
              [metadataLabel, metadataCount, 'category'],
              ['Owners', ownerCount, 'groups'],
            ].map(([label, value, icon]) => (
              <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-500">{label}</p>
                  <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{icon}</span>
                </div>
                <p className="mt-2 text-2xl font-black text-slate-950 dark:text-neutral-100">{value}</p>
              </div>
            ))}
          </div>
        </section>

        {!effectiveProjectId ? (
          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            Select a project before creating a new {String(config?.label || 'record').toLowerCase()}.
          </section>
        ) : null}

        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Production Workflow</h3>
              <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">A consistent path from intake to publish.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-bold text-slate-600 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
              {workflow.length} steps
            </span>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-4">
            {workflow.map(([title, detail], index) => (
              <div key={title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-teal-600 text-sm font-black text-white">{index + 1}</span>
                <p className="mt-4 text-sm font-black text-slate-950 dark:text-neutral-100">{title}</p>
                <p className="mt-2 text-sm leading-6 text-slate-500 dark:text-neutral-400">{detail}</p>
              </div>
            ))}
          </div>
        </section>

        {recentRecords.length ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-black uppercase tracking-[0.16em] text-slate-500 dark:text-neutral-400">Recent Work</h3>
                <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Latest records updated in this workspace.</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-3 xl:grid-cols-3">
              {recentRecords.map((record) => (
                <article key={resolveRecordId(record) || record.title} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black text-slate-950 dark:text-neutral-100">{record.title}</p>
                      <p className="mt-1 truncate text-xs text-slate-500 dark:text-neutral-400">{record.ownerName || record.projectName || config?.label || 'Creative record'}</p>
                    </div>
                    <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[11px] font-bold ${tone(record.status)}`}>
                      {record.status || 'Draft'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 text-xs text-slate-500 dark:text-neutral-400">
                    <span>{record.updatedAt ? new Date(record.updatedAt).toLocaleDateString() : 'No date'}</span>
                    <button
                      type="button"
                      disabled={actionBusy}
                      onClick={() => openEditor('edit', section, record)}
                      className="rounded-full border border-teal-200 bg-white px-3 py-1 font-semibold text-teal-700 transition hover:bg-teal-50 disabled:opacity-50 dark:border-teal-900/60 dark:bg-neutral-900 dark:text-teal-300 dark:hover:bg-teal-500/10"
                    >
                      Open
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        {renderTable(records, columns, emptyTitle, emptyMessage, {
          rowActions: (item) => renderRowActions(section, item),
          emptyAccessory: (
            <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950 dark:text-neutral-100">Start this workspace</p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-neutral-400">Create the first record with owner, project, status, metadata, and file attachment.</p>
                </div>
                <button
                  type="button"
                  onClick={() => openEditor('create', section)}
                  disabled={actionBusy || !effectiveProjectId}
                  className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 text-sm font-semibold text-white transition hover:bg-teal-700 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">add_circle</span>
                  {config?.create || 'Create record'}
                </button>
              </div>
            </section>
          ),
        })}
      </div>
    );
  };

  const renderProjectHub = () => <MediaProjectList projects={projectOptions} />;

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
    if (activeSection === 'projects') return renderProjectHub();
    if (activeSection === 'assets') return renderCreativeSection('assets', assets, [
      { key: 'title', label: 'Asset', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || item.moduleType || 'Asset'}</p></div> },
      { key: 'assetType', label: 'Type', render: (item) => item?.metadata?.assetType || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'version', label: 'Version', render: (item) => item?.version?.current || 'v1.0' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No assets uploaded yet', 'Upload images, logos, banners, PDFs, videos, or creative files to populate the DAM view.');
    if (activeSection === 'content') return renderCreativeSection('content', content, [
      { key: 'title', label: 'Content', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description || 'Editorial item'}</p></div> },
      { key: 'contentType', label: 'Type', render: (item) => item?.metadata?.contentType || item.category || '-' },
      { key: 'channel', label: 'Channel', render: (item) => item?.metadata?.channel || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No content pieces found', 'Use the content studio to manage blogs, articles, landing pages, newsletters, and press releases.');
    if (activeSection === 'brand') return renderCreativeSection('brand', brandAssets, [
      { key: 'title', label: 'Brand Asset', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Brand guide'}</p></div> },
      { key: 'brandArea', label: 'Area', render: (item) => item?.metadata?.brandArea || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No brand assets found', 'Store brand guidelines, logo variations, typography rules, palette references, and templates.');
    if (activeSection === 'design') return renderCreativeSection('design', designItems, [
      { key: 'title', label: 'Design Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Design request'}</p></div> },
      { key: 'format', label: 'Format', render: (item) => item?.metadata?.format || item.category || '-' },
      { key: 'dimensions', label: 'Size', render: (item) => item?.metadata?.dimensions || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No design requests found', 'Track banners, creatives, and layouts from intake through revision to final delivery.');
    if (activeSection === 'video') return renderCreativeSection('video', videoItems, [
      { key: 'title', label: 'Video Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Video production'}</p></div> },
      { key: 'videoType', label: 'Type', render: (item) => item?.metadata?.videoType || item.category || '-' },
      { key: 'durationSeconds', label: 'Duration', render: (item) => item?.metadata?.durationSeconds ? `${item.metadata.durationSeconds}s` : '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No video items found', 'Track scripts, footage, edits, reviews, and publishing for every video production.');
    if (activeSection === 'social') return renderCreativeSection('social', socialPosts, [
      { key: 'title', label: 'Social Post', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Social post'}</p></div> },
      { key: 'platform', label: 'Platform', render: (item) => item?.metadata?.platform || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'ownerName', label: 'Owner' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'reach', label: 'Reach', render: (item) => num(item?.metadata?.reach || item?.analytics?.reach).toLocaleString() },
      { key: 'engagement', label: 'Engagement', render: (item) => num(item?.metadata?.engagement || item?.analytics?.engagement).toLocaleString() },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No social posts found', 'Plan and track scheduled posts, captions, and performance across every platform.');
    return renderGeneric(activeSection);
  };

  const renderEditorModal = () => {
    if (!editor.open || !activeSectionAction) return null;
    const title = editor.mode === 'edit' ? `Edit ${activeSectionAction.label}` : activeSectionAction.create;
    const sectionInfo = CREATIVE_DETAILS[editor.section] || META[editor.section] || [activeSectionAction.label, 'Manage this media record.', 'category'];
    const domainFields = DOMAIN_FIELDS[editor.section] || [];
    const sectionIcon = META[editor.section]?.[2] || MODULE_FOR_SECTION[editor.section] || 'edit_note';
    const fieldClass = 'h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500';
    const textareaClass = 'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-4 focus:ring-teal-500/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500';
    const labelClass = 'text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-neutral-500';
    const updateDomainField = (key, value) => {
      setDraft((prev) => ({
        ...prev,
        domainFields: { ...prev.domainFields, [key]: value },
      }));
    };

    return (
      <div className="fixed inset-0 z-[1200] flex items-center justify-center bg-slate-950/55 px-3 py-4 backdrop-blur-sm sm:px-6">
        <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-slate-50 shadow-[0_30px_120px_rgba(15,23,42,0.35)] dark:border-neutral-800 dark:bg-neutral-950">
          <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="material-symbols-outlined rounded-xl bg-teal-50 p-2 text-[20px] text-teal-700 dark:bg-teal-500/10 dark:text-teal-300">
                  {sectionIcon}
                </span>
                <div>
                  <p className="text-xs font-black uppercase tracking-[0.24em] text-teal-700 dark:text-teal-300">{title}</p>
                  <h3 className="mt-1 truncate text-2xl font-black text-slate-950 dark:text-neutral-100">
                    {draft.title || `${activeSectionAction.label} record`}
                  </h3>
                </div>
              </div>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-neutral-400">
                {sectionInfo[1] || 'Keep this record aligned to project, owner, approval status, and final evidence.'}
              </p>
            </div>
            <button
              type="button"
              onClick={closeEditor}
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-300 dark:hover:bg-neutral-800"
              aria-label="Close"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>

          <div className="min-h-0 overflow-y-auto">
            <div className="p-5">
              <div className="space-y-5">
                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-black text-slate-950 dark:text-neutral-100">Basic Information</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <label className="space-y-2">
                      <span className={labelClass}>Title</span>
                      <input value={draft.title} onChange={(e) => setDraft((prev) => ({ ...prev, title: e.target.value }))} className={fieldClass} placeholder="Enter title" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Project</span>
                      <select
                        value={effectiveProjectId || ''}
                        onChange={(e) => {
                          const projectId = e.target.value;
                          const project = projectOptions.find((item) => item.value === projectId);
                          updateProject(projectId);
                          setDraft((prev) => ({ ...prev, projectName: project?.name || prev.projectName }));
                        }}
                        className={fieldClass}
                      >
                        <option className="text-slate-950" value="">Select project</option>
                        {projectOptions.map((project) => (
                          <option className="text-slate-950" key={project.value} value={project.value}>{project.name}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className={labelClass}>Description</span>
                      <textarea rows={4} value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} className={textareaClass} placeholder="Brief, placement, target audience, notes, or approval context" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Status</span>
                      <select value={draft.status} onChange={(e) => setDraft((prev) => ({ ...prev, status: e.target.value }))} className={fieldClass}>
                        {['Draft', 'Pending', 'In Review', 'Approved', 'Scheduled', 'Live', 'Published', 'Needs Revision', 'Rejected', 'Archived'].map((option) => (
                          <option className="text-slate-950" key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Priority</span>
                      <select value={draft.priority} onChange={(e) => setDraft((prev) => ({ ...prev, priority: e.target.value }))} className={fieldClass}>
                        {['Low', 'Medium', 'High', 'Critical'].map((option) => (
                          <option className="text-slate-950" key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Owner</span>
                      <input value={draft.ownerName} onChange={(e) => setDraft((prev) => ({ ...prev, ownerName: e.target.value }))} className={fieldClass} placeholder="Owner name" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Category</span>
                      <input value={draft.category} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))} className={fieldClass} placeholder="Category or type" />
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className={labelClass}>Tags</span>
                      <input value={draft.tags} onChange={(e) => setDraft((prev) => ({ ...prev, tags: e.target.value }))} className={fieldClass} placeholder="Comma separated tags" />
                    </label>
                  </div>
                </section>

                {domainFields.length ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <div className="mb-4">
                      <p className="text-sm font-black text-slate-950 dark:text-neutral-100">{SECTION_ACTIONS[editor.section]?.label} Details</p>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {domainFields.map((field) => (
                        <label key={field.key} className={field.top ? 'space-y-2' : 'space-y-2'}>
                          <span className={labelClass}>{field.label}</span>
                          <input
                            type={field.type === 'number' ? 'number' : 'text'}
                            value={draft.domainFields?.[field.key] ?? ''}
                            onChange={(e) => updateDomainField(field.key, e.target.value)}
                            className={fieldClass}
                            placeholder={field.placeholder || field.label}
                          />
                        </label>
                      ))}
                    </div>
                  </section>
                ) : null}

                <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="mb-4">
                    <p className="text-sm font-black text-slate-950 dark:text-neutral-100">File & Evidence</p>
                  </div>
                  <label className="block rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 transition hover:border-teal-400 hover:bg-teal-50/50 dark:border-neutral-700 dark:bg-neutral-950/70 dark:hover:border-teal-700 dark:hover:bg-teal-500/10">
                    <span className={labelClass}>Upload File</span>
                    <input
                      type="file"
                      onChange={(e) => setDraft((prev) => ({ ...prev, file: e.target.files?.[0] || null }))}
                      className="mt-3 block w-full text-sm text-slate-600 file:mr-4 file:rounded-xl file:border-0 file:bg-teal-600 file:px-4 file:py-2 file:text-sm file:font-bold file:text-white hover:file:bg-teal-700 dark:text-neutral-300"
                    />
                    {draft.file ? (
                      <p className="mt-3 text-sm font-semibold text-teal-700 dark:text-teal-300">Selected: {draft.file.name} ({bytes(draft.file.size)})</p>
                    ) : draft.storageUrl ? (
                      <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">
                        Current file:{' '}
                        <a href={draft.storageUrl} target="_blank" rel="noreferrer" className="font-semibold text-teal-700 hover:underline dark:text-teal-300">
                          view{draft.fileSizeBytes ? ` (${bytes(draft.fileSizeBytes)})` : ''}
                        </a>
                      </p>
                    ) : (
                      <p className="mt-3 text-sm text-slate-500 dark:text-neutral-400">No file attached yet. Images, videos, PDFs, and docs are stored on Cloudinary.</p>
                    )}
                  </label>
                </section>

                {editor.section === 'content' && editor.mode === 'edit' && arr(editor.record?.approvalSteps).length ? (
                  <section className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-slate-500 dark:text-neutral-500">Approval history</p>
                    <ApprovalHistoryTimeline steps={editor.record.approvalSteps} />
                  </section>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap justify-end gap-2">
              <button type="button" onClick={closeEditor} className="inline-flex h-10 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-200 dark:hover:bg-neutral-800">
                Cancel
              </button>
              <button
                type="button"
                disabled={actionBusy || !draft.title.trim() || !effectiveProjectId}
                onClick={() => persistRecord(editor.mode, editor.section, resolveRecordId(editor.record))}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-bold text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">{editor.mode === 'edit' ? 'save' : 'add_circle'}</span>
                {actionBusy ? 'Saving...' : editor.mode === 'edit' ? 'Save changes' : `Create ${activeSectionAction.label}`}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

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
              {activeSectionAction && !CREATIVE_SECTION_IDS.has(activeSection) ? (
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
            </div>
            {activeSection !== 'projects' ? (
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
                    const accentColors = ['#3b82f6', '#10b981', '#8b5cf6'];
                    const accent = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(project.themeColor || '')
                      ? project.themeColor
                      : accentColors[index % accentColors.length];

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
                        <div className="h-1 w-full rounded-full" style={{ background: accent }} />
                        <div className="mt-2 flex items-center gap-2">
                          {project.logo?.url ? (
                            <img src={project.logo.url} alt="" className="h-5 w-5 shrink-0 rounded-md object-cover" />
                          ) : null}
                          <p className="truncate text-sm font-black text-slate-950">{project.name || project.code}</p>
                        </div>
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
