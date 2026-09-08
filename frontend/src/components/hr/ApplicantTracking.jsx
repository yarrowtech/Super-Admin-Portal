import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { hrApi } from '../../services/hr';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import Tabs from '../common/Tabs';
import FilterToolbar from '../common/FilterToolbar';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Modal from '../ui/Modal';
import EmptyState from '../ui/EmptyState';
import ErrorState from '../ui/ErrorState';
import DataTable from '../ui/DataTable';
import CardSkeleton from '../ui/CardSkeleton';

const APPLICANT_STAGE_TONE = {
  applied: 'neutral',
  screening: 'info',
  interview: 'info',
  offered: 'warning',
  hired: 'success',
  rejected: 'danger',
  pending: 'neutral',
};

const JOB_STATUS_TONE = {
  open: 'success',
  draft: 'neutral',
  closed: 'danger',
};

const PIPELINE_STAGES = ['applied', 'screening', 'interview', 'offered', 'hired'];
const STAGE_OPTIONS = [
  { value: '', label: 'All Stages' },
  ...['applied', 'screening', 'interview', 'offered', 'hired', 'rejected'].map((s) => ({
    value: s,
    label: s.charAt(0).toUpperCase() + s.slice(1),
  })),
];

const emptyJob = {
  title: '', department: '', location: 'Company HQ', type: 'full-time',
  experience: '', salaryRange: '', description: '', openings: 1,
  closingDate: '', status: 'open',
};

const TYPE_OPTIONS = ['full-time', 'part-time', 'contract', 'remote', 'internship'].map((t) => ({ value: t, label: t }));
const JOB_STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'draft', label: 'Draft' },
  { value: 'closed', label: 'Closed' },
];

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

  const [activeTab, setActiveTab] = useState('jobs');
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

  const applicantCountByJob = useMemo(() => {
    const map = new Map();
    applicants.forEach((a) => {
      const key = a.job || a.position || a.jobTitle;
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    return map;
  }, [applicants]);

  const stats = {
    openJobs: jobs.filter((j) => j.status === 'open').length,
    totalApplicants: applicants.length,
    interviews: applicants.filter((a) => a.status === 'interview').length,
    hired: applicants.filter((a) => a.status === 'hired').length,
  };

  const jobOptions = useMemo(
    () => [{ value: '', label: 'All Jobs' }, ...jobs.map((j) => ({ value: j._id, label: j.title }))],
    [jobs]
  );

  const filteredApplicants = useMemo(
    () =>
      applicants.filter((a) => {
        if (filterJobId && a.job !== filterJobId && a.position !== jobs.find((j) => j._id === filterJobId)?.title) return false;
        if (filterStatus && a.status !== filterStatus) return false;
        return true;
      }),
    [applicants, filterJobId, filterStatus, jobs]
  );

  const applicantColumns = [
    {
      key: 'applicant',
      label: 'Applicant',
      render: (a) => (
        <div>
          <p className="font-semibold text-neutral-900 dark:text-neutral-100">{a.name}</p>
          <p className="text-xs text-neutral-500 dark:text-neutral-400">{a.email}</p>
        </div>
      ),
    },
    { key: 'position', label: 'Position', render: (a) => a.position || a.jobTitle || '—' },
    {
      key: 'source',
      label: 'Source',
      render: (a) => (
        <StatusBadge tone={a.source === 'internal' ? 'info' : 'neutral'} label={a.source || 'external'} dot={false} />
      ),
    },
    {
      key: 'applied',
      label: 'Applied',
      render: (a) => (a.appliedDate ? new Date(a.appliedDate).toLocaleDateString('en-IN') : '—'),
    },
    {
      key: 'stage',
      label: 'Stage',
      render: (a) => <StatusBadge tone={APPLICANT_STAGE_TONE[a.status] || 'neutral'} label={a.status} />,
    },
    {
      key: 'moveTo',
      label: 'Move To',
      render: (a) => (
        <Select
          aria-label={`Move ${a.name} to stage`}
          value={a.status}
          onChange={(e) => handleMoveApplicant(a, e.target.value)}
          options={STAGE_OPTIONS.filter((o) => o.value)}
          className="min-h-9 w-36 py-1.5 text-xs"
        />
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <KPICard title="Open Positions" value={stats.openJobs} icon="work" tone="info" priority="secondary" />
          <KPICard title="Total Applicants" value={stats.totalApplicants} icon="person_search" tone="accent" priority="secondary" />
          <KPICard title="In Interview" value={stats.interviews} icon="record_voice_over" tone="warning" priority="secondary" />
          <KPICard title="Hired" value={stats.hired} icon="how_to_reg" tone="success" priority="secondary" />
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs
          items={[
            { key: 'jobs', label: 'Job Postings', icon: 'work' },
            { key: 'applicants', label: 'Applicants', icon: 'groups' },
          ]}
          activeKey={activeTab}
          onChange={setActiveTab}
        />
        {activeTab === 'jobs' && (
          <Button onClick={openNewJobForm} icon={<span className="material-symbols-outlined text-base">add</span>}>
            Post New Job
          </Button>
        )}
      </div>

      {error && !loading && <ErrorState description={error} onRetry={loadData} />}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-neutral-400">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      ) : error ? null : activeTab === 'jobs' ? (
        /* ─── JOB POSTINGS ─── */
        <div className="space-y-3">
          {jobs.length === 0 ? (
            <EmptyState
              icon="work_off"
              title="No job postings yet"
              description="Create a job posting to begin receiving applicants."
              actionLabel="Post New Job"
              onAction={openNewJobForm}
            />
          ) : (
            jobs.map((job) => {
              const applicantCount = applicantCountByJob.get(job._id) || applicantCountByJob.get(job.title) || 0;
              return (
                <div key={job._id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-neutral-900 dark:text-neutral-100">{job.title}</h3>
                        <StatusBadge tone={JOB_STATUS_TONE[job.status] || 'neutral'} label={job.status} />
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                        {job.department && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">corporate_fare</span>{job.department}</span>}
                        {job.location && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span>{job.location}</span>}
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">schedule</span>{job.type}</span>
                        {job.experience && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">workspace_premium</span>{job.experience}</span>}
                        {job.salaryRange && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">payments</span>{job.salaryRange}</span>}
                        {job.openings > 0 && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">group</span>{job.openings} opening{job.openings > 1 ? 's' : ''}</span>}
                        <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">person_search</span>{applicantCount} applicant{applicantCount !== 1 ? 's' : ''}</span>
                        {job.closingDate && <span className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">calendar_today</span>Closes {new Date(job.closingDate).toLocaleDateString('en-IN')}</span>}
                      </div>
                      <p className="mt-1.5 text-xs text-neutral-400 dark:text-neutral-500">
                        Posted by {job.createdBy?.firstName || 'HR'} {job.createdBy?.lastName || ''}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEditJobForm(job)} icon={<span className="material-symbols-outlined text-[16px]">edit</span>}>
                        Edit
                      </Button>
                      {job.status === 'open' && (
                        <Button variant="secondary" size="sm" onClick={() => handleCloseJob(job)} icon={<span className="material-symbols-outlined text-[16px]">do_not_disturb_on</span>}>
                          Close
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-rose-600 hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/20"
                        onClick={() => handleDeleteJob(job)}
                        aria-label="Delete job posting"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ─── APPLICANTS PIPELINE ─── */
        <div className="space-y-4">
          <FilterToolbar
            primaryFilters={[
              { key: 'job', label: 'Job', value: filterJobId, onChange: setFilterJobId, options: jobOptions, width: 'w-48' },
              { key: 'stage', label: 'Stage', value: filterStatus, onChange: setFilterStatus, options: STAGE_OPTIONS, width: 'w-40' },
            ]}
            activeChips={[
              ...(filterJobId ? [{ key: 'job', label: jobOptions.find((o) => o.value === filterJobId)?.label || 'Job', onRemove: () => setFilterJobId('') }] : []),
              ...(filterStatus ? [{ key: 'stage', label: STAGE_OPTIONS.find((o) => o.value === filterStatus)?.label || filterStatus, onRemove: () => setFilterStatus('') }] : []),
            ]}
            onClearAll={() => { setFilterJobId(''); setFilterStatus(''); }}
          />

          {/* Pipeline */}
          <div className="flex items-stretch gap-1 overflow-x-auto rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900">
            {PIPELINE_STAGES.map((stage, index) => {
              const count = applicants.filter((a) => a.status === stage).length;
              return (
                <React.Fragment key={stage}>
                  <div className="flex min-w-25 flex-1 flex-col items-center gap-0.5 rounded-lg px-3 py-2.5 text-center">
                    <p className="text-xl font-bold text-neutral-900 dark:text-neutral-100">{count}</p>
                    <p className="text-xs font-medium capitalize text-neutral-500 dark:text-neutral-400">{stage}</p>
                  </div>
                  {index < PIPELINE_STAGES.length - 1 && (
                    <span className="material-symbols-outlined self-center text-neutral-300 dark:text-neutral-700">chevron_right</span>
                  )}
                </React.Fragment>
              );
            })}
          </div>

          <DataTable
            columns={applicantColumns}
            rows={filteredApplicants}
            rowKey="_id"
            emptyTitle="No applicants match the current filters"
            emptyDescription={filterJobId || filterStatus ? 'Try clearing a filter to see more results.' : undefined}
            emptyAction={filterJobId || filterStatus ? { label: 'Clear filters', onClick: () => { setFilterJobId(''); setFilterStatus(''); } } : undefined}
          />
        </div>
      )}

      {/* Job Form Modal */}
      <Modal
        open={showJobForm}
        onClose={() => setShowJobForm(false)}
        title={editingJob ? 'Edit Job Posting' : 'Post New Job'}
        footer={
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowJobForm(false)}>
              Cancel
            </Button>
            <Button type="submit" form="job-form" disabled={saving}>
              {saving ? 'Saving…' : editingJob ? 'Update Job' : 'Post Job'}
            </Button>
          </div>
        }
      >
        <form id="job-form" onSubmit={handleJobSubmit} className="space-y-4">
          <Input
            label="Job Title *"
            value={jobForm.title}
            onChange={(e) => setJobForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Senior UX Designer"
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Department"
              value={jobForm.department}
              onChange={(e) => setJobForm((f) => ({ ...f, department: e.target.value }))}
              placeholder="HR, IT, Finance…"
            />
            <Input
              label="Location"
              value={jobForm.location}
              onChange={(e) => setJobForm((f) => ({ ...f, location: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Type"
              value={jobForm.type}
              onChange={(e) => setJobForm((f) => ({ ...f, type: e.target.value }))}
              options={TYPE_OPTIONS}
            />
            <Input
              label="Openings"
              type="number"
              min={1}
              value={jobForm.openings}
              onChange={(e) => setJobForm((f) => ({ ...f, openings: Number(e.target.value) }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Experience Required"
              value={jobForm.experience}
              onChange={(e) => setJobForm((f) => ({ ...f, experience: e.target.value }))}
              placeholder="e.g. 2-4 years"
            />
            <Input
              label="Salary Range"
              value={jobForm.salaryRange}
              onChange={(e) => setJobForm((f) => ({ ...f, salaryRange: e.target.value }))}
              placeholder="e.g. ₹6L–₹10L"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Closing Date"
              type="date"
              value={jobForm.closingDate}
              onChange={(e) => setJobForm((f) => ({ ...f, closingDate: e.target.value }))}
            />
            <Select
              label="Status"
              value={jobForm.status}
              onChange={(e) => setJobForm((f) => ({ ...f, status: e.target.value }))}
              options={JOB_STATUS_OPTIONS}
            />
          </div>
          <div>
            <span className="mb-1.5 block text-sm font-bold text-neutral-700 dark:text-neutral-200">Job Description</span>
            <textarea
              rows={4}
              className="min-h-11 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
              value={jobForm.description}
              onChange={(e) => setJobForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Describe the role, responsibilities, requirements…"
            />
          </div>
          {formError && <p className="text-xs text-rose-600">{formError}</p>}
        </form>
      </Modal>
    </div>
  );
}
