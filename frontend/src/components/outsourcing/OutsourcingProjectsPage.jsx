import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import { resolveCanonicalProjects } from '../../config/projectNames';
import { OutsourcingPageHeader } from '../../features/outsourcing/components/OutsourcingUI';

// Backend access logic — unchanged
const isFreelancerUser = (user) => String(user?.role || '').trim().toLowerCase() === 'freelancer';

const hasProjectAccess = (project, user) =>
  Boolean(
    isFreelancerUser(user) ||
    project?.access?.canUseApi ||
    project?.accessGranted ||
    project?.access?.canLaunch ||
    project?.code === 'EEC'
  );

const canOpenProject = (project, user) =>
  Boolean(project?.code !== 'EFNBMMS' && project?.code !== 'EEC' && (isFreelancerUser(user) || project?.access?.canLaunch));

const ACCENTS = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#6366f1', '#ef4444'];

const StatCard = ({ icon, label, count, accent, loading: ld }) => (
  <div className="relative overflow-hidden rounded-2xl border border-neutral-200 bg-white p-4 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
    <div className="absolute inset-x-0 top-0 h-0.5" style={{ background: accent }} />
    <div className="mb-3 flex items-center justify-between">
      <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: `${accent}18` }}>
        <span className="material-symbols-outlined text-[19px]" style={{ color: accent }}>{icon}</span>
      </div>
      {ld
        ? <div className="h-7 w-10 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-800" />
        : <span className="text-2xl font-black text-neutral-900 dark:text-white">{count}</span>}
    </div>
    <p className="text-[11px] font-bold uppercase tracking-wider text-neutral-500 dark:text-neutral-400">{label}</p>
  </div>
);

export default function OutsourcingProjectsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [launchingProject, setLaunchingProject] = useState('');
  const [launchError, setLaunchError] = useState({ code: '', message: '' });
  const [jobs, setJobs] = useState([]);
  const [jobsLoading, setJobsLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await outsourcingApi.getMyProjects(token);
      const data = response?.data || {};
      const resolved = resolveCanonicalProjects(data.projects || []);
      setProjects(resolved);
    } catch (e) {
      setError(e?.message || 'Failed to load project access hub');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const loadJobs = useCallback(async () => {
    if (!token) return;
    setJobsLoading(true);
    try {
      const res = await outsourcingApi.getJobs(token);
      const myId = String(user?._id || '');
      const all = res?.data || [];
      const mine = user?.role === 'admin'
        ? all
        : all.filter((j) => !j.assignedFreelancer || String(j.assignedFreelancer?._id || j.assignedFreelancer) === myId);
      setJobs(mine);
    } catch (_) {}
    finally { setJobsLoading(false); }
  }, [token, user]);

  useEffect(() => { load(); loadJobs(); }, [load, loadJobs]);

  const jobStats = useMemo(() => {
    const now = new Date();
    const week = new Date(now); week.setDate(week.getDate() + 7);
    return {
      total:     jobs.length,
      active:    jobs.filter((j) => j.status === 'in_progress').length,
      pending:   jobs.filter((j) => j.status === 'pending').length,
      upcoming:  jobs.filter((j) => j.acceptanceStatus === 'accepted' && j.status !== 'in_progress' && j.status !== 'completed').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      overdue:   jobs.filter((j) => j.status !== 'completed' && j.dueDate && new Date(j.dueDate) < now).length,
    };
  }, [jobs]);

  const handleLaunch = async (projectCode) => {
    if (projectCode === 'EEC') {
      navigate('/outsourcing/edifyeight');
      return;
    }
    if (projectCode === 'EFNBMMS') {
      navigate('/outsourcing/efnbmms-admin-management');
      return;
    }
    try {
      setLaunchingProject(projectCode);
      setLaunchError({ code: '', message: '' });
      const response =
        projectCode === 'EEC'
          ? await outsourcingApi.generateEecSsoToken(token, { projectCode: 'EEC', redirectTo: '/dashboard' })
          : await outsourcingApi.generateProjectAccessToken(token, projectCode, { projectCode });
      const redirectUrl =
        response?.redirectUrl || response?.data?.redirectUrl || response?.data?.data?.redirectUrl;
      if (!redirectUrl) throw new Error(response?.message || 'Failed to resolve launch URL');
      window.location.assign(redirectUrl);
    } catch (e) {
      setLaunchError({ code: projectCode, message: e?.message || 'Access failed, try again' });
      setError(e.message || 'Failed to launch project');
    } finally {
      setLaunchingProject('');
    }
  };


  return (
    <div className="space-y-4">
      <OutsourcingPageHeader
        title="Projects"
        subtitle="Your linked project workspaces and access hub"
        icon="workspaces"
        accent="#3b82f6"
        action={
          <button
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        }
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
          {error}
        </div>
      )}

      {/* Job assignment summary */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <StatCard icon="work"          label="Total Assigned"    count={jobStats.total}     accent="#6366f1" loading={jobsLoading} />
        <StatCard icon="play_circle"   label="Active Projects"   count={jobStats.active}    accent="#3b82f6" loading={jobsLoading} />
        <StatCard icon="pending"       label="Pending Projects"  count={jobStats.pending}   accent="#f59e0b" loading={jobsLoading} />
        <StatCard icon="upcoming"      label="Upcoming Projects" count={jobStats.upcoming}  accent="#8b5cf6" loading={jobsLoading} />
        <StatCard icon="task_alt"      label="Completed"         count={jobStats.completed} accent="#10b981" loading={jobsLoading} />
      </div>

      {/* Project cards */}
      {loading ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-72 animate-pulse rounded-2xl bg-neutral-100 dark:bg-neutral-800" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-neutral-200 py-16 text-center dark:border-neutral-800">
          <span className="material-symbols-outlined text-4xl text-neutral-200 dark:text-neutral-700">folder_off</span>
          <p className="text-sm font-bold text-neutral-500">No projects found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {projects.map((project, index) => {
            const canLaunch = canOpenProject(project, user);
            const isEec = project.code === 'EEC';
            const isEfmbmms = project.code === 'EFNBMMS';
            const hasAccess = hasProjectAccess(project, user);
            const launchEnabled = !isEfmbmms && (isEec || canLaunch);
            const actionEnabled = (isEec || isEfmbmms) ? hasAccess : launchEnabled;
            const blockedReason = project?.access?.blockedReason || 'Access not available';
            const accent = ACCENTS[index % ACCENTS.length];
            const displayRole = isEfmbmms ? user?.role || project.role || 'freelancer' : project.role || 'member';

            return (
              <div
                key={project.code}
                className="relative flex flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="h-1 w-full" style={{ background: accent }} />
                <div className="flex flex-1 flex-col p-5">
                  {/* Card header */}
                  <div className="mb-4 flex items-start justify-between gap-3">
                    <div
                      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-xl font-black text-white"
                      style={{ background: accent }}
                    >
                      {(project.name || project.code || '?')[0]}
                    </div>
                    <span
                      className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                        hasAccess
                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'
                          : 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300'
                      }`}
                    >
                      {hasAccess ? (isEec || isEfmbmms ? 'API Access' : 'Accessible') : 'Blocked'}
                    </span>
                  </div>

                  {/* Name + code */}
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-neutral-900 dark:text-white">{project.name}</h3>
                    {project.code && (
                      <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-neutral-500 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-400">
                        {project.code}
                      </span>
                    )}
                  </div>
                  {project.description && (
                    <p className="mb-4 text-xs leading-relaxed text-neutral-500 dark:text-neutral-400">{project.description}</p>
                  )}

                  {/* Meta */}
                  <div className="mb-4 grid grid-cols-2 gap-1.5">
                    <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Role</p>
                      <p className="mt-0.5 text-xs font-semibold capitalize text-neutral-800 dark:text-neutral-100">{displayRole}</p>
                    </div>
                    <div className="rounded-xl bg-neutral-50 px-3 py-2 dark:bg-neutral-800">
                      <p className="text-[9px] font-bold uppercase tracking-wider text-neutral-400">Status</p>
                      <p className="mt-0.5 text-xs font-semibold capitalize text-neutral-800 dark:text-neutral-100">{project.status || '—'}</p>
                    </div>
                  </div>

                  {/* Access note */}
                  <div className="mb-4 flex items-center gap-2 rounded-xl border border-neutral-100 bg-neutral-50/70 px-3 py-2.5 dark:border-neutral-800 dark:bg-neutral-800/50">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${hasAccess ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                    <p className="text-xs text-neutral-600 dark:text-neutral-400">
                      {isEec
                        ? 'Teacher CRUD available inside this portal'
                        : canLaunch
                        ? 'Ready to open'
                          : isEfmbmms
                            ? 'Admin management API only'
                            : blockedReason}
                    </p>
                  </div>

                  {/* Launch error */}
                  {launchError.code === project.code && (
                    <p className="mb-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                      {launchError.message}
                    </p>
                  )}

                  {/* Launch button */}
                  <button
                    type="button"
                    disabled={!actionEnabled || launchingProject === project.code}
                    onClick={() => handleLaunch(project.code)}
                    className={`mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold shadow-sm transition disabled:opacity-70 ${
                      actionEnabled
                        ? 'text-white hover:-translate-y-0.5'
                        : 'cursor-not-allowed border border-neutral-200 bg-neutral-100 text-neutral-400 dark:border-neutral-700 dark:bg-neutral-800'
                    }`}
                    style={actionEnabled ? { background: accent } : {}}
                  >
                    <span className="material-symbols-outlined text-[17px]">
                      {launchingProject === project.code ? 'hourglass_top' : actionEnabled ? (isEec ? 'school' : isEfmbmms ? 'database' : 'open_in_new') : 'lock'}
                    </span>
                    {launchingProject === project.code
                      ? 'Connecting…'
                      : launchError.code === project.code
                        ? 'Retry'
                        : isEec
                          ? 'Open Workspace'
                          : isEfmbmms
                          ? 'View API data'
                          : launchEnabled
                          ? `Open ${project.code}`
                          : 'Locked'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
