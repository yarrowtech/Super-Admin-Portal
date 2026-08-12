import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../context/AuthContext';
import { departmentApi } from '../../../services/departments';
import { QK } from '../../../utils/queryKeys';
import PortalHeader from '../../common/PortalHeader';
import StatusBadge from '../../common/StatusBadge';
import Button from '../../common/Button';

const arr = (value) => (Array.isArray(value) ? value : []);

const STATUS_TONE = {
  live: 'success', published: 'success', active: 'success',
  'in review': 'warning', pending: 'warning', draft: 'neutral',
  rejected: 'danger', 'needs revision': 'danger',
};

const statusTone = (status = '') => STATUS_TONE[String(status).toLowerCase()] || 'info';

const formatCurrency = (value) =>
  typeof value === 'number' ? `₹${value.toLocaleString('en-IN')}` : '—';

const MediaHeadCampaignPerformance = () => {
  const { token } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: QK.media.campaigns({ limit: 100 }),
    queryFn: () => departmentApi.getMediaCampaigns(token, { limit: 100 }),
    enabled: Boolean(token),
  });

  const campaigns = arr(data?.data?.items);

  return (
    <main className="portal-page h-[calc(100vh-4rem)]">
      <div className="portal-page-inner">
        <PortalHeader
          title="Campaign Performance"
          subtitle="Monitoring view — detailed campaign editing stays inside Media Marketing"
          icon="ads_click"
          showThemeToggle
        />

        <div className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          {isLoading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3].map((i) => <div key={i} className="h-14 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-red-400">error</span>
              <p className="font-semibold text-neutral-700 dark:text-neutral-300">Unable to load campaign data.</p>
              <Button variant="secondary" size="sm" onClick={() => refetch()}>Try Again</Button>
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
              <span className="material-symbols-outlined text-4xl text-neutral-300 dark:text-neutral-600">ads_click</span>
              <p className="font-semibold text-neutral-600 dark:text-neutral-300">No campaigns yet</p>
              <p className="text-sm text-neutral-400">Campaigns created in Media Marketing will appear here.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 bg-neutral-50 dark:border-neutral-800 dark:bg-neutral-800">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Campaign</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Project</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Spend</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">ROI</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">Updated</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {campaigns.map((item) => (
                    <tr key={item._id} className="transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{item.title || item.campaignName || 'Untitled'}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{item.projectName || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge tone={statusTone(item.status)} label={item.status || 'Unknown'} /></td>
                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">{formatCurrency(item.budgetImpact?.spend)}</td>
                      <td className="px-4 py-3 text-xs text-neutral-600 dark:text-neutral-400">
                        {typeof item.budgetImpact?.roiAtSnapshot === 'number' ? `${item.budgetImpact.roiAtSnapshot}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-neutral-500">{item.updatedAt ? new Date(item.updatedAt).toLocaleDateString() : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
};

export default MediaHeadCampaignPerformance;
