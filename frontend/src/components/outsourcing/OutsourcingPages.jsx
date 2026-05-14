import React, { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import FreelancerDashboard from './FreelancerDashboard';

const statusTone = {
  pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300',
  accepted: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300',
  in_progress: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  completed: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  active: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  draft: 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300',
  approved: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300',
  rejected: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300'
};

const Card = ({ children, className = '' }) => (
  <section className={`rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm lg:p-5 dark:border-neutral-800 dark:bg-neutral-950 ${className}`}>
    {children}
  </section>
);

const Badge = ({ value }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusTone[value] || 'bg-neutral-100 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200'}`}>
    {(value || 'unknown').replaceAll('_', ' ')}
  </span>
);

const EmptyState = ({ title, subtitle }) => (
  <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700 dark:text-neutral-400">
    <p className="font-semibold text-neutral-700 dark:text-neutral-200">{title}</p>
    <p className="mt-1">{subtitle}</p>
  </div>
);

const ErrorState = ({ message = 'Failed to load data.', onRetry }) => (
  <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300">
    <p className="font-semibold">Something went wrong</p>
    <p className="mt-1">{message}</p>
    {onRetry ? (
      <button onClick={onRetry} className="mt-3 rounded-lg bg-rose-700 px-3 py-1.5 text-xs font-semibold text-white dark:bg-rose-500">
        Retry
      </button>
    ) : null}
  </div>
);

const LoadingList = ({ rows = 4 }) => (
  <div className="space-y-2">
    {Array.from({ length: rows }).map((_, idx) => (
      <div key={idx} className="animate-pulse rounded-lg border border-neutral-200 p-3 dark:border-neutral-800">
        <div className="h-4 w-1/3 rounded bg-neutral-200 dark:bg-neutral-800" />
        <div className="mt-2 h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
      </div>
    ))}
  </div>
);

const PageHeader = ({ title, subtitle, right }) => (
  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
    <div>
      <h1 className="text-xl font-bold tracking-tight text-neutral-900 lg:text-2xl dark:text-white">{title}</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{subtitle}</p>
    </div>
    <div className="w-full sm:w-auto">{right}</div>
  </div>
);

export const OutsourcingDashboardPage = () => {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const isWorker =
    user?.metadata?.outsourcingType === 'third_party_worker' ||
    user?.metadata?.outsourcingType === 'freelancer';
  const [jobs, setJobs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [logs, setLogs] = useState([]);

  if (isWorker) {
    return <FreelancerDashboard token={token} user={user} />;
  }

  useEffect(() => {
    (async () => {
      try {
        const [res, jobsRes, contractsRes, logsRes] = await Promise.all([
          outsourcingApi.getDashboard(token),
          outsourcingApi.getJobs(token),
          outsourcingApi.getContracts(token),
          outsourcingApi.getTimeLogs(token)
        ]);
        setData(res.data);
        setJobs(jobsRes.data || []);
        setContracts(contractsRes.data || []);
        setLogs(logsRes.data || []);
      } catch {
        const [jobsRes, contractsRes, logsRes] = await Promise.all([
          outsourcingApi.getJobs(token),
          outsourcingApi.getContracts(token),
          outsourcingApi.getTimeLogs(token)
        ]);
        setJobs(jobsRes.data || []);
        setContracts(contractsRes.data || []);
        setLogs(logsRes.data || []);
        setData({
          users: { freelancers: 0 },
          contracts: { total: (contractsRes.data || []).length },
          payments: { totalEscrowFunded: 0 },
          jobsByStatus: [],
          myStats: {
            jobs: (jobsRes.data || []).length,
            contracts: (contractsRes.data || []).length,
            pendingLogs: (logsRes.data || []).filter((x) => x.verificationStatus === 'pending').length
          }
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const kpis = [
    { label: 'Jobs', value: data?.myStats?.jobs || 0, icon: 'work' },
    { label: 'Contracts', value: data?.contracts?.total || 0, icon: 'contract' },
    { label: 'Escrow Funded', value: data?.payments?.totalEscrowFunded || 0, icon: 'payments' },
    { label: 'My Jobs', value: data?.myStats?.jobs || 0, icon: 'work' },
    { label: 'Pending Logs', value: data?.myStats?.pendingLogs || 0, icon: 'schedule' }
  ];

  if (user?.role === 'admin') {
    kpis.unshift({ label: 'Freelancers', value: data?.users?.freelancers || data?.users?.workers || 0, icon: 'person' });
  }

  const recentJobs = [...jobs].slice(0, 5);
  const pendingVerification = logs.filter((x) => x.verificationStatus === 'pending').length;
  const approvedLogs = logs.filter((x) => x.verificationStatus === 'approved').length;

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <PageHeader title="Outsourcing Dashboard" subtitle="Essential overview of jobs, contracts, and work logs" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.label} className="min-h-[120px]">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">{kpi.label}</p>
                <p className="mt-1 text-3xl font-bold text-neutral-900 dark:text-white">{loading ? '...' : kpi.value}</p>
              </div>
              <span className="material-symbols-outlined rounded-xl bg-neutral-100 p-2 text-neutral-700 dark:bg-neutral-800 dark:text-neutral-200">{kpi.icon}</span>
            </div>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
        <Card className="min-h-[240px]">
          <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">Recent Jobs</h3>
          {recentJobs.length === 0 ? (
            <EmptyState title="No jobs yet" subtitle="Create jobs to start tracking assignments." />
          ) : (
            <div className="space-y-2">
              {recentJobs.slice(0, 4).map((job) => (
                <div key={job._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 dark:border-neutral-800">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-white">{job.title}</p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">{job?.assignedFreelancer?.email || 'Unassigned'}</p>
                  </div>
                  <Badge value={job.status} />
                </div>
              ))}
            </div>
          )}
        </Card>
        <Card className="min-h-[240px]">
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
        </Card>
      </div>
    </div>
  );
};

export const OutsourcingJobsPage = () => {
  const { token, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [assignmentMap, setAssignmentMap] = useState({});
  const [query, setQuery] = useState('');
  const [busyJobId, setBusyJobId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadRows = async ({ silent = false } = {}) => {
    try {
      if (!silent) setLoading(true);
      setError('');
      const [jobsRes, contractsRes] = await Promise.all([
        outsourcingApi.getJobs(token),
        outsourcingApi.getContracts(token)
      ]);
      setRows(jobsRes.data || []);
      setContracts(contractsRes.data || []);
      if (user?.role === 'admin') {
        const usersRes = await outsourcingApi.getUsers(token);
        setFreelancers(usersRes.data || []);
      }
    } catch (err) {
      setError(err.message || 'Failed to load jobs');
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadRows();
  }, [token]);

  const acceptJob = async (jobId) => {
    try {
      setBusyJobId(jobId);
      setError('');
      await outsourcingApi.acceptJob(token, jobId);
      await loadRows();
    } catch (err) {
      setError(err.message || 'Failed to accept job');
    } finally {
      setBusyJobId('');
    }
  };

  const setJobStatus = async (jobId, status) => {
    try {
      setBusyJobId(jobId);
      setError('');
      await outsourcingApi.updateJobStatus(token, jobId, status);
      await loadRows();
    } catch (err) {
      setError(err.message || 'Failed to update job status');
    } finally {
      setBusyJobId('');
    }
  };

  const assignJob = async (jobId) => {
    const freelancerId = assignmentMap[jobId];
    if (!freelancerId) return;
    try {
      setBusyJobId(jobId);
      setError('');
      await outsourcingApi.assignJob(token, jobId, freelancerId);
      await loadRows();
    } catch (err) {
      setError(err.message || 'Failed to assign job');
    } finally {
      setBusyJobId('');
    }
  };

  const activeContractJobIds = useMemo(
    () =>
      new Set(
        contracts
          .filter((contract) => contract?.status === 'active')
          .map((contract) => String(contract?.job?._id || contract?.job || ''))
          .filter(Boolean)
      ),
    [contracts]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => `${r.title} ${r.description || ''}`.toLowerCase().includes(q));
  }, [rows, query]);

  return (
    <>
      <PageHeader
        title="Jobs"
        subtitle="View admin-created jobs, descriptions, and progress"
        right={<input className="w-full rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900 sm:w-72" placeholder="Search jobs" value={query} onChange={(e) => setQuery(e.target.value)} />}
      />
      <Card>
        {error ? <ErrorState message={error} onRetry={() => loadRows()} /> : null}
        {loading ? <LoadingList rows={5} /> : null}
        {!loading && !error && filtered.length === 0 ? (
          <EmptyState title="No jobs found" subtitle="Create a job or adjust search filters." />
        ) : null}
        {!loading && !error && filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-neutral-500 dark:border-neutral-800 dark:text-neutral-400">
                  <th className="pb-2">Title</th>
                  <th className="pb-2">Created By</th>
                  <th className="pb-2">Worker</th>
                  <th className="pb-2">Acceptance</th>
                  <th className="pb-2">Status</th>
                  <th className="pb-2">Action</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r._id} className="border-b border-neutral-100 align-top dark:border-neutral-900">
                    <td className="py-3">
                      <p className="font-semibold text-neutral-900 dark:text-white">{r.title}</p>
                      <p className="text-neutral-500 dark:text-neutral-400">{r.description || 'No description'}</p>
                    </td>
                    <td className="py-3">{r?.createdBy?.email || 'Admin'}</td>
                    <td className="py-3">{r?.assignedFreelancer?.email || '-'}</td>
                    <td className="py-3"><Badge value={r.acceptanceStatus || 'pending'} /></td>
                    <td className="py-3"><Badge value={r.status} /></td>
                    <td className="py-3">
                      {(() => {
                        const hasActiveContract = activeContractJobIds.has(String(r._id));
                        const isAssignedWorker = r?.assignedFreelancer?._id === user?._id;
                        const canAccept =
                          user?.role !== 'admin' &&
                          r.acceptanceStatus !== 'accepted' &&
                          (!r?.assignedFreelancer || isAssignedWorker);
                        const canUpdateStatus =
                          user?.role !== 'admin' && isAssignedWorker && r.acceptanceStatus === 'accepted';

                        if (user?.role === 'admin') {
                          return (
                            <div className="flex min-w-[220px] flex-wrap gap-2">
                              <select
                                value={assignmentMap[r._id] || ''}
                                onChange={(e) => setAssignmentMap((prev) => ({ ...prev, [r._id]: e.target.value }))}
                                className="rounded border border-neutral-300 bg-white px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-900"
                              >
                                <option value="">Select freelancer</option>
                                {freelancers.map((f) => (
                                  <option key={f._id} value={f._id}>
                                    {`${f.firstName || ''} ${f.lastName || ''}`.trim() || f.email}
                                  </option>
                                ))}
                              </select>
                              <button
                                onClick={() => assignJob(r._id)}
                                disabled={busyJobId === r._id || !assignmentMap[r._id]}
                                className="rounded bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                              >
                                Assign
                              </button>
                            </div>
                          );
                        }

                        if (canAccept) {
                          return (
                            <button
                              onClick={() => acceptJob(r._id)}
                              disabled={busyJobId === r._id}
                              className="rounded bg-neutral-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black"
                            >
                              {busyJobId === r._id ? 'Accepting...' : 'Accept Job'}
                            </button>
                          );
                        }

                        if (canUpdateStatus) {
                          if (!hasActiveContract) {
                            return <span className="text-xs text-amber-600 dark:text-amber-300">Waiting for admin contract</span>;
                          }

                          return (
                            <div className="flex flex-wrap gap-2">
                              {r.status !== 'in_progress' && r.status !== 'completed' ? (
                                <button
                                  onClick={() => setJobStatus(r._id, 'in_progress')}
                                  disabled={busyJobId === r._id}
                                  className="rounded bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  Start Work
                                </button>
                              ) : null}
                              {r.status !== 'completed' ? (
                                <button
                                  onClick={() => setJobStatus(r._id, 'completed')}
                                  disabled={busyJobId === r._id}
                                  className="rounded bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                                >
                                  Mark Completed
                                </button>
                              ) : null}
                            </div>
                          );
                        }

                        return <span className="text-xs text-neutral-500">-</span>;
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </Card>
    </>
  );
};

export const OutsourcingContractsPage = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await outsourcingApi.getContracts(token);
        setRows(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load contracts');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <>
      <PageHeader title="Contracts" subtitle="Payment terms, rates, lifecycle and resource assignment" />
      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingList rows={4} /> : null}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {!loading && rows.length === 0 ? (
          <Card className="xl:col-span-2">
            <EmptyState title="No contracts available" subtitle="Create contracts after jobs are assigned to workers." />
          </Card>
        ) : (
          rows.map((r) => (
            <Card key={r._id}>
              <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="font-semibold text-neutral-900 dark:text-white">{r?.job?.title || 'Untitled Job'}</h3>
                <Badge value={r.status} />
              </div>
              <div className="grid grid-cols-1 gap-3 text-sm text-neutral-600 dark:text-neutral-300 sm:grid-cols-2">
                <p><span className="font-medium">Type:</span> {r.paymentType}</p>
                <p><span className="font-medium">Rate:</span> {r.rate} {r.currency}</p>
                <p><span className="font-medium">Created By:</span> {r?.createdBy?.email || 'Super Admin'}</p>
                <p><span className="font-medium">Worker:</span> {r?.freelancer?.email || '-'}</p>
              </div>
            </Card>
          ))
        )}
      </div>
    </>
  );
};

export const OutsourcingTimeLogsPage = () => {
  const { token, user } = useAuth();
  const [rows, setRows] = useState([]);
  const [sessionData, setSessionData] = useState({ isCheckedIn: false, activeSession: null, sessions: [] });
  const [hours, setHours] = useState('');
  const [contractId, setContractId] = useState('');
  const [logDate, setLogDate] = useState('');
  const [workSummary, setWorkSummary] = useState('');
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [note, setNote] = useState('');
  const [workStatus, setWorkStatus] = useState('in_progress');
  const [submitting, setSubmitting] = useState(false);
  const [reviewBusyId, setReviewBusyId] = useState('');
  const [sessionBusy, setSessionBusy] = useState(false);
  const [sessionMsg, setSessionMsg] = useState('');

  const load = () =>
    outsourcingApi
      .getTimeLogs(token)
      .then((res) => setRows(res.data || []))
      .catch(() => setRows([]));

  const loadSessions = () =>
    outsourcingApi
      .getMySessions(token)
      .then((res) => setSessionData(res.data || { isCheckedIn: false, activeSession: null, sessions: [] }))
      .catch(() => setSessionData({ isCheckedIn: false, activeSession: null, sessions: [] }));

  useEffect(() => {
    load();
    loadSessions();
  }, [token]);

  const onCheckIn = async () => {
    try {
      setSessionBusy(true);
      setSessionMsg('');
      await outsourcingApi.checkIn(token, {});
      setSessionMsg('Checked in successfully.');
      await loadSessions();
    } catch (err) {
      setSessionMsg(err.message || 'Failed to check in');
    } finally {
      setSessionBusy(false);
    }
  };

  const onCheckOut = async () => {
    try {
      setSessionBusy(true);
      setSessionMsg('');
      const out = await outsourcingApi.checkOut(token, {});
      setSessionMsg(`Checked out. Duration: ${out?.data?.durationHours || 0}h`);
      await loadSessions();
    } catch (err) {
      setSessionMsg(err.message || 'Failed to check out');
    } finally {
      setSessionBusy(false);
    }
  };

  const submitLog = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      await outsourcingApi.logTime(token, {
        contractId,
        logDate,
        hours: Number(hours),
        workSummary,
        deliverableUrl,
        note,
        workStatus
      });
      setHours('');
      setContractId('');
      setLogDate('');
      setWorkSummary('');
      setDeliverableUrl('');
      setNote('');
      setWorkStatus('in_progress');
      load();
    } finally {
      setSubmitting(false);
    }
  };

  const verifyLog = async (id, status) => {
    try {
      setReviewBusyId(id);
      await outsourcingApi.verifyTimeLog(token, id, status);
      await load();
    } finally {
      setReviewBusyId('');
    }
  };

  const requestRevision = async (id) => {
    const noteText = window.prompt('Enter revision note for freelancer');
    if (!noteText || !noteText.trim()) return;
    try {
      setReviewBusyId(id);
      await outsourcingApi.requestTimeLogRevision(token, id, noteText.trim());
      await load();
    } finally {
      setReviewBusyId('');
    }
  };

  return (
    <>
      <PageHeader title="Time Logs" subtitle="Submit, review and verify effort records" />
      {user?.metadata?.outsourcingType === 'third_party_worker' || user?.metadata?.outsourcingType === 'freelancer' ? (
        <Card className="mb-4">
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
            <Badge value={sessionData?.isCheckedIn ? 'active' : 'closed'} />
            <p className="text-sm text-neutral-700 dark:text-neutral-300">
              {sessionData?.isCheckedIn
                ? `Checked in at ${new Date(sessionData?.activeSession?.checkInAt).toLocaleString()}`
                : 'Currently checked out'}
            </p>
            <button
              disabled={sessionBusy || sessionData?.isCheckedIn}
              onClick={onCheckIn}
              type="button"
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Check In
            </button>
            <button
              disabled={sessionBusy || !sessionData?.isCheckedIn}
              onClick={onCheckOut}
              type="button"
              className="rounded-lg bg-rose-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              Check Out
            </button>
          </div>
          {sessionMsg ? <p className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">{sessionMsg}</p> : null}
          <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">Submit Work Update</h3>
          <form className="grid grid-cols-1 gap-3 md:grid-cols-2" onSubmit={submitLog}>
            <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900" placeholder="Contract ID" value={contractId} onChange={(e) => setContractId(e.target.value)} required />
            <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900" type="date" value={logDate} onChange={(e) => setLogDate(e.target.value)} required />
            <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900" placeholder="Hours" value={hours} onChange={(e) => setHours(e.target.value)} required />
            <select className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900" value={workStatus} onChange={(e) => setWorkStatus(e.target.value)}>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
            <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2" placeholder="Work summary" value={workSummary} onChange={(e) => setWorkSummary(e.target.value)} />
            <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2" placeholder="Deliverable URL (drive/github/figma etc.)" value={deliverableUrl} onChange={(e) => setDeliverableUrl(e.target.value)} />
            <textarea className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 md:col-span-2" placeholder="Daily note / update" value={note} onChange={(e) => setNote(e.target.value)} />
            <button disabled={submitting} className="rounded-xl bg-neutral-900 px-4 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black">
              {submitting ? 'Submitting...' : 'Log Time'}
            </button>
          </form>
        </Card>
      ) : null}
      <Card className="mb-4">
        <h3 className="mb-3 text-base font-semibold text-neutral-900 dark:text-white">Check-in History</h3>
        {sessionData?.sessions?.length ? (
          <div className="space-y-2">
            {sessionData.sessions.map((s) => (
              <div key={s._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-2.5 text-sm dark:border-neutral-800">
                <div>
                  <p className="font-medium text-neutral-900 dark:text-white">{new Date(s.checkInAt).toLocaleString()}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">
                    {s.checkOutAt ? `Out: ${new Date(s.checkOutAt).toLocaleString()}` : 'Active session'}
                  </p>
                </div>
                <div className="text-right">
                  <Badge value={s.status} />
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {(Number(s.durationMinutes || 0) / 60).toFixed(2)}h
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState title="No check-in sessions yet" subtitle="Start with your first check-in." />
        )}
      </Card>
      <Card>
        {rows.length === 0 ? (
          <EmptyState title="No time logs yet" subtitle="Workers can submit logs once contracts are active." />
        ) : (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r._id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{r?.job?.title || 'Untitled Job'}</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{new Date(r.logDate).toLocaleDateString()} • {r.hours} hours</p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">{r.workSummary || 'No summary provided'}</p>
                  {r.deliverableUrl ? <a className="text-xs text-blue-600 underline" href={r.deliverableUrl} target="_blank" rel="noreferrer">Deliverable Link</a> : null}
                </div>
                <div className="flex gap-2">
                  <Badge value={r.workStatus || 'in_progress'} />
                  <Badge value={r.verificationStatus} />
                  {user?.role === 'admin' && r.verificationStatus === 'pending' ? (
                    <>
                      <button
                        onClick={() => verifyLog(r._id, 'approved')}
                        disabled={reviewBusyId === r._id}
                        className="rounded bg-emerald-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => requestRevision(r._id)}
                        disabled={reviewBusyId === r._id}
                        className="rounded bg-rose-600 px-2 py-1 text-xs font-semibold text-white disabled:opacity-60"
                      >
                        Request Revision
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </>
  );
};

export const OutsourcingProfilePage = () => {
  const { token } = useAuth();
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    title: '',
    bio: '',
    city: '',
    country: '',
    timezone: '',
    hourlyRate: '',
    availability: '',
    skillsCsv: '',
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    ifscCode: '',
    accountType: '',
    upiId: '',
    paypalEmail: ''
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  const load = async () => {
    try {
      const res = await outsourcingApi.getMyProfile(token);
      const p = res.data || {};
      const m = p.metadata || {};
      const pay = m.paymentDetails || {};
      setProfile(p);
      setForm({
        firstName: p.firstName || '',
        lastName: p.lastName || '',
        email: p.email || '',
        phone: p.phone || '',
        title: m.title || '',
        bio: m.bio || '',
        city: m.city || '',
        country: m.country || '',
        timezone: m.timezone || '',
        hourlyRate: String(m.hourlyRate || ''),
        availability: m.availability || '',
        skillsCsv: (m.skills || []).join(', '),
        accountHolderName: pay.accountHolderName || '',
        bankName: pay.bankName || '',
        accountNumber: pay.accountNumber || '',
        ifscCode: pay.ifscCode || '',
        accountType: pay.accountType || '',
        upiId: pay.upiId || '',
        paypalEmail: pay.paypalEmail || ''
      });
    } catch {
      setProfile(null);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const onSave = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage('');
      await outsourcingApi.updateMyProfile(token, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone,
        title: form.title,
        bio: form.bio,
        city: form.city,
        country: form.country,
        timezone: form.timezone,
        hourlyRate: Number(form.hourlyRate || 0),
        availability: form.availability,
        skills: form.skillsCsv.split(',').map((s) => s.trim()).filter(Boolean),
        paymentDetails: {
          accountHolderName: form.accountHolderName,
          bankName: form.bankName,
          accountNumber: form.accountNumber,
          ifscCode: form.ifscCode,
          accountType: form.accountType,
          upiId: form.upiId,
          paypalEmail: form.paypalEmail
        }
      });
      setMessage('Profile updated successfully');
      await load();
    } catch (err) {
      setMessage(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const onUploadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setUploading(true);
      setUploadMessage('');
      const res = await outsourcingApi.uploadFile(token, file);
      setUploadMessage(res?.data?.url ? 'File uploaded successfully' : 'Upload accepted (Cloudinary not configured)');
    } catch (err) {
      setUploadMessage(err.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  return (
    <>
      <PageHeader title="Profile" subtitle="Manage your freelancer profile, skills, and payment details" />
      <Card>
        <form onSubmit={onSave} className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="First name" value={form.firstName} onChange={(e) => setForm({ ...form, firstName: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Last name" value={form.lastName} onChange={(e) => setForm({ ...form, lastName: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-neutral-100 p-2.5 text-sm" value={form.email} readOnly />
          <input className="rounded-xl border border-neutral-300 bg-neutral-100 p-2.5 text-sm" value={profile?._id || ''} readOnly />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <textarea className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm md:col-span-2" placeholder="Bio" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Timezone" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Hourly rate (INR)" value={form.hourlyRate} onChange={(e) => setForm({ ...form, hourlyRate: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm md:col-span-2" placeholder="Skills (comma separated)" value={form.skillsCsv} onChange={(e) => setForm({ ...form, skillsCsv: e.target.value })} />
          <h3 className="text-sm font-semibold md:col-span-2">Payment / Bank Details</h3>
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Account holder name" value={form.accountHolderName} onChange={(e) => setForm({ ...form, accountHolderName: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Bank name" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Account number" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="IFSC code" value={form.ifscCode} onChange={(e) => setForm({ ...form, ifscCode: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="Account type" value={form.accountType} onChange={(e) => setForm({ ...form, accountType: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" placeholder="UPI ID" value={form.upiId} onChange={(e) => setForm({ ...form, upiId: e.target.value })} />
          <input className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm md:col-span-2" placeholder="PayPal email" value={form.paypalEmail} onChange={(e) => setForm({ ...form, paypalEmail: e.target.value })} />
          <label className="md:col-span-2">
            <span className="mb-1 block text-sm font-medium">Upload Portfolio/Deliverable File</span>
            <input type="file" onChange={onUploadFile} className="w-full rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" />
          </label>
          {uploadMessage ? <p className="text-sm text-blue-600 md:col-span-2">{uploadMessage}</p> : null}
          {message ? <p className="text-sm text-emerald-600 md:col-span-2">{message}</p> : null}
          <button disabled={saving || uploading} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black">
            {saving ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </Card>
    </>
  );
};

export const OutsourcingPaymentsPage = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await outsourcingApi.getPayments(token);
        setRows(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load payments');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);
  return (
    <>
      <PageHeader title="Payments" subtitle="Track escrow and freelancer payment records" />
      <Card>
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingList rows={4} /> : null}
        {!loading && !error && rows.length === 0 ? <EmptyState title="No payments yet" subtitle="Payment records will appear here." /> : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r._id} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{r?.job?.title || 'Payment'}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">{r.paymentType}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">{r.amount} {r.currency}</p>
                  <Badge value={r.status} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </>
  );
};

export const OutsourcingNotificationsPage = () => {
  const { token } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const res = await outsourcingApi.getNotifications(token);
        setRows(res.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load notifications');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);
  return (
    <>
      <PageHeader title="Notifications" subtitle="Job, contract, and work activity alerts" />
      <Card>
        {error ? <ErrorState message={error} /> : null}
        {loading ? <LoadingList rows={6} /> : null}
        {!loading && !error && rows.length === 0 ? <EmptyState title="No notifications" subtitle="You are all caught up." /> : null}
        {!loading && !error && rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((n) => (
              <div key={n._id} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <p className="font-semibold text-neutral-900 dark:text-white">{n.title || 'Notification'}</p>
                <p className="text-neutral-600 dark:text-neutral-300">{n.message || 'No message'}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </>
  );
};

export const OutsourcingActivityPage = () => {
  const { token } = useAuth();
  const [events, setEvents] = useState([]);
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [activity, analyticsRes] = await Promise.all([
          outsourcingApi.getActivityFeed(token),
          outsourcingApi.getMyAnalytics(token)
        ]);
        setEvents(activity.data || []);
        setAnalytics(analyticsRes.data || null);
      } catch (err) {
        setError(err.message || 'Failed to load activity');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  return (
    <>
      <PageHeader title="Activity" subtitle="Recent session, job, and work log actions" />
      {error ? <ErrorState message={error} /> : null}
      {loading ? <LoadingList rows={5} /> : null}
      {!loading && analytics ? (
        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
          <Card><p className="text-xs text-neutral-500">Contracts</p><p className="text-xl font-bold">{analytics?.contracts?.active || 0}/{analytics?.contracts?.total || 0}</p></Card>
          <Card><p className="text-xs text-neutral-500">Approved Logs</p><p className="text-xl font-bold">{analytics?.timeLogs?.approved || 0}</p></Card>
          <Card><p className="text-xs text-neutral-500">Total Hours</p><p className="text-xl font-bold">{analytics?.work?.totalHours || 0}</p></Card>
          <Card><p className="text-xs text-neutral-500">Estimated Earnings</p><p className="text-xl font-bold">INR {analytics?.earnings?.estimatedApproved || 0}</p></Card>
        </div>
      ) : null}
      <Card>
        {!loading && events.length === 0 ? <EmptyState title="No activity yet" subtitle="Your recent actions will appear here." /> : null}
        {!loading && events.length > 0 ? (
          <div className="space-y-2">
            {events.map((e, idx) => (
              <div key={`${e.type}-${idx}`} className="rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <p className="font-semibold text-neutral-900 dark:text-white">{e.title}</p>
                <p className="text-neutral-500 dark:text-neutral-400">{new Date(e.at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </>
  );
};

export const OutsourcingInvoicesPage = () => {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [rows, setRows] = useState([]);
  const [selectedLog, setSelectedLog] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError('');
        const [timeLogsRes, invoicesRes] = await Promise.all([
          outsourcingApi.getTimeLogs(token),
          outsourcingApi.getInvoices(token)
        ]);
        const all = timeLogsRes.data || [];
        setLogs(all.filter((x) => x.verificationStatus === 'approved'));
        setRows(invoicesRes.data || []);
      } catch (err) {
        setError(err.message || 'Failed to load invoices');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const onGenerate = async () => {
    if (!selectedLog) return;
    try {
      setBusy(true);
      await outsourcingApi.generateInvoice(token, { timeLogId: selectedLog });
      const refreshed = await outsourcingApi.getInvoices(token);
      setRows(refreshed.data || []);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Invoices" subtitle="Generate and review approved work invoices" />
      {error ? <ErrorState message={error} /> : null}
      <Card className="mb-4">
        <div className="flex flex-col gap-2 md:flex-row">
          <select className="rounded-xl border border-neutral-300 bg-white p-2.5 text-sm" value={selectedLog} onChange={(e) => setSelectedLog(e.target.value)}>
            <option value="">Select approved time log</option>
            {logs.map((l) => <option key={l._id} value={l._id}>{`${new Date(l.logDate).toLocaleDateString()} - ${l?.job?.title || 'Job'} (${l.hours}h)`}</option>)}
          </select>
          <button onClick={onGenerate} disabled={!selectedLog || busy} className="rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60 dark:bg-white dark:text-black">{busy ? 'Generating...' : 'Generate Invoice'}</button>
        </div>
      </Card>
      <Card>
        {loading ? <LoadingList rows={4} /> : null}
        {!loading && rows.length === 0 ? <EmptyState title="No invoices yet" subtitle="Generate an invoice from approved time logs." /> : null}
        {!loading && rows.length > 0 ? (
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.invoiceId} className="flex items-center justify-between rounded-lg border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                <div>
                  <p className="font-semibold text-neutral-900 dark:text-white">{r.jobTitle}</p>
                  <p className="text-neutral-500 dark:text-neutral-400">{r.invoiceId}</p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">INR {r.amount}</p>
                  <Badge value={r.status} />
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </Card>
    </>
  );
};
