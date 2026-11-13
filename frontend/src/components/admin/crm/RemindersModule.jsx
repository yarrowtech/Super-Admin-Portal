/**
 * The follow-up workload, bucketed by urgency.
 *
 * Buckets come from the server, not from slicing a list in the browser: whether
 * a task is "overdue" or "due today" depends on the current time, and a stale
 * tab or a skewed clock must never be what decides. The UI renders what the
 * server bucketed and nothing more.
 *
 * Every task is actionable from the row — complete, or snooze — because a
 * reminder list you have to leave in order to act on is a list that goes stale.
 */
import { useState, useMemo } from 'react';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import SectionCard from '../../ui/SectionCard';
import EmptyState from '../../ui/EmptyState';
import { useToast } from '../../../context/ToastContext';
import { useAuth } from '../../../context/AuthContext';
import { API_BASE_URL } from '../../../config/backend';
import ClientDetailDrawer from './ClientDetailDrawer';
import {
  useCrmReminders, useCrmUsers, useCrmStatuses,
  useCompleteCrmFollowUp, useSnoozeCrmFollowUp,
} from '../../../hooks/useCrmQueries';
import {
  PRIORITY_TONE, PRIORITY_RAIL, fmt, relativeDue, userLabel,
} from './crmShared';

// Bucket order is urgency order — overdue first, because that is the list that
// costs money when ignored.
const BUCKETS = [
  { key: 'overdue',  label: 'Overdue',   icon: 'error',          tone: 'danger',  accent: '#e11d48' },
  { key: 'today',    label: 'Today',     icon: 'today',          tone: 'warning', accent: '#f59e0b' },
  { key: 'thisWeek', label: 'This week', icon: 'date_range',     tone: 'info',    accent: '#0ea5e9' },
  { key: 'later',    label: 'Later',     icon: 'schedule',       tone: 'neutral', accent: '#94a3b8' },
];

const SNOOZE_OPTIONS = [
  { days: 1, label: 'Tomorrow' },
  { days: 3, label: '3 days' },
  { days: 7, label: 'Next week' },
];

const TYPE_ICON = {
  call: 'call', email: 'mail', meeting: 'groups', visit: 'location_on',
  proposal: 'description', approval: 'verified', other: 'task_alt',
};

function TaskRow({ task, accent, busy, onComplete, onSnooze, onOpenClient }) {
  const [showSnooze, setShowSnooze] = useState(false);

  return (
    <li
      className="flex flex-wrap items-center gap-3 border-l-[3px] px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
      style={{ borderLeftColor: PRIORITY_RAIL[task.priority] || accent }}
    >
      <span className="material-symbols-outlined text-[20px] text-neutral-400">
        {TYPE_ICON[task.type] || 'task_alt'}
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => task.client?._id && onOpenClient(task.client._id)}
            className="truncate font-bold text-neutral-900 hover:underline dark:text-neutral-100"
          >
            {task.client?.name || 'Unknown client'}
          </button>
          {task.client?.clientId && (
            <span className="font-mono text-[11px] text-neutral-400">{task.client.clientId}</span>
          )}
          <StatusBadge tone={PRIORITY_TONE[task.priority] || 'neutral'} label={task.priority} dot={false} />
        </div>
        <p className="truncate text-xs text-neutral-500">
          {task.type}
          {task.notes ? ` · ${task.notes}` : ''}
        </p>
      </div>

      <div className="shrink-0 text-right">
        <p className="text-xs font-semibold" style={{ color: accent }}>{relativeDue(task.dueDate)}</p>
        <p className="text-[11px] text-neutral-400">
          {fmt(task.dueDate)}
          {task.assignedTo ? ` · ${userLabel(task.assignedTo)}` : ' · unassigned'}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {showSnooze ? (
          <>
            {SNOOZE_OPTIONS.map(o => (
              <button
                key={o.days}
                type="button"
                disabled={busy}
                onClick={() => { setShowSnooze(false); onSnooze(task, o.days); }}
                className="rounded-lg border border-neutral-200 px-2 py-1 text-[11px] font-semibold text-neutral-600 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800"
              >
                {o.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setShowSnooze(false)}
              aria-label="Cancel snooze"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => setShowSnooze(true)}
              title="Snooze"
              aria-label={`Snooze follow-up for ${task.client?.name || 'client'}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 transition-colors hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              <span className="material-symbols-outlined text-[18px]">snooze</span>
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onComplete(task)}
              title="Mark complete"
              aria-label={`Complete follow-up for ${task.client?.name || 'client'}`}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-emerald-200 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:hover:bg-emerald-950/40"
            >
              <span className="material-symbols-outlined text-[18px]">check</span>
            </button>
          </>
        )}
      </div>
    </li>
  );
}

export default function RemindersModule({ department }) {
  const toast = useToast();
  const { token } = useAuth();
  const [assignee, setAssignee] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [busyId, setBusyId]   = useState(null);
  const [collapsed, setCollapsed] = useState(() => new Set());

  const { data: users = [] } = useCrmUsers();
  const { data: statuses = [] } = useCrmStatuses(department);

  const remindersQuery = useCrmReminders({ department, assignedTo: assignee });
  const buckets = remindersQuery.data?.data || null;
  const counts  = remindersQuery.data?.counts || null;

  // Both mutations invalidate the reminder, follow-up, client and activity
  // caches through useCrmInvalidate, so the list reflects the action without
  // this component refetching by hand.
  const completeMutation = useCompleteCrmFollowUp();
  const snoozeMutation   = useSnoozeCrmFollowUp();

  const complete = async (task) => {
    setBusyId(task._id);
    try {
      await completeMutation.mutateAsync(task._id);
      toast.success(`Completed: ${task.client?.name || 'follow-up'}`);
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const snooze = async (task, days) => {
    setBusyId(task._id);
    try {
      await snoozeMutation.mutateAsync({ id: task._id, days });
      toast.success(`Snoozed ${days} day${days === 1 ? '' : 's'}`);
    } catch (err) { toast.error(err.message); }
    finally { setBusyId(null); }
  };

  const exportFile = async (format) => {
    try {
      const q = new URLSearchParams({
        format, department,
        ...(assignee ? { assignedTo: assignee } : {}),
      }).toString();
      const res = await fetch(`${API_BASE_URL}/api/v1/crm/export/followups?${q}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Export failed (HTTP ${res.status})`);
      }
      const disposition = res.headers.get('Content-Disposition') || '';
      const filename = /filename="?([^"]+)"?/.exec(disposition)?.[1]
        || `crm-followups-${new Date().toISOString().slice(0, 10)}.${format}`;
      const url = URL.createObjectURL(await res.blob());
      Object.assign(document.createElement('a'), { href: url, download: filename }).click();
      URL.revokeObjectURL(url);
      toast.success(`Exported as ${format.toUpperCase()}`);
    } catch (err) { toast.error(err.message); }
  };

  const toggle = (key) => setCollapsed(s => {
    const n = new Set(s);
    if (n.has(key)) n.delete(key); else n.add(key);
    return n;
  });

  const isEmpty = useMemo(
    () => Boolean(buckets) && BUCKETS.every(b => !(buckets[b.key] || []).length),
    [buckets],
  );

  return (
    <>
      <ClientDetailDrawer
        open={Boolean(detailId)}
        clientId={detailId}
        token={token}
        statuses={statuses}
        onClose={() => setDetailId(null)}
        onChanged={remindersQuery.refetch}
      />

      <SectionCard
        title="Follow-up Reminders"
        icon="notifications_active"
        description="Every pending follow-up, grouped by how urgent it is. Complete or snooze without leaving the list."
        loading={remindersQuery.isLoading}
        error={remindersQuery.error}
        onRetry={() => remindersQuery.refetch()}
        action={
          <div className="flex flex-wrap items-center gap-2">
            {counts && (
              <span className="text-xs text-neutral-500">
                {counts.overdue > 0 && (
                  <strong className="text-rose-600">{counts.overdue} overdue</strong>
                )}
                {counts.overdue > 0 && counts.today > 0 && ' · '}
                {counts.today > 0 && <strong className="text-amber-600">{counts.today} today</strong>}
                {(counts.overdue > 0 || counts.today > 0) && ' · '}
                {counts.total} total
              </span>
            )}
            <select
              value={assignee}
              onChange={e => setAssignee(e.target.value)}
              aria-label="Filter by assignee"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">Everyone</option>
              {users.map(u => <option key={u._id} value={u._id}>{userLabel(u)}</option>)}
            </select>
            <Button variant="secondary" size="sm" onClick={() => exportFile('xlsx')}
              icon={<span className="material-symbols-outlined text-base">table_view</span>}>
              Excel
            </Button>
            <Button variant="secondary" size="sm" onClick={() => remindersQuery.refetch()}
              icon={<span className="material-symbols-outlined text-base">refresh</span>}>
              Refresh
            </Button>
          </div>
        }
        noBodyPadding
      >
        {isEmpty ? (
          <EmptyState
            icon="task_alt"
            title="Nothing outstanding"
            description={assignee ? 'This person has no pending follow-ups.' : 'No pending follow-ups in this department.'}
          />
        ) : (
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {BUCKETS.map(bucket => {
              const items = buckets?.[bucket.key] || [];
              if (!items.length) return null;
              const isCollapsed = collapsed.has(bucket.key);

              return (
                <section key={bucket.key}>
                  <button
                    type="button"
                    onClick={() => toggle(bucket.key)}
                    aria-expanded={!isCollapsed}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40"
                  >
                    <span className="material-symbols-outlined text-[18px]" style={{ color: bucket.accent }}>
                      {bucket.icon}
                    </span>
                    <span className="font-bold text-neutral-900 dark:text-neutral-100">{bucket.label}</span>
                    <StatusBadge tone={bucket.tone} label={String(items.length)} dot={false} />
                    <span className={`material-symbols-outlined ml-auto text-[18px] text-neutral-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`}>
                      expand_more
                    </span>
                  </button>

                  {!isCollapsed && (
                    <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {items.map(task => (
                        <TaskRow
                          key={task._id}
                          task={task}
                          accent={bucket.accent}
                          busy={busyId === task._id}
                          onComplete={complete}
                          onSnooze={snooze}
                          onOpenClient={setDetailId}
                        />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}
      </SectionCard>
    </>
  );
}
