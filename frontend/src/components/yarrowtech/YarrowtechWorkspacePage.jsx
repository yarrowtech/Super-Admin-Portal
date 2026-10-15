import { Link, useLocation, useParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import './yarrowtech-workspace.css';
import { useAuth } from '../../context/AuthContext';
import { organizationWorkspaceApi as api } from '../../services/organizationWorkspace';
import WorkspaceRecords from './WorkspaceRecords';
import WorkspaceIntegrations from './WorkspaceIntegrations';
import WorkspaceProductUsers from './WorkspaceProductUsers';
import WorkspaceSettings from './WorkspaceSettings';
import YarrowtechSettings from './YarrowtechSettings';
import YarrowtechResourceDetail from './YarrowtechResourceDetail';
import YarrowtechServiceProjects from './YarrowtechServiceProjects';
import WorkspaceProviderProjects from './WorkspaceProviderProjects';
import WorkspaceProviderProjectDetail from './WorkspaceProviderProjectDetail';

const navigation = [
  ['Overview', '/overview', 'overview'], ['Projects', '/projects', 'overview'],
  ['Services', '/services', 'services'],
  ['Products', '/products', 'products'], ['Subscriptions', '/subscriptions', 'subscriptions'],
  ['Customers', '/crm/customers', 'crm'], ['Users', '/crm/users', 'crm'],
  ['Support', '/crm/support', 'crm'], ['Analytics', '/crm/analytics', 'crm'],
  ['Activity', '/crm/activity', 'crm'], ['Integrations', '/integrations', 'integrations'],
  ['Sync jobs', '/sync-jobs', 'integrations'], ['Sync history', '/sync-history', 'integrations'],
  ['Settings', '/settings', 'overview'],
];

export default function YarrowtechWorkspacePage() {
  const client = useQueryClient();
  const { token } = useAuth();
  const location = useLocation();
  const params = useParams();
  const basePath = location.pathname.toUpperCase().startsWith('/ADMIN/PROJECTS/YARROWTECH') ? '/admin/projects/YARROWTECH' : '/yarrowtech';
  const rawPath = location.pathname.slice(basePath.length).replace(/\/+$/, '') || '/overview';
  const path = rawPath.replace(/^\/admin\//, '/');
  const query = useQuery({ queryKey: ['yarrowtech-workspace', token], queryFn: () => api.getYarrowtechWorkspace(token), enabled: Boolean(token) });
  const data = query.data?.data;
  const selected = [...navigation].reverse().find(([, route]) => path.startsWith(route));
  const title = selected?.[0] || 'Overview';
  const group = selected?.[2] || 'overview';
  const primary = navigation.filter(([, route]) => ['/overview', '/projects', '/services', '/products', '/subscriptions', '/crm/customers', '/integrations', '/settings'].includes(route));
  const secondary = navigation.filter(([, , module]) => module === group && ['crm', 'integrations'].includes(group));
  const enabled = !selected || data?.modules.some((module) => module.id === selected[2] && module.enabled);
  const product = params.productId ? encodeURIComponent(params.productId) : '';
  const isIntegration = path.startsWith('/integrations') || path.startsWith('/sync-');
  const detail = params.serviceId ? { kind: 'service', resourceId: params.serviceId }
    : params.subscriptionId ? { kind: 'subscription', resourceId: params.subscriptionId }
    : params.customerId ? { kind: 'customer', resourceId: params.customerId }
    : params.ticketId ? { kind: 'ticket', resourceId: params.ticketId }
    : product && !['/settings', '/users', '/subscriptions', '/plans'].some((suffix) => path.endsWith(suffix)) ? { kind: 'product', resourceId: params.productId } : null;
  let resource;
  if (path === '/services/clients') resource = { path: 'projects/YARROWTECH/service-clients' };
  else if (path === '/services') resource = { path: 'projects/YARROWTECH/services', kind: 'service' };
  else if (path.endsWith('/subscriptions') || path === '/subscriptions') resource = { path: product ? 'products/' + product + '/subscriptions' : 'subscriptions?projectId=YARROWTECH', kind: 'subscription' };
  else if (product && path.endsWith('/plans')) resource = { path: 'products/' + product + '/plans', kind: 'plan' };
  else if (path === '/products') resource = { path: 'projects/YARROWTECH/products', kind: 'product' };
  else if (path === '/crm/customers') resource = { path: 'projects/YARROWTECH/customers', kind: 'customer' };
  else if (path === '/crm/support') resource = { path: 'projects/YARROWTECH/support/tickets', kind: 'ticket' };
  else if (path === '/crm/users') resource = { path: 'projects/YARROWTECH/users' };
  else if (path === '/crm/analytics') resource = { path: 'projects/YARROWTECH/analytics' };
  else if (path === '/crm/activity') resource = { path: 'projects/YARROWTECH/activity' };
  return <main className="portal-page yt-workspace pt-12 lg:pt-0"><div className="portal-page-inner space-y-5">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-200 pb-4 dark:border-neutral-800">
      <div><Link to="/admin/projects" className="text-sm text-neutral-500">House of Musa / Projects</Link><h1 className="mt-1 text-2xl font-semibold">YarrowTech <span className="yt-page-title">/ {title}</span></h1></div>
      <div className="yt-header-actions"><span className="yt-access">{data?.project.canWrite ? 'Manage workspace' : 'Read only'}</span><button type="button" title="Refresh workspace" aria-label="Refresh workspace" disabled={query.isFetching} onClick={() => client.invalidateQueries({ predicate: ({ queryKey }) => ['yarrowtech-workspace', 'workspace-records', 'yarrowtech-deliveries', 'workspace-integrations', 'project-workspace'].includes(queryKey[0]) })} className="inline-flex h-9 w-9 items-center justify-center rounded-lg border disabled:opacity-40"><span aria-hidden="true" className={`material-symbols-outlined w-5 overflow-hidden ${query.isFetching ? 'animate-spin' : ''}`}>refresh</span></button></div>
    </header>
    <nav aria-label="YarrowTech workspace" className="yt-primary-nav">{primary.filter(([, , module]) => !data || data.modules.some((item) => item.id === module && item.enabled)).map(([label, route, module]) => { const active = ['/settings', '/overview'].includes(route) ? path === route : route === '/projects' ? path.startsWith('/projects') : group === module && !path.startsWith('/projects') && path !== '/settings'; return <Link key={route} aria-current={active ? 'page' : undefined} to={basePath + route}>{route === '/crm/customers' ? 'CRM' : label}</Link>; })}</nav>
    {query.isPending ? <p role="status">Loading workspace...</p> : null}
    {query.error ? <p role="alert" className="text-rose-600">{query.error.message}</p> : null}
    {data ? <>
      <dl className="yt-metrics">{Object.entries(data.metrics).map(([key, value]) => <div key={key}><dt>{key === 'supportTickets' ? 'Support tickets' : key}</dt><dd>{new Intl.NumberFormat('en-IN').format(value)}</dd></div>)}</dl>
      {!enabled ? <p role="alert">This module is disabled in workspace settings.</p> : <>
        {path.startsWith('/services') || secondary.length ? <nav aria-label="Section navigation" className="yt-secondary-nav">{(path.startsWith('/services') ? [['Service catalog', '/services'], ['Clients', '/services/clients'], ['Service projects', '/services/projects']] : secondary).map(([label, route]) => <Link key={route} aria-current={path === route || (route === '/services' && Boolean(params.serviceId)) ? 'page' : undefined} to={basePath + route}>{label}</Link>)}</nav> : null}
        {detail ? <YarrowtechResourceDetail key={location.pathname} {...detail} basePath={basePath} canWrite={data.project.canWrite} /> : null}
        {!detail && resource ? <WorkspaceRecords key={location.pathname} {...resource} productId={params.productId} projectId="YARROWTECH" canWrite={data.project.canWrite} basePath={basePath} refreshKey={query.dataUpdatedAt} detailLinks canArchive showStatusFilter={Boolean(resource.kind)} /> : null}
        {path === '/services/projects' ? <YarrowtechServiceProjects canWrite={data.project.canWrite} /> : null}
        {product && path.endsWith('/settings') ? <YarrowtechSettings key={product} resourceId={params.productId} canWrite={data.project.canWrite} /> : null}
        {product && path.endsWith('/users') ? <WorkspaceProductUsers key={product} productId={params.productId} projectId="YARROWTECH" canWrite={data.project.canWrite} /> : null}
        {isIntegration ? <WorkspaceIntegrations key={location.pathname} projectId="YARROWTECH" integrations={data.integrations} canWrite={data.project.canWrite} integrationId={params.integrationId} jobsOnly={path.startsWith('/sync-')} /> : null}
        {path === '/projects' ? <WorkspaceProviderProjects key={location.pathname} projectId="YARROWTECH" canWrite={data.project.canWrite} basePath={basePath} /> : null}
        {params.providerProjectId ? <WorkspaceProviderProjectDetail key={location.pathname} projectId={params.providerProjectId} canWrite={data.project.canWrite} basePath={basePath} /> : null}
        {path === '/settings' ? <WorkspaceSettings key={data.project.code} workspace={data} /> : null}
        {path === '/overview' ? <><p className="text-sm">{data.project.description}</p><h2 className="text-lg font-semibold">Operational summary</h2><WorkspaceRecords path="projects/YARROWTECH/analytics" projectId="YARROWTECH" /></> : null}
      </>}
    </> : null}
  </div></main>;
}
