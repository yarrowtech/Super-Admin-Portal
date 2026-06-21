import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { apiClient } from '../../services/client';

const STATUS_STYLES = {
  pending:     'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  accepted:    'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  in_progress: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  completed:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  cancelled:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const PRIORITY_STYLES = {
  low:    'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  high:   'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const CONTRACT_STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  validated: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  rejected:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const TABS = ['Assign Work', 'Track Progress'];

const emptyJob = { title: '', description: '', priority: 'medium', dueDate: '', budgetAmount: '', assignedFreelancer: '' };

export default function ManagerOutsourcingPage({ portalRole }) {
  const { token, user } = useAuth();
  const toast = useToast();
  const coordinatorLabel = portalRole || (user?.role === 'hr' ? 'HR' : 'Manager');

  const [tab, setTab] = useState(0);
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

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{coordinatorLabel} Outsourcing</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Assign freelancer work and track your assignments</p>
        </div>
        {tab === 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            Assign New Work
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Jobs', value: stats.total, icon: 'work', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'In Progress', value: stats.inProgress, icon: 'pending_actions', color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Completed', value: stats.completed, icon: 'task_alt', color: 'text-green-600 dark:text-green-400' },
          { label: 'Pending', value: stats.pending, icon: 'schedule', color: 'text-slate-600 dark:text-slate-400' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center gap-2 mb-1">
              <span className={`material-symbols-outlined text-[20px] ${s.color}`}>{s.icon}</span>
              <span className="text-xs font-medium text-neutral-500 dark:text-neutral-400">{s.label}</span>
            </div>
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900 w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === i
                ? 'bg-primary text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Create Job Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-neutral-100">Assign New Work</h2>
              <button onClick={() => { setShowForm(false); setFormError(''); }} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Job Title *</label>
                <input
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                  placeholder="e.g. Design landing page"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Description *</label>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="Detailed description of the work..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Priority</label>
                  <select
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Budget (₹)</label>
                  <input
                    type="number" min="0"
                    className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.budgetAmount} onChange={e => setForm(f => ({ ...f, budgetAmount: e.target.value }))}
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Freelancer</label>
                <select
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.assignedFreelancer}
                  onChange={e => setForm(f => ({ ...f, assignedFreelancer: e.target.value }))}
                >
                  <option value="">Create unassigned</option>
                  {freelancers.length === 0 && <option value="" disabled>No freelancers available</option>}
                  {freelancers.map(f => (
                    <option key={f._id} value={f.user?._id || f._id}>
                      {f.user?.firstName || f.firstName} {f.user?.lastName || f.lastName} ({f.user?.email || f.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Due Date *</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))}
                />
              </div>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => { setShowForm(false); setFormError(''); }}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
                  {saving ? 'Creating...' : 'Create Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tab content */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      ) : tab === 0 ? (
        /* ── ASSIGN WORK TAB ── */
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
            <h2 className="font-semibold text-neutral-900 dark:text-neutral-100 text-sm">All Jobs</h2>
          </div>
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <span className="material-symbols-outlined text-4xl mb-2">work_off</span>
              <p className="text-sm">No jobs yet. Create one to assign work.</p>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {jobs.map(job => (
                <div key={job._id} className="p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-neutral-900 dark:text-neutral-100 text-sm truncate">{job.title}</p>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status] || STATUS_STYLES.pending}`}>
                          {job.status?.replace('_', ' ')}
                        </span>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ${PRIORITY_STYLES[job.priority] || PRIORITY_STYLES.medium}`}>
                          {job.priority}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2">{job.description}</p>
                      <div className="mt-2 flex items-center gap-4 text-xs text-neutral-500 dark:text-neutral-400">
                        {job.dueDate && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span>{new Date(job.dueDate).toLocaleDateString('en-IN')}</span>}
                        {job.budgetAmount > 0 && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">currency_rupee</span>{job.budgetAmount.toLocaleString('en-IN')}</span>}
                      </div>
                    </div>
                    {/* Assign freelancer */}
                    {!job.assignedFreelancer && job.status === 'pending' && (
                      <div className="shrink-0 mt-2 sm:mt-0">
                        <select
                          onChange={e => handleAssign(job._id, e.target.value)}
                          defaultValue=""
                          className="rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-1.5 text-xs focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                        >
                          <option value="" disabled>Assign Freelancer</option>
                          {freelancers.length === 0 && <option value="" disabled>No freelancers available</option>}
                          {freelancers.map(f => (
                            <option key={f._id} value={f.user?._id || f._id}>
                              {f.user?.firstName || f.firstName} {f.user?.lastName || f.lastName} ({f.user?.email || f.email})
                            </option>
                          ))}
                        </select>
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
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <span className="material-symbols-outlined text-4xl mb-2">pending_actions</span>
                <p className="text-sm">No active jobs in progress.</p>
              </div>
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
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status]}`}>
                        {job.status?.replace('_', ' ')}
                      </span>
                    </div>
                    {/* Contract law status */}
                    {job.contract && (
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Agreement:</span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${CONTRACT_STATUS_STYLES[job.contract?.lawStatus] || CONTRACT_STATUS_STYLES.pending}`}>
                          Law {job.contract?.lawStatus || 'pending'}
                        </span>
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
              <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
                <span className="material-symbols-outlined text-4xl mb-2">timer_off</span>
                <p className="text-sm">No time logs recorded yet.</p>
              </div>
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
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            log.verificationStatus === 'approved' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' : log.verificationStatus === 'rejected' ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                          }`}>
                            {log.verificationStatus || 'pending'}
                          </span>
                        </td>
                        <td className="p-3">
                          {(log.verificationStatus || 'pending') === 'pending' && (
                            <div className="flex gap-2">
                              <button onClick={() => handleVerifyTimeLog(log._id, 'approved')} className="rounded-md bg-green-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-green-700">Approve</button>
                              <button onClick={() => handleVerifyTimeLog(log._id, 'rejected')} className="rounded-md border border-rose-300 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-300 dark:hover:bg-rose-950/30">Reject</button>
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
              <div className="flex flex-col items-center justify-center py-10 text-neutral-400">
                <span className="material-symbols-outlined text-4xl mb-2">task_alt</span>
                <p className="text-sm">No completed jobs yet.</p>
              </div>
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
                    <span className="rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300">
                      Completed
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
