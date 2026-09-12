import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import { apiClient } from '../../services/client';
import { getContractLawStatusLabel } from './lawStatus';
import { PortalHeader, StatusBadge, KPICard } from '../common';
import { Card, Modal, Input, Select, EmptyState, TableSkeleton } from '../ui';
import Button from '../common/Button';

const LAW_STATUS_TONE = { pending: 'warning', validated: 'success', rejected: 'danger' };
const CONTRACT_STATUS_TONE = { draft: 'neutral', active: 'info', completed: 'success', cancelled: 'danger' };

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

const PAYMENT_TYPE_OPTIONS = [
  { value: 'fixed', label: 'Fixed' },
  { value: 'hourly', label: 'Hourly' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
];

export default function LawContractsPage() {
  const { token, user } = useAuth();
  const toast = useToast();
  const { confirm } = useConfirmDialog();

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
  const [reviewReason, setReviewReason] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const canListFreelancers = ['admin', 'hr', 'manager'].includes(String(user?.role || '').toLowerCase());

  const formatPerson = (person) => (
    [person?.firstName, person?.lastName].filter(Boolean).join(' ').trim() || person?.email || 'Freelancer not assigned'
  );

  const getInitials = (person) => {
    const name = formatPerson(person);
    const parts = name.split(' ').filter(Boolean);
    if (!parts.length) return '?';
    return parts.length === 1 ? parts[0].slice(0, 2).toUpperCase() : (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

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
    const reason = reviewReason.trim();
    if (decision === 'rejected' && !reason) {
      toast?.error?.('Rejection reason is required');
      return;
    }
    if (decision === 'rejected') {
      const confirmed = await confirm({
        title: 'Reject this contract?',
        message: 'The freelancer and hiring manager will be notified with your rejection reason.',
        confirmLabel: 'Reject',
        cancelLabel: 'Cancel',
        tone: 'danger',
      });
      if (!confirmed) return;
    }
    setActionLoading(contractId + decision);
    try {
      await apiClient.put(`/api/outsourcing/contracts/${contractId}/law-validate`, {
        approved: decision === 'validated',
        reason: decision === 'rejected' ? reason : undefined,
      }, token);
      toast?.success?.(`Contract ${decision === 'validated' ? 'validated' : 'rejected'}`);
      setSelectedContract(null);
      setReviewReason('');
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

  const statCards = [
    { id: 'pending', label: 'Pending Review', value: pending.length, icon: 'pending_actions', tone: 'warning' },
    { id: 'validated', label: 'Validated', value: validated.length, icon: 'verified', tone: 'success' },
    { id: 'rejected', label: 'Rejected', value: rejected.length, icon: 'cancel', tone: 'danger' },
  ];

  const visibleContracts = contracts.filter((c) => {
    if (statusFilter !== 'all' && c.lawStatus !== statusFilter) return false;
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    return (
      (c.job?.title || '').toLowerCase().includes(q) ||
      formatPerson(c.freelancer).toLowerCase().includes(q)
    );
  });

  const closeCreateForm = () => {
    setShowCreateForm(false);
    setFormError('');
    setForm({ ...emptyContract, jobId: '', freelancerId: '' });
  };

  const openContract = (contract) => {
    setReviewReason(contract?.lawRejectionReason || '');
    setSelectedContract(contract);
  };

  const jobOptions = [
    { value: '', label: contractableJobs.length ? 'Select job…' : 'No eligible jobs available' },
    ...contractableJobs.map((j) => ({ value: j._id, label: `${j.title} – ${formatPerson(j.assignedFreelancer)} – ${formatDate(j.dueDate)}` })),
  ];
  const freelancerOptions = [
    { value: '', label: 'Select freelancer…' },
    ...(selectedFreelancer ? [selectedFreelancer] : freelancers).map((fl) => ({ value: fl.user?._id || fl._id, label: formatPerson(fl.user || fl) })),
  ];

  return (
    <div className="portal-page-inner space-y-4">
      <PortalHeader
        title="Outsourcing Contracts"
        subtitle="Create agreements and validate freelancer contracts"
        icon="handshake"
        primaryAction={{ label: 'New Contract', icon: 'add', onClick: () => setShowCreateForm(true) }}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {statCards.map((s) => (
          <KPICard
            key={s.id}
            variant="minimal"
            title={s.label}
            value={s.value}
            icon={s.icon}
            tone={s.tone}
            active={statusFilter === s.id}
            onClick={() => setStatusFilter(statusFilter === s.id ? 'all' : s.id)}
          />
        ))}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          {[{ id: 'all', label: 'All', count: contracts.length }, ...statCards.map((s) => ({ id: s.id, label: s.label, count: s.value }))].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                statusFilter === tab.id
                  ? 'bg-[var(--portal-accent)] text-white shadow-sm'
                  : 'border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-300 dark:hover:bg-neutral-800'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] ${statusFilter === tab.id ? 'bg-white/20' : 'bg-neutral-100 dark:bg-neutral-800'}`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>
        <div className="relative w-full sm:w-64">
          <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[18px] text-neutral-400">search</span>
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search job or freelancer…"
            className="pl-9"
          />
        </div>
      </div>

      <Modal
        open={showCreateForm}
        onClose={closeCreateForm}
        title="New Agreement / Contract"
        description="Only accepted jobs without existing contracts are available."
        footer={
          <div className="flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={closeCreateForm} disabled={saving}>Cancel</Button>
            <Button type="submit" form="law-contract-create-form" variant="accent" disabled={saving || !contractableJobs.length || !form.jobId}>
              {saving ? 'Creating…' : 'Create Contract'}
            </Button>
          </div>
        }
      >
        <form id="law-contract-create-form" onSubmit={handleCreate} className="space-y-5">
          {contractableJobs.length === 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900/50 dark:bg-amber-900/20 dark:text-amber-200">
              No accepted jobs without contracts are available. Contracts can only be created after a freelancer accepts an assigned job.
            </div>
          )}

          <Select
            label={<>Job <span className="text-rose-500">*</span></>}
            value={form.jobId}
            onChange={(e) => {
              const jobId = e.target.value;
              const job = jobs.find((item) => String(item._id) === String(jobId));
              const assignedFreelancerId = job?.assignedFreelancer?._id || job?.assignedFreelancer || '';
              setForm((f) => ({
                ...f,
                jobId,
                freelancerId: assignedFreelancerId ? String(assignedFreelancerId) : '',
                rate: job?.budgetAmount ? String(job.budgetAmount) : f.rate,
              }));
            }}
            options={jobOptions}
          />

          <div>
            <Select
              label={<>Freelancer <span className="text-rose-500">*</span></>}
              value={form.freelancerId}
              onChange={(e) => setForm((f) => ({ ...f, freelancerId: e.target.value }))}
              options={freelancerOptions}
              disabled={Boolean(selectedJob?.assignedFreelancer)}
            />
            <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-400">Freelancer is pulled from the accepted job assignment.</p>
          </div>

          {selectedJob && (
            <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="grid gap-3 text-sm text-neutral-700 dark:text-neutral-300 sm:grid-cols-4">
                <div><span className="block text-xs text-neutral-500">Status</span><span className="font-semibold capitalize">{selectedJob.status}</span></div>
                <div><span className="block text-xs text-neutral-500">Acceptance</span><span className="font-semibold capitalize">{selectedJob.acceptanceStatus}</span></div>
                <div><span className="block text-xs text-neutral-500">Priority</span><span className="font-semibold capitalize">{selectedJob.priority || 'medium'}</span></div>
                <div><span className="block text-xs text-neutral-500">Budget</span><span className="font-semibold">INR {Number(selectedJob.budgetAmount || 0).toLocaleString('en-IN')}</span></div>
              </div>
              {selectedJob.description && <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{selectedJob.description}</p>}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Select label="Payment Type" value={form.paymentType} onChange={(e) => setForm((f) => ({ ...f, paymentType: e.target.value }))} options={PAYMENT_TYPE_OPTIONS} />
            <Input type="number" min="0" label={<>Rate <span className="text-rose-500">*</span></>} value={form.rate} onChange={(e) => setForm((f) => ({ ...f, rate: e.target.value }))} placeholder="0" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input label="Currency" value={form.currency} onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value.toUpperCase() }))} maxLength={3} />
            <Input type="number" min="0" label="Escrow Amount" value={form.escrowAmount} onChange={(e) => setForm((f) => ({ ...f, escrowAmount: e.target.value }))} placeholder="0" />
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input type="date" label="Start Date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
            <Input type="date" label="End Date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
          </div>

          <label className="block">
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Contract Terms</span>
            <textarea
              rows={4}
              value={form.terms}
              onChange={(e) => setForm((f) => ({ ...f, terms: e.target.value }))}
              placeholder="NDA clauses, deliverables, IP rights, payment milestones..."
              className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
            />
          </label>

          <div className="space-y-3 border-t border-neutral-100 pt-4 dark:border-neutral-800">
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
                  className="h-4 w-4 rounded border-neutral-300 accent-[var(--portal-accent)]"
                />
                {label}
              </label>
            ))}
            <p className="pl-7 text-xs text-neutral-500 dark:text-neutral-400">
              All three must be checked before LAW validation can activate the contract.
            </p>
          </div>

          {formError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/20 dark:text-rose-200">
              {formError}
            </div>
          )}
        </form>
      </Modal>

      <Modal
        open={Boolean(selectedContract)}
        onClose={() => { setSelectedContract(null); setReviewReason(''); }}
        title="Contract Review"
        footer={selectedContract?.lawStatus === 'pending' ? (
          <div className="flex gap-3">
            <Button
              variant="success"
              className="flex-1"
              onClick={() => handleValidate(selectedContract._id, 'validated')}
              disabled={!!actionLoading}
            >
              {actionLoading === selectedContract?._id + 'validated' ? 'Validating…' : 'Validate & Approve'}
            </Button>
            <Button
              variant="danger"
              className="flex-1"
              onClick={() => handleValidate(selectedContract._id, 'rejected')}
              disabled={!!actionLoading}
            >
              {actionLoading === selectedContract?._id + 'rejected' ? 'Rejecting…' : 'Reject'}
            </Button>
          </div>
        ) : undefined}
      >
        {selectedContract && (
          <div className="space-y-4">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500 dark:text-neutral-400">Job</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{selectedContract.job?.title || '—'}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500 dark:text-neutral-400">Freelancer / Counterparty</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">{formatPerson(selectedContract.freelancer)}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500 dark:text-neutral-400">Payment</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedContract.paymentType} - {selectedContract.currency || 'INR'} {selectedContract.rate?.toLocaleString('en-IN')}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-neutral-500 dark:text-neutral-400">Period</span>
                <span className="font-medium text-neutral-900 dark:text-neutral-100">
                  {selectedContract.startDate ? new Date(selectedContract.startDate).toLocaleDateString('en-IN') : '—'} →{' '}
                  {selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString('en-IN') : '—'}
                </span>
              </div>
              {selectedContract.terms && (
                <div>
                  <p className="mb-1 text-neutral-500 dark:text-neutral-400">Terms</p>
                  <p className="whitespace-pre-wrap rounded-lg bg-neutral-50 p-3 text-xs text-neutral-700 dark:bg-neutral-800 dark:text-neutral-300">
                    {selectedContract.terms}
                  </p>
                </div>
              )}
              <div className="flex items-center justify-between gap-3">
                <span className="text-neutral-500 dark:text-neutral-400">Law Status</span>
                <StatusBadge tone={LAW_STATUS_TONE[selectedContract.lawStatus] || 'warning'} label={getContractLawStatusLabel(selectedContract.lawStatus)} />
              </div>
              {selectedContract.lawRejectionReason && (
                <div>
                  <p className="mb-1 text-neutral-500 dark:text-neutral-400">Last rejection reason</p>
                  <p className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 dark:bg-rose-900/20 dark:text-rose-200">
                    {selectedContract.lawRejectionReason}
                  </p>
                </div>
              )}
            </div>
            {selectedContract.lawStatus === 'pending' && (
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
                  Rejection reason
                </span>
                <textarea
                  rows={3}
                  value={reviewReason}
                  onChange={(event) => setReviewReason(event.target.value)}
                  placeholder="Required when rejecting this contract"
                  className="w-full resize-none rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                />
              </label>
            )}
          </div>
        )}
      </Modal>

      {loading ? (
        <TableSkeleton columns={4} rows={5} />
      ) : contracts.length === 0 ? (
        <EmptyState
          icon="contract"
          title="No contracts yet"
          description="Create an agreement from an accepted outsourcing job."
          actionLabel="New Contract"
          onAction={() => setShowCreateForm(true)}
        />
      ) : visibleContracts.length === 0 ? (
        <EmptyState
          icon="search_off"
          title="No contracts match your filters"
          actionLabel="Clear filters"
          onAction={() => { setSearchQuery(''); setStatusFilter('all'); }}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
            <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">All Contracts</h2>
            <span className="text-xs text-neutral-400">{visibleContracts.length} of {contracts.length}</span>
          </div>
          <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {visibleContracts.map(c => (
              <div
                key={c._id}
                className="group flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                onClick={() => openContract(c)}
              >
                <div className="flex min-w-0 items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--portal-accent-soft)] text-xs font-bold text-[var(--portal-accent)]">
                    {getInitials(c.freelancer)}
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-neutral-900 dark:text-neutral-100">{c.job?.title || 'Untitled Job'}</p>
                    <p className="mt-0.5 truncate text-xs text-neutral-500 dark:text-neutral-400">
                      {formatPerson(c.freelancer)} <span className="mx-1 text-neutral-300 dark:text-neutral-600">•</span>
                      <span className="capitalize">{c.paymentType}</span> · {c.currency || 'INR'} {Number(c.rate || 0).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="hidden sm:inline-flex">
                    <StatusBadge tone={CONTRACT_STATUS_TONE[c.status] || 'neutral'} label={c.status} />
                  </span>
                  <StatusBadge tone={LAW_STATUS_TONE[c.lawStatus] || 'warning'} label={getContractLawStatusLabel(c.lawStatus)} />
                  <span className="material-symbols-outlined text-[18px] text-neutral-300 transition-transform group-hover:translate-x-0.5 group-hover:text-neutral-500 dark:text-neutral-600">chevron_right</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
