import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import { itApi } from '../../services/it';
import { outsourcingApi } from '../../services/outsourcing';
import { resolveCanonicalProjects } from '../../config/projectNames';
import { useAuth } from '../../context/AuthContext';
import ITDashboard from './ITDashboard';

// ─── Design Tokens ────────────────────────────────────────────────────────────

const card = 'rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950';
const inner = 'p-5 lg:p-6';
const statBox = 'rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900';

const tone = {
  open:          'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  'in-progress': 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  resolved:      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  closed:        'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  critical:      'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  high:          'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  medium:        'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  low:           'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  active:        'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  healthy:       'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  degraded:      'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  warning:       'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  maintenance:   'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  retired:       'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  planning:      'bg-blue-50 text-blue-700 ring-blue-200',
  completed:     'bg-emerald-50 text-emerald-700 ring-emerald-200',
};

const Pill = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[String(value || '').toLowerCase().replace(/[\s-]+/g, '_').replace(/_+$/, '')] || tone.low}`}>
    {String(value || 'Unknown')}
  </span>
);

const SectionHdr = ({ title, subtitle, action }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <p className="text-sm font-semibold text-neutral-900 dark:text-white">{title}</p>
      {subtitle && <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{subtitle}</p>}
    </div>
    {action}
  </div>
);

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtDate = (v) => {
  if (!v) return '—';
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const fmtBytes = (v) => {
  const n = Number(v || 0);
  if (!n) return '0 B';
  const u = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.min(Math.floor(Math.log(n) / Math.log(1024)), u.length - 1);
  return `${(n / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${u[i]}`;
};

const toText = (v) => {
  if (v === null || v === undefined) return '—';
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
};

// Unwrap the standard API envelope: { success, data: { ... } } → { ... }
const unwrap = (res) => res?.data ?? res ?? {};

// ─── Shared Sub-components ────────────────────────────────────────────────────

const StatGrid = ({ items }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <div key={item.label} className={statBox}>
        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{item.label}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{item.value ?? '—'}</p>
        {item.subtext && <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{item.subtext}</p>}
      </div>
    ))}
  </div>
);

const Header = ({ title, subtitle, icon, user, crumbs = [], actions = null }) => (
  <PortalHeader title={title} subtitle={subtitle} user={user} icon={icon} showSearch={false} showNotifications showThemeToggle>
    {crumbs.map((crumb) => (
      <span key={crumb} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-neutral-700 shadow-sm dark:bg-neutral-800 dark:text-neutral-200">
        {crumb}
      </span>
    ))}
    {actions}
  </PortalHeader>
);

const TabBar = ({ tabs, active, onChange }) => (
  <div className="flex flex-wrap gap-2 border-b border-neutral-200 pb-3 dark:border-neutral-800">
    {tabs.map((t) => (
      <button
        key={t.id}
        type="button"
        onClick={() => onChange(t.id)}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${active === t.id ? 'bg-amber-600 text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300 dark:hover:bg-neutral-700'}`}
      >
        {t.label}
      </button>
    ))}
  </div>
);

// ─── useAsync hook — properly unwraps API envelope ────────────────────────────

const useAsync = (loader, deps = []) => {
  const [state, setState] = useState({ loading: true, error: '', data: {} });
  useEffect(() => {
    let alive = true;
    setState((prev) => ({ ...prev, loading: true, error: '' }));
    const run = async () => {
      try {
        const raw = await loader();
        // Unwrap standard envelope: { success, data: { ... } } → { ... }
        const payload = unwrap(raw);
        if (alive) setState({ loading: false, error: '', data: payload });
      } catch (err) {
        if (alive) setState({ loading: false, error: err.message || 'Failed to load data', data: {} });
      }
    };
    run();
    return () => { alive = false; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
};

const SkeletonRows = ({ n = 4 }) => (
  <div className="space-y-3">
    {Array.from({ length: n }).map((_, i) => (
      <div key={i} className="animate-pulse rounded-xl border border-neutral-200 p-4 dark:border-neutral-800">
        <div className="mb-2 h-4 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800" />
        <div className="h-3 w-2/3 rounded bg-neutral-100 dark:bg-neutral-800" />
      </div>
    ))}
  </div>
);

const PRODUCT_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'users', label: 'Team' },
  { id: 'access', label: 'Access' },
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'resources', label: 'Resources' },
  { id: 'support', label: 'Support' },
  { id: 'ai-usage', label: 'AI Usage' },
  { id: 'analytics', label: 'Analytics' },
  { id: 'activity-logs', label: 'Activity' },
  { id: 'settings', label: 'Settings' },
];

// ─── Pages ────────────────────────────────────────────────────────────────────

export const ITOverviewPage = () => <ITDashboard />;

// ── Products & Systems ──────────────────────────────────────────────────────

const PRODUCT_ACCENTS = [
  'from-blue-500 to-cyan-500',
  'from-violet-500 to-fuchsia-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-pink-500 to-rose-500',
  'from-indigo-500 to-purple-500',
];

const hasAccess = (p) => Boolean(p?.access?.canLaunch || p?.accessGranted || p?.access?.canUseApi || p?.code === 'EEC');

export const ITProductsPage = () => {
  const { token, user } = useAuth();
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [projects, setProjects] = useState([]);
  const [query, setQuery]       = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await outsourcingApi.getMyProjects(token);
      const raw = res?.data?.projects || res?.projects || [];
      setProjects(resolveCanonicalProjects(raw));
    } catch (e) {
      setError(e?.message || 'Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.code, p.description, p.status].filter(Boolean).some((v) => String(v).toLowerCase().includes(q))
    );
  }, [projects, query]);

  const accessible = projects.filter(hasAccess).length;
  const blocked    = projects.filter((p) => !hasAccess(p)).length;

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title="Products & Systems"
          subtitle="Canonical product registry — admin-configured workspaces"
          icon="inventory_2"
          user={user}
          crumbs={['IT', 'Products & Systems']}
          actions={
            <Button variant="secondary" size="sm" onClick={load}>
              <span className="material-symbols-outlined text-[16px]">refresh</span> Refresh
            </Button>
          }
        />

        {/* Summary stats */}
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Total Products',  value: projects.length, color: 'bg-amber-600' },
            { label: 'Accessible',      value: accessible,       color: 'bg-emerald-600' },
            { label: 'Blocked',         value: blocked,          color: 'bg-rose-500' },
            { label: 'Active',          value: projects.filter((p) => p.status === 'active').length, color: 'bg-cyan-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${card} relative overflow-hidden`}>
              <div className={`absolute inset-x-0 top-0 h-1 ${color}`} />
              <div className={inner}>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
                {loading
                  ? <div className="mt-2 h-8 w-12 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
                  : <p className="mt-2 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{value}</p>}
              </div>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-sm">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search products…"
              className="h-10 w-full rounded-xl border border-neutral-200 bg-white pl-9 pr-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
            />
          </div>
        </div>

        {error && (
          <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        )}

        {/* Product cards */}
        {loading ? (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-52 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className={card}>
            <div className={inner}>
              <EmptyState icon="inventory_2" title="No products found" description="Try a different search." />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((project, i) => {
              const canOpen = hasAccess(project) && project.code !== 'EFNBMMS';
              const isEfnbmms = project.code === 'EFNBMMS';
              const accent = PRODUCT_ACCENTS[i % PRODUCT_ACCENTS.length];
              return (
                <section
                  key={project.code}
                  className={`${card} relative flex min-h-[220px] flex-col overflow-hidden p-0`}
                >
                  {/* Colored accent bar */}
                  <div className={`h-1.5 w-full bg-gradient-to-r ${accent}`} />

                  <div className="flex h-full flex-col p-4">
                    {/* Name + code + badge */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-xl font-black tracking-tight text-neutral-900 dark:text-white">
                            {project.name}
                          </h3>
                          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                            {project.code}
                          </span>
                        </div>
                        {project.description && (
                          <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{project.description}</p>
                        )}
                      </div>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${hasAccess(project) ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300' : 'bg-rose-50 text-rose-700 dark:bg-rose-900/20 dark:text-rose-300'}`}>
                        {isEfnbmms ? 'API Access' : hasAccess(project) ? 'Accessible' : 'Blocked'}
                      </span>
                    </div>

                    {/* Role / Status */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-900">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Role</p>
                        <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">{user?.role || project.role || 'admin'}</p>
                      </div>
                      <div className="rounded-xl bg-neutral-50 p-2.5 dark:bg-neutral-900">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-neutral-400">Status</p>
                        <p className="mt-0.5 text-sm font-semibold text-neutral-900 dark:text-white">{project.status || 'active'}</p>
                      </div>
                    </div>

                    {/* Access status strip */}
                    <div className="mt-3 rounded-xl border border-neutral-200 bg-neutral-50/70 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
                      <div className="flex items-center gap-2">
                        <span className={`h-2.5 w-2.5 rounded-full ${hasAccess(project) ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                        <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                          {canOpen ? 'Ready to open' : isEfnbmms ? 'Admin management API only' : 'Access blocked'}
                        </p>
                      </div>
                      <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">
                        {canOpen ? 'Open now' : isEfnbmms ? 'Website launch is disabled' : project.access?.blockedReason || 'No access assigned'}
                      </p>
                    </div>

                    {/* Action button */}
                    <div className="mt-auto pt-4">
                      {isEfnbmms ? (
                        <button
                          type="button"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                          onClick={() => window.open('', '_blank')}
                        >
                          <span className="material-symbols-outlined text-[18px]">storage</span>
                          View API data
                        </button>
                      ) : canOpen ? (
                        <a
                          href={project.launchUrl || '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-blue-700"
                        >
                          <span className="material-symbols-outlined text-[18px]">open_in_new</span>
                          Open {project.code === 'EEC' ? 'EEC' : ''}
                        </a>
                      ) : (
                        <button
                          type="button"
                          disabled
                          className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-2xl bg-neutral-100 px-4 py-3 text-sm font-semibold text-neutral-400 dark:bg-neutral-800 dark:text-neutral-500"
                        >
                          <span className="material-symbols-outlined text-[18px]">lock</span>
                          Access Restricted
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

// ── Product Workspace ────────────────────────────────────────────────────────

export const ITProductWorkspacePage = () => {
  const { token, user } = useAuth();
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';

  const { loading, error, data } = useAsync(async () => {
    const [projectRes, assetsRes, ticketsRes, accessRes, infraRes, auditRes, backupRes] = await Promise.all([
      itApi.getProjectById(token, projectId),
      itApi.getModuleAssets(token, { projectId, limit: 20 }),
      itApi.getModuleTickets(token, { projectId, limit: 20 }),
      itApi.getUserAccessSummary(token),
      itApi.getInfrastructureSummary(token),
      itApi.getAuditLogs(token, { page: 1, limit: 20 }),
      itApi.getBackupRecovery(token),
    ]);
    return {
      project: unwrap(projectRes),
      assets:  unwrap(assetsRes),
      tickets: unwrap(ticketsRes),
      access:  unwrap(accessRes),
      infra:   unwrap(infraRes),
      audit:   unwrap(auditRes),
      backup:  unwrap(backupRes),
    };
  }, [token, projectId]);

  const project     = data.project  || {};
  const assets      = data.assets?.items  || [];
  const tickets     = data.tickets?.items || [];
  const audit       = data.audit?.items   || [];
  const teamMembers = project.teamMembers || [];
  const access      = data.access || {};
  const infra       = data.infra  || {};
  const backup      = data.backup || {};

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next);
  };

  const tabContent = {
    overview: (
      <StatGrid items={[
        { label: 'Status',         value: project.status   || 'active' },
        { label: 'Health Score',   value: `${project.healthScore || 0}%` },
        { label: 'Progress',       value: `${project.progress ?? 0}%` },
        { label: 'Open Issues',    value: tickets.filter((t) => !['resolved', 'closed'].includes(t.status)).length },
        { label: 'Assets',         value: assets.length },
        { label: 'Security Alerts', value: 0 },
      ]} />
    ),
    users: teamMembers.length ? (
      <div className="grid gap-3 md:grid-cols-2">
        {teamMembers.map((m) => (
          <div key={m._id || m.employee?._id} className={statBox}>
            <p className="font-semibold text-neutral-900 dark:text-white">
              {m.employee?.firstName || 'Team member'} {m.employee?.lastName || ''}
            </p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{m.role || 'Member'}</p>
          </div>
        ))}
      </div>
    ) : <EmptyState icon="groups" title="No team members linked" description="Project team members will appear when configured." />,
    access: (
      <StatGrid items={[
        { label: 'Total Users',      value: access.totalUsers      || 0 },
        { label: 'Temporary Access', value: access.temporaryAccess || 0 },
        { label: 'Blocked Users',    value: access.blockedUsers    || 0 },
        { label: 'Role Buckets',     value: (access.roleBreakdown || []).length },
      ]} />
    ),
    infrastructure: (
      <div className="grid gap-3 md:grid-cols-2">
        <div className={statBox}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Project Code</p><p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{project.projectCode || '—'}</p></div>
        <div className={statBox}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Technologies</p><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{(project.technologies || []).join(', ') || '—'}</p></div>
        <div className={statBox}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Server CPU</p><p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{infra?.serverHealth?.cpu || 0}%</p></div>
        <div className={statBox}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Backup Health</p><p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{backup.backupHealth || 'active'}</p></div>
      </div>
    ),
    resources: assets.length ? (
      <DataTable
        columns={[
          { key: 'assetTag', header: 'Tag' },
          { key: 'name',     header: 'Name' },
          { key: 'type',     header: 'Type' },
          { key: 'status',   header: 'Status', render: (r) => <Pill value={r.status} /> },
        ]}
        rows={assets}
        rowKey="_id"
      />
    ) : <EmptyState icon="folder" title="No resources" description="Assets linked to this product will appear here." />,
    support: tickets.length ? (
      <DataTable
        columns={[
          { key: 'title',    header: 'Ticket',   render: (r) => <span className="font-semibold text-neutral-900 dark:text-white">{r.title}</span> },
          { key: 'priority', header: 'Priority', render: (r) => <Pill value={r.priority} /> },
          { key: 'status',   header: 'Status',   render: (r) => <Pill value={r.status} /> },
          { key: 'createdAt', header: 'Created', render: (r) => fmtDate(r.createdAt) },
        ]}
        rows={tickets}
        rowKey="_id"
      />
    ) : <EmptyState icon="support_agent" title="No support tickets" description="Support requests for this product will appear here." />,
    'ai-usage': (
      <StatGrid items={[
        { label: 'AI Requests', value: Math.max(0, tickets.length * 2) },
        { label: 'Adoption',    value: `${Math.min(100, 40 + (access.totalUsers || 0))}%` },
        { label: 'Performance', value: `${Math.max(50, 100 - tickets.length * 2)}%` },
      ]} />
    ),
    analytics: (
      <StatGrid items={[
        { label: 'Daily Usage',   value: Math.max(1, Math.round((access.totalUsers || 0) / 3)) },
        { label: 'Monthly Usage', value: Math.max(1, (access.totalUsers || 0) * 12) },
        { label: 'Storage',       value: fmtBytes(0) },
      ]} />
    ),
    'activity-logs': audit.length ? (
      <div className="space-y-2">
        {audit.map((row) => (
          <div key={row._id || row.id} className={statBox}>
            <p className="font-semibold text-neutral-900 dark:text-white">{row.action || 'Event'}</p>
            <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{row.module || 'it'} · {fmtDate(row.createdAt)}</p>
          </div>
        ))}
      </div>
    ) : <EmptyState icon="history" title="No audit history" description="Audit records for this product will show here." />,
    settings: (
      <div className="grid gap-3 md:grid-cols-2">
        <div className={statBox}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Owner</p><p className="mt-2 text-xl font-black text-neutral-900 dark:text-white">{project.projectManager?.firstName || '—'} {project.projectManager?.lastName || ''}</p></div>
        <div className={statBox}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Progress</p><p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{project.progress ?? 0}%</p></div>
        <div className={statBox}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">Start Date</p><p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{fmtDate(project.startDate)}</p></div>
        <div className={statBox}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500">End Date</p><p className="mt-2 text-sm font-bold text-neutral-900 dark:text-white">{fmtDate(project.endDate)}</p></div>
      </div>
    ),
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title={project.name || 'Product Workspace'}
          subtitle={project.description || 'Dedicated product operational workspace'}
          icon="inventory_2"
          user={user}
          crumbs={['IT', 'Products', project.name || 'Workspace']}
          actions={<NavLink to="/it/dashboard/products"><Button variant="secondary" size="sm">Back</Button></NavLink>}
        />
        {loading && <div className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />}
        {error && <EmptyState icon="error" title="Workspace failed to load" description={error} />}
        {!loading && !error && (
          <section className={card}>
            <div className={inner}>
              <div className="mb-5">
                <TabBar tabs={PRODUCT_TABS} active={tab} onChange={setTab} />
              </div>
              {tabContent[tab] || tabContent.overview}
            </div>
          </section>
        )}
      </div>
    </main>
  );
};

// ── IT Tickets (Service Desk) ────────────────────────────────────────────────

export const ITTicketsPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page     = Math.max(1, Number(searchParams.get('page')     || 1));
  const limit    = Math.max(5, Number(searchParams.get('limit')    || 10));
  const search   = searchParams.get('search')   || '';
  const status   = searchParams.get('status')   || '';
  const priority = searchParams.get('priority') || '';

  const { loading, error, data } = useAsync(
    () => itApi.getSupportTickets(token, { page, limit, search, status, priority, sortBy: 'createdAt', sortOrder: 'desc' }),
    [token, page, limit, search, status, priority],
  );

  const rows    = data.items   || data.tickets || [];
  const summary = data.summary || {};

  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, val);
    next.set('page', '1');
    setSearchParams(next);
  };

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', priority: 'medium', category: '' });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return;
    setSubmitting(true);
    try {
      await itApi.createSupportTicket(token, form);
      setShowForm(false);
      setForm({ title: '', description: '', priority: 'medium', category: '' });
      // Force re-fetch by changing a search param
      const next = new URLSearchParams(searchParams);
      next.set('_t', Date.now());
      setSearchParams(next);
    } catch {
      // error handled silently; form stays open
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title="Service Desk"
          subtitle="Support queue with priority, status and SLA tracking"
          icon="support_agent"
          user={user}
          crumbs={['IT', 'Service Desk']}
          actions={
            <Button variant="primary" size="sm" onClick={() => setShowForm(true)}>
              <span className="material-symbols-outlined text-[16px]">add</span> New Ticket
            </Button>
          }
        />

        <StatGrid items={[
          { label: 'Open',        value: summary.open        || 0 },
          { label: 'In Progress', value: summary.inProgress  || 0 },
          { label: 'Resolved',    value: summary.resolved    || 0 },
          { label: 'Closed',      value: summary.closed      || 0 },
        ]} />

        {/* New Ticket Form */}
        {showForm && (
          <section className={card}>
            <div className={inner}>
              <SectionHdr
                title="Create New Ticket"
                subtitle="Submit a service request or incident"
                action={
                  <button type="button" onClick={() => setShowForm(false)} className="text-neutral-400 hover:text-neutral-600">
                    <span className="material-symbols-outlined">close</span>
                  </button>
                }
              />
              <form onSubmit={handleCreate} className="grid gap-3 md:grid-cols-2">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Title *</label>
                  <input
                    required
                    value={form.title}
                    onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Brief description of the issue"
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Description</label>
                  <textarea
                    rows={3}
                    value={form.description}
                    onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                    placeholder="Additional details…"
                    className="w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold text-neutral-700 dark:text-neutral-300">Category</label>
                  <input
                    value={form.category}
                    onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                    placeholder="e.g. hardware, network, access"
                    className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                  />
                </div>
                <div className="flex gap-2 md:col-span-2">
                  <Button type="submit" variant="primary" size="sm" disabled={submitting}>
                    {submitting ? 'Submitting…' : 'Submit Ticket'}
                  </Button>
                  <Button type="button" variant="secondary" size="sm" onClick={() => setShowForm(false)}>Cancel</Button>
                </div>
              </form>
            </div>
          </section>
        )}

        {/* Filters + Table */}
        <section className={card}>
          <div className={inner}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(e) => setParam('search', e.target.value)}
                placeholder="Search tickets…"
                className="h-10 min-w-[16rem] rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <select
                value={status}
                onChange={(e) => setParam('status', e.target.value)}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
              <select
                value={priority}
                onChange={(e) => setParam('priority', e.target.value)}
                className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              >
                <option value="">All Priority</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <DataTable
              columns={[
                { key: 'title',    header: 'Ticket',    render: (r) => <span className="font-semibold text-neutral-900 dark:text-white">{r.title}</span> },
                { key: 'priority', header: 'Priority',  render: (r) => <Pill value={r.priority} /> },
                { key: 'status',   header: 'Status',    render: (r) => <Pill value={r.status} /> },
                { key: 'requester', header: 'Requester', render: (r) => `${r.requester?.firstName || ''} ${r.requester?.lastName || ''}`.trim() || '—' },
                { key: 'createdAt', header: 'Created',  render: (r) => fmtDate(r.createdAt) },
              ]}
              rows={rows}
              rowKey="_id"
              loading={loading}
              emptyTitle="No tickets found"
              onRowClick={(r) => navigate(`/it/dashboard/tickets/${r._id}`)}
            />
            {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          </div>
        </section>
      </div>
    </main>
  );
};

// ── Ticket Detail ────────────────────────────────────────────────────────────

export const ITTicketDetailPage = () => {
  const { token, user } = useAuth();
  const { ticketId } = useParams();
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();

  const { loading, error, data, } = useAsync(
    async () => ({ ticket: unwrap(await itApi.getSupportTicketById(token, ticketId)) }),
    [token, ticketId, searchParams.get('_r')],
  );

  const ticket   = data.ticket || {};
  const comments = Array.isArray(ticket.metadata?.comments) ? ticket.metadata.comments : [];

  const handleComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      await itApi.addTicketComment(token, ticketId, { comment });
      setComment('');
      const next = new URLSearchParams(searchParams);
      next.set('_r', Date.now());
      setSearchParams(next);
    } catch { /* silent */ } finally { setSubmitting(false); }
  };

  const handleAction = async (action) => {
    try {
      if (action === 'resolve') await itApi.resolveSupportTicket(token, ticketId, {});
      if (action === 'close')   await itApi.closeSupportTicket(token, ticketId);
      const next = new URLSearchParams(searchParams);
      next.set('_r', Date.now());
      setSearchParams(next);
    } catch { /* silent */ }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title={ticket.title || 'Ticket Detail'}
          subtitle="Service desk ticket workspace"
          icon="confirmation_number"
          user={user}
          crumbs={['IT', 'Service Desk', ticket.title || 'Ticket']}
          actions={<NavLink to="/it/dashboard/tickets"><Button variant="secondary" size="sm">Back</Button></NavLink>}
        />
        {loading && <div className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />}
        {error   && <EmptyState icon="error" title="Ticket failed to load" description={error} />}
        {!loading && !error && (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            {/* Left — ticket details + comments */}
            <div className="space-y-4">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Ticket Details" />
                  <StatGrid items={[
                    { label: 'Status',    value: ticket.status   || 'open' },
                    { label: 'Priority',  value: ticket.priority || 'medium' },
                    { label: 'Category',  value: ticket.category || '—' },
                    { label: 'Assignee',  value: `${ticket.assignedTo?.firstName || ''} ${ticket.assignedTo?.lastName || ''}`.trim() || '—' },
                  ]} />
                  {ticket.description && (
                    <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                      <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Description</p>
                      <p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{ticket.description}</p>
                    </div>
                  )}
                </div>
              </section>

              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Comments" subtitle={`${comments.length} comment${comments.length !== 1 ? 's' : ''}`} />
                  <div className="space-y-3">
                    {comments.length === 0 && (
                      <EmptyState icon="chat" title="No comments yet" description="Add a comment below to start the conversation." />
                    )}
                    {comments.map((c, i) => (
                      <div key={i} className={statBox}>
                        <p className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">{c.authorName || 'Team member'}</p>
                        <p className="mt-1 text-sm text-neutral-700 dark:text-neutral-200">{c.comment || c.body || '—'}</p>
                        <p className="mt-1 text-[10px] text-neutral-400">{fmtDate(c.commentedAt || c.at)}</p>
                      </div>
                    ))}
                  </div>
                  <form onSubmit={handleComment} className="mt-4 flex gap-2">
                    <input
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Add a comment…"
                      className="h-10 flex-1 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"
                    />
                    <Button type="submit" variant="primary" size="sm" disabled={submitting || !comment.trim()}>
                      {submitting ? '…' : 'Send'}
                    </Button>
                  </form>
                </div>
              </section>
            </div>

            {/* Right — timeline + actions */}
            <div className="space-y-4">
              <section className={card}>
                <div className={inner}>
                  <SectionHdr title="Timeline" />
                  <div className="space-y-2">
                    {[
                      ['Requester', `${ticket.requester?.firstName || ''} ${ticket.requester?.lastName || ''}`.trim() || '—'],
                      ['Created',   fmtDate(ticket.createdAt)],
                      ['Updated',   fmtDate(ticket.updatedAt)],
                      ['Resolved',  fmtDate(ticket.resolvedAt)],
                      ['Closed',    fmtDate(ticket.closedAt)],
                    ].map(([label, value]) => (
                      <div key={label} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              {!['resolved', 'closed'].includes(ticket.status) && (
                <section className={card}>
                  <div className={inner}>
                    <SectionHdr title="Actions" />
                    <div className="flex flex-col gap-2">
                      {ticket.status !== 'resolved' && (
                        <Button variant="primary" size="sm" onClick={() => handleAction('resolve')}>
                          <span className="material-symbols-outlined text-[16px]">check_circle</span> Mark Resolved
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => handleAction('close')}>
                        <span className="material-symbols-outlined text-[16px]">cancel</span> Close Ticket
                      </Button>
                    </div>
                  </div>
                </section>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

// ── Asset Management ─────────────────────────────────────────────────────────

export const ITAssetsPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page   = Math.max(1, Number(searchParams.get('page')   || 1));
  const limit  = Math.max(5, Number(searchParams.get('limit')  || 10));
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const type   = searchParams.get('type')   || '';

  const { loading, error, data } = useAsync(
    () => itApi.getAssets(token, { page, limit, search, status, type }),
    [token, page, limit, search, status, type],
  );

  const rows    = data.items   || [];
  const summary = data.summary || data.pagination || {};

  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, val);
    next.set('page', '1');
    setSearchParams(next);
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title="Asset Management"
          subtitle="Hardware, software and network asset registry with lifecycle tracking"
          icon="devices"
          user={user}
          crumbs={['IT', 'Asset Management']}
        />
        <StatGrid items={[
          { label: 'Total Assets',  value: summary.total       || rows.length },
          { label: 'Active',        value: summary.active       || 0 },
          { label: 'Maintenance',   value: summary.maintenance  || 0 },
          { label: 'Retired',       value: summary.retired      || 0 },
        ]} />
        <section className={card}>
          <div className={inner}>
            <div className="mb-4 flex flex-wrap items-center gap-3">
              <input
                value={search}
                onChange={(e) => setParam('search', e.target.value)}
                placeholder="Search assets…"
                className="h-10 min-w-[16rem] rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <select value={status} onChange={(e) => setParam('status', e.target.value)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="retired">Retired</option>
              </select>
              <select value={type} onChange={(e) => setParam('type', e.target.value)} className="h-10 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
                <option value="">All Types</option>
                <option value="hardware">Hardware</option>
                <option value="software">Software</option>
                <option value="network">Network</option>
              </select>
            </div>
            <DataTable
              columns={[
                { key: 'assetTag', header: 'Tag' },
                { key: 'name',     header: 'Name', render: (r) => <span className="font-semibold text-neutral-900 dark:text-white">{r.name}</span> },
                { key: 'type',     header: 'Type' },
                { key: 'status',   header: 'Status',      render: (r) => <Pill value={r.status} /> },
                { key: 'assignedTo', header: 'Assigned',  render: (r) => `${r.assignedTo?.firstName || ''} ${r.assignedTo?.lastName || ''}`.trim() || r.assignedTo || '—' },
                { key: 'createdAt', header: 'Added',      render: (r) => fmtDate(r.createdAt) },
              ]}
              rows={rows}
              rowKey="id"
              loading={loading}
              emptyTitle="No assets found"
              onRowClick={(r) => r._id && navigate(`/it/dashboard/assets/${r._id}`)}
            />
            {error && <p className="mt-3 text-sm text-rose-600 dark:text-rose-300">{error}</p>}
          </div>
        </section>
      </div>
    </main>
  );
};

// ── Asset Detail ─────────────────────────────────────────────────────────────

export const ITAssetDetailPage = () => {
  const { token, user } = useAuth();
  const { assetId } = useParams();
  const { loading, error, data } = useAsync(
    async () => ({ asset: unwrap(await itApi.getAssetById(token, assetId)) }),
    [token, assetId],
  );
  const asset = data.asset || {};
  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title={asset.name || 'Asset Detail'}
          subtitle="Asset profile — ownership, metadata and lifecycle"
          icon="devices"
          user={user}
          crumbs={['IT', 'Asset Management', asset.name || 'Asset']}
          actions={<NavLink to="/it/dashboard/assets"><Button variant="secondary" size="sm">Back</Button></NavLink>}
        />
        {loading && <div className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />}
        {error   && <EmptyState icon="error" title="Asset failed to load" description={error} />}
        {!loading && !error && (
          <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Asset Profile" />
                <StatGrid items={[
                  { label: 'Tag',        value: asset.assetTag || '—' },
                  { label: 'Status',     value: <Pill value={asset.status} /> },
                  { label: 'Type',       value: asset.type       || '—' },
                  { label: 'Department', value: asset.department || '—' },
                ]} />
                {Object.keys(asset.metadata || {}).length > 0 && (
                  <div className="mt-4 space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Metadata</p>
                    {Object.entries(asset.metadata).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                        <span className="text-sm text-neutral-600 dark:text-neutral-400">{k}</span>
                        <span className="text-sm font-semibold text-neutral-900 dark:text-white">{toText(v)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
            <section className={card}>
              <div className={inner}>
                <SectionHdr title="Lifecycle" />
                <div className="space-y-2">
                  {[
                    ['Assigned To', `${asset.assignedTo?.firstName || ''} ${asset.assignedTo?.lastName || ''}`.trim() || '—'],
                    ['Project',     toText(asset.projectId) || '—'],
                    ['Created',     fmtDate(asset.createdAt)],
                    ['Updated',     fmtDate(asset.updatedAt)],
                  ].map(([label, value]) => (
                    <div key={label} className="flex items-center justify-between rounded-xl border border-neutral-100 px-3 py-2 dark:border-neutral-800">
                      <span className="text-sm text-neutral-600 dark:text-neutral-400">{label}</span>
                      <span className="text-sm font-semibold text-neutral-900 dark:text-white">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          </div>
        )}
      </div>
    </main>
  );
};

// ── Operations ───────────────────────────────────────────────────────────────

const OPS_TABS = [
  { id: 'infrastructure', label: 'Infrastructure' },
  { id: 'network',        label: 'Network' },
  { id: 'backup',         label: 'Backup' },
];

export const ITOperationsPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'infrastructure';

  const { loading, error, data } = useAsync(async () => {
    const [infraRes, networkRes, backupRes] = await Promise.all([
      itApi.getInfrastructureSummary(token),
      itApi.getNetworkInfra(token),
      itApi.getBackupRecovery(token),
    ]);
    return {
      infra:   unwrap(infraRes),
      network: unwrap(networkRes),
      backup:  unwrap(backupRes),
    };
  }, [token]);

  const infra   = data.infra   || {};
  const network = data.network || {};
  const backup  = data.backup  || {};

  const serverHealth = infra.serverHealth || {};
  const services     = infra.services     || [];
  const servers      = network.servers    || [];
  const cloud        = network.cloud      || {};
  const apis         = network.apis       || {};

  const setTab = (id) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', id);
    setSearchParams(next);
  };

  const tabContent = {
    infrastructure: (
      <div className="space-y-4">
        <StatGrid items={[
          { label: 'CPU Usage',          value: `${serverHealth.cpu || 0}%` },
          { label: 'Memory Usage',       value: `${serverHealth.memory || 0}%` },
          { label: 'DB Connections',     value: serverHealth.dbConnections || 0 },
          { label: 'API Latency',        value: `${serverHealth.apiLatencyMs || 0} ms` },
        ]} />
        {services.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Core Services</p>
            <div className="space-y-2">
              {services.map((svc) => (
                <div key={svc.name} className="flex items-center justify-between rounded-xl border border-neutral-200 px-4 py-3 dark:border-neutral-800">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[16px] text-neutral-400">circle</span>
                    <p className="text-sm font-semibold text-neutral-900 dark:text-white">{svc.name}</p>
                  </div>
                  <Pill value={svc.status} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
    network: (
      <div className="space-y-4">
        <StatGrid items={[
          { label: 'Cloud Provider',   value: cloud.provider      || '—' },
          { label: 'Active Instances', value: cloud.activeInstances || 0 },
          { label: 'Total APIs',       value: apis.total    || 0 },
          { label: 'Degraded APIs',    value: apis.degraded || 0 },
        ]} />
        {cloud.regions && (
          <div className={statBox}>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Active Regions</p>
            <div className="flex flex-wrap gap-2">
              {cloud.regions.map((r) => (
                <span key={r} className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">{r}</span>
              ))}
            </div>
          </div>
        )}
        {servers.length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Servers</p>
            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                <thead className="bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    {['Server', 'Status', 'Latency'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {servers.map((s) => (
                    <tr key={s.name} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                      <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{s.name}</td>
                      <td className="px-4 py-3"><Pill value={s.status} /></td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{s.latencyMs || 0} ms</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    ),
    backup: (
      <div className="space-y-4">
        <StatGrid items={[
          { label: 'Backup Health',  value: backup.backupHealth || 'active' },
          { label: 'Last Backup',    value: fmtDate(backup.lastBackupAt) },
          { label: 'Next Backup',    value: fmtDate(backup.nextBackupAt) },
          { label: 'Restore Points', value: (backup.restorePoints || []).length },
        ]} />
        {(backup.restorePoints || []).length > 0 && (
          <div className={statBox}>
            <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Restore Points</p>
            <div className="flex flex-wrap gap-2">
              {backup.restorePoints.map((rp) => (
                <span key={rp} className="rounded-full border border-neutral-200 bg-white px-3 py-1 text-xs font-semibold text-neutral-700 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
                  {rp}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title="Operations"
          subtitle="Infrastructure, network and backup management"
          icon="dns"
          user={user}
          crumbs={['IT', 'Operations']}
        />
        {error && <EmptyState icon="error" title="Operations data failed to load" description={error} />}
        <section className={card}>
          <div className={inner}>
            <div className="mb-5">
              <TabBar tabs={OPS_TABS} active={tab} onChange={setTab} />
            </div>
            {loading
              ? <div className="space-y-3">{[...Array(4)].map((_, i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}</div>
              : (tabContent[tab] || tabContent.infrastructure)
            }
          </div>
        </section>
      </div>
    </main>
  );
};

// ── Activity Logs ─────────────────────────────────────────────────────────────

const ACT_TABS = [
  { id: 'audit',  label: 'Audit Logs' },
  { id: 'system', label: 'System Logs' },
];

export const ITActivityPage = () => {
  const { token, user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab   = searchParams.get('tab')  || 'audit';
  const page  = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = 15;

  const { loading, error, data } = useAsync(async () => {
    const [auditRes, sysRes] = await Promise.all([
      itApi.getAuditLogs(token, { page, limit }),
      itApi.getSystemLogs(token),
    ]);
    return {
      audit:  unwrap(auditRes),
      system: unwrap(sysRes),
    };
  }, [token, page]);

  const audit  = data.audit  || {};
  const system = data.system || {};

  const auditItems = audit.items || [];

  const setParam = (key, val) => {
    const next = new URLSearchParams(searchParams);
    next.set(key, val);
    setSearchParams(next);
  };

  const tabContent = {
    audit: (
      <div className="space-y-4">
        <StatGrid items={[
          { label: 'Total Audit Entries', value: audit.pagination?.total || 0 },
          { label: 'This Page',           value: auditItems.length },
        ]} />
        {auditItems.length === 0 && !loading
          ? <EmptyState icon="history" title="No audit records" description="Audit trail entries will appear here." />
          : (
            <div className="overflow-hidden rounded-xl border border-neutral-200 dark:border-neutral-800">
              <table className="min-w-full divide-y divide-neutral-200 text-sm dark:divide-neutral-800">
                <thead className="bg-neutral-50 dark:bg-neutral-900">
                  <tr>
                    {['Action', 'User', 'Module', 'Date'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {auditItems.map((row) => (
                    <tr key={row._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/50">
                      <td className="px-4 py-3 font-semibold text-neutral-900 dark:text-white">{row.action || '—'}</td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{row.userId || row.user || '—'}</td>
                      <td className="px-4 py-3 text-neutral-600 dark:text-neutral-400">{row.module || '—'}</td>
                      <td className="px-4 py-3 text-neutral-500 dark:text-neutral-400">{fmtDate(row.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <div className="flex items-center justify-between">
          <p className="text-xs text-neutral-500">Page {page} of {audit.pagination?.totalPages || 1}</p>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setParam('page', page - 1)} disabled={page <= 1}>Prev</Button>
            <Button variant="secondary" size="sm" onClick={() => setParam('page', page + 1)} disabled={page >= (audit.pagination?.totalPages || 1)}>Next</Button>
          </div>
        </div>
      </div>
    ),
    system: (
      <div className="space-y-4">
        <StatGrid items={[
          { label: 'Audit Entries',    value: system.auditEntries    || 0 },
          { label: 'Activity Entries', value: system.activityEntries || 0 },
        ]} />
        {(system.recentAudit || []).length > 0 && (
          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Recent System Events</p>
            <div className="space-y-2">
              {system.recentAudit.map((row) => (
                <div key={row._id} className={statBox}>
                  <p className="font-semibold text-neutral-900 dark:text-white">{row.action || 'System event'}</p>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{row.module || 'system'} · {fmtDate(row.createdAt)}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    ),
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header
          title="Activity Logs"
          subtitle="Audit trails, security threats and system event logs"
          icon="history"
          user={user}
          crumbs={['IT', 'Activity Logs']}
        />
        {error && <EmptyState icon="error" title="Activity data failed to load" description={error} />}
        <section className={card}>
          <div className={inner}>
            <div className="mb-5">
              <TabBar tabs={ACT_TABS} active={tab} onChange={(id) => { setParam('tab', id); setParam('page', '1'); }} />
            </div>
            {loading
              ? <div className="space-y-3">{[...Array(5)].map((_, i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}</div>
              : (tabContent[tab] || tabContent.audit)
            }
          </div>
        </section>
      </div>
    </main>
  );
};

// ── Security Center ──────────────────────────────────────────────────────────

export const ITSecurityPage = () => {
  const { token, user } = useAuth();
  const security = useAsync(() => itApi.getSecurityCompliance(token), [token]);
  const threats  = useAsync(() => itApi.getThreatLogs(token, { limit: 20 }), [token]);
  const s  = security.data;
  const tl = threats.data;
  const threatItems = tl?.items || tl?.threats || tl?.logs || [];
  const RISK_TONE = {
    critical: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
    high:     'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
    medium:   'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
    low:      'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
    passed:   'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
    failed:   'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
  };
  const riskPill = (v) => {
    const k = String(v || '').toLowerCase();
    return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${RISK_TONE[k] || RISK_TONE.low}`}>{v}</span>;
  };
  const [tab, setTab] = useState('posture');
  const TABS = [
    { id: 'posture',    label: 'Security Posture' },
    { id: 'threats',    label: 'Threat Intelligence' },
    { id: 'compliance', label: 'Compliance' },
  ];
  const loading = security.loading;
  const posture = s?.securityPosture || s || {};
  const vulns   = posture.vulnerabilities || {};
  const comp    = s?.compliance || posture.compliance || {};
  const compChecks = comp.checks || comp.standards || [];
  const firewallRules = s?.firewallRules || s?.accessControl || [];

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Security Center" subtitle="Threat posture, compliance and access control" icon="security" user={user} crumbs={['IT', 'Security Center']} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Security Score',       value: loading ? '—' : `${posture.score ?? posture.overallScore ?? 0}%`, color: 'bg-emerald-600' },
            { label: 'Open Vulnerabilities', value: loading ? '—' : (vulns.total ?? vulns.open ?? 0),                 color: 'bg-rose-500' },
            { label: 'Critical Threats',     value: loading ? '—' : (vulns.critical ?? 0),                            color: 'bg-rose-700' },
            { label: 'Compliance Checks',    value: loading ? '—' : (comp.total ?? compChecks.length ?? 0),           color: 'bg-amber-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${card} relative overflow-hidden`}>
              <div className={`absolute inset-x-0 top-0 h-1 ${color}`} />
              <div className={inner}>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
                {loading ? <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" /> : <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{value}</p>}
              </div>
            </div>
          ))}
        </div>
        <section className={card}>
          <div className={inner}>
            <TabBar tabs={TABS} active={tab} onChange={setTab} />
            <div className="mt-4">
              {tab === 'posture' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      { label: 'Critical', value: vulns.critical || 0, cls: 'text-rose-700 dark:text-rose-300' },
                      { label: 'High',     value: vulns.high     || 0, cls: 'text-amber-700 dark:text-amber-300' },
                      { label: 'Medium',   value: vulns.medium   || 0, cls: 'text-blue-700 dark:text-blue-300' },
                      { label: 'Low',      value: vulns.low      || 0, cls: 'text-neutral-600 dark:text-neutral-400' },
                    ].map(({ label, value, cls }) => (
                      <div key={label} className={statBox}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                        {loading ? <div className="mt-1 h-7 w-10 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /> : <p className={`mt-1 text-2xl font-black ${cls}`}>{value}</p>}
                      </div>
                    ))}
                  </div>
                  {(posture.openIssues || posture.issues || []).length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">Open Security Issues</p>
                      {(posture.openIssues || posture.issues).map((issue, i) => (
                        <div key={i} className={`${statBox} flex items-start justify-between gap-3`}>
                          <div>
                            <p className="font-semibold text-neutral-900 dark:text-white">{issue.title || issue.name || 'Security issue'}</p>
                            <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{issue.description || issue.detail || ''}</p>
                          </div>
                          {riskPill(issue.severity || issue.risk || 'medium')}
                        </div>
                      ))}
                    </div>
                  ) : !loading && <p className="text-sm text-neutral-500 dark:text-neutral-400">No open issues detected.</p>}
                </div>
              )}
              {tab === 'threats' && (
                <div className="space-y-2">
                  {threats.loading && <SkeletonRows n={6} />}
                  {!threats.loading && threatItems.length === 0 && <EmptyState icon="security" title="No threats recorded" description="System is clean." />}
                  {threatItems.map((t, i) => (
                    <div key={t._id || i} className={`${statBox} flex items-start justify-between gap-3`}>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{t.type || t.event || t.title || 'Threat event'}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{t.source || t.sourceIp || '—'} · {t.description || ''} · {fmtDate(t.timestamp || t.detectedAt || t.createdAt)}</p>
                      </div>
                      {riskPill(t.severity || t.risk || t.level || 'medium')}
                    </div>
                  ))}
                </div>
              )}
              {tab === 'compliance' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {[
                      { label: 'Total Checks', value: comp.total ?? compChecks.length ?? 0 },
                      { label: 'Passed',       value: comp.passed ?? 0 },
                      { label: 'Failed',       value: comp.failed ?? 0 },
                      { label: 'Score',        value: `${comp.score || comp.percentage || 0}%` },
                      { label: 'Last Audited', value: fmtDate(comp.lastAudit || comp.lastChecked) || 'N/A' },
                      { label: 'Standard',     value: comp.standard || comp.framework || 'Internal' },
                    ].map(({ label, value }) => (
                      <div key={label} className={statBox}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                        {loading ? <div className="mt-1 h-6 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /> : <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{value}</p>}
                      </div>
                    ))}
                  </div>
                  {compChecks.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">Compliance Checks</p>
                      {compChecks.map((c, i) => (
                        <div key={i} className={`${statBox} flex items-center justify-between gap-3`}>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{c.name || c.control || `Check ${i + 1}`}</p>
                          {riskPill(c.status || (c.passed ? 'passed' : 'failed'))}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === 'firewall' && (
                <div className="space-y-2">
                  {loading && <SkeletonRows n={5} />}
                  {!loading && firewallRules.length === 0 && <EmptyState icon="firewall" title="No firewall rules" description="No access control rules configured." />}
                  {firewallRules.map((r, i) => (
                    <div key={i} className={`${statBox} flex items-start justify-between gap-3`}>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{r.name || r.rule || r.description || `Rule ${i + 1}`}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{r.source || r.from || '—'} → {r.destination || r.to || '—'} · {r.protocol || 'TCP'}</p>
                      </div>
                      {riskPill(r.action || r.status || 'allow')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

// ── User Access / IAM ────────────────────────────────────────────────────────

export const ITUserAccessPage = () => {
  const { token, user } = useAuth();
  const access   = useAsync(() => itApi.getUserAccessSummary(token), [token]);
  const roles    = useAsync(() => itApi.getRolesPermissions(token), [token]);
  const requests = useAsync(() => itApi.getAccessRequests(token), [token]);
  const [tab, setTab] = useState('users');
  const TABS = [
    { id: 'users',    label: 'User Directory' },
    { id: 'requests', label: 'Access Requests' },
    { id: 'roles',    label: 'Roles & Permissions' },
  ];
  const ad = access.data;
  const rd = roles.data;
  const rq = requests.data;
  const userList     = ad?.users || ad?.items || ad?.userList || [];
  const requestItems = rq?.requests || rq?.items || rq?.accessRequests || [];
  const roleList     = rd?.roles || rd?.items || rd?.roleList || [];
  const TONE = {
    approved: 'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
    pending:  'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
    rejected: 'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
    active:   'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
    inactive: 'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  };
  const pill = (v) => { const k = String(v || '').toLowerCase(); return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${TONE[k] || TONE.inactive}`}>{v}</span>; };
  const totalUsers  = ad?.totalUsers  ?? ad?.total  ?? userList.length;
  const activeUsers = ad?.activeUsers ?? ad?.active ?? 0;
  const pendingReqs = rq?.pending ?? requestItems.filter((r) => r.status === 'pending').length;
  const totalRoles  = rd?.totalRoles ?? rd?.total ?? roleList.length;

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="User Access & IAM" subtitle="Identity management, roles, permissions and access requests" icon="manage_accounts" user={user} crumbs={['IT', 'User Access & IAM']} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Total Users',      value: access.loading ? '—' : totalUsers,   color: 'bg-amber-600' },
            { label: 'Active Users',     value: access.loading ? '—' : activeUsers,   color: 'bg-emerald-600' },
            { label: 'Pending Requests', value: requests.loading ? '—' : pendingReqs, color: 'bg-rose-500' },
            { label: 'Roles Defined',    value: roles.loading ? '—' : totalRoles,    color: 'bg-cyan-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${card} relative overflow-hidden`}>
              <div className={`absolute inset-x-0 top-0 h-1 ${color}`} />
              <div className={inner}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p><p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{value}</p></div>
            </div>
          ))}
        </div>
        <section className={card}>
          <div className={inner}>
            <TabBar tabs={TABS} active={tab} onChange={setTab} />
            <div className="mt-4">
              {tab === 'users' && (
                <div className="space-y-2">
                  {access.loading && <SkeletonRows n={6} />}
                  {!access.loading && userList.length === 0 && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {[
                        { label: 'Total Users',  value: totalUsers },
                        { label: 'Active',       value: activeUsers },
                        { label: 'Inactive',     value: ad?.inactiveUsers ?? 0 },
                        { label: 'Admins',       value: ad?.adminCount ?? ad?.admins ?? 0 },
                        { label: 'Departments',  value: ad?.departments ?? 0 },
                        { label: 'Last Synced',  value: fmtDate(ad?.lastSync) || 'N/A' },
                      ].map(({ label, value }) => (
                        <div key={label} className={statBox}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                          <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {userList.map((u, i) => (
                    <div key={u._id || i} className={`${statBox} flex items-center justify-between gap-3`}>
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                          {String(u.firstName || u.name || u.email || 'U')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-neutral-900 dark:text-white">{u.firstName ? `${u.firstName} ${u.lastName || ''}`.trim() : u.name || u.email || `User ${i + 1}`}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{u.email || u.department || u.role || '—'}</p>
                        </div>
                      </div>
                      {pill(u.status || 'active')}
                    </div>
                  ))}
                </div>
              )}
              {tab === 'requests' && (
                <div className="space-y-2">
                  {requests.loading && <SkeletonRows n={5} />}
                  {!requests.loading && requestItems.length === 0 && <EmptyState icon="pending_actions" title="No access requests" description="All requests processed." />}
                  {requestItems.map((r, i) => (
                    <div key={r._id || i} className={`${statBox} flex items-start justify-between gap-3`}>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{r.requestedBy?.firstName ? `${r.requestedBy.firstName} ${r.requestedBy.lastName || ''}`.trim() : r.user || r.requestedFor || `Request ${i + 1}`}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{r.resource || r.accessType || r.type || 'Access'} · {fmtDate(r.createdAt || r.requestedAt)}</p>
                      </div>
                      {pill(r.status || 'pending')}
                    </div>
                  ))}
                </div>
              )}
              {tab === 'roles' && (
                <div className="space-y-2">
                  {roles.loading && <SkeletonRows n={4} />}
                  {!roles.loading && roleList.length === 0 && (
                    <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                      {[
                        { label: 'Total Roles',  value: totalRoles },
                        { label: 'Custom',       value: rd?.customRoles ?? 0 },
                        { label: 'System',       value: rd?.systemRoles ?? 0 },
                        { label: 'Permissions',  value: rd?.totalPermissions ?? rd?.permissions ?? 0 },
                        { label: 'Modules',      value: rd?.modules ?? 0 },
                        { label: 'Last Updated', value: fmtDate(rd?.lastUpdated) || 'N/A' },
                      ].map(({ label, value }) => (
                        <div key={label} className={statBox}>
                          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                          <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{value}</p>
                        </div>
                      ))}
                    </div>
                  )}
                  {roleList.map((r, i) => (
                    <div key={r._id || i} className={`${statBox} flex items-start justify-between gap-3`}>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{r.name || r.role || `Role ${i + 1}`}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{r.description || ''} · {Array.isArray(r.permissions) ? `${r.permissions.length} permissions` : r.permissionCount ?? '—'}</p>
                      </div>
                      <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-inset ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700">{r.type || 'custom'}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

// ── Change Management ────────────────────────────────────────────────────────

export const ITChangesPage = () => {
  const { token, user } = useAuth();
  const deployments = useAsync(() => itApi.getDeployments(token), [token]);
  const devops      = useAsync(() => itApi.getDevopsCicd(token), [token]);
  const [tab, setTab] = useState('deployments');
  const TABS = [
    { id: 'deployments', label: 'Deployments' },
    { id: 'pipeline',    label: 'CI/CD Pipeline' },
  ];
  const dd = deployments.data;
  const dv = devops.data;
  const deployList   = dd?.deployments || dd?.items || dd?.recentDeployments || [];
  const pipelineList = dv?.pipelines || dv?.jobs || dv?.cicd || dv?.items || [];
  const CHANGE_TONE = {
    draft:          'bg-neutral-100 text-neutral-600 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
    'under-review': 'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
    approved:       'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
    implementing:   'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
    completed:      'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
    rejected:       'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
    success:        'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
    failed:         'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
    running:        'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
    pending:        'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  };
  const pill = (v) => { const k = String(v || '').toLowerCase().replace(/\s+/g, '-'); return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${CHANGE_TONE[k] || CHANGE_TONE.draft}`}>{v}</span>; };
  const totalDeploys  = dd?.totalDeployments ?? dd?.total ?? deployList.length;
  const successRate   = dd?.successRate ?? dv?.successRate ?? 0;
  const pipelineCount = dv?.totalPipelines ?? dv?.total ?? pipelineList.length;

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Change Management" subtitle="Deployments, CI/CD pipeline and release tracking" icon="published_with_changes" user={user} crumbs={['IT', 'Change Management']} />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'Total Deployments', value: deployments.loading ? '—' : totalDeploys, color: 'bg-amber-600' },
            { label: 'Success Rate',      value: deployments.loading ? '—' : `${successRate}%`, color: 'bg-emerald-600' },
            { label: 'CI/CD Pipelines',   value: devops.loading ? '—' : pipelineCount,   color: 'bg-cyan-600' },
            { label: 'Environments',      value: deployments.loading ? '—' : (dd?.environments ?? 0), color: 'bg-indigo-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${card} relative overflow-hidden`}>
              <div className={`absolute inset-x-0 top-0 h-1 ${color}`} />
              <div className={inner}><p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p><p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{value}</p></div>
            </div>
          ))}
        </div>
        <section className={card}>
          <div className={inner}>
            <TabBar tabs={TABS} active={tab} onChange={setTab} />
            <div className="mt-4">
              {tab === 'deployments' && (
                <div className="space-y-2">
                  {deployments.loading && <SkeletonRows n={5} />}
                  {!deployments.loading && deployList.length === 0 && <EmptyState icon="rocket_launch" title="No deployments" description="No deployment history found." />}
                  {deployList.map((d, i) => (
                    <div key={d._id || i} className={`${statBox} flex items-start justify-between gap-3`}>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{d.name || d.project || d.service || `Deploy ${i + 1}`}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{d.environment || d.env || 'production'} · v{d.version || d.tag || '—'} · {fmtDate(d.deployedAt || d.createdAt)}</p>
                      </div>
                      {pill(d.status || 'success')}
                    </div>
                  ))}
                </div>
              )}
              {tab === 'pipeline' && (
                <div className="space-y-2">
                  {devops.loading && <SkeletonRows n={5} />}
                  {!devops.loading && pipelineList.length === 0 && <EmptyState icon="schema" title="No pipelines" description="No CI/CD pipelines found." />}
                  {pipelineList.map((p, i) => (
                    <div key={p._id || i} className={`${statBox} flex items-start justify-between gap-3`}>
                      <div>
                        <p className="font-semibold text-neutral-900 dark:text-white">{p.name || p.project || p.pipeline || `Pipeline ${i + 1}`}</p>
                        <p className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{p.branch || p.trigger || '—'} · {p.duration ? `${p.duration}s` : ''} · {fmtDate(p.startedAt || p.createdAt)}</p>
                      </div>
                      {pill(p.status || 'success')}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

// ── Reports & Analytics ──────────────────────────────────────────────────────

export const ITReportsPage = () => {
  const { token, user } = useAuth();
  const dashboard  = useAsync(() => itApi.getDashboard(token), [token]);
  const monitoring = useAsync(() => itApi.getMonitoring(token), [token]);
  const overview   = useAsync(() => itApi.getSystemOverview(token), [token]);
  const [tab, setTab] = useState('sla');
  const TABS = [
    { id: 'sla',     label: 'SLA Report' },
    { id: 'uptime',  label: 'System Uptime' },
    { id: 'tickets', label: 'Ticket Analytics' },
    { id: 'summary', label: 'Executive Summary' },
  ];
  const dd = dashboard.data;
  const md = monitoring.data;
  const ov = overview.data;
  const sla      = dd?.sla    || md?.sla    || {};
  const uptime   = md?.uptime || ov?.uptime || {};
  const ticketAnalytics = dd?.analytics || md?.analytics || dd?.ticketStats || {};
  const trend    = md?.trends || md?.ticketTrend || {};
  const trendArr = trend?.ticketTrend || trend?.daily || trend?.data || [];
  const loading  = dashboard.loading || monitoring.loading;
  const slaCompliance = sla.compliance ?? sla.percentage ?? sla.score ?? 0;
  const avgResolution = sla.avgResolution ?? sla.avgTime ?? dd?.avgResolutionTime ?? 0;
  const uptimePct     = uptime.overall ?? uptime.percentage ?? uptime.score ?? ov?.uptime ?? 0;
  const totalTickets  = dd?.totalTickets ?? ticketAnalytics.total ?? 0;
  const maxBar = Math.max(...trendArr.map((d) => d.count || d.tickets || 0), 1);

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Reports & Analytics" subtitle="SLA compliance, uptime metrics and ticket trends" icon="analytics" user={user} crumbs={['IT', 'Reports & Analytics']}
          actions={<Button variant="secondary" size="sm"><span className="material-symbols-outlined text-[16px]">download</span> Export</Button>}
        />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { label: 'SLA Compliance', value: loading ? '—' : `${slaCompliance}%`, color: 'bg-emerald-600' },
            { label: 'Avg Resolution', value: loading ? '—' : `${avgResolution}h`, color: 'bg-amber-600' },
            { label: 'System Uptime',  value: loading ? '—' : `${uptimePct}%`,     color: 'bg-cyan-600' },
            { label: 'Total Tickets',  value: loading ? '—' : totalTickets,        color: 'bg-rose-500' },
          ].map(({ label, value, color }) => (
            <div key={label} className={`${card} relative overflow-hidden`}>
              <div className={`absolute inset-x-0 top-0 h-1 ${color}`} />
              <div className={inner}>
                <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
                {loading ? <div className="mt-2 h-8 w-16 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" /> : <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-white">{value}</p>}
              </div>
            </div>
          ))}
        </div>
        <section className={card}>
          <div className={inner}>
            <TabBar tabs={TABS} active={tab} onChange={setTab} />
            <div className="mt-4">
              {tab === 'sla' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {[
                      { label: 'SLA Compliance',      value: `${slaCompliance}%` },
                      { label: 'Avg Resolution Time', value: `${avgResolution}h` },
                      { label: 'Tickets Breached',    value: sla.breached ?? 0 },
                      { label: 'Within SLA',          value: sla.withinSla ?? sla.met ?? 0 },
                      { label: 'Critical Breaches',   value: sla.criticalBreaches ?? 0 },
                      { label: 'Period',              value: sla.period || 'This month' },
                    ].map(({ label, value }) => (
                      <div key={label} className={statBox}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                        {loading ? <div className="mt-1 h-6 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /> : <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{value}</p>}
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="mb-2 text-sm font-semibold text-neutral-900 dark:text-white">SLA Compliance Rate</p>
                    <div className="flex items-center gap-3">
                      <div className="h-4 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                        <div className="h-full rounded-full bg-emerald-500 transition-all duration-500" style={{ width: `${Math.min(slaCompliance, 100)}%` }} />
                      </div>
                      <span className="text-sm font-bold text-neutral-900 dark:text-white">{slaCompliance}%</span>
                    </div>
                  </div>
                </div>
              )}
              {tab === 'uptime' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {[
                      { label: 'Overall Uptime',   value: `${uptimePct}%` },
                      { label: 'Downtime (month)', value: uptime.downtimeMinutes ? `${uptime.downtimeMinutes}m` : uptime.downtime || '—' },
                      { label: 'Incidents',        value: uptime.incidents ?? ov?.incidents ?? 0 },
                      { label: 'MTTR',             value: uptime.mttr ? `${uptime.mttr}m` : '—' },
                      { label: 'MTBF',             value: uptime.mtbf ? `${uptime.mtbf}h` : '—' },
                      { label: 'SLA Target',       value: uptime.slaTarget || '99.9%' },
                    ].map(({ label, value }) => (
                      <div key={label} className={statBox}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                        {loading ? <div className="mt-1 h-6 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /> : <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{value}</p>}
                      </div>
                    ))}
                  </div>
                  {(ov?.services || []).length > 0 && (
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">Service Uptime</p>
                      {ov.services.map((s, i) => (
                        <div key={i} className={`${statBox} flex items-center justify-between gap-3`}>
                          <p className="text-sm font-medium text-neutral-900 dark:text-white">{s.name || s.service || `Service ${i + 1}`}</p>
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-24 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${s.uptime || s.percentage || 100}%` }} />
                            </div>
                            <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">{s.uptime ?? s.percentage ?? 100}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {tab === 'tickets' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    {[
                      { label: 'Total',       value: totalTickets },
                      { label: 'Open',        value: ticketAnalytics.open       ?? dd?.openTickets       ?? 0 },
                      { label: 'In Progress', value: ticketAnalytics.inProgress ?? dd?.inProgressTickets ?? 0 },
                      { label: 'Resolved',    value: ticketAnalytics.resolved   ?? dd?.resolvedTickets   ?? 0 },
                      { label: 'Critical',    value: ticketAnalytics.critical   ?? dd?.criticalTickets   ?? 0 },
                      { label: 'Avg / Day',   value: trendArr.length ? Math.round(trendArr.reduce((a, d) => a + (d.count || d.tickets || 0), 0) / trendArr.length) : 0 },
                    ].map(({ label, value }) => (
                      <div key={label} className={statBox}>
                        <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                        {loading ? <div className="mt-1 h-6 w-12 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /> : <p className="mt-1 text-lg font-bold text-neutral-900 dark:text-white">{value}</p>}
                      </div>
                    ))}
                  </div>
                  {trendArr.length > 0 && (
                    <div>
                      <p className="mb-3 text-sm font-semibold text-neutral-900 dark:text-white">Ticket Trend (7 days)</p>
                      <div className="flex h-28 items-end gap-2">
                        {trendArr.slice(-7).map((d, i) => {
                          const val = d.count || d.tickets || 0;
                          const pct = Math.round((val / maxBar) * 100);
                          return (
                            <div key={i} className="flex flex-1 flex-col items-center gap-1">
                              <span className="text-[10px] font-semibold text-neutral-500">{val}</span>
                              <div className="w-full rounded-t-md bg-amber-400 dark:bg-amber-500" style={{ height: `${Math.max(pct, 4)}%` }} />
                              <span className="text-[9px] text-neutral-400">{d.label || (d.date ? new Date(d.date).toLocaleDateString('en', { weekday: 'short' }) : `D${i + 1}`)}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
              {tab === 'summary' && (
                <div className="space-y-4">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-white">Executive Summary — {new Date().toLocaleDateString('en', { month: 'long', year: 'numeric' })}</p>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {[
                      { icon: 'verified_user', label: 'SLA Compliance', value: `${slaCompliance}%`, ok: slaCompliance >= 95 },
                      { icon: 'cloud_done',    label: 'System Uptime',  value: `${uptimePct}%`,     ok: uptimePct >= 99 },
                      { icon: 'confirmation_number', label: 'Open Tickets', value: dd?.openTickets ?? 0, ok: (dd?.openTickets ?? 0) < 20 },
                      { icon: 'security',     label: 'Security Score',  value: `${dd?.securityScore ?? ov?.securityScore ?? 0}%`, ok: (dd?.securityScore ?? 0) >= 80 },
                    ].map(({ icon, label, value, ok }) => (
                      <div key={label} className={`${statBox} flex items-center gap-4`}>
                        <div className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${ok ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-rose-100 dark:bg-rose-900/30'}`}>
                          <span className={`material-symbols-outlined text-[22px] ${ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>{icon}</span>
                        </div>
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wider text-neutral-400">{label}</p>
                          {loading ? <div className="mt-1 h-6 w-16 animate-pulse rounded bg-neutral-200 dark:bg-neutral-700" /> : <p className={`mt-0.5 text-xl font-black ${ok ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{value}</p>}
                        </div>
                        <span className={`ml-auto text-xs font-semibold ${ok ? 'text-emerald-600' : 'text-rose-600'}`}>{ok ? '✓ Good' : '⚠ Attention'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
};

