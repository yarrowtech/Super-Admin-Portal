import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/client';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Tabs from '../common/Tabs';
import StatusBadge from '../common/StatusBadge';
import Modal from '../ui/Modal';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import EmptyState from '../ui/EmptyState';

const STATUS_TONE = {
  pending: 'neutral',
  accepted: 'info',
  in_progress: 'warning',
  completed: 'success',
  cancelled: 'danger',
};

const PRIORITY_TONE = {
  low: 'neutral',
  medium: 'info',
  high: 'danger',
};

const CONTRACT_STATUS_TONE = {
  pending: 'warning',
  validated: 'success',
  rejected: 'danger',
};

const TIME_LOG_TONE = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
};

const OUTSOURCING_TABS = [
  { key: 'assign', label: 'Assign Work', icon: 'assignment_add' },
  { key: 'progress', label: 'Track Progress', icon: 'timeline' },
];

const priorityOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
];

const emptyJob = { title: '', description: '', priority: 'medium', dueDate: '', budgetAmount: '', assignedFreelancer: '' };

export default function HROutsourcingPage() {
  const { user, token } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState('assign');
  const [jobs, setJobs] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyJob);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const safeFetch = useCallback(async (url, options) => {
    try {
      const res = await apiClient.get(url, token, options);
      return res;
    } catch (err) {
      if (err?.status === 403 || err?.message?.toLowerCase().includes('access denied') || err?.message?.toLowerCase().includes('forbidden')) {
        return null;
      }
      throw err;
    }
  }, [token]);

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [jobsRes, freelancersRes, logsRes] = await Promise.all([
        safeFetch('/api/outsourcing/jobs'),
        safeFetch('/api/outsourcing/users', { forceRefresh: true }),
        safeFetch('/api/outsourcing/time-logs'),
      ]);
      setJobs(jobsRes?.data?.jobs || jobsRes?.data || []);
      setFreelancers(freelancersRes?.data?.freelancers || freelancersRes?.data || []);
      setTimeLogs(logsRes?.data?.logs || logsRes?.data || []);
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to load outsourcing data');
    } finally {
      setLoading(false);
    }
  }, [token, toast, safeFetch]);

  useEffect(() => { loadData(); }, [loadData]);

  const closeForm = () => { setShowForm(false); setFormError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.title.trim()) { setFormError('Title is required'); return; }
    if (!form.description.trim()) { setFormError('Description is required'); return; }
    if (!form.dueDate) { setFormError('Due date is required'); return; }
    setSaving(true);
    try {
      await apiClient.post('/api/outsourcing/jobs', {
        title: form.title,
        description: form.description,
        priority: form.priority,
        dueDate: form.dueDate,
        budgetAmount: Number(form.budgetAmount) || 0,
        assignedFreelancerId: form.assignedFreelancer || undefined,
      }, token);
      toast?.success?.('Job created successfully');
      setForm(emptyJob);
      setShowForm(false);
      loadData();
    } catch (err) {
      setFormError(err?.message || 'Failed to create job');
    } finally {
      setSaving(false);
    }
  };

  const handleAssign = async (jobId, freelancerId) => {
    if (!freelancerId) return;
    try {
      await apiClient.put(`/api/outsourcing/jobs/${jobId}/assign`, { freelancerId }, token);
      toast?.success?.('Freelancer assigned');
      loadData();
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to assign freelancer');
    }
  };

  const handleVerifyTimeLog = async (logId, status) => {
    try {
      await apiClient.put(`/api/outsourcing/time-logs/${logId}/verify`, { status }, token);
      toast?.success?.(status === 'approved' ? 'Time log approved' : 'Time log rejected');
      loadData();
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to review time log');
    }
  };

  const stats = {
    total: jobs.length,
    inProgress: jobs.filter(j => j.status === 'in_progress').length,
    completed: jobs.filter(j => j.status === 'completed').length,
    pending: jobs.filter(j => j.status === 'pending').length,
  };

  const freelancerOptions = [
    { value: '', label: freelancers.length === 0 ? 'No freelancers available' : 'Create unassigned' },
    ...freelancers.map((f) => ({
      value: f.user?._id || f._id,
      label: `${f.user?.firstName || f.firstName} ${f.user?.lastName || f.lastName} (${f.user?.email || f.email})`,
    })),
  ];

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="HR Outsourcing"
          subtitle="Assign freelancer work and track your assignments"
          user={user}
          icon="handshake"
          primaryAction={tab === 'assign' ? { label: 'Assign New Work', icon: 'add', onClick: () => setShowForm(true) } : undefined}
        />

        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KPICard title="Total Jobs" value={stats.total} icon="work" tone="accent" priority="secondary" />
          <KPICard title="In Progress" value={stats.inProgress} icon="pending_actions" tone="warning" priority="secondary" />
          <KPICard title="Completed" value={stats.completed} icon="task_alt" tone="success" priority="secondary" />
          <KPICard title="Pending" value={stats.pending} icon="schedule" tone="neutral" priority="secondary" />
        </div>

        <Tabs items={OUTSOURCING_TABS} activeKey={tab} onChange={setTab} className="mb-6" />

        <Modal
          open={showForm}
          onClose={closeForm}
          title="Assign New Work"
          footer={(
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={closeForm}>Cancel</Button>
              <Button type="submit" form="hr-outsourcing-job-form" disabled={saving}>{saving ? 'Creating...' : 'Create Job'}</Button>
            </div>
          )}
        >
          <form id="hr-outsourcing-job-form" onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Job Title *"
              value={form.title}
              onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Design landing page"
            />
            <div>
              <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Description *</span>
              <textarea
                rows={3}
                className="min-h-24 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-500 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Detailed description of the work..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Priority"
                value={form.priority}
                onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                options={priorityOptions}
              />
              <Input
                label="Budget (₹)"
                type="number"
                min="0"
                value={form.budgetAmount}
                onChange={e => setForm(f => ({ ...f, budgetAmount: e.target.value }))}
                placeholder="0"
              />
            </div>
            <Select
              label="Freelancer"
              value={form.assignedFreelancer}
              onChange={e => setForm(f => ({ ...f, assignedFreelancer: e.target.value }))}
              options={freelancerOptions}
            />
            <Input
              label="Due Date *"
              type="date"
              value={form.dueDate}
              onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
            />
            {formError && <p className="text-xs text-rose-600">{formError}</p>}
          </form>
        </Modal>

        {loading ? (
          <div className="flex items-center justify-center py-20 text-neutral-400">
            <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
          </div>
        ) : tab === 'assign' ? (
          /* ── ASSIGN WORK TAB ── */
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
            <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
              <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">All Jobs</h2>
            </div>
            {jobs.length === 0 ? (
              <EmptyState
                icon="work_off"
                title="No jobs yet"
                description="Assign work to freelancers and track their progress from this workspace."
                actionLabel="Assign New Work"
                onAction={() => setShowForm(true)}
                compact
              />
            ) : (
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {jobs.map(job => (
                  <div key={job._id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">{job.title}</p>
                          <StatusBadge tone={STATUS_TONE[job.status] || 'neutral'} label={job.status?.replace('_', ' ')} />
                          <StatusBadge tone={PRIORITY_TONE[job.priority] || 'info'} label={job.priority} dot={false} />
                        </div>
                        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{job.description}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                          {job.dueDate && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span>{new Date(job.dueDate).toLocaleDateString('en-IN')}</span>}
                          {job.budgetAmount > 0 && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">currency_rupee</span>{job.budgetAmount.toLocaleString('en-IN')}</span>}
                        </div>
                      </div>
                      {/* Assign freelancer */}
                      {!job.assignedFreelancer && job.status === 'pending' && (
                        <div className="shrink-0 mt-2 sm:mt-0 w-48">
                          <Select
                            aria-label="Assign Freelancer"
                            onChange={e => handleAssign(job._id, e.target.value)}
                            defaultValue=""
                            options={[
                              { value: '', label: freelancers.length === 0 ? 'No freelancers available' : 'Assign Freelancer' },
                              ...freelancers.map((f) => ({
                                value: f.user?._id || f._id,
                                label: `${f.user?.firstName || f.firstName} ${f.user?.lastName || f.lastName}`,
                              })),
                            ]}
                          />
                        </div>
                      )}
                      {job.assignedFreelancer && (
                        <div className="shrink-0 mt-2 sm:mt-0 text-right">
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">Assigned to</p>
                          <p className="text-xs font-medium text-neutral-700 dark:text-neutral-300">
                            {job.assignedFreelancer?.firstName || job.assignedFreelancer?.user?.firstName || '—'}{' '}
                            {job.assignedFreelancer?.lastName || job.assignedFreelancer?.user?.lastName || ''}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          /* ── TRACK PROGRESS TAB ── */
          <div className="space-y-4">
            {/* Active jobs progress */}
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">Job Progress</h2>
              </div>
              {jobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length === 0 ? (
                <EmptyState icon="pending_actions" title="No active jobs in progress" compact />
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {jobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).map(job => (
                    <div key={job._id} className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm">{job.title}</p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">
                            Freelancer: {job.assignedFreelancer?.firstName || job.assignedFreelancer?.user?.firstName || 'Unassigned'}
                            {' '}{job.assignedFreelancer?.lastName || job.assignedFreelancer?.user?.lastName || ''}
                          </p>
                        </div>
                        <StatusBadge tone={STATUS_TONE[job.status] || 'neutral'} label={job.status?.replace('_', ' ')} />
                      </div>
                      {/* Contract law status */}
                      {job.contract && (
                        <div className="mt-2 flex items-center gap-2">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">Agreement:</span>
                          <StatusBadge tone={CONTRACT_STATUS_TONE[job.contract?.lawStatus] || 'warning'} label={`Law ${job.contract?.lawStatus || 'pending'}`} />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recent time logs */}
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">Recent Time Logs</h2>
              </div>
              {timeLogs.length === 0 ? (
                <EmptyState icon="timer_off" title="No time logs recorded yet" compact />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-neutral-100 dark:border-neutral-800">
                        <th className="p-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400">Freelancer</th>
                        <th className="p-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400">Job</th>
                        <th className="p-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400">Hours</th>
                        <th className="p-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400">Date</th>
                        <th className="p-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400">Status</th>
                        <th className="p-3 text-left text-xs font-semibold text-neutral-500 dark:text-neutral-400">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                      {timeLogs.slice(0, 20).map(log => (
                        <tr key={log._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="p-3 text-neutral-700 dark:text-neutral-300">
                            {log.freelancer?.firstName || '—'} {log.freelancer?.lastName || ''}
                          </td>
                          <td className="p-3 text-neutral-700 dark:text-neutral-300">{log.job?.title || '—'}</td>
                          <td className="p-3 font-medium text-neutral-900 dark:text-neutral-100">{log.hours ?? '—'}h</td>
                          <td className="p-3 text-neutral-500 dark:text-neutral-400">
                            {log.logDate ? new Date(log.logDate).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="p-3">
                            <StatusBadge tone={TIME_LOG_TONE[log.verificationStatus] || 'warning'} label={log.verificationStatus || 'pending'} />
                          </td>
                          <td className="p-3">
                            {(log.verificationStatus || 'pending') === 'pending' && (
                              <div className="flex gap-2">
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="border border-emerald-200 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-900/40 dark:text-emerald-300 dark:hover:bg-emerald-900/20"
                                  onClick={() => handleVerifyTimeLog(log._id, 'approved')}
                                >
                                  Approve
                                </Button>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="border border-rose-200 text-rose-600 hover:bg-rose-50 dark:border-rose-900/40 dark:text-rose-300 dark:hover:bg-rose-900/20"
                                  onClick={() => handleVerifyTimeLog(log._id, 'rejected')}
                                >
                                  Reject
                                </Button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Completed jobs */}
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">Completed Work</h2>
              </div>
              {jobs.filter(j => j.status === 'completed').length === 0 ? (
                <EmptyState icon="task_alt" title="No completed jobs yet" compact />
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {jobs.filter(j => j.status === 'completed').map(job => (
                    <div key={job._id} className="flex items-center justify-between p-4">
                      <div>
                        <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{job.title}</p>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                          {job.assignedFreelancer?.firstName || job.assignedFreelancer?.user?.firstName || '—'}
                          {' '}{job.assignedFreelancer?.lastName || job.assignedFreelancer?.user?.lastName || ''}
                        </p>
                      </div>
                      <StatusBadge tone="success" label="Completed" />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
