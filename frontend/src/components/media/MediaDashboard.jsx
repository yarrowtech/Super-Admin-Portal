import React, { useEffect, useMemo, useState } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { findCanonicalProject } from '../../config/projectNames';
import { QK } from '../../utils/queryKeys';
import { statusToTone } from '../../utils/statusTone';
import PortalHeader from '../common/PortalHeader';
import WarmGreeting from '../common/WarmGreeting';
import StatusBadge from '../common/StatusBadge';
import AttentionPanel from '../common/AttentionPanel';
import QuickActions from '../common/QuickActions';
import DataTable from '../ui/DataTable';
import SectionCard from '../ui/SectionCard';
import CreativeStatsGrid from './CreativeStatsGrid';

const pickText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const normalizeStatus = (value = '') => String(value || '').trim().toLowerCase();
const toCount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const arr = (value) => (Array.isArray(value) ? value : []);
const isWithinDays = (dateValue, days) => {
  const t = dateValue ? new Date(dateValue).getTime() : 0;
  return t && Date.now() - t <= days * 24 * 60 * 60 * 1000;
};
const buildProjectOptions = (projects = []) =>
  projects
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
        status: String(project?.status || '').trim(),
        value,
        label: name,
        logo: project?.logo || null,
        themeColor: project?.themeColor || '',
      };
    })
    .filter(Boolean);
const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'pending';

// Section is fixed: MediaPortal only ever mounts this component for the
// 'dashboard' route — Campaigns/Channels/Analytics live in MediaWorkspace's
// Creative sections instead, so this file only renders one view.
const MediaDashboard = ({ selectedProjectId, onSectionChange }) => {
  const { token, user } = useAuth();
  const [activeProjectId, setActiveProjectId] = useState('');
  const effectiveProjectId = selectedProjectId !== undefined ? selectedProjectId : activeProjectId;

  useEffect(() => {
    if (selectedProjectId !== undefined) {
      // Restoring activeProjectId from the controlled `selectedProjectId` prop.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveProjectId(String(selectedProjectId || ''));
      return;
    }

    try {
      const stored = localStorage.getItem('activeProjectId');
      setActiveProjectId(stored && stored !== 'all' ? stored : '');
    } catch {
      setActiveProjectId('');
    }
  }, [selectedProjectId]);

  useEffect(() => {
    if (selectedProjectId !== undefined) {
      try {
        if (selectedProjectId) localStorage.setItem('activeProjectId', String(selectedProjectId));
        else localStorage.removeItem('activeProjectId');
      } catch {
        // ignore storage issues
      }
      return;
    }

    try {
      if (activeProjectId) localStorage.setItem('activeProjectId', String(activeProjectId));
      else localStorage.removeItem('activeProjectId');
    } catch {
      // ignore storage issues
    }
  }, [activeProjectId, selectedProjectId]);

  // Client-side cache layer (same TanStack Query cache MediaWorkspace uses via
  // QK.media.*): revisiting the dashboard within the cache window, or after it
  // was already loaded elsewhere this session, reads from cache instead of
  // re-firing all requests.
  const projectParams = useMemo(
    () => (effectiveProjectId ? { projectId: effectiveProjectId } : {}),
    [effectiveProjectId]
  );
  const enabled = Boolean(token);

  const [
    projectsQuery, dashboardQuery, assetsQuery, campaignsQuery, contentQuery, brandAssetsQuery, approvalsQuery,
  ] = useQueries({
    queries: [
      {
        queryKey: QK.media.projects({ limit: 200 }),
        queryFn: () => departmentApi.getMediaProjects(token, { limit: 200 }, { forceRefresh: true }),
        enabled,
        // Project allocation is changed externally by Media Head — always
        // reflect the latest allocation on mount instead of the shared 90s
        // default staleTime other media queries use (forceRefresh also bypasses
        // the apiClient's own sessionStorage HTTP cache layer).
        staleTime: 0,
        refetchOnMount: 'always',
      },
      { queryKey: QK.media.dashboard(projectParams), queryFn: () => departmentApi.getMediaDashboard(token, projectParams), enabled },
      { queryKey: QK.media.assets(projectParams), queryFn: () => departmentApi.getMediaAssets(token, projectParams), enabled },
      { queryKey: QK.media.campaigns(projectParams), queryFn: () => departmentApi.getMediaCampaigns(token, projectParams), enabled },
      { queryKey: QK.media.content(projectParams), queryFn: () => departmentApi.getMediaContent(token, projectParams), enabled },
      { queryKey: QK.media.brandAssets(projectParams), queryFn: () => departmentApi.getMediaBrandAssets(token, projectParams), enabled },
      { queryKey: QK.media.approvals(projectParams), queryFn: () => departmentApi.getMediaApprovals(token, projectParams), enabled },
    ],
  });

  // Everything below is derived straight from the query results at render
  // time (no mirrored useState) — this is a read-only dashboard, nothing here
  // ever needs an optimistic local write, so there's no reason to duplicate
  // the cache into component state.
  const projects = useMemo(() => {
    const projectItems = projectsQuery.data?.data?.items || projectsQuery.data?.data?.data?.items || [];
    return buildProjectOptions(projectItems);
  }, [projectsQuery.data]);
  const dashboard = useMemo(() => dashboardQuery.data?.data || {}, [dashboardQuery.data]);
  const assets = useMemo(() => arr(assetsQuery.data?.data?.items), [assetsQuery.data]);
  const campaigns = useMemo(() => arr(campaignsQuery.data?.data?.campaigns), [campaignsQuery.data]);
  const content = useMemo(() => arr(contentQuery.data?.data?.items), [contentQuery.data]);
  const brandAssets = useMemo(() => arr(brandAssetsQuery.data?.data?.items), [brandAssetsQuery.data]);
  const approvals = useMemo(() => arr(approvalsQuery.data?.data?.items || approvalsQuery.data?.data), [approvalsQuery.data]);

  const dataQueries = [dashboardQuery, assetsQuery, campaignsQuery, contentQuery, brandAssetsQuery, approvalsQuery];
  const loading = [projectsQuery, ...dataQueries].some((q) => q.isLoading);
  const error = projectsQuery.isError
    ? projectsQuery.error?.message || 'Failed to load Media portal data.'
    : !loading && dataQueries.every((q) => q.isError)
      ? dataQueries.find((q) => q.isError)?.error?.message || 'Failed to load Media portal data.'
      : '';

  // Auto-pick a project the first time none is selected — purely local (reads
  // already-fetched `projects`), so it costs no extra network call.
  useEffect(() => {
    if (!projectsQuery.isSuccess) return;
    const fallbackProject = projects[0] || null;
    const resolvedProjectId = effectiveProjectId || fallbackProject?.value || '';
    if (!resolvedProjectId) return;
    if (!effectiveProjectId && selectedProjectId === undefined) {
      // Second effect-based setter for activeProjectId (the other lives in the
      // localStorage-restore effect above, pre-existing/unrelated to caching) —
      // trips the "looks fully derived" heuristic, but this one only fires once
      // per project-list load, not on every render.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveProjectId(resolvedProjectId);
    }
  }, [projectsQuery.isSuccess, projects, effectiveProjectId, selectedProjectId]);

  const summary = useMemo(() => {
    const sourceItems = [...campaigns, ...content, ...brandAssets, ...approvals];
    const publishAndDeliverables = [...assets, ...content, ...brandAssets];
    const activeCampaigns = campaigns.filter((row) => {
      const status = normalizeStatus(row?.status || row?.state);
      return status.includes('live') || status.includes('active') || status.includes('running');
    }).length;
    const publishedRecently = publishAndDeliverables.filter((row) => {
      const status = normalizeStatus(row?.status || row?.state || row?.approvalStatus);
      const isPublished = status.includes('published') || status.includes('live') || status.includes('approved');
      return isPublished && isWithinDays(row?.updatedAt || row?.createdAt, 7);
    }).length;
    const assetsInReview = assets.filter((row) => {
      const status = normalizeStatus(row?.status || row?.state || row?.approvalStatus);
      return status.includes('pending') || status.includes('review');
    }).length;
    const pendingApprovals = toCount(dashboard?.kpis?.pendingApprovals ?? approvals.filter((row) => normalizeStatus(row?.status || row?.state).includes('pending')).length);

    const needsAttention = sourceItems
      .filter((row) => {
        const status = normalizeStatus(row?.status || row?.state || row?.approvalStatus);
        return status.includes('pending') || status.includes('review') || status.includes('reject') || status.includes('revision');
      })
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 6);

    const recentItems = sourceItems
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 8);

    return {
      // Use the workspace's assigned-project count (same source as the Project
      // Progress panel below), not dashboard.kpis.activeProjects — that KPI is
      // scoped to whichever single project is currently selected and undercounts
      // when multiple projects are assigned but only one has Media records.
      activeProjects: projects.length,
      pendingApprovals,
      assetsInReview,
      publishedRecently,
      activeCampaigns,
      totalCampaigns: campaigns.length,
      needsAttention,
      recentItems,
    };
  }, [approvals, assets, brandAssets, campaigns, content, dashboard, projects]);

  const lastSyncAt =
    dashboard?.updatedAt ||
    dashboard?.generatedAt ||
    summary.recentItems?.[0]?.updatedAt ||
    summary.recentItems?.[0]?.createdAt ||
    new Date().toISOString();
  const lastSyncLabel = formatTime(lastSyncAt);

  // AttentionPanel items, built from the same pre-sorted needsAttention list —
  // no new data, just reshaped to the panel's {id,label,context,tone,statusLabel}
  // contract. Statuses here are always pending/review/reject/revision (see the
  // needsAttention filter above), so statusToTone only ever yields warning/danger.
  const attentionItems = useMemo(
    () =>
      summary.needsAttention.map((item, index) => {
        const title = pickText(item?.title, item?.name, item?.contentName, `Item ${index + 1}`);
        const status = pickText(item?.status, item?.state, item?.approvalStatus, 'Pending');
        return {
          id: item?._id || item?.id || `${title}-${index}`,
          label: title,
          context: item?.projectName || 'Unassigned project',
          tone: statusToTone(status),
          statusLabel: status,
        };
      }),
    [summary.needsAttention]
  );

  // Only wired to sections that genuinely exist in MediaWorkspace's
  // MEDIA_SECTIONS (see MediaWorkspace.jsx) and are reachable via the
  // onSectionChange prop MediaPortal already passes down.
  const quickActions =
    typeof onSectionChange === 'function'
      ? [
          { label: 'Review Assets', icon: 'perm_media', onClick: () => onSectionChange('assets') },
          { label: 'Manage Content', icon: 'edit_note', onClick: () => onSectionChange('content') },
          { label: 'View Projects', icon: 'folder_copy', onClick: () => onSectionChange('projects') },
        ]
      : [];

  const activityColumns = [
    {
      key: 'title',
      header: 'Item',
      render: (item) => (
        <div>
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{pickText(item?.title, item?.name, item?.contentName, item?.assetName, 'Untitled item')}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{item?.projectName || item?.section || item?.type || 'Media record'}</p>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (item) => <StatusBadge tone={statusToTone(pickText(item?.status, item?.state, item?.approvalStatus, 'Draft'))} label={pickText(item?.status, item?.state, item?.approvalStatus, 'Draft')} />,
    },
    { key: 'owner', header: 'Owner', render: (item) => pickText(item?.owner, item?.author, item?.assignedTo, item?.lead, 'Unassigned') },
    {
      key: 'updated',
      header: 'Updated',
      render: (item) => {
        const updated = pickText(item?.updatedAt, item?.modifiedAt, item?.createdAt, '');
        return updated ? new Date(updated).toLocaleDateString() : 'N/A';
      },
    },
  ];

  const renderDashboard = () => (
    <div className="space-y-4">
      <CreativeStatsGrid
        columns={4}
        items={[
          ['Active Projects', summary.activeProjects, 'folder_copy'],
          ['Pending Approvals', summary.pendingApprovals, 'fact_check'],
          ['Assets In Review', summary.assetsInReview, 'pending_actions'],
          ['Recently Published', summary.publishedRecently, 'publish'],
        ]}
      />

      {quickActions.length > 0 && <QuickActions actions={quickActions} />}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <AttentionPanel
          title="Needs Attention"
          items={attentionItems}
          emptyTitle="Nothing needs review right now"
          emptyDescription="Every pending approval, review, and revision is caught up."
        />

        <SectionCard
          title="Project Progress"
          icon="folder_copy"
          description="Active projects assigned to this workspace."
          empty={!projects.length}
          emptyIcon="folder_off"
          emptyTitle="No projects assigned yet"
        >
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {projects.map((project) => (
              <div key={project.value} className="flex min-w-40 shrink-0 flex-col gap-2 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{project.name}</p>
                <StatusBadge tone={statusToTone(project.status)} label={project.status || 'Active'} />
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      <SectionCard title="Recent Media Activity" icon="history" noBodyPadding empty={!summary.recentItems.length} emptyTitle="No media records available yet">
        <DataTable columns={activityColumns} rows={summary.recentItems} rowKey={(item) => item?._id || item?.id || item?.title} emptyTitle="No media records available yet" />
      </SectionCard>
    </div>
  );

  return (
    <main className="portal-page">
      <div className="portal-page-inner portal-page-inner--media">
        <PortalHeader
          title="Media Command Center"
          subtitle="Overview of your creative operations"
          user={user}
          icon="campaign"
          showSearch={false}
          showNotifications
          showThemeToggle
        >
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/20 dark:text-emerald-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
            Live sync {lastSyncLabel}
          </span>
        </PortalHeader>

        <WarmGreeting user={user} message="Hope you have a creative and productive day." />

        {loading ? (
          <div className="h-56 animate-pulse rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-300">{error}</div>
        ) : (
          renderDashboard()
        )}
      </div>
    </main>
  );
};

export default MediaDashboard;
