/**
 * Project-wise CRM — the working surface, not just a rollup.
 *
 * The list of projects is the index; the real work happens inside one. Selecting
 * a project opens its workspace: its clients in a sortable, filterable table with
 * inline stage/priority/owner editing, a project-scoped Excel upload, and the
 * import history for that project with per-batch undo.
 *
 * Why a drill-down rather than expanding cards in place: a project's roster needs
 * a table with filters, pagination and row actions. That does not fit inside an
 * accordion row, and nesting it there meant every control was cramped and the
 * client list capped at an arbitrary 100 with no way to search it.
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import SectionCard from '../../ui/SectionCard';
import DataTable from '../../ui/DataTable';
import EmptyState from '../../ui/EmptyState';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config/backend';
import ClientDetailDrawer from './ClientDetailDrawer';
import ClientFormModal from './ClientFormModal';
import ProjectImportModal from './ProjectImportModal';
import BulkActionBar from './BulkActionBar';
import {
  useCrmClients, useCrmStatuses, useCrmUsers, useCrmProjects,
  useCrmProjectBreakdown, useCrmImportBatches,
  useUpdateCrmClient, useDeactivateCrmClient, useRevertCrmImport,
  useCrmPrefetch,
} from '../../../hooks/useCrmQueries';
import {
  DEPT_BADGE_TONE, PRIORITY_TONE, PRIORITY_OPTIONS,
  fmt, fmtDateTime, userLabel,
} from './crmShared';

const PAGE_SIZE = 15;

/** Stacked Media/Marketing/Shared bar — the department mix at a glance. */
function DeptBar({ media, marketing, both, total }) {
  if (!total) return null;
  const seg = [
    { n: media,     color: '#0ea5e9', label: 'Media' },
    { n: marketing, color: '#10b981', label: 'Marketing' },
    { n: both,      color: '#8b5cf6', label: 'Shared' },
  ].filter(s => s.n > 0);
  return (
    <div className="flex h-2 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
      {seg.map(s => (
        <div key={s.label} style={{ width: `${(s.n / total) * 100}%`, background: s.color }}
          title={`${s.label}: ${s.n}`} />
      ))}
    </div>
  );
}

// ── Project index ─────────────────────────────────────────────────────────────

function ProjectCard({ row, stageColors, onOpen, onUpload }) {
  return (
    <div
      className="group overflow-hidden rounded-2xl border border-neutral-200 bg-white transition-shadow hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
      style={{ boxShadow: 'var(--erp-shadow-soft)' }}
    >
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => onOpen(row)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black"
          style={{
            background: row.themeColor ? `${row.themeColor}22` : 'var(--portal-accent-soft)',
            color: row.themeColor || 'var(--portal-accent)',
          }}
          aria-label={`Open ${row.projectName}`}
        >
          {(row.projectName?.[0] || '?').toUpperCase()}
        </button>

        <div className="min-w-0 flex-1">
          <button type="button" onClick={() => onOpen(row)} className="block w-full text-left">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="truncate font-bold text-neutral-900 group-hover:underline dark:text-neutral-100">
                {row.projectName}
              </p>
              {row.projectCode && <span className="font-mono text-[11px] text-neutral-400">{row.projectCode}</span>}
              {row.imported > 0 && <StatusBadge tone="info" label={`${row.imported} imported`} dot={false} />}
              {row.overdue > 0 && <StatusBadge tone="danger" label={`${row.overdue} overdue`} dot={false} />}
            </div>

            <div className="mt-2 flex items-center gap-3">
              <DeptBar media={row.media} marketing={row.marketing} both={row.both} total={row.total} />
              <span className="shrink-0 text-xs text-neutral-500">
                {row.media > 0 && <span className="text-sky-600">{row.media} media</span>}
                {row.media > 0 && (row.marketing > 0 || row.both > 0) && ' · '}
                {row.marketing > 0 && <span className="text-emerald-600">{row.marketing} mktg</span>}
                {row.both > 0 && ` · ${row.both} shared`}
              </span>
            </div>

            {row.stages?.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {row.stages.slice(0, 5).map(s => (
                  <span key={s.name}
                    className="inline-flex items-center gap-1 rounded-full border border-neutral-200 px-2 py-0.5 text-[11px] text-neutral-600 dark:border-neutral-700 dark:text-neutral-400">
                    <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColors[s.name] || '#94a3b8' }} />
                    {s.name} {s.count}
                  </span>
                ))}
                {row.stages.length > 5 && (
                  <span className="text-[11px] text-neutral-400">+{row.stages.length - 5} more</span>
                )}
              </div>
            )}

            {row.lastActivity && (
              <p className="mt-2 text-[11px] text-neutral-400">Last activity {fmt(row.lastActivity)}</p>
            )}
          </button>
        </div>

        <div className="flex shrink-0 flex-col items-end gap-2">
          <button type="button" onClick={() => onOpen(row)} className="text-right">
            <p className="text-2xl font-black tabular-nums text-neutral-900 dark:text-neutral-100">{row.total}</p>
            <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">clients</p>
          </button>
          <div className="flex gap-1">
            {row.projectId && (
              <button
                type="button"
                onClick={() => onUpload(row)}
                title={`Upload Excel into ${row.projectName}`}
                aria-label={`Upload Excel into ${row.projectName}`}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-primary dark:border-neutral-700 dark:hover:bg-neutral-800"
              >
                <span className="material-symbols-outlined text-[18px]">upload_file</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpen(row)}
              title={`Manage ${row.projectName}`}
              aria-label={`Manage ${row.projectName}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-primary dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Project workspace ─────────────────────────────────────────────────────────

/**
 * One project's CRM: its clients, its imports, its stage mix.
 *
 * Stage, priority and owner are editable straight from the row. Moving a client
 * through the pipeline is the single most frequent CRM action, and making it cost
 * a drawer-open and a form submit is what makes a CRM go stale.
 */
function ProjectWorkspace({ project, token, department, statuses, users, projects, isAdmin, onBack, onChanged }) {
  const toast = useToast();

  const [page, setPage]         = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch]     = useState('');
  const [statusFilter, setStatusFilter]     = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const [detailId, setDetailId]   = useState(null);
  const [formOpen, setFormOpen]   = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [importOpen, setImportOpen] = useState(false);
  // Ids with a save in flight — the row's selects disable so a second change
  // cannot race the first and land the pipeline on the wrong stage.
  const [savingIds, setSavingIds] = useState(() => new Set());
  const [selectedIds, setSelectedIds] = useState([]);
  // Bumped to clear the table's selection without refetching.
  const [resetKey, setResetKey] = useState(0);

  const stageColors = useMemo(
    () => Object.fromEntries(statuses.map(s => [s.name, s.color])),
    [statuses],
  );

  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 350);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => { setPage(1); }, [search, statusFilter, priorityFilter, project.projectId]);

  const clientsQuery = useCrmClients({
    department,
    projectId: project.projectId || 'unassigned',
    page,
    limit: PAGE_SIZE,
    search,
    status: statusFilter,
    priority: priorityFilter,
  });

  // `clients` is held in local state as well as the cache, because inline edits
  // patch a row optimistically. It re-syncs whenever the query produces new
  // data, so a cache invalidation or a background refetch still lands here.
  const [clients, setClients] = useState([]);
  const serverClients = clientsQuery.data?.data;
  useEffect(() => { setClients(serverClients || []); }, [serverClients]);

  const total   = clientsQuery.data?.total || 0;
  const pages   = clientsQuery.data?.pages || 1;
  const loading = clientsQuery.isLoading;

  const batchesQuery = useCrmImportBatches(
    project.projectId ? { projectId: project.projectId, limit: 10 } : {},
  );
  const batches = project.projectId ? (batchesQuery.data || []) : [];

  const loadClients = clientsQuery.refetch;

  const updateClient     = useUpdateCrmClient();
  const deactivateClient = useDeactivateCrmClient();
  const revertImport     = useRevertCrmImport();
  // Warms the 360 view on row hover so the drawer opens populated.
  const { prefetchClientOverview } = useCrmPrefetch();

  /**
   * Refresh everything a write could have touched.
   *
   * The mutation hooks already invalidate the shared CRM caches, so this only
   * has to nudge the parent's rollup; the client list and import history
   * refetch themselves off their own invalidated keys.
   */
  const refreshAll = useCallback(() => {
    onChanged?.();
  }, [onChanged]);

  /**
   * Inline field save. The row is updated optimistically so the select does not
   * snap back while the request is in flight, and reverted from the server's
   * response — or on failure — so the table never shows a value that was rejected.
   */
  const patchClient = async (row, patch) => {
    const previous = clients;
    setSavingIds(s => new Set(s).add(row._id));
    setClients(cs => cs.map(c => (c._id === row._id ? { ...c, ...patch } : c)));
    try {
      const data = await updateClient.mutateAsync({ id: row._id, patch });
      setClients(cs => cs.map(c => (c._id === row._id ? { ...c, ...data } : c)));
      const [field] = Object.keys(patch);
      toast.success(`${row.name}: ${field} updated`);
      onChanged?.();
    } catch (err) {
      setClients(previous);
      toast.error(err.message);
    } finally {
      setSavingIds(s => { const n = new Set(s); n.delete(row._id); return n; });
    }
  };

  const handleDelete = async (row) => {
    if (!window.confirm(`Deactivate “${row.name}”? The record is archived, not erased, and can be restored in the database.`)) return;
    try {
      await deactivateClient.mutateAsync(row._id);
      toast.success('Client deactivated');
      refreshAll();
    } catch (err) { toast.error(err.message); }
  };

  const revertBatch = async (batchId) => {
    if (!window.confirm('Undo this import? Clients it created will be permanently deleted. Records it only updated stay as they are.')) return;
    try {
      const data = await revertImport.mutateAsync(batchId);
      toast.success(`Removed ${data.removed} imported client${data.removed === 1 ? '' : 's'}`);
      refreshAll();
    } catch (err) { toast.error(err.message); }
  };

  /**
   * Export the whole filtered set. The server builds the file, so it covers
   * every matching row rather than the page in memory, and resolves owner and
   * project refs to names.
   */
  const exportFile = async (format) => {
    try {
      const q = new URLSearchParams({
        format,
        department,
        projectId: project.projectId || 'unassigned',
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

      // Honour the filename the server chose rather than rebuilding it here,
      // so the two cannot drift apart.
      const disposition = res.headers.get('Content-Disposition') || '';
      const fallback = `crm-clients-${new Date().toISOString().slice(0, 10)}.${format}`;
      const filename = /filename="?([^"]+)"?/.exec(disposition)?.[1] || fallback;

      const url = URL.createObjectURL(await res.blob());
      const a = Object.assign(document.createElement('a'), { href: url, download: filename });
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) { toast.error(err.message); }
  };

  const selectCls = 'h-8 max-w-[150px] rounded-lg border border-neutral-200 bg-white px-1.5 text-xs text-neutral-700 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-200';

  const columns = [
    { key: 'name', header: 'Client', render: r => (
      <div className="flex items-center gap-2.5">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-xs font-black"
          style={{ background: 'var(--portal-accent-soft)', color: 'var(--portal-accent)' }} aria-hidden="true">
          {(r.name?.[0] || '?').toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="truncate font-bold text-neutral-900 dark:text-neutral-100">{r.name}</p>
          <p className="truncate font-mono text-[11px] text-neutral-400">
            {r.clientId}{r.contactPerson ? ` · ${r.contactPerson}` : ''}
            {r.importBatch ? ' · imported' : ''}
          </p>
        </div>
      </div>
    )},
    { key: 'email', header: 'Contact', render: r => (
      <div className="min-w-0">
        <p className="truncate text-sm text-neutral-600 dark:text-neutral-400">{r.email || '—'}</p>
        {r.phone && <p className="truncate text-xs text-neutral-400">{r.phone}</p>}
      </div>
    )},
    { key: 'department', header: 'Dept', render: r => (
      <StatusBadge tone={DEPT_BADGE_TONE[r.department] || 'neutral'} label={r.department} />
    )},
    // Inline stage move. stopPropagation keeps the row's open-drawer click from
    // firing when the operator is only reaching for the dropdown.
    { key: 'status', header: 'Stage', render: r => (
      <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: stageColors[r.status] || '#94a3b8' }} />
        <select
          value={statuses.some(s => s.name === r.status) ? r.status : ''}
          disabled={savingIds.has(r._id)}
          aria-label={`Stage for ${r.name}`}
          onChange={e => e.target.value && patchClient(r, { status: e.target.value })}
          className={selectCls}
        >
          {!statuses.some(s => s.name === r.status) && (
            <option value="">{r.status || 'Unassigned'}</option>
          )}
          {statuses.map(s => <option key={s._id} value={s.name}>{s.name}</option>)}
        </select>
      </div>
    )},
    { key: 'priority', header: 'Priority', render: r => (
      <div onClick={e => e.stopPropagation()}>
        <select
          value={r.priority || 'medium'}
          disabled={savingIds.has(r._id)}
          aria-label={`Priority for ${r.name}`}
          onChange={e => patchClient(r, { priority: e.target.value })}
          className={selectCls}
        >
          {PRIORITY_OPTIONS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
    )},
    { key: 'owner', header: 'Owner', render: r => (
      <div onClick={e => e.stopPropagation()}>
        <select
          value={r.owner?._id || r.owner || ''}
          disabled={savingIds.has(r._id)}
          aria-label={`Owner for ${r.name}`}
          onChange={e => patchClient(r, { owner: e.target.value || null })}
          className={selectCls}
        >
          <option value="">— Unassigned —</option>
          {users.map(u => <option key={u._id} value={u._id}>{userLabel(u)}</option>)}
        </select>
      </div>
    )},
    { key: 'nextFollowUpAt', header: 'Next Follow-up', render: r => {
      const overdue = r.nextFollowUpAt && new Date(r.nextFollowUpAt) < new Date();
      return <span className={`text-xs ${overdue ? 'font-semibold text-red-600' : 'text-neutral-400'}`}>{fmt(r.nextFollowUpAt)}</span>;
    }},
  ];

  const rowActions = (row) => [
    { label: 'View details', icon: 'visibility', onClick: () => setDetailId(row._id) },
    { label: 'Edit',         icon: 'edit',       onClick: () => { setEditTarget(row); setFormOpen(true); } },
    { label: 'Deactivate',   icon: 'delete',     tone: 'danger', onClick: () => handleDelete(row) },
  ];

  const filtered = Boolean(search || statusFilter || priorityFilter);

  return (
    <div className="space-y-5">
      <ClientFormModal
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditTarget(null); }}
        onSaved={refreshAll}
        token={token}
        editData={editTarget}
        statuses={statuses}
        users={users}
        lockedProject={editTarget ? null : (project.projectId ? project : null)}
        defaultDepartment={department}
      />

      <ProjectImportModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        project={project}
        token={token}
        department={department}
        onImported={refreshAll}
      />

      <ClientDetailDrawer
        open={Boolean(detailId)}
        clientId={detailId}
        token={token}
        statuses={statuses}
        onClose={() => setDetailId(null)}
        onChanged={refreshAll}
        onEdit={(c) => { setDetailId(null); setEditTarget(c); setFormOpen(true); }}
      />

      {/* Project header */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
        style={{ boxShadow: 'var(--erp-shadow-soft)' }}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 items-start gap-3">
            <Button variant="secondary" size="sm" onClick={onBack}
              icon={<span className="material-symbols-outlined text-base">arrow_back</span>}>
              All projects
            </Button>
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-base font-black"
              style={{
                background: project.themeColor ? `${project.themeColor}22` : 'var(--portal-accent-soft)',
                color: project.themeColor || 'var(--portal-accent)',
              }}>
              {(project.projectName?.[0] || '?').toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="truncate text-lg font-black text-neutral-900 dark:text-neutral-100">{project.projectName}</h3>
                {project.projectCode && <span className="font-mono text-xs text-neutral-400">{project.projectCode}</span>}
              </div>
              <p className="text-xs text-neutral-500">
                {project.total} client{project.total === 1 ? '' : 's'}
                {project.imported > 0 && ` · ${project.imported} imported`}
                {project.overdue > 0 && ` · ${project.overdue} overdue`}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => exportFile('csv')}
              icon={<span className="material-symbols-outlined text-base">download</span>}>
              CSV
            </Button>
            <Button variant="secondary" size="sm" onClick={() => exportFile('xlsx')}
              icon={<span className="material-symbols-outlined text-base">table_view</span>}>
              Excel
            </Button>
            {project.projectId && (
              <Button variant="secondary" size="sm" onClick={() => setImportOpen(true)}
                icon={<span className="material-symbols-outlined text-base">upload_file</span>}>
                Upload Excel
              </Button>
            )}
            <Button variant="accent" size="sm" onClick={() => { setEditTarget(null); setFormOpen(true); }}
              icon={<span className="material-symbols-outlined text-base">add</span>}>
              Add Client
            </Button>
          </div>
        </div>

        {project.stages?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-neutral-100 pt-3 dark:border-neutral-800">
            {project.stages.map(s => {
              const active = statusFilter === s.name;
              return (
                <button
                  key={s.name}
                  type="button"
                  onClick={() => setStatusFilter(active ? '' : s.name)}
                  aria-pressed={active}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                    active
                      ? 'border-transparent bg-primary/10 text-primary'
                      : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: stageColors[s.name] || '#94a3b8' }} />
                  {s.name}
                  <span className="tabular-nums">{s.count}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Clients */}
      <SectionCard
        title={`Clients${total ? ` (${total})` : ''}`}
        icon="groups"
        description={`Every CRM record under ${project.projectName}`}
        loading={loading}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">search</span>
              <input
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                placeholder="Search in this project…"
                aria-label="Search clients in this project"
                className="h-9 w-48 rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              />
            </div>
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              aria-label="Filter by stage"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All stages</option>
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
            {filtered && (
              <Button variant="secondary" size="sm"
                onClick={() => { setSearchInput(''); setStatusFilter(''); setPriorityFilter(''); }}>
                Clear
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={loadClients}
              icon={<span className="material-symbols-outlined text-base">refresh</span>}>
              Refresh
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
          onRowHover={r => prefetchClientOverview(r._id)}
          rowActions={rowActions}
          emptyTitle={filtered ? 'No clients match these filters' : 'No clients in this project yet'}
        />

        <BulkActionBar
          ids={selectedIds}
          token={token}
          statuses={statuses}
          users={users}
          projects={projects}
          canDeactivate={isAdmin}
          onClear={() => setResetKey(k => k + 1)}
          onDone={refreshAll}
        />
        {pages > 1 && (
          <div className="flex items-center justify-between border-t border-neutral-100 px-4 py-3 dark:border-neutral-800">
            <span className="text-xs text-neutral-500">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
              <Button variant="secondary" size="sm" disabled={page >= pages} onClick={() => setPage(p => p + 1)}>Next</Button>
            </div>
          </div>
        )}
      </SectionCard>

      {/* Import history for this project */}
      {project.projectId && (
        <SectionCard
          title="Import history"
          icon="history"
          description="Spreadsheet uploads into this project. Undo removes only the clients an import created."
          empty={batches.length === 0}
          emptyIcon="upload_file"
          emptyTitle="No imports yet"
          emptyDescription="Upload an Excel file to populate this project"
          emptyAction={{ label: 'Upload Excel', onClick: () => setImportOpen(true) }}
          noBodyPadding
        >
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {batches.map(b => (
              <li key={b.batchId} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="material-symbols-outlined text-[20px] text-neutral-400">description</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{b.fileName}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {fmtDateTime(b.createdAt)} · {userLabel(b.importedBy)} · {b.created} created
                    {b.updated > 0 && `, ${b.updated} updated`}
                    {b.skipped > 0 && `, ${b.skipped} skipped`}
                    {b.failed > 0 && `, ${b.failed} failed`}
                  </p>
                </div>
                {b.revertedAt ? (
                  <StatusBadge tone="neutral" label="Reverted" dot={false} />
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => revertBatch(b.batchId)}
                    icon={<span className="material-symbols-outlined text-base">undo</span>}>
                    Undo
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

// ── Module ────────────────────────────────────────────────────────────────────

export default function ProjectsModule({ token, department }) {
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState(null);
  const [importRow, setImportRow]   = useState(null);
  const [query, setQuery]     = useState('');

  const { user } = useAuth();
  // Reference data is shared cache: whichever CRM screen loaded it first, this
  // one reads it without a request of its own.
  const { data: statuses = [] } = useCrmStatuses(department);
  const { data: users = [] } = useCrmUsers();
  const { data: projects = [] } = useCrmProjects();

  // Deactivation is admin-only server-side; mirror that here so the control is
  // absent rather than present-and-rejected.
  const isAdmin = ['admin', 'super_admin', 'superadmin'].includes(user?.role);

  const stageColors = useMemo(
    () => Object.fromEntries(statuses.map(s => [s.name, s.color])),
    [statuses],
  );

  const breakdownQuery = useCrmProjectBreakdown(department);
  // Memoised: `data || []` would be a fresh array identity on every render,
  // which defeats the useMemo hooks below that depend on `rows`.
  const rows = useMemo(() => breakdownQuery.data || [], [breakdownQuery.data]);
  const loading = breakdownQuery.isLoading;
  const load = breakdownQuery.refetch;

  // Switching department can remove the open project from the rollup entirely,
  // which would otherwise leave the workspace showing a project that is no
  // longer in scope.
  useEffect(() => { setSelectedId(null); }, [department]);

  // Keyed by id so the open workspace picks up fresh counts after every write
  // rather than holding the snapshot it was opened with.
  const selected = useMemo(
    () => rows.find(r => (r.projectId || 'unassigned') === selectedId) || null,
    [rows, selectedId],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(r =>
      r.projectName?.toLowerCase().includes(q) || r.projectCode?.toLowerCase().includes(q));
  }, [rows, query]);

  const totals = useMemo(() => rows.reduce((acc, r) => ({
    clients:  acc.clients + r.total,
    imported: acc.imported + r.imported,
    overdue:  acc.overdue + r.overdue,
  }), { clients: 0, imported: 0, overdue: 0 }), [rows]);

  // A selected project that vanished from the rollup — its last client was
  // deactivated or moved — falls back to the index rather than a blank screen.
  if (selectedId && !selected && !loading) {
    return (
      <SectionCard title="CRM by Project" icon="folder_special">
        <EmptyState
          icon="folder_off"
          title="This project is no longer in the CRM"
          description="It has no clients in the selected department."
          actionLabel="Back to all projects"
          onAction={() => setSelectedId(null)}
        />
      </SectionCard>
    );
  }

  if (selected) {
    return (
      <ProjectWorkspace
        key={selectedId}
        project={selected}
        token={token}
        department={department}
        statuses={statuses}
        users={users}
        projects={projects}
        isAdmin={isAdmin}
        onBack={() => setSelectedId(null)}
        onChanged={load}
      />
    );
  }

  return (
    <>
      <ProjectImportModal
        open={Boolean(importRow)}
        onClose={() => setImportRow(null)}
        project={importRow || {}}
        token={token}
        department={department}
        onImported={load}
      />

      <SectionCard
        title="CRM by Project"
        icon="folder_special"
        description="Every client grouped under the project it belongs to. Open a project to manage its clients or upload a spreadsheet."
        loading={loading}
        empty={!loading && rows.length === 0}
        emptyIcon="folder_off"
        emptyTitle="No project data yet"
        emptyDescription="Import a spreadsheet or assign clients to a project to see the breakdown"
        emptyAction={{ label: 'Import from Excel', onClick: () => navigate('/admin/crm/import') }}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!loading && rows.length > 0 && (
              <>
                <span className="text-xs text-neutral-500">
                  <strong className="text-neutral-900 dark:text-neutral-100">{totals.clients}</strong> clients
                  {' · '}{rows.length} project{rows.length === 1 ? '' : 's'}
                  {totals.imported > 0 && ` · ${totals.imported} imported`}
                  {totals.overdue > 0 && ` · ${totals.overdue} overdue`}
                </span>
                <div className="relative">
                  <span className="material-symbols-outlined pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">search</span>
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Find a project…"
                    aria-label="Find a project"
                    className="h-9 w-44 rounded-lg border border-neutral-200 bg-white pl-8 pr-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  />
                </div>
              </>
            )}
            <Button variant="secondary" size="sm" onClick={load}
              icon={<span className="material-symbols-outlined text-base">refresh</span>}>
              Refresh
            </Button>
            <Button variant="accent" size="sm" onClick={() => navigate('/admin/crm/import')}
              icon={<span className="material-symbols-outlined text-base">upload_file</span>}>
              Import Excel
            </Button>
          </div>
        }
      >
        {/* rows.length === 0 is handled by SectionCard's own empty state above,
            so this branch is specifically "the search matched nothing". */}
        {visible.length === 0 && rows.length > 0 ? (
          <EmptyState
            icon="search_off"
            title="No projects match that search"
            description="Try a different name or project code."
            actionLabel="Clear search"
            onAction={() => setQuery('')}
          />
        ) : (
          <div className="space-y-3">
            {visible.map(row => (
              <ProjectCard
                key={row.projectId || 'unassigned'}
                row={row}
                stageColors={stageColors}
                onOpen={r => setSelectedId(r.projectId || 'unassigned')}
                onUpload={setImportRow}
              />
            ))}
          </div>
        )}
      </SectionCard>
    </>
  );
}
