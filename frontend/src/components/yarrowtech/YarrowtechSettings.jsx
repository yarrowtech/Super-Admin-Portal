import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { organizationWorkspaceApi as api } from '../../services/organizationWorkspace';

function SettingsForm({ data, path, kind, canWrite }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const [form, setForm] = useState({ category: data.settings?.category || '', ...(kind === 'product' ? { productCode: data.settings?.productCode || '', releaseVersion: data.settings?.releaseVersion || '', notificationsEnabled: data.settings?.notificationsEnabled ?? true } : {}) });
  const mutation = useMutation({ mutationFn: () => api.updateRecord(token, path, form), onSuccess: () => client.invalidateQueries({ queryKey: ['yarrowtech-settings'] }) });
  return <form className="max-w-xl space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><h2 className="text-lg font-semibold">{data.resource.name} settings</h2>{Object.entries(form).map(([key, value]) => <label key={key} className="block text-sm">{({ category: 'Category', productCode: 'Product identifier', releaseVersion: 'Release version', notificationsEnabled: 'Notifications enabled' })[key]}{typeof value === 'boolean' ? <input type="checkbox" className="ml-3" checked={value} disabled={!canWrite} onChange={(event) => setForm({ ...form, [key]: event.target.checked })} /> : <input className="mt-1 w-full rounded-lg border bg-transparent p-2" maxLength={100} required={key === 'productCode'} disabled={!canWrite} value={value} onChange={(event) => setForm({ ...form, [key]: event.target.value })} />}</label>)}{mutation.error ? <p role="alert" className="text-rose-600">{mutation.error.message}</p> : null}{mutation.isSuccess ? <p role="status" className="text-emerald-700">Settings saved.</p> : null}{canWrite ? <button disabled={mutation.isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Save settings'}</button> : null}</form>;
}
export default function YarrowtechSettings({ resourceId, kind = 'product', canWrite }) {
  const { token } = useAuth();
  const path = `${kind === 'product' ? 'products' : 'services'}/${encodeURIComponent(resourceId)}/settings`;
  const query = useQuery({ queryKey: ['yarrowtech-settings', token, path], queryFn: () => api.getRecords(token, path) });
  if (query.isPending) return <p role="status">Loading settings...</p>;
  if (query.error) return <p role="alert" className="text-rose-600">{query.error.message}</p>;
  return <SettingsForm key={path} data={query.data.data} path={path} kind={kind} canWrite={canWrite} />;
}
