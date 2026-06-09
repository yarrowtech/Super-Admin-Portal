import { memo, useEffect, useState } from 'react';
import { memo, useEffect, useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import FreelancerDashboard from '../../../components/outsourcing/FreelancerDashboard';
import {
  OutsourcingBadge,
  OutsourcingCard,
  OutsourcingEmptyState,
  OutsourcingErrorState,
  OutsourcingPageHeader,
} from '../components/OutsourcingUI';
import { useOutsourcingDashboardPage } from '../hooks/useOutsourcingDashboardPage';
import { outsourcingApi } from '../../../services/outsourcing';

const KpiGrid = memo(({ items, loading }) => (
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
    {items.map((item) => (
      <OutsourcingCard key={item.label} className="min-h-[120px]">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-neutral-500 dark:text-neutral-400">{item.label}</p>
            <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-white">{loading ? '...' : item.value}</p>
          </div>
          <span className="material-symbols-outlined rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{item.icon}</span>
        </div>
      </OutsourcingCard>
    ))}
  </div>
));

export default function OutsourcingDashboardRoute() {
  const { token, user } = useAuth();
  const { isWorker, loading, error, contracts, kpis, workspace, workspaceKpis, recentJobs, pendingVerification, approvedLogs } = useOutsourcingDashboardPage();
  const [operations, setOperations] = useState({ pendingVerification: 0, readyToInvoice: 0, activeContracts: 0 });

  useEffect(() => {
    let alive = true;
    if (!token || isWorker) return undefined;
    (async () => {
      try {
        const response = await outsourcingApi.getDashboard(token);
        if (alive) setOperations(response?.data?.operations || {});
      } catch (_err) {}
    })();
    return () => { alive = false; };
  }, [token, isWorker]);

  if (isWorker) {
    return <FreelancerDashboard token={token} user={user} />;
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <OutsourcingPageHeader title="Outsourcing Dashboard" subtitle="Production dashboard with centralized queries, route splitting, and minimal duplication." />
      {error ? <OutsourcingErrorState message={error.message || 'Failed to load outsourcing dashboard'} /> : null}
      <KpiGrid items={kpis} loading={loading} />
      <OutsourcingCard className="min-h-[180px]">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase text-primary">Central Workspace</p>
            <h3 className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-100">Assigned scope, sessions, alerts, and audit trail</h3>
            <p className="mt-1 max-w-3xl text-sm text-neutral-600 dark:text-neutral-400">
              Workers load only their assigned scope. Admin keeps full visibility across jobs, contracts, sessions, logs, and notifications.
            </p>
          </div>
          <span className="rounded-full bg-neutral-100 px-3 py-1.5 text-xs font-semibold text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">
            Scope: {workspace?.scope || 'assigned_only'}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {workspaceKpis.map((item) => (
            <div key={item.label} className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
              <p className="text-xs uppercase text-neutral-500 dark:text-neutral-400">{item.label}</p>
              <p className="mt-2 text-2xl font-black text-neutral-900 dark:text-neutral-100">{loading ? '...' : item.value}</p>
            </div>
          ))}
        </div>
      </OutsourcingCard>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <OutsourcingCard className="min-h-[240px]">
          <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">Recent Jobs</h3>
          {recentJobs.length === 0 ? (
            <OutsourcingEmptyState title="No jobs yet" subtitle="Create jobs to start tracking assignments." />
          ) : (
            <div className="space-y-2">
              {recentJobs.slice(0, 4).map((job) => (
                <div key={job._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{job.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{job?.assignedFreelancer?.email || 'Unassigned'}</p>
                  </div>
                  <OutsourcingBadge value={job.status} />
                </div>
              ))}
            </div>
          )}
        </OutsourcingCard>
        <OutsourcingCard className="min-h-[240px]">
          <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">Log Health</h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 text-sm dark:border-neutral-800">
              <span className="text-neutral-600 dark:text-neutral-300">Pending Verification</span>
              <span className="font-semibold text-amber-600">{pendingVerification}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 text-sm dark:border-neutral-800">
              <span className="text-neutral-600 dark:text-neutral-300">Approved Logs</span>
              <span className="font-semibold text-emerald-600">{approvedLogs}</span>
            </div>
            <div className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 text-sm dark:border-neutral-800">
              <span className="text-neutral-600 dark:text-neutral-300">Contracts</span>
              <span className="font-semibold text-neutral-800 dark:text-neutral-100">{contracts.length}</span>
            </div>
          </div>
        </OutsourcingCard>
      </div>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <OutsourcingCard className="min-h-[120px]">
          <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Pending Verification</p>
          <p className="mt-2 text-2xl font-bold text-amber-600">{operations.pendingVerification ?? pendingVerification}</p>
        </OutsourcingCard>
        <OutsourcingCard className="min-h-[120px]">
          <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Ready To Invoice</p>
          <p className="mt-2 text-2xl font-bold text-emerald-600">{operations.readyToInvoice ?? approvedLogs}</p>
        </OutsourcingCard>
        <OutsourcingCard className="min-h-[120px]">
          <p className="text-xs font-semibold uppercase text-neutral-500 dark:text-neutral-400">Active Contracts</p>
          <p className="mt-2 text-2xl font-bold text-neutral-900 dark:text-white">{operations.activeContracts ?? contracts.length}</p>
        </OutsourcingCard>
      </div>
    </div>
  );
}
