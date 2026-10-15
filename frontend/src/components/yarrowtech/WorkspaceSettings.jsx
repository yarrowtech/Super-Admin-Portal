import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { organizationWorkspaceApi as api } from '../../services/organizationWorkspace';

export default function WorkspaceSettings({ workspace }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const [form, setForm] = useState({ displayName: workspace.project.name, description: workspace.project.description, modules: workspace.configuration.modules });
  const mutation = useMutation({ mutationFn: () => api.updateRecord(token, `projects/${encodeURIComponent(workspace.project.code)}/workspace`, form), onSuccess: () => client.invalidateQueries({ queryKey: ['project-workspace'] }) });
  return <form className="max-w-2xl space-y-4" onSubmit={(event) => { event.preventDefault(); mutation.mutate(); }}><label className="block text-sm">Workspace name<input required maxLength={200} className="mt-1 w-full rounded-lg border bg-transparent p-2" value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} /></label><label className="block text-sm">Description<textarea maxLength={5000} className="mt-1 w-full rounded-lg border bg-transparent p-2" rows={4} value={form.description} onChange={(event) => setForm({ ...form, description: event.target.value })} /></label><fieldset><legend className="mb-2 text-sm font-medium">Modules</legend><div className="grid gap-3 sm:grid-cols-2">{workspace.modules.map((module) => <label key={module.id} className="flex items-center gap-2 text-sm"><input type="checkbox" disabled={module.id === 'overview'} checked={form.modules.includes(module.id)} onChange={(event) => setForm({ ...form, modules: event.target.checked ? [...form.modules, module.id] : form.modules.filter((id) => id !== module.id) })} />{module.name}</label>)}</div></fieldset>{mutation.error ? <p role="alert" className="text-rose-600">{mutation.error.message}</p> : null}{mutation.isSuccess ? <p role="status" className="text-emerald-700">Settings saved.</p> : null}<button disabled={mutation.isPending || !workspace.project.canWrite} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">{mutation.isPending ? 'Saving...' : 'Save settings'}</button></form>;
}
