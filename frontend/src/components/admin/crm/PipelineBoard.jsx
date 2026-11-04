/**
 * Pipeline board — clients as cards in their configured stage columns, with
 * drag-and-drop stage moves. Uses the native HTML5 drag API so there is no new
 * dependency; a keyboard/touch fallback is provided by the per-card stage menu.
 */
import { useState, useEffect, useCallback } from 'react';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import Skeleton from '../../ui/Skeleton';
import EmptyState from '../../ui/EmptyState';
import { useToast } from '../../../context/ToastContext';
import { apiFetch, PRIORITY_TONE, PRIORITY_RAIL, userLabel, relativeDue } from './crmShared';

export default function PipelineBoard({ token, department, onOpenClient }) {
  const toast = useToast();
  const [columns, setColumns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    apiFetch(`/pipeline?department=${department}`, token)
      .then(r => setColumns(r.data || []))
      .catch(err => { toast.error(err.message); setColumns([]); })
      .finally(() => setLoading(false));
  }, [token, department]);

  useEffect(() => { load(); }, [load]);

  const moveClient = async (client, toStage) => {
    if (!client || client.status === toStage || toStage === 'Unassigned') return;
    const from = client.status;

    // Optimistic: the board re-renders immediately, then reconciles on failure.
    setColumns(cols => cols.map(c => ({
      ...c,
      clients:
        c.name === from ? c.clients.filter(x => x._id !== client._id)
        : c.name === toStage ? [{ ...client, status: toStage }, ...c.clients]
        : c.clients,
    })));

    try {
      await apiFetch(`/clients/${client._id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: toStage, statusReason: 'Moved on pipeline board' }),
      });
      toast.success(`${client.name} → ${toStage}`);
    } catch (err) {
      toast.error(err.message);
      load(); // snap back to server truth
    }
  };

  const totalClients = columns.reduce((n, c) => n + c.clients.length, 0);

  if (loading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-2">
        {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-96 w-72 shrink-0 rounded-2xl" />)}
      </div>
    );
  }

  if (!columns.length) {
    return (
      <EmptyState
        icon="view_kanban"
        title="No pipeline stages configured"
        description="Add stages in Status Management, or run the pipeline seed script, to use the board."
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-neutral-500">
          <span className="font-bold text-neutral-900 dark:text-neutral-100">{totalClients}</span> clients across {columns.length} stages
        </p>
        <Button variant="secondary" size="sm" onClick={load} icon={<span className="material-symbols-outlined text-base">refresh</span>}>
          Refresh
        </Button>
      </div>

      <div className="crm-scroll-thin flex gap-4 overflow-x-auto pb-4">
        {columns.map(col => (
          <div
            key={col.name}
            onDragOver={e => { e.preventDefault(); setDragOver(col.name); }}
            onDragLeave={() => setDragOver(d => (d === col.name ? null : d))}
            onDrop={e => { e.preventDefault(); setDragOver(null); moveClient(dragging, col.name); setDragging(null); }}
            className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-neutral-50/70 transition-colors dark:bg-neutral-800/40 ${
              dragOver === col.name
                ? 'border-[var(--portal-accent)] bg-[var(--portal-accent-soft)]'
                : 'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <div className="flex items-center gap-2 border-b border-neutral-200 px-3 py-2.5 dark:border-neutral-700">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: col.color }} />
              <p className="min-w-0 flex-1 truncate text-xs font-black uppercase tracking-wider text-neutral-700 dark:text-neutral-300">
                {col.name}
              </p>
              <span className="rounded-full bg-white px-2 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-neutral-700 dark:text-neutral-300">
                {col.clients.length}
              </span>
            </div>

            <div className="crm-scroll-thin flex-1 space-y-2 overflow-y-auto p-2" style={{ maxHeight: '65vh', minHeight: 120 }}>
              {col.clients.length === 0 ? (
                <p className="py-6 text-center text-xs italic text-neutral-400">Drop a client here</p>
              ) : (
                col.clients.map(c => {
                  const overdue = c.nextFollowUpAt && new Date(c.nextFollowUpAt) < new Date();
                  return (
                    <div
                      key={c._id}
                      draggable
                      onDragStart={() => setDragging(c)}
                      onDragEnd={() => { setDragging(null); setDragOver(null); }}
                      onClick={() => onOpenClient?.(c._id)}
                      role="button"
                      tabIndex={0}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onOpenClient?.(c._id); } }}
                      className={`relative cursor-grab overflow-hidden rounded-xl border border-neutral-200 bg-white p-3 pl-4 text-left transition-shadow hover:shadow-md active:cursor-grabbing dark:border-neutral-700 dark:bg-neutral-800 ${
                        dragging?._id === c._id ? 'opacity-40' : ''
                      }`}
                    >
                      {/* Priority rail, matching the follow-up cards */}
                      <span
                        aria-hidden="true"
                        className="absolute inset-y-0 left-0 w-1.5"
                        style={{ background: PRIORITY_RAIL[c.priority] || '#94a3b8' }}
                      />
                      <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">{c.name}</p>
                      <p className="font-mono text-[10px] text-neutral-400">{c.clientId}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        <StatusBadge tone={PRIORITY_TONE[c.priority] || 'neutral'} label={c.priority} dot={false} />
                        {overdue && <StatusBadge tone="danger" label="Overdue" dot={false} />}
                      </div>
                      {c.owner && <p className="mt-1.5 truncate text-[11px] text-neutral-500">{userLabel(c.owner)}</p>}
                      {c.nextFollowUpAt && (
                        <p className={`mt-0.5 text-[11px] ${overdue ? 'font-semibold text-red-600' : 'text-neutral-400'}`}>
                          {relativeDue(c.nextFollowUpAt)}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
