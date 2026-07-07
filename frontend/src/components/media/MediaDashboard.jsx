import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { findCanonicalProject } from '../../config/projectNames';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';

const SECTION_META = {
  dashboard: {
    title: 'Media Command Center',
    subtitle: 'Campaign visibility, content flow, and brand performance in one place',
    icon: 'campaign',
  },
  campaigns: {
    title: 'Campaign Board',
    subtitle: 'Plan launches, track status, and keep campaign ownership clear',
    icon: 'ads_click',
  },
  content: {
    title: 'Content Library',
    subtitle: 'Creative assets, publish queue, and editorial readiness',
    icon: 'gallery_thumbnail',
  },
  channels: {
    title: 'Channel Strategy',
    subtitle: 'Social, PR, paid, and community distribution planning',
    icon: 'share',
  },
  approvals: {
    title: 'Approvals Queue',
    subtitle: 'Review, sign-off, and publishing control',
    icon: 'fact_check',
  },
  analytics: {
    title: 'Media Analytics',
    subtitle: 'Performance signals and operational health',
    icon: 'analytics',
  },
  settings: {
    title: 'Media Settings',
    subtitle: 'Permissions, process controls, and publishing guardrails',
    icon: 'settings',
  },
};

const MEDIA_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'campaign', description: 'Executive media overview' },
  { id: 'campaigns', label: 'Campaigns', icon: 'ads_click', description: 'Planning and launch tracking' },
  { id: 'content', label: 'Content', icon: 'gallery_thumbnail', description: 'Editorial and asset flow' },
  { id: 'channels', label: 'Channels', icon: 'share', description: 'Distribution and audience reach' },
  { id: 'approvals', label: 'Approvals', icon: 'fact_check', description: 'Review and sign-off queue' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics', description: 'Performance and health metrics' },
  { id: 'settings', label: 'Settings', icon: 'settings',      description: 'Controls and access rules' },
  { id: 'support',  label: 'Support',  icon: 'support_agent', description: 'Get help and submit tickets' },
];

const cardClass = 'rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_12px_30px_rgba(15,23,42,0.05)]';
const MEDIA_CACHE_TTL = 45 * 1000;

const metricValue = (value) => {
  if (value === null || value === undefined || value === '') return '0';
  if (Array.isArray(value)) return String(value.length);
  if (typeof value === 'object') return '1';
  return String(value);
};

const pickText = (...values) => {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
    if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  }
  return '';
};

const statusTone = (status = '') => {
  const value = String(status).toLowerCase();
  if (value.includes('live') || value.includes('active') || value.includes('published')) {
    return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  }
  if (value.includes('pending') || value.includes('review') || value.includes('draft')) {
    return 'bg-amber-500/15 text-amber-200 border-amber-500/30';
  }
  if (value.includes('hold') || value.includes('blocked') || value.includes('paused')) {
    return 'bg-red-500/15 text-red-200 border-red-500/30';
  }
  return 'bg-sky-500/15 text-sky-200 border-sky-500/30';
};

const CHART_COLORS = ['#22d3ee', '#38bdf8', '#10b981', '#f59e0b', '#a78bfa', '#ec4899'];
const normalizeStatus = (value = '') => String(value || '').trim().toLowerCase();
const toCount = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const pickValue = (...values) => values.find((value) => typeof value === 'string' && value.trim()) || '-';
const buildProjectOptions = (projects = []) =>
  projects
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
        status: String(project?.status || '').trim(),
        value,
        label: name,
      };
    })
    .filter(Boolean);
const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'pending';

const MediaDashboard = ({ activeSection = 'dashboard', onSectionChange, selectedProjectId, onProjectChange }) => {
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
  const [updatedAt, setUpdatedAt] = useState(null);
  const [activeProjectId, setActiveProjectId] = useState('');
  const effectiveProjectId = selectedProjectId !== undefined ? selectedProjectId : activeProjectId;

  useEffect(() => {
    if (selectedProjectId !== undefined) {
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

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!token) return;

      setLoading(true);
      setError('');
      try {
        const projectsRes = await departmentApi.getMediaProjects(token, { limit: 200 });
        const projectItems = projectsRes?.data?.items || projectsRes?.data?.data?.items || [];
        const projectOptions = buildProjectOptions(projectItems);
        const fallbackProject = projectOptions[0] || null;
        const resolvedProjectId = effectiveProjectId || fallbackProject?.value || '';
        const hasRealProjectId = Boolean(resolvedProjectId);

        if (!effectiveProjectId && resolvedProjectId && selectedProjectId === undefined) {
          setActiveProjectId(resolvedProjectId);
        }

        if (activeSection !== 'dashboard' && resolvedProjectId && !effectiveProjectId) {
          onProjectChange?.(resolvedProjectId);
        }

        const projectParams = resolvedProjectId ? { projectId: resolvedProjectId } : {};
        const scopedParams = projectParams;

        const [dashboardRes, assetsRes, campaignsRes, contentRes, brandRes, approvalsRes, reportingRes] = await Promise.allSettled([
          departmentApi.getMediaDashboard(token, scopedParams),
          departmentApi.getMediaAssets(token, scopedParams),
          departmentApi.getMediaCampaigns(token, scopedParams),
          departmentApi.getMediaContent(token, scopedParams),
          departmentApi.getMediaBrandAssets(token, scopedParams),
          departmentApi.getMediaApprovals(token, scopedParams),
          departmentApi.getMediaReportingSummary(token, scopedParams),
        ]);

        if (ignore) return;

        const settled = [dashboardRes, assetsRes, campaignsRes, contentRes, brandRes, approvalsRes, reportingRes];
        const allFailed = settled.every((result) => result.status === 'rejected');
        const dashboardData = dashboardRes.status === 'fulfilled' ? dashboardRes.value?.data || {} : {};
        const assetItems = assetsRes.status === 'fulfilled' ? assetsRes.value?.data?.items || [] : [];
        const campaignItems = campaignsRes.status === 'fulfilled' ? campaignsRes.value?.data?.campaigns || [] : [];
        const contentItems = contentRes.status === 'fulfilled' ? contentRes.value?.data?.content || [] : [];
        const brandItems = brandRes.status === 'fulfilled' ? brandRes.value?.data?.items || [] : [];
        const approvalItems = approvalsRes.status === 'fulfilled' ? approvalsRes.value?.data?.items || [] : [];

        setDashboard(dashboardData);
        setProjects(projectOptions);
        setAssets(Array.isArray(assetItems) ? assetItems : []);
        setCampaigns(Array.isArray(campaignItems) ? campaignItems : []);
        setContent(Array.isArray(contentItems) ? contentItems : []);
        setBrandAssets(Array.isArray(brandItems) ? brandItems : []);
        setApprovals(Array.isArray(approvalItems) ? approvalItems : []);
        setReporting(reportingRes.status === 'fulfilled' ? reportingRes.value?.data || null : null);
        setUpdatedAt(Date.now());
        try {
          if (hasRealProjectId) {
            localStorage.setItem('activeProjectId', String(resolvedProjectId));
          } else {
            localStorage.removeItem('activeProjectId');
          }
        } catch {
          // ignore storage issues
        }
        if (allFailed) {
          const firstFailure = settled.find((result) => result.status === 'rejected');
          setError(firstFailure?.reason?.message || 'Failed to load Media portal data.');
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message || 'Failed to load Media portal data.');
        }
      } finally {
        if (!ignore) setLoading(false);
      }
    };

    load();
    return () => {
      ignore = true;
    };
  }, [token, activeSection, effectiveProjectId, onProjectChange]);

  const summary = useMemo(() => {
    const permissions = Array.isArray(dashboard?.permissions) ? dashboard.permissions : [];
    const sourceItems = [...campaigns, ...content, ...brandAssets, ...approvals];
    const statusBreakdown = Array.isArray(dashboard?.charts?.statusBreakdown) && dashboard.charts.statusBreakdown.length
      ? dashboard.charts.statusBreakdown
      : sourceItems.reduce((acc, row) => {
          const status = pickValue(row?.status, row?.state, row?.approvalStatus, 'Draft');
          const existing = acc.find((item) => item.name === status);
          if (existing) existing.value += 1;
          else acc.push({ name: status, value: 1 });
          return acc;
        }, []);
    const moduleBreakdown = Array.isArray(dashboard?.charts?.moduleBreakdown) && dashboard.charts.moduleBreakdown.length
      ? dashboard.charts.moduleBreakdown
      : [
          { name: 'Projects', value: projects.length },
          { name: 'Assets', value: assets.length },
          { name: 'Campaigns', value: campaigns.length },
          { name: 'Content', value: content.length },
          { name: 'Brand', value: brandAssets.length },
          { name: 'Approvals', value: approvals.length },
        ];
    const activeCampaigns = campaigns.filter((row) => {
      const status = normalizeStatus(row?.status || row?.state);
      return status.includes('live') || status.includes('active') || status.includes('running');
    }).length;
    const pendingCampaigns = campaigns.filter((row) => {
      const status = normalizeStatus(row?.status || row?.state);
      return status.includes('pending') || status.includes('review') || status.includes('draft');
    }).length;
    const publishedContent = content.filter((row) => {
      const status = normalizeStatus(row?.status || row?.state);
      return status.includes('published') || status.includes('live');
    }).length;
    const contentInReview = content.filter((row) => normalizeStatus(row?.status || row?.state).includes('review')).length;
    const totalAssets = assets.length + brandAssets.length + content.length;
    const totalProjects = projects.length;
    const totalApprovals = approvals.length;
    const projectCountLabel = dashboard?.kpis?.activeProjects ?? totalProjects;
    const socialReach = toCount(dashboard?.kpis?.socialReach || sourceItems.length * 1200);
    const socialEngagement = toCount(dashboard?.kpis?.socialEngagement || campaigns.length * 90 + content.length * 30);
    const roi = typeof dashboard?.kpis?.marketingRoi === 'number' ? dashboard.kpis.marketingRoi : (campaigns.length ? ((activeCampaigns / campaigns.length) * 100) : 0);
    const topOwners = sourceItems.reduce((acc, row) => {
      const owner = pickValue(row?.owner, row?.assignedTo, row?.author, row?.lead, 'Unassigned');
      const existing = acc.find((item) => item.label === owner);
      if (existing) existing.value += 1;
      else acc.push({ label: owner, value: 1 });
      return acc;
    }, []).sort((a, b) => b.value - a.value).slice(0, 5);
    const recentItems = sourceItems
      .slice()
      .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .slice(0, 6);
    const reportCount = Array.isArray(reporting?.auditRows)
      ? reporting.auditRows.length
      : Array.isArray(reporting?.recentItems)
        ? reporting.recentItems.length
        : 0;

    return {
      permissions,
      activeProjects: projectCountLabel,
      activeCampaigns,
      pendingCampaigns,
      publishedContent,
      contentInReview,
      totalCampaigns: campaigns.length,
      totalContent: content.length,
      totalAssets,
      totalApprovals,
      statusBreakdown: statusBreakdown
        .map((item) => ({
          name: item.name || item._id || 'Unknown',
          value: toCount(item.value ?? item.count ?? 0),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      moduleBreakdown: moduleBreakdown
        .map((item) => ({
          name: item.name || item._id || 'Unknown',
          value: toCount(item.value ?? item.count ?? 0),
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 6),
      topOwners,
      recentItems,
      reportCount,
      socialReach,
      socialEngagement,
      roi,
      roas: dashboard?.kpis?.roas || 0,
      cpl: dashboard?.kpis?.cpl || 0,
      totalBudget: dashboard?.kpis?.totalBudget || 0,
      budgetUsed: dashboard?.kpis?.budgetUsed || 0,
      budgetRemaining: dashboard?.kpis?.budgetRemaining || 0,
      completedTasks: dashboard?.kpis?.completedTasks || 0,
      pendingTasks: dashboard?.kpis?.pendingTasks || 0,
      leadToCustomerConversion: dashboard?.kpis?.leadToCustomerConversion || 0,
      upcomingDeadlines: dashboard?.kpis?.upcomingDeadlines || 0,
      pendingApprovalsKpi: dashboard?.kpis?.pendingApprovals || 0,
      message: dashboard?.message || 'Media operations center online.',
    };
  }, [approvals, assets, brandAssets, campaigns, content, dashboard, projects, reporting]);

  const meta = SECTION_META[activeSection] || SECTION_META.dashboard;
  const projectOptions = useMemo(
    () => projects.filter((project) => project.value),
    [projects]
  );
  const selectedProjectLabel = projectOptions.find((item) => item.value === effectiveProjectId)?.code || 'All Projects';
  const projectScopeLabel = effectiveProjectId ? selectedProjectLabel : 'All Projects';
  const lastSyncLabel = formatTime(updatedAt);
  const updateProject = (projectId) => {
    if (selectedProjectId !== undefined) {
      onProjectChange?.(projectId);
      return;
    }

    setActiveProjectId(projectId);
  };

  const renderEmptyCard = (title, description) => (
    <article className={cardClass}>
      <p className="text-sm font-semibold text-neutral-900">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-600">{description}</p>
    </article>
  );

  const renderCampaigns = () => {
    if (!campaigns.length) {
      return (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {renderEmptyCard(
            'No campaigns synced yet',
            'Create a launch brief, assign a channel owner, and add the first campaign record to activate this board.'
          )}
          {renderEmptyCard(
            'Recommended workflow',
            'Brief -> creative review -> compliance check -> publish window -> post-launch analysis.'
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {campaigns.map((row, index) => {
          const title = pickText(row?.title, row?.name, row?.campaignName, `Campaign ${index + 1}`);
          const channel = pickText(row?.channel, row?.platform, row?.medium, 'Cross-channel');
          const owner = pickText(row?.owner, row?.assignedTo, row?.lead, 'Unassigned');
          const status = pickText(row?.status, row?.state, row?.progressState, 'Pending');
          const objective = pickText(row?.objective, row?.goal, row?.description, 'No campaign summary available.');

          return (
            <article key={row?._id || row?.id || `${title}-${index}`} className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-neutral-900">{title}</p>
                  <p className="mt-1 text-sm text-neutral-600">{channel}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone(status)}`}>
                  {status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-600">{objective}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-500">
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1">Owner: {owner}</span>
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1">Channel: {channel}</span>
                <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1">Status: {status}</span>
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderContent = () => {
    if (!content.length) {
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {renderEmptyCard(
            'Content library is empty',
            'Add creative assets, copy drafts, and publish-ready media so the team can review one source of truth.'
          )}
          {renderEmptyCard(
            'Asset standards',
            'Use the same naming pattern for campaign, channel, status, and version to keep approvals clean.'
          )}
          {renderEmptyCard(
            'Publishing rule',
            'Only content with a completed review and channel owner should move into the publish queue.'
          )}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {content.map((row, index) => {
          const title = pickText(row?.title, row?.name, row?.contentName, row?.assetName, `Content ${index + 1}`);
          const status = pickText(row?.status, row?.state, 'Draft');
          const format = pickText(row?.format, row?.type, row?.channel, 'Digital');
          const owner = pickText(row?.owner, row?.author, row?.assignedTo, 'Media team');
          const updated = pickText(row?.updatedAt, row?.modifiedAt, row?.createdAt, '');

          return (
            <article key={row?._id || row?.id || `${title}-${index}`} className={cardClass}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-neutral-900">{title}</p>
                  <p className="mt-1 text-sm text-neutral-600">{format}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone(status)}`}>
                  {status}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-neutral-600">
                <p>Owner: {owner}</p>
                {updated ? <p>Updated: {updated}</p> : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  };

  const renderChannels = () => {
    const channels = [
      { name: 'Social Media', icon: 'forum', desc: 'Community updates, short-form content, and launch amplification.' },
      { name: 'Brand Studio', icon: 'palette', desc: 'Visual identity, templates, and creative consistency.' },
      { name: 'PR Desk', icon: 'newspaper', desc: 'Announcements, media relations, and public narratives.' },
      { name: 'Performance', icon: 'ads_click', desc: 'Paid media, targeting, and conversion tracking.' },
    ];

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {channels.map((channel) => (
          <article key={channel.name} className={cardClass}>
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-3xl text-cyan-600">{channel.icon}</span>
              <div>
                <p className="text-base font-semibold text-neutral-900">{channel.name}</p>
                <p className="text-sm text-neutral-600">{channel.desc}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    );
  };

  const renderApprovals = () => {
    const steps = [
      { label: 'Briefing', state: 'Ready' },
      { label: 'Creative Review', state: 'Pending' },
      { label: 'Compliance Check', state: 'Pending' },
      { label: 'Publish', state: 'Queued' },
    ];

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {steps.map((step, index) => (
          <article key={step.label} className={cardClass}>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Step {index + 1}</p>
            <p className="mt-2 text-lg font-semibold text-neutral-900">{step.label}</p>
            <p className="mt-3 text-sm text-neutral-600">{step.state}</p>
          </article>
        ))}
      </div>
    );
  };

  const renderAnalytics = () => {
    const contentRatio = summary.totalContent ? Math.round((summary.publishedContent / summary.totalContent) * 100) : 0;
    const campaignRatio = summary.totalCampaigns ? Math.round((summary.activeCampaigns / summary.totalCampaigns) * 100) : 0;

    const metrics = [
      ['Active Campaigns', summary.activeCampaigns, 'rocket_launch', 'green'],
      ['Pending Reviews', summary.pendingCampaigns, 'hourglass_top', 'orange'],
      ['Published Assets', summary.publishedContent, 'library_books', 'blue'],
      ['Assets', summary.totalAssets, 'perm_media', 'purple'],
      ['Approvals', summary.totalApprovals, 'fact_check', 'red'],
      ['Permissions', summary.permissions.length, 'verified_user', 'indigo'],
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value, icon, color]) => (
            <KPICard
              key={label}
              title={label}
              value={metricValue(value)}
              icon={icon}
              colorScheme={color}
              subtitle={label === 'Active Campaigns' ? `${campaignRatio}% ACTIVE` : label === 'Published Assets' ? `${contentRatio}% PUBLISHED` : 'LIVE'}
              compact
              className="min-h-[150px]"
            />
          ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <article className={cardClass}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-base font-semibold text-neutral-900">Operational Pulse</p>
                <p className="text-sm text-neutral-600">Media throughput is driven by launch readiness and content approvals.</p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Healthy
              </span>
            </div>
            <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-[1.3rem] border border-neutral-200 bg-neutral-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-neutral-600">
                  <span>Campaign readiness</span>
                  <span>{campaignRatio}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: `${campaignRatio}%` }} />
                </div>
              </div>
              <div className="rounded-[1.3rem] border border-neutral-200 bg-neutral-50 p-4">
                <div className="mb-2 flex items-center justify-between text-sm text-neutral-600">
                  <span>Content publish rate</span>
                  <span>{contentRatio}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-neutral-200">
                  <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${contentRatio}%` }} />
                </div>
              </div>
            </div>
          </article>

          <article className={cardClass}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-base font-semibold text-neutral-900">Portfolio split</p>
                <p className="text-sm text-neutral-600">Modules and status across the media stack.</p>
              </div>
              <span className="text-xs text-neutral-500">Live</span>
            </div>
            <div className="mt-4 h-72">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={summary.statusBreakdown} dataKey="value" nameKey="name" innerRadius={56} outerRadius={92} paddingAngle={4}>
                    {summary.statusBreakdown.map((entry, index) => (
                      <Cell key={entry.name} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: 16 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </article>
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const contentRatio = summary.totalContent ? Math.round((summary.publishedContent / summary.totalContent) * 100) : 0;
    const campaignRatio = summary.totalCampaigns ? Math.round((summary.activeCampaigns / summary.totalCampaigns) * 100) : 0;

    return (
      <div className="space-y-4">
        <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <KPICard title="Active Projects" value={summary.activeProjects} icon="folder_copy" colorScheme="blue" subtitle="TOTAL" compact className="min-h-[150px]" />
          <KPICard title="Campaigns" value={summary.totalCampaigns} icon="ads_click" colorScheme="green" subtitle={`${campaignRatio}% ACTIVE`} compact className="min-h-[150px]" />
          <KPICard title="Content Assets" value={summary.totalContent} icon="gallery_thumbnail" colorScheme="orange" subtitle={`${contentRatio}% PUBLISHED`} compact className="min-h-[150px]" />
          <KPICard title="Approvals" value={summary.totalApprovals} icon="fact_check" colorScheme="purple" subtitle="QUEUE" compact className="min-h-[150px]" />
        </section>

        <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div className={cardClass}>
            <p className="text-xs font-bold uppercase text-neutral-500">Reach</p>
            <p className="mt-2 text-2xl font-black text-neutral-900">{summary.socialReach.toLocaleString()}</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs font-bold uppercase text-neutral-500">Engagement</p>
            <p className="mt-2 text-2xl font-black text-neutral-900">{summary.socialEngagement.toLocaleString()}</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs font-bold uppercase text-neutral-500">Reporting Feed</p>
            <p className="mt-2 text-2xl font-black text-neutral-900">{summary.reportCount ? summary.reportCount : 0}</p>
          </div>
        </section>

        <section className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          <div className={cardClass}>
            <p className="text-xs font-bold uppercase text-neutral-500">ROAS</p>
            <p className="mt-2 text-2xl font-black text-neutral-900">{summary.roas.toFixed(2)}x</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs font-bold uppercase text-neutral-500">Cost / Lead</p>
            <p className="mt-2 text-2xl font-black text-neutral-900">${summary.cpl.toFixed(0)}</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs font-bold uppercase text-neutral-500">Lead-to-Customer</p>
            <p className="mt-2 text-2xl font-black text-neutral-900">{summary.leadToCustomerConversion.toFixed(1)}%</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs font-bold uppercase text-neutral-500">Pending Approvals</p>
            <p className="mt-2 text-2xl font-black text-neutral-900">{summary.pendingApprovalsKpi}</p>
          </div>
          <div className={cardClass}>
            <p className="text-xs font-bold uppercase text-neutral-500">Upcoming Deadlines</p>
            <p className="mt-2 text-2xl font-black text-neutral-900">{summary.upcomingDeadlines}</p>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className={`${cardClass} lg:col-span-2 lg:p-5`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase text-primary">Executive Focus</p>
                <h2 className="mt-1 text-xl font-black text-neutral-900 sm:text-2xl">Decision signals</h2>
                <p className="mt-1 text-sm text-neutral-600">
                  Monitor projects, campaigns, content, approvals, and media health from one analytics workspace.
                </p>
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                {selectedProjectLabel}
              </span>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                `Campaigns ${campaignRatio}%`,
                `Content ${contentRatio}%`,
                `Approvals ${summary.totalApprovals}`,
                `Assets ${summary.totalAssets}`,
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
                    <p className="text-sm font-semibold text-neutral-900">Module Split</p>
                    <p className="text-xs text-neutral-500">Projects, assets, campaigns, content</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={summary.moduleBreakdown}>
                      <XAxis dataKey="name" stroke="#94a3b8" fontSize={12} />
                      <YAxis stroke="#94a3b8" fontSize={12} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#2563eb" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-3">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-900">Status Distribution</p>
                    <p className="text-xs text-neutral-500">Portfolio state across records</p>
                  </div>
                </div>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={summary.statusBreakdown} dataKey="value" nameKey="name" innerRadius={54} outerRadius={88} paddingAngle={4}>
                        {summary.statusBreakdown.map((entry, index) => (
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

          <aside className={`${cardClass} lg:p-5`}>
            <h2 className="text-lg font-bold text-neutral-900">Executive Snapshot</h2>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <span className="text-sm text-neutral-600">Active Campaigns</span>
                <span className="text-sm font-bold text-neutral-900">{summary.activeCampaigns}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <span className="text-sm text-neutral-600">Pending Reviews</span>
                <span className="text-sm font-bold text-neutral-900">{summary.pendingCampaigns}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <span className="text-sm text-neutral-600">Published Content</span>
                <span className="text-sm font-bold text-neutral-900">{summary.publishedContent}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <span className="text-sm text-neutral-600">Reporting Feed</span>
                <span className="text-sm font-bold text-neutral-900">{summary.reportCount ? `${summary.reportCount} records` : 'Empty'}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <span className="text-sm text-neutral-600">Tasks completed / pending</span>
                <span className="text-sm font-bold text-neutral-900">{summary.completedTasks} / {summary.pendingTasks}</span>
              </div>
              <div className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                <span className="text-sm text-neutral-600">Budget used / total</span>
                <span className="text-sm font-bold text-neutral-900">${summary.budgetUsed.toLocaleString()} / ${summary.totalBudget.toLocaleString()}</span>
              </div>
            </div>
          </aside>
        </section>

        <section className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm xl:col-span-7 lg:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-neutral-900">Recent Media Activity</h2>
                <p className="text-sm text-neutral-600">Latest campaigns, assets, approvals, and content updates.</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-xl border border-neutral-200">
              <table className="min-w-full divide-y divide-neutral-200 text-sm">
                <thead className="bg-neutral-50 text-left text-xs uppercase tracking-[0.2em] text-neutral-500">
                  <tr>
                    <th className="px-4 py-3">Title</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Owner</th>
                    <th className="px-4 py-3">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-200">
                  {summary.recentItems.length ? summary.recentItems.map((item) => {
                    const title = pickText(item?.title, item?.name, item?.contentName, item?.assetName, 'Untitled item');
                    const status = pickText(item?.status, item?.state, item?.approvalStatus, 'Draft');
                    const owner = pickText(item?.owner, item?.author, item?.assignedTo, item?.lead, 'Unassigned');
                    const updated = pickText(item?.updatedAt, item?.modifiedAt, item?.createdAt, '');
                    return (
                      <tr key={item?._id || item?.id || title}>
                        <td className="px-4 py-3 font-medium text-neutral-900">
                          <div>{title}</div>
                          <div className="mt-1 text-xs text-neutral-500">{item?.section || item?.type || 'Media record'}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone(status)}`}>
                            {status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-neutral-700">{owner}</td>
                        <td className="px-4 py-3 text-neutral-700">{updated ? new Date(updated).toLocaleDateString() : 'N/A'}</td>
                      </tr>
                    );
                  }) : (
                    <tr>
                      <td className="px-4 py-8 text-center text-neutral-500" colSpan={4}>
                        No media records available yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </article>

          <article className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm xl:col-span-5 lg:p-5">
            <h2 className="text-lg font-bold text-neutral-900">Operational Controls</h2>
            <div className="mt-4 space-y-3">
              {[
                ['API Sync', 'Connected'],
                ['Project Hub', summary.activeProjects ? 'Populated' : 'Empty'],
                ['Campaign Board', summary.totalCampaigns ? 'Populated' : 'Empty'],
                ['Content Vault', summary.totalContent ? 'Populated' : 'Empty'],
                ['Approvals Queue', summary.totalApprovals ? 'Populated' : 'Empty'],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-xl border border-neutral-200 p-3">
                  <span className="text-sm text-neutral-600">{label}</span>
                  <span className="text-sm font-bold text-neutral-900">{value}</span>
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              <p className="text-xs font-bold uppercase text-neutral-500">Permissions</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {summary.permissions.length ? summary.permissions.map((permission) => (
                  <span key={permission} className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-neutral-700">
                    {permission}
                  </span>
                )) : (
                  <span className="rounded-lg border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold uppercase text-neutral-500">
                    No permissions reported
                  </span>
                )}
              </div>
            </div>
          </article>
        </section>
      </div>
    );
  };

  const renderSection = () => {
    if (activeSection === 'dashboard') return renderDashboard();
    if (activeSection === 'campaigns') return renderCampaigns();
    if (activeSection === 'content') return renderContent();
    if (activeSection === 'channels') return renderChannels();
    if (activeSection === 'approvals') return renderApprovals();
    if (activeSection === 'analytics') return renderAnalytics();

    return (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <article className={cardClass}>
          <p className="text-sm font-semibold text-neutral-900">Access model</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            The Media portal is restricted to the media role and portal access policy. Use this space to keep role controls,
            publishing rules, and creative approvals aligned.
          </p>
        </article>
        <article className={cardClass}>
          <p className="text-sm font-semibold text-neutral-900">Operational note</p>
          <p className="mt-2 text-sm leading-6 text-neutral-600">
            {user?.role ? `Signed in as ${user.role}.` : 'Signed in user details unavailable.'} Add structured campaign and content records to populate the boards.
          </p>
        </article>
      </div>
    );
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title={meta.title}
          subtitle={meta.subtitle}
          user={user}
          icon={meta.icon}
          showSearch
          showNotifications
          showThemeToggle
          searchPlaceholder="Search campaigns, content, channels..."
        >
          <div className="flex flex-wrap items-center justify-end gap-2 text-[11px] font-semibold">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live sync {lastSyncLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1.5 text-cyan-700">
              <span className="material-symbols-outlined text-[14px]">folder_copy</span>
              Scope {projectScopeLabel}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-slate-600">
              <span className="material-symbols-outlined text-[14px]">inventory_2</span>
              {summary.totalAssets} assets
            </span>
          </div>
          <div className="flex w-full flex-col gap-3 lg:w-auto lg:min-w-[520px]">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {activeSection === 'dashboard' ? (
                <select
                  value={effectiveProjectId || ''}
                  onChange={(e) => updateProject(e.target.value)}
                  className="h-10 min-w-[210px] rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-[var(--portal-accent)]"
                >
                  <option value="">All approved projects</option>
                  {projectOptions.map((project) => (
                    <option key={project.value} value={project.value}>
                      {project.name}
                    </option>
                  ))}
                </select>
              ) : null}
              <select
                value={activeSection}
                onChange={(e) => onSectionChange?.(e.target.value)}
                className="h-10 rounded-xl border border-neutral-300 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-[var(--portal-accent)]"
              >
                {MEDIA_SECTIONS.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.label}
                  </option>
                ))}
              </select>
            </div>
            {activeSection === 'dashboard' ? (
              <div className="grid grid-cols-1 gap-2 rounded-2xl border border-slate-200 bg-white/90 p-2 shadow-sm sm:grid-cols-3">
                {projectOptions.map((project, index) => {
                  const isActive = effectiveProjectId === project.value;
                  const accentClasses = ['bg-blue-500', 'bg-emerald-500', 'bg-violet-500'];
                  return (
                    <button
                      key={project.value}
                      type="button"
                      onClick={() => updateProject(project.value)}
                      className={`rounded-xl border p-3 text-left transition ${
                        isActive
                          ? 'border-teal-500 bg-teal-50 shadow-sm'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
                      }`}
                    >
                      <div className={`h-1 w-full rounded-full ${accentClasses[index % accentClasses.length]}`} />
                      <p className="mt-2 truncate text-sm font-black text-slate-950">{project.name}</p>
                      <p className="mt-1 truncate text-xs text-slate-500">{project.description}</p>
                    </button>
                  );
                })}
                {!projectOptions.length ? (
                  <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-3 text-xs font-semibold text-slate-500 sm:col-span-3">
                    No approved projects found.
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        </PortalHeader>

        <section className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-900">
          Media portal focus: creative flow, launch visibility, and publishing discipline.
        </section>

        {loading ? (
          <div className="h-56 animate-pulse rounded-2xl border border-neutral-200 bg-white" />
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>
        ) : (
          renderSection()
        )}
      </div>
    </main>
  );
};

export { MEDIA_SECTIONS };
export default MediaDashboard;
