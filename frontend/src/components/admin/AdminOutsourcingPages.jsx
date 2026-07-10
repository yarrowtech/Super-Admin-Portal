import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useQueries, useQueryClient } from '@tanstack/react-query';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import { QK } from '../../utils/queryKeys';

// ── Shared mini design tokens for admin support page ──────────────────────────
const tone = {
  open:        'bg-blue-50 text-blue-700 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  in_progress: 'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  resolved:    'bg-emerald-50 text-emerald-700 ring-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:ring-emerald-700',
  closed:      'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  low:         'bg-neutral-100 text-neutral-500 ring-neutral-200 dark:bg-neutral-800 dark:text-neutral-400 dark:ring-neutral-700',
  normal:      'bg-blue-50 text-blue-600 ring-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:ring-blue-700',
  high:        'bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:ring-amber-700',
  urgent:      'bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-900/20 dark:text-rose-300 dark:ring-rose-700',
};
const Badge = ({ value }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${tone[value] || tone.normal}`}>
    {String(value || '').replace(/_/g, ' ')}
  </span>
);

const initUser = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'freelancer',
  department: 'Outsourcing',
  outsourcingType: 'freelancer'
};
const initJob = { title: '', description: '', assignedFreelancerId: '' };
const initContract = { jobId: '', paymentType: 'hourly', rate: '', escrowAmount: '' };

const unwrapEfnbmmsRows = (payload) => payload?.data?.items || payload?.items || [];
const unwrapEfnbmmsSummary = (payload) => payload?.data?.summary || payload?.summary || {};

// Shared across 6 separately-routed pages (Dashboard/Freelancers/Jobs/Contracts/
// Reports/Support) — each used to call this hook fresh on every route change,
// re-fetching all 6 endpoints from scratch every time (same redundant-fetch
// bug class fixed in Media's MediaWorkspace.jsx). Now backed by React Query,
// so navigating between these routes reads from cache instead.
const useOutsourcingAdminData = () => {
  const { token, user } = useAuth();
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState('');
  const enabled = Boolean(token);

  const [dashboardQuery, jobsQuery, contractsQuery, timeLogsQuery, freelancersQuery, efnbmmsQuery] = useQueries({
    queries: [
      { queryKey: QK.admin.outsourcing('dashboard'), queryFn: () => outsourcingApi.getDashboard(token), enabled },
      { queryKey: QK.admin.outsourcing('jobs'), queryFn: () => outsourcingApi.getJobs(token), enabled },
      { queryKey: QK.admin.outsourcing('contracts'), queryFn: () => outsourcingApi.getContracts(token), enabled },
      { queryKey: QK.admin.outsourcing('timeLogs'), queryFn: () => outsourcingApi.getTimeLogs(token), enabled },
      { queryKey: QK.admin.outsourcing('users'), queryFn: () => outsourcingApi.getUsers(token), enabled },
      {
        queryKey: QK.admin.outsourcing('efnbmms', { limit: 50 }),
        queryFn: () =>
          outsourcingApi.getEfnbmmsAdminManagement(token, { limit: 50 }).catch((efnbmmsError) => ({
            success: false,
            error: efnbmmsError?.message || 'Failed to load EFNBMMS admin-management data',
            data: { items: [], summary: {} },
          })),
        enabled,
      },
    ],
  });

  const loading = [dashboardQuery, jobsQuery, contractsQuery, timeLogsQuery, freelancersQuery, efnbmmsQuery].some((q) => q.isLoading);
  const dashboard = dashboardQuery.data?.data ?? null;
  const jobs = useMemo(() => jobsQuery.data?.data || [], [jobsQuery.data]);
  const contracts = useMemo(() => contractsQuery.data?.data || [], [contractsQuery.data]);
  const timeLogs = useMemo(() => timeLogsQuery.data?.data || [], [timeLogsQuery.data]);
  const freelancers = useMemo(() => freelancersQuery.data?.data || [], [freelancersQuery.data]);
  const efnbmmsAdmins = useMemo(() => unwrapEfnbmmsRows(efnbmmsQuery.data), [efnbmmsQuery.data]);
  const efnbmmsSummary = useMemo(() => unwrapEfnbmmsSummary(efnbmmsQuery.data), [efnbmmsQuery.data]);

  const queryError =
    [dashboardQuery, jobsQuery, contractsQuery, timeLogsQuery, freelancersQuery].find((q) => q.isError)?.error?.message ||
    (efnbmmsQuery.data?.success === false ? efnbmmsQuery.data.error : '');
  const error = actionError || queryError;
  const setError = setActionError;

  const loadData = () => queryClient.invalidateQueries({ queryKey: ['admin', 'outsourcing'] });

  return { token, user, loading, error, setError, dashboard, jobs, contracts, timeLogs, freelancers, efnbmmsAdmins, efnbmmsSummary, loadData };
};

const PageShell = ({ title, children, user, error }) => (
  <main className="portal-page p-5 dark:bg-neutral-900 md:p-6">
    <div className="mx-auto max-w-7xl">
      <PortalHeader title={title} user={user} icon="work" />
      {error ? <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {children}
    </div>
  </main>
);

export const AdminOutsourcingDashboardPage = () => {
  const { user, loading, error, dashboard, jobs, contracts, timeLogs, efnbmmsAdmins, efnbmmsSummary } = useOutsourcingAdminData();
  const [query, setQuery] = useState('');
  const [efnbmmsQuery, setEfnbmmsQuery] = useState('');
  const [jobStatus, setJobStatus] = useState('all');
  const [acceptance, setAcceptance] = useState('all');
  const [paymentType, setPaymentType] = useState('all');
  const [assignment, setAssignment] = useState('all');

  const contractByJob = useMemo(
    () => new Map(contracts.map((c) => [String(c?.job?._id || c?.job), c])),
    [contracts]
  );

  const filteredJobs = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter((j) => {
      const c = contractByJob.get(String(j._id));
      const matchQ = !q || `${j.title} ${j.description || ''} ${j?.assignedFreelancer?.email || ''}`.toLowerCase().includes(q);
      const matchStatus = jobStatus === 'all' || j.status === jobStatus;
      const matchAcceptance = acceptance === 'all' || (j.acceptanceStatus || 'pending') === acceptance;
      const matchPayment = paymentType === 'all' || (c?.paymentType || 'none') === paymentType;
      const matchAssignment =
        assignment === 'all' ||
        (assignment === 'assigned' && Boolean(j?.assignedFreelancer)) ||
        (assignment === 'unassigned' && !j?.assignedFreelancer);
      return matchQ && matchStatus && matchAcceptance && matchPayment && matchAssignment;
    });
  }, [jobs, query, jobStatus, acceptance, paymentType, assignment, contractByJob]);

  const filteredEfnbmmsAdmins = useMemo(() => {
    const q = efnbmmsQuery.trim().toLowerCase();
    if (!q) return efnbmmsAdmins;
    return efnbmmsAdmins.filter((item) =>
      [
        item.businessName,
        item.email,
        item.mobile,
        item.adminId,
        ...(Array.isArray(item.restaurantNames) ? item.restaurantNames : []),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [efnbmmsAdmins, efnbmmsQuery]);

  if (loading) return <main className="p-6">Loading outsourcing admin...</main>;
  return (
    <PageShell title="Outsourcing Admin Dashboard" user={user} error={error}>
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Freelancers" value={dashboard?.users?.freelancers || 0} icon="person" colorScheme="blue" subtitle="ACTIVE" />
        <KPICard title="Jobs" value={jobs.length} icon="work" colorScheme="green" subtitle="TOTAL" />
        <KPICard title="Contracts" value={contracts.length} icon="contract" colorScheme="orange" subtitle="TOTAL" />
        <KPICard title="Pending Logs" value={timeLogs.filter((x) => x.verificationStatus === 'pending').length} icon="schedule" colorScheme="purple" subtitle="REVIEW" />
        <KPICard title="Active Sessions" value={dashboard?.sessions?.active || 0} icon="play_arrow" colorScheme="green" subtitle="LIVE" />
        <KPICard title="Paused Sessions" value={dashboard?.sessions?.paused || 0} icon="pause" colorScheme="orange" subtitle="HOLD" />
        <KPICard title="Validated Agreements" value={dashboard?.agreements?.validated || 0} icon="verified_user" colorScheme="blue" subtitle="LEGAL" />
        <KPICard title="Overdue Tasks" value={dashboard?.operations?.overdueTasks || 0} icon="warning" colorScheme="purple" subtitle="AT RISK" />
        <KPICard title="EFNBMMS Admins" value={efnbmmsSummary?.admins?.total || efnbmmsAdmins.length} icon="store" colorScheme="blue" subtitle="API" />
        <KPICard title="EFNBMMS Restaurants" value={efnbmmsSummary?.restaurants?.total || 0} icon="restaurant" colorScheme="green" subtitle="API" />
        <KPICard title="EFNBMMS Staff" value={efnbmmsSummary?.staff?.total || 0} icon="groups" colorScheme="orange" subtitle="API" />
      </section>
      <section className="mt-6 rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="mb-3 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-lg font-semibold">EFNBMMS Admin Management</h2>
            <p className="text-xs text-neutral-500">Fetched from EFNBMMS via API. No EFNBMMS portal login required.</p>
          </div>
          <input
            className="rounded border p-2 text-sm md:w-80"
            placeholder="Search business, email, mobile, restaurant"
            value={efnbmmsQuery}
            onChange={(e) => setEfnbmmsQuery(e.target.value)}
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="py-2">Business</th>
                <th className="py-2">Contact</th>
                <th className="py-2">Restaurants</th>
                <th className="py-2">Staff</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {filteredEfnbmmsAdmins.map((item) => (
                <tr key={item.id || item.adminId || item.email} className="border-b align-top">
                  <td className="py-2">
                    <p className="font-medium">{item.businessName || 'Business'}</p>
                    <p className="text-xs text-neutral-500">{item.adminId || item.id || '-'}</p>
                  </td>
                  <td className="py-2">
                    <p>{item.email || '-'}</p>
                    <p className="text-xs text-neutral-500">{item.mobile || '-'}</p>
                  </td>
                  <td className="py-2">
                    <p>{item.totalRestaurants || 0}</p>
                    <p className="max-w-xs truncate text-xs text-neutral-500">
                      {Array.isArray(item.restaurantNames) && item.restaurantNames.length ? item.restaurantNames.join(', ') : '-'}
                    </p>
                  </td>
                  <td className="py-2">{item.totalStaff || 0}</td>
                  <td className="py-2">
                    <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${item.isActive === false ? 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400' : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300'}`}>
                      {item.isActive === false ? 'Inactive' : 'Active'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filteredEfnbmmsAdmins.length === 0 ? <p className="py-4 text-sm text-neutral-500">No EFNBMMS records found.</p> : null}
        </div>
      </section>
      <section className="mt-6 rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
        <div className="mb-3 grid grid-cols-1 gap-2 lg:grid-cols-6">
          <input
            className="rounded border p-2 text-sm lg:col-span-2"
            placeholder="Search by title, description, freelancer email"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className="rounded border p-2 text-sm" value={jobStatus} onChange={(e) => setJobStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="in_progress">In Progress</option>
            <option value="completed">Completed</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="rounded border p-2 text-sm" value={acceptance} onChange={(e) => setAcceptance(e.target.value)}>
            <option value="all">All Acceptance</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
            <option value="rejected">Rejected</option>
          </select>
          <select className="rounded border p-2 text-sm" value={paymentType} onChange={(e) => setPaymentType(e.target.value)}>
            <option value="all">All Payment Types</option>
            <option value="hourly">Hourly</option>
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="fixed">Fixed</option>
            <option value="none">No Contract</option>
          </select>
          <select className="rounded border p-2 text-sm" value={assignment} onChange={(e) => setAssignment(e.target.value)}>
            <option value="all">All Assignment</option>
            <option value="assigned">Assigned</option>
            <option value="unassigned">Unassigned</option>
          </select>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-neutral-500">
                <th className="py-2">Job</th>
                <th className="py-2">Freelancer</th>
                <th className="py-2">Status</th>
                <th className="py-2">Acceptance</th>
                <th className="py-2">Contract</th>
                <th className="py-2">Payment</th>
              </tr>
            </thead>
            <tbody>
              {filteredJobs.map((j) => {
                const c = contractByJob.get(String(j._id));
                return (
                  <tr key={j._id} className="border-b align-top">
                    <td className="py-2">
                      <p className="font-medium">{j.title}</p>
                      <p className="text-xs text-neutral-500">{j.description || 'No description'}</p>
                    </td>
                    <td className="py-2">{j?.assignedFreelancer?.email || 'Unassigned'}</td>
                    <td className="py-2">{j.status}</td>
                    <td className="py-2">{j.acceptanceStatus || 'pending'}</td>
                    <td className="py-2">{c ? 'Created' : 'Pending'}</td>
                    <td className="py-2">{c ? `${c.paymentType} • ${c.rate} ${c.currency}` : '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filteredJobs.length === 0 ? <p className="py-4 text-sm text-neutral-500">No records for current filters.</p> : null}
        </div>
      </section>
    </PageShell>
  );
};

export const AdminOutsourcingFreelancersPage = () => {
  const { token, user, loading, error, setError, freelancers, loadData } = useOutsourcingAdminData();
  const [newUser, setNewUser] = useState(initUser);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  const normalizedEmail = newUser.email.trim().toLowerCase();
  const hasDuplicate = freelancers.some((f) => String(f.email || '').toLowerCase() === normalizedEmail);
  const canSubmit =
    newUser.firstName.trim() &&
    newUser.lastName.trim() &&
    normalizedEmail &&
    newUser.password.trim().length >= 6 &&
    !hasDuplicate &&
    !submitting;

  const submitUser = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setSuccessMsg('');
      await outsourcingApi.createUser(token, newUser);
      setNewUser(initUser);
      setSuccessMsg('Freelancer created successfully.');
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create freelancer');
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) return <main className="p-6">Loading freelancers...</main>;
  return (
    <PageShell title="Outsourcing Freelancers" user={user} error={error}>
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <form className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800" onSubmit={submitUser}>
          <h2 className="mb-3 text-lg font-semibold">Create Freelancer</h2>
          <p className="mb-3 text-xs text-neutral-500">Create a freelancer login account for outsourcing workspace access.</p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            <div>
              <label className="mb-1 block text-xs text-neutral-500">First Name</label>
              <input className="w-full rounded border p-2" placeholder="First name" value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Last Name</label>
              <input className="w-full rounded border p-2" placeholder="Last name" value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Email</label>
              <input className="w-full rounded border p-2" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Phone (Optional)</label>
              <input className="w-full rounded border p-2" placeholder="Phone" value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} />
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Role</label>
              <select className="w-full rounded border p-2" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                <option value="freelancer">Freelancer</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs text-neutral-500">Department</label>
              <input className="w-full rounded border p-2" placeholder="Department" value={newUser.department} onChange={(e) => setNewUser({ ...newUser, department: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs text-neutral-500">Password</label>
              <input type="password" className="w-full rounded border p-2" placeholder="Minimum 6 characters" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
            </div>
          </div>
          {hasDuplicate ? <p className="mt-2 text-xs text-rose-600">A user with this email already exists.</p> : null}
          {successMsg ? <p className="mt-2 text-xs text-emerald-600">{successMsg}</p> : null}
          <Button type="submit" className="mt-3" disabled={!canSubmit}>
            {submitting ? 'Creating...' : 'Add New User'}
          </Button>
        </form>
        <div className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="mb-3 text-lg font-semibold">Freelancer List</h2>
          <div className="space-y-2">
            {freelancers.map((f) => (
              <div key={f._id} className="rounded border p-2 text-sm">
                <p className="font-medium">{f.firstName} {f.lastName}</p>
                <p className="text-xs text-neutral-500">{f.email}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </PageShell>
  );
};

export const AdminOutsourcingJobsPage = () => {
  const { token, user, loading, error, setError, jobs, freelancers, contracts, loadData } = useOutsourcingAdminData();
  const [newJob, setNewJob] = useState(initJob);
  const pendingAcceptedJobs = useMemo(
    () => jobs.filter((j) => j.acceptanceStatus === 'accepted' && !contracts.some((c) => String(c?.job?._id || c?.job) === String(j._id))),
    [jobs, contracts]
  );
  const submitJob = async (e) => {
    e.preventDefault();
    try {
      await outsourcingApi.createJob(token, {
        title: newJob.title.trim(),
        description: newJob.description.trim() || 'General outsourcing task',
        assignedFreelancerId: newJob.assignedFreelancerId || undefined
      });
      setNewJob(initJob);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create job');
    }
  };
  if (loading) return <main className="p-6">Loading jobs...</main>;
  return (
    <PageShell title="Outsourcing Jobs" user={user} error={error}>
      <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <form className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800" onSubmit={submitJob}>
          <h2 className="mb-1 text-lg font-semibold">Create Job 

          </h2>
          <p className="mb-3 text-xs text-neutral-500">Only title is required. Description/freelancer are optional.</p>
          <div className="grid grid-cols-1 gap-2">
            <input className="rounded border p-2" placeholder="Job title *" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} required />
            <textarea className="rounded border p-2" placeholder="Description (optional)" value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} />
            <select className="rounded border p-2" value={newJob.assignedFreelancerId} onChange={(e) => setNewJob({ ...newJob, assignedFreelancerId: e.target.value })}>
              <option value="">Unassigned (optional)</option>
              {freelancers.map((f) => (
                <option key={f._id} value={f._id}>{f.firstName} {f.lastName} ({f.email})</option>
              ))}
            </select>
          </div>
          <Button type="submit" className="mt-3">Create Job</Button>
        </form>
        <div className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="mb-3 text-lg font-semibold">Pending Contract Queue</h2>
          {pendingAcceptedJobs.length === 0 ? <p className="text-sm text-neutral-500">No accepted jobs pending contract.</p> : (
            <div className="space-y-2">
              {pendingAcceptedJobs.map((job) => (
                <div key={job._id} className="rounded border p-2 text-sm">
                  <p className="font-medium">{job.title}</p>
                  <p className="text-xs text-neutral-500">{job?.assignedFreelancer?.email || 'Unassigned'}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </PageShell>
  );
};

export const AdminOutsourcingContractsPage = () => {
  const { token, user, loading, error, setError, jobs, contracts, loadData } = useOutsourcingAdminData();
  const [newContract, setNewContract] = useState(initContract);
  const pendingAcceptedJobs = useMemo(
    () => jobs.filter((j) => j.acceptanceStatus === 'accepted' && !contracts.some((c) => String(c?.job?._id || c?.job) === String(j._id))),
    [jobs, contracts]
  );
  const selectedJob = useMemo(
    () => pendingAcceptedJobs.find((j) => String(j._id) === String(newContract.jobId)),
    [pendingAcceptedJobs, newContract.jobId]
  );
  const submitContract = async (e) => {
    e.preventDefault();
    try {
      const freelancerId = selectedJob?.assignedFreelancer?._id;
      if (!freelancerId) {
        setError('Selected accepted job does not have an assigned freelancer');
        return;
      }
      await outsourcingApi.createContract(token, {
        jobId: newContract.jobId,
        freelancerId,
        paymentType: newContract.paymentType,
        rate: Number(newContract.rate),
        escrowAmount: Number(newContract.escrowAmount || 0),
        terms: ''
      });
      setNewContract(initContract);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create contract');
    }
  };
  if (loading) return <main className="p-6">Loading contracts...</main>;
  return (
    <PageShell title="Outsourcing Contracts" user={user} error={error}>
      <section className="mt-6 grid grid-cols-1 gap-5">
        <form className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800" onSubmit={submitContract}>
          <h2 className="mb-1 text-lg font-semibold">Create Contract 
            
          </h2>
          <p className="mb-3 text-xs text-neutral-500">Select accepted job. Freelancer is auto-picked from that job.</p>
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
            <select className="rounded border p-2" value={newContract.jobId} onChange={(e) => setNewContract({ ...newContract, jobId: e.target.value })} required>
              <option value="">Select Accepted Job</option>
              {pendingAcceptedJobs.map((j) => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
            <input
              className="rounded border bg-neutral-100 p-2"
              readOnly
              value={selectedJob?.assignedFreelancer?.email || 'Auto from selected job'}
            />
            <select className="rounded border p-2" value={newContract.paymentType} onChange={(e) => setNewContract({ ...newContract, paymentType: e.target.value })}>
              <option value="hourly">Hourly</option><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="fixed">Fixed</option>
            </select>
            <input className="rounded border p-2" placeholder="Rate" value={newContract.rate} onChange={(e) => setNewContract({ ...newContract, rate: e.target.value })} required />
            <input className="rounded border p-2" placeholder="Escrow Amount" value={newContract.escrowAmount} onChange={(e) => setNewContract({ ...newContract, escrowAmount: e.target.value })} />
          </div>
          <Button type="submit" className="mt-3">Create Contract</Button>
        </form>
      </section>
    </PageShell>
  );
};

export const AdminOutsourcingReportsPage = () => {
  const { user, loading, error, contracts, timeLogs } = useOutsourcingAdminData();
  if (loading) return <main className="p-6">Loading reports...</main>;
  const pendingLogs = timeLogs.filter((x) => x.verificationStatus === 'pending').length;
  const approvedLogs = timeLogs.filter((x) => x.verificationStatus === 'approved').length;
  const rejectedLogs = timeLogs.filter((x) => x.verificationStatus === 'rejected').length;
  return (
    <PageShell title="Outsourcing Reports" user={user} error={error}>
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Total Contracts" value={contracts.length} icon="contract" colorScheme="orange" subtitle="TOTAL" />
        <KPICard title="Pending Logs" value={pendingLogs} icon="schedule" colorScheme="blue" subtitle="REVIEW" />
        <KPICard title="Approved Logs" value={approvedLogs} icon="check_circle" colorScheme="green" subtitle="VERIFIED" />
        <KPICard title="Rejected Logs" value={rejectedLogs} icon="cancel" colorScheme="purple" subtitle="ACTION" />
      </section>
    </PageShell>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// Admin Support Tickets
// ─────────────────────────────────────────────────────────────────────────────
export const AdminOutsourcingSupportPage = () => {
  const { token, user } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filters, setFilters] = useState({ status: '', priority: '', category: '' });
  const [replyText, setReplyText] = useState('');
  const [newStatus, setNewStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = Object.entries(filters).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join('&');
      const r = await outsourcingApi.getAllTickets(token, params);
      setTickets(r.data || []);
    } catch {}
    finally { setLoading(false); }
  }, [token, filters]);

  useEffect(() => { load(); }, [load]);

  const openTicket = (t) => { setSelected(t); setReplyText(''); setNewStatus(t.status); setMsg(''); };

  const saveTicket = async () => {
    if (!selected) return;
    setSaving(true); setMsg('');
    try {
      const payload = {};
      if (newStatus && newStatus !== selected.status) payload.status = newStatus;
      if (replyText.trim()) payload.reply = replyText.trim();
      const r = await outsourcingApi.updateTicket(token, selected._id, payload);
      setSelected(r.data);
      setReplyText('');
      setMsg('Saved!');
      setTickets((prev) => prev.map((t) => t._id === r.data._id ? r.data : t));
    } catch (e) { setMsg(e.message || 'Failed'); }
    finally { setSaving(false); }
  };

  const counts = useMemo(() => ({
    open: tickets.filter((t) => t.status === 'open').length,
    in_progress: tickets.filter((t) => t.status === 'in_progress').length,
    resolved: tickets.filter((t) => t.status === 'resolved').length,
    urgent: tickets.filter((t) => t.priority === 'urgent').length,
  }), [tickets]);

  const inpCls = 'w-full rounded-xl border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-800 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';

  return (
    <PageShell title="Support Tickets" user={user}>
      {/* KPI row */}
      <section className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Open', value: counts.open, color: 'blue' },
          { label: 'In Progress', value: counts.in_progress, color: 'orange' },
          { label: 'Resolved', value: counts.resolved, color: 'green' },
          { label: 'Urgent', value: counts.urgent, color: 'red' },
        ].map((k) => <KPICard key={k.label} title={k.label} value={k.value} icon="support_agent" colorScheme={k.color} subtitle="TICKETS" />)}
      </section>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        {[
          { label: 'All Status', key: 'status', opts: [['', 'All Status'], ['open', 'Open'], ['in_progress', 'In Progress'], ['resolved', 'Resolved'], ['closed', 'Closed']] },
          { label: 'All Priority', key: 'priority', opts: [['', 'All Priority'], ['urgent', 'Urgent'], ['high', 'High'], ['normal', 'Normal'], ['low', 'Low']] },
          { label: 'All Category', key: 'category', opts: [['', 'All Category'], ['general', 'General'], ['payment', 'Payment'], ['job', 'Job/Contract'], ['technical', 'Technical'], ['account', 'Account']] },
        ].map((f) => (
          <select key={f.key} value={filters[f.key]} onChange={(e) => setFilters((p) => ({ ...p, [f.key]: e.target.value }))}
            className="h-9 rounded-xl border border-neutral-200 bg-white px-3 text-sm text-neutral-600 focus:border-indigo-400 focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
            {f.opts.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        ))}
        <button onClick={load} className="flex h-9 items-center gap-1.5 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-600 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
          <span className="material-symbols-outlined text-[16px]">refresh</span>Refresh
        </button>
      </div>

      {/* Ticket list + detail */}
      <div className="mt-4 flex gap-4 items-start">
        {/* List */}
        <div className={`flex-1 min-w-0 space-y-2 ${selected ? 'hidden xl:block' : ''}`}>
          {loading ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-6 dark:border-neutral-800 dark:bg-neutral-950">
              {[1,2,3,4].map((i) => <div key={i} className="mb-3 h-16 animate-pulse rounded-xl bg-neutral-100 dark:bg-neutral-800" />)}
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-2xl border border-neutral-200 bg-white p-12 text-center dark:border-neutral-800 dark:bg-neutral-950">
              <span className="material-symbols-outlined text-4xl text-neutral-300">support_agent</span>
              <p className="mt-2 text-sm text-neutral-400">No tickets match your filters.</p>
            </div>
          ) : tickets.map((t) => (
            <button key={t._id} onClick={() => openTicket(t)}
              className={`w-full rounded-2xl border p-4 text-left transition hover:shadow-sm ${selected?._id === t._id ? 'border-indigo-300 bg-indigo-50 dark:border-indigo-700 dark:bg-indigo-950/20' : 'border-neutral-200 bg-white hover:border-neutral-300 dark:border-neutral-800 dark:bg-neutral-950'}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-semibold text-neutral-900 dark:text-white">{t.subject}</p>
                  <p className="mt-0.5 text-xs text-neutral-400">
                    {t?.user?.firstName} {t?.user?.lastName} · {t.category} · {new Date(t.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <Badge value={t.status} />
                  <Badge value={t.priority} />
                </div>
              </div>
              {t.replies?.length > 0 && (
                <p className="mt-1.5 text-xs text-indigo-600 dark:text-indigo-400">
                  <span className="material-symbols-outlined text-[12px] align-middle">chat</span> {t.replies.length} repl{t.replies.length === 1 ? 'y' : 'ies'}
                </p>
              )}
            </button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="w-full xl:w-120 shrink-0 rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950 flex flex-col" style={{ maxHeight: 'calc(100vh - 180px)', minHeight: 400 }}>
            {/* Header */}
            <div className="flex items-start justify-between border-b border-neutral-100 px-5 py-4 dark:border-neutral-800">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">#{String(selected._id).slice(-8).toUpperCase()}</p>
                <h3 className="mt-0.5 text-sm font-bold text-neutral-900 dark:text-white leading-snug">{selected.subject}</h3>
                <p className="mt-0.5 text-xs text-neutral-400">
                  {selected?.user?.firstName} {selected?.user?.lastName} &lt;{selected?.user?.email}&gt;
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <Badge value={selected.status} /><Badge value={selected.priority} />
                  <span className="inline-flex items-center rounded-full border border-neutral-200 px-2.5 py-0.5 text-xs font-medium capitalize text-neutral-500 dark:border-neutral-700">{selected.category}</span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="ml-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined text-[18px] text-neutral-400">close</span>
              </button>
            </div>

            {/* Thread */}
            <div className="flex-1 overflow-y-auto p-5 space-y-3">
              {/* Original */}
              <div className="rounded-xl bg-neutral-50 p-4 dark:bg-neutral-900">
                <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-neutral-400">Original Request</p>
                <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{selected.description}</p>
                <p className="mt-2 text-[10px] text-neutral-400">{new Date(selected.createdAt).toLocaleString('en-IN')}</p>
              </div>
              {/* Replies */}
              {(selected.replies || []).map((r, i) => (
                <div key={i} className={`rounded-xl p-4 ${r.isAdminReply ? 'border border-indigo-100 bg-indigo-50 dark:border-indigo-900/30 dark:bg-indigo-950/20' : 'border border-neutral-100 bg-white dark:border-neutral-800 dark:bg-neutral-900'}`}>
                  <div className="mb-1 flex items-center gap-2">
                    <span className={`text-xs font-bold ${r.isAdminReply ? 'text-indigo-700 dark:text-indigo-300' : 'text-neutral-700 dark:text-neutral-300'}`}>
                      {r.isAdminReply ? `${r.authorName} (Admin)` : 'Freelancer'}
                    </span>
                    <span className="text-[10px] text-neutral-400">{new Date(r.createdAt).toLocaleString('en-IN')}</span>
                  </div>
                  <p className="text-sm leading-relaxed text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">{r.message}</p>
                </div>
              ))}
            </div>

            {/* Reply + status controls */}
            <div className="border-t border-neutral-100 p-5 space-y-3 dark:border-neutral-800">
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-400">Change Status</label>
                <select value={newStatus} onChange={(e) => setNewStatus(e.target.value)} className={inpCls}>
                  {['open', 'in_progress', 'resolved', 'closed'].map((s) => (
                    <option key={s} value={s}>{s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-neutral-400">Reply to Freelancer</label>
                <textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="Type your reply…" className={`${inpCls} resize-none`} />
              </div>
              {msg && <p className={`text-xs font-semibold ${msg === 'Saved!' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg}</p>}
              <button onClick={saveTicket} disabled={saving || (!replyText.trim() && newStatus === selected.status)}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 disabled:opacity-50">
                {saving ? 'Saving…' : 'Send Reply & Save'}
              </button>
            </div>
          </div>
        )}
      </div>
    </PageShell>
  );
};
