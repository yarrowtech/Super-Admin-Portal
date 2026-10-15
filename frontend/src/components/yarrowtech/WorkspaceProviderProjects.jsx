import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { organizationWorkspaceApi as api } from '../../services/organizationWorkspace';

const button = 'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40';
const STATUSES = ['pending', 'ongoing', 'completed'];
const CARDS = [
  ['total', 'Total projects', 'layers'], ['pending', 'Pending', 'schedule'],
  ['ongoing', 'Ongoing', 'monitoring'], ['completed', 'Completed', 'check_circle'],
];
const BADGE = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  ongoing: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};
const label = (status) => status.charAt(0).toUpperCase() + status.slice(1);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '--');
const forInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');

export default function WorkspaceProviderProjects({ projectId = 'YARROWTECH', canWrite, basePath }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState({});

  const query = useQuery({
    queryKey: ['yarrowtech-provider-projects', token, projectId, search, status, page],
    queryFn: () => api.getRecords(token, `projects/${encodeURIComponent(projectId)}/provider-projects?page=${page}&search=${encodeURIComponent(search)}&status=${encodeURIComponent(status)}`),
    enabled: Boolean(token),
    placeholderData: (previous) => previous,
  });
  const update = useMutation({
    mutationFn: ({ id, body }) => api.updateRecord(token, `provider-projects/${encodeURIComponent(id)}`, body),
    onSuccess: async () => {
      setEditing(null);
      await client.invalidateQueries({ queryKey: ['yarrowtech-provider-projects'] });
    },
  });

  const data = query.data?.data;
  const summary = data?.summary || { total: 0, pending: 0, ongoing: 0, completed: 0 };
  const items = data?.items || [];

  const openEditor = (project) => {
    update.reset();
    setEditing(project);
    setDraft({ status: project.status, progress: project.progress, delivery: forInput(project.delivery) });
  };

  return <section className="space-y-5">
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map(([key, text, icon]) => <div key={key} className="flex items-center gap-3 rounded-xl border border-l-4 border-l-orange-400 p-4">
        <span aria-hidden="true" className="material-symbols-outlined rounded-lg bg-neutral-100 p-2 text-xl dark:bg-neutral-800">{icon}</span>
        <div><dt className="text-xs uppercase tracking-wide text-neutral-500">{text}</dt>
        <dd className="text-2xl font-semibold">{summary[key] ?? 0}</dd></div>
      </div>)}
    </dl>

    <div className="flex flex-wrap items-center gap-3">
      <label className="relative min-w-0 flex-1"><span className="sr-only">Search projects by name</span>
        <input type="search" value={search} placeholder="Search project by name..." maxLength={200}
          onChange={(event) => { setSearch(event.target.value); setPage(1); }}
          className="w-full rounded-lg border bg-transparent p-2 pl-3" />
      </label>
      <label><span className="sr-only">Filter by status</span>
        <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}
          className="rounded-lg border bg-transparent p-2">
          <option value="">All Status</option>
          {STATUSES.map((name) => <option key={name} value={name}>{label(name)}</option>)}
        </select>
      </label>
    </div>

    {query.error ? <p role="alert" className="text-sm text-rose-600">{query.error.message}</p> : null}
    {data && data.configured === false
      ? <p role="status" className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Provider projects are not available yet. {data.blockedBy}
        </p>
      : null}

    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead><tr className="bg-neutral-800 text-orange-300 dark:bg-neutral-900">
          <th className="p-3">ID</th><th className="p-3">Project</th><th className="p-3">Client</th>
          <th className="p-3">Status</th><th className="p-3">Progress</th><th className="p-3">Delivery</th>
          <th className="p-3">Action</th>
        </tr></thead>
        <tbody>{items.map((project) => <tr key={project.id} className="border-t">
          <td className="p-3">{project.id}</td>
          <td className="p-3 font-semibold">{project.name}</td>
          <td className="p-3">{project.client || '--'}</td>
          <td className="p-3"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[project.status]}`}>{label(project.status)}</span></td>
          <td className="p-3">
            <div className="flex items-center gap-2">
              <span className="h-2 w-24 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
                <span className="block h-full rounded-full bg-orange-500" style={{ width: `${project.progress}%` }} />
              </span>
              <span className="tabular-nums">{project.progress}%</span>
            </div>
          </td>
          <td className="p-3">{formatDate(project.delivery)}</td>
          <td className="p-3"><div className="flex gap-2">
            <Link className={button} to={`${basePath}/projects/${encodeURIComponent(project.id)}`}
              title={`Open ${project.name}`} aria-label={`Open ${project.name}`}>
              <span aria-hidden="true" className="material-symbols-outlined text-lg">open_in_new</span>
            </Link>
            {canWrite ? <button type="button" className={button} onClick={() => openEditor(project)}
              title={`Edit ${project.name}`} aria-label={`Edit ${project.name}`}>
              <span aria-hidden="true" className="material-symbols-outlined text-lg">edit</span>
            </button> : null}
          </div></td>
        </tr>)}</tbody>
      </table>
      {query.isPending ? <p role="status" className="py-4 text-sm text-neutral-500">Loading projects...</p>
        : items.length === 0 && data?.configured !== false ? <p className="py-4 text-sm text-neutral-500">No projects match this search.</p>
        : null}
    </div>

    <div className="flex items-center justify-end gap-3 text-sm">
      <button type="button" className={button} disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button>
      <span>Page {page}</span>
      <button type="button" className={button} disabled={page * 25 >= (data?.total || 0)} onClick={() => setPage(page + 1)}>Next</button>
    </div>

    {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="project-editor-title"
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg bg-white p-6 dark:bg-neutral-950"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate({ id: editing.id, body: {
            status: draft.status, progress: Number(draft.progress),
            delivery: draft.delivery ? new Date(draft.delivery).toISOString() : null,
          } });
        }}>
        <h2 id="project-editor-title" className="font-semibold">Edit {editing.name}</h2>
        <label className="block text-sm">Status
          <select className="mt-1 w-full rounded-lg border bg-transparent p-2" value={draft.status}
            onChange={(event) => setDraft({ ...draft, status: event.target.value })}>
            {STATUSES.map((name) => <option key={name} value={name}>{label(name)}</option>)}
          </select>
        </label>
        <label className="block text-sm">Progress (%)
          <input type="number" min={0} max={100} step={1} className="mt-1 w-full rounded-lg border bg-transparent p-2"
            value={draft.progress} onChange={(event) => setDraft({ ...draft, progress: event.target.value })} />
        </label>
        <label className="block text-sm">Delivery date
          <input type="date" className="mt-1 w-full rounded-lg border bg-transparent p-2"
            value={draft.delivery} onChange={(event) => setDraft({ ...draft, delivery: event.target.value })} />
        </label>
        {update.error ? <p role="alert" className="text-sm text-rose-600">{update.error.message}</p> : null}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={update.isPending} className={button} onClick={() => setEditing(null)}>Cancel</button>
          <button disabled={update.isPending} className={`${button} bg-emerald-600 text-white`}>{update.isPending ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </div> : null}
  </section>;
}
