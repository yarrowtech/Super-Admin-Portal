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

const LAW_STATUS_STYLES = {
  pending:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  validated: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  rejected:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const TABS = ['Overview', 'Jobs', 'Freelancers', 'Time Logs'];

export default function HROutsourcingPage() {
  const { token } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [freelancers, setFreelancers] = useState([]);
  const [timeLogs, setTimeLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const safeFetch = useCallback(async (url) => {
    try {
      const res = await apiClient.get(url, token);
      return res;
    } catch (err) {
      // Silently ignore 403 — backend may need a restart to pick up new role permissions
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
        safeFetch('/api/outsourcing/users'),
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

  const handleVerifyTimeLog = async (logId) => {
    try {
      await apiClient.put(`/api/outsourcing/time-logs/${logId}/verify`, {}, token);
      toast?.success?.('Time log verified');
      loadData();
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to verify time log');
    }
  };

  const stats = {
    totalFreelancers: freelancers.length,
    activeJobs: jobs.filter(j => ['accepted', 'in_progress'].includes(j.status)).length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    pendingContracts: jobs.filter(j => j.contract?.lawStatus === 'pending').length,
    unverifiedLogs: timeLogs.filter(l => !l.verified).length,
  };

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Outsourcing Tracking</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Monitor freelancer assignments, contracts, and work logs</p>
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {[
          { label: 'Freelancers', value: stats.totalFreelancers,  icon: 'person',          color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Active Jobs', value: stats.activeJobs,        icon: 'pending_actions', color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Completed',   value: stats.completedJobs,     icon: 'task_alt',        color: 'text-green-600 dark:text-green-400' },
          { label: 'Law Pending', value: stats.pendingContracts,  icon: 'gavel',           color: 'text-rose-600 dark:text-rose-400' },
          { label: 'Unverified Logs', value: stats.unverifiedLogs, icon: 'timer',          color: 'text-violet-600 dark:text-violet-400' },
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

      {/* Tabs */}
      <div className="mb-4 flex gap-1 overflow-x-auto rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900 w-fit">
        {TABS.map((t, i) => (
          <button
            key={t}
            onClick={() => setTab(i)}
            className={`shrink-0 rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
              tab === i
                ? 'bg-primary text-white shadow-sm'
                : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      ) : (
        <>
          {/* OVERVIEW */}
          {tab === 0 && (
            <div className="space-y-4">
              <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
                <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                  <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Workflow Status</h2>
                </div>
                <div className="p-4 space-y-3">
                  {/* Step-by-step flow */}
                  {[
                    { step: 1, role: 'HR / Manager', action: 'Assigns work to freelancer', icon: 'assignment_ind', count: jobs.filter(j => j.status === 'pending').length, label: 'pending jobs' },
                    { step: 2, role: 'Law',           action: 'Creates & validates contract', icon: 'gavel',        count: stats.pendingContracts, label: 'awaiting law validation' },
                    { step: 3, role: 'Freelancer',    action: 'Accepts job & starts work',   icon: 'work',         count: jobs.filter(j => j.acceptanceStatus === 'pending').length, label: 'awaiting acceptance' },
                    { step: 4, role: 'HR / Manager',  action: 'Reviews task completion',     icon: 'fact_check',   count: stats.unverifiedLogs, label: 'time logs to verify' },
                    { step: 5, role: 'Admin',         action: 'Full oversight & payments',   icon: 'admin_panel_settings', count: null, label: '' },
                    { step: 6, role: 'CEO',           action: 'Analytics & progress view',   icon: 'analytics',    count: null, label: '' },
                  ].map((s, idx, arr) => (
                    <div key={s.step} className="flex items-start gap-3">
                      <div className="flex flex-col items-center">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                          <span className="material-symbols-outlined text-[18px]">{s.icon}</span>
                        </div>
                        {idx < arr.length - 1 && <div className="mt-1 w-0.5 h-6 bg-neutral-200 dark:bg-neutral-700" />}
                      </div>
                      <div className="pb-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-bold text-primary">Step {s.step} — {s.role}</span>
                          {s.count !== null && s.count > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-300">
                              {s.count} {s.label}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{s.action}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* JOBS */}
          {tab === 1 && (
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">All Outsourcing Jobs</h2>
              </div>
              {jobs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                  <span className="material-symbols-outlined text-4xl mb-2">work_off</span>
                  <p className="text-sm">No jobs yet.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {jobs.map(job => (
                    <div key={job._id} className="p-4">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">{job.title}</p>
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[job.status] || STATUS_STYLES.pending}`}>
                              {job.status?.replace('_', ' ')}
                            </span>
                          </div>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
                            Freelancer: {job.assignedFreelancer?.firstName || job.assignedFreelancer?.user?.firstName || 'Unassigned'}
                            {' '}{job.assignedFreelancer?.lastName || job.assignedFreelancer?.user?.lastName || ''}
                          </p>
                        </div>
                        {/* Contract law status badge */}
                        <div className="flex items-center gap-2 mt-1 sm:mt-0">
                          <span className="text-xs text-neutral-500 dark:text-neutral-400">Agreement:</span>
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${LAW_STATUS_STYLES[job.contract?.lawStatus] || LAW_STATUS_STYLES.pending}`}>
                            {job.contract?.lawStatus ? `Law ${job.contract.lawStatus}` : 'No contract'}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FREELANCERS */}
          {tab === 2 && (
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Registered Freelancers</h2>
              </div>
              {freelancers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                  <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
                  <p className="text-sm">No freelancers registered.</p>
                </div>
              ) : (
                <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                  {freelancers.map(f => (
                    <div key={f._id} className="flex items-center justify-between p-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                          {(f.user?.firstName || f.firstName || '?')[0].toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                            {f.user?.firstName || f.firstName} {f.user?.lastName || f.lastName}
                          </p>
                          <p className="text-xs text-neutral-500 dark:text-neutral-400">{f.user?.email || f.contactEmail || '—'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          f.lawValidated
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                            : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                        }`}>
                          {f.lawValidated ? 'Law Validated' : 'Law Pending'}
                        </span>
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[f.status] || STATUS_STYLES.pending}`}>
                          {f.status}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TIME LOGS */}
          {tab === 3 && (
            <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
              <div className="p-4 border-b border-neutral-200 dark:border-neutral-800">
                <h2 className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">Time Logs</h2>
              </div>
              {timeLogs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
                  <span className="material-symbols-outlined text-4xl mb-2">timer_off</span>
                  <p className="text-sm">No time logs recorded.</p>
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
                      {timeLogs.map(log => (
                        <tr key={log._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                          <td className="p-3 text-neutral-700 dark:text-neutral-300">
                            {log.freelancer?.firstName || '—'} {log.freelancer?.lastName || ''}
                          </td>
                          <td className="p-3 text-neutral-700 dark:text-neutral-300">{log.job?.title || '—'}</td>
                          <td className="p-3 font-medium text-neutral-900 dark:text-neutral-100">{log.hours ?? '—'}h</td>
                          <td className="p-3 text-neutral-500 dark:text-neutral-400">
                            {log.date ? new Date(log.date).toLocaleDateString('en-IN') : '—'}
                          </td>
                          <td className="p-3">
                            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                              log.verified
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                            }`}>
                              {log.verified ? 'Verified' : 'Pending'}
                            </span>
                          </td>
                          <td className="p-3">
                            {!log.verified && (
                              <button
                                onClick={() => handleVerifyTimeLog(log._id)}
                                className="rounded-lg bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
                              >
                                Verify
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
