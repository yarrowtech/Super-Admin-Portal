import React, { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { employeeApi } from '../../services/employee';

const STATUS_STYLES = {
  applied:   'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  screening: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  interview: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200',
  offered:   'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  hired:     'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  rejected:  'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const TYPE_COLOR = {
  'full-time':  'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  'part-time':  'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300',
  'contract':   'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'remote':     'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'internship': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
};

const DEMO_JOBS = [
  {
    _id: 'demo1', title: 'Senior Frontend Developer', department: 'IT', location: 'Remote',
    type: 'remote', experience: '3-5 years', salaryRange: '₹8L–₹14L', status: 'open', openings: 2,
    closingDate: '2026-07-30',
    description: 'We are looking for a skilled frontend developer to join our growing IT team. You will work on building modern, responsive web applications.',
  },
  {
    _id: 'demo2', title: 'HR Business Partner', department: 'HR', location: 'Company HQ',
    type: 'full-time', experience: '2-4 years', salaryRange: '₹5L–₹9L', status: 'open', openings: 1,
    closingDate: '2026-07-15',
    description: 'Join our HR team to drive people strategies, manage talent acquisition, and support business growth.',
  },
  {
    _id: 'demo3', title: 'Financial Analyst', department: 'Finance', location: 'Company HQ',
    type: 'full-time', experience: '1-3 years', salaryRange: '₹4L–₹7L', status: 'open', openings: 2,
    closingDate: '2026-08-01',
    description: 'Analyze financial data, prepare reports, and support strategic financial planning for our growing company.',
  },
  {
    _id: 'demo4', title: 'Content Writer', department: 'Media', location: 'Remote',
    type: 'part-time', experience: '1-2 years', salaryRange: '₹2L–₹4L', status: 'open', openings: 3,
    closingDate: '2026-07-20',
    description: 'Create engaging blog posts, social media content, and marketing collateral for our brand.',
  },
];

const DEMO_APPLICATIONS = [
  { _id: 'dapp1', jobTitle: 'Senior Frontend Developer', position: 'Senior Frontend Developer', status: 'screening', appliedDate: '2026-06-01' },
];

export default function EmployeeJobBoard() {
  const { token, user } = useAuth();
  const toast = useToast();

  const [tab, setTab] = useState(0);
  const [jobs, setJobs] = useState([]);
  const [myApps, setMyApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterDept, setFilterDept] = useState('');
  const [filterType, setFilterType] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applyForm, setApplyForm] = useState({ phone: '', coverLetter: '', experience: '' });
  const [applying, setApplying] = useState(false);
  const [applyError, setApplyError] = useState('');

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [jobsRes, appsRes] = await Promise.allSettled([
        employeeApi.getJobOpenings(token),
        employeeApi.getMyApplications(token),
      ]);
      const jobData = jobsRes.status === 'fulfilled' ? (jobsRes.value?.data || []) : [];
      const appData = appsRes.status === 'fulfilled'
        ? (appsRes.value?.data?.applicants || appsRes.value?.data || [])
        : [];
      setJobs(jobData.length ? jobData : DEMO_JOBS);
      setMyApps(appData.length ? appData : DEMO_APPLICATIONS);
    } catch {
      setJobs(DEMO_JOBS);
      setMyApps(DEMO_APPLICATIONS);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { loadData(); }, [loadData]);

  const openApply = (job) => {
    setSelectedJob(job);
    setApplyForm({ phone: '', coverLetter: '', experience: '' });
    setApplyError('');
    setShowApplyModal(true);
  };

  const handleApply = async (e) => {
    e.preventDefault();
    if (!selectedJob) return;
    setApplyError('');
    setApplying(true);
    try {
      const payload = {
        job: selectedJob._id.startsWith('demo') ? undefined : selectedJob._id,
        jobTitle: selectedJob.title,
        position: selectedJob.title,
        department: selectedJob.department,
        name: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || user?.email || 'Employee',
        email: user?.email || '',
        phone: applyForm.phone,
        coverLetter: applyForm.coverLetter,
        experience: applyForm.experience,
        source: 'internal',
      };
      if (!selectedJob._id.startsWith('demo')) {
        await employeeApi.applyForJob(token, payload);
        toast?.success?.('Application submitted!');
      } else {
        toast?.success?.('Application submitted! (Demo mode)');
        setMyApps(prev => [...prev, {
          _id: `dapp_${Date.now()}`,
          jobTitle: selectedJob.title,
          position: selectedJob.title,
          status: 'applied',
          appliedDate: new Date().toISOString(),
        }]);
      }
      setShowApplyModal(false);
      if (!selectedJob._id.startsWith('demo')) loadData();
    } catch (err) {
      setApplyError(err?.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const departments = [...new Set(jobs.map(j => j.department).filter(Boolean))];
  const types = [...new Set(jobs.map(j => j.type).filter(Boolean))];

  const filteredJobs = jobs.filter(j => {
    if (filterDept && j.department !== filterDept) return false;
    if (filterType && j.type !== filterType) return false;
    return true;
  });

  const appliedJobIds = new Set(myApps.map(a => a.job || '').filter(Boolean));
  const appliedTitles = new Set(myApps.map(a => a.position || a.jobTitle || ''));

  const hasApplied = (job) =>
    appliedJobIds.has(job._id) || appliedTitles.has(job.title);

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-4 md:p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">Job Board</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-400">Browse open positions and apply internally</p>
      </div>

      {/* Tabs */}
      <div className="mb-6 flex gap-1 rounded-lg border border-neutral-200 bg-white p-1 dark:border-neutral-800 dark:bg-neutral-900 w-fit">
        {['Open Positions', 'My Applications'].map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${tab === i ? 'bg-primary text-white shadow-sm' : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'}`}>
            {t}
            {i === 1 && myApps.length > 0 && (
              <span className="ml-1.5 rounded-full bg-primary/20 px-1.5 py-0.5 text-xs text-primary dark:bg-primary/30">{myApps.length}</span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-neutral-400">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
        </div>
      ) : tab === 0 ? (
        /* ─── OPEN POSITIONS ─── */
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-center">
            <select value={filterDept} onChange={e => setFilterDept(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={filterType} onChange={e => setFilterType(e.target.value)}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100">
              <option value="">All Types</option>
              {types.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <span className="text-xs text-neutral-500">{filteredJobs.length} position{filteredJobs.length !== 1 ? 's' : ''} available</span>
          </div>

          {filteredJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-neutral-200 bg-white py-16 dark:border-neutral-800 dark:bg-neutral-900 text-neutral-400">
              <span className="material-symbols-outlined text-4xl mb-2">work_off</span>
              <p className="text-sm">No open positions right now.</p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredJobs.map(job => (
                <div key={job._id} className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900 flex flex-col gap-3">
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="font-semibold text-neutral-900 dark:text-neutral-100 leading-tight">{job.title}</h3>
                      {job.openings > 1 && (
                        <span className="shrink-0 rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          {job.openings} openings
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {job.type && (
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${TYPE_COLOR[job.type] || TYPE_COLOR['full-time']}`}>
                          {job.type}
                        </span>
                      )}
                      {job.department && (
                        <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
                          {job.department}
                        </span>
                      )}
                    </div>
                    <div className="space-y-1 text-xs text-neutral-500 dark:text-neutral-400">
                      {job.location && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">location_on</span>{job.location}</p>}
                      {job.experience && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">workspace_premium</span>{job.experience} experience</p>}
                      {job.salaryRange && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">payments</span>{job.salaryRange}</p>}
                      {job.closingDate && <p className="flex items-center gap-1"><span className="material-symbols-outlined text-[14px]">event</span>Closes {new Date(job.closingDate).toLocaleDateString('en-IN')}</p>}
                    </div>
                    {job.description && (
                      <p className="mt-2 text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">{job.description}</p>
                    )}
                  </div>
                  <div className="mt-auto pt-1">
                    {hasApplied(job) ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-green-100 px-3 py-1.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-300">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Applied
                      </span>
                    ) : (
                      <button onClick={() => openApply(job)}
                        className="w-full rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors">
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ─── MY APPLICATIONS ─── */
        <div className="rounded-xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
          {myApps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <span className="material-symbols-outlined text-4xl mb-2">inbox</span>
              <p className="text-sm">You haven't applied to any positions yet.</p>
              <button onClick={() => setTab(0)} className="mt-4 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
                Browse Open Positions
              </button>
            </div>
          ) : (
            <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {myApps.map(app => (
                <div key={app._id} className="flex items-center justify-between p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <div>
                    <p className="font-medium text-neutral-900 dark:text-neutral-100">{app.position || app.jobTitle || 'Position'}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {app.department && <span className="text-xs text-neutral-500 dark:text-neutral-400">{app.department}</span>}
                      {app.appliedDate && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">
                          Applied {new Date(app.appliedDate).toLocaleDateString('en-IN')}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[app.status] || STATUS_STYLES.applied}`}>
                      {app.status || 'applied'}
                    </span>
                    {app.status === 'interview' && (
                      <span className="text-xs text-violet-600 dark:text-violet-400 font-medium">Interview scheduled</span>
                    )}
                    {app.status === 'offered' && (
                      <span className="text-xs text-amber-600 dark:text-amber-400 font-medium">Offer extended!</span>
                    )}
                    {app.status === 'hired' && (
                      <span className="text-xs text-green-600 dark:text-green-400 font-medium">Congratulations!</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-neutral-900">
            <div className="flex items-center justify-between border-b border-neutral-200 p-4 dark:border-neutral-800">
              <div>
                <h2 className="text-base font-bold text-neutral-900 dark:text-neutral-100">Apply for Position</h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{selectedJob.title}</p>
              </div>
              <button onClick={() => setShowApplyModal(false)} className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <form onSubmit={handleApply} className="p-4 space-y-4">
              {/* Pre-filled info */}
              <div className="rounded-lg bg-neutral-50 p-3 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400 space-y-1">
                <p><span className="font-medium">Name:</span> {user?.firstName} {user?.lastName}</p>
                <p><span className="font-medium">Email:</span> {user?.email}</p>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Phone Number</label>
                <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={applyForm.phone} onChange={e => setApplyForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="+91 XXXXX XXXXX" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Relevant Experience</label>
                <input className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={applyForm.experience} onChange={e => setApplyForm(f => ({ ...f, experience: e.target.value }))}
                  placeholder="e.g. 3 years in React development" />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-neutral-700 dark:text-neutral-300">Cover Letter <span className="text-neutral-400">(optional)</span></label>
                <textarea rows={4} className="w-full rounded-lg border border-neutral-300 bg-neutral-50 px-3 py-2 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-100"
                  value={applyForm.coverLetter} onChange={e => setApplyForm(f => ({ ...f, coverLetter: e.target.value }))}
                  placeholder="Briefly explain why you're a great fit for this role..." />
              </div>
              {applyError && <p className="text-xs text-rose-600">{applyError}</p>}
              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowApplyModal(false)}
                  className="rounded-lg border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300 dark:hover:bg-neutral-800">
                  Cancel
                </button>
                <button type="submit" disabled={applying}
                  className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-60">
                  {applying ? 'Submitting...' : 'Submit Application'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
