import React, { useMemo } from 'react';
import { useQueries } from '@tanstack/react-query';
import PortalHeader from '../common/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { departmentApi } from '../../services/departments';
import { BarChartCard, PieChartCard } from './charts/ChartCards';

const sectionRequests = [
  { key: 'assets', label: 'Assets', icon: 'perm_media', query: 'getMediaAssets' },
  { key: 'brand', label: 'Brand', icon: 'palette', query: 'getMediaBrandAssets' },
  { key: 'content', label: 'Content', icon: 'edit_note', query: 'getMediaContent' },
  { key: 'design', label: 'Design', icon: 'draw', query: 'getMediaDesignItems' },
  { key: 'video', label: 'Video', icon: 'movie', query: 'getMediaVideoItems' },
  { key: 'social', label: 'Social', icon: 'chat_bubble', query: 'getMediaSocialPosts' },
];

const num = (value) => (Number.isFinite(Number(value)) ? Number(value) : 0);
const arr = (value) => (Array.isArray(value) ? value : []);
const formatNumber = (value) => num(value).toLocaleString('en-IN');
const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
};

const getItems = (response) => arr(response?.data?.items);

const statusTone = (status = '') => {
  const value = String(status).toLowerCase();
  if (value.includes('approved') || value.includes('published') || value.includes('live')) return 'border-emerald-200 bg-emerald-50 text-emerald-700';
  if (value.includes('pending') || value.includes('review') || value.includes('draft')) return 'border-amber-200 bg-amber-50 text-amber-700';
  if (value.includes('reject') || value.includes('revision')) return 'border-rose-200 bg-rose-50 text-rose-700';
  return 'border-neutral-200 bg-neutral-50 text-neutral-700';
};

const MetricCard = ({ label, value, icon, hint }) => (
  <article className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <div className="flex items-start justify-between gap-3">
      <div>
        <p className="text-xs font-bold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{label}</p>
        <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">{value}</p>
        {hint ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p> : null}
      </div>
      <span className="material-symbols-outlined rounded-xl bg-[var(--portal-accent)]/10 p-2 text-[20px] text-[var(--portal-accent)]">
        {icon}
      </span>
    </div>
  </article>
);

const CEOMediaAnalysis = () => {
  const { token } = useAuth();
  const [dashboardQuery, projectsQuery, ...sectionQueries] = useQueries({
    queries: [
      {
        queryKey: ['ceo-media-analysis', 'dashboard'],
        queryFn: async () => (await departmentApi.getMediaDashboard(token, {}))?.data || {},
        enabled: Boolean(token),
        staleTime: 60 * 1000,
      },
      {
        queryKey: ['ceo-media-analysis', 'projects'],
        queryFn: async () => departmentApi.getMediaProjects(token, { limit: 200 }),
        enabled: Boolean(token),
        staleTime: 60 * 1000,
      },
      ...sectionRequests.map((section) => ({
        queryKey: ['ceo-media-analysis', section.key],
        queryFn: async () => departmentApi[section.query](token, { limit: 25 }),
        enabled: Boolean(token),
        staleTime: 60 * 1000,
      })),
    ],
  });

  const dashboard = dashboardQuery.data || {};
  const kpis = dashboard.kpis || {};
  const charts = dashboard.charts || {};
  const projects = getItems(projectsQuery.data);
  const isLoading = [dashboardQuery, projectsQuery, ...sectionQueries].some((query) => query.isLoading);
  const error = [dashboardQuery, projectsQuery, ...sectionQueries].find((query) => query.isError)?.error;

  const sections = useMemo(
    () => sectionRequests.map((section, index) => {
      const items = getItems(sectionQueries[index]?.data);
      const pending = items.filter((item) => String(item?.approvalStatus || item?.status || '').toLowerCase().includes('pending')).length;
      const approved = items.filter((item) => ['approved', 'published', 'live'].some((word) => String(item?.approvalStatus || item?.status || '').toLowerCase().includes(word))).length;
      return { ...section, items, pending, approved, total: items.length };
    }),
    [sectionQueries]
  );

  const sectionRows = sections.map((section) => ({
    section: section.label,
    total: section.total,
    approved: section.approved,
    pending: section.pending,
  }));

  const recentRecords = sections
    .flatMap((section) => section.items.map((item) => ({ ...item, sectionLabel: section.label })))
    .sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .slice(0, 10);

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Media Analysis"
          subtitle="Executive analytics from Media Portal production data"
          icon="analytics"
          showSearch={false}
          showNotifications
          showThemeToggle
        />

        {error ? (
          <section className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
            {error.message || 'Failed to load media analysis.'}
          </section>
        ) : null}

        <section className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard label="Active Projects" value={formatNumber(kpis.activeProjects)} icon="folder_copy" hint="Projects with media records" />
          <MetricCard label="Pending Approvals" value={formatNumber(kpis.pendingApprovals)} icon="fact_check" hint="Items waiting for review" />
          <MetricCard label="Social Reach" value={formatNumber(kpis.socialReach)} icon="campaign" hint={`${formatNumber(kpis.socialEngagement)} engagements`} />
          <MetricCard label="Team Productivity" value={`${formatNumber(kpis.teamProductivity)}%`} icon="trending_up" hint={kpis.assetStorageUsageLabel || 'Media storage tracked'} />
        </section>

        {isLoading ? (
          <div className="h-80 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />
        ) : (
          <>
            <section className="mb-4 rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Media Projects</h2>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">Same project scope used by the Media Portal.</p>
                </div>
                <span className="rounded-full bg-[var(--portal-accent)]/10 px-3 py-1 text-xs font-bold text-[var(--portal-accent)]">
                  {projects.length} projects
                </span>
              </div>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                {projects.map((project, index) => {
                  const accents = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4'];
                  const accent = /^#([0-9a-f]{6}|[0-9a-f]{3})$/i.test(project?.themeColor || '')
                    ? project.themeColor
                    : accents[index % accents.length];
                  const name = project?.name || project?.projectCode || 'Untitled project';
                  const code = project?.projectCode || project?.code || name;

                  return (
                    <article key={project?._id || project?.id || code} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950/50">
                      <div className="h-1 w-full rounded-full" style={{ background: accent }} />
                      <div className="mt-3 flex items-start gap-3">
                        {project?.logo?.url ? (
                          <img src={project.logo.url} alt="" className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                        ) : (
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-black text-white" style={{ background: accent }}>
                            {String(name).charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <h3 className="truncate text-sm font-black text-neutral-900 dark:text-neutral-100">{name}</h3>
                            <span className="shrink-0 rounded-full border border-neutral-200 bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900">
                              {code}
                            </span>
                          </div>
                          <p className="mt-1 line-clamp-2 text-xs text-neutral-500 dark:text-neutral-400">{project?.description || 'Media project workspace.'}</p>
                          <span className="mt-3 inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-bold uppercase text-emerald-700">
                            {project?.status || 'in-progress'}
                          </span>
                        </div>
                      </div>
                    </article>
                  );
                })}
                {!projects.length ? (
                  <div className="rounded-xl border border-dashed border-neutral-300 bg-neutral-50 p-6 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950/50 md:col-span-2 xl:col-span-3">
                    No media projects available.
                  </div>
                ) : null}
              </div>
            </section>

            <section className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
              <PieChartCard title="Media Status Breakdown" data={arr(charts.statusBreakdown)} nameKey="name" valueKey="value" />
              <BarChartCard title="Media Module Volume" data={arr(charts.moduleBreakdown)} xKey="name" bars={[{ key: 'value', color: '#ef4444' }]} />
              <BarChartCard title="CEO Section Snapshot" data={sectionRows} xKey="section" bars={[{ key: 'total', color: '#2563eb' }, { key: 'approved', color: '#16a34a' }, { key: 'pending', color: '#ea580c' }]} />
              <PieChartCard title="Section Distribution" data={sectionRows} nameKey="section" valueKey="total" />
            </section>

            <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {sections.map((section) => (
                <article key={section.key} className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined rounded-lg bg-neutral-100 p-2 text-[20px] text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{section.icon}</span>
                    <div>
                      <p className="text-sm font-black text-neutral-900 dark:text-neutral-100">{section.label}</p>
                      <p className="text-xs text-neutral-500 dark:text-neutral-400">{section.total} loaded records</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <div className="rounded-lg bg-neutral-50 p-2 dark:bg-neutral-800">
                      <p className="text-lg font-black">{section.total}</p>
                      <p className="text-[10px] uppercase text-neutral-500">Total</p>
                    </div>
                    <div className="rounded-lg bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300">
                      <p className="text-lg font-black">{section.approved}</p>
                      <p className="text-[10px] uppercase">Approved</p>
                    </div>
                    <div className="rounded-lg bg-amber-50 p-2 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                      <p className="text-lg font-black">{section.pending}</p>
                      <p className="text-[10px] uppercase">Pending</p>
                    </div>
                  </div>
                </article>
              ))}
            </section>

            <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
              <div className="mb-3 flex items-center justify-between gap-3">
                <h2 className="text-sm font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Recent Media Portal Records</h2>
                <span className="text-xs font-semibold text-neutral-500">{recentRecords.length} latest</span>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                  <thead>
                    <tr className="text-left text-xs uppercase tracking-wide text-neutral-500">
                      <th className="px-3 py-2">Title</th>
                      <th className="px-3 py-2">Section</th>
                      <th className="px-3 py-2">Project</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2">Updated</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-200 dark:divide-neutral-800">
                    {recentRecords.map((record) => (
                      <tr key={record._id || record.id}>
                        <td className="px-3 py-2 font-semibold text-neutral-900 dark:text-neutral-100">{record.title || '-'}</td>
                        <td className="px-3 py-2">{record.sectionLabel}</td>
                        <td className="px-3 py-2">{record.projectName || '-'}</td>
                        <td className="px-3 py-2">
                          <span className={`inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(record.status || record.approvalStatus)}`}>
                            {record.status || record.approvalStatus || '-'}
                          </span>
                        </td>
                        <td className="px-3 py-2 text-neutral-500">{formatDate(record.updatedAt || record.createdAt)}</td>
                      </tr>
                    ))}
                    {!recentRecords.length ? (
                      <tr>
                        <td className="px-3 py-8 text-center text-neutral-500" colSpan={5}>No media records available yet.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}
      </div>
    </main>
  );
};

export default CEOMediaAnalysis;
