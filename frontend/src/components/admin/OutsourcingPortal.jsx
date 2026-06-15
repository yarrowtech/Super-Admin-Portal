import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';
import { outsourcingApi } from '../../services/outsourcing';

const initUser = { email: '', password: '', firstName: '', lastName: '', outsourcingType: 'freelancer' };
const initJob = { title: '', description: '', assignedFreelancerId: '' };
const initContract = { jobId: '', freelancerId: '', paymentType: 'hourly', rate: '', escrowAmount: '', terms: '' };

const OutsourcingPortal = () => {
  const { token, user } = useAuth();
  const [dashboard, setDashboard] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [newUser, setNewUser] = useState(initUser);
  const [newJob, setNewJob] = useState(initJob);
  const [newContract, setNewContract] = useState(initContract);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const acceptedJobs = jobs.filter((j) => j.acceptanceStatus === 'accepted');
  const pendingAcceptedJobs = acceptedJobs.filter((j) => !contracts.some((c) => String(c?.job?._id || c?.job) === String(j._id)));

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

  const submitUser = async (e) => {
    e.preventDefault();
    try {
      await outsourcingApi.createUser(token, newUser);
      setNewUser(initUser);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create user');
    }
  };

  const submitJob = async (e) => {
    e.preventDefault();
    try {
      await outsourcingApi.createJob(token, newJob);
      setNewJob(initJob);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create job');
    }
  };

  const submitContract = async (e) => {
    e.preventDefault();
    try {
      await outsourcingApi.createContract(token, {
        ...newContract,
        rate: Number(newContract.rate),
        escrowAmount: Number(newContract.escrowAmount || 0)
      });
      setNewContract(initContract);
      await loadData();
    } catch (err) {
      setError(err.message || 'Failed to create contract');
    }
  };

  if (loading) return <main className="p-6">Loading outsourcing portal...</main>;

  return (
    <main className="portal-page p-5 dark:bg-neutral-900 md:p-6">
      <div className="mx-auto max-w-7xl">
        <PortalHeader title="Outsourcing Admin" user={user} icon="work" />
        {error ? <p className="mt-3 rounded border border-red-300 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}

        <section className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <KPICard title="Freelancers" value={dashboard?.users?.freelancers || dashboard?.users?.workers || 0} icon="person" colorScheme="blue" subtitle="ACTIVE" />
          <KPICard title="Jobs" value={jobs.length} icon="work" colorScheme="green" subtitle="TOTAL" />
          <KPICard title="Contracts" value={dashboard?.contracts?.total || 0} icon="contract" colorScheme="orange" subtitle="TOTAL" />
          <KPICard title="Escrow Funded" value={dashboard?.payments?.totalEscrowFunded || 0} icon="payments" colorScheme="purple" subtitle="INR" />
          <KPICard title="Active Sessions" value={dashboard?.sessions?.active || 0} icon="play_arrow" colorScheme="green" subtitle="LIVE" />
          <KPICard title="Validated Agreements" value={dashboard?.agreements?.validated || 0} icon="verified_user" colorScheme="blue" subtitle="LEGAL" />
          <KPICard title="Overdue Tasks" value={dashboard?.operations?.overdueTasks || 0} icon="warning" colorScheme="orange" subtitle="RISK" />
          <KPICard title="Paused Sessions" value={dashboard?.sessions?.paused || 0} icon="pause" colorScheme="purple" subtitle="HOLD" />
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <form className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800" onSubmit={submitUser}>
            <h2 className="mb-1 text-lg font-semibold">1. Create Freelancer</h2>
            <p className="mb-3 text-xs text-neutral-500">Create freelancer account for outsourcing workspace access.</p>
            <div className="grid grid-cols-2 gap-2">
              <input className="rounded border p-2" placeholder="First name" value={newUser.firstName} onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })} />
              <input className="rounded border p-2" placeholder="Last name" value={newUser.lastName} onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })} />
              <input className="col-span-2 rounded border p-2" placeholder="Email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
              <input type="password" className="col-span-2 rounded border p-2" placeholder="Password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
              <input className="col-span-2 rounded border p-2 bg-neutral-100" value="Freelancer" readOnly />
            </div>
            <Button type="submit" className="mt-3">Create User</Button>
          </form>

          <form className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800" onSubmit={submitJob}>
            <h2 className="mb-1 text-lg font-semibold">2. Create Job</h2>
            <p className="mb-3 text-xs text-neutral-500">Create job with description and assign target freelancer.</p>
            <div className="grid grid-cols-1 gap-2">
              <input className="rounded border p-2" placeholder="Job title" value={newJob.title} onChange={(e) => setNewJob({ ...newJob, title: e.target.value })} />
              <textarea className="rounded border p-2" placeholder="Description" value={newJob.description} onChange={(e) => setNewJob({ ...newJob, description: e.target.value })} />
              <select className="rounded border p-2" value={newJob.assignedFreelancerId} onChange={(e) => setNewJob({ ...newJob, assignedFreelancerId: e.target.value })}>
                <option value="">Select Freelancer</option>
                {freelancers.map((f) => (
                  <option key={f._id} value={f._id}>{f.firstName} {f.lastName} ({f.email})</option>
                ))}
              </select>
            </div>
            <Button type="submit" className="mt-3">Create Job</Button>
          </form>
        </section>

        <section className="mt-6">
          <form className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800" onSubmit={submitContract}>
            <h2 className="mb-1 text-lg font-semibold">3. Create Contract</h2>
            <p className="mb-3 text-xs text-neutral-500">Create contract only after freelancer accepts the job.</p>
            <div className="grid grid-cols-1 gap-2 lg:grid-cols-3">
              <select className="rounded border p-2" value={newContract.jobId} onChange={(e) => setNewContract({ ...newContract, jobId: e.target.value })} required>
                <option value="">Select Accepted Job</option>
                {pendingAcceptedJobs.map((j) => (
                  <option key={j._id} value={j._id}>{j.title}</option>
                ))}
              </select>
              <select className="rounded border p-2" value={newContract.freelancerId} onChange={(e) => setNewContract({ ...newContract, freelancerId: e.target.value })} required>
                <option value="">Select Freelancer</option>
                {freelancers.map((f) => (
                  <option key={f._id} value={f._id}>{f.firstName} {f.lastName} ({f.email})</option>
                ))}
              </select>
              <select className="rounded border p-2" value={newContract.paymentType} onChange={(e) => setNewContract({ ...newContract, paymentType: e.target.value })}>
                <option value="hourly">Hourly</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="fixed">Fixed</option>
              </select>
              <input className="rounded border p-2" placeholder="Rate" value={newContract.rate} onChange={(e) => setNewContract({ ...newContract, rate: e.target.value })} required />
              <input className="rounded border p-2" placeholder="Escrow Amount" value={newContract.escrowAmount} onChange={(e) => setNewContract({ ...newContract, escrowAmount: e.target.value })} />
              <input className="rounded border p-2 lg:col-span-3" placeholder="Terms" value={newContract.terms} onChange={(e) => setNewContract({ ...newContract, terms: e.target.value })} />
            </div>
            <Button type="submit" className="mt-3">Create Contract</Button>
          </form>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="mb-3 text-lg font-semibold">Pending Contract Queue</h2>
            {pendingAcceptedJobs.length === 0 ? (
              <p className="text-sm text-neutral-500">No accepted jobs pending contract.</p>
            ) : (
              <div className="space-y-2">
                {pendingAcceptedJobs.slice(0, 8).map((job) => (
                  <div key={job._id} className="rounded border p-2 text-sm">
                    <p className="font-medium">{job.title}</p>
                    <p className="text-xs text-neutral-500">{job?.assignedFreelancer?.email || 'Unassigned'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="mb-3 text-lg font-semibold">Recent Contracts</h2>
            {contracts.length === 0 ? (
              <p className="text-sm text-neutral-500">No contracts created yet.</p>
            ) : (
              <div className="space-y-2">
                {contracts.slice(0, 8).map((c) => (
                  <div key={c._id} className="rounded border p-2 text-sm">
                    <p className="font-medium">{c?.job?.title || 'Untitled Job'}</p>
                    <p className="text-xs text-neutral-500">{c?.freelancer?.email || '-'} • {c.paymentType} • {c.rate} {c.currency}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <section className="mt-6 rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
          <h2 className="mb-3 text-lg font-semibold">Recent Jobs</h2>
          <div className="space-y-2">
            {jobs.slice(0, 10).map((job) => (
              <div key={job._id} className="flex items-center justify-between rounded border p-2 text-sm">
                <span>{job.title} ({job?.assignedFreelancer?.email || 'Unassigned'})</span>
                <span className="font-medium">{job.status} / {job.acceptanceStatus || 'pending'}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="mb-3 text-lg font-semibold">Contracts</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Total records: {contracts.length}</p>
          </div>
          <div className="rounded-lg border bg-white p-4 dark:border-neutral-700 dark:bg-neutral-800">
            <h2 className="mb-3 text-lg font-semibold">Time Logs</h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-300">Pending verification: {timeLogs.filter((x) => x.verificationStatus === 'pending').length}</p>
          </div>
        </section>
      </div>
    </main>
  );
};

export default OutsourcingPortal;
