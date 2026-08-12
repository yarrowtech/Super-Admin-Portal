import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import Button from '../../common/Button';

const arr = (value) => (Array.isArray(value) ? value : []);

const STATUS_ICON = { pending: 'schedule', approved: 'check_circle', rejected: 'cancel' };
const STATUS_COLOR = {
  pending: 'bg-amber-100 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400',
  approved: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400',
  rejected: 'bg-rose-100 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400',
};

const timeAgo = (date) => {
  if (!date) return '';
  const diffMs = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hr ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? '' : 's'} ago`;
};

const MediaHeadActivityFeed = () => {
  const { token } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QK.mediaHead.activity({}),
    queryFn: () => departmentApi.getMediaHeadActivity(token),
    enabled: Boolean(token),
  });

  const activity = arr(data?.data);

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader title="Department Activity" subtitle="Recent approval requests and decisions across Media" icon="history" />

        <div className="rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4].map((i) => <div key={i} className="h-12 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-red-400">error</span>
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">Unable to load activity.</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : activity.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">history</span>
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">No recent department activity</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 p-2 dark:divide-neutral-800">
              {activity.map((item) => (
                <div key={item.id} className="flex items-start gap-3 p-2.5">
                  <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${STATUS_COLOR[item.status] || STATUS_COLOR.pending}`}>
                    <span className="material-symbols-outlined text-base">{STATUS_ICON[item.status] || 'notifications'}</span>
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-neutral-800 dark:text-neutral-200">{item.text}</p>
                    <p className="mt-0.5 text-xs text-neutral-400">{item.section ? `${item.section} · ` : ''}{timeAgo(item.time)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default MediaHeadActivityFeed;
