import { useNavigate, useParams } from 'react-router-dom';
import { findCanonicalProject } from '../../config/projectNames';

const HostedProjectWorkspacePage = ({ portal = 'admin' }) => {
  const { projectCode } = useParams();
  const navigate = useNavigate();
  const project = findCanonicalProject({ code: projectCode }) || {
    code: String(projectCode || '').toUpperCase(),
    name: String(projectCode || 'Project').replaceAll('_', '-'),
    description: 'Project workspace.',
  };

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <button type="button" onClick={() => navigate(portal === 'admin' ? '/admin/projects' : '/outsourcing/projects')} className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-neutral-600 hover:text-blue-600 dark:text-neutral-300">
          <span className="material-symbols-outlined text-[18px]">arrow_back</span>
          Back to projects
        </button>
        <section className="overflow-hidden rounded-3xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-8 text-white sm:px-8">
            <p className="text-xs font-bold uppercase tracking-[0.2em] text-blue-100">HOUSE OF MUSA · Project Workspace</p>
            <h1 className="mt-2 text-3xl font-black">{project.name}</h1>
            <p className="mt-2 max-w-2xl text-sm text-blue-100">{project.description}</p>
          </div>
          <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Access</p>
              <p className="mt-2 font-black text-emerald-900 dark:text-emerald-100">Open</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Project code</p>
              <p className="mt-2 font-black text-neutral-900 dark:text-white">{project.code}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Live integration</p>
              <p className="mt-2 font-black text-amber-900 dark:text-amber-100">Awaiting hosted URL</p>
            </div>
          </div>
          <div className="border-t border-neutral-100 px-6 py-5 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-300 sm:px-8">
            This workspace is open. Live project data will appear here when its secure backend integration URL is configured.
          </div>
        </section>
      </div>
    </main>
  );
};

export default HostedProjectWorkspacePage;
