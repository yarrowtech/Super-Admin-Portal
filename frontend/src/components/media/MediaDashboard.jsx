import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import PortalHeader from '../common/PortalHeader';

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
  { id: 'dashboard', label: 'Dashboard', icon: 'campaign' },
  { id: 'campaigns', label: 'Campaigns', icon: 'ads_click' },
  { id: 'content', label: 'Content', icon: 'gallery_thumbnail' },
  { id: 'channels', label: 'Channels', icon: 'share' },
  { id: 'approvals', label: 'Approvals', icon: 'fact_check' },
  { id: 'analytics', label: 'Analytics', icon: 'analytics' },
  { id: 'settings', label: 'Settings', icon: 'settings' },
];

const cardClass = 'rounded-2xl border border-neutral-800 bg-neutral-900 p-4 shadow-sm shadow-black/10';
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

const MediaDashboard = ({ activeSection, onSectionChange }) => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [content, setContent] = useState([]);
  const [updatedAt, setUpdatedAt] = useState(null);

  useEffect(() => {
    let ignore = false;

    const load = async () => {
      if (!token) return;

      setLoading(true);
      setError('');
      try {
        const [dashboardRes, campaignsRes, contentRes] = await Promise.all([
          departmentApi.getMediaDashboard(token),
          departmentApi.getMediaCampaigns(token),
          departmentApi.getMediaContent(token),
        ]);

        if (ignore) return;

        const dashboardData = dashboardRes?.data || {};
        const campaignItems = campaignsRes?.data?.campaigns || [];
        const contentItems = contentRes?.data?.content || [];

        setDashboard(dashboardData);
        setCampaigns(Array.isArray(campaignItems) ? campaignItems : []);
        setContent(Array.isArray(contentItems) ? contentItems : []);
        setUpdatedAt(Date.now());
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
  }, [token]);

  const summary = useMemo(() => {
    const permissions = Array.isArray(dashboard?.permissions) ? dashboard.permissions : [];
    const activeCampaigns = campaigns.filter((row) => {
      const status = String(row?.status || row?.state || '').toLowerCase();
      return status.includes('live') || status.includes('active') || status.includes('running');
    }).length;
    const pendingCampaigns = campaigns.filter((row) => {
      const status = String(row?.status || row?.state || '').toLowerCase();
      return status.includes('pending') || status.includes('review') || status.includes('draft');
    }).length;
    const publishedContent = content.filter((row) => {
      const status = String(row?.status || row?.state || '').toLowerCase();
      return status.includes('published') || status.includes('live');
    }).length;

    return {
      permissions,
      activeCampaigns,
      pendingCampaigns,
      publishedContent,
      totalCampaigns: campaigns.length,
      totalContent: content.length,
      message: dashboard?.message || 'Media operations center online.',
    };
  }, [campaigns, content, dashboard]);

  const meta = SECTION_META[activeSection] || SECTION_META.dashboard;

  const renderEmptyCard = (title, description) => (
    <article className={cardClass}>
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
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
                  <p className="text-base font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm text-neutral-400">{channel}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone(status)}`}>
                  {status}
                </span>
              </div>
              <p className="mt-4 text-sm leading-6 text-neutral-300">{objective}</p>
              <div className="mt-4 flex flex-wrap gap-2 text-xs text-neutral-400">
                <span className="rounded-full bg-neutral-800 px-2.5 py-1">Owner: {owner}</span>
                <span className="rounded-full bg-neutral-800 px-2.5 py-1">Channel: {channel}</span>
                <span className="rounded-full bg-neutral-800 px-2.5 py-1">Status: {status}</span>
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
                  <p className="text-base font-semibold text-white">{title}</p>
                  <p className="mt-1 text-sm text-neutral-400">{format}</p>
                </div>
                <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${statusTone(status)}`}>
                  {status}
                </span>
              </div>
              <div className="mt-4 space-y-2 text-sm text-neutral-300">
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
              <span className="material-symbols-outlined text-3xl text-cyan-300">{channel.icon}</span>
              <div>
                <p className="text-base font-semibold text-white">{channel.name}</p>
                <p className="text-sm text-neutral-400">{channel.desc}</p>
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
            <p className="mt-2 text-lg font-semibold text-white">{step.label}</p>
            <p className="mt-3 text-sm text-neutral-300">{step.state}</p>
          </article>
        ))}
      </div>
    );
  };

  const renderAnalytics = () => {
    const contentRatio = summary.totalContent ? Math.round((summary.publishedContent / summary.totalContent) * 100) : 0;
    const campaignRatio = summary.totalCampaigns ? Math.round((summary.activeCampaigns / summary.totalCampaigns) * 100) : 0;

    const metrics = [
      ['Active Campaigns', summary.activeCampaigns, 'rocket_launch'],
      ['Pending Reviews', summary.pendingCampaigns, 'hourglass_top'],
      ['Published Assets', summary.publishedContent, 'library_books'],
      ['Content Publish Rate', `${contentRatio}%`, 'trending_up'],
      ['Campaign Activation Rate', `${campaignRatio}%`, 'local_fire_department'],
      ['Permissions', summary.permissions.length, 'verified_user'],
    ];

    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {metrics.map(([label, value, icon]) => (
            <article key={label} className={cardClass}>
              <span className="material-symbols-outlined text-cyan-300">{icon}</span>
              <p className="mt-3 text-2xl font-black text-white">{metricValue(value)}</p>
              <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
            </article>
          ))}
        </div>

        <article className={cardClass}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-base font-semibold text-white">Operational Pulse</p>
              <p className="text-sm text-neutral-400">Media throughput is driven by launch readiness and content approvals.</p>
            </div>
            <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-emerald-300">
              Healthy
            </span>
          </div>
          <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-neutral-400">
                <span>Campaign readiness</span>
                <span>{campaignRatio}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-sky-500" style={{ width: `${campaignRatio}%` }} />
              </div>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-sm text-neutral-400">
                <span>Content publish rate</span>
                <span>{contentRatio}%</span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-neutral-800">
                <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-teal-500" style={{ width: `${contentRatio}%` }} />
              </div>
            </div>
          </div>
        </article>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          ['Campaigns', summary.totalCampaigns, 'ads_click'],
          ['Active', summary.activeCampaigns, 'play_circle'],
          ['Content Assets', summary.totalContent, 'gallery_thumbnail'],
          ['Permissions', summary.permissions.length, 'verified_user'],
        ].map(([label, value, icon]) => (
          <article key={label} className={cardClass}>
            <span className="material-symbols-outlined text-cyan-300">{icon}</span>
            <p className="mt-3 text-2xl font-black text-white">{metricValue(value)}</p>
            <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
          </article>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.4fr_0.9fr]">
        <article className={cardClass}>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Overview</p>
          <h2 className="mt-2 text-2xl font-black text-white">Media operations are connected.</h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-neutral-300">{summary.message}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            {summary.permissions.length ? summary.permissions.map((permission) => (
              <span key={permission} className="rounded-full border border-cyan-500/25 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-200">
                {permission}
              </span>
            )) : (
              <span className="rounded-full border border-neutral-700 bg-neutral-800 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-neutral-400">
                No permissions reported
              </span>
            )}
          </div>
        </article>

        <article className={cardClass}>
          <p className="text-sm font-semibold text-white">Sync Status</p>
          <div className="mt-4 space-y-3 text-sm text-neutral-300">
            <div className="flex items-center justify-between">
              <span>API sync</span>
              <span className="text-emerald-300">Connected</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Campaign board</span>
              <span>{summary.totalCampaigns ? 'Populated' : 'Empty'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Content vault</span>
              <span>{summary.totalContent ? 'Populated' : 'Empty'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Last refresh</span>
              <span>{updatedAt ? new Date(updatedAt).toLocaleTimeString() : 'Pending'}</span>
            </div>
          </div>
        </article>
      </div>

      {renderAnalytics()}
    </div>
  );

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
          <p className="text-sm font-semibold text-white">Access model</p>
          <p className="mt-2 text-sm leading-6 text-neutral-300">
            The Media portal is restricted to the media role and portal access policy. Use this space to keep role controls,
            publishing rules, and creative approvals aligned.
          </p>
        </article>
        <article className={cardClass}>
          <p className="text-sm font-semibold text-white">Operational note</p>
          <p className="mt-2 text-sm leading-6 text-neutral-300">
            {user?.role ? `Signed in as ${user.role}.` : 'Signed in user details unavailable.'} Add structured campaign and content records to populate the boards.
          </p>
        </article>
      </div>
    );
  };

  return (
    <main className="min-h-screen flex-1 overflow-y-auto bg-neutral-950">
      <div className="mx-auto w-full max-w-[1680px] p-3 sm:p-4 lg:p-6 2xl:p-8">
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
          <select
            value={activeSection}
            onChange={(e) => onSectionChange?.(e.target.value)}
            className="h-10 rounded-xl border border-neutral-300 bg-neutral-200 px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-primary dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
          >
            {MEDIA_SECTIONS.map((section) => (
              <option key={section.id} value={section.id}>
                {section.label}
              </option>
            ))}
          </select>
        </PortalHeader>

        <section className="mb-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-sm text-cyan-100">
          Media portal focus: creative flow, launch visibility, and publishing discipline.
        </section>

        {loading ? (
          <div className="h-56 animate-pulse rounded-2xl border border-neutral-800 bg-neutral-900" />
        ) : error ? (
          <div className="rounded-2xl border border-red-800 bg-red-950/40 p-4 text-red-200">{error}</div>
        ) : (
          renderSection()
        )}
      </div>
    </main>
  );
};

export { MEDIA_SECTIONS };
export default MediaDashboard;
