import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { organizationWorkspaceApi as api } from '../../services/organizationWorkspace';
import WorkspaceRecords from './WorkspaceRecords';
import YarrowtechSettings from './YarrowtechSettings';
import YarrowtechServiceProjects from './YarrowtechServiceProjects';

export default function YarrowtechResourceDetail({ resourceId, kind, basePath, canWrite }) {
  const { token } = useAuth();
  const resources = { service: 'services', product: 'products', customer: 'customers', subscription: 'subscriptions', ticket: 'support/tickets' };
  const path = `${resources[kind]}/${encodeURIComponent(resourceId)}?projectId=YARROWTECH`;
  const query = useQuery({ queryKey: ['workspace-records', token, path], queryFn: () => api.getRecords(token, path) });
  if (query.isPending) return <p role="status">Loading details...</p>;
  if (query.error) return <p role="alert" className="text-rose-600">{query.error.message}</p>;
  const record = query.data.data;
  return <section className="space-y-5"><h2 className="text-lg font-semibold">{record.name}</h2><WorkspaceRecords path={path} kind={kind} projectId="YARROWTECH" canWrite={canWrite} basePath={basePath} />
    {kind === 'product' ? <nav className="flex flex-wrap gap-4 text-sm"><Link to={`${basePath}/products/${resourceId}/settings`}>Settings</Link><Link to={`${basePath}/products/${resourceId}/users`}>Users</Link><Link to={`${basePath}/products/${resourceId}/subscriptions`}>Subscriptions</Link><Link to={`${basePath}/products/${resourceId}/plans`}>Plans</Link></nav> : null}
    {kind === 'service' ? <><YarrowtechSettings resourceId={resourceId} kind="service" canWrite={canWrite} /><h3 className="font-semibold">Service projects</h3><YarrowtechServiceProjects serviceId={resourceId} canWrite={canWrite} /></> : null}
    {kind === 'subscription' ? <><dl className="grid gap-4 text-sm sm:grid-cols-3">{[['Start date', record.startsAt], ['End date', record.endsAt], ['Cancelled', record.cancelledAt]].map(([label, value]) => <div key={label}><dt className="text-neutral-500">{label}</dt><dd>{value ? new Date(value).toLocaleDateString() : '-'}</dd></div>)}</dl><h3 className="font-semibold">Payment history</h3><WorkspaceRecords path={`subscriptions/${encodeURIComponent(resourceId)}/payments`} projectId="YARROWTECH" /></> : null}
    <h3 className="font-semibold">History</h3><ul className="divide-y text-sm">{(record.history || []).map((entry, index) => <li key={entry._id || index} className="py-3">{entry.action} - {entry.at ? new Date(entry.at).toLocaleString() : ''}</li>)}</ul>
  </section>;
}
