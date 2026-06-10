import React, { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import PortalHeader from '../common/PortalHeader';

const MEDIA_SECTIONS = [
  { id: 'dashboard', label: 'Dashboard', icon: 'campaign' },
  { id: 'project-hub', label: 'Project Hub', icon: 'folder_copy' },
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
  'project-hub': ['Project Media Hub', 'Dedicated workspace for each project', 'folder_copy'],
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

const EXPORT_OPTIONS = ['PDF', 'Excel', 'CSV', 'PPT'];
const COLORS = ['#22d3ee', '#38bdf8', '#10b981', '#f59e0b', '#a78bfa', '#ec4899'];

const card = 'rounded-[1.75rem] border border-white/10 bg-slate-950/80 p-5 shadow-[0_20px_80px_rgba(15,23,42,0.25)]';
const soft = 'rounded-[1.5rem] border border-white/10 bg-white/5 p-4';
const glass = 'rounded-[1.75rem] border border-cyan-500/15 bg-cyan-500/5 p-5';
const tone = (status = '') => {
  const v = String(status).toLowerCase();
  if (v.includes('approved') || v.includes('live') || v.includes('published')) return 'border-emerald-400/30 bg-emerald-400/10 text-emerald-100';
  if (v.includes('pending') || v.includes('review') || v.includes('draft')) return 'border-amber-400/30 bg-amber-400/10 text-amber-100';
  if (v.includes('reject') || v.includes('revision') || v.includes('hold')) return 'border-rose-400/30 bg-rose-400/10 text-rose-100';
  return 'border-sky-400/30 bg-sky-400/10 text-sky-100';
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

const MediaWorkspace = ({ activeSection, onSectionChange }) => {
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

  useEffect(() => {
    try {
      const stored = localStorage.getItem('activeProjectId');
      if (stored) setActiveProjectId(stored);
    } catch {}
  }, []);

  useEffect(() => {
    let alive = true;
    const load = async () => {
      if (!token) return;
      setLoading(true);
      setError('');
      try {
        const results = await Promise.allSettled([
          departmentApi.getMediaDashboard(token),
          departmentApi.getMediaProjects(token, { limit: 12 }),
          departmentApi.getMediaAssets(token, { limit: 12 }),
          departmentApi.getMediaCampaigns(token, { limit: 12 }),
          departmentApi.getMediaContent(token, { limit: 12 }),
          departmentApi.getMediaBrandAssets(token, { limit: 12 }),
          departmentApi.getMediaApprovals(token, { limit: 12 }),
          departmentApi.getMediaReportingSummary(token),
        ]);
        if (!alive) return;
        const [dash, projs, ass, camp, cont, brand, appr, report] = results;
        setDashboard(dash.status === 'fulfilled' ? dash.value?.data || null : null);
        setProjects(projs.status === 'fulfilled' ? arr(projs.value?.data?.items) : []);
        setAssets(ass.status === 'fulfilled' ? arr(ass.value?.data?.items) : []);
        setCampaigns(camp.status === 'fulfilled' ? arr(camp.value?.data?.items) : []);
        setContent(cont.status === 'fulfilled' ? arr(cont.value?.data?.items) : []);
        setBrandAssets(brand.status === 'fulfilled' ? arr(brand.value?.data?.items) : []);
        setApprovals(appr.status === 'fulfilled' ? arr(appr.value?.data?.items) : []);
        setReporting(report.status === 'fulfilled' ? report.value?.data || null : null);
        setLastUpdated(Date.now());
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
  }, [token, activeProjectId]);

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
    () => projects.map((p) => ({ value: String(p._id || p.id || ''), label: p.name || 'Untitled Project' })),
    [projects]
  );

  const moduleCount = (section) => {
    const key = MODULE_FOR_SECTION[section];
    if (!key) return 0;
    return num(summary.moduleRows.find((row) => String(row.name || row._id).toLowerCase() === key)?.value || 0);
  };

  const updateProject = (projectId) => {
    setActiveProjectId(projectId);
    try {
      if (projectId) localStorage.setItem('activeProjectId', projectId);
      else localStorage.removeItem('activeProjectId');
    } catch {}
  };

  const renderMetric = (label, value, icon, detail) => (
    <article className="rounded-[1.5rem] border border-white/10 bg-white/[0.04] p-4 transition-colors hover:border-cyan-400/25 hover:bg-white/[0.06]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">{label}</p>
          <p className="mt-2 text-3xl font-black text-white">{value}</p>
        </div>
        <span className="material-symbols-outlined rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-3 text-2xl text-cyan-300">
          {icon}
        </span>
      </div>
      {detail ? <p className="mt-3 text-sm text-neutral-400">{detail}</p> : null}
    </article>
  );

  const empty = (title, message) => <div className={soft}><p className="text-sm font-semibold text-white">{title}</p><p className="mt-2 text-sm leading-6 text-neutral-300">{message}</p></div>;
  const sectionMeta = META[activeSection] || META.dashboard;

  const renderDashboard = () => (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(135deg,rgba(8,15,32,0.98),rgba(6,10,20,0.95))]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.18),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.12),transparent_28%)]" />
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
            <div className="max-w-4xl">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-cyan-100">
                  Media Command Center
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.28em] text-neutral-300">
                  Project-linked operations
                </span>
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white sm:text-5xl">
                Media production, approvals, campaigns, and reporting in one executive view.
              </h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-neutral-300 sm:text-lg">
                Use this workspace to manage every asset, content piece, campaign, and media request with the same project association and approval discipline used across the portal.
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200">Last sync: {lastUpdated ? new Date(lastUpdated).toLocaleTimeString() : 'pending'}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200">Projects: {summary.activeProjects}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200">Approvals: {summary.pendingApprovals}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200">Deadlines: {summary.deadlines}</span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-200">Storage: {summary.assetStorage}</span>
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
                <article key={label} className="rounded-[1.4rem] border border-white/10 bg-white/[0.04] p-4">
                  <div className={`inline-flex rounded-2xl bg-gradient-to-br ${accent} p-2 text-white shadow-lg`}>
                    <span className="material-symbols-outlined text-xl">{icon}</span>
                  </div>
                  <p className="mt-4 text-2xl font-black text-white">{value}</p>
                  <p className="mt-1 text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">{label}</p>
                </article>
              ))}
            </div>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 xl:grid-cols-[1.3fr_0.7fr]">
            <article className={card}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">Operational mix</p>
                  <h2 className="mt-2 text-2xl font-black text-white">Where the media organization is actually working</h2>
                </div>
                <div className="flex flex-wrap gap-2">
                  {EXPORT_OPTIONS.map((option) => (
                    <button key={option} type="button" className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-semibold text-neutral-200 transition-colors hover:border-cyan-400/30 hover:bg-cyan-400/10">
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

  const renderTable = (items, columns, emptyTitle, emptyMessage) => (
    items.length ? (
      <div className="overflow-hidden rounded-3xl border border-white/10">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5 text-left text-xs uppercase tracking-[0.2em] text-neutral-400">
            <tr>{columns.map((column) => <th key={column.label} className="px-4 py-3">{column.label}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {items.map((item) => (
              <tr key={item._id || item.id || item.title}>
                {columns.map((column) => (
                  <td key={column.label} className="px-4 py-3 align-top text-neutral-200">
                    {column.render ? column.render(item) : pick(item?.[column.key], item?.metadata?.[column.key], '-')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{empty(emptyTitle, emptyMessage)}{empty('Workflow note', 'Every media record must link to project, department, client, team, campaign, and assigned employees.')}</div>
    )
  );

  const renderProjectHub = () => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {renderMetric('Projects in Hub', summary.activeProjects, 'folder_copy')}
        {renderMetric('Assets Linked', assets.length, 'attachment')}
        {renderMetric('Content Items', content.length, 'description')}
      </div>
      {projects.length ? (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          {projects.map((project) => (
            <article key={project._id || project.id} className={card}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold text-white">{project.name || 'Untitled Project'}</p>
                  <p className="mt-1 text-sm text-neutral-400">{project.description || 'Project media workspace'}</p>
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${tone(project.status || 'active')}`}>{project.status || 'Active'}</span>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-neutral-300">
                {['clientName', 'campaignName', 'teamName', 'deadline'].map((field) => (
                  <div key={field} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <p className="text-xs uppercase tracking-[0.2em] text-neutral-500">{field.replace(/([A-Z])/g, ' $1')}</p>
                    <p className="mt-2 font-semibold text-white">{field === 'deadline' ? (project.deadline ? new Date(project.deadline).toLocaleDateString() : 'TBD') : pick(project[field], project?.[field.replace('Name', '')]?.name, 'Unassigned')}</p>
                  </div>
                ))}
              </div>
            </article>
          ))}
        </div>
      ) : empty('No project hubs found', 'Every project should automatically generate a dedicated media workspace with linked assets, content, approvals, and campaign history.')}
    </div>
  );

  const renderGeneric = (section) => (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {renderMetric('Records', moduleCount(section), META[section][2])}
        {renderMetric('Project Scope', summary.activeProjects, 'filter_alt')}
        {renderMetric('Approvals', summary.pendingApprovals, 'verified')}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {empty(META[section][0], META[section][1])}
        {empty('Workflow', 'Draft -> project link -> approval -> publish -> report -> archive. Keep version history and audit trail attached to every update.')}
      </div>
    </div>
  );

  const renderSection = () => {
    if (activeSection === 'dashboard') return renderDashboard();
    if (activeSection === 'project-hub') return renderProjectHub();
    if (activeSection === 'assets') return renderTable(assets, [
      { key: 'title', label: 'Asset', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.category || item.moduleType || 'Asset'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'version', label: 'Version', render: (item) => item?.version?.current || 'v1.0' },
      { key: 'storageUsageBytes', label: 'Storage', render: (item) => bytes(item.storageUsageBytes || item.fileSizeBytes) },
    ], 'No assets uploaded yet', 'Upload images, logos, banners, PDFs, videos, or creative files to populate the DAM view.');
    if (activeSection === 'campaigns') return renderTable(campaigns, [
      { key: 'title', label: 'Campaign', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.objective || item.description || 'Campaign objective'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'priority', label: 'Priority' },
    ], 'No campaigns found', 'Create campaign records linked to projects, budgets, teams, and KPI targets.');
    if (activeSection === 'content') return renderTable(content, [
      { key: 'title', label: 'Content', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.description || 'Editorial item'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
      { key: 'approvalStatus', label: 'Approval' },
    ], 'No content pieces found', 'Use the content studio to manage blogs, articles, landing pages, newsletters, and press releases.');
    if (activeSection === 'brand') return renderTable(brandAssets, [
      { key: 'title', label: 'Brand Asset', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.category || 'Brand guide'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'approvalStatus', label: 'Approval' },
    ], 'No brand assets found', 'Store brand guidelines, logo variations, typography rules, palette references, and templates.');
    if (activeSection === 'approvals') return renderTable(approvals, [
      { key: 'title', label: 'Request', render: (item) => <div><p className="font-semibold text-white">{item.title}</p><p className="text-xs text-neutral-400">{item.description || 'Approval request'}</p></div> },
      { key: 'projectName', label: 'Project' },
      { key: 'status', label: 'Status', render: (item) => <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${tone(item.status)}`}>{item.status}</span> },
    ], 'No pending approvals', 'Approval flows will appear here once records are submitted from asset, content, campaign, and design modules.');
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

  return (
    <main className="min-h-screen flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top,_rgba(34,211,238,0.15),_transparent_35%),linear-gradient(180deg,#020617_0%,#020617_100%)]">
      <div className="mx-auto w-full max-w-[1720px] p-3 sm:p-4 lg:p-6 2xl:p-8">
        <PortalHeader
          title={sectionMeta[0]}
          subtitle={sectionMeta[1]}
          user={user}
          icon={sectionMeta[2]}
          showSearch
          showNotifications
          showThemeToggle
          searchPlaceholder="Search assets, campaigns, content, approvals..."
        >
          <select
            value={activeProjectId}
            onChange={(e) => updateProject(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-neutral-900 px-3 text-sm font-medium text-neutral-100 outline-none focus:border-cyan-400"
          >
            <option value="">All Projects</option>
            {projectOptions.map((project) => <option key={project.value} value={project.value}>{project.label}</option>)}
          </select>
          <select
            value={activeSection}
            onChange={(e) => onSectionChange?.(e.target.value)}
            className="h-10 rounded-xl border border-white/10 bg-neutral-900 px-3 text-sm font-medium text-neutral-100 outline-none focus:border-cyan-400"
          >
            {MEDIA_SECTIONS.map((section) => <option key={section.id} value={section.id}>{section.label}</option>)}
          </select>
        </PortalHeader>

        <section className="mb-4 rounded-3xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm text-cyan-50">
          {user?.role ? `Signed in as ${user.role}.` : 'Media portal ready.'} Every media record should be linked to project, department, client, team, campaign, and assigned employees.
        </section>

        {loading ? <div className="h-72 animate-pulse rounded-3xl border border-white/10 bg-white/5" /> : error ? <div className="rounded-3xl border border-rose-400/30 bg-rose-500/10 p-4 text-rose-100">{error}</div> : renderSection()}
      </div>
    </main>
  );
};

export { MEDIA_SECTIONS };
export default MediaWorkspace;
