import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { outsourcingApi } from '../../services/outsourcing';
import { resolveCanonicalProjects } from '../../config/projectNames';
import {
  OutsourcingCard,
  OutsourcingEmptyState,
  OutsourcingErrorState,
} from '../../features/outsourcing/components/OutsourcingUI';
import PortalHeader from '../common/PortalHeader';
import KPICard from '../common/KPICard';
import Button from '../common/Button';

const hasProjectAccess = (project) =>
  Boolean(project?.access?.canUseApi || project?.accessGranted || project?.access?.canLaunch || project?.code === 'EEC');

const canOpenProject = (project) => Boolean(
  project?.code !== 'EFNBMMS' &&
  (project?.access?.canLaunch || project?.code === 'EEC')
);

export default function AdminProjectsPage() {
  const { token, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [summary, setSummary] = useState({ total: 0, assigned: 0, accessible: 0, blocked: 0 });
  const [launchingProject, setLaunchingProject] = useState('');
  const [launchError, setLaunchError] = useState({ code: '', message: '' });
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const response = await outsourcingApi.getMyProjects(token);
      const projectsData = response?.data || {};
      const resolvedProjects = resolveCanonicalProjects(projectsData.projects || []);
      setProjects(resolvedProjects);
      setSummary({
        total: resolvedProjects.length,
        assigned: resolvedProjects.filter((project) => project.assigned).length,
        accessible: resolvedProjects.filter((project) => hasProjectAccess(project)).length,
        blocked: resolvedProjects.filter((project) => !hasProjectAccess(project)).length,
      });
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load project hub');
    }
    setLoading(false);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await load();
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const filteredProjects = useMemo(() => {
    const q = query.trim().toLowerCase();
    return projects.filter((project) => {
      const matchesQuery =
        !q ||
        [project.name, project.code, project.description, project.role, project.status]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q));
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'accessible' && hasProjectAccess(project)) ||
        (statusFilter === 'blocked' && !hasProjectAccess(project));
      return matchesQuery && matchesStatus;
    });
  }, [projects, query, statusFilter]);

  const accessibleCount = summary.accessible ?? projects.filter((p) => hasProjectAccess(p)).length;
  const blockedCount = summary.blocked ?? projects.filter((p) => !hasProjectAccess(p)).length;

  const handleLaunch = async (projectCode) => {
    if (projectCode === 'EFNBMMS') {
      navigate('/admin/efnbmms-admin-management');
      return;
    }
    try {
      setLaunchingProject(projectCode);
      setLaunchError({ code: '', message: '' });
      const response = projectCode === 'EEC'
        ? await outsourcingApi.generateEecSsoToken(token, { projectCode: 'EEC', redirectTo: '/dashboard' })
        : await outsourcingApi.generateProjectAccessToken(token, projectCode, { projectCode });
      const redirectUrl = response?.redirectUrl || response?.data?.redirectUrl || response?.data?.data?.redirectUrl;
      if (!redirectUrl) {
        throw new Error(response?.message || response?.error || 'Failed to resolve launch URL');
      }
      window.location.assign(redirectUrl);
    } catch (launchErr) {
      setLaunchError({
        code: projectCode,
        message: launchErr?.message || 'Access failed, try again',
      });
      setError(launchErr.message || 'Failed to launch project');
    } finally {
      setLaunchingProject('');
    }
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-4">
      <PortalHeader
        title="Project Workspaces"
        subtitle="Manage project allocation, access, and monitoring"
        icon="folder_open"
        showSearch={false}
        showNotifications={false}
        showThemeToggle
      >
        <Button variant="secondary" size="md" className="min-h-11" onClick={load} icon={<span className="material-symbols-outlined text-lg">refresh</span>}>
          Refresh
        </Button>
      </PortalHeader>

      {error ? <OutsourcingErrorState message={error} onRetry={load} /> : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <KPICard title="Total" value={summary.total || projects.length || 0} subtitle="Linked projects" icon="folder_open" compact />
        <KPICard title="Assigned" value={summary.assigned || 0} subtitle="Assigned to you" icon="assignment_ind" compact />
        <KPICard title="Accessible" value={accessibleCount} subtitle="Ready now" icon="lock_open" compact />
        <KPICard title="Blocked" value={blockedCount} subtitle="No access" icon="lock" compact />
      </div>

      <OutsourcingCard className="border-neutral-200/80 bg-white/95 dark:border-neutral-800 dark:bg-neutral-950">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-neutral-900 dark:text-white">Filter</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-[minmax(180px,1fr)_auto]">
            <label className="relative block">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">
                <span className="material-symbols-outlined text-[18px]">search</span>
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search"
                className="h-11 w-full rounded-2xl border border-neutral-300 bg-white pl-10 pr-3 text-sm text-neutral-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 dark:border-neutral-700 dark:bg-neutral-900 dark:text-white"
              />
            </label>
            <div className="inline-flex rounded-2xl border border-neutral-300 bg-white p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
              {[
                { value: 'all', label: 'All', icon: 'apps' },
                { value: 'accessible', label: 'Open', icon: 'lock_open' },
                { value: 'blocked', label: 'Locked', icon: 'lock' },
              ].map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setStatusFilter(item.value)}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition ${
                    statusFilter === item.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'text-neutral-600 hover:bg-neutral-100 dark:text-neutral-300 dark:hover:bg-neutral-800'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </OutsourcingCard>

      {loading ? (
        <OutsourcingCard>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="min-h-[180px] animate-pulse rounded-[24px] border border-neutral-200 bg-neutral-100 p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <div className="h-4 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-4 h-5 w-40 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-3 h-3 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-2 h-3 w-2/3 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mt-8 h-11 w-32 rounded-2xl bg-neutral-200 dark:bg-neutral-800" />
              </div>
            ))}
          </div>
        </OutsourcingCard>
      ) : filteredProjects.length === 0 ? (
        <OutsourcingCard>
          <OutsourcingEmptyState title="No projects found" subtitle="Try another filter." />
        </OutsourcingCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2 2xl:grid-cols-3">
          {filteredProjects.map((project, index) => {
            const canLaunch = canOpenProject(project);
            const isEec = project.code === 'EEC';
            const isEfmbmms = project.code === 'EFNBMMS';
            const hasAccess = hasProjectAccess(project);
            const launchEnabled = !isEfmbmms && (isEec || canLaunch);
            const actionEnabled = isEfmbmms ? hasAccess : launchEnabled;
            const blockedReason = project?.access?.blockedReason || 'Access not available';
            const displayRole = isEfmbmms ? user?.role || project.role || 'freelancer' : project.role || 'member';
            const accentClasses = [
              'from-blue-500 to-cyan-500',
              'from-violet-500 to-fuchsia-500',
              'from-emerald-500 to-teal-500',
              'from-amber-500 to-orange-500',
            ];
            const accent = accentClasses[index % accentClasses.length];
            return (
              <OutsourcingCard key={project.code} className="relative flex min-h-[220px] flex-col overflow-hidden border-neutral-200/80 bg-white/95 p-0 dark:border-neutral-800 dark:bg-neutral-950">
                <div className={`h-2 w-full bg-gradient-to-r ${accent}`} />
                <div className="flex h-full flex-col p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-xl font-black tracking-tight text-neutral-950 dark:text-white">{project.name}</h3>
                        {project.code ? (
                          <span className="rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-600 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-300">
                            {project.code}
                          </span>
                        ) : null}
                      </div>
                      {project.description ? (
                        <p className="mt-1.5 text-sm leading-6 text-neutral-600 dark:text-neutral-400">
                          {project.description}
                        </p>
                      ) : null}
                    </div>
                    <div className={`rounded-full px-3 py-1.5 text-xs font-semibold ${hasAccess ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300' : 'bg-rose-500/10 text-rose-700 dark:text-rose-300'}`}>
                      {hasAccess ? (isEfmbmms ? 'API Access' : 'Accessible') : 'Blocked'}
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <div className="rounded-2xl bg-neutral-50 p-2.5 dark:bg-neutral-900/60">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Role</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">{displayRole}</p>
                    </div>
                    <div className="rounded-2xl bg-neutral-50 p-2.5 dark:bg-neutral-900/60">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-neutral-500">Status</p>
                      <p className="mt-1 text-sm font-semibold text-neutral-900 dark:text-white">{project.status || 'unknown'}</p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-2.5 dark:border-neutral-800 dark:bg-neutral-900/50">
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex h-2.5 w-2.5 rounded-full ${hasAccess ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      <p className="text-sm font-semibold text-neutral-900 dark:text-white">
                        {canLaunch ? 'Ready to open' : isEec ? 'Open via SSO' : isEfmbmms ? 'Admin management API only' : 'Access blocked'}
                      </p>
                    </div>
                    <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                      {canLaunch ? 'Open now' : isEec ? 'SSO token required' : isEfmbmms ? 'Website launch is disabled' : blockedReason}
                    </p>
                  </div>

                  {launchError.code === project.code ? (
                    <div className="mt-3 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/60 dark:bg-rose-500/10 dark:text-rose-300">
                      <p className="font-semibold">
                        {launchError.message === 'Failed to resolve launch URL'
                          ? 'Access failed, try again'
                          : launchError.message}
                      </p>
                    </div>
                  ) : null}

                  <div className="mt-auto pt-4">
                    <button
                      type="button"
                      disabled={!actionEnabled || launchingProject === project.code}
                      onClick={() => handleLaunch(project.code)}
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                        actionEnabled
                          ? 'bg-blue-600 text-white hover:-translate-y-0.5 hover:bg-blue-700'
                          : 'cursor-not-allowed border border-neutral-200 bg-neutral-100 text-neutral-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-400'
                      } disabled:opacity-70`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {launchingProject === project.code ? 'hourglass_top' : actionEnabled ? (isEfmbmms ? 'database' : 'open_in_new') : 'lock'}
                      </span>
                      {launchingProject === project.code
                        ? 'Generating secure access...'
                        : launchError.code === project.code
                          ? 'Access failed, try again'
                          : isEfmbmms
                            ? 'View API data'
                            : launchEnabled
                            ? project.code === 'EEC'
                              ? 'Open EEC'
                              : 'Open'
                            : 'Locked'}
                    </button>
                  </div>
                </div>
              </OutsourcingCard>
            );
          })}
        </div>
      )}
      </div>
    </main>
  );
}
