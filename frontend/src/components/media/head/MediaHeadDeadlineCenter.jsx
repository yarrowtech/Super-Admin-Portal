import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import KPICard from '../../common/KPICard';
import StatusBadge from '../../common/StatusBadge';
import Button from '../../common/Button';

const arr = (value) => (Array.isArray(value) ? value : []);

const HEALTH_TONE = {
  COMPLETED: { tone: 'success', label: 'Completed' },
  BLOCKED: { tone: 'danger', label: 'Blocked' },
  AT_RISK: { tone: 'danger', label: 'At Risk' },
  ATTENTION: { tone: 'warning', label: 'Attention' },
  ON_TRACK: { tone: 'info', label: 'On Track' },
};

const BUCKET_LABEL = { overdue: 'Overdue', today: 'Due Today', thisWeek: 'This Week', later: 'Later' };

const MediaHeadDeadlineCenter = () => {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [bucketFilter, setBucketFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: QK.mediaHead.deadlines({}),
    queryFn: () => departmentApi.getMediaHeadDeadlines(token),
    enabled: Boolean(token),
  });

  const payload = data?.data || {};
  const counts = payload.counts || { overdue: 0, today: 0, thisWeek: 0, later: 0, total: 0 };
  const allItems = arr(payload.items);
  const buckets = payload.buckets || {};

  const items = useMemo(() => (bucketFilter ? arr(buckets[bucketFilter]) : allItems), [bucketFilter, buckets, allItems]);

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner portal-page-inner--media">
        <PortalHeader title="Deadline Center" subtitle="Every project and milestone deadline across the department, sorted by urgency" icon="event_upcoming" />

        <div className="mb-5 grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-4">
          <button type="button" onClick={() => setBucketFilter(bucketFilter === 'overdue' ? '' : 'overdue')} className="text-left">
            <KPICard title="Overdue" value={counts.overdue} icon="error" tone="danger" compact className={bucketFilter === 'overdue' ? 'ring-2 ring-primary' : ''} />
          </button>
          <button type="button" onClick={() => setBucketFilter(bucketFilter === 'today' ? '' : 'today')} className="text-left">
            <KPICard title="Due Today" value={counts.today} icon="today" tone="warning" compact className={bucketFilter === 'today' ? 'ring-2 ring-primary' : ''} />
          </button>
          <button type="button" onClick={() => setBucketFilter(bucketFilter === 'thisWeek' ? '' : 'thisWeek')} className="text-left">
            <KPICard title="This Week" value={counts.thisWeek} icon="date_range" tone="info" compact className={bucketFilter === 'thisWeek' ? 'ring-2 ring-primary' : ''} />
          </button>
          <button type="button" onClick={() => setBucketFilter(bucketFilter === 'later' ? '' : 'later')} className="text-left">
            <KPICard title="Later" value={counts.later} icon="event" compact className={bucketFilter === 'later' ? 'ring-2 ring-primary' : ''} />
          </button>
        </div>

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-10 text-center">
              <span className="material-symbols-outlined text-3xl text-neutral-300 dark:text-neutral-600">event_available</span>
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">
                {bucketFilter ? `No items due ${BUCKET_LABEL[bucketFilter].toLowerCase()}` : 'No upcoming deadlines'}
              </p>
              <p className="text-xs text-neutral-400">You're all caught up.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {items.map((item) => {
                const health = HEALTH_TONE[item.health] || HEALTH_TONE.ON_TRACK;
                const overdue = new Date(item.dueDate).getTime() < Date.now();
                return (
                  <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px] text-neutral-400">
                          {item.type === 'milestone' ? 'flag' : 'folder'}
                        </span>
                        <p className="truncate font-semibold text-neutral-900 dark:text-neutral-100">{item.title}</p>
                        <StatusBadge tone={health.tone} label={health.label} />
                      </div>
                      <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                        {item.projectName}{item.owner?.name ? ` · ${item.owner.name}` : ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className={`text-xs font-medium ${overdue ? 'text-rose-500' : 'text-neutral-500 dark:text-neutral-400'}`}>
                        {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '—'}
                      </span>
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/media/head/projects/${item.projectId}`)}>
                        Open
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default MediaHeadDeadlineCenter;
