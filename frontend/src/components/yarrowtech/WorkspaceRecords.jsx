import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { organizationWorkspaceApi as api } from '../../services/organizationWorkspace';
import RecordEditor from './WorkspaceRecordEditor';

const resourcePath = { service: 'services', product: 'products', customer: 'customers', subscription: 'subscriptions', plan: 'plans', ticket: 'support/tickets' };
const icon = (name) => <span aria-hidden="true" className="material-symbols-outlined w-5 shrink-0 overflow-hidden text-lg leading-none">{name}</span>;
const buttonClass = 'inline-flex h-9 items-center justify-center gap-2 rounded-lg border border-neutral-300 px-3 text-sm font-medium disabled:opacity-40 dark:border-neutral-700';

export default function WorkspaceRecords({ path, kind, projectId = 'YARROWTECH', productId, canWrite = false, basePath = '/yarrowtech', refreshKey = 0, detailLinks = false, canArchive = false, showStatusFilter = false }) {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [editor, setEditor] = useState(null);
  const [cancelling, setCancelling] = useState(null);
  const [message, setMessage] = useState('');
  const [archiving, setArchiving] = useState(null);
  const [status, setStatus] = useState('all');
  const pathQuery = new URLSearchParams(path.split('?')[1] || '');
  pathQuery.set('projectId', projectId); pathQuery.set('page', page); pathQuery.set('limit', 25); pathQuery.set('search', search);
  if (showStatusFilter) pathQuery.set('status', status);
  const requestedPath = `${path.split('?')[0]}?${pathQuery.toString()}`;
  const query = useQuery({ queryKey: ['workspace-records', token, requestedPath, refreshKey], queryFn: ({ signal }) => api.getRecords(token, requestedPath, { signal }), enabled: Boolean(token) });
  const options = useQuery({ queryKey: ['workspace-options', token, projectId], queryFn: async ({ signal }) => {
    const load = async (type) => {
      const items = [];
      for (let number = 1; ; number += 1) {
        const response = await api.getRecords(token, `projects/${encodeURIComponent(projectId)}/${type}?page=${number}&limit=100`, { signal });
        items.push(...response.data.items);
        if (items.length >= response.data.total) return items;
        if (!response.data.items.length || number >= 100) throw new Error('Too many relationship options');
      }
    };
    const [products, customers, plans] = await Promise.all(['products', 'customers', 'plans'].map(load));
    return { products, customers, plans };
  }, enabled: Boolean(token && editor && ['subscription', 'plan', 'ticket'].includes(kind)) });
  const refresh = async () => {
    await Promise.all(['workspace-records', 'workspace-options', 'project-workspace', 'yarrowtech-workspace'].map((key) => queryClient.invalidateQueries({ queryKey: [key] })));
  };
  const save = useMutation({ mutationFn: ({ record, body }) => {
    if (record?._id) return api.updateRecord(token, `${resourcePath[record.kind]}/${record._id}?projectId=${encodeURIComponent(projectId)}`, { ...body, version: record.__v });
    const target = kind === 'subscription' ? 'subscriptions' : `projects/${encodeURIComponent(projectId)}/${resourcePath[kind]}`;
    return api.createRecord(token, target, { ...body, ...(kind === 'subscription' ? { projectId } : {}) });
  }, onSuccess: async () => { setEditor(null); setMessage('Saved.'); await refresh(); } });
  const cancel = useMutation({ mutationFn: (record) => api.command(token, `subscriptions/${record._id}/cancel?projectId=${encodeURIComponent(projectId)}`), onSuccess: async () => { setCancelling(null); setMessage('Subscription cancelled.'); await refresh(); } });
  const archive = useMutation({ mutationFn: (record) => api.command(token, `${resourcePath[record.kind]}/${record._id}/archive`), onSuccess: async () => { setArchiving(null); setMessage('Archived.'); await refresh(); } });
  const data = query.data?.data;
  const items = data?.items || (data?.product ? [data.product] : data ? [data] : []);
  const pages = Math.max(1, Math.ceil((data?.total || 0) / 25));
  return <section className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <input aria-label="Search records" type="search" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search" className="h-9 w-full rounded-lg border border-neutral-300 bg-transparent px-3 text-sm sm:w-64 dark:border-neutral-700" />
      {showStatusFilter ? <select aria-label="Filter record status" className="h-9 rounded-lg border bg-transparent px-3 text-sm" value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}>{['all', ...(kind === 'ticket' ? ['open', 'in_progress', 'resolved', 'closed'] : ['active', 'inactive']), ...(kind === 'subscription' ? ['cancelled'] : []), ...(['service', 'product'].includes(kind) ? ['archived'] : [])].map((value) => <option key={value} value={value}>{value.replaceAll('_', ' ')}</option>)}</select> : null}
      <div className="flex gap-2"><button type="button" className={buttonClass} title="Refresh records" aria-label="Refresh records" onClick={() => query.refetch()}>{icon('refresh')}</button>
        {canWrite && kind && !data?.product && !data?._id ? <button type="button" aria-label="Add record" className={`${buttonClass} bg-emerald-600 text-white`} onClick={() => { save.reset(); setEditor({ idempotencyKey: crypto.randomUUID() }); setMessage(''); }}>{icon('add')} Add</button> : null}</div>
    </div>
    {message ? <p role="status" className="text-sm text-emerald-700">{message}</p> : null}
    {query.isPending ? <p role="status">Loading records...</p> : null}
    {query.error ? <p role="alert" className="text-sm text-rose-600">{query.error.message}</p> : null}
    {data?.counts ? <ul className="text-sm">{data.counts.map((row) => <li key={`${row._id.kind}-${row._id.status}`}>{row._id.kind}: {row._id.status} ({row.count})</li>)}</ul> : data && !query.error ? <>
      <div className="overflow-x-auto"><table className="yt-record-table w-full text-left text-sm"><thead><tr><th className="p-3">Name</th><th className="p-3">Status</th><th className="p-3">Updated</th><th className="p-3">Actions</th></tr></thead><tbody>{items.map((item, index) => <tr key={`${item._id}-${index}`} className="border-t border-neutral-200 dark:border-neutral-800">
        <td className="min-w-[180px] p-3"><span className="font-medium">{item.name || item.externalTransactionId || item.integrationId || '-'}</span>{item.description ? <p className="mt-1 max-w-lg break-words text-neutral-500">{item.description}</p> : null}{item.amountMinor !== undefined && item.currency ? <p className="mt-1">{new Intl.NumberFormat('en-IN', { style: 'currency', currency: item.currency }).format(item.amountMinor / 100)}{item.billingInterval ? ' / ' + item.billingInterval : ''}</p> : null}{item.action ? <p>{item.action} ({item.kind})</p> : null}{item.error ? <p className="text-rose-600">{item.error}</p> : null}</td>
        <td className="p-3"><span className="yt-status" data-status={item.archivedAt ? 'archived' : item.status}>{(item.archivedAt ? 'archived' : item.status || item.action || item.role || '-').replaceAll('_', ' ')}</span></td><td className="whitespace-nowrap p-3">{item.updatedAt || item.at ? new Date(item.updatedAt || item.at).toLocaleString() : '-'}</td>
        <td className="p-3"><div className="flex gap-2">{item.kind === 'product' ? <Link className={buttonClass} to={`${basePath}/products/${item._id}`} title="Open product" aria-label={`Open ${item.name}`}>{icon('open_in_new')}</Link> : null}
          {detailLinks && ['service', 'customer', 'subscription', 'ticket'].includes(item.kind) ? <Link className={buttonClass} to={`${basePath}/${item.kind === 'ticket' ? 'crm/support' : item.kind === 'customer' ? 'crm/customers' : resourcePath[item.kind]}/${item._id}`} title="Open details" aria-label={`Open ${item.name}`}>{icon('open_in_new')}</Link> : null}
          {canWrite && item.kind && item.source === 'internal' && !item.archivedAt && item.status !== 'cancelled' ? <button type="button" className={buttonClass} title="Edit record" aria-label={`Edit ${item.name}`} onClick={() => { save.reset(); setEditor(item); }}>{icon('edit')}</button> : null}
          {canWrite && item.kind === 'subscription' && item.source === 'internal' && !item.archivedAt && item.status !== 'cancelled' ? <button type="button" className={buttonClass} title="Cancel subscription" aria-label={`Cancel ${item.name}`} onClick={() => { cancel.reset(); setCancelling(item); }}>{icon('cancel')}</button> : null}
          {canWrite && canArchive && ['service', 'product'].includes(item.kind) && item.source === 'internal' && !item.archivedAt ? <button type="button" className={buttonClass} title="Archive record" aria-label={`Archive ${item.name}`} onClick={() => { archive.reset(); setArchiving(item); }}>{icon('archive')}</button> : null}
        </div></td></tr>)}</tbody></table>{!items.length ? <p className="p-6 text-sm text-neutral-500">No records found.</p> : null}</div>
      {data?.total !== undefined ? <div className="flex items-center justify-between gap-2 text-sm"><span>{data.total} records - Page {page} of {pages}</span><div className="flex gap-2"><button className={buttonClass} title="Previous page" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage(page - 1)}>{icon('chevron_left')}</button><button className={buttonClass} title="Next page" aria-label="Next page" disabled={page >= pages} onClick={() => setPage(page + 1)}>{icon('chevron_right')}</button></div></div> : null}
    </> : null}
    {data?.product ? <nav className="flex flex-wrap gap-4 border-t pt-4 text-sm"><Link to={`${basePath}/products/${data.product._id}/subscriptions`}>Subscriptions</Link><Link to={`${basePath}/products/${data.product._id}/plans`}>Plans</Link><Link to={`${basePath}/products/${data.product._id}/users`}>Users</Link></nav> : null}
    {editor ? <RecordEditor key={editor._id || editor.idempotencyKey} kind={editor.kind || kind} record={editor} productId={productId} options={options.data} optionsLoading={!editor._id && options.isPending && ['subscription', 'plan', 'ticket'].includes(kind)} error={save.error?.message || options.error?.message} saving={save.isPending} onClose={() => setEditor(null)} onSave={(body) => save.mutate({ record: editor, body })} /> : null}
    {cancelling ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div role="dialog" aria-modal="true" aria-labelledby="cancel-title" className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-neutral-950"><h2 id="cancel-title" className="text-lg font-semibold">Cancel {cancelling.name}?</h2>{cancel.error ? <p role="alert" className="mt-3 text-rose-600">{cancel.error.message}</p> : null}<div className="mt-6 flex justify-end gap-3"><button className={buttonClass} disabled={cancel.isPending} onClick={() => setCancelling(null)}>Keep subscription</button><button className={`${buttonClass} bg-rose-600 text-white`} disabled={cancel.isPending} onClick={() => cancel.mutate(cancelling)}>{cancel.isPending ? 'Cancelling...' : 'Cancel subscription'}</button></div></div></div> : null}
    {archiving ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"><div role="dialog" aria-modal="true" aria-labelledby="archive-title" className="w-full max-w-md rounded-lg bg-white p-6 dark:bg-neutral-950"><h2 id="archive-title" className="text-lg font-semibold">Archive {archiving.name}?</h2>{archive.error ? <p role="alert" className="mt-3 text-rose-600">{archive.error.message}</p> : null}<div className="mt-6 flex justify-end gap-3"><button className={buttonClass} disabled={archive.isPending} onClick={() => setArchiving(null)}>Cancel</button><button className={buttonClass} disabled={archive.isPending} onClick={() => archive.mutate(archiving)}>{archive.isPending ? 'Archiving...' : 'Archive'}</button></div></div></div> : null}
  </section>;
}
