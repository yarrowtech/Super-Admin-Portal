import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import Skeleton from '../../../ui/Skeleton';
import ErrorState from '../../../ui/ErrorState';
import EmptyState from '../../../ui/EmptyState';
import ProgressBar from '../../../ui/ProgressBar';
import { HealthPill } from '../PortfolioStatusPills';
import { ASSET_STATUS_LABELS, timeAgo } from '../portfolioStatus';

const unwrap = (res) => res?.data ?? res ?? {};

const COUNTERS = [
  { key: 'total', label: 'Total Assets', icon: 'inventory_2', tone: 'text-primary bg-primary/10' },
  { key: 'published', label: 'Published', icon: 'task_alt', tone: 'text-emerald-600 bg-emerald-500/10' },
  { key: 'inProgress', label: 'In Progress', icon: 'autorenew', tone: 'text-blue-600 bg-blue-500/10' },
  { key: 'needsReview', label: 'Needs Review', icon: 'rate_review', tone: 'text-amber-600 bg-amber-500/10' },
  { key: 'overdue', label: 'Overdue', icon: 'schedule', tone: 'text-rose-600 bg-rose-500/10' },
  { key: 'blocked', label: 'Blocked', icon: 'block', tone: 'text-rose-600 bg-rose-500/10' },
];

const EXECUTION_ROWS = [
  { key: 'published', label: 'Published' },
  { key: 'approved', label: 'Approved' },
  { key: 'in_review', label: 'In Review' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'draft', label: 'Draft' },
];

const Card = ({ title, action, children }) => (
  <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
    <div className="mb-3 flex items-center justify-between">
      <h3 className="text-sm font-black text-neutral-900 dark:text-white">{title}</h3>
      {action}
    </div>
    {children}
  </div>
);

const CategoryOverviewTab = ({ categoryId, onGoToTab }) => {
  const { token } = useAuth();
  const overviewQuery = useQuery({
    queryKey: QK.portfolioHierarchy.overview(categoryId),
    queryFn: () => portfolioHierarchyApi.getCategoryOverview(token, categoryId),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(QK.portfolioHierarchy.overview(categoryId)),
  });

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (overviewQuery.isError) {
    return <ErrorState title="Could not load overview" description={overviewQuery.error?.message} onRetry={() => overviewQuery.refetch()} />;
  }

  const overview = unwrap(overviewQuery.data);
  const { counts = {}, execution = {}, health = {}, needsAttention = [], upcomingDeadlines = [], recentActivity = [] } = overview;
  const byStatus = execution.byStatus || {};
  const executionTotal = Object.values(byStatus).reduce((s, n) => s + n, 0) || 1;

  return (
    <div className="space-y-4">
      {/* Row 1 — counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-6">
        {COUNTERS.map((c) => (
          <div key={c.key} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
            <span className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${c.tone}`}>
              <span className="material-symbols-outlined text-[16px]">{c.icon}</span>
            </span>
            <p className="text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{c.label}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-neutral-900 dark:text-white">{counts[c.key] ?? 0}</p>
          </div>
        ))}
      </div>

      {/* Row 2 — execution + health */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Execution Progress">
          <div className="mb-3 flex items-center gap-3">
            <span className="text-3xl font-black text-neutral-900 dark:text-white">{execution.pct ?? 0}%</span>
            <div className="flex-1"><ProgressBar value={execution.pct ?? 0} colorClass={execution.pct === 100 ? 'bg-emerald-500' : 'bg-primary'} /></div>
          </div>
          <div className="space-y-1.5">
            {EXECUTION_ROWS.map((row) => {
              const value = byStatus[row.key] || 0;
              return (
                <div key={row.key} className="flex items-center gap-2 text-xs">
                  <span className="w-24 shrink-0 font-semibold text-neutral-500 dark:text-neutral-400">{row.label}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <div className="h-full rounded-full bg-primary/70" style={{ width: `${Math.round((value / executionTotal) * 100)}%` }} />
                  </div>
                  <span className="w-6 shrink-0 text-right font-bold text-neutral-700 dark:text-neutral-200">{value}</span>
                </div>
              );
            })}
          </div>
        </Card>

        <Card title="Category Health" action={<HealthPill value={health.status} />}>
          {health.reasons?.length ? (
            <ul className="space-y-1.5">
              {health.reasons.map((r) => (
                <li key={r.code} className="flex items-start gap-1.5 text-sm text-neutral-600 dark:text-neutral-300">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-neutral-400" />
                  {r.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">Nothing needs attention — this category is in good shape.</p>
          )}
        </Card>
      </div>

      {/* Row 3 — needs attention + upcoming deadlines */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card title="Needs Attention" action={needsAttention.length ? <button type="button" onClick={() => onGoToTab?.('assets')} className="text-xs font-semibold text-primary hover:underline">View assets</button> : null}>
          {needsAttention.length === 0 ? (
            <EmptyState icon="check_circle" title="Nothing needs attention" description="Overdue and blocked assets will show up here." />
          ) : (
            <ul className="space-y-2">
              {needsAttention.map((a) => (
                <li key={`${a._id}-${a.reason}`} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-900">
                  <span className="min-w-0 truncate font-semibold text-neutral-800 dark:text-neutral-100">{a.title}</span>
                  <span className={`shrink-0 text-xs font-bold ${a.reason === 'overdue' ? 'text-rose-500' : 'text-amber-500'}`}>
                    {a.reason === 'overdue' ? 'Overdue' : 'Blocked'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title="Upcoming Deadlines">
          {upcomingDeadlines.length === 0 ? (
            <EmptyState icon="event_available" title="No upcoming deadlines" description="Assets with a future due date will show up here." />
          ) : (
            <ul className="space-y-2">
              {upcomingDeadlines.map((a) => (
                <li key={a._id} className="flex items-center justify-between gap-2 rounded-lg bg-neutral-50 px-3 py-2 text-sm dark:bg-neutral-900">
                  <span className="min-w-0 truncate font-semibold text-neutral-800 dark:text-neutral-100">{a.title}</span>
                  <span className="shrink-0 text-xs font-bold text-neutral-500">{new Date(a.dueDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Row 4 — recent activity */}
      <Card title="Recent Activity" action={<button type="button" onClick={() => onGoToTab?.('activity')} className="text-xs font-semibold text-primary hover:underline">View all</button>}>
        {recentActivity.length === 0 ? (
          <EmptyState icon="history" title="No activity yet" description="Changes and actions will appear here." />
        ) : (
          <ul className="space-y-2">
            {recentActivity.map((a) => (
              <li key={a._id} className="flex items-start gap-2 text-sm">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/60" />
                <span className="text-neutral-600 dark:text-neutral-300">
                  <span className="font-semibold text-neutral-800 dark:text-neutral-100">
                    {a.actor ? `${a.actor.firstName || ''} ${a.actor.lastName || ''}`.trim() || a.actor.email : 'System'}
                  </span>{' '}
                  {String(a.action || '').replace(/_/g, ' ').toLowerCase()}
                  {a.metadata?.from && a.metadata?.to ? ` — ${ASSET_STATUS_LABELS[a.metadata.from] || a.metadata.from} → ${ASSET_STATUS_LABELS[a.metadata.to] || a.metadata.to}` : ''}
                </span>
                <span className="ml-auto shrink-0 text-xs text-neutral-400">{timeAgo(a.createdAt)}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
};

export default CategoryOverviewTab;
