import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/client';

const LAW_STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  validated: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  rejected:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const CONTRACT_STATUS_STYLES = {
  draft:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  active:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const emptyContract = {
  terms: '',
  paymentType: 'fixed',
  rate: '',
  currency: 'INR',
  escrowAmount: '',
  startDate: '',
  endDate: '',
  ndaSigned: false,
  agreementSigned: false,
  paymentTermsAccepted: false,
};

export default function LawContractsPage() {
  const { token, user } = useAuth();
  const toast = useToast();

  const [contracts, setContracts] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [form, setForm] = useState({ ...emptyContract, jobId: '', freelancerId: '' });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedContract, setSelectedContract] = useState(null);
  const canListFreelancers = ['admin', 'hr', 'manager'].includes(String(user?.role || '').toLowerCase());

  const formatPerson = (person) => (
    [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() || person?.email || 'Unknown freelancer'
  );

  const formatDate = (value) => {
    if (!value) return 'No due date';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? 'No due date' : date.toLocaleDateString('en-IN');
  };

  const normalizeRows = (res, key) => {
    const data = res?.data;
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.[key])) return data[key];
    return [];
  };

  const mergeFreelancerOptions = (sourceJobs = [], sourceContracts = [], sourceUsers = []) => {
    const byId = new Map();
    const add = (freelancer) => {
      const row = freelancer?.user || freelancer;
      const id = row?._id || freelancer?._id;
      if (!id) return;
      byId.set(String(id), row);
    };

    sourceUsers.forEach(add);
    sourceJobs.forEach((job) => add(job?.assignedFreelancer));
    sourceContracts.forEach((contract) => add(contract?.freelancer));
    return Array.from(byId.values());
  };

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [contractsRes, jobsRes, freelancersResult] = await Promise.all([
        apiClient.get('/api/outsourcing/contracts', token),
        apiClient.get('/api/outsourcing/jobs', token),
        canListFreelancers
          ? apiClient.get('/api/outsourcing/users', token).then((res) => ({ ok: true, res })).catch(() => ({ ok: false, res: null }))
          : Promise.resolve({ ok: false, res: null }),
      ]);
      const contractRows = normalizeRows(contractsRes, 'contracts');
      const jobRows = normalizeRows(jobsRes, 'jobs');
      const userRows = freelancersResult.ok ? normalizeRows(freelancersResult.res, 'freelancers') : [];
      setContracts(contractRows);
      setJobs(jobRows);
      setFreelancers(mergeFreelancerOptions(jobRows, contractRows, userRows));
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to load contracts');
    } finally {
      setLoading(false);
    }
  }, [canListFreelancers, token, toast]);

  useEffect(() => { loadData(); }, [loadData]);

  const contractedJobIds = new Set(
    contracts
      .map((contract) => contract?.job?._id || contract?.job)
      .filter(Boolean)
      .map(String)
  );

  const contractableJobs = jobs.filter((job) =>
    job?.acceptanceStatus === 'accepted' &&
    job?.assignedFreelancer &&
    !contractedJobIds.has(String(job._id))
  );

  const selectedJob = jobs.find((item) => String(item._id) === String(form.jobId));
  const selectedFreelancerId = selectedJob?.assignedFreelancer?._id || selectedJob?.assignedFreelancer || form.freelancerId;
  const selectedFreelancer =
    selectedJob?.assignedFreelancer && typeof selectedJob.assignedFreelancer === 'object'
      ? selectedJob.assignedFreelancer
      : freelancers.find((item) => String(item._id || item.user?._id) === String(selectedFreelancerId));

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.jobId) { setFormError('Select a job'); return; }
    if (!form.freelancerId) { setFormError('Select a freelancer'); return; }
    if (!form.rate || isNaN(Number(form.rate))) { setFormError('Enter a valid rate'); return; }
    if (!contractableJobs.some((job) => String(job._id) === String(form.jobId))) {
      setFormError('Select an accepted job that does not already have a contract');
      return;
    }
    setSaving(true);
    try {
      await apiClient.post('/api/outsourcing/contracts', {
        job: form.jobId,
        jobId: form.jobId,
        freelancerId: form.freelancerId,
        paymentType: form.paymentType,
        rate: Number(form.rate),
        currency: form.currency,
        escrowAmount: form.escrowAmount === '' ? undefined : Number(form.escrowAmount),
        terms: form.terms,
        ndaSigned: Boolean(form.ndaSigned),
        agreementSigned: Boolean(form.agreementSigned),
        paymentTermsAccepted: Boolean(form.paymentTermsAccepted),
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
      }, token);
      toast?.success?.('Contract created');
      setForm({ ...emptyContract, jobId: '', freelancerId: '' });
      setShowCreateForm(false);
      loadData();
    } catch (err) {
      setFormError(err?.message || 'Failed to create contract');
    } finally {
      setSaving(false);
    }
  };

  const handleValidate = async (contractId, decision) => {
    setActionLoading(contractId + decision);
    try {
      await apiClient.put(`/api/outsourcing/contracts/${contractId}/law-validate`, { approved: decision === 'validated' }, token);
      toast?.success?.(`Contract ${decision === 'validated' ? 'validated' : 'rejected'}`);
      setSelectedContract(null);
      loadData();
    } catch (err) {
      toast?.error?.(err?.message || 'Action failed');
    } finally {
      setActionLoading(null);
    }
  };

  const pending = contracts.filter(c => c.lawStatus === 'pending');
  const validated = contracts.filter(c => c.lawStatus === 'validated');
  const rejected = contracts.filter(c => c.lawStatus === 'rejected');

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setFormError('');
    setForm({ ...emptyContract, jobId: '', freelancerId: '' });
  };

  if (showCreateForm) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <div className="sticky top-0 z-20 border-b border-neutral-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95 md:px-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-xl font-bold text-neutral-950 dark:text-neutral-100">New Agreement / Contract</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400">Create from accepted outsourcing jobs in the database</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={closeCreateForm}
                className="rounded-xl border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="law-contract-create-form"
                disabled={saving || !contractableJobs.length || !form.jobId}
                className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? 'Creating...' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>

        <div className="mx-auto max-w-4xl px-4 py-8 md:px-6">
          <form
            id="law-contract-create-form"
            onSubmit={handleCreate}
            className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm dark:border-neutral-800 dark:bg-neutral-900 md:p-6"
          >
            <div className="mb-5">
              <h2 className="text-lg font-bold text-neutral-950 dark:text-neutral-100">Details</h2>
              <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Only accepted jobs without existing contracts are available.</p>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Job <span className="text-rose-600">*</span></label>
                <select
                  className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  value={form.jobId}
                  onChange={e => {
                    const jobId = e.target.value;
                    const job = jobs.find((item) => String(item._id) === String(jobId));
                    const assignedFreelancerId = job?.assignedFreelancer?._id || job?.assignedFreelancer || '';
                    setForm(f => ({
                      ...f,
                      jobId,
                      freelancerId: assignedFreelancerId ? String(assignedFreelancerId) : '',
                      rate: job?.budgetAmount ? String(job.budgetAmount) : f.rate,
                    }));
                  }}
                >
                  <option value="">Please select</option>
                  {contractableJobs.map(j => (
                    <option key={j._id} value={j._id}>
                      {j.title} - {formatPerson(j.assignedFreelancer)} - {formatDate(j.dueDate)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Freelancer <span className="text-rose-600">*</span></label>
                <select
                  className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:bg-neutral-100 disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100 dark:disabled:bg-neutral-800"
                  value={form.freelancerId}
                  onChange={e => setForm(f => ({ ...f, freelancerId: e.target.value }))}
                  disabled={Boolean(selectedJob?.assignedFreelancer)}
                >
                  <option value="">Please select</option>
                  {(selectedFreelancer ? [selectedFreelancer] : freelancers).map(fl => (
                    <option key={fl._id} value={fl.user?._id || fl._id}>{formatPerson(fl.user || fl)}</option>
                  ))}
                </select>
                <p className="mt-2 text-xs text-neutral-500 dark:text-neutral-400">Freelancer is pulled from the accepted job assignment.</p>
              </div>

              {selectedJob && (
                <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-950">
                  <div className="grid gap-3 text-sm text-neutral-700 dark:text-neutral-300 sm:grid-cols-4">
                    <div><span className="block text-xs text-neutral-500">Status</span><span className="font-semibold capitalize">{selectedJob.status}</span></div>
                    <div><span className="block text-xs text-neutral-500">Acceptance</span><span className="font-semibold capitalize">{selectedJob.acceptanceStatus}</span></div>
                    <div><span className="block text-xs text-neutral-500">Priority</span><span className="font-semibold capitalize">{selectedJob.priority || 'medium'}</span></div>
                    <div><span className="block text-xs text-neutral-500">Budget</span><span className="font-semibold">INR {Number(selectedJob.budgetAmount || 0).toLocaleString('en-IN')}</span></div>
                  </div>
                  {selectedJob.description && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{selectedJob.description}</p>}
                </div>
              )}

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Payment Type</label>
                  <select
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    value={form.paymentType}
                    onChange={e => setForm(f => ({ ...f, paymentType: e.target.value }))}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Rate <span className="text-rose-600">*</span></label>
                  <input
                    type="number"
                    min="0"
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    value={form.rate}
                    onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Currency</label>
                  <input
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    value={form.currency}
                    onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                    maxLength={3}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Escrow Amount</label>
                  <input
                    type="number"
                    min="0"
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    value={form.escrowAmount}
                    onChange={e => setForm(f => ({ ...f, escrowAmount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Start Date</label>
                  <input
                    type="date"
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    value={form.startDate}
                    onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">End Date</label>
                  <input
                    type="date"
                    className="h-12 w-full rounded-xl border border-neutral-300 bg-white px-4 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                    value={form.endDate}
                    onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-neutral-800 dark:text-neutral-200">Contract Terms</label>
                <textarea
                  rows={5}
                  className="w-full rounded-xl border border-neutral-300 bg-white px-4 py-3 text-sm text-neutral-900 outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100"
                  value={form.terms}
                  onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                  placeholder="NDA clauses, deliverables, IP rights, payment milestones..."
                />
              </div>

              <div className="space-y-3 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                {[
                  ['ndaSigned', 'NDA signed'],
                  ['agreementSigned', 'Agreement signed'],
                  ['paymentTermsAccepted', 'Payment terms accepted'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 text-sm font-medium text-neutral-800 dark:text-neutral-200">
                    <input
                      type="checkbox"
                      checked={Boolean(form[key])}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="h-5 w-5 rounded border-neutral-300 text-primary focus:ring-primary"
                    />
                    {label}
                  </label>
                ))}
                <p className="pl-8 text-xs text-neutral-500 dark:text-neutral-400">
                  All three must be checked before LAW validation can activate the contract.
                </p>
              </div>

              {formError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
                  {formError}
                </div>
              )}

              <div className="flex justify-end gap-2 border-t border-neutral-200 pt-5 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={closeCreateForm}
                  className="rounded-xl border border-neutral-300 bg-white px-5 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !contractableJobs.length || !form.jobId}
                  className="rounded-xl bg-primary px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Outsourcing Contracts</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Create agreements and validate freelancer contracts</p>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors w-fit"
        >
          <span className="material-symbols-outlined text-[18px]">add</span>
          New Contract
        </button>
      </div>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        {[
          { label: 'Pending Review', value: pending.length,   color: 'text-amber-600 dark:text-amber-400',  icon: 'pending' },
          { label: 'Validated',      value: validated.length, color: 'text-green-600 dark:text-green-400',  icon: 'verified' },
          { label: 'Rejected',       value: rejected.length,  color: 'text-rose-600 dark:text-rose-400',    icon: 'cancel' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined text-[18px] ${s.color}`}>{s.icon}</span>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Create Contract Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">New Agreement / Contract</h2>
              <button onClick={() => { setShowCreateForm(false); setFormError(''); }}
                className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleCreate} className="space-y-4">
              {contractableJobs.length === 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
                  No accepted jobs without contracts are available. Contracts can only be created after a freelancer accepts an assigned job.
                </div>
              )}
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Job *</label>
                <select
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.jobId} onChange={e => {
                    const jobId = e.target.value;
                    const job = jobs.find((item) => String(item._id) === String(jobId));
                    const assignedFreelancerId = job?.assignedFreelancer?._id || job?.assignedFreelancer || '';
                    setForm(f => ({
                      ...f,
                      jobId,
                      freelancerId: assignedFreelancerId ? String(assignedFreelancerId) : '',
                      rate: job?.budgetAmount ? String(job.budgetAmount) : f.rate,
                    }));
                  }}
                >
                  <option value="">Select job...</option>
                  {contractableJobs.map(j => (
                    <option key={j._id} value={j._id}>
                      {j.title} - {formatPerson(j.assignedFreelancer)} - {formatDate(j.dueDate)}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Freelancer *</label>
                <select
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none disabled:cursor-not-allowed disabled:text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.freelancerId} onChange={e => setForm(f => ({ ...f, freelancerId: e.target.value }))}
                  disabled={Boolean(selectedJob?.assignedFreelancer)}
                >
                  <option value="">Select freelancer...</option>
                  {(selectedFreelancer ? [selectedFreelancer] : freelancers).map(fl => (
                    <option key={fl._id} value={fl.user?._id || fl._id}>
                      {formatPerson(fl.user || fl)}
                    </option>
                  ))}
                </select>
                {selectedJob?.assignedFreelancer && (
                  <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">
                    Pulled from the accepted job assignment in the database.
                  </p>
                )}
              </div>
              {selectedJob && (
                <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs text-neutral-600 dark:border-neutral-700 dark:bg-neutral-800/70 dark:text-neutral-300">
                  <div className="grid grid-cols-2 gap-2">
                    <div><span className="font-semibold">Status:</span> {selectedJob.status}</div>
                    <div><span className="font-semibold">Accepted:</span> {selectedJob.acceptanceStatus}</div>
                    <div><span className="font-semibold">Priority:</span> {selectedJob.priority || 'medium'}</div>
                    <div><span className="font-semibold">Budget:</span> ₹{Number(selectedJob.budgetAmount || 0).toLocaleString('en-IN')}</div>
                  </div>
                  {selectedJob.description && <p className="mt-2 line-clamp-2">{selectedJob.description}</p>}
                </div>
              )}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Payment Type</label>
                  <select
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.paymentType} onChange={e => setForm(f => ({ ...f, paymentType: e.target.value }))}
                  >
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Hourly</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Rate (₹) *</label>
                  <input
                    type="number" min="0"
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.rate} onChange={e => setForm(f => ({ ...f, rate: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Currency</label>
                  <input
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.currency} onChange={e => setForm(f => ({ ...f, currency: e.target.value.toUpperCase() }))}
                    maxLength={3}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Escrow Amount</label>
                  <input
                    type="number" min="0"
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.escrowAmount} onChange={e => setForm(f => ({ ...f, escrowAmount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Start Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.startDate} onChange={e => setForm(f => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">End Date</label>
                  <input
                    type="date"
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.endDate} onChange={e => setForm(f => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Contract Terms</label>
                <textarea
                  rows={4}
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.terms} onChange={e => setForm(f => ({ ...f, terms: e.target.value }))}
                  placeholder="NDA clauses, deliverables, IP rights, payment milestones..."
                />
              </div>
              <div className="grid gap-2 rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-700 dark:bg-neutral-800/70">
                {[
                  ['ndaSigned', 'NDA signed'],
                  ['agreementSigned', 'Agreement signed'],
                  ['paymentTermsAccepted', 'Payment terms accepted'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 text-xs font-medium text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={Boolean(form[key])}
                      onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.checked }))}
                      className="h-4 w-4 rounded border-neutral-300 text-primary focus:ring-primary"
                    />
                    {label}
                  </label>
                ))}
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400">
                  All three must be checked before LAW validation can activate the contract.
                </p>
              </div>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowCreateForm(false); setFormError(''); }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving || !contractableJobs.length || !form.jobId}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Contract'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Contract detail / validation modal */}
      {selectedContract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900 max-h-[90vh] overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Contract Review</h2>
              <button onClick={() => setSelectedContract(null)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Job</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{selectedContract.job?.title || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Freelancer</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedContract.freelancer?.firstName} {selectedContract.freelancer?.lastName}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Payment</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedContract.paymentType} - {selectedContract.currency || 'INR'} {selectedContract.rate?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-500 dark:text-neutral-400">Period</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedContract.startDate ? new Date(selectedContract.startDate).toLocaleDateString('en-IN') : '—'} →{' '}
                  {selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString('en-IN') : '—'}
                </span>
              </div>
              {selectedContract.terms && (
                <div>
                  <p className="text-neutral-500 dark:text-neutral-400 mb-1">Terms</p>
                  <p className="rounded-lg bg-neutral-50 dark:bg-neutral-800 p-3 text-xs text-neutral-700 dark:text-neutral-300 whitespace-pre-wrap">
                    {selectedContract.terms}
                  </p>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-neutral-500 dark:text-neutral-400">Law Status</span>
                <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LAW_STATUS_STYLES[selectedContract.lawStatus]}`}>
                  {selectedContract.lawStatus}
                </span>
              </div>
            </div>
            {selectedContract.lawStatus === 'pending' && (
              <div className="mt-6 flex gap-3">
                <button
                  onClick={() => handleValidate(selectedContract._id, 'validated')}
                  disabled={!!actionLoading}
                  className="flex-1 rounded-lg bg-green-600 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-60 transition-colors"
                >
                  {actionLoading === selectedContract._id + 'validated' ? 'Validating...' : 'Validate & Approve'}
                </button>
                <button
                  onClick={() => handleValidate(selectedContract._id, 'rejected')}
                  disabled={!!actionLoading}
                  className="flex-1 rounded-lg bg-rose-600 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-60 transition-colors"
                >
                  {actionLoading === selectedContract._id + 'rejected' ? 'Rejecting...' : 'Reject'}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Contract list */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      ) : contracts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-20 dark:border-neutral-800 dark:bg-neutral-900 text-neutral-400">
          <span className="material-symbols-outlined text-4xl mb-2">contract</span>
          <p className="text-sm">No contracts yet. Create the first one.</p>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">All Contracts</h2>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {contracts.map(c => (
              <div
                key={c._id}
                className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                onClick={() => setSelectedContract(c)}
              >
                <div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{c.job?.title || 'Untitled Job'}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                    {c.freelancer?.firstName} {c.freelancer?.lastName} - {c.paymentType} {c.currency || 'INR'} {c.rate?.toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONTRACT_STATUS_STYLES[c.status] || CONTRACT_STATUS_STYLES.draft}`}>
                    {c.status}
                  </span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LAW_STATUS_STYLES[c.lawStatus] || LAW_STATUS_STYLES.pending}`}>
                    {c.lawStatus === 'pending' ? 'Review Needed' : c.lawStatus}
                  </span>
                  <span className="material-symbols-outlined text-[18px] text-neutral-400">chevron_right</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
