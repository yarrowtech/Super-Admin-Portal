/**
 * Project-wise CRM view — the rollup the Excel import feeds.
 *
 * One card per project with its client totals, Media/Marketing split and stage
 * distribution; expanding a card lists that project's clients and opens the same
 * Client 360 drawer the Clients module uses.
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import SectionCard from '../../ui/SectionCard';
import Skeleton from '../../ui/Skeleton';
import { useToast } from '../../../context/ToastContext';
import ClientDetailDrawer from './ClientDetailDrawer';
import { apiFetch, DEPT_BADGE_TONE, PRIORITY_TONE, useStatusOptions } from './crmShared';

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

function ProjectCard({ row, stageColors, token, onOpenClient }) {
  const [expanded, setExpanded] = useState(false);
  const [clients, setClients]   = useState(null);
  const [loading, setLoading]   = useState(false);
  const toast = useToast();

  // Clients load on first expand only — fetching every project's roster up front
  // would be dozens of requests for lists most operators never open.
  const toggle = async () => {
    const next = !expanded;
    setExpanded(next);
    if (!next || clients || !row.projectId) return;
    setLoading(true);
    try {
      const r = await apiFetch(`/clients?projectId=${row.projectId}&limit=100`, token);
      setClients(r.data || []);
    } catch (err) {
      toast.error(err.message);
      setClients([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900"
      style={{ boxShadow: 'var(--erp-shadow-soft)' }}>
      <button type="button" onClick={toggle} aria-expanded={expanded}
        className="flex w-full items-start gap-3 p-4 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black"
          style={{ background: row.themeColor ? `${row.themeColor}22` : 'var(--portal-accent-soft)',
                   color: row.themeColor || 'var(--portal-accent)' }}>
          {(row.projectName?.[0] || '?').toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate font-bold text-neutral-900 dark:text-neutral-100">{row.projectName}</p>
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
        </div>

        <div className="shrink-0 text-right">
          <p className="text-2xl font-black tabular-nums text-neutral-900 dark:text-neutral-100">{row.total}</p>
          <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">clients</p>
          <span className={`material-symbols-outlined mt-1 block text-[18px] text-neutral-400 transition-transform ${expanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </div>
      </button>

      {expanded && (
        <div className="border-t border-neutral-100 dark:border-neutral-800">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
            </div>
          ) : !clients?.length ? (
            <p className="p-4 text-center text-sm italic text-neutral-400">
              {row.projectId ? 'No clients in this project' : 'These clients are not linked to any project yet'}
            </p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {clients.map(c => (
                <li key={c._id}>
                  <button type="button" onClick={() => onOpenClient(c._id)}
                    className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: stageColors[c.status] || '#94a3b8' }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.name}</p>
                      <p className="truncate text-xs text-neutral-500">
                        {c.clientId} · {c.status}{c.email ? ` · ${c.email}` : ''}
                      </p>
                    </div>
                    <StatusBadge tone={DEPT_BADGE_TONE[c.department] || 'neutral'} label={c.department} dot={false} />
                    <StatusBadge tone={PRIORITY_TONE[c.priority] || 'neutral'} label={c.priority} dot={false} />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function ProjectsModule({ token, department }) {
  const toast = useToast();
  const navigate = useNavigate();
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [detailId, setDetailId] = useState(null);
  const [statuses] = useStatusOptions(token, department);

  const stageColors = Object.fromEntries(statuses.map(s => [s.name, s.color]));

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/projects/breakdown?department=${department}`, token)
      .then(r => setRows(r.data || []))
      .catch(err => { toast.error(err.message); setRows([]); })
      .finally(() => setLoading(false));
  }, [token, department]);

  useEffect(() => { load(); }, [load]);

  const totals = rows.reduce((acc, r) => ({
    clients:  acc.clients + r.total,
    imported: acc.imported + r.imported,
    overdue:  acc.overdue + r.overdue,
  }), { clients: 0, imported: 0, overdue: 0 });

  return (
    <>
      <ClientDetailDrawer
        open={Boolean(detailId)}
        clientId={detailId}
        token={token}
        statuses={statuses}
        onClose={() => setDetailId(null)}
        onChanged={load}
      />

      <SectionCard
        title="CRM by Project"
        icon="folder_special"
        description="Every client grouped under the project it belongs to, across Media & Marketing"
        loading={loading}
        empty={!loading && rows.length === 0}
        emptyIcon="folder_off"
        emptyTitle="No project data yet"
        emptyDescription="Import a spreadsheet or assign clients to a project to see the breakdown"
        emptyAction={{ label: 'Import from Excel', onClick: () => navigate('/admin/crm/import') }}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {!loading && rows.length > 0 && (
              <span className="text-xs text-neutral-500">
                <strong className="text-neutral-900 dark:text-neutral-100">{totals.clients}</strong> clients
                {' · '}{rows.length} project{rows.length === 1 ? '' : 's'}
                {totals.imported > 0 && ` · ${totals.imported} imported`}
              </span>
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
        <div className="space-y-3">
          {rows.map(row => (
            <ProjectCard
              key={row.projectId || 'unassigned'}
              row={row}
              stageColors={stageColors}
              token={token}
              onOpenClient={setDetailId}
            />
          ))}
        </div>
      </SectionCard>
    </>
  );
}
