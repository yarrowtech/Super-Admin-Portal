import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import Skeleton from '../../../ui/Skeleton';
import Button from '../../../common/Button';
import { UserAvatar } from '../UserPicker';
import { ASSET_STATUS_LABELS, timeAgo } from '../portfolioStatus';

const unwrap = (res) => res?.data ?? res ?? {};

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'assets', label: 'Assets' },
  { value: 'workflow', label: 'Workflow' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'files', label: 'Files' },
  { value: 'comments', label: 'Comments' },
  { value: 'system', label: 'System' },
];

const RANGE_FILTERS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
];

const ACTION_ICON = {
  ASSET_CREATED: 'add_circle', ASSET_UPDATED: 'edit', CONTENT_UPDATED: 'edit_note',
  STATUS_CHANGED: 'sync_alt', APPROVAL_REQUESTED: 'rate_review', APPROVED: 'check_circle',
  CHANGES_REQUESTED: 'undo', PUBLISHED: 'publish', MEASURING_STARTED: 'monitoring',
  OWNER_CHANGED: 'person', REVIEWER_CHANGED: 'person_check', PRIORITY_CHANGED: 'flag',
  DUE_DATE_CHANGED: 'event', TASK_CREATED: 'add_task', TASK_UPDATED: 'task', TASK_COMPLETED: 'task_alt',
  FILE_UPLOADED: 'upload_file', FILE_REPLACED: 'file_copy', FILE_UPDATED: 'drive_file_rename_outline',
  COMMENT_ADDED: 'chat_bubble', METRIC_UPDATED: 'bar_chart', ARCHIVED: 'archive', RESTORED: 'restore',
  VERSION_CREATED: 'history', VERSION_RESTORED: 'history_toggle_off',
  PORTFOLIO_CATEGORY_CREATED: 'create_new_folder', PORTFOLIO_CATEGORY_UPDATED: 'edit',
  PORTFOLIO_GROUP_CREATED: 'create_new_folder', PORTFOLIO_GROUP_UPDATED: 'edit',
  RELATION_ADDED: 'link', RELATION_REMOVED: 'link_off',
};

const describe = (entry) => {
  const action = String(entry.action || '').replace(/_/g, ' ').toLowerCase();
  const meta = entry.metadata || {};
  if (meta.from && meta.to) {
    return `${action} — ${ASSET_STATUS_LABELS[meta.from] || meta.from} → ${ASSET_STATUS_LABELS[meta.to] || meta.to}`;
  }
  return action;
};

const groupByDay = (items) => {
  const groups = new Map();
  items.forEach((entry) => {
    const day = new Date(entry.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const isToday = day === new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const key = isToday ? 'TODAY' : day.toUpperCase();
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(entry);
  });
  return groups;
};

const CategoryActivityTab = ({ categoryId }) => {
  const { token } = useAuth();
  const [type, setType] = useState('all');
  const [range, setRange] = useState('all');

  const activityQueryKey = QK.portfolioHierarchy.activity(categoryId, { type, range });
  const query = useInfiniteQuery({
    queryKey: activityQueryKey,
    queryFn: ({ pageParam }) => portfolioHierarchyApi.getCategoryActivity(token, categoryId, { type, range, cursor: pageParam, limit: 20 }),
    getNextPageParam: (last) => unwrap(last).nextCursor || undefined,
    initialPageParam: null,
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(activityQueryKey),
  });

  if (query.isError) return <ErrorState title="Could not load activity" description={query.error?.message} onRetry={() => query.refetch()} />;

  const items = (query.data?.pages || []).flatMap((p) => unwrap(p).items || []);
  const grouped = groupByDay(items);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex flex-wrap gap-1 rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900">
          {TYPE_FILTERS.map((f) => (
            <button key={f.value} type="button" onClick={() => setType(f.value)} className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${type === f.value ? 'bg-primary text-white' : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <select value={range} onChange={(e) => setRange(e.target.value)} className="ml-auto h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900">
          {RANGE_FILTERS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>
      </div>

      {query.isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>
      ) : items.length === 0 ? (
        <EmptyState icon="history" title="No activity yet" description="Changes and actions will appear here." />
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([day, entries]) => (
            <div key={day}>
              <p className="mb-2 text-xs font-black uppercase tracking-wider text-neutral-400">{day}</p>
              <div className="space-y-2">
                {entries.map((entry) => (
                  <div key={entry._id} className="flex items-start gap-3 rounded-xl border border-neutral-100 bg-white px-4 py-3 dark:border-neutral-800 dark:bg-neutral-950">
                    {entry.actor ? <UserAvatar user={{ name: `${entry.actor.firstName || ''} ${entry.actor.lastName || ''}`.trim() || entry.actor.email, profileImage: entry.actor.profileImage }} size={28} /> : (
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-neutral-200 text-neutral-500 dark:bg-neutral-800"><span className="material-symbols-outlined text-[14px]">smart_toy</span></span>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-neutral-700 dark:text-neutral-200">
                        <span className="font-semibold text-neutral-900 dark:text-white">
                          {entry.actor ? `${entry.actor.firstName || ''} ${entry.actor.lastName || ''}`.trim() || entry.actor.email : 'System'}
                        </span>{' '}
                        {describe(entry)}
                      </p>
                    </div>
                    <span className="material-symbols-outlined shrink-0 text-[16px] text-neutral-300 dark:text-neutral-600">{ACTION_ICON[entry.action] || 'circle'}</span>
                    <span className="shrink-0 text-xs text-neutral-400">{timeAgo(entry.createdAt)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {query.hasNextPage && (
            <div className="text-center">
              <Button variant="secondary" size="sm" loading={query.isFetchingNextPage} onClick={() => query.fetchNextPage()}>Load more</Button>
            </div>
          )}
        </div>
      )}
    </section>
  );
};

export default CategoryActivityTab;
