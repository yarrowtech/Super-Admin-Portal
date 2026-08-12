import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { itApi } from '../../services/it';
import { useAuth } from '../../context/AuthContext';
import { QK } from '../../utils/queryKeys';
import ThemeToggleButton from '../common/ThemeToggleButton';

// ─── Design System — IT amber theme (mirrors Law portal indigo style) ─────────

const tone = {
  open:          'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  'in-progress': 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  resolved:      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  closed:        'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  critical:      'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  high:          'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  medium:        'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  low:           'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  healthy:       'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  degraded:      'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  warning:       'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  active:        'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  unknown:       'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
};

const Pill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[String(value || '').toLowerCase().replace(/[- ]/g, '_').replace(/_$/, '')] || tone.low}`}>
    {String(value || 'Unknown')}
  </span>
);

const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);

const Inner = ({ children, className = '' }) => (
  <div className={`p-5 lg:p-6 ${className}`}>{children}</div>
);

const PageHdr = ({ title, subtitle, action }) => (
  <header className="mb-5 overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="h-1 w-full bg-amber-600" />
    <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-600 shadow-sm">
          <span className="material-symbols-outlined text-[20px] text-white">memory</span>
        </div>
        <div>
          <h1 className="text-[17px] font-black leading-tight text-neutral-900 dark:text-neutral-100">{title}</h1>
          {subtitle && <p className="text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {action}
        <ThemeToggleButton />
      </div>
    </div>
  </header>
);

const StatCard = ({ icon, label, value, color = 'bg-amber-600', loading }) => (
  <Card>
    <Inner className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{label}</p>
        <span className={`material-symbols-outlined rounded-xl p-2 text-[18px] text-white ${color}`}>{icon}</span>
      </div>
      {loading
        ? <div className="h-8 w-20 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
        : <p className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-white">{value ?? 0}</p>}
    </Inner>
  </Card>
);

const SkeletonRows = ({ rows = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: rows }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-2 h-4 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    ))}
  </div>
);

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const MODULES = [
  { id: 'products',       label: 'Products',       icon: 'inventory_2',    path: '/it/dashboard/products' },
  { id: 'tickets',        label: 'Service Desk',   icon: 'support_agent',  path: '/it/dashboard/tickets' },
  { id: 'assets',         label: 'Assets',          icon: 'devices',        path: '/it/dashboard/assets' },
  { id: 'operations',     label: 'Operations',     icon: 'dns',            path: '/it/dashboard/operations' },
  { id: 'activity',       label: 'Activity Logs',  icon: 'history',        path: '/it/dashboard/activity' },
  { id: 'support-center', label: 'Support Center', icon: 'contact_support',path: '/it/dashboard/support-center' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const RECENT_TICKETS_PARAMS = { page: 1, limit: 8, sortBy: 'createdAt', sortOrder: 'desc' };

const ITDashboard = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const enabled = Boolean(token);

  // Project selector list — cached like everything else below; the default
  // selection (localStorage, falling back to the first project) is applied
  // once as soon as the list resolves.
  const projectsQuery = useQuery({
    queryKey: QK.it.projects({ page: 1, limit: 100 }),
    queryFn: () => itApi.getProjects(token, { page: 1, limit: 100 }),
    enabled,
    select: (res) => res?.data?.projects || res?.projects || [],
  });
  const projects = projectsQuery.data || [];

  useEffect(() => {
    if (!projectsQuery.isSuccess || selectedProjectId) return;
    const stored = localStorage.getItem('it_activeProjectId');
    const def = stored && projects.find((p) => p._id === stored) ? stored : projects[0]?._id || '';
    if (def) setSelectedProjectId(def);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectsQuery.isSuccess, projects]);

  // The 6-endpoint dashboard bundle — replaces the old hand-rolled
  // cacheRef/CACHE_TTL local cache with React Query's real cross-navigation
  // cache. Note: selectedProjectId only scopes the cache key here (matching
  // the previous behaviour exactly) — none of these endpoints actually take a
  // projectId param today, so switching projects doesn't change the fetched
  // data; preserved as-is rather than "fixed" as part of a caching pass.
  const [dashboardQuery, monitoringQuery, overviewQuery, backupQuery, ticketsQuery, infraQuery] = useQueries({
    queries: [
      { queryKey: [...QK.it.dashboard(), selectedProjectId || 'global'], queryFn: () => itApi.getDashboard(token), enabled },
      { queryKey: QK.it.monitoring(), queryFn: () => itApi.getMonitoring(token), enabled },
      { queryKey: QK.it.overview(), queryFn: () => itApi.getSystemOverview(token), enabled },
      { queryKey: QK.it.backupRecovery(), queryFn: () => itApi.getBackupRecovery(token), enabled },
      { queryKey: QK.it.tickets(RECENT_TICKETS_PARAMS), queryFn: () => itApi.getSupportTickets(token, RECENT_TICKETS_PARAMS), enabled },
      { queryKey: QK.it.infrastructure(), queryFn: () => itApi.getInfrastructureSummary(token), enabled },
    ],
  });

  const unwrap = (r) => r?.data ?? r ?? {};
  const loading = [dashboardQuery, monitoringQuery, overviewQuery, backupQuery, ticketsQuery, infraQuery].some((q) => q.isLoading);
  const dash = unwrap(dashboardQuery.data);
  const kpis = unwrap(monitoringQuery.data)?.kpis || {};
  const overview = unwrap(overviewQuery.data);
  const backup = unwrap(backupQuery.data);
  const infra = unwrap(infraQuery.data);
  const ticketsData = unwrap(ticketsQuery.data);

  // Recent tickets — backend returns items or tickets depending on version
  const ticketItems = ticketsData?.items || ticketsData?.tickets || [];

  // Ticket trend chart data
  const ticketTrend = unwrap(monitoringQuery.data)?.trends?.ticketTrend || [3, 5, 4, 7, 6, 8, 5];
  const maxTrend = Math.max(...ticketTrend, 1);

  // Services for health chart
  const services = infra?.services || [
    { name: 'Auth Service', status: 'healthy' },
    { name: 'API Gateway', status: 'healthy' },
    { name: 'Notification Queue', status: 'healthy' },
    { name: 'Audit Pipeline', status: 'healthy' },
  ];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['it'] });
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">

        {/* ── Page Header ───────────────────────────────────────────── */}
        <PageHdr
          title="IT Command Center"
          subtitle="Infrastructure, security, operations and service desk overview"
          action={
            <div className="flex items-center gap-2">
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  if (e.target.value) localStorage.setItem('it_activeProjectId', e.target.value);
                }}
                className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-amber-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
              >
                <option value="">{projects.length ? 'All projects' : 'No projects'}</option>
                {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
              </select>
              <button
                type="button"
                onClick={refresh}
                className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300"
              >
                <span className="material-symbols-outlined text-[16px]">refresh</span>
                Refresh
              </button>
            </div>
          }
        />

        {/* ── 4 KPI Stat Cards ──────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard
            icon="dns"
            label="Active Systems"
            value={kpis.activeSystems || 0}
            color="bg-amber-600"
            loading={loading}
          />
          <StatCard
            icon="support_agent"
            label="Open Tickets"
            value={kpis.ticketsOpen || dash.openTickets || 0}
            color="bg-rose-500"
            loading={loading}
          />
          <StatCard
            icon="devices"
            label="Total Users"
            value={overview.activeUsers || 0}
            color="bg-cyan-600"
            loading={loading}
          />
          <StatCard
            icon="shield"
            label="Security Alerts"
            value={kpis.securityAlerts || overview.securityAlerts || 0}
            color="bg-emerald-600"
            loading={loading}
          />
        </div>

        {/* ── Secondary Stats Row ───────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { icon: 'memory',        label: 'Server Load',      value: `${kpis.serverLoad || 0}%` },
            { icon: 'link',          label: 'API Health',       value: overview.apiHealth || 'healthy' },
            { icon: 'backup',        label: 'Backup Status',    value: backup.backupHealth || 'active' },
            { icon: 'warning',       label: 'Critical Tickets', value: dash.criticalTickets || 0 },
          ].map(({ icon, label, value }) => (
            <Card key={label}>
              <Inner className="flex items-center gap-3 py-4">
                <span className="material-symbols-outlined text-[22px] text-amber-500">{icon}</span>
                <div>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">{label}</p>
                  <p className="text-sm font-bold text-neutral-900 dark:text-white">
                    {loading ? '—' : value}
                  </p>
                </div>
              </Inner>
            </Card>
          ))}
        </div>

        {/* ── Modules Navigation Grid ───────────────────────────────── */}
        <Card>
          <Inner>
            <p className="mb-4 text-sm font-semibold text-neutral-900 dark:text-white">IT Modules</p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              {MODULES.map((mod) => (
                <button
                  key={mod.id}
                  type="button"
                  onClick={() => navigate(mod.path)}
                  className="group rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center transition hover:border-amber-300 hover:bg-amber-50 dark:border-neutral-800 dark:bg-neutral-900 dark:hover:border-amber-700 dark:hover:bg-amber-950/20"
                >
                  <span className="material-symbols-outlined text-[28px] text-neutral-500 group-hover:text-amber-600 dark:text-neutral-400 dark:group-hover:text-amber-400">
                    {mod.icon}
                  </span>
                  <p className="mt-2 text-xs font-semibold text-neutral-700 group-hover:text-amber-700 dark:text-neutral-300 dark:group-hover:text-amber-300">
                    {mod.label}
                  </p>
                </button>
              ))}
            </div>
          </Inner>
        </Card>

        {/* ── Charts Row ────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Ticket trend bar chart */}
          <Card>
            <Inner>
              <p className="mb-1 text-sm font-semibold text-neutral-900 dark:text-white">Ticket Trend</p>
              <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">New tickets — last 7 days</p>
              {loading ? (
                <div className="h-28 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />
              ) : (
                <div className="flex items-end gap-1.5" style={{ height: '96px' }}>
                  {ticketTrend.map((val, i) => (
                    <div key={i} className="flex flex-1 flex-col items-center gap-1">
                      <span className="text-[10px] font-semibold text-neutral-500">{val}</span>
                      <div
                        className="w-full rounded-t-lg bg-amber-500 transition-all dark:bg-amber-600"
                        style={{ height: `${Math.max(4, Math.round((val / maxTrend) * 60))}px` }}
                      />
                      <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{WEEK_DAYS[i]}</span>
                    </div>
                  ))}
                </div>
              )}
            </Inner>
          </Card>

          {/* System health */}
          <Card>
            <Inner>
              <p className="mb-1 text-sm font-semibold text-neutral-900 dark:text-white">System Health</p>
              <p className="mb-4 text-xs text-neutral-500 dark:text-neutral-400">Core service status</p>
              {loading ? (
                <SkeletonRows rows={4} />
              ) : (
                <div className="space-y-3">
                  {services.map((svc) => (
                    <div key={svc.name} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-neutral-400">circle</span>
                        <p className="text-sm text-neutral-700 dark:text-neutral-300">{svc.name}</p>
                      </div>
                      <Pill value={svc.status} />
                    </div>
                  ))}
                  <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Infrastructure Score</p>
                    <p className="text-sm font-bold text-neutral-900 dark:text-white">
                      {loading ? '—' : `${Math.max(58, 100 - (kpis.downtimeMinutes || 0) / 10)}%`}
                    </p>
                  </div>
                </div>
              )}
            </Inner>
          </Card>
        </div>

        {/* ── Recent Tickets Table ──────────────────────────────────── */}
        <Card>
          <Inner>
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Recent Tickets</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Latest service desk activity</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/it/dashboard/tickets')}
                className="flex items-center gap-1 text-xs font-semibold text-amber-600 hover:underline dark:text-amber-400"
              >
                View all <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>

            {loading ? (
              <SkeletonRows rows={5} />
            ) : ticketItems.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-700">support_agent</span>
                <p className="font-semibold text-neutral-600 dark:text-neutral-300">No tickets yet</p>
                <p className="text-sm text-neutral-400 dark:text-neutral-500">Service desk queue is clear</p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
                <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                  <thead className="bg-neutral-50 dark:bg-neutral-900">
                    <tr>
                      {['Title', 'Priority', 'Status', 'Requester', 'Created'].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {ticketItems.map((t) => (
                      <tr
                        key={t._id}
                        className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-900/50"
                        onClick={() => navigate(`/it/dashboard/tickets/${t._id}`)}
                      >
                        <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">
                          {t.title || '—'}
                        </td>
                        <td className="px-4 py-3"><Pill value={t.priority} /></td>
                        <td className="px-4 py-3"><Pill value={t.status} /></td>
                        <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">
                          {`${t.requester?.firstName || ''} ${t.requester?.lastName || ''}`.trim() || '—'}
                        </td>
                        <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{fmtDate(t.createdAt)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Inner>
        </Card>

      </div>
    </main>
  );
};

export default ITDashboard;
