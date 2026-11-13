import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/AuthContext';
import { useToast } from '../../../context/ToastContext';
import { API_BASE_URL } from '../../../config/backend';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';
import StatusBadge from '../../common/StatusBadge';
import Button from '../../common/Button';
import SectionCard from '../../ui/SectionCard';
import Modal from '../../ui/Modal';
import Input from '../../ui/Input';
import Select from '../../ui/Select';
import DataTable from '../../ui/DataTable';
import DropdownMenu from '../../ui/DropdownMenu';
import Skeleton from '../../ui/Skeleton';
import EmptyState from '../../ui/EmptyState';
import ClientDetailDrawer from './ClientDetailDrawer';
import PipelineBoard from './PipelineBoard';
import ImportModule from './ImportModule';
import ProjectsModule from './ProjectsModule';
import ClientFormModal from './ClientFormModal';
import RemindersModule from './RemindersModule';
import ActivityModule from './ActivityModule';
import BulkActionBar from './BulkActionBar';
import {
  apiFetch, DEPT_BADGE_TONE, PRIORITY_TONE, PRIORITY_RAIL, DEPT_OPTIONS, SINGLE_DEPT_OPTIONS,
  PRIORITY_OPTIONS, fmt, fmtDateTime, relativeDue, userLabel, toDateInput,
  useClientOptions, useUserOptions, useStatusOptions,
  ClientPicker, UserPicker, TextArea,
} from './crmShared';

// ── Shared constants ──────────────────────────────────────────────────────────
const DEPT_TABS = [
  { key: 'all',       label: 'All Media & Marketing', short: 'All',       icon: 'hub' },
  { key: 'media',     label: 'Media',                 short: 'Media',     icon: 'movie' },
  { key: 'marketing', label: 'Marketing',             short: 'Marketing', icon: 'campaign' },
];

// The department selector is a working context, not a per-visit choice — persist it
// so an operator returning to the CRM stays in the department they were working in.
const DEPT_STORAGE_KEY = 'crm.department';
const VALID_DEPTS = DEPT_TABS.map(t => t.key);

const NAV_GROUPS_STORAGE_KEY = 'crm.collapsedNavGroups';
const NAV_COLLAPSED_KEY = 'crm.navCollapsed';

const readCollapsedGroups = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(NAV_GROUPS_STORAGE_KEY));
    return Array.isArray(parsed) ? parsed.filter(g => typeof g === 'string') : [];
  } catch {
    return [];
  }
};

const readStoredDepartment = () => {
  try {
    const stored = localStorage.getItem(DEPT_STORAGE_KEY);
    return VALID_DEPTS.includes(stored) ? stored : 'all';
  } catch {
    return 'all';
  }
};

// Communication type -> icon. Declared up here because both the dashboard's
// recent-activity list and the Communications module render from it.
const TYPE_ICONS_COMMS = { email:'email', call:'call', meeting:'meeting_room', visit:'location_on', message:'chat_bubble', proposal:'description', approval:'check_circle', note:'edit_note', status_change:'update' };

// ── CRM Dashboard ─────────────────────────────────────────────────────────────
function CRMDashboard({ token, department }) {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [overdue, setOverdue] = useState([]);
  const [recent, setRecent]   = useState([]);
  const [listsLoading, setListsLoading] = useState(true);
  const [statuses] = useStatusOptions(token, department);

  // Stage name -> configured colour, so the dashboard, pipeline board and client
  // table all render a given stage in the same colour.
  const stageColors = React.useMemo(
    () => Object.fromEntries(statuses.map(s => [s.name, s.color])),
    [statuses]
  );

  useEffect(() => {
    setLoading(true);
    apiFetch(`/dashboard?department=${department}`, token)
      .then(r => setData(r.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, [token, department]);

  // The action lists are what make the dashboard a starting point rather than a
  // scoreboard: what is late, and what just happened.
  useEffect(() => {
    let cancelled = false;
    setListsLoading(true);
    Promise.all([
      apiFetch(`/followups?department=${department}&overdue=true`, token).catch(() => ({ data: [] })),
      apiFetch(`/communications?department=${department}&page=1&limit=6`, token).catch(() => ({ data: [] })),
    ])
      .then(([f, c]) => {
        if (cancelled) return;
        setOverdue((f.data || []).slice(0, 6));
        setRecent(c.data || []);
      })
      .finally(() => { if (!cancelled) setListsLoading(false); });
    return () => { cancelled = true; };
  }, [token, department]);

  // Headline metrics: the four an operator acts on. The departmental splits are
  // supporting detail and render smaller below, so the row has a clear ranking
  // instead of seven tiles competing for attention.
  // Overdue is a SUBSET of pending, so the two are phrased as a ratio rather than as
  // competing peers — "10 / 10 overdue" reads as a real (alarming) state, where two
  // separate tiles both showing 10 just looked like a bug.
  const overdueShare = data?.pendingFollowUps
    ? Math.round((data.overdueFollowUps / data.pendingFollowUps) * 100)
    : 0;

  const headlineKpis = data ? [
    { title: 'Active Clients', value: data.activeClients, icon: 'handshake', tone: 'accent',
      context: `${data.totalMedia} media · ${data.totalMarketing} marketing`,
      action: { label: 'View clients →', onClick: () => navigate('/admin/crm/clients') } },

    { title: 'Overdue', value: data.overdueFollowUps, icon: 'event_busy',
      tone: data.overdueFollowUps ? 'danger' : 'success',
      tooltip: 'Pending follow-ups whose due date has already passed',
      context: data.pendingFollowUps
        ? `${overdueShare}% of ${data.pendingFollowUps} open tasks`
        : 'No open tasks',
      action: data.overdueFollowUps
        ? { label: 'Resolve →', onClick: () => navigate('/admin/crm/followups') }
        : undefined },

    { title: 'Open Tasks', value: data.pendingFollowUps, icon: 'event_available', tone: 'warning',
      tooltip: 'All pending follow-ups, overdue ones included',
      context: data.pendingFollowUps
        ? `${Math.max(0, data.pendingFollowUps - data.overdueFollowUps)} still on schedule`
        : 'Nothing scheduled',
      action: { label: 'View all →', onClick: () => navigate('/admin/crm/followups') } },

    { title: 'Activity', value: data.recentCommunications, icon: 'forum', tone: 'info',
      tooltip: 'Client interactions that took place in the last 7 days',
      context: 'Last 7 days',
      action: { label: 'Timeline →', onClick: () => navigate('/admin/crm/comms') } },
  ] : [];

  // The departmental split used to be three more KPI cards — a whole row of vertical
  // space for three numbers, pushing the action lists below the fold. It is now one
  // compact bar: same figures, a proportional strip, and a quarter of the height.
  const totalAll = (data?.totalMedia || 0) + (data?.totalMarketing || 0);
  const splits = data ? [
    { key: 'media',     label: 'Media',     value: data.totalMedia,     color: '#0ea5e9' },
    { key: 'marketing', label: 'Marketing', value: data.totalMarketing, color: '#10b981' },
    { key: 'both',      label: 'Shared',    value: data.totalBoth,      color: '#8b5cf6' },
  ] : [];

  return (
    <div className="space-y-5">
      {/* Headline KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)
          : headlineKpis.map(k => (
              // compact: the default p-5/lg:p-6 tile pushed the action lists below the
              // fold. KPICard is shared across every portal, so this is a per-call
              // choice rather than a change to its defaults.
              <KPICard key={k.title} title={k.title} value={k.value ?? 0} icon={k.icon} tone={k.tone}
                compact tooltip={k.tooltip} context={k.context} action={k.action} />
            ))
        }
      </div>

      {/* Departmental split — one compact strip, not three cards */}
      {loading ? (
        <Skeleton className="h-14 w-full rounded-xl" />
      ) : (
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
          style={{ boxShadow: 'var(--erp-shadow-soft)' }}>
          <span className="text-[11px] font-bold uppercase tracking-wider text-neutral-400">Client mix</span>
          {splits.map(s => (
            <span key={s.key} className="flex items-center gap-1.5 text-sm">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
              <span className="text-neutral-600 dark:text-neutral-400">{s.label}</span>
              <span className="font-black tabular-nums text-neutral-900 dark:text-neutral-100">{s.value ?? 0}</span>
            </span>
          ))}
          {/* Proportional strip, so the mix is readable without comparing digits */}
          {totalAll > 0 && (
            <div className="ml-auto flex h-2 min-w-[8rem] flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              {splits.filter(s => s.value > 0).map(s => (
                <div key={s.key} style={{ width: `${(s.value / totalAll) * 100}%`, background: s.color }}
                  title={`${s.label}: ${s.value}`} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Action lists */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <SectionCard
          title="Needs Attention"
          icon="priority_high"
          description="Overdue follow-ups, soonest first"
          loading={listsLoading}
          empty={!listsLoading && overdue.length === 0}
          emptyIcon="task_alt"
          emptyTitle="Nothing overdue"
          emptyDescription="Every follow-up is on schedule"
          action={{ label: 'View all →', onClick: () => navigate('/admin/crm/followups') }}
        >
          <div className="space-y-2">
            {overdue.map(f => (
              <div key={f._id} className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/50 p-3 dark:border-red-900/40 dark:bg-red-900/10">
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-red-500">event_busy</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {f.client?.name || 'Unlinked follow-up'}
                  </p>
                  <p className="text-xs text-neutral-500">
                    <span className="capitalize">{f.type}</span>
                    {f.assignedTo ? ` · ${userLabel(f.assignedTo)}` : ''}
                  </p>
                </div>
                <span className="shrink-0 text-xs font-semibold text-red-600">{relativeDue(f.dueDate)}</span>
              </div>
            ))}
          </div>
        </SectionCard>

        <SectionCard
          title="Recent Activity"
          icon="forum"
          description="Latest logged client interactions"
          loading={listsLoading}
          empty={!listsLoading && recent.length === 0}
          emptyTitle="No activity yet"
          emptyDescription="Logged calls, emails and meetings appear here"
          action={{ label: 'View all →', onClick: () => navigate('/admin/crm/comms') }}
        >
          <div className="space-y-2">
            {recent.map(c => (
              <div key={c._id} className="flex items-start gap-3 rounded-xl border border-neutral-100 p-3 dark:border-neutral-700">
                <span className="material-symbols-outlined mt-0.5 text-[18px] text-neutral-400">
                  {TYPE_ICONS_COMMS[c.type] || 'chat'}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">
                    {c.subject || c.type?.replace(/_/g, ' ')}
                  </p>
                  <p className="truncate text-xs text-neutral-500">
                    {c.client?.name ? `${c.client.name} · ` : ''}{fmtDateTime(c.occurredAt || c.createdAt)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Status breakdown */}
      <SectionCard
        title="Clients by Status"
        icon="bar_chart"
        loading={loading}
        empty={!loading && !data?.statusBreakdown?.length}
        emptyTitle="No client data yet"
        emptyDescription="Add clients to see status distribution"
        skeletonRows={5}
      >
        <div className="space-y-2.5">
          {data?.statusBreakdown?.map(s => {
            // Scale bars against the largest stage, not the total: with clients
            // spread over 16 stages every bar was a sliver against the total.
            const peak = Math.max(...(data.statusBreakdown || []).map(x => x.count), 1);
            const share = data.activeClients ? Math.round((s.count / data.activeClients) * 100) : 0;
            const color = stageColors[s._id] || 'var(--portal-accent)';
            return (
              <button
                key={s._id}
                type="button"
                onClick={() => navigate('/admin/crm/pipeline')}
                className="group flex w-full items-center gap-3 rounded-lg px-1.5 py-1.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
              >
                <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: color }} />
                <span className="w-36 shrink-0 truncate text-sm text-neutral-700 dark:text-neutral-300">{s._id}</span>
                <div className="h-2.5 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                  <div
                    className="h-full rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${Math.max(4, (s.count / peak) * 100)}%`, background: color }}
                  />
                </div>
                <span className="w-9 shrink-0 text-right text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{s.count}</span>
                <span className="w-10 shrink-0 text-right text-xs tabular-nums text-neutral-400">{share}%</span>
              </button>
            );
          })}
        </div>
      </SectionCard>
    </div>
  );
}

// ── Clients module ────────────────────────────────────────────────────────────
function ClientsModule({ token, department }) {
  const toast = useToast();
  const [clients, setClients]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]       = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [detailId, setDetailId] = useState(null);

  const [statuses] = useStatusOptions(token, department);
  const users = useUserOptions(token);
  const [projects, setProjects] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  // Bumped to clear the table's selection without refetching.
  const [resetKey, setResetKey] = useState(0);

  const { user } = useAuth();
  // Deactivation is admin-only server-side; mirror that so the bulk control is
  // absent rather than present-and-rejected.
  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(user?.role);

  useEffect(() => {
    apiFetch('/import/projects', token)
      .then(r => setProjects(r.data || []))
      .catch(() => setProjects([]));
  }, [token]);

  // Debounce the search box: typing previously fired one request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({
      department, page, limit: 15,
      ...(search ? { search } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
      ...(priorityFilter ? { priority: priorityFilter } : {}),
    }).toString();
    apiFetch(`/clients?${q}`, token)
      .then(r => { setClients(r.data || []); setTotal(r.total || 0); setTotalPages(r.pages || 1); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, search, page, statusFilter, priorityFilter]);

  useEffect(() => { setPage(1); }, [department, search, statusFilter, priorityFilter]);
  useEffect(() => { load(); }, [load]);

  const handleDelete = async (row) => {
    if (!window.confirm(`Deactivate “${row.name}”? The record is archived, not erased, and can be restored in the database.`)) return;
    try {
      await apiFetch(`/clients/${row._id}`, token, { method: 'DELETE' });
      toast.success('Client deactivated');
      load();
    } catch (err) { toast.error(err.message); }
  };

  /**
   * Export via the server, so the file covers every row matching the current
   * filters rather than the single page the browser is holding, and so owner and
   * project read as names instead of ids.
   */
  const exportFile = async (format) => {
    try {
      const q = new URLSearchParams({
        format, department,
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
      }).toString();

      const res = await fetch(`${API_BASE_URL}/api/v1/crm/export/clients?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Export failed (HTTP ${res.status})`);
      }

      const disposition = res.headers.get('Content-Disposition') || '';
      const filename = /filename="?([^"]+)"?/.exec(disposition)?.[1]
        || `crm-clients-${department}-${new Date().toISOString().slice(0, 10)}.${format}`;
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement('a'), { href: url, download: filename }).click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) { toast.error(err.message); }
  };

  const columns = [
    { key:'name', header:'Client', render:r => (
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black"
          style={{ background:'var(--portal-accent-soft)', color:'var(--portal-accent)' }}
          aria-hidden="true"
        >
          {(r.name?.[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-neutral-900 dark:text-neutral-100">{r.name}</p>
          <p className="truncate font-mono text-[11px] text-neutral-400">
            {r.clientId}{r.contactPerson ? ` · ${r.contactPerson}` : ''}
          </p>
        </div>
      </div>
    )},
    { key:'email', header:'Contact', render:r => (
      <div className="min-w-0">
        <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">{r.email || '—'}</p>
        {r.phone && <p className="truncate text-xs text-neutral-400">{r.phone}</p>}
      </div>
    )},
    { key:'department', header:'Dept', render:r => <StatusBadge tone={DEPT_BADGE_TONE[r.department]||'neutral'} label={r.department} /> },
    { key:'status', header:'Status', render:r => {
      const stage = statuses.find(s => s.name === r.status);
      return (
        <span className="inline-flex items-center gap-1.5 text-sm text-neutral-600 dark:text-neutral-400">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: stage?.color || '#94a3b8' }} />
          {r.status}
        </span>
      );
    }},
    { key:'priority', header:'Priority', render:r => <StatusBadge tone={PRIORITY_TONE[r.priority]||'neutral'} label={r.priority} /> },
    { key:'owner', header:'Owner', render:r => <span className="text-xs text-neutral-500">{r.owner ? userLabel(r.owner) : '—'}</span> },
    { key:'lastContactedAt', header:'Last Contact', render:r => <span className="text-xs text-neutral-400">{fmt(r.lastContactedAt)}</span> },
    { key:'nextFollowUpAt', header:'Next Follow-up', render:r => {
      const overdue = r.nextFollowUpAt && new Date(r.nextFollowUpAt) < new Date();
      return <span className={`text-xs ${overdue ? 'font-semibold text-red-600' : 'text-neutral-400'}`}>{fmt(r.nextFollowUpAt)}</span>;
    }},
  ];

  const rowActions = (row) => [
    { label: 'View details', icon: 'visibility', onClick: () => setDetailId(row._id) },
    { label: 'Edit',         icon: 'edit',       onClick: () => { setEditTarget(row); setModalOpen(true); } },
    { label: 'Deactivate',   icon: 'delete',     tone: 'danger', onClick: () => handleDelete(row) },
  ];

  return (
    <>
      <ClientFormModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditTarget(null); }}
        onSaved={load}
        token={token}
        editData={editTarget}
        statuses={statuses}
        users={users}
        projects={projects}
      />

      <ClientDetailDrawer
        open={Boolean(detailId)}
        clientId={detailId}
        token={token}
        statuses={statuses}
        onClose={() => setDetailId(null)}
        onChanged={load}
        onEdit={(c) => { setDetailId(null); setEditTarget(c); setModalOpen(true); }}
      />

      <SectionCard
        title={`Clients${total ? ` (${total})` : ''}`}
        icon="groups"
        description="All Media & Marketing client relationships"
        loading={loading}
        empty={!loading && clients.length === 0}
        emptyTitle="No clients yet"
        emptyDescription="Create your first client record to get started"
        emptyAction={{ label:'Add Client', onClick:() => setModalOpen(true) }}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">search</span>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search clients…"
                aria-label="Search clients"
                className="h-9 w-44 rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filter by status"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All statuses</option>
              {statuses.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
            </select>
            <select
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              aria-label="Filter by priority"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All priorities</option>
              {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
            </select>
            <Button variant="secondary" size="sm" onClick={() => exportFile('csv')} disabled={!clients.length} icon={<span className="material-symbols-outlined text-base">download</span>}>
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportFile('xlsx')} disabled={!clients.length} icon={<span className="material-symbols-outlined text-base">table_view</span>}>
              Excel
            </Button>
            <Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={() => { setEditTarget(null); setModalOpen(true); }}>
              Add Client
            </Button>
          </div>
        }
        noBodyPadding
      >
        <DataTable
          columns={columns}
          rows={clients}
          rowKey="_id"
          selectable
          onSelectionChange={setSelectedIds}
          selectionResetKey={resetKey}
          onRowClick={r => setDetailId(r._id)}
          rowActions={rowActions}
          emptyTitle="No clients"
        />

        <BulkActionBar
          ids={selectedIds}
          token={token}
          statuses={statuses}
          users={users}
          projects={projects}
          canDeactivate={isAdmin}
          onClear={() => setResetKey(k => k + 1)}
          onDone={load}
        />
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <span className="text-xs text-neutral-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  );
}

// ── Contacts module ───────────────────────────────────────────────────────────
const BLANK_CONTACT = { client:'', firstName:'', lastName:'', title:'', email:'', phone:'', department:'media', role:'', isPrimary:false, notes:'' };

function ContactsModule({ token, department }) {
  const toast = useToast();
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]     = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(BLANK_CONTACT);
  const [saving, setSaving]     = useState(false);

  const clients = useClientOptions(token, department);

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ department, ...(search ? { search } : {}) }).toString();
    apiFetch(`/contacts?${q}`, token)
      .then(r => setContacts(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, search]);

  useEffect(() => { load(); }, [load]);

  const openCreate = () => { setEditTarget(null); setForm(BLANK_CONTACT); setModalOpen(true); };
  const openEdit   = (c)  => {
    setEditTarget(c);
    setForm({ ...BLANK_CONTACT, ...c, client: c.client?._id || c.client || '' });
    setModalOpen(true);
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove contact “${row.firstName} ${row.lastName || ''}”?`)) return;
    try {
      await apiFetch(`/contacts/${row._id}`, token, { method: 'DELETE' });
      toast.success('Contact removed');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget?._id) {
        await apiFetch(`/contacts/${editTarget._id}`, token, { method:'PUT', body: JSON.stringify(form) });
        toast.success('Contact updated');
      } else {
        await apiFetch('/contacts', token, { method:'POST', body: JSON.stringify(form) });
        toast.success('Contact created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key:'name', header:'Name', render:r => (
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent-soft)] text-xs font-bold" style={{ color:'var(--portal-accent)' }}>
          {(r.firstName?.[0] || '?').toUpperCase()}
        </div>
        <div>
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{r.firstName} {r.lastName}</p>
          {r.role && <p className="text-xs text-neutral-500">{r.role}</p>}
        </div>
      </div>
    )},
    { key:'title', header:'Title', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.title||'—'}</span> },
    { key:'email', header:'Email', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.email||'—'}</span> },
    { key:'phone', header:'Phone', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.phone||'—'}</span> },
    { key:'department', header:'Dept', render:r => <StatusBadge tone={DEPT_BADGE_TONE[r.department]||'neutral'} label={r.department} /> },
    { key:'client', header:'Client', render:r => <span className="text-xs text-neutral-500">{r.client?.name||'—'}</span> },
  ];

  return (
    <>
      <Modal open={modalOpen} title={editTarget ? 'Edit Contact' : 'New Contact'} onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-contact-form" loading={saving}>{editTarget ? 'Save' : 'Create'}</Button>
          </div>
        }
      >
        <form id="crm-contact-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ClientPicker
              clients={clients}
              value={form.client}
              onChange={set('client')}
              label="Client Organisation"
              required={false}
              allowNone
            />
          </div>
          <Input label="First Name *" required name="firstName" value={form.firstName} onChange={set('firstName')} />
          <Input label="Last Name"     name="lastName"  value={form.lastName}  onChange={set('lastName')} />
          <Input label="Title"         name="title"     value={form.title}     onChange={set('title')} />
          <Input label="Email"         name="email"     type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone"         name="phone"     type="tel"  value={form.phone} onChange={set('phone')} />
          <Input label="Role"          name="role"      value={form.role}      onChange={set('role')} />
          <Select label="Department *" name="department" required value={form.department} onChange={set('department')} options={DEPT_OPTIONS} />
          <div className="flex items-center gap-2 pt-5">
            <input type="checkbox" id="isPrimary" checked={form.isPrimary} onChange={set('isPrimary')} className="h-4 w-4 rounded border-neutral-300" />
            <label htmlFor="isPrimary" className="text-sm text-neutral-700 dark:text-neutral-300">Primary contact</label>
          </div>
          <div className="sm:col-span-2">
            <TextArea label="Notes" rows={2} name="notes" value={form.notes} onChange={set('notes')} />
          </div>
        </form>
      </Modal>

      <SectionCard title={`Contacts${contacts.length ? ` (${contacts.length})` : ''}`} icon="contacts" description="People within client organisations"
        loading={loading} empty={!loading && contacts.length === 0}
        emptyTitle="No contacts yet" emptyAction={{ label:'Add Contact', onClick:openCreate }}
        action={
          <div className="flex items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">search</span>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search contacts…"
                aria-label="Search contacts"
                className="h-9 w-44 rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={openCreate}>Add Contact</Button>
          </div>
        }
        noBodyPadding
      >
        <DataTable
          columns={columns}
          rows={contacts}
          rowKey="_id"
          onRowClick={openEdit}
          rowActions={(row) => [
            { label: 'Edit',   icon: 'edit',   onClick: () => openEdit(row) },
            { label: 'Remove', icon: 'delete', tone: 'danger', onClick: () => handleDelete(row) },
          ]}
          emptyTitle="No contacts"
        />
      </SectionCard>
    </>
  );
}

// ── Status Management ─────────────────────────────────────────────────────────
const BLANK_STATUS = { name:'', department:'shared', color:'#6366f1', order:0, description:'', isDefault:false, isTerminal:false };

function StatusModule({ token, department }) {
  const toast = useToast();
  const [statuses, setStatuses] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(BLANK_STATUS);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/statuses?department=${department}`, token)
      .then(r => setStatuses(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({
    ...f,
    [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value,
  }));

  const openCreate = (dept) => {
    setEditTarget(null);
    setForm({ ...BLANK_STATUS, department: dept || (department === 'all' ? 'shared' : department) });
    setModalOpen(true);
  };
  const openEdit = (s) => { setEditTarget(s); setForm({ ...BLANK_STATUS, ...s }); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = { ...form, order: Number(form.order) || 0 };
      if (editTarget?._id) {
        await apiFetch(`/statuses/${editTarget._id}`, token, { method:'PUT', body: JSON.stringify(payload) });
        toast.success('Status updated');
      } else {
        await apiFetch('/statuses', token, { method:'POST', body: JSON.stringify(payload) });
        toast.success('Status created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (s) => {
    if (!window.confirm(`Retire the “${s.name}” stage? Clients already in it keep the label, but it can no longer be selected.`)) return;
    try {
      await apiFetch(`/statuses/${s._id}`, token, { method:'DELETE' });
      toast.success('Status retired');
      load();
    } catch (err) { toast.error(err.message); }
  };

  /** Reorder by swapping `order` with the neighbour — the pipeline reads in this sequence. */
  const move = async (list, index, delta) => {
    const target = list[index + delta];
    const current = list[index];
    if (!target) return;
    try {
      await Promise.all([
        apiFetch(`/statuses/${current._id}`, token, { method:'PUT', body: JSON.stringify({ order: target.order }) }),
        apiFetch(`/statuses/${target._id}`,  token, { method:'PUT', body: JSON.stringify({ order: current.order }) }),
      ]);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const byDept = (d) => statuses.filter(s => s.department === d).sort((a, b) => a.order - b.order);

  const renderGroup = (title, dept) => {
    const items = byDept(dept);
    return (
      <div key={dept}>
        <div className="mb-3 flex items-center justify-between">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{title}</p>
          <button
            type="button"
            onClick={() => openCreate(dept)}
            className="text-xs font-bold text-[var(--portal-accent)] hover:underline"
          >
            + Add stage
          </button>
        </div>
        {items.length === 0 ? (
          <p className="text-sm italic text-neutral-400">None configured</p>
        ) : (
          <ol className="space-y-1.5">
            {items.map((s, i) => (
              <li
                key={s._id}
                className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white px-3 py-2 dark:border-neutral-700 dark:bg-neutral-800"
              >
                <span className="w-5 shrink-0 text-center text-[11px] font-bold text-neutral-400">{i + 1}</span>
                <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: s.color }} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <p className="text-sm font-bold text-neutral-900 dark:text-neutral-100">{s.name}</p>
                    {s.isDefault  && <StatusBadge tone="info"    label="Default"  dot={false} />}
                    {s.isTerminal && <StatusBadge tone="success" label="Terminal" dot={false} />}
                  </div>
                  {s.description && <p className="truncate text-xs text-neutral-500">{s.description}</p>}
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <button type="button" onClick={() => move(items, i, -1)} disabled={i === 0}
                    aria-label={`Move ${s.name} earlier`}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-700">
                    <span className="material-symbols-outlined text-[16px]">arrow_upward</span>
                  </button>
                  <button type="button" onClick={() => move(items, i, 1)} disabled={i === items.length - 1}
                    aria-label={`Move ${s.name} later`}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 disabled:opacity-30 dark:hover:bg-neutral-700">
                    <span className="material-symbols-outlined text-[16px]">arrow_downward</span>
                  </button>
                  <button type="button" onClick={() => openEdit(s)} aria-label={`Edit ${s.name}`}
                    className="rounded p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-700">
                    <span className="material-symbols-outlined text-[16px]">edit</span>
                  </button>
                  <button type="button" onClick={() => handleDelete(s)} aria-label={`Retire ${s.name}`}
                    className="rounded p-1 text-neutral-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                  </button>
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    );
  };

  return (
    <>
      <Modal open={modalOpen} title={editTarget ? 'Edit Status' : 'New Status'} description="Stages define the relationship pipeline and the order it flows in" onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-status-form" loading={saving}>{editTarget ? 'Save Changes' : 'Create Status'}</Button>
          </div>
        }
      >
        <form id="crm-status-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Status Name *" required name="name" value={form.name} onChange={set('name')} placeholder="e.g. Proposal Sent" />
          </div>
          <Select label="Department" name="department" value={form.department} onChange={set('department')}
            options={[{ value:'media', label:'Media' }, { value:'marketing', label:'Marketing' }, { value:'shared', label:'Shared (both)' }]}
          />
          <Input label="Sort Order" name="order" type="number" value={form.order} onChange={set('order')} />
          <div>
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200" htmlFor="status-color">Colour</label>
            <input id="status-color" type="color" value={form.color} onChange={set('color')} className="h-11 w-full cursor-pointer rounded-lg border border-neutral-200 p-1 dark:border-neutral-700" />
          </div>
          <div className="flex flex-col justify-center gap-2 pt-5">
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={Boolean(form.isDefault)} onChange={set('isDefault')} className="h-4 w-4 rounded border-neutral-300" />
              Default entry stage
            </label>
            <label className="flex items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
              <input type="checkbox" checked={Boolean(form.isTerminal)} onChange={set('isTerminal')} className="h-4 w-4 rounded border-neutral-300" />
              Terminal (closes the pipeline)
            </label>
          </div>
          <div className="sm:col-span-2">
            <Input label="Description" name="description" value={form.description} onChange={set('description')} placeholder="Optional — shown in status tooltips" />
          </div>
        </form>
      </Modal>

      <SectionCard title="Status Management" icon="flag" description="Department-aware configurable relationship pipelines, in stage order"
        loading={loading}
        action={<Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={() => openCreate()}>Add Status</Button>}
      >
        <div className="space-y-6">
          {renderGroup('Media Pipeline', 'media')}
          {renderGroup('Marketing Pipeline', 'marketing')}
          {renderGroup('Shared Stages', 'shared')}
        </div>
      </SectionCard>
    </>
  );
}

// ── Follow-ups ────────────────────────────────────────────────────────────────
const BLANK_FOLLOWUP = { client:'', department:'media', type:'call', priority:'medium', notes:'', dueDate:'', nextAction:'', assignedTo:'', outcome:'' };

function FollowUpsModule({ token, department }) {
  const toast = useToast();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [statusFilter, setStatusFilter] = useState('pending');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(BLANK_FOLLOWUP);
  const [saving, setSaving]     = useState(false);

  const clients = useClientOptions(token, department);
  const users   = useUserOptions(token);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({
      department,
      status: statusFilter,
      ...(assigneeFilter ? { assignedTo: assigneeFilter } : {}),
    }).toString();
    apiFetch(`/followups?${q}`, token)
      .then(r => setItems(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, statusFilter, assigneeFilter]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => {
    setEditTarget(null);
    setForm({ ...BLANK_FOLLOWUP, department: department === 'all' ? 'media' : department });
    setModalOpen(true);
  };

  const openEdit = (f) => {
    setEditTarget(f);
    setForm({
      ...BLANK_FOLLOWUP,
      ...f,
      client: f.client?._id || f.client || '',
      assignedTo: f.assignedTo?._id || f.assignedTo || '',
      dueDate: toDateInput(f.dueDate),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client) { toast.error('Select a client for this follow-up'); return; }
    setSaving(true);
    try {
      const payload = { ...form, assignedTo: form.assignedTo || undefined };
      if (editTarget?._id) {
        await apiFetch(`/followups/${editTarget._id}`, token, { method:'PUT', body: JSON.stringify(payload) });
        toast.success('Follow-up updated');
      } else {
        await apiFetch('/followups', token, { method:'POST', body: JSON.stringify(payload) });
        toast.success('Follow-up created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const markComplete = async (id) => {
    try {
      await apiFetch(`/followups/${id}`, token, { method:'PUT', body: JSON.stringify({ status:'completed' }) });
      toast.success('Marked complete');
      load();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const cancelFollowUp = async (id) => {
    try {
      await apiFetch(`/followups/${id}`, token, { method:'PUT', body: JSON.stringify({ status:'cancelled' }) });
      toast.success('Follow-up cancelled');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const STATUS_TABS = ['pending','overdue','completed','cancelled'];
  const TYPE_ICONS  = { call:'call', email:'email', meeting:'meeting_room', visit:'location_on', proposal:'description', approval:'check_circle', other:'more_horiz' };

  return (
    <>
      <Modal open={modalOpen} title={editTarget ? 'Edit Follow-up' : 'New Follow-up'} onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-followup-form" loading={saving}>{editTarget ? 'Save Changes' : 'Create Follow-up'}</Button>
          </div>
        }
      >
        <form id="crm-followup-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ClientPicker clients={clients} value={form.client} onChange={set('client')} />
          </div>
          <Select label="Department *" required name="department" value={form.department} onChange={set('department')}
            options={SINGLE_DEPT_OPTIONS} />
          <Select label="Type" name="type" value={form.type} onChange={set('type')}
            options={Object.keys(TYPE_ICONS).map(t => ({ value:t, label:t.charAt(0).toUpperCase()+t.slice(1) }))} />
          <Select label="Priority" name="priority" value={form.priority} onChange={set('priority')} options={PRIORITY_OPTIONS} />
          <Input label="Due Date *" required name="dueDate" type="date" value={form.dueDate} onChange={set('dueDate')} />
          <div className="sm:col-span-2">
            <UserPicker users={users} value={form.assignedTo} onChange={set('assignedTo')} />
          </div>
          <div className="sm:col-span-2">
            <TextArea label="Notes" rows={2} name="notes" value={form.notes} onChange={set('notes')} placeholder="What needs to happen?" />
          </div>
          <div className="sm:col-span-2">
            <Input label="Next Action" name="nextAction" value={form.nextAction} onChange={set('nextAction')} />
          </div>
          {editTarget && (
            <div className="sm:col-span-2">
              <TextArea label="Outcome" rows={2} name="outcome" value={form.outcome} onChange={set('outcome')} placeholder="Recorded on the client timeline when completed" />
            </div>
          )}
        </form>
      </Modal>

      <SectionCard
        title="Follow-ups"
        icon="event_available"
        description="Track client follow-up actions across Media & Marketing"
        loading={loading}
        empty={!loading && items.length === 0}
        emptyTitle={`No ${statusFilter} follow-ups`}
        emptyAction={statusFilter === 'pending' ? { label:'Create Follow-up', onClick: openCreate } : undefined}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {/* Status tabs */}
            <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
              {STATUS_TABS.map(s => (
                <button key={s} type="button" onClick={() => setStatusFilter(s)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${statusFilter===s ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'}`}
                >
                  {s.charAt(0).toUpperCase()+s.slice(1)}
                </button>
              ))}
            </div>
            <select
              value={assigneeFilter}
              onChange={e => setAssigneeFilter(e.target.value)}
              aria-label="Filter by assignee"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All assignees</option>
              {users.map(u => <option key={u._id} value={u._id}>{userLabel(u)}</option>)}
            </select>
            <Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={openCreate}>Add</Button>
          </div>
        }
      >
        <div className="space-y-3">
          {items.map(f => {
            const overdue = f.status === 'pending' && new Date(f.dueDate) < new Date();
            const done = f.status === 'completed';
            return (
              <div key={f._id}
                className={`relative flex items-start gap-4 overflow-hidden rounded-xl border p-4 pl-5 transition-all hover:shadow-md ${
                  overdue
                    ? 'border-red-200 bg-red-50/50 dark:border-red-900/40 dark:bg-red-900/10'
                    : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-800/50'
                } ${done ? 'opacity-70' : ''}`}
              >
                {/* Priority rail — severity readable before any text is parsed */}
                <span
                  aria-hidden="true"
                  className="absolute inset-y-0 left-0 w-1.5"
                  style={{ background: overdue ? '#e11d48' : PRIORITY_RAIL[f.priority] || '#94a3b8' }}
                />
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${overdue ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' : ''}`}
                  style={overdue ? undefined : { background:'var(--portal-accent-soft)', color:'var(--portal-accent)' }}>
                  <span className="material-symbols-outlined text-xl">{done ? 'task_alt' : TYPE_ICONS[f.type]||'event'}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-semibold text-neutral-900 dark:text-neutral-100">{f.client?.name || 'No client linked'}</p>
                    <StatusBadge tone={DEPT_BADGE_TONE[f.department]||'neutral'} label={f.department} />
                    <StatusBadge tone={PRIORITY_TONE[f.priority]||'neutral'} label={f.priority} />
                    {overdue && <StatusBadge tone="danger" label="Overdue" />}
                  </div>
                  {f.notes && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{f.notes}</p>}
                  <p className="mt-1 text-xs text-neutral-400">
                    <span className="capitalize">{f.type}</span>
                    {' · Due: '}
                    <span className={overdue ? 'font-semibold text-red-600' : ''}>{fmt(f.dueDate)}</span>
                    {f.status === 'pending' && ` (${relativeDue(f.dueDate)})`}
                    {f.assignedTo && ` · ${userLabel(f.assignedTo)}`}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {f.status === 'pending' && (
                    <Button variant="success" size="sm" onClick={() => markComplete(f._id)}>Done</Button>
                  )}
                  <DropdownMenu
                    items={[
                      { label: 'Edit', icon: 'edit', onClick: () => openEdit(f) },
                      ...(f.status === 'pending'
                        ? [{ label: 'Cancel', icon: 'cancel', tone: 'danger', onClick: () => cancelFollowUp(f._id) }]
                        : []),
                    ]}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>
    </>
  );
}

// ── Communication History ─────────────────────────────────────────────────────
const BLANK_COMM = { client:'', department:'media', type:'note', direction:'outbound', subject:'', body:'', isInternal:false, outcome:'', occurredAt:'' };

function CommunicationsModule({ token, department }) {
  const toast = useToast();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [page, setPage]         = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal]       = useState(0);
  const [typeFilter, setTypeFilter]     = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm]         = useState(BLANK_COMM);
  const [saving, setSaving]     = useState(false);

  const clients = useClientOptions(token, department);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({
      department, page, limit: 20,
      ...(typeFilter ? { type: typeFilter } : {}),
      ...(clientFilter ? { clientId: clientFilter } : {}),
    }).toString();
    apiFetch(`/communications?${q}`, token)
      .then(r => { setItems(r.data || []); setTotal(r.total||0); setTotalPages(r.pages||1); })
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, page, typeFilter, clientFilter]);

  useEffect(() => { setPage(1); }, [department, typeFilter, clientFilter]);
  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  const openCreate = () => {
    setForm({
      ...BLANK_COMM,
      department: department === 'all' ? 'media' : department,
      client: clientFilter || '',
      // Default to now, so the timeline orders correctly without extra typing.
      occurredAt: new Date().toISOString().slice(0, 16),
    });
    setModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.client) { toast.error('Select a client for this entry'); return; }
    setSaving(true);
    try {
      const payload = { ...form, occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : undefined };
      await apiFetch('/communications', token, { method:'POST', body: JSON.stringify(payload) });
      toast.success('Communication logged');
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const DIRECTION_TONE = { outbound:'info', inbound:'success', internal:'neutral' };

  return (
    <>
      <Modal open={modalOpen} title="Log Communication" description="Record any client interaction for the unified history" onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-comm-form" loading={saving}>Log</Button>
          </div>
        }
      >
        <form id="crm-comm-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <ClientPicker clients={clients} value={form.client} onChange={set('client')} />
          </div>
          <Select label="Type" name="type" value={form.type} onChange={set('type')}
            options={Object.keys(TYPE_ICONS_COMMS).filter(t => t !== 'status_change').map(t => ({ value:t, label:t.replace('_',' ').replace(/\b\w/g,c=>c.toUpperCase()) }))} />
          <Select label="Direction" name="direction" value={form.direction} onChange={set('direction')}
            options={[{ value:'outbound', label:'Outbound' }, { value:'inbound', label:'Inbound' }, { value:'internal', label:'Internal' }]} />
          <Select label="Department *" required name="department" value={form.department} onChange={set('department')}
            options={SINGLE_DEPT_OPTIONS} />
          <Input label="Occurred At" name="occurredAt" type="datetime-local" value={form.occurredAt} onChange={set('occurredAt')} />
          <div className="sm:col-span-2">
            <Input label="Subject" name="subject" value={form.subject} onChange={set('subject')} placeholder="e.g. Kick-off call" />
          </div>
          <div className="sm:col-span-2">
            <TextArea label="Notes / Body" rows={4} name="body" value={form.body} onChange={set('body')} />
          </div>
          <div className="sm:col-span-2">
            <Input label="Outcome" name="outcome" value={form.outcome} onChange={set('outcome')} placeholder="What came of it?" />
          </div>
          <div className="flex items-center gap-2">
            <input type="checkbox" id="isInternal" checked={form.isInternal} onChange={set('isInternal')} className="h-4 w-4 rounded border-neutral-300" />
            <label htmlFor="isInternal" className="text-sm text-neutral-600 dark:text-neutral-400">Internal note (not shared with client)</label>
          </div>
        </form>
      </Modal>

      <SectionCard
        title={`Communication History${total ? ` (${total})` : ''}`}
        icon="forum"
        description="Chronological record of all client interactions"
        loading={loading}
        empty={!loading && items.length === 0}
        emptyTitle="No communications logged"
        emptyAction={{ label:'Log First Entry', onClick: openCreate }}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={clientFilter}
              onChange={e => setClientFilter(e.target.value)}
              aria-label="Filter by client"
              className="h-9 max-w-[12rem] rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All clients</option>
              {clients.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              aria-label="Filter by type"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All types</option>
              {Object.keys(TYPE_ICONS_COMMS).map(t => (
                <option key={t} value={t}>{t.replace('_',' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
            <Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={openCreate}>Log</Button>
          </div>
        }
      >
        <div className="space-y-2">
          {items.map(c => (
            <div key={c._id} className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-neutral-50/50 p-4 dark:border-neutral-700 dark:bg-neutral-800/30">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl" style={{ background:'var(--portal-accent-soft)', color:'var(--portal-accent)' }}>
                <span className="material-symbols-outlined text-[18px]">{TYPE_ICONS_COMMS[c.type]||'chat'}</span>
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.subject || c.type?.replace('_',' ')}</p>
                  <StatusBadge tone={DEPT_BADGE_TONE[c.department]||'neutral'} label={c.department} dot={false} />
                  <StatusBadge tone={DIRECTION_TONE[c.direction]||'neutral'} label={c.direction} dot={false} />
                  {c.isInternal && <StatusBadge tone="neutral" label="Internal" dot={false} />}
                </div>
                {c.client?.name && (
                  <p className="mt-0.5 text-xs font-semibold text-[var(--portal-accent)]">{c.client.name}</p>
                )}
                {c.body && <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400 line-clamp-2">{c.body}</p>}
                <p className="mt-1 text-xs text-neutral-400">
                  {c.createdBy ? `${userLabel(c.createdBy)} · ` : ''}
                  {fmtDateTime(c.occurredAt || c.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-xs text-neutral-500">Page {page} of {totalPages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page<=1} onClick={() => setPage(p=>p-1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page>=totalPages} onClick={() => setPage(p=>p+1)}>Next</Button>
            </div>
          </div>
        )}
      </SectionCard>
    </>
  );
}

// ── Email & Content ───────────────────────────────────────────────────────────
const BLANK_TEMPLATE = { name:'', department:'shared', type:'other', subject:'', body:'' };
const TEMPLATE_TYPE_OPTIONS = ['introduction','followup','proposal','meeting','delivery','outreach','update','other'].map(t => ({ value:t, label:t.charAt(0).toUpperCase()+t.slice(1) }));

function EmailModule({ token, department }) {
  const toast = useToast();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading]     = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewModal, setViewModal] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]           = useState(BLANK_TEMPLATE);
  const [saving, setSaving]       = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/email-templates?department=${department}`, token)
      .then(r => setTemplates(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => { setEditTarget(null); setForm(BLANK_TEMPLATE); setModalOpen(true); };
  const openEdit   = (t) => { setEditTarget(t); setForm({ ...BLANK_TEMPLATE, ...t }); setViewModal(null); setModalOpen(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget?._id) {
        await apiFetch(`/email-templates/${editTarget._id}`, token, { method:'PUT', body: JSON.stringify(form) });
        toast.success('Template updated');
      } else {
        await apiFetch('/email-templates', token, { method:'POST', body: JSON.stringify(form) });
        toast.success('Template created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (t) => {
    if (!window.confirm(`Delete the “${t.name}” template?`)) return;
    try {
      await apiFetch(`/email-templates/${t._id}`, token, { method:'DELETE' });
      toast.success('Template deleted');
      setViewModal(null);
      load();
    } catch (err) { toast.error(err.message); }
  };

  const copyTemplate = async (t) => {
    try {
      await navigator.clipboard.writeText(`Subject: ${t.subject}\n\n${t.body}`);
      toast.success('Template copied to clipboard');
    } catch { toast.error('Could not copy to clipboard'); }
  };

  const TYPE_ICONS_EMAIL = { introduction:'waving_hand', followup:'replay', proposal:'description', meeting:'calendar_month', delivery:'local_shipping', outreach:'send', update:'update', other:'email' };

  return (
    <>
      <Modal open={modalOpen} title={editTarget ? 'Edit Email Template' : 'New Email Template'} description="Use {{variable}} placeholders for dynamic content" onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-email-form" loading={saving}>{editTarget ? 'Save Changes' : 'Create Template'}</Button>
          </div>
        }
      >
        <form id="crm-email-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-1">
              <Input label="Template Name *" required name="name" value={form.name} onChange={set('name')} />
            </div>
            <Select label="Type" name="type" value={form.type} onChange={set('type')} options={TEMPLATE_TYPE_OPTIONS} />
            <Select label="Department" name="department" value={form.department} onChange={set('department')}
              options={[{ value:'media', label:'Media' }, { value:'marketing', label:'Marketing' }, { value:'shared', label:'Shared' }]} />
          </div>
          <Input label="Subject *" required name="subject" value={form.subject} onChange={set('subject')} placeholder="e.g. Introduction — {{company_name}}" />
          <div>
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Body *</label>
            <textarea required rows={8} name="body" value={form.body} onChange={set('body')}
              placeholder="Dear {{contact_name}},&#10;&#10;..."
              className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 font-mono text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" />
            <p className="mt-1 text-xs text-neutral-400">Variables: {'{{contact_name}}'}, {'{{company_name}}'}, {'{{sender_name}}'}</p>
          </div>
        </form>
      </Modal>

      {/* Template viewer */}
      <Modal
        open={Boolean(viewModal)}
        title={viewModal?.name || 'Template'}
        onClose={() => setViewModal(null)}
        footer={viewModal && (
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="danger" size="sm" onClick={() => handleDelete(viewModal)}>Delete</Button>
            <Button variant="secondary" size="sm" onClick={() => copyTemplate(viewModal)}>Copy</Button>
            <Button variant="accent" size="sm" onClick={() => openEdit(viewModal)}>Edit</Button>
          </div>
        )}
      >
        {viewModal && (
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              <StatusBadge tone={DEPT_BADGE_TONE[viewModal.department]||'neutral'} label={viewModal.department} />
              <StatusBadge tone="neutral" label={viewModal.type} />
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Subject</p>
              <p className="mt-1 text-sm font-medium text-neutral-900 dark:text-neutral-100">{viewModal.subject}</p>
            </div>
            <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800">
              <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">Body</p>
              <pre className="mt-1 whitespace-pre-wrap font-sans text-sm text-neutral-700 dark:text-neutral-300">{viewModal.body}</pre>
            </div>
          </div>
        )}
      </Modal>

      <SectionCard title="Email & Content Templates" icon="email" description="Reusable email templates for Media & Marketing communications"
        loading={loading}
        empty={!loading && templates.length === 0}
        emptyTitle="No templates yet"
        emptyAction={{ label:'Create Template', onClick: openCreate }}
        action={<Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={openCreate}>New Template</Button>}
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {templates.map(t => (
            <button key={t._id} type="button" onClick={() => setViewModal(t)}
              className="flex flex-col items-start gap-2 rounded-xl border border-neutral-200 bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:border-[var(--portal-accent)] hover:shadow-md dark:border-neutral-700 dark:bg-neutral-800"
              style={{ boxShadow:'var(--erp-shadow-soft)' }}
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background:'var(--portal-accent-soft)', color:'var(--portal-accent)' }}>
                <span className="material-symbols-outlined text-[18px]">{TYPE_ICONS_EMAIL[t.type]||'email'}</span>
              </div>
              <div className="min-w-0 w-full">
                <p className="font-semibold text-neutral-900 dark:text-neutral-100 truncate">{t.name}</p>
                <p className="mt-0.5 text-xs text-neutral-500 truncate">{t.subject}</p>
              </div>
              <div className="flex flex-wrap gap-1 mt-auto">
                <StatusBadge tone={DEPT_BADGE_TONE[t.department]||'neutral'} label={t.department} dot={false} />
                <StatusBadge tone="neutral" label={t.type} dot={false} />
              </div>
            </button>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

// ── Vendors & Third Parties ───────────────────────────────────────────────────
const BLANK_VENDOR = { name:'', department:'media', entityType:'vendor', category:'', contactPerson:'', email:'', phone:'', website:'', notes:'' };

function VendorsModule({ token, department }) {
  const toast = useToast();
  const [items, setItems]       = useState([]);
  const [loading, setLoading]   = useState(true);
  const [entityFilter, setEntityFilter] = useState('vendor');
  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm]         = useState(BLANK_VENDOR);
  const [saving, setSaving]     = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/vendors?department=${department}&entityType=${entityFilter}`, token)
      .then(r => setItems(r.data || []))
      .catch(err => toast.error(err.message))
      .finally(() => setLoading(false));
  }, [token, department, entityFilter]);

  useEffect(() => { load(); }, [load]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const openCreate = () => { setEditTarget(null); setForm({ ...BLANK_VENDOR, entityType: entityFilter }); setModalOpen(true); };
  const openEdit   = (v)  => { setEditTarget(v); setForm({ ...BLANK_VENDOR, ...v }); setModalOpen(true); };

  const handleDelete = async (row) => {
    if (!window.confirm(`Remove “${row.name}”?`)) return;
    try {
      await apiFetch(`/vendors/${row._id}`, token, { method: 'DELETE' });
      toast.success('Removed');
      load();
    } catch (err) { toast.error(err.message); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editTarget?._id) {
        await apiFetch(`/vendors/${editTarget._id}`, token, { method:'PUT', body: JSON.stringify(form) });
        toast.success('Updated');
      } else {
        await apiFetch('/vendors', token, { method:'POST', body: JSON.stringify(form) });
        toast.success('Created');
      }
      setModalOpen(false);
      load();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key:'name', header:'Name', render:r => <span className="font-semibold text-neutral-900 dark:text-neutral-100">{r.name}</span> },
    { key:'category', header:'Category', render:r => <span className="text-sm text-neutral-500">{r.category||'—'}</span> },
    { key:'contactPerson', header:'Contact', render:r => <span className="text-sm text-neutral-600 dark:text-neutral-400">{r.contactPerson||'—'}</span> },
    { key:'email', header:'Email', render:r => <span className="text-sm text-neutral-500">{r.email||'—'}</span> },
    { key:'department', header:'Dept', render:r => <StatusBadge tone={DEPT_BADGE_TONE[r.department]||'neutral'} label={r.department} /> },
  ];

  const entityLabel = entityFilter === 'vendor' ? 'Vendors' : 'Third Parties';

  return (
    <>
      <Modal open={modalOpen} title={editTarget ? `Edit ${entityLabel.slice(0,-1)}` : `New ${entityLabel.slice(0,-1)}`} onClose={() => setModalOpen(false)}
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button variant="accent" type="submit" form="crm-vendor-form" loading={saving}>{editTarget ? 'Save' : 'Create'}</Button>
          </div>
        }
      >
        <form id="crm-vendor-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Name *" required name="name" value={form.name} onChange={set('name')} />
          </div>
          <Select label="Department" name="department" value={form.department} onChange={set('department')} options={DEPT_OPTIONS} />
          <Select label="Entity Type" name="entityType" value={form.entityType} onChange={set('entityType')}
            options={[{ value:'vendor', label:'Vendor' }, { value:'third_party', label:'Third Party' }]} />
          <Input label="Category" name="category" value={form.category} onChange={set('category')} placeholder="e.g. Photography, Analytics" />
          <Input label="Contact Person" name="contactPerson" value={form.contactPerson} onChange={set('contactPerson')} />
          <Input label="Email" name="email" type="email" value={form.email} onChange={set('email')} />
          <Input label="Phone" name="phone" type="tel" value={form.phone} onChange={set('phone')} />
          <div className="sm:col-span-2">
            <Input label="Website" name="website" value={form.website} onChange={set('website')} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Notes</label>
            <textarea rows={2} name="notes" value={form.notes} onChange={set('notes')} className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100" />
          </div>
        </form>
      </Modal>

      <SectionCard
        title={entityLabel}
        icon={entityFilter === 'vendor' ? 'store' : 'integration_instructions'}
        description={entityFilter === 'vendor' ? 'Media & Marketing service vendors' : 'Third-party integrations and partners'}
        loading={loading}
        empty={!loading && items.length === 0}
        emptyTitle={`No ${entityLabel.toLowerCase()} yet`}
        emptyAction={{ label:`Add ${entityLabel.slice(0,-1)}`, onClick: openCreate }}
        action={
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
              {[['vendor','Vendors'],['third_party','Third Parties']].map(([v,l]) => (
                <button key={v} type="button" onClick={() => setEntityFilter(v)}
                  className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${entityFilter===v ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400'}`}>{l}</button>
              ))}
            </div>
            <Button variant="accent" size="sm" icon={<span className="material-symbols-outlined text-base">add</span>} onClick={openCreate}>Add</Button>
          </div>
        }
        noBodyPadding
      >
        <DataTable
          columns={columns}
          rows={items}
          rowKey="_id"
          onRowClick={openEdit}
          rowActions={(row) => [
            { label: 'Edit',   icon: 'edit',   onClick: () => openEdit(row) },
            { label: 'Remove', icon: 'delete', tone: 'danger', onClick: () => handleDelete(row) },
          ]}
          emptyTitle={`No ${entityLabel.toLowerCase()}`}
        />
      </SectionCard>
    </>
  );
}

// ── Reports & Analytics ───────────────────────────────────────────────────────
// Categorical palette, fixed order so a given series keeps its colour between
// renders and between charts.
const PALETTE = ['#6366f1','#0ea5e9','#10b981','#f59e0b','#ec4899','#8b5cf6','#14b8a6','#ef4444'];

const prettyLabel = (v) => String(v ?? '—').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

/** Horizontal ranked bars. Scaled to the largest row so small values stay visible. */
function BarList({ rows = [], offset = 0 }) {
  const max = Math.max(...rows.map(r => r.count || 0), 1);
  const total = rows.reduce((n, r) => n + (r.count || 0), 0) || 1;
  return (
    <div className="space-y-3">
      {rows.slice(0, 10).map((r, i) => {
        const color = PALETTE[(i + offset) % PALETTE.length];
        return (
          <div key={r._id ?? i}>
            <div className="mb-1 flex items-baseline justify-between gap-2">
              <span className="flex min-w-0 items-center gap-2 text-sm text-neutral-700 dark:text-neutral-300">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />
                <span className="truncate">{prettyLabel(r._id)}</span>
              </span>
              <span className="shrink-0 text-sm font-bold tabular-nums text-neutral-900 dark:text-neutral-100">
                {r.count}
                <span className="ml-1.5 text-xs font-medium text-neutral-400">
                  {Math.round((r.count / total) * 100)}%
                </span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
              <div className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${Math.max(3, (r.count / max) * 100)}%`, background: color }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Donut built from a single conic-gradient — no chart dependency for what is a
 * share-of-total readout. Each slice is also listed with its exact value,
 * because a ring alone is hard to read precisely.
 */
function DonutChart({ rows = [] }) {
  const total = rows.reduce((n, r) => n + (r.count || 0), 0);
  if (!total) return null;

  let cursor = 0;
  const stops = rows.map((r, i) => {
    const start = (cursor / total) * 360;
    cursor += r.count || 0;
    const end = (cursor / total) * 360;
    return `${PALETTE[i % PALETTE.length]} ${start}deg ${end}deg`;
  }).join(', ');

  return (
    <div className="flex flex-wrap items-center justify-center gap-6 sm:justify-start">
      <div className="relative h-36 w-36 shrink-0">
        <div className="h-full w-full rounded-full" style={{ background: `conic-gradient(${stops})` }} />
        {/* Inner cut-out carries the total, so the chart answers "how many" too */}
        <div className="absolute inset-[22%] flex flex-col items-center justify-center rounded-full bg-white dark:bg-neutral-900">
          <span className="text-xl font-black tabular-nums text-neutral-900 dark:text-neutral-100">{total}</span>
          <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">Total</span>
        </div>
      </div>
      <ul className="min-w-0 space-y-2">
        {rows.map((r, i) => (
          <li key={r._id ?? i} className="flex items-center gap-2.5 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="min-w-0 flex-1 truncate text-neutral-700 dark:text-neutral-300">{prettyLabel(r._id)}</span>
            <span className="shrink-0 font-bold tabular-nums text-neutral-900 dark:text-neutral-100">{r.count}</span>
            <span className="w-9 shrink-0 text-right text-xs tabular-nums text-neutral-400">
              {Math.round((r.count / total) * 100)}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

const DATE_PRESETS = [
  { key: '30',  label: '30 days' },
  { key: '90',  label: '90 days' },
  { key: '365', label: '12 months' },
  { key: 'all', label: 'All time' },
];

function AnalyticsModule({ token, department }) {
  const toast = useToast();
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange]     = useState('90');

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams({ department });
    if (range !== 'all') {
      params.set('dateFrom', new Date(Date.now() - Number(range) * 86400000).toISOString());
    }
    apiFetch(`/analytics?${params}`, token)
      .then(r => setData(r.data))
      .catch(err => { toast.error(err.message); setData(null); })
      .finally(() => setLoading(false));
  }, [token, department, range]);

  const exportReport = () => {
    if (!data) return;
    const lines = [['Report','Category','Count']];
    const push = (name, rows) => (rows || []).forEach(r => lines.push([name, prettyLabel(r._id), r.count]));
    push('Clients by Department', data.clientsByDept);
    push('Clients by Status', data.clientsByStatus);
    push('Follow-ups by Status', data.followupsByStatus);
    push('Communications by Type', data.commsByType);
    const csv = lines.map(r => r.map(v => `"${String(v).replace(/"/g,'""')}"`).join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type:'text/csv;charset=utf-8;' }));
    const a = Object.assign(document.createElement('a'), { href:url, download:`crm-analytics-${department}-${new Date().toISOString().slice(0,10)}.csv` });
    a.click();
    URL.revokeObjectURL(url);
  };

  const rangeLabel = DATE_PRESETS.find(p => p.key === range)?.label.toLowerCase();

  return (
    <div className="space-y-5">
      {/* Report controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-neutral-200 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-900"
        style={{ boxShadow:'var(--erp-shadow-soft)' }}
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[18px] text-neutral-400">date_range</span>
          <div className="flex rounded-lg border border-neutral-200 bg-neutral-50 p-0.5 dark:border-neutral-700 dark:bg-neutral-800">
            {DATE_PRESETS.map(p => (
              <button key={p.key} type="button" onClick={() => setRange(p.key)}
                aria-pressed={range === p.key}
                className={`rounded-md px-3 py-1 text-xs font-bold transition-colors ${
                  range === p.key
                    ? 'bg-white text-neutral-900 shadow-sm dark:bg-neutral-700 dark:text-white'
                    : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'
                }`}>
                {p.label}
              </button>
            ))}
          </div>
        </div>
        <Button variant="secondary" size="sm" onClick={exportReport} disabled={!data}
          icon={<span className="material-symbols-outlined text-base">download</span>}>
          Export CSV
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <SectionCard title="Clients by Department" icon="donut_small"
          description="Share of the client base held by each department"
          loading={loading} empty={!loading && !data?.clientsByDept?.length} emptyTitle="No client data yet" skeletonRows={4}>
          <DonutChart rows={data?.clientsByDept || []} />
        </SectionCard>

        <SectionCard title="Clients by Status" icon="bar_chart"
          description="Where the client base sits in the pipeline"
          loading={loading} empty={!loading && !data?.clientsByStatus?.length} emptyTitle="No client data yet" skeletonRows={4}>
          <BarList rows={data?.clientsByStatus || []} />
        </SectionCard>

        <SectionCard title="Follow-ups by Status" icon="event_available"
          description="Task completion across the period"
          loading={loading} empty={!loading && !data?.followupsByStatus?.length} emptyTitle="No follow-ups yet" skeletonRows={4}>
          <BarList rows={data?.followupsByStatus || []} offset={2} />
        </SectionCard>

        <SectionCard title="Communications by Type" icon="forum"
          description={`Interactions logged in the last ${rangeLabel}`}
          loading={loading} empty={!loading && !data?.commsByType?.length} emptyTitle="No communications yet" skeletonRows={4}>
          <BarList rows={data?.commsByType || []} offset={4} />
        </SectionCard>
      </div>
    </div>
  );
}

// ── CRM Settings ──────────────────────────────────────────────────────────────
function SettingsModule() {
  const ENDPOINTS = [
    '/api/v1/crm/dashboard','/api/v1/crm/clients','/api/v1/crm/clients/:id/overview',
    '/api/v1/crm/pipeline','/api/v1/crm/contacts','/api/v1/crm/statuses',
    '/api/v1/crm/email-templates','/api/v1/crm/followups','/api/v1/crm/communications',
    '/api/v1/crm/vendors','/api/v1/crm/analytics','/api/v1/crm/users',
  ];
  const PERMISSIONS = [
    ['Super Admin / Admin', 'Full CRM access — all departments, all records, all settings'],
    ['media_head',          'Media CRM records — clients, contacts, follow-ups, communications'],
    ['media_marketing',     'Marketing CRM records'],
    ['media_sales',         'Marketing context — clients and follow-ups'],
    ['CRM Viewer (future)', 'Read-only access to assigned records'],
  ];
  return (
    <div className="space-y-5">
      <SectionCard title="Permissions Matrix" icon="security" description="Who can access what within the CRM">
        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
          {PERMISSIONS.map(([role, desc]) => (
            <div key={role} className="flex items-start gap-3 py-3">
              <span className="material-symbols-outlined mt-0.5 text-[18px]" style={{ color:'var(--portal-accent)' }}>shield_person</span>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{role}</p>
                <p className="text-xs text-neutral-500">{desc}</p>
              </div>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="API Endpoints" icon="api" description="Internal REST endpoints — require a Bearer token with a CRM role">
        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
          {ENDPOINTS.map(ep => (
            <div key={ep} className="flex items-center gap-2 rounded-lg border border-neutral-100 bg-neutral-50/70 px-2.5 py-2 font-mono text-xs transition-colors hover:border-neutral-200 dark:border-neutral-800 dark:bg-neutral-800/50">
              <span className="shrink-0 rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-bold text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">
                REST
              </span>
              <code className="min-w-0 truncate text-neutral-600 dark:text-neutral-400" title={ep}>{ep}</code>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Scope Rules" icon="gavel" description="Data governance enforced at both frontend and backend">
        <ul className="space-y-2 text-sm text-neutral-600 dark:text-neutral-400">
          {[
            'This CRM serves ONLY Media and Marketing departments.',
            'Every record carries a department field: "media", "marketing", or "both".',
            'Shared clients (both) are visible to authorised users of either department.',
            'Finance, HR, IT, LAW, and YarrowTech records are never imported here.',
            'No separate CRM exists inside the Media or Marketing portal — this is the single source.',
            'Status history is immutable once written; soft-delete via isActive = false.',
          ].map((r,i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="material-symbols-outlined mt-0.5 shrink-0 text-[16px] text-emerald-500">check_circle</span>
              {r}
            </li>
          ))}
        </ul>
      </SectionCard>
    </div>
  );
}

// ── Pipeline module ───────────────────────────────────────────────────────────
// Thin wrapper so the board can open the same Client 360 drawer the list uses.
function PipelineModule({ token, department }) {
  const [detailId, setDetailId] = useState(null);
  const [statuses] = useStatusOptions(token, department);
  const [reloadKey, setReloadKey] = useState(0);

  return (
    <>
      <ClientDetailDrawer
        open={Boolean(detailId)}
        clientId={detailId}
        token={token}
        statuses={statuses}
        onClose={() => setDetailId(null)}
        onChanged={() => setReloadKey(k => k + 1)}
      />
      <SectionCard
        title="Relationship Pipeline"
        icon="view_kanban"
        description="Drag a client card between stages to move it through the pipeline"
        noBodyPadding
        bodyClassName="p-4"
      >
        <div className="p-4">
          <PipelineBoard key={reloadKey} token={token} department={department} onOpenClient={setDetailId} />
        </div>
      </SectionCard>
    </>
  );
}

// ── Module registry ───────────────────────────────────────────────────────────
const MODULES = [
  { id:'dashboard', label:'Dashboard',           icon:'dashboard',              Component: CRMDashboard },
  { id:'clients',   label:'Clients',              icon:'groups',                 Component: ClientsModule },
  { id:'pipeline',  label:'Pipeline',             icon:'view_kanban',            Component: PipelineModule },
  { id:'projects',  label:'CRM by Project',       icon:'folder_special',         Component: ProjectsModule },
  { id:'import',    label:'Import from Excel',    icon:'upload_file',            Component: ImportModule },
  { id:'contacts',  label:'Contacts',             icon:'contacts',               Component: ContactsModule },
  { id:'statuses',  label:'Status Management',    icon:'flag',                   Component: StatusModule },
  { id:'email',     label:'Email & Content',      icon:'email',                  Component: EmailModule },
  { id:'followups', label:'Follow-ups',           icon:'event_available',        Component: FollowUpsModule },
  { id:'reminders', label:'Reminders',            icon:'notifications_active',   Component: RemindersModule },
  { id:'comms',     label:'Communication History',icon:'forum',                  Component: CommunicationsModule },
  { id:'activity',  label:'Activity Feed',        icon:'history',                Component: ActivityModule },
  { id:'vendors',   label:'Vendors & 3rd Parties',icon:'store',                  Component: VendorsModule },
  { id:'analytics', label:'Reports & Analytics',  icon:'bar_chart',              Component: AnalyticsModule },
  { id:'settings',  label:'CRM Settings',         icon:'settings',               Component: SettingsModule },
];

// Navigation grouping. Module ids are unchanged — these groups are presentation only,
// so existing /admin/crm/:id routes keep working. Leads & Opportunities and a split
// Third-Party Providers section are part of the CRM roadmap but not yet built; they
// are deliberately absent here rather than shown as dead links.
const NAV_GROUPS = [
  { id:'overview',     label:'Overview',                      moduleIds:['dashboard'] },
  { id:'relationship', label:'Relationship Management',       moduleIds:['clients','pipeline','projects','contacts','statuses'] },
  { id:'activities',   label:'Activities & Communication',    moduleIds:['followups','comms','email'] },
  { id:'network',      label:'Business Network',              moduleIds:['vendors'] },
  { id:'intelligence', label:'Intelligence & Configuration',  moduleIds:['analytics','import','settings'] },
];

const MODULE_BY_ID = Object.fromEntries(MODULES.map(m => [m.id, m]));

const NAV_GROUPS_RESOLVED = NAV_GROUPS.map(group => ({
  ...group,
  modules: group.moduleIds.map(id => MODULE_BY_ID[id]).filter(Boolean),
}));

// ── Root page ─────────────────────────────────────────────────────────────────
export default function AdminCRMPage() {
  const { token, user } = useAuth();
  const location = useLocation();
  const navigate  = useNavigate();

  const urlSegment   = location.pathname.split('/').pop();
  const activeId     = MODULES.find(m => m.id === urlSegment)?.id ?? 'dashboard';
  const [department, setDepartment] = useState(readStoredDepartment);

  const selectDepartment = useCallback((key) => {
    setDepartment(key);
    try { localStorage.setItem(DEPT_STORAGE_KEY, key); } catch {}
  }, []);

  const [collapsedGroups, setCollapsedGroups] = useState(readCollapsedGroups);

  const toggleGroup = useCallback((groupId) => {
    setCollapsedGroups((prev) => {
      const next = prev.includes(groupId) ? prev.filter(g => g !== groupId) : [...prev, groupId];
      try { localStorage.setItem(NAV_GROUPS_STORAGE_KEY, JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const { Component: ActiveComponent } = MODULES.find(m => m.id === activeId) || MODULES[0];

  const activeModule = MODULE_BY_ID[activeId] || MODULES[0];
  const activeGroup  = NAV_GROUPS_RESOLVED.find(g => g.modules.some(m => m.id === activeId));

  // Sidebar badges. Only counts that mean "there is work here" are shown —
  // a badge on every item would be noise rather than signal.
  // The CRM nav sits beside the portal's own sidebar, so on a narrower desktop the
  // page carries two nav columns before any content. Collapsing to an icon rail
  // gives the content back ~190px; the choice persists like the group state.
  const [navCollapsed, setNavCollapsed] = useState(() => {
    try { return localStorage.getItem(NAV_COLLAPSED_KEY) === '1'; } catch { return false; }
  });
  const toggleNav = useCallback(() => {
    setNavCollapsed(v => {
      const next = !v;
      try { localStorage.setItem(NAV_COLLAPSED_KEY, next ? '1' : '0'); } catch { /* private mode */ }
      return next;
    });
  }, []);

  const [counts, setCounts] = useState({});
  useEffect(() => {
    let cancelled = false;
    apiFetch(`/dashboard?department=${department}`, token)
      .then(r => {
        if (cancelled) return;
        setCounts({ clients: r.data?.activeClients || 0, followups: r.data?.overdueFollowUps || 0 });
      })
      .catch(() => { if (!cancelled) setCounts({}); });
    return () => { cancelled = true; };
  }, [token, department, activeId]);

  return (
    <div className="min-w-0">
      {/* Portal header */}
      <PortalHeader
        title="CRM Management"
        subtitle="Media & Marketing — Centralised Client Relationship Management"
        icon="contact_page"
        user={user}
        showThemeToggle
      >
        {/* Department filter in header right slot */}
        <div
          role="group"
          aria-label="Department filter"
          className="inline-flex rounded-xl border border-neutral-200 bg-neutral-100/80 p-1 dark:border-neutral-700 dark:bg-neutral-800"
        >
          {DEPT_TABS.map(({ key, label, short, icon }) => (
            <button
              key={key}
              type="button"
              aria-pressed={department === key}
              title={label}
              onClick={() => selectDepartment(key)}
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-all focus:outline-none focus-visible:ring-2 ${
                department === key
                  ? 'bg-white text-neutral-900 shadow-sm ring-1 ring-black/5 dark:bg-neutral-700 dark:text-white dark:ring-white/10'
                  : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">{icon}</span>
              <span className="hidden sm:inline">{short}</span>
            </button>
          ))}
        </div>
      </PortalHeader>

      <div className="flex items-start gap-5">
        {/* Desktop sidebar nav — sticky so navigation stays reachable on long pages */}
        <aside className={`crm-scroll-thin sticky top-4 hidden max-h-[calc(100vh-2rem)] shrink-0 flex-col overflow-y-auto overflow-x-hidden rounded-2xl border border-neutral-200 bg-white p-2 transition-[width] duration-200 dark:border-neutral-800 dark:bg-neutral-900 lg:flex ${
          navCollapsed ? 'w-[60px]' : 'w-60'
        }`}
          style={{ boxShadow:'var(--erp-shadow-soft)' }}
        >
          {/* Collapse toggle */}
          <button
            type="button"
            onClick={toggleNav}
            aria-label={navCollapsed ? 'Expand CRM navigation' : 'Collapse CRM navigation'}
            title={navCollapsed ? 'Expand' : 'Collapse'}
            className="mb-1 flex items-center gap-2 self-stretch rounded-lg px-2 py-1.5 text-neutral-400 transition-colors hover:bg-neutral-100 hover:text-neutral-700 focus:outline-none focus-visible:ring-2 dark:hover:bg-neutral-800 dark:hover:text-neutral-200"
          >
            <span className="material-symbols-outlined text-[18px]">
              {navCollapsed ? 'right_panel_open' : 'left_panel_close'}
            </span>
            {!navCollapsed && <span className="text-[11px] font-bold uppercase tracking-wider">Collapse</span>}
          </button>

          <nav className="flex flex-col gap-1">
            {NAV_GROUPS_RESOLVED.map(({ id: groupId, label: groupLabel, modules }) => {
              // A collapsed rail has no room for group headers, so every group renders
              // its items; the headers and their toggles return when it expands.
              const open = navCollapsed || !collapsedGroups.includes(groupId);
              const groupHasActive = modules.some(m => m.id === activeId);
              return (
                <div key={groupId} className="flex flex-col">
                  {navCollapsed ? (
                    <span className="mx-2 my-1 h-px bg-neutral-100 dark:bg-neutral-800" aria-hidden="true" />
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleGroup(groupId)}
                      aria-expanded={open}
                      className="flex w-full items-center gap-1.5 rounded-lg px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-400 transition-colors hover:text-neutral-600 focus:outline-none focus-visible:ring-2 dark:hover:text-neutral-300"
                    >
                      <span className="truncate">{groupLabel}</span>
                      {/* A collapsed group still signals that something inside it is active. */}
                      {!open && groupHasActive && (
                        <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background:'var(--portal-accent)' }} />
                      )}
                      <span className={`material-symbols-outlined ml-auto text-[16px] transition-transform ${open ? '' : '-rotate-90'}`}>
                        expand_more
                      </span>
                    </button>
                  )}

                  {open && (
                    <div className="flex flex-col gap-0.5 pb-1">
                      {modules.map(({ id, label, icon }) => {
                        const active = activeId === id;
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => navigate(`/admin/crm/${id}`)}
                            title={navCollapsed ? label : undefined}
                            className={`group relative flex w-full items-center rounded-xl py-2 text-left text-[13px] transition-all focus:outline-none focus-visible:ring-2 ${
                              navCollapsed ? 'justify-center px-0' : 'gap-2.5 pl-3 pr-2.5'
                            } ${
                              active
                                ? 'bg-[var(--portal-accent-soft)] font-bold'
                                : 'font-medium text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800 dark:hover:text-neutral-100'
                            }`}
                            style={active ? { color:'var(--portal-accent)' } : {}}
                            aria-current={active ? 'page' : undefined}
                          >
                            {/* Active rail — a clearer anchor than a trailing dot */}
                            <span
                              aria-hidden="true"
                              className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-opacity ${active ? 'opacity-100' : 'opacity-0'}`}
                              style={{ background:'var(--portal-accent)' }}
                            />
                            <span className="relative material-symbols-outlined text-[19px]">
                              {icon}
                              {/* Collapsed, the count has nowhere to sit inline — it
                                  becomes a dot so "there is work here" still reads. */}
                              {navCollapsed && id === 'followups' && counts.followups > 0 && (
                                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full ring-2 ring-white dark:ring-neutral-900"
                                  style={{ background:'#e11d48' }} />
                              )}
                            </span>
                            {!navCollapsed && (
                              <>
                                <span className="min-w-0 flex-1 truncate">{label}</span>
                                {counts[id] > 0 && (
                                  // The follow-ups badge is an OVERDUE count, so it reads
                                  // red; the clients badge is a neutral total.
                                  <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-bold tabular-nums ${
                                    id === 'followups'
                                      ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                                      : active
                                        ? 'bg-white/70 text-[var(--portal-accent)] dark:bg-neutral-900/50'
                                        : 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400'
                                  }`}>
                                    {counts[id] > 99 ? '99+' : counts[id]}
                                  </span>
                                )}
                              </>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Content column. One <main> for both breakpoints: rendering the active
            module twice (once per breakpoint) mounted it twice and double-fetched. */}
        <main className="min-w-0 flex-1">
          {/* Mobile module switcher — a select beats a ten-item scroll strip on a phone */}
          <div className="mb-4 lg:hidden">
            <label className="sr-only" htmlFor="crm-module-switch">CRM module</label>
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px]" style={{ color:'var(--portal-accent)' }}>
                {activeModule.icon}
              </span>
              <select
                id="crm-module-switch"
                value={activeId}
                onChange={e => navigate(`/admin/crm/${e.target.value}`)}
                className="h-11 w-full appearance-none rounded-xl border border-neutral-200 bg-white pl-10 pr-9 text-sm font-bold text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
                style={{ boxShadow:'var(--erp-shadow-soft)' }}
              >
                {NAV_GROUPS_RESOLVED.map(({ id: gid, label: glabel, modules }) => (
                  <optgroup key={gid} label={glabel}>
                    {modules.map(({ id, label }) => <option key={id} value={id}>{label}</option>)}
                  </optgroup>
                ))}
              </select>
              <span className="material-symbols-outlined pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">expand_more</span>
            </div>
          </div>

          {/* Module title row. Replaces the old breadcrumb: the sidebar already shows
              the group and the active item, so "CRM › Group › Module" restated what was
              visible two columns to the left. The department chip lived here too and
              duplicated the header's own filter — dropped for the same reason. */}
          <div className="mb-3 hidden items-center gap-2 lg:flex">
            <span className="material-symbols-outlined text-[20px]" style={{ color:'var(--portal-accent)' }}>
              {activeModule.icon}
            </span>
            <h2 className="text-base font-black text-neutral-900 dark:text-neutral-100">{activeModule.label}</h2>
            {activeGroup && (
              <span className="hidden text-xs text-neutral-400 xl:inline">{activeGroup.label}</span>
            )}
          </div>

          {/* Keyed on module + department so a switch remounts cleanly instead of
              briefly showing the previous module's rows under the new heading. */}
          <div key={`${activeId}-${department}`} className="crm-module-enter">
            <ActiveComponent token={token} department={department} />
          </div>
        </main>
      </div>
    </div>
  );
}
