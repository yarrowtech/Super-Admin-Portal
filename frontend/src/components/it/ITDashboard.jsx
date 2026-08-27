import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { itApi } from '../../services/it';
import { useAuth } from '../../context/AuthContext';
import { QK } from '../../utils/queryKeys';
import statusToTone from '../../utils/statusTone';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import AttentionPanel from '../common/AttentionPanel';
import QuickActions from '../common/QuickActions';
import SectionCard from '../ui/SectionCard';
import DataTable from '../ui/DataTable';

// ─── IT Command Center — systems / tickets / security overview ───────────────

// Ticket priority is a severity axis, not a record-status string, so it isn't
// covered by the shared statusToTone() vocabulary (approved/pending/rejected…).
// Map it directly onto the same fixed tone set instead of inventing new colors.
const PRIORITY_TONE = { critical: 'danger', high: 'warning', medium: 'info', low: 'neutral' };
const priorityTone = (priority) => PRIORITY_TONE[String(priority || '').toLowerCase()] || 'neutral';

const MODULES = [
  { id: 'products',       label: 'Products',       icon: 'inventory_2',     path: '/it/dashboard/products' },
  { id: 'tickets',        label: 'Service Desk',   icon: 'support_agent',   path: '/it/dashboard/tickets' },
  { id: 'assets',         label: 'Assets',          icon: 'devices',         path: '/it/dashboard/assets' },
  { id: 'operations',     label: 'Operations',     icon: 'dns',             path: '/it/dashboard/operations' },
  { id: 'activity',       label: 'Activity Logs',  icon: 'history',         path: '/it/dashboard/activity' },
  { id: 'support-center', label: 'Support Center', icon: 'contact_support', path: '/it/dashboard/support-center' },
];

const WEEK_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const RECENT_TICKETS_PARAMS = { page: 1, limit: 8, sortBy: 'createdAt', sortOrder: 'desc' };

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
};

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
  const refreshing = !loading && [dashboardQuery, monitoringQuery, overviewQuery, backupQuery, ticketsQuery, infraQuery].some((q) => q.isFetching);
  const dash = unwrap(dashboardQuery.data);
  const kpis = unwrap(monitoringQuery.data)?.kpis || {};
  const overview = unwrap(overviewQuery.data);
  const backup = unwrap(backupQuery.data);
  const infra = unwrap(infraQuery.data);
  const ticketsData = unwrap(ticketsQuery.data);

  // Recent tickets — backend returns items or tickets depending on version
  const ticketItems = ticketsData?.items || ticketsData?.tickets || [];

  // Ticket trend chart data — no fabricated fallback; an empty response
  // collapses to the section's empty state instead of fake bars.
  const ticketTrend = unwrap(monitoringQuery.data)?.trends?.ticketTrend || [];
  const maxTrend = Math.max(...ticketTrend, 1);

  // Services for health chart — no fabricated fallback list.
  const services = infra?.services || [];

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['it'] });
  };

  // ── Needs Attention — built only from data already fetched above:
  // open critical/high-priority tickets (from the recent-tickets fetch — this
  // dashboard doesn't fetch a dedicated "all critical tickets" list, so this
  // reflects the most recent 8 tickets only) and any infrastructure service
  // that isn't reporting healthy. Backup health is intentionally excluded —
  // the backend endpoint always returns a static "active" status today, so
  // there is no real failure signal to surface.
  const attentionTicketItems = ticketItems
    .filter((t) => ['critical', 'high'].includes(String(t.priority || '').toLowerCase()) && !['resolved', 'closed'].includes(String(t.status || '').toLowerCase()))
    .map((t) => ({
      id: t._id,
      label: t.title || 'Untitled ticket',
      context: `${t.category || 'General'} · ${`${t.requester?.firstName || ''} ${t.requester?.lastName || ''}`.trim() || 'Unassigned requester'}`,
      tone: t.priority === 'critical' ? 'danger' : 'warning',
      statusLabel: t.status,
      actionLabel: 'View queue',
      onAction: () => navigate(`/it/dashboard/tickets?priority=${t.priority}&status=${t.status}`),
    }));

  const attentionServiceItems = services
    .filter((svc) => !['healthy', 'active'].includes(String(svc.status || '').toLowerCase()))
    .map((svc) => ({
      id: `service-${svc.name}`,
      label: svc.name,
      context: 'Service health degraded',
      tone: 'warning',
      statusLabel: svc.status,
      actionLabel: 'View Operations',
      onAction: () => navigate('/it/dashboard/operations'),
    }));

  const attentionItems = [...attentionTicketItems, ...attentionServiceItems].sort(
    (a, b) => (a.tone === 'danger' ? -1 : 0) - (b.tone === 'danger' ? -1 : 0)
  );

  const attentionError = ticketsQuery.isError ? ticketsQuery.error : infraQuery.isError ? infraQuery.error : null;

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">

        {/* ── Page Header ───────────────────────────────────────────── */}
        <PortalHeader
          title="IT Command Center"
          subtitle="Infrastructure, security, operations and service desk overview"
          icon="memory"
          user={user}
          onRefresh={refresh}
          refreshing={refreshing}
          actions={
            <select
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                if (e.target.value) localStorage.setItem('it_activeProjectId', e.target.value);
              }}
              className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-900 outline-none transition focus:border-(--portal-accent) dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
            >
              <option value="">{projects.length ? 'All projects' : 'No projects'}</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          }
        />

        {/* ── Quick Actions ─────────────────────────────────────────── */}
        <QuickActions
          actions={[
            { label: 'View Tickets', icon: 'support_agent', onClick: () => navigate('/it/dashboard/tickets') },
            { label: 'Support Center', icon: 'contact_support', onClick: () => navigate('/it/dashboard/support-center') },
            { label: 'Assets', icon: 'devices', onClick: () => navigate('/it/dashboard/assets') },
          ]}
        />

        {/* ── Primary KPIs ──────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard
            title="Active Systems"
            value={loading ? '—' : (kpis.activeSystems || 0)}
            icon="dns"
            tone="info"
          />
          <KPICard
            title="Open Tickets"
            value={loading ? '—' : (kpis.ticketsOpen || dash.openTickets || 0)}
            icon="support_agent"
            tone="warning"
            action={{ label: 'View tickets →', onClick: () => navigate('/it/dashboard/tickets') }}
          />
          <KPICard
            title="Total Users"
            value={loading ? '—' : (overview.activeUsers || 0)}
            icon="group"
            tone="accent"
          />
          <KPICard
            title="Security Alerts"
            value={loading ? '—' : (kpis.securityAlerts || overview.securityAlerts || 0)}
            icon="shield"
            tone={(kpis.securityAlerts || overview.securityAlerts || 0) > 0 ? 'danger' : 'success'}
          />
        </div>

        {/* ── Secondary KPIs ────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard
            priority="secondary"
            title="Server Load"
            value={loading ? '—' : `${kpis.serverLoad || 0}%`}
            icon="memory"
            tone={(kpis.serverLoad || 0) >= 80 ? 'danger' : (kpis.serverLoad || 0) >= 60 ? 'warning' : 'success'}
          />
          <KPICard
            priority="secondary"
            title="API Health"
            value={loading ? '—' : (overview.apiHealth || 'unknown')}
            icon="link"
            tone={overview.apiHealth === 'healthy' ? 'success' : 'warning'}
          />
          <KPICard
            priority="secondary"
            title="Backup Status"
            value={loading ? '—' : (backup.backupHealth || 'unknown')}
            icon="backup"
            tone={backup.backupHealth === 'active' ? 'success' : 'warning'}
          />
          <KPICard
            priority="secondary"
            title="Critical Tickets"
            value={loading ? '—' : (dash.criticalTickets || 0)}
            icon="warning"
            tone={(dash.criticalTickets || 0) > 0 ? 'danger' : 'success'}
            action={{ label: 'View →', onClick: () => navigate('/it/dashboard/tickets?priority=critical') }}
          />
        </div>

        {/* ── Needs Attention ───────────────────────────────────────── */}
        <AttentionPanel
          title="Needs Attention"
          items={attentionItems}
          loading={loading}
          error={attentionError}
          onRetry={refresh}
          emptyTitle="Nothing needs attention"
          emptyDescription="No open critical/high-priority tickets, and all services are healthy."
          onViewAll={() => navigate('/it/dashboard/tickets')}
          viewAllLabel="View all tickets"
        />

        {/* ── Modules Navigation Grid ───────────────────────────────── */}
        <SectionCard title="IT Modules" icon="apps" description="Jump into a specific workspace">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {MODULES.map((mod) => (
              <button
                key={mod.id}
                type="button"
                onClick={() => navigate(mod.path)}
                className="group rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-center transition hover:border-(--portal-accent) hover:bg-(--portal-accent-soft) dark:border-neutral-800 dark:bg-neutral-900"
              >
                <span className="material-symbols-outlined text-[28px] text-neutral-500 group-hover:text-(--portal-accent) dark:text-neutral-400">
                  {mod.icon}
                </span>
                <p className="mt-2 text-xs font-semibold text-neutral-700 group-hover:text-(--portal-accent) dark:text-neutral-300">
                  {mod.label}
                </p>
              </button>
            ))}
          </div>
        </SectionCard>

        {/* ── Charts Row ────────────────────────────────────────────── */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Ticket trend bar chart — hand-rolled, kept as-is per design brief */}
          <SectionCard
            title="Ticket Trend"
            icon="show_chart"
            description="New tickets — last 7 days"
            loading={loading}
            error={monitoringQuery.isError ? monitoringQuery.error : null}
            onRetry={refresh}
            empty={!loading && !monitoringQuery.isError && ticketTrend.length === 0}
            emptyIcon="show_chart"
            emptyTitle="No trend data"
            emptyDescription="Ticket trend data isn't available yet."
          >
            <div className="flex items-end gap-1.5" style={{ height: '96px' }}>
              {ticketTrend.map((val, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-1">
                  <span className="text-[10px] font-semibold text-neutral-500">{val}</span>
                  <div
                    className="w-full rounded-t-lg bg-(--portal-accent) transition-all"
                    style={{ height: `${Math.max(4, Math.round((val / maxTrend) * 60))}px` }}
                  />
                  <span className="text-[10px] text-neutral-400 dark:text-neutral-500">{WEEK_DAYS[i] || ''}</span>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* System health */}
          <SectionCard
            title="System Health"
            icon="monitor_heart"
            description="Core service status"
            loading={loading}
            error={infraQuery.isError ? infraQuery.error : null}
            onRetry={refresh}
            empty={!loading && !infraQuery.isError && services.length === 0}
            emptyIcon="monitor_heart"
            emptyTitle="No service data"
            emptyDescription="Service health data isn't available yet."
          >
            <div className="space-y-3">
              {services.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between gap-3">
                  <p className="text-sm text-neutral-700 dark:text-neutral-300">{svc.name}</p>
                  <StatusBadge tone={statusToTone(svc.status)} label={svc.status || 'Unknown'} />
                </div>
              ))}
              <div className="mt-2 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
                <p className="text-xs text-neutral-500 dark:text-neutral-400">Infrastructure Score</p>
                <p className="text-sm font-bold text-neutral-900 dark:text-white">
                  {`${Math.max(58, 100 - (kpis.downtimeMinutes || 0) / 10)}%`}
                </p>
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ── Recent Tickets Table ──────────────────────────────────── */}
        <SectionCard
          title="Recent Tickets"
          icon="confirmation_number"
          description="Latest service desk activity"
          action={{ label: 'View all', onClick: () => navigate('/it/dashboard/tickets') }}
          loading={loading}
          error={ticketsQuery.isError ? ticketsQuery.error : null}
          onRetry={refresh}
          empty={!loading && !ticketsQuery.isError && ticketItems.length === 0}
          emptyIcon="support_agent"
          emptyTitle="No tickets yet"
          emptyDescription="Service desk queue is clear."
          noBodyPadding
        >
          <DataTable
            columns={[
              { key: 'title', header: 'Title', render: (t) => <span className="font-semibold text-neutral-900 dark:text-white">{t.title || '—'}</span> },
              { key: 'priority', header: 'Priority', render: (t) => <StatusBadge tone={priorityTone(t.priority)} label={t.priority || 'Unknown'} /> },
              { key: 'status', header: 'Status', render: (t) => <StatusBadge tone={statusToTone(t.status)} label={t.status || 'Unknown'} /> },
              { key: 'requester', header: 'Requester', render: (t) => `${t.requester?.firstName || ''} ${t.requester?.lastName || ''}`.trim() || '—' },
              { key: 'createdAt', header: 'Created', render: (t) => fmtDate(t.createdAt) },
            ]}
            rows={ticketItems}
            rowKey="_id"
            onRowClick={(row) => navigate(`/it/dashboard/tickets/${row._id}`)}
          />
        </SectionCard>

      </div>
    </main>
  );
};

export default ITDashboard;
