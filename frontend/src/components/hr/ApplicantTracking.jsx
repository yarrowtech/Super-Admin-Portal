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
  pending:   'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

const JOB_STATUS_STYLES = {
  open:   'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300',
  draft:  'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400',
  closed: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300',
};

const PIPELINE_STAGES = ['applied', 'screening', 'interview', 'offered', 'hired'];
const TABS = ['Job Postings', 'Applicants'];

const emptyJob = {
  title: '', department: '', location: 'Company HQ', type: 'full-time',
  experience: '', salaryRange: '', description: '', openings: 1,
  closingDate: '', status: 'open',
};

const safeFetch = async (fn) => {
  try { return await fn(); }
  catch (err) {
    if (err?.status === 403 || err?.status === 400) return null;
    throw err;
  }
};

export default function ApplicantTracking() {
  const { token } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [applicants, setApplicants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showJobForm, setShowJobForm] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [jobForm, setJobForm] = useState(emptyJob);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [filterJobId, setFilterJobId] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(null); // applicant object being updated
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const [jobsRes, applicantsRes] = await Promise.all([
        safeFetch(() => hrApi.getJobPosts(token)),
        safeFetch(() => hrApi.getApplicants(token)),
      ]);
      setJobs(jobsRes?.data || []);
      setApplicants(applicantsRes?.data?.applicants || applicantsRes?.data || []);
    } catch (err) {
      setError(err?.message || 'Unable to load recruitment data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const openNewJobForm = () => {
    setEditingJob(null);
    setJobForm(emptyJob);
    setFormError('');
    setShowJobForm(true);
  };

  const openEditJobForm = (job) => {
    setEditingJob(job);
    setJobForm({
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
    setShowJobForm(true);
  };

  const handleJobSubmit = async (e) => {
    e.preventDefault();
    if (!jobForm.title.trim()) { setFormError('Job title is required'); return; }
    setSaving(true);
    setFormError('');
    try {
      if (editingJob) {
        await hrApi.updateJobPost(editingJob._id, jobForm, token);
        toast?.success?.('Job updated');
      } else {
        await hrApi.createJobPost(jobForm, token);
        toast?.success?.('Job posted');
      }
      setShowJobForm(false);
      loadData();
    } catch (err) {
      setFormError(err?.message || 'Failed to save job');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseJob = async (job) => {
    try {
      await hrApi.updateJobPost(job._id, { status: 'closed' }, token);
      toast?.success?.('Job closed');
      loadData();
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to close job');
    }
  };

  const handleDeleteJob = async (job) => {
    try {
      await hrApi.deleteJobPost(job._id, token);
      toast?.success?.('Job deleted');
      loadData();
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to delete job');
    }
  };

  const handleMoveApplicant = async (applicant, newStatus) => {
    try {
      await hrApi.updateApplicant(applicant._id, { status: newStatus }, token);
      toast?.success?.(`Moved to ${newStatus}`);
      loadData();
    } catch (err) {
      toast?.error?.(err?.message || 'Failed to update status');
    }
  };

  const stats = {
    openJobs: jobs.filter(j => j.status === 'open').length,
    totalApplicants: applicants.length,
    interviews: applicants.filter(a => a.status === 'interview').length,
    hired: applicants.filter(a => a.status === 'hired').length,
  };

  const filteredApplicants = applicants.filter(a => {
    if (filterJobId && a.job !== filterJobId && a.position !== jobs.find(j => j._id === filterJobId)?.title) return false;
    if (filterStatus && a.status !== filterStatus) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Open Positions', value: stats.openJobs, icon: 'work', color: 'text-blue-600 dark:text-blue-400' },
          { label: 'Total Applicants', value: stats.totalApplicants, icon: 'person_search', color: 'text-violet-600 dark:text-violet-400' },
          { label: 'In Interview', value: stats.interviews, icon: 'record_voice_over', color: 'text-amber-600 dark:text-amber-400' },
          { label: 'Hired', value: stats.hired, icon: 'how_to_reg', color: 'text-green-600 dark:text-green-400' },
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900 w-fit">
          {TABS.map((t, i) => (
            <button key={t} onClick={() => setTab(i)}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === i ? 'bg-primary text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'}`}>
              {t}
            </button>
          ))}
        </div>
        {tab === 0 && (
          <button onClick={openNewJobForm}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
            <span className="material-symbols-outlined text-[18px]">add</span>
            Post New Job
          </button>
        )}
      </div>

      {error && !loading && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/40 dark:bg-red-950/20">
          <span className="material-symbols-outlined text-red-600 dark:text-red-400">error</span>
          <p className="flex-1 text-sm font-medium text-red-800 dark:text-red-200">Unable to load recruitment data. {error}</p>
          <button onClick={loadData} className="shrink-0 rounded-lg border border-red-300 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-50 dark:border-red-800 dark:bg-transparent dark:text-red-300">
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      ) : error ? null : tab === 0 ? (
        /* ─── JOB POSTINGS ─── */
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-16 dark:border-neutral-800 dark:bg-neutral-900 text-neutral-400">
              <span className="material-symbols-outlined text-4xl mb-2">work_off</span>
              <p className="text-sm">No job postings yet.</p>
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
                    <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>{job.type}</span>
                    {job.experience && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">workspace_premium</span>{job.experience}</span>}
                    {job.salaryRange && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">payments</span>{job.salaryRange}</span>}
                    {job.openings > 0 && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span>{job.openings} opening{job.openings > 1 ? 's' : ''}</span>}
                    {job.closingDate && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span>Closes {new Date(job.closingDate).toLocaleDateString('en-IN')}</span>}
                  </div>
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    Posted by {job.createdBy?.firstName || 'HR'} {job.createdBy?.lastName || ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => openEditJobForm(job)}
                    className="flex items-center gap-1 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                    <span className="material-symbols-outlined text-[14px]">edit</span> Edit
                  </button>
                  {job.status === 'open' && (
                    <button onClick={() => handleCloseJob(job)}
                      className="flex items-center gap-1 rounded-lg border border-amber-200 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-900/20">
                      <span className="material-symbols-outlined text-[14px]">do_not_disturb_on</span> Close
                    </button>
                  )}
                  <button onClick={() => handleDeleteJob(job)}
                    className="flex items-center gap-1 rounded-lg border border-rose-200 px-3 py-1.5 text-xs font-medium text-rose-600 hover:bg-rose-50 dark:border-rose-800 dark:text-rose-400 dark:hover:bg-rose-900/20">
                    <span className="material-symbols-outlined text-[14px]">delete</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* ─── APPLICANTS PIPELINE ─── */
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <select value={filterJobId} onChange={e => setFilterJobId(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
              <option value="">All Jobs</option>
              {jobs.map(j => <option key={j._id} value={j._id}>{j.title}</option>)}
            </select>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
              <option value="">All Stages</option>
              {['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'].map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <span className="self-center text-xs text-neutral-500">{filteredApplicants.length} applicant{filteredApplicants.length !== 1 ? 's' : ''}</span>
          </div>

          {/* Pipeline stage counts */}
          <div className="flex gap-2 overflow-x-auto pb-1">
            {PIPELINE_STAGES.map(stage => {
              const count = applicants.filter(a => a.status === stage).length;
              return (
                <div key={stage} className="shrink-0 rounded-lg border border-neutral-200 bg-white px-4 py-2 dark:border-neutral-800 dark:bg-neutral-900 text-center min-w-[90px]">
                  <p className="text-lg font-bold text-neutral-900 dark:text-neutral-100">{count}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400 capitalize">{stage}</p>
                </div>
              );
            })}
          </div>

          {/* Applicants table */}
          <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-neutral-800">
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Applicant</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Position</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Source</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Applied</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Stage</th>
                  <th className="p-3 text-left text-xs font-semibold text-neutral-500">Move To</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {filteredApplicants.length === 0 ? (
                  <tr><td colSpan={6} className="py-12 text-center text-neutral-400 text-sm">No applicants match the filter.</td></tr>
                ) : filteredApplicants.map(a => (
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
                      <select
                        value={a.status}
                        onChange={e => handleMoveApplicant(a, e.target.value)}
                        className="rounded-lg border border-neutral-300 bg-neutral-50 px-2 py-1 text-xs dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                      >
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
      {showJobForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="sticky top-0 flex items-center justify-between border-b border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
                {editingJob ? 'Edit Job Posting' : 'Post New Job'}
              </h2>
              <button onClick={() => setShowJobForm(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleJobSubmit} className="p-4 space-y-4">
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Job Title *</label>
                <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={jobForm.title} onChange={e => setJobForm(f => ({ ...f, title: e.target.value }))} placeholder="e.g. Senior UX Designer" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Department</label>
                  <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={jobForm.department} onChange={e => setJobForm(f => ({ ...f, department: e.target.value }))} placeholder="HR, IT, Finance..." />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Location</label>
                  <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={jobForm.location} onChange={e => setJobForm(f => ({ ...f, location: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Type</label>
                  <select className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={jobForm.type} onChange={e => setJobForm(f => ({ ...f, type: e.target.value }))}>
                    {['full-time', 'part-time', 'contract', 'remote', 'internship'].map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Openings</label>
                  <input type="number" min={1} className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={jobForm.openings} onChange={e => setJobForm(f => ({ ...f, openings: Number(e.target.value) }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Experience Required</label>
                  <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={jobForm.experience} onChange={e => setJobForm(f => ({ ...f, experience: e.target.value }))} placeholder="e.g. 2-4 years" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Salary Range</label>
                  <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={jobForm.salaryRange} onChange={e => setJobForm(f => ({ ...f, salaryRange: e.target.value }))} placeholder="e.g. ₹6L–₹10L" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Closing Date</label>
                  <input type="date" className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={jobForm.closingDate} onChange={e => setJobForm(f => ({ ...f, closingDate: e.target.value }))} />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Status</label>
                  <select className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                    value={jobForm.status} onChange={e => setJobForm(f => ({ ...f, status: e.target.value }))}>
                    <option value="open">Open</option>
                    <option value="draft">Draft</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Job Description</label>
                <textarea rows={4} className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={jobForm.description} onChange={e => setJobForm(f => ({ ...f, description: e.target.value }))} placeholder="Describe the role, responsibilities, requirements..." />
              </div>
              {formError && <p className="text-xs text-rose-600">{formError}</p>}
              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowJobForm(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  Cancel
                </button>
                <button type="submit" disabled={saving}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
                  {saving ? 'Saving...' : editingJob ? 'Update Job' : 'Post Job'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
