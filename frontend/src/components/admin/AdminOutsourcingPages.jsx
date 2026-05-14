import React, { useEffect, useMemo, useState } from 'react';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';

const initUser = {
  email: '',
  password: '',
  firstName: '',
  lastName: '',
  phone: '',
  role: 'employee',
  department: 'Outsourcing',
  outsourcingType: 'freelancer'
};
const initJob = { title: '', description: '', assignedFreelancerId: '' };
const initContract = { jobId: '', paymentType: 'hourly', rate: '', escrowAmount: '' };

const useOutsourcingAdminData = () => {
  const { token, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dashboard, setDashboard] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [freelancers, setFreelancers] = useState([]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError('');
      const [d, j, c, t, f] = await Promise.all([
        outsourcingApi.getDashboard(token),
        outsourcingApi.getJobs(token),
        outsourcingApi.getContracts(token),
        outsourcingApi.getTimeLogs(token),
        outsourcingApi.getUsers(token)
      ]);
      setDashboard(d.data);
      setJobs(j.data || []);
      setContracts(c.data || []);
      setTimeLogs(t.data || []);
      setFreelancers(f.data || []);
    } catch (err) {
      setError(err.message || 'Failed to load outsourcing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) loadData();
  }, [token]);

  return { token, user, loading, error, setError, dashboard, jobs, contracts, timeLogs, freelancers, loadData };
};

const PageShell = ({ title, children, user, error }) => (
  <main className="flex-1 overflow-y-auto bg-neutral-50 p-5 dark:bg-neutral-900 md:p-6">
    <div className="mx-auto max-w-7xl">
      <PortalHeader title={title} user={user} icon="work" />
      {error ? <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {children}
    </div>
  </main>
);

export const AdminOutsourcingDashboardPage = () => {
  const { user, loading, error, dashboard, jobs, contracts, timeLogs } = useOutsourcingAdminData();
  const [query, setQuery] = useState('');
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

  if (loading) return <main className="p-6">Loading outsourcing admin...</main>;
  return (
    <PageShell title="Outsourcing Admin Dashboard" user={user} error={error}>
      <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Freelancers" value={dashboard?.users?.freelancers || 0} icon="person" colorScheme="blue" subtitle="ACTIVE" />
        <KPICard title="Jobs" value={jobs.length} icon="work" colorScheme="green" subtitle="TOTAL" />
        <KPICard title="Contracts" value={contracts.length} icon="contract" colorScheme="orange" subtitle="TOTAL" />
        <KPICard title="Pending Logs" value={timeLogs.filter((x) => x.verificationStatus === 'pending').length} icon="schedule" colorScheme="purple" subtitle="REVIEW" />
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
          </select>
          <select className="rounded border p-2 text-sm" value={acceptance} onChange={(e) => setAcceptance(e.target.value)}>
            <option value="all">All Acceptance</option>
            <option value="pending">Pending</option>
            <option value="accepted">Accepted</option>
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
                <option value="employee">Employee</option>
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
  const { token, user, loading, error, setError, jobs, freelancers, contracts, loadData } = useOutsourcingAdminData();
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
