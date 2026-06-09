import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { projectAccessApi } from '../../services/projectAccess';
import {
  OutsourcingCard,
  OutsourcingEmptyState,
  OutsourcingErrorState,
  OutsourcingPageHeader,
} from '../../features/outsourcing/components/OutsourcingUI';

export default function OutsourcingProjectsPage() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [projects, setProjects] = useState([]);
  const [launchingProject, setLaunchingProject] = useState('');

  const load = async () => {
    if (!token) return;
    setLoading(true);
    setError('');

    try {
      const response = await projectAccessApi.getMyProjects(token);
      const projectsData = response?.data || {};
      const resolvedProjects = Array.isArray(projectsData.projects) ? projectsData.projects : [];
      setProjects(resolvedProjects.filter((project) => project.accessGranted));
    } catch (loadError) {
      setError(loadError?.message || 'Failed to load project access hub');
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
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const handleLaunch = async (projectCode) => {
    try {
      setLaunchingProject(projectCode);
      const response = await projectAccessApi.generateProjectAccessToken(token, projectCode, { projectCode });
      const redirectUrl = response?.data?.redirectUrl;
      if (redirectUrl) {
        window.location.assign(redirectUrl);
      }
    } catch (launchError) {
      setError(launchError.message || 'Failed to launch project');
    } finally {
      setLaunchingProject('');
    }
  };

  return (
    <div className="space-y-4">
      <OutsourcingPageHeader
      title="Project Access Hub"
      subtitle=""
      right={
        <button
            type="button"
            onClick={load}
            className="inline-flex items-center gap-2 rounded-xl border border-neutral-200 bg-white px-4 py-2 text-sm font-semibold text-neutral-700 shadow-sm transition hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-200 dark:hover:bg-neutral-800"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
            Refresh
          </button>
        }
      />

      {error ? <OutsourcingErrorState message={error} onRetry={load} /> : null}

      {loading ? (
        <OutsourcingCard>
          <div className="space-y-3">
            <div className="h-5 w-40 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="h-52 animate-pulse rounded-2xl border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-900" />
              ))}
            </div>
          </div>
        </OutsourcingCard>
      ) : projects.length === 0 ? (
        <OutsourcingCard>
          <OutsourcingEmptyState title="No projects assigned" subtitle="" />
        </OutsourcingCard>
      ) : (
        <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
          {projects.map((project) => {
            return (
              <OutsourcingCard key={project.code} className="flex min-h-[250px] flex-col">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold text-neutral-900 dark:text-white">{project.name}</h3>
                    </div>
                    <p className="mt-1 text-sm text-neutral-500 dark:text-neutral-400">Role: {project.role || 'member'}</p>
                  </div>
                </div>

                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    disabled={launchingProject === project.code}
                    onClick={() => handleLaunch(project.code)}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined text-[18px]">
                      {launchingProject === project.code ? 'hourglass_top' : 'open_in_new'}
                    </span>
                    {launchingProject === project.code ? 'Launching...' : 'Open Project'}
                  </button>
                </div>
              </OutsourcingCard>
            );
          })}
        </div>
      )}
    </div>
  );
}
