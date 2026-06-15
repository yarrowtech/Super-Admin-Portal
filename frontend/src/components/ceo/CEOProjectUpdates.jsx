import React from 'react';
import PortalHeader from '../common/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { ceoApi } from '../../services/ceo';
import { LineChartCard, PieChartCard } from './charts/ChartCards';

const fallbackUpdates = [
  { id: 1, project: 'Phoenix ERP Modernization', owner: 'IT', status: 'In Progress', progress: 72, update: 'API stabilization phase completed; QA regression running.' },
  { id: 2, project: 'Atlas Cloud Migration', owner: 'Platform', status: 'At Risk', progress: 58, update: 'Network dependency delays in DR region onboarding.' },
  { id: 3, project: 'Orion Media Expansion', owner: 'Media', status: 'Completed', progress: 100, update: 'Rollout completed with post-launch KPI tracking enabled.' },
];

const statusTone = (status) => {
  if (status === 'Completed') return 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-200';
  if (status === 'At Risk') return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200';
  return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200';
};

const CEOProjectUpdates = () => {
  const { token } = useAuth();
  const q = useQuery({
    queryKey: ['ceo-project-analytics', token],
    queryFn: async () => (await ceoApi.getProjectAnalytics(token))?.data || {},
    enabled: Boolean(token),
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Project Updates"
          subtitle="Work status updates across strategic initiatives"
          icon="update"
          showSearch={false}
          showNotifications
          showThemeToggle
        />

        <section className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
          <div className="mb-4 grid grid-cols-1 gap-4 xl:grid-cols-2">
            <LineChartCard title="Task Completion Trend" data={q.data?.trend || []} xKey="date" lineKey="completed" />
            <PieChartCard title="Completed vs Pending Tasks" data={q.data?.split || []} nameKey="name" valueKey="value" />
          </div>
          <div className="space-y-3">
            {fallbackUpdates.map((item) => (
              <article key={item.id} className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">{item.project}</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">Owner: {item.owner}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusTone(item.status)}`}>{item.status}</span>
                </div>
                <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-300">{item.update}</p>
                <div className="mt-3">
                  <div className="mb-1 flex items-center justify-between text-xs font-semibold text-neutral-500 dark:text-neutral-400">
                    <span>Progress</span>
                    <span>{item.progress}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-700">
                    <div className="h-2 rounded-full bg-primary" style={{ width: `${item.progress}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

export default CEOProjectUpdates;
