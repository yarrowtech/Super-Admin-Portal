import React, { useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { departmentApi } from '../../services/departments';
import { QK } from '../../utils/queryKeys';
import { statusToTone } from '../../utils/statusTone';
import { findCanonicalProject } from '../../config/projectNames';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';
import StatusBadge from '../common/StatusBadge';
import DataTable from '../ui/DataTable';
import MediaProjectList from './MediaProjectList';
import ApprovalHistoryTimeline from './ApprovalHistoryTimeline';
import ProjectSwitcher from './ProjectSwitcher';
import CreativeToolbar from './CreativeToolbar';
import CreativeStatsGrid from './CreativeStatsGrid';

const MEDIA_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'campaign' },
  { id: 'projects', label: 'Projects', icon: 'folder_copy' },
  { id: 'assets', label: 'Assets', icon: 'perm_media' },
  { id: 'brand', label: 'Brand', icon: 'palette' },
  { id: 'content', label: 'Content', icon: 'edit_note' },
  { id: 'design', label: 'Design', icon: 'draw' },
  { id: 'video', label: 'Video', icon: 'movie' },
  { id: 'social', label: 'Social', icon: 'chat_bubble' },
  { id: 'profile', label: 'Profile', icon: 'person' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
  { id: 'support', label: 'Support', icon: 'support_agent' },
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
  assets: [],
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
const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const bytes = (value) => {
  const n = num(value);
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const idx = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};
const arr = (value) => (Array.isArray(value) ? value : []);
const toInputValue = (value) => (value === undefined || value === null ? '' : String(value));
const recordStatus = (record) => String(record?.status || record?.state || record?.approvalStatus || '').trim().toLowerCase();

const MediaWorkspace = ({ activeSection, onSectionChange, selectedProjectId, onProjectChange }) => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const toast = useToast();
  const { confirm } = useConfirmDialog();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [assets, setAssets] = useState([]);
  const [content, setContent] = useState([]);
  const [brandAssets, setBrandAssets] = useState([]);
  const [designItems, setDesignItems] = useState([]);
  const [videoItems, setVideoItems] = useState([]);
  const [socialPosts, setSocialPosts] = useState([]);
  const [activeProjectId, setActiveProjectId] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [actionBusy, setActionBusy] = useState(false);
  const [sortOption, setSortOption] = useState('updated_desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [editor, setEditor] = useState({ open: false, mode: 'create', section: 'assets', record: null });
  const [draft, setDraft] = useState({
    title: '',
    description: '',
    category: '',
    projectName: '',
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
    projectsQuery, assetsQuery, contentQuery, brandAssetsQuery,
    designQuery, videoQuery, socialQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: QK.media.projects({ limit: 200 }),
        queryFn: () => departmentApi.getMediaProjects(token, { limit: 200 }, { forceRefresh: true }),
        enabled,
        // Project allocation is changed externally by Media Head (assign/revoke) —
        // this list must always reflect the latest allocation on mount, not the
        // shared default 90s staleTime other media queries use (forceRefresh also
        // bypasses the apiClient's own sessionStorage HTTP cache layer).
        staleTime: 0,
        refetchOnMount: 'always',
      },
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
  useEffect(() => { setAssets(arr(assetsQuery.data?.data?.items)); }, [assetsQuery.data]);
  useEffect(() => { setContent(arr(contentQuery.data?.data?.items)); }, [contentQuery.data]);
  useEffect(() => { setBrandAssets(arr(brandAssetsQuery.data?.data?.items)); }, [brandAssetsQuery.data]);
  useEffect(() => { setDesignItems(arr(designQuery.data?.data?.items)); }, [designQuery.data]);
  useEffect(() => { setVideoItems(arr(videoQuery.data?.data?.items)); }, [videoQuery.data]);
  useEffect(() => { setSocialPosts(arr(socialQuery.data?.data?.items)); }, [socialQuery.data]);

  const anyLoading = [
    projectsQuery, assetsQuery, contentQuery, brandAssetsQuery,
    designQuery, videoQuery, socialQuery,
  ].some((q) => q.isLoading);

  useEffect(() => {
    setLoading(anyLoading);
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

  const projectOptions = useMemo(
    () => projects.filter((project) => project.value),
    [projects]
  );

  const assetCategoryOptions = useMemo(() => {
    const set = new Set();
    assets.forEach((item) => {
      const cat = String(item?.metadata?.assetType || item?.category || '').trim();
      if (cat) set.add(cat);
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [assets]);

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

  const matchesCategoryFilter = (record) => {
    if (activeSection !== 'assets' || categoryFilter === 'all') return true;
    const cat = String(record?.metadata?.assetType || record?.category || '').trim();
    return cat === categoryFilter;
  };

  const filterRecords = (records = []) => records.filter((record) => matchesSearch(record) && matchesStatusFilter(record) && matchesCategoryFilter(record));

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
        category: draft.category.trim(),
        projectName: draft.projectName.trim(),
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
        toast.success(`${config.label} updated.`);
      } else {
        const res = await departmentApi[config.createFn](token, payload);
        saved = res?.data;
        toast.success(`${config.label} created and submitted for approval.`);
      }
      upsertLocalRecord(section, saved);
      closeEditor();
    } catch (err) {
      toast.error(err.message || `Failed to save ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const deleteRecord = async (section, record) => {
    const config = getSectionAction(section);
    const id = resolveRecordId(record);
    if (!config || !id) return;
    const ok = await confirm({
      title: `Delete ${config.label}`,
      message: `Delete this ${config.label.toLowerCase()}? This cannot be undone.`,
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    setActionBusy(true);
    try {
      await departmentApi[config.deleteFn](token, id);
      toast.success(`${config.label} deleted.`);
      removeLocalRecord(section, id);
    } catch (err) {
      toast.error(err.message || `Failed to delete ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  // Loops the single-record delete endpoint per selected id — no bulk delete API
  // exists yet, so this stays client-side; each failure is reported individually.
  const bulkDeleteRecords = async (section, records) => {
    const config = getSectionAction(section);
    if (!config || !records.length) return;
    const ok = await confirm({
      title: `Delete ${records.length} ${config.label.toLowerCase()}${records.length > 1 ? 's' : ''}`,
      message: 'This cannot be undone.',
      confirmLabel: 'Delete',
      tone: 'danger',
    });
    if (!ok) return;

    setActionBusy(true);
    let failures = 0;
    for (const record of records) {
      const id = resolveRecordId(record);
      if (!id) continue;
      try {
        await departmentApi[config.deleteFn](token, id);
        removeLocalRecord(section, id);
      } catch {
        failures += 1;
      }
    }
    setActionBusy(false);
    if (failures) toast.error(`${failures} of ${records.length} could not be deleted.`);
    else toast.success(`${records.length} ${config.label.toLowerCase()}${records.length > 1 ? 's' : ''} deleted.`);
  };

  const requestApproval = async (section, record) => {
    const config = getSectionAction(section);
    const id = resolveRecordId(record);
    if (!config || !id) return;
    setActionBusy(true);
    try {
      await departmentApi[config.requestApprovalFn](token, id, {});
      toast.success(`${config.label} sent for approval.`);
      patchLocalRecord(section, id, { approvalStatus: 'pending', status: 'In Review' });
    } catch (err) {
      toast.error(err.message || `Failed to request approval for ${config.label.toLowerCase()}.`);
    } finally {
      setActionBusy(false);
    }
  };

  const decideApproval = async (workflowId, decision) => {
    if (!workflowId) return;
    setActionBusy(true);
    try {
      await departmentApi.decideMediaApproval(token, workflowId, { decision, remarks: '' });
      toast.success(`Approval ${decision === 'approve' ? 'approved' : 'rejected'}.`);
      const nextStatus = decision === 'approve' ? 'Approved' : 'Needs Revision';
      const patch = { approvalStatus: decision === 'approve' ? 'approved' : 'rejected', status: nextStatus };
      const matchesWorkflow = (item) => item?.approvalWorkflowId === workflowId || item?.workflowId === workflowId;
      [setAssets, setContent, setBrandAssets, setDesignItems, setVideoItems, setSocialPosts].forEach((setter) => {
        setter((prev) => prev.map((item) => (matchesWorkflow(item) ? { ...item, ...patch } : item)));
      });
    } catch (err) {
      toast.error(err.message || 'Failed to update approval decision.');
    } finally {
      setActionBusy(false);
    }
  };

  // Loops the single-record approve/reject endpoint per selected id, same reasoning
  // as bulkDeleteRecords — no bulk decision API exists.
  const bulkDecideApproval = async (records, decision) => {
    const eligible = records.filter((item) => {
      const workflowId = item?.approvalWorkflowId || item?.workflowId || item?.metadata?.approvalWorkflowId;
      return workflowId && String(item?.approvalStatus || getRecordStatus(item) || '').toLowerCase() === 'pending';
    });
    if (!eligible.length) {
      toast.warning('No selected items are pending approval.');
      return;
    }
    setActionBusy(true);
    let failures = 0;
    for (const record of eligible) {
      const workflowId = record?.approvalWorkflowId || record?.workflowId || record?.metadata?.approvalWorkflowId;
      try {
        await departmentApi.decideMediaApproval(token, workflowId, { decision, remarks: '' });
        const nextStatus = decision === 'approve' ? 'Approved' : 'Needs Revision';
        const patch = { approvalStatus: decision === 'approve' ? 'approved' : 'rejected', status: nextStatus };
        const matchesWorkflow = (item) => item?.approvalWorkflowId === workflowId || item?.workflowId === workflowId;
        [setAssets, setContent, setBrandAssets, setDesignItems, setVideoItems, setSocialPosts].forEach((setter) => {
          setter((prev) => prev.map((item) => (matchesWorkflow(item) ? { ...item, ...patch } : item)));
        });
      } catch {
        failures += 1;
      }
    }
    setActionBusy(false);
    if (failures) toast.error(`${failures} of ${eligible.length} could not be updated.`);
    else toast.success(`${eligible.length} item${eligible.length > 1 ? 's' : ''} ${decision === 'approve' ? 'approved' : 'rejected'}.`);
  };

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

  const SORT_OPTIONS = [
    { value: 'updated_desc', label: 'Recently updated' },
    { value: 'updated_asc', label: 'Oldest updated' },
    { value: 'title_asc', label: 'Title A–Z' },
  ];

  const sortRows = (rows) => {
    const sorted = [...rows];
    if (sortOption === 'title_asc') return sorted.sort((a, b) => String(a.title || '').localeCompare(String(b.title || '')));
    return sorted.sort((a, b) => {
      const at = a?.updatedAt ? new Date(a.updatedAt).getTime() : 0;
      const bt = b?.updatedAt ? new Date(b.updatedAt).getTime() : 0;
      return sortOption === 'updated_asc' ? at - bt : bt - at;
    });
  };

  const getRowMenuItems = (section, item) => {
    const id = resolveRecordId(item);
    const config = getSectionAction(section);
    const workflowId = item?.approvalWorkflowId || item?.workflowId || item?.metadata?.approvalWorkflowId;
    const approvalState = String(item?.approvalStatus || getRecordStatus(item) || 'draft').toLowerCase();
    const isPending = approvalState === 'pending';
    const isApproved = approvalState === 'approved';
    const canDecide = ['media_head', 'ceo', 'admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());
    const canEdit = Boolean(config) && !isPending;
    const canRequestApproval = Boolean(config) && !isPending && !isApproved;
    const items = [];

    if (item?.storageUrl) {
      items.push({ key: 'download', label: 'Download', icon: 'download', onClick: () => window.open(item.storageUrl, '_blank', 'noreferrer') });
    }
    if (canEdit) {
      items.push({ key: 'edit', label: isApproved ? 'Create revision' : 'Edit', icon: isApproved ? 'content_copy' : 'edit', disabled: actionBusy, onClick: () => openEditor('edit', section, item) });
    }
    if (canRequestApproval) {
      items.push({ key: 'request-approval', label: 'Request approval', icon: 'send', disabled: actionBusy, onClick: () => requestApproval(section, item) });
    }
    if (workflowId && isPending && canDecide) {
      items.push({ key: 'approve', label: 'Approve', icon: 'check_circle', disabled: actionBusy, onClick: () => decideApproval(workflowId, 'approve') });
      items.push({ key: 'reject', label: 'Reject', icon: 'cancel', tone: 'danger', disabled: actionBusy, onClick: () => decideApproval(workflowId, 'reject') });
    }
    if (config && !isPending) {
      items.push({ key: 'delete', label: 'Delete', icon: 'delete', tone: 'danger', disabled: actionBusy || !id, onClick: () => deleteRecord(section, item) });
    }
    return items;
  };

  const renderCreativeSection = (section, records, columns, emptyTitle, emptyMessage) => {
    const filtered = filterRecords(records);
    const rows = sortRows(filtered);
    const config = getSectionAction(section);
    const details = CREATIVE_DETAILS[section] || (META[section] || [config?.label || 'Records', 'Manage records for this section.']);
    const approvedCount = records.filter((item) => ['approved', 'live', 'published'].some((status) => getRecordStatus(item).includes(status))).length;
    const inReviewCount = records.filter((item) => ['pending', 'review'].some((status) => getRecordStatus(item).includes(status))).length;
    const attachedCount = records.filter((item) => item?.storageUrl || item?.thumbnailUrl).length;
    const metadataKey = details?.[2];
    const metadataLabel = details?.[3] || 'Types';
    const metadataCount = metadataKey
      ? new Set(records.map((item) => String(item?.metadata?.[metadataKey] || item?.category || '').trim()).filter(Boolean)).size
      : 0;
    const metricItems = [
      ['Total', records.length, 'inventory_2'],
      ['In Review', inReviewCount, 'pending_actions'],
      ['Approved/Live', approvedCount, 'verified'],
      ['Files', attachedCount, 'attach_file'],
      [metadataLabel, metadataCount, 'category'],
    ];

    const filterChips = [
      searchTerm.trim() ? { key: 'search', label: `Search: ${searchTerm.trim()}`, onRemove: () => setSearchTerm('') } : null,
      statusFilter !== 'all' ? { key: 'status', label: `Status: ${statusFilter}`, onRemove: () => setStatusFilter('all') } : null,
      section === 'assets' && categoryFilter !== 'all' ? { key: 'category', label: `Category: ${categoryFilter}`, onRemove: () => setCategoryFilter('all') } : null,
    ].filter(Boolean);
    const clearFilters = () => {
      setSearchTerm('');
      setStatusFilter('all');
      setCategoryFilter('all');
    };

    const selectedRecords = rows.filter((item) => selectedIds.includes(resolveRecordId(item)));

    return (
      <div className="space-y-4">
        <ProjectSwitcher projects={projectOptions} value={effectiveProjectId} onChange={updateProject} />

        <CreativeToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder={`Search ${section}...`}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          statusOptions={STATUS_OPTIONS}
          categoryFilter={section === 'assets' ? categoryFilter : undefined}
          onCategoryChange={section === 'assets' ? setCategoryFilter : undefined}
          categoryOptions={section === 'assets' ? assetCategoryOptions : undefined}
          sortValue={sortOption}
          onSortChange={setSortOption}
          sortOptions={SORT_OPTIONS}
          onRefresh={refreshData}
          busy={actionBusy}
          filterChips={filterChips}
          onClearFilters={clearFilters}
        />

        <CreativeStatsGrid items={metricItems} />

        {!effectiveProjectId ? (
          <section className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
            Select a project before creating a new {String(config?.label || 'record').toLowerCase()}.
          </section>
        ) : null}

        {selectedRecords.length ? (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--portal-accent)]/30 bg-[var(--portal-accent-soft)] px-4 py-2.5">
            <p className="text-sm font-semibold text-[var(--portal-accent)]">{selectedRecords.length} selected</p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => bulkDecideApproval(selectedRecords, 'approve')}
                className="rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900/60 dark:bg-neutral-900 dark:text-emerald-300"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={actionBusy}
                onClick={() => bulkDeleteRecords(section, selectedRecords)}
                className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 transition hover:bg-rose-50 disabled:opacity-50 dark:border-rose-900/60 dark:bg-neutral-900 dark:text-rose-300"
              >
                Delete
              </button>
            </div>
          </section>
        ) : null}

        <div className="app-card overflow-hidden">
          <DataTable
            columns={columns}
            rows={rows}
            rowKey={(item) => resolveRecordId(item) || item.title}
            selectable
            onSelectionChange={setSelectedIds}
            rowActions={(item) => getRowMenuItems(section, item)}
            emptyTitle={filtered.length ? 'No records match your filters' : emptyTitle}
            emptyDescription={filtered.length ? 'Clear the search or filters to restore the section rows.' : emptyMessage}
            emptyAction={!filtered.length && effectiveProjectId ? { label: config?.create || 'Create record', onClick: () => openEditor('create', section) } : undefined}
          />
        </div>
      </div>
    );
  };

  const renderProjectHub = () => <MediaProjectList projects={projectOptions} />;

  const renderSection = () => {
    if (activeSection === 'projects') return renderProjectHub();
    if (activeSection === 'assets') return renderCreativeSection('assets', assets, [
      { key: 'title', label: 'Asset', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || item.moduleType || 'Asset'}</p></div> },
      { key: 'assetType', label: 'Type', render: (item) => item?.metadata?.assetType || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <StatusBadge tone={statusToTone(item.status)} label={item.status} /> },
      { key: 'version', label: 'Version', render: (item) => item?.version?.current || 'v1.0' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No assets uploaded yet', 'Upload images, logos, banners, PDFs, videos, or creative files to populate the DAM view.');
    if (activeSection === 'content') return renderCreativeSection('content', content, [
      { key: 'title', label: 'Content', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.description || 'Editorial item'}</p></div> },
      { key: 'contentType', label: 'Type', render: (item) => item?.metadata?.contentType || item.category || '-' },
      { key: 'channel', label: 'Channel', render: (item) => item?.metadata?.channel || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <StatusBadge tone={statusToTone(item.status)} label={item.status} /> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No content pieces found', 'Use the content studio to manage blogs, articles, landing pages, newsletters, and press releases.');
    if (activeSection === 'brand') return renderCreativeSection('brand', brandAssets, [
      { key: 'title', label: 'Brand Asset', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Brand guide'}</p></div> },
      { key: 'brandArea', label: 'Area', render: (item) => item?.metadata?.brandArea || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <StatusBadge tone={statusToTone(item.status)} label={item.status} /> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No brand assets found', 'Store brand guidelines, logo variations, typography rules, palette references, and templates.');
    if (activeSection === 'design') return renderCreativeSection('design', designItems, [
      { key: 'title', label: 'Design Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Design request'}</p></div> },
      { key: 'format', label: 'Format', render: (item) => item?.metadata?.format || item.category || '-' },
      { key: 'dimensions', label: 'Size', render: (item) => item?.metadata?.dimensions || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <StatusBadge tone={statusToTone(item.status)} label={item.status} /> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No design requests found', 'Track banners, creatives, and layouts from intake through revision to final delivery.');
    if (activeSection === 'video') return renderCreativeSection('video', videoItems, [
      { key: 'title', label: 'Video Item', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Video production'}</p></div> },
      { key: 'videoType', label: 'Type', render: (item) => item?.metadata?.videoType || item.category || '-' },
      { key: 'durationSeconds', label: 'Duration', render: (item) => item?.metadata?.durationSeconds ? `${item.metadata.durationSeconds}s` : '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <StatusBadge tone={statusToTone(item.status)} label={item.status} /> },
      { key: 'approvalStatus', label: 'Approval' },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No video items found', 'Track scripts, footage, edits, reviews, and publishing for every video production.');
    if (activeSection === 'social') return renderCreativeSection('social', socialPosts, [
      { key: 'title', label: 'Social Post', render: (item) => <div><p className="font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p><p className="text-xs text-neutral-500 dark:text-neutral-400">{item.category || 'Social post'}</p></div> },
      { key: 'platform', label: 'Platform', render: (item) => item?.metadata?.platform || item.category || '-' },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <StatusBadge tone={statusToTone(item.status)} label={item.status} /> },
      { key: 'reach', label: 'Reach', render: (item) => num(item?.metadata?.reach || item?.analytics?.reach).toLocaleString() },
      { key: 'engagement', label: 'Engagement', render: (item) => num(item?.metadata?.engagement || item?.analytics?.engagement).toLocaleString() },
      { key: 'file', label: 'File', render: renderFileCell },
    ], 'No social posts found', 'Plan and track scheduled posts, captions, and performance across every platform.');
    return null;
  };

  const renderEditorModal = () => {
    if (!editor.open || !activeSectionAction) return null;
    const title = editor.mode === 'edit' ? `Edit ${activeSectionAction.label}` : activeSectionAction.create;
    const sectionInfo = CREATIVE_DETAILS[editor.section] || META[editor.section] || [activeSectionAction.label, 'Manage this media record.', 'category'];
    const domainFields = DOMAIN_FIELDS[editor.section] || [];
    const sectionIcon = META[editor.section]?.[2] || MODULE_FOR_SECTION[editor.section] || 'edit_note';
    const fieldClass = 'h-11 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--portal-accent)] focus:ring-4 focus:ring-[var(--portal-accent)]/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500';
    const textareaClass = 'w-full rounded-xl border border-neutral-200 bg-white px-3 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--portal-accent)] focus:ring-4 focus:ring-[var(--portal-accent)]/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:placeholder:text-neutral-500';
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
                      {effectiveProjectId ? (
                        <div className={`${fieldClass} flex items-center justify-between gap-2 bg-slate-50 text-slate-600 dark:bg-neutral-900 dark:text-neutral-300`}>
                          <span className="truncate">
                            {projectOptions.find((item) => item.value === effectiveProjectId)?.name || draft.projectName || 'Selected project'}
                          </span>
                          <span className="material-symbols-outlined shrink-0 text-[16px] text-slate-400 dark:text-neutral-500" title="Set from the project you already selected">
                            lock
                          </span>
                        </div>
                      ) : (
                        <select
                          value=""
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
                      )}
                    </label>
                    <label className="space-y-2 md:col-span-2">
                      <span className={labelClass}>Description</span>
                      <textarea rows={4} value={draft.description} onChange={(e) => setDraft((prev) => ({ ...prev, description: e.target.value }))} className={textareaClass} placeholder="Brief, placement, target audience, notes, or approval context" />
                    </label>
                    <label className="space-y-2">
                      <span className={labelClass}>Category</span>
                      <input value={draft.category} onChange={(e) => setDraft((prev) => ({ ...prev, category: e.target.value }))} className={fieldClass} placeholder="Category or type" />
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

          <div className="flex justify-end gap-2 border-t border-neutral-200 bg-white px-5 py-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeEditor}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="accent"
                disabled={actionBusy || !draft.title.trim() || !effectiveProjectId}
                onClick={() => persistRecord(editor.mode, editor.section, resolveRecordId(editor.record))}
                icon={<span className="material-symbols-outlined text-[18px]">{editor.mode === 'edit' ? 'save' : 'add_circle'}</span>}
              >
                {actionBusy ? 'Saving...' : editor.mode === 'edit' ? 'Save changes' : `Create ${activeSectionAction.label}`}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner portal-page-inner--media space-y-4">
        <PortalHeader
          title={sectionMeta[0]}
          subtitle={sectionMeta[1]}
          user={user}
          icon={sectionMeta[2]}
          showSearch={false}
          showNotifications
          showThemeToggle
        >
          {activeSectionAction && CREATIVE_SECTION_IDS.has(activeSection) ? (
            <Button
              variant="accent"
              onClick={() => openEditor('create', activeSection)}
              disabled={actionBusy || !effectiveProjectId}
              icon={<span className="material-symbols-outlined text-[18px]">add_circle</span>}
            >
              {activeSectionAction.create}
            </Button>
          ) : null}
        </PortalHeader>

        {loading ? <div className="h-72 animate-pulse rounded-3xl border border-slate-200 bg-slate-100 dark:border-neutral-800 dark:bg-neutral-900" /> : error ? <div className="rounded-3xl border border-rose-200 bg-rose-50 p-4 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-300">{error}</div> : renderSection()}
        {renderEditorModal()}
      </div>
    </main>
  );
};

export { MEDIA_SECTIONS };
export default MediaWorkspace;
