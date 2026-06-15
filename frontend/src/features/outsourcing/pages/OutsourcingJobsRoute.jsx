import Button from '../../../components/common/Button';
import KPICard from '../../../components/common/KPICard';
import PortalHeader from '../../../components/common/PortalHeader';
import { useAuth } from '../../../context/AuthContext';
import {
  OutsourcingBadge,
  OutsourcingCard,
  OutsourcingEmptyState,
  OutsourcingErrorState,
  OutsourcingLoadingList,
} from '../components/OutsourcingUI';
import { useOutsourcingJobsPage } from '../hooks/useOutsourcingJobsPage';

export default function OutsourcingJobsRoute() {
  const { user } = useAuth();
  const {
    query,
    setQuery,
    rows,
    totalRows,
    stats,
    hasMore,
    sentinelRef,
    activeContractJobIds,
    loading,
    error,
    busyJobId,
    acceptJob,
    rejectJob,
    setJobStatus,
    retry,
  } = useOutsourcingJobsPage();

  const normalizedOutsourcingType = String(user?.metadata?.outsourcingType || '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_');
  const isWorker =
    normalizedOutsourcingType === 'third_party_worker' ||
    normalizedOutsourcingType === '3rd_party_worker' ||
    normalizedOutsourcingType === 'thirdpartyworker' ||
    normalizedOutsourcingType === 'freelancer';
  const promptRejectReason = async (jobId) => {
    const rejectionReason = window.prompt('Enter rejection reason for this task');
    if (!rejectionReason || !rejectionReason.trim()) return;
    await rejectJob({ jobId, rejectionReason: rejectionReason.trim() });
  };

  return (
    <>
      <PortalHeader
        title="Outsourcing Jobs"
        subtitle="Review assignments, confirm contract readiness, and move work forward with the same command-center UX as admin dashboards."
        user={user}
        icon="work_history"
        showSearch
        showNotifications
        showThemeToggle
        onSearchChange={(event) => setQuery(event.target.value)}
        searchPlaceholder="Search title or description..."
      >
        <div className="flex w-full flex-wrap gap-2 sm:w-auto">
          {query ? (
            <Button variant="secondary" size="sm" className="min-h-10" onClick={() => setQuery('')}>
              Clear Search
            </Button>
          ) : null}
          <div className="rounded-lg bg-white px-3 py-1.5 text-sm font-semibold text-neutral-700 shadow-sm dark:bg-neutral-800 dark:text-neutral-200">
            {totalRows} visible jobs
          </div>
        </div>
      </PortalHeader>

      <section className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KPICard title="All Jobs" value={stats.total} icon="inventory_2" colorScheme="blue" subtitle="PIPELINE" compact className="min-h-[150px]" />
        <KPICard title="Pending Review" value={stats.pending} icon="pending_actions" colorScheme="orange" subtitle="AWAITING" compact className="min-h-[150px]" />
        <KPICard title="In Motion" value={stats.active} icon="bolt" colorScheme="green" subtitle="ACTIVE" compact className="min-h-[150px]" />
        <KPICard title="Contract Ready" value={stats.contracted} icon="verified" colorScheme="purple" subtitle="READY" compact className="min-h-[150px]" />
      </section>

      <section className="mb-4 grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:col-span-2 lg:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase text-primary">Job Command Center</p>
              <h2 className="mt-1 text-xl font-black text-neutral-900 dark:text-neutral-100 sm:text-2xl">Assignment operations</h2>
              <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                Track pending work, verify contract readiness, and update execution state from one responsive workspace.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" size="sm" className="min-h-10">
                Infinite Scroll
              </Button>
              <Button variant="primary" size="sm" className="min-h-10">
                Cached View
              </Button>
            </div>
          </div>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
              <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Search State</p>
              <p className="mt-2 text-3xl font-black text-neutral-900 dark:text-neutral-100">{query ? 'Live' : 'All'}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">{query ? 'Filtering active' : 'No search filter'}</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
              <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Contract Coverage</p>
              <p className="mt-2 text-3xl font-black text-neutral-900 dark:text-neutral-100">{stats.contracted}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Jobs ready to execute</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-800/60">
              <p className="text-xs font-bold uppercase text-neutral-500 dark:text-neutral-400">Delivery Momentum</p>
              <p className="mt-2 text-3xl font-black text-neutral-900 dark:text-neutral-100">{stats.active}</p>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Accepted or in progress</p>
            </div>
          </div>
        </div>

        <div className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
          <p className="text-sm font-semibold uppercase text-primary">Execution Notes</p>
          <h2 className="mt-1 text-lg font-black text-neutral-900 dark:text-neutral-100">What to do next</h2>
          <div className="mt-4 space-y-3">
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">1. Accept pending jobs</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">Move new assignments out of backlog before starting execution.</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">2. Check contract readiness</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">Only contract-ready jobs should move into active delivery.</p>
            </div>
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-800/60">
              <p className="text-sm font-semibold text-neutral-900 dark:text-white">3. Complete with intent</p>
              <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">Keep status transitions deliberate so logs and billing stay consistent.</p>
            </div>
          </div>
        </div>
      </section>

      <OutsourcingCard className="rounded-xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 lg:p-5">
        {error ? <OutsourcingErrorState message={error.message || 'Failed to load jobs'} onRetry={retry} /> : null}
        {loading ? <OutsourcingLoadingList rows={5} /> : null}
        {!loading && !error && rows.length === 0 ? (
          <OutsourcingEmptyState title="No jobs found" subtitle="Create a job or adjust search filters." />
        ) : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3 dark:border-neutral-800 dark:bg-neutral-800/50">
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-white">Available assignments</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  {query ? `Filtered to ${totalRows} matching jobs` : `${totalRows} jobs available in your queue`}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="rounded-full bg-white px-3 py-1.5 font-medium text-neutral-600 shadow-sm dark:bg-neutral-950 dark:text-neutral-300">
                  Infinite scroll enabled
                </span>
                <span className="rounded-full bg-white px-3 py-1.5 font-medium text-neutral-600 shadow-sm dark:bg-neutral-950 dark:text-neutral-300">
                  Cached locally
                </span>
              </div>
            </div>

            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left dark:border-neutral-800">
                    <th className="px-3 py-3 font-semibold text-neutral-500">Job</th>
                    <th className="px-3 py-3 font-semibold text-neutral-500">Status</th>
                    <th className="px-3 py-3 font-semibold text-neutral-500">Contract</th>
                    <th className="px-3 py-3 font-semibold text-neutral-500">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((job) => {
                        const hasActiveContract = activeContractJobIds.has(String(job?._id));
                        const isBusy = busyJobId === job._id;
                        return (
                      <tr key={job._id} className="border-b border-neutral-100 align-top dark:border-neutral-900">
                        <td className="px-3 py-4">
                          <p className="font-semibold text-neutral-900 dark:text-white">{job.title}</p>
                          <p className="mt-1 max-w-2xl text-xs leading-5 text-neutral-500 dark:text-neutral-400">{job.description || 'No description'}</p>
                          {job.acceptanceStatus === 'rejected' && job.rejectionReason ? (
                            <p className="mt-2 max-w-2xl text-xs font-medium text-rose-600 dark:text-rose-300">{job.rejectionReason}</p>
                          ) : null}
                        </td>
                        <td className="px-3 py-4">
                          <OutsourcingBadge value={job.status} />
                        </td>
                        <td className="px-3 py-4 text-neutral-600 dark:text-neutral-300">
                          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${hasActiveContract ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                            {hasActiveContract ? 'Contract active' : 'Awaiting contract'}
                          </span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-wrap gap-2">
                            {isWorker && job.status === 'pending' ? (
                              <Button onClick={() => acceptJob(job._id)} disabled={isBusy} variant="primary" size="sm" className="min-h-10 rounded-xl">
                                {isBusy ? 'Working...' : 'Accept'}
                              </Button>
                            ) : null}
                            {isWorker && job.status === 'pending' ? (
                              <Button onClick={() => promptRejectReason(job._id)} disabled={isBusy} variant="secondary" size="sm" className="min-h-10 rounded-xl">
                                Reject
                              </Button>
                            ) : null}
                            {isWorker && hasActiveContract ? (
                              <>
                                <Button onClick={() => setJobStatus(job._id, 'in_progress')} disabled={isBusy} variant="secondary" size="sm" className="min-h-10 rounded-xl">
                                  Start
                                </Button>
                                <Button onClick={() => setJobStatus(job._id, 'completed')} disabled={isBusy} variant="outline" size="sm" className="min-h-10 rounded-xl">
                                  Complete
                                </Button>
                              </>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:hidden">
              {rows.map((job) => {
                const hasActiveContract = activeContractJobIds.has(String(job?._id));
                const isBusy = busyJobId === job._id;
                return (
                  <article key={job._id} className="rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-neutral-900 dark:text-white">{job.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-neutral-500 dark:text-neutral-400">{job.description || 'No description'}</p>
                        {job.acceptanceStatus === 'rejected' && job.rejectionReason ? (
                          <p className="mt-2 text-xs font-medium text-rose-600 dark:text-rose-300">{job.rejectionReason}</p>
                        ) : null}
                      </div>
                      <OutsourcingBadge value={job.status} />
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
                      <span className={`rounded-full px-3 py-1.5 font-semibold ${hasActiveContract ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                        {hasActiveContract ? 'Contract active' : 'Awaiting contract'}
                      </span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {isWorker && job.status === 'pending' ? (
                        <Button onClick={() => acceptJob(job._id)} disabled={isBusy} variant="primary" size="sm" className="min-h-10 rounded-xl">
                          {isBusy ? 'Working...' : 'Accept'}
                        </Button>
                      ) : null}
                      {isWorker && job.status === 'pending' ? (
                        <Button onClick={() => promptRejectReason(job._id)} disabled={isBusy} variant="secondary" size="sm" className="min-h-10 rounded-xl">
                          Reject
                        </Button>
                      ) : null}
                      {isWorker && hasActiveContract ? (
                        <>
                          <Button onClick={() => setJobStatus(job._id, 'in_progress')} disabled={isBusy} variant="secondary" size="sm" className="min-h-10 rounded-xl">
                            Start
                          </Button>
                          <Button onClick={() => setJobStatus(job._id, 'completed')} disabled={isBusy} variant="outline" size="sm" className="min-h-10 rounded-xl">
                            Complete
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </article>
                );
              })}
            </div>

            <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400">
              <span>Showing {rows.length} of {totalRows} jobs</span>
              {!hasMore ? <span>All jobs loaded</span> : null}
            </div>
            {hasMore ? <div ref={sentinelRef} className="h-6 w-full" aria-hidden="true" /> : null}
          </div>
        ) : null}
      </OutsourcingCard>
    </>
  );
}
