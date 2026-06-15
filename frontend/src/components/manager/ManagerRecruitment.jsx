import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { hrApi } from '../../services/hr';

const STATUS_STYLES = {
  applied:   'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  screening: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  interview: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  offered:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  hired:     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  rejected:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const JOB_STATUS_STYLES = {
  open:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  draft:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  closed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const TABS = ['Post Jobs', 'Applications'];

const emptyJob = {
  title: '', department: '', location: 'Company HQ', type: 'full-time',
  experience: '', salaryRange: '', description: '', openings: 1,
  closingDate: '', status: 'open',
};

const DEMO_JOBS = [
  { _id: 'demo1', title: 'Product Manager', department: 'Operations', location: 'Company HQ', type: 'full-time', experience: '3-5 years', salaryRange: '₹10L–₹18L', status: 'open', openings: 1, closingDate: '2026-07-30' },
  { _id: 'demo2', title: 'Backend Developer', department: 'IT', location: 'Remote', type: 'remote', experience: '2-4 years', salaryRange: '₹6L–₹12L', status: 'open', openings: 2, closingDate: '2026-08-15' },
];
const DEMO_APPS = [
  { _id: 'da1', name: 'Rahul Sharma', email: 'rahul@example.com', position: 'Product Manager', status: 'screening', appliedDate: '2026-06-05', source: 'external' },
  { _id: 'da2', name: 'Priya Nair', email: 'priya@example.com', position: 'Backend Developer', status: 'interview', appliedDate: '2026-06-03', source: 'internal' },
  { _id: 'da3', name: 'Arjun Patel', email: 'arjun@example.com', position: 'Product Manager', status: 'applied', appliedDate: '2026-06-07', source: 'external' },
];

const safeFetch = async (fn) => {
  try { return await fn(); } catch (err) {
    if (err?.status === 403 || err?.status === 400) return null;
    throw err;
  }
};

export default function ManagerRecruitment() {
  const { token, user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [form, setForm] = useState(emptyJob);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.all([
        safeFetch(() => hrApi.getJobPosts(token)),
        safeFetch(() => hrApi.getApplicants(token)),
      ]);
      const jobData = jobsRes?.data?.length ? jobsRes.data : DEMO_JOBS;
      const appData = appsRes?.data?.applicants || appsRes?.data || [];
      setJobs(jobData);
      setApplicants(appData.length ? appData : DEMO_APPS);
    } catch {
      setJobs(DEMO_JOBS);
      setApplicants(DEMO_APPS);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const openNewForm = () => {
    setEditingJob(null);
    setForm({ ...emptyJob, department: user?.department || '' });
    setFormError('');
    setShowForm(true);
  };

  const openEditForm = (job) => {
    setEditingJob(job);
    setForm({
      title: job.title || '',
      department: job.department || '',
      location: job.location || 'Company HQ',
      type: job.type || 'full-time',
      experience: job.experience || '',
      salaryRange: job.salaryRange || '',
      description: job.description || '',
      openings: job.openings || 1,
      closingDate: job.closingDate ? job.closingDate.slice(0, 10) : '',
      status: job.status || 'open',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { setFormError('Job title is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingJob && !editingJob._id.startsWith('demo')) {
        await hrApi.updateJobPost(editingJob._id, form, token);
        toast?.success?.('Job updated');
      } else if (!editingJob) {
        await hrApi.createJobPost(form, token);
        toast?.success?.('Job posted — HR will review');
      } else {
        toast?.info?.('Demo mode — not saved to server');
      }
      setShowForm(false);
      loadData();
    } catch (err) {
      setFormError(err?.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const handleMoveApplicant = async (applicant, newStatus) => {
    if (applicant._id.startsWith('demo')) {
      setApplicants(prev => prev.map(a => a._id === applicant._id ? { ...a, status: newStatus } : a));
      return;
    }
    try {
      await hrApi.updateApplicant(applicant._id, { status: newStatus }, token);
      toast?.success?.(`Moved to ${newStatus}`);
      loadData();
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to update status');
    }
  };

  const stats = {
    myJobs: jobs.length,
    openJobs: jobs.filter(j => j.status === 'open').length,
    totalApps: applicants.length,
    interviews: applicants.filter(a => a.status === 'interview').length,
  };

  const filteredApps = applicants.filter(a => !filterStatus || a.status === filterStatus);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Team Recruitment</h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400">Post jobs for your team and review incoming applications</p>
        </div>
        {tab === 0 && (
          <button onClick={openNewForm}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Post a Job
          </button>
        )}
      </div>

      {/* KPI strip */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Total Jobs', value: stats.myJobs, icon: 'work', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Open', value: stats.openJobs, icon: 'lock_open', color: 'text-green-600 dark:text-green-400' },
          { label: 'Applicants', value: stats.totalApps, icon: 'person_search', color: 'text-violet-600 dark:text-violet-400' },
          { label: 'Interviews', value: stats.interviews, icon: 'record_voice_over', color: 'text-amber-600 dark:text-amber-400' },
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
      <div className="mb-4 flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900 w-fit">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === i ? 'bg-primary text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'}`}>
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      ) : tab === 0 ? (
        /* ─── POST JOBS TAB ─── */
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-16 dark:border-neutral-800 dark:bg-neutral-900 text-neutral-400">
              <span className="material-symbols-outlined text-4xl mb-2">work_off</span>
              <p className="text-sm mb-3">No jobs posted yet.</p>
              <button onClick={openNewForm} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">Post Your First Job</button>
            </div>
          ) : jobs.map(job => (
            <div key={job._id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{job.title}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${JOB_STATUS_STYLES[job.status] || JOB_STATUS_STYLES.draft}`}>
                      {job.status}
                    </span>
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-neutral-500 dark:text-neutral-400">
                    {job.department && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">corporate_fare</span>{job.department}</span>}
                    {job.location && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span>{job.location}</span>}
                    {job.type && <span>{job.type}</span>}
                    {job.experience && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">workspace_premium</span>{job.experience}</span>}
                    {job.openings > 0 && <span>{job.openings} opening{job.openings > 1 ? 's' : ''}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEditForm(job)}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                    <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── APPLICATIONS TAB ─── */
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
              <option value="">All Stages</option>
              {['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <span className="text-xs text-neutral-500">{filteredApps.length} applicant{filteredApps.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Applicant</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Position</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Source</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Applied</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Stage</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredApps.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-neutral-400 text-sm">No applicants yet.</td></tr>
                ) : filteredApps.map(a => (
                  <tr key={a._id} className="hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                    <td className="p-3">
                      <div>
                        <p className="font-medium text-neutral-900 dark:text-neutral-100">{a.name}</p>
                        <p className="text-xs text-neutral-500">{a.email}</p>
                      </div>
                    </td>
                    <td className="p-3 text-neutral-700 dark:text-neutral-300">{a.position || a.jobTitle || '—'}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${a.source === 'internal' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'}`}>
                        {a.source || 'external'}
                      </span>
                    </td>
                    <td className="p-3 text-xs text-neutral-500">{a.appliedDate ? new Date(a.appliedDate).toLocaleDateString('en-IN') : '—'}</td>
                    <td className="p-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[a.status] || STATUS_STYLES.applied}`}>
                        {a.status}
                      </span>
                    </td>
                    <td className="p-3">
                      <select value={a.status} onChange={e => handleMoveApplicant(a, e.target.value)}
                        className="rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100">
                        {['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'].map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Job Form Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingJob ? 'Edit Job' : 'Post New Job for Team'}
              </h2>
              <button onClick={() => setShowForm(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Job Title *</label>
                <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Backend Developer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Department</label>
                  <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} placeholder="Your department" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Type</label>
                  <select className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                    {['full-time', 'part-time', 'contract', 'remote', 'internship'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Experience</label>
                  <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="e.g. 2-4 years" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Openings</label>
                  <input type="number" min={1} className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.openings} onChange={e => setForm(f => ({ ...f, openings: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Salary Range</label>
                  <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.salaryRange} onChange={e => setForm(f => ({ ...f, salaryRange: e.target.value }))} placeholder="₹5L–₹10L" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Closing Date</label>
                  <input type="date" className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={form.closingDate} onChange={e => setForm(f => ({ ...f, closingDate: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Description</label>
                <textarea rows={3} className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} placeholder="Role overview..." />
              </div>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowForm(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">Cancel</button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
                  {saving ? 'Saving...' : editingJob ? 'Update' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
