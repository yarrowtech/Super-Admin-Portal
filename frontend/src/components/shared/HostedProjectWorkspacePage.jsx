import { Link, useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { findCanonicalProject } from '../../config/projectNames';
import { organizationWorkspaceApi } from '../../services/organizationWorkspace';
import WorkspaceRecords from '../yarrowtech/WorkspaceRecords';
import WorkspaceIntegrations from '../yarrowtech/WorkspaceIntegrations';
import WorkspaceSettings from '../yarrowtech/WorkspaceSettings';
import WorkspaceProductUsers from '../yarrowtech/WorkspaceProductUsers';

const HostedProjectWorkspacePage = ({ portal = 'admin' }) => {
  const { projectCode, module, productId, view } = useParams();
  const activeModule = module || (productId ? 'products' : 'overview');
  const navigate = useNavigate();
  const { token } = useAuth();
  const query = useQuery({ queryKey: ['project-workspace', token, projectCode], queryFn: () => organizationWorkspaceApi.getProjectWorkspace(token, projectCode), enabled: Boolean(token && projectCode) });
  const state = { loading: query.isPending, error: query.error?.message, workspace: query.data?.data };
  const fallbackProject = findCanonicalProject({ code: projectCode }) || {
    code: String(projectCode || '').toUpperCase(),
    name: String(projectCode || 'Project').replaceAll('_', '-'),
    description: 'Project workspace.',
  };
  const workspace = state.workspace;
  const project = workspace?.project || fallbackProject;

  const basePath = `/${portal}/projects/${encodeURIComponent(projectCode)}`;
  const paths = {
    services: { path: `projects/${projectCode}/services`, kind: 'service' },
    products: { path: productId ? `products/${productId}/${view === 'plans' ? 'plans' : view === 'subscriptions' ? 'subscriptions' : view === 'users' ? 'users' : 'workspace'}` : `projects/${projectCode}/products`, kind: view === 'users' ? undefined : view === 'plans' ? 'plan' : view === 'subscriptions' ? 'subscription' : 'product' },
    subscriptions: { path: `subscriptions?projectId=${projectCode}`, kind: 'subscription' },
    customers: { path: `projects/${projectCode}/customers`, kind: 'customer' },
    support: { path: `projects/${projectCode}/support/tickets`, kind: 'ticket' },
    users: { path: `projects/${projectCode}/users` },
    analytics: { path: `projects/${projectCode}/analytics` },
    activity: { path: `projects/${projectCode}/audit-logs` },
  };
  const selected = paths[activeModule];

  return (
    <main className="portal-page pt-12 lg:pt-0">
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
          {state.loading ? <div className="p-6 text-sm text-neutral-500">Loading workspace...</div> : null}
          {state.error ? <div className="p-6 text-sm font-semibold text-rose-600">{state.error}</div> : null}
          <div className="grid gap-4 p-6 sm:grid-cols-3 sm:p-8">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30">
              <p className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Access</p>
              <p className="mt-2 font-black text-emerald-900 dark:text-emerald-100">{workspace ? 'Open' : 'Unavailable'}</p>
            </div>
            <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 dark:border-neutral-800 dark:bg-neutral-900">
              <p className="text-xs font-bold uppercase tracking-wider text-neutral-500">Project code</p>
              <p className="mt-2 font-black text-neutral-900 dark:text-white">{project.code}</p>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Sync status</p>
              <p className="mt-2 font-black text-amber-900 dark:text-amber-100">{workspace?.sync?.status || 'Not configured'}</p>
            </div>
          </div>
          {workspace ? (
            <div className="border-t border-neutral-100 px-6 py-5 dark:border-neutral-800 sm:px-8">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {workspace.modules.filter((module) => module.enabled).map((module) => (
                  <Link to={`${basePath}/${module.id === 'crm' ? 'customers' : module.id}`} key={module.id} className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 dark:border-neutral-800 dark:bg-neutral-900">
                    <p className="font-semibold text-neutral-900 dark:text-white">{module.name}</p>
                    <p className={`mt-1 text-sm ${module.enabled ? 'text-emerald-600' : 'text-neutral-500'}`}>{module.enabled ? 'Enabled' : 'Not configured'}</p>
                  </Link>
                ))}
              </div>
              <nav className="my-5 flex flex-wrap gap-4 text-sm">
                {['overview', 'services', 'products', 'subscriptions', 'customers', 'support', 'users', 'analytics', 'activity', 'integrations', 'settings'].map((item) => <Link className={activeModule === item ? 'font-semibold text-emerald-600' : ''} key={item} to={`${basePath}/${item}`}>{item.charAt(0).toUpperCase() + item.slice(1)}</Link>)}
                {project.code === 'YARROWTECH' ? <Link to="/yarrowtech/overview">YarrowTech portal</Link> : null}
                {project.code === 'EEC' ? <Link to="/admin/edifyeight-teachers">Teacher management</Link> : null}
                {project.code === 'EFNBMMS' ? <Link to="/admin/efnbmms-admin-management">Admin management</Link> : null}
              </nav>
              {productId && view === 'users' ? <WorkspaceProductUsers key={`${projectCode}-${productId}`} productId={productId} projectId={project.code} canWrite={project.canWrite} /> : selected ? <WorkspaceRecords key={`${projectCode}-${activeModule}-${productId || ''}-${view || ''}`} {...selected} productId={productId} projectId={project.code} canWrite={project.canWrite} basePath={basePath} /> : null}
              {activeModule === 'integrations' ? <WorkspaceIntegrations projectId={project.code} integrations={workspace.integrations} canWrite={project.canWrite} /> : null}
              {activeModule === 'settings' ? <WorkspaceSettings key={project.code} workspace={workspace} /> : null}
              {activeModule === 'overview' ? <WorkspaceRecords path={`projects/${project.code}/analytics`} /> : null}
            </div>
          ) : null}
        </section>
      </div>
    </main>
  );
};

export default HostedProjectWorkspacePage;
