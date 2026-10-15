import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { organizationWorkspaceApi as api } from '../../services/organizationWorkspace';
import WorkspaceRecords from './WorkspaceRecords';

export default function WorkspaceProductUsers({ productId, projectId, canWrite }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const [userId, setUserId] = useState('');
  const [role, setRole] = useState('member');
  const [page, setPage] = useState(1);
  const users = useQuery({ queryKey: ['product-member-options', token, projectId, page], queryFn: () => api.getRecords(token, `projects/${encodeURIComponent(projectId)}/users?page=${page}&limit=100`), enabled: canWrite });
  const save = useMutation({ mutationFn: () => api.command(token, `products/${encodeURIComponent(productId)}/users?projectId=${encodeURIComponent(projectId)}`, { userId, role }), onSuccess: () => client.invalidateQueries({ queryKey: ['workspace-records'] }) });
  return <section className="space-y-5">{canWrite ? <form className="flex flex-wrap items-end gap-3" onSubmit={(event) => { event.preventDefault(); save.mutate(); }}><label className="text-sm">Project user<select required value={userId} onChange={(event) => setUserId(event.target.value)} className="mt-1 block max-w-full rounded-lg border bg-transparent p-2"><option value="">Select user</option>{users.data?.data.items.map((user) => <option key={user._id} value={user._id}>{user.name}</option>)}</select></label><label className="text-sm">Product role<select value={role} onChange={(event) => setRole(event.target.value)} className="mt-1 block rounded-lg border bg-transparent p-2">{['member', 'operator', 'manager'].map((value) => <option key={value} value={value}>{value}</option>)}</select></label><button disabled={save.isPending || users.isPending} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm text-white disabled:opacity-50">{save.isPending ? 'Saving...' : 'Assign user'}</button>{(users.data?.data.total || 0) > 100 ? <div className="flex gap-2 text-sm"><button type="button" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous users</button><button type="button" disabled={page * 100 >= users.data.data.total} onClick={() => setPage(page + 1)}>Next users</button></div> : null}</form> : null}{users.error || save.error ? <p role="alert" className="text-rose-600">{(users.error || save.error).message}</p> : null}{save.isSuccess ? <p role="status" className="text-emerald-700">Product membership saved.</p> : null}<WorkspaceRecords path={`products/${encodeURIComponent(productId)}/users`} projectId={projectId} /></section>;
}
