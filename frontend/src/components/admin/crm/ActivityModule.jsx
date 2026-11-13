/**
 * Cross-client activity feed.
 *
 * The client 360 drawer answers "what happened with this client". This answers
 * the other question a desk needs every morning: what happened across all of
 * them — who touched what, and which stage moves landed. It reads the same
 * CRMCommunication records the per-client timeline does, so a note logged on a
 * client appears here without anything extra being written.
 */
import { useState, useEffect } from 'react';
import Button from '../../common/Button';
import StatusBadge from '../../common/StatusBadge';
import SectionCard from '../../ui/SectionCard';
import { useAuth } from '../../../context/AuthContext';
import ClientDetailDrawer from './ClientDetailDrawer';
import { useCrmActivity, useCrmUsers, useCrmStatuses } from '../../../hooks/useCrmQueries';
import { fmtDateTime, userLabel } from './crmShared';

// Icon and tint per interaction type, so the feed is scannable by shape rather
// than requiring every line to be read.
const TYPE_META = {
  email:         { icon: 'mail',        color: '#0ea5e9', label: 'Email' },
  call:          { icon: 'call',        color: '#10b981', label: 'Call' },
  meeting:       { icon: 'groups',      color: '#8b5cf6', label: 'Meeting' },
  visit:         { icon: 'location_on', color: '#f59e0b', label: 'Visit' },
  message:       { icon: 'chat',        color: '#06b6d4', label: 'Message' },
  proposal:      { icon: 'description', color: '#6366f1', label: 'Proposal' },
  approval:      { icon: 'verified',    color: '#22c55e', label: 'Approval' },
  note:          { icon: 'sticky_note_2', color: '#94a3b8', label: 'Note' },
  status_change: { icon: 'swap_horiz',  color: '#f97316', label: 'Stage change' },
};

const RANGES = [
  { value: '1',   label: 'Today' },
  { value: '7',   label: 'Last 7 days' },
  { value: '30',  label: 'Last 30 days' },
  { value: '90',  label: 'Last 90 days' },
  { value: '',    label: 'All time' },
];

const DIRECTION_TONE = { inbound: 'info', outbound: 'success', internal: 'neutral' };

/** Groups entries under a date heading, so the feed reads as a diary. */
const dayKey = (d) => {
  const date = new Date(d);
  const today = new Date();
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const same = (a, b) => a.toDateString() === b.toDateString();
  if (same(date, today)) return 'Today';
  if (same(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' });
};

export default function ActivityModule({ department }) {
  const { token } = useAuth();
  const [page, setPage]       = useState(1);
  const [typeFilter, setTypeFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [range, setRange]     = useState('7');
  const [detailId, setDetailId] = useState(null);

  const { data: users = [] } = useCrmUsers();
  const { data: statuses = [] } = useCrmStatuses(department);

  useEffect(() => { setPage(1); }, [department, typeFilter, userFilter, range]);

  const activityQuery = useCrmActivity({
    department, page, limit: 40,
    type: typeFilter,
    userId: userFilter,
    days: range,
  });

  const items = activityQuery.data?.data || [];
  const total = activityQuery.data?.total || 0;
  const pages = activityQuery.data?.pages || 1;

  // Grouping is done on the page actually rendered, so a day heading always
  // describes the rows beneath it rather than the whole result set.
  const groups = items.reduce((acc, item) => {
    const key = dayKey(item.occurredAt || item.createdAt);
    (acc[key] ||= []).push(item);
    return acc;
  }, {});

  return (
    <>
      <ClientDetailDrawer
        open={Boolean(detailId)}
        clientId={detailId}
        token={token}
        statuses={statuses}
        onClose={() => setDetailId(null)}
        onChanged={activityQuery.refetch}
      />

      <SectionCard
        title={`Activity${total ? ` (${total})` : ''}`}
        icon="history"
        description="Every logged interaction and stage move across the CRM, newest first"
        loading={activityQuery.isLoading}
        error={activityQuery.error}
        onRetry={() => activityQuery.refetch()}
        empty={!activityQuery.isLoading && items.length === 0}
        emptyIcon="history_toggle_off"
        emptyTitle="No activity in this period"
        emptyDescription="Log a call, email or note on a client, or widen the date range."
        action={
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={range}
              onChange={e => setRange(e.target.value)}
              aria-label="Date range"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              {RANGES.map(r => <option key={r.label} value={r.value}>{r.label}</option>)}
            </select>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              aria-label="Filter by activity type"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">All types</option>
              {Object.entries(TYPE_META).map(([key, meta]) => (
                <option key={key} value={key}>{meta.label}</option>
              ))}
            </select>
            <select
              value={userFilter}
              onChange={e => setUserFilter(e.target.value)}
              aria-label="Filter by user"
              className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-sm dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            >
              <option value="">Everyone</option>
              {users.map(u => <option key={u._id} value={u._id}>{userLabel(u)}</option>)}
            </select>
            <Button variant="secondary" size="sm" onClick={() => activityQuery.refetch()}
              icon={<span className="material-symbols-outlined text-base">refresh</span>}>
              Refresh
            </Button>
          </div>
        }
        noBodyPadding
      >
        <div>
          {Object.entries(groups).map(([day, entries]) => (
            <section key={day}>
              <h4 className="sticky top-0 z-[1] border-y border-neutral-100 bg-neutral-50/95 px-4 py-1.5 text-[11px] font-bold uppercase tracking-wider text-neutral-500 backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95">
                {day}
              </h4>
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {entries.map(item => {
                  const meta = TYPE_META[item.type] || TYPE_META.note;
                  return (
                    <li key={item._id} className="flex gap-3 px-4 py-3 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/40">
                      <span
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl"
                        style={{ background: `${meta.color}1a`, color: meta.color }}
                        aria-hidden="true"
                      >
                        <span className="material-symbols-outlined text-[18px]">{meta.icon}</span>
                      </span>

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => item.client?._id && setDetailId(item.client._id)}
                            className="truncate font-bold text-neutral-900 hover:underline dark:text-neutral-100"
                          >
                            {item.client?.name || 'Unknown client'}
                          </button>
                          <StatusBadge tone={DIRECTION_TONE[item.direction] || 'neutral'} label={meta.label} dot={false} />
                          {item.isInternal && <StatusBadge tone="neutral" label="internal" dot={false} />}
                        </div>

                        {item.subject && (
                          <p className="truncate text-sm text-neutral-700 dark:text-neutral-300">{item.subject}</p>
                        )}
                        {item.body && (
                          <p className="line-clamp-2 text-xs text-neutral-500">{item.body}</p>
                        )}
                        <p className="mt-0.5 text-[11px] text-neutral-400">
                          {fmtDateTime(item.occurredAt || item.createdAt)}
                          {item.createdBy ? ` · ${userLabel(item.createdBy)}` : ''}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>

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
    </>
  );
}
