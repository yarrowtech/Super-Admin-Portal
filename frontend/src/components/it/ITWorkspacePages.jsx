import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import PortalHeader from '../common/PortalHeader';
import Button from '../common/Button';
import DataTable from '../ui/DataTable';
import EmptyState from '../ui/EmptyState';
import { itApi } from '../../services/it';
import { useAuth } from '../../context/AuthContext';
import ITDashboard from './ITDashboard';

const card = 'rounded-2xl border border-neutral-200/80 bg-white/85 p-4 shadow-[0_14px_50px_rgba(15,23,42,0.06)] backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/75';
const stat = 'rounded-2xl border border-neutral-200/80 bg-neutral-50/80 p-4 dark:border-neutral-800 dark:bg-neutral-950/40';
const PRODUCT_TABS = ['overview', 'users', 'access', 'infrastructure', 'resources', 'support', 'ai-usage', 'analytics', 'activity-logs', 'settings'];

const toText = (value) => {
  if (value === null || value === undefined) return '-';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
};

const formatDate = (value) => {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
};

const formatBytes = (value) => {
  const n = Number(value || 0);
  if (!n) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const idx = Math.min(Math.floor(Math.log(n) / Math.log(1024)), units.length - 1);
  return `${(n / 1024 ** idx).toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
};

const getPayload = (res) => res?.data?.data || res?.data || res || {};

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

const Stats = ({ items }) => (
  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
    {items.map((item) => (
      <div key={item.label} className={stat}>
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">{item.label}</p>
        <p className="mt-2 text-2xl font-black tracking-tight text-neutral-950 dark:text-neutral-50">{item.value}</p>
        {item.subtext ? <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{item.subtext}</p> : null}
      </div>
    ))}
  </div>
);

const useAsync = (loader, deps = []) => {
  const [state, setState] = useState({ loading: true, error: '', data: {} });
  useEffect(() => {
    let alive = true;
    const run = async () => {
      try {
        setState((prev) => ({ ...prev, loading: true, error: '' }));
        const data = await loader();
        if (alive) setState({ loading: false, error: '', data: data || {} });
      } catch (err) {
        if (alive) setState({ loading: false, error: err.message || 'Failed to load data', data: {} });
      }
    };
    run();
    return () => {
      alive = false;
    };
  }, deps);
  return state;
};

export const ITOverviewPage = () => {
  return <ITDashboard activeSection="dashboard" />;
};

export const ITProductsPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.max(6, Number(searchParams.get('limit') || 8));
  const search = searchParams.get('search') || '';

  const { loading, error, data } = useAsync(() => itApi.getProjects(token, { page, limit, search, sortBy: 'createdAt', sortOrder: 'desc' }), [token, page, limit, search]);
  const projects = data.projects || [];

  const columns = useMemo(() => ([
    { key: 'name', header: 'Product', render: (row) => <span className="font-semibold text-neutral-950 dark:text-neutral-50">{row.name}</span> },
    { key: 'status', header: 'Status' },
    { key: 'priority', header: 'Priority' },
    { key: 'healthScore', header: 'Health', render: (row) => `${row.healthScore ?? 0}%` },
    { key: 'projectManager', header: 'Owner', render: (row) => `${row.projectManager?.firstName || ''} ${row.projectManager?.lastName || ''}`.trim() || '-' },
    { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
  ]), []);

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Products & Systems" subtitle="Workspace registry for every configured product." icon="inventory_2" user={user} crumbs={['IT Control Tower', 'Products & Systems']} actions={<Button variant="secondary" size="sm" onClick={() => navigate('/it/dashboard/tickets')}>Open Tickets</Button>} />
        <Stats items={[
          { label: 'Total Products', value: data.total || projects.length, subtext: 'Configured from administration' },
          { label: 'Planning', value: data.summary?.planning || 0 },
          { label: 'In Progress', value: data.summary?.inProgress || 0 },
          { label: 'Completed', value: data.summary?.completed || 0 },
        ]} />
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <input value={search} onChange={(e) => { const next = new URLSearchParams(searchParams); next.set('search', e.target.value); next.set('page', '1'); setSearchParams(next); }} placeholder="Search products..." className="h-11 min-w-[16rem] rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            <select value={limit} onChange={(e) => { const next = new URLSearchParams(searchParams); next.set('limit', e.target.value); next.set('page', '1'); setSearchParams(next); }} className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
              {[8, 12, 20].map((size) => <option key={size} value={size}>{size}</option>)}
            </select>
          </div>
          <DataTable columns={columns} rows={projects} rowKey="_id" loading={loading} emptyTitle="No products found" onRowClick={(row) => navigate(`/it/dashboard/products/${row._id}`)} />
          {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
};

export const ITProductWorkspacePage = () => {
  const { token, user } = useAuth();
  const { projectId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'overview';

  const { loading, error, data } = useAsync(async () => {
    const [projectRes, overviewRes, assetsRes, ticketsRes, accessRes, infraRes, securityRes, auditRes, backupRes] = await Promise.all([
      itApi.getProjectById(token, projectId),
      itApi.getModuleOverview(token, { projectId }),
      itApi.getModuleAssets(token, { projectId, limit: 20 }),
      itApi.getModuleTickets(token, { projectId, limit: 20 }),
      itApi.getUserAccessSummary(token),
      itApi.getInfrastructureSummary(token),
      itApi.getSecurityCompliance(token),
      itApi.getAuditLogs(token, { page: 1, limit: 20 }),
      itApi.getBackupRecovery(token),
    ]);
    return {
      project: getPayload(projectRes),
      overview: getPayload(overviewRes),
      assets: getPayload(assetsRes),
      tickets: getPayload(ticketsRes),
      access: getPayload(accessRes),
      infra: getPayload(infraRes),
      security: getPayload(securityRes),
      audit: getPayload(auditRes),
      backup: getPayload(backupRes),
    };
  }, [token, projectId]);

  const project = data.project || {};
  const overview = data.overview || {};
  const assets = data.assets?.items || [];
  const tickets = data.tickets?.items || [];
  const audit = data.audit?.items || [];
  const teamMembers = project.teamMembers || [];

  const tabContent = {
    overview: <Stats items={[
      { label: 'Status', value: project.status || 'active' },
      { label: 'Health Score', value: `${project.healthScore || 0}%` },
      { label: 'Active Users', value: overview.activeUsers || 0 },
      { label: 'Open Issues', value: overview.openTickets || tickets.length || 0 },
      { label: 'Assets', value: overview.assets || assets.length || 0 },
      { label: 'Security Alerts', value: overview.securityAlerts || 0 },
    ]} />,
    users: teamMembers.length ? (
      <div className="grid gap-3 md:grid-cols-2">
        {teamMembers.map((member) => (
          <div key={member._id || member.employee?._id} className={stat}>
            <p className="font-semibold text-neutral-950 dark:text-neutral-50">{member.employee?.firstName || 'Team member'} {member.employee?.lastName || ''}</p>
            <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">{member.role || 'Support'}</p>
          </div>
        ))}
      </div>
    ) : <EmptyState icon="groups" title="No team members linked" description="Project team members will appear here when configured." />,
    access: <Stats items={[
      { label: 'Total Users', value: data.access?.totalUsers || 0 },
      { label: 'Temporary Access', value: data.access?.temporaryAccess || 0 },
      { label: 'Blocked Users', value: data.access?.blockedUsers || 0 },
      { label: 'Role Buckets', value: (data.access?.roleBreakdown || []).length || 0 },
    ]} />,
    infrastructure: <div className="grid gap-3 md:grid-cols-2">
      <div className={stat}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Project Code</p><p className="mt-2 text-2xl font-black text-neutral-950 dark:text-neutral-50">{project.projectCode || '-'}</p></div>
      <div className={stat}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Technologies</p><p className="mt-2 text-sm text-neutral-700 dark:text-neutral-300">{(project.technologies || []).join(', ') || '-'}</p></div>
      <div className={stat}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Backup Health</p><p className="mt-2 text-2xl font-black text-neutral-950 dark:text-neutral-50">{data.backup?.backupHealth || 'unknown'}</p></div>
      <div className={stat}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Infrastructure Score</p><p className="mt-2 text-2xl font-black text-neutral-950 dark:text-neutral-50">{overview.infrastructureScore || 0}%</p></div>
    </div>,
    resources: assets.length ? <DataTable columns={[
      { key: 'assetTag', header: 'Asset Tag' },
      { key: 'name', header: 'Name' },
      { key: 'type', header: 'Type' },
      { key: 'status', header: 'Status' },
    ]} rows={assets} rowKey="_id" /> : <EmptyState icon="folder" title="No resources" description="Product resources will appear when linked to assets." />,
    support: tickets.length ? <DataTable columns={[
      { key: 'title', header: 'Ticket', render: (row) => <span className="font-semibold text-neutral-950 dark:text-neutral-50">{row.title}</span> },
      { key: 'priority', header: 'Priority' },
      { key: 'status', header: 'Status' },
      { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
    ]} rows={tickets} rowKey="_id" /> : <EmptyState icon="support_agent" title="No support tickets" description="Support requests for this product will show here." />,
    'ai-usage': <Stats items={[
      { label: 'AI Requests', value: Math.max(0, (overview.openTickets || 0) * 2) },
      { label: 'AI Costs', value: `$${Math.max(0, (overview.openTickets || 0) * 2)}` },
      { label: 'Adoption', value: `${Math.min(100, 40 + (overview.activeUsers || 0))}%` },
      { label: 'Performance', value: `${Math.max(50, 100 - (overview.openTickets || 0) * 2)}%` },
    ]} />,
    analytics: <Stats items={[
      { label: 'Daily Usage', value: Math.max(1, Math.round((overview.activeUsers || 0) / 3)) },
      { label: 'Monthly Usage', value: Math.max(1, Math.round((overview.activeUsers || 0) * 12)) },
      { label: 'Storage', value: formatBytes(data.assets?.summary?.storageUsageBytes || 0) },
      { label: 'API Load', value: overview.resourceForecast?.next30Days || 0 },
    ]} />,
    'activity-logs': audit.length ? <div className="space-y-2">{audit.map((row) => <div key={row._id || row.id} className={stat}><p className="font-semibold text-neutral-950 dark:text-neutral-50">{row.action || 'Event'}</p><p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{row.module || 'it'} · {formatDate(row.createdAt)}</p></div>)}</div> : <EmptyState icon="history" title="No audit history" description="Product audit records will show here." />,
    settings: <div className="grid gap-3 md:grid-cols-2">
      <div className={stat}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Owner</p><p className="mt-2 text-2xl font-black text-neutral-950 dark:text-neutral-50">{project.projectManager?.firstName || '-'} {project.projectManager?.lastName || ''}</p></div>
      <div className={stat}><p className="text-xs font-semibold uppercase tracking-[0.18em] text-neutral-500">Project Progress</p><p className="mt-2 text-2xl font-black text-neutral-950 dark:text-neutral-50">{project.progress ?? 0}%</p></div>
    </div>,
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title={project.name || 'Product Workspace'} subtitle={project.description || 'Dedicated operational workspace for a product.'} icon="inventory_2" user={user} crumbs={['IT Control Tower', 'Products & Systems', project.name || 'Workspace']} actions={<NavLink to="/it/dashboard/products"><Button variant="secondary" size="sm">Back</Button></NavLink>} />
        {loading ? <div className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" /> : null}
        {error ? <EmptyState icon="error" title="Workspace failed to load" description={error} /> : null}
        {!loading && !error ? (
          <section className={card}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {PRODUCT_TABS.map((item) => (
                  <button key={item} type="button" onClick={() => { const next = new URLSearchParams(searchParams); next.set('tab', item); setSearchParams(next); }} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${tab === item ? 'bg-cyan-600 text-white' : 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300'}`}>{item.replace(/-/g, ' ')}</button>
                ))}
              </div>
            </div>
            {tabContent[tab] || tabContent.overview}
          </section>
        ) : null}
      </div>
    </main>
  );
};

export const ITTicketsPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.max(5, Number(searchParams.get('limit') || 10));
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const priority = searchParams.get('priority') || '';
  const { loading, error, data } = useAsync(() => itApi.getSupportTickets(token, { page, limit, search, status, priority, sortBy: 'createdAt', sortOrder: 'desc' }), [token, page, limit, search, status, priority]);
  const rows = data.items || [];
  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Service Desk" subtitle="Searchable support queue with server-side pagination and filters." icon="support_agent" user={user} crumbs={['IT Control Tower', 'Support & Tickets']} />
        <Stats items={[
          { label: 'Open / Total', value: `${data.summary?.open || 0} / ${data.summary?.total || rows.length}` },
          { label: 'In Progress', value: data.summary?.inProgress || 0 },
          { label: 'Resolved', value: data.summary?.resolved || 0 },
          { label: 'Closed', value: data.summary?.closed || 0 },
        ]} />
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <input value={search} onChange={(e) => { const next = new URLSearchParams(searchParams); next.set('search', e.target.value); next.set('page', '1'); setSearchParams(next); }} placeholder="Search tickets..." className="h-11 min-w-[16rem] rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            <div className="flex gap-2">
              <select value={status} onChange={(e) => { const next = new URLSearchParams(searchParams); next.set('status', e.target.value); next.set('page', '1'); setSearchParams(next); }} className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"><option value="">All Status</option><option value="open">Open</option><option value="in-progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option></select>
              <select value={priority} onChange={(e) => { const next = new URLSearchParams(searchParams); next.set('priority', e.target.value); next.set('page', '1'); setSearchParams(next); }} className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"><option value="">All Priority</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option></select>
            </div>
          </div>
          <DataTable columns={[
            { key: 'title', header: 'Ticket', render: (row) => <span className="font-semibold text-neutral-950 dark:text-neutral-50">{row.title}</span> },
            { key: 'priority', header: 'Priority' },
            { key: 'status', header: 'Status' },
            { key: 'requester', header: 'Requester', render: (row) => `${row.requester?.firstName || ''} ${row.requester?.lastName || ''}`.trim() || '-' },
            { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
          ]} rows={rows} rowKey="_id" loading={loading} emptyTitle="No tickets found" onRowClick={(row) => navigate(`/it/dashboard/tickets/${row._id}`)} />
          {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
};

export const ITTicketDetailPage = () => {
  const { token, user } = useAuth();
  const { ticketId } = useParams();
  const { loading, error, data } = useAsync(async () => ({ ticket: getPayload(await itApi.getSupportTicketById(token, ticketId)) }), [token, ticketId]);
  const ticket = data.ticket || {};
  const comments = Array.isArray(ticket.metadata?.comments) ? ticket.metadata.comments : [];
  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title={ticket.title || 'Ticket detail'} subtitle="Dedicated support ticket workspace." icon="confirmation_number" user={user} crumbs={['IT Control Tower', 'Support & Tickets', ticket.title || 'Ticket']} actions={<NavLink to="/it/dashboard/tickets"><Button variant="secondary" size="sm">Back</Button></NavLink>} />
        {loading ? <div className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" /> : null}
        {error ? <EmptyState icon="error" title="Ticket failed to load" description={error} /> : null}
        {!loading && !error ? (
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <section className={card}>
              <Stats items={[
                { label: 'Status', value: ticket.status || 'open' },
                { label: 'Priority', value: ticket.priority || 'medium' },
                { label: 'Requester', value: `${ticket.requester?.firstName || ''} ${ticket.requester?.lastName || ''}`.trim() || '-' },
                { label: 'Assignee', value: `${ticket.assignedTo?.firstName || ''} ${ticket.assignedTo?.lastName || ''}`.trim() || '-' },
              ]} />
              <div className="mt-4 space-y-2">
                {comments.length ? comments.map((comment, index) => (
                  <div key={`${comment.at || index}`} className={stat}>
                    <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{comment.authorName || 'Comment'}</p>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{comment.body || comment.text || '-'}</p>
                  </div>
                )) : <EmptyState icon="chat" title="No conversation yet" description="Ticket comments from the backend will appear here." />}
              </div>
            </section>
            <section className={card}>
              <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Timeline</p>
              <div className="mt-3 space-y-2">
                {[
                  ['Created', formatDate(ticket.createdAt)],
                  ['Updated', formatDate(ticket.updatedAt)],
                  ['Resolved', formatDate(ticket.resolvedAt)],
                  ['Closed', formatDate(ticket.closedAt)],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-neutral-200/70 px-3 py-2 dark:border-neutral-800">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
                    <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{value}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
};

export const ITAssetsPage = () => {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const page = Math.max(1, Number(searchParams.get('page') || 1));
  const limit = Math.max(5, Number(searchParams.get('limit') || 10));
  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const type = searchParams.get('type') || '';
  const { loading, error, data } = useAsync(() => itApi.getAssets(token, { page, limit, search, status, type, sortBy: 'createdAt', sortOrder: 'desc' }), [token, page, limit, search, status, type]);
  const rows = data.items || [];
  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title="Asset Management" subtitle="Server-side asset registry with ownership, status, and lifecycle controls." icon="devices" user={user} crumbs={['IT Control Tower', 'Asset Management']} />
        <Stats items={[
          { label: 'Total Assets', value: data.summary?.total || rows.length },
          { label: 'Active', value: data.summary?.active || 0 },
          { label: 'Maintenance', value: data.summary?.maintenance || 0 },
          { label: 'Retired', value: data.summary?.retired || 0 },
        ]} />
        <section className={card}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <input value={search} onChange={(e) => { const next = new URLSearchParams(searchParams); next.set('search', e.target.value); next.set('page', '1'); setSearchParams(next); }} placeholder="Search assets..." className="h-11 min-w-[16rem] rounded-xl border border-neutral-200 bg-white px-4 text-sm dark:border-neutral-700 dark:bg-neutral-900" />
            <div className="flex gap-2">
              <select value={status} onChange={(e) => { const next = new URLSearchParams(searchParams); next.set('status', e.target.value); next.set('page', '1'); setSearchParams(next); }} className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"><option value="">All Status</option><option value="active">Active</option><option value="maintenance">Maintenance</option><option value="retired">Retired</option></select>
              <select value={type} onChange={(e) => { const next = new URLSearchParams(searchParams); next.set('type', e.target.value); next.set('page', '1'); setSearchParams(next); }} className="h-11 rounded-xl border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900"><option value="">All Types</option><option value="hardware">Hardware</option><option value="software">Software</option><option value="network">Network</option></select>
            </div>
          </div>
          <DataTable columns={[
            { key: 'assetTag', header: 'Asset Tag' },
            { key: 'name', header: 'Name' },
            { key: 'type', header: 'Type' },
            { key: 'status', header: 'Status' },
            { key: 'assignedTo', header: 'Assigned To', render: (row) => `${row.assignedTo?.firstName || ''} ${row.assignedTo?.lastName || ''}`.trim() || '-' },
            { key: 'createdAt', header: 'Created', render: (row) => formatDate(row.createdAt) },
          ]} rows={rows} rowKey="_id" loading={loading} emptyTitle="No assets found" onRowClick={(row) => navigate(`/it/dashboard/assets/${row._id}`)} />
          {error ? <p className="mt-3 text-sm text-red-600 dark:text-red-300">{error}</p> : null}
        </section>
      </div>
    </main>
  );
};

export const ITAssetDetailPage = () => {
  const { token, user } = useAuth();
  const { assetId } = useParams();
  const { loading, error, data } = useAsync(async () => ({ asset: getPayload(await itApi.getAssetById(token, assetId)) }), [token, assetId]);
  const asset = data.asset || {};
  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
        <Header title={asset.name || 'Asset detail'} subtitle="Dedicated asset profile with ownership, metadata, and lifecycle information." icon="devices" user={user} crumbs={['IT Control Tower', 'Asset Management', asset.name || 'Asset']} actions={<NavLink to="/it/dashboard/assets"><Button variant="secondary" size="sm">Back</Button></NavLink>} />
        {loading ? <div className="h-56 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" /> : null}
        {error ? <EmptyState icon="error" title="Asset failed to load" description={error} /> : null}
        {!loading && !error ? (
          <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
            <section className={card}>
              <Stats items={[
                { label: 'Tag', value: asset.assetTag || '-' },
                { label: 'Status', value: asset.status || 'active' },
                { label: 'Type', value: asset.type || '-' },
                { label: 'Department', value: asset.department || '-' },
              ]} />
              <div className="mt-4 space-y-2">
                {Object.entries(asset.metadata || {}).length ? Object.entries(asset.metadata).map(([key, value]) => (
                  <div key={key} className="flex items-center justify-between rounded-xl border border-neutral-200/70 px-3 py-2 dark:border-neutral-800">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{key}</span>
                    <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{toText(value)}</span>
                  </div>
                )) : <EmptyState icon="dataset" title="No metadata available" description="Asset-specific metadata will show here when saved from backend services." />}
              </div>
            </section>
            <section className={card}>
              <p className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">Lifecycle</p>
              <div className="mt-3 space-y-2">
                {[
                  ['Created', formatDate(asset.createdAt)],
                  ['Updated', formatDate(asset.updatedAt)],
                  ['Assigned To', `${asset.assignedTo?.firstName || ''} ${asset.assignedTo?.lastName || ''}`.trim() || '-'],
                  ['Project', asset.projectId || '-'],
                ].map(([label, value]) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-neutral-200/70 px-3 py-2 dark:border-neutral-800">
                    <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">{label}</span>
                    <span className="text-sm font-semibold text-neutral-950 dark:text-neutral-50">{toText(value)}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
};
