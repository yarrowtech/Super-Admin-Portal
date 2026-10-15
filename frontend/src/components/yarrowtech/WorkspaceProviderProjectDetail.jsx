import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { organizationWorkspaceApi as api } from '../../services/organizationWorkspace';

const button = 'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm disabled:opacity-40';
const STATUSES = ['pending', 'ongoing', 'completed'];
const BADGE = {
  pending: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-300',
  ongoing: 'bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-300',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300',
};
const label = (status) => status.charAt(0).toUpperCase() + status.slice(1);
const formatDate = (value) => (value ? new Date(value).toLocaleDateString('en-GB') : '--');
const forInput = (value) => (value ? new Date(value).toISOString().slice(0, 10) : '');
const TABS = ['Overview', 'Requirements', 'Payments'];

export default function WorkspaceProviderProjectDetail({ projectId, canWrite, basePath }) {
  const { token } = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [tab, setTab] = useState('Overview');
  const [editing, setEditing] = useState(null); // 'project' | 'notes' | null
  const [draft, setDraft] = useState({});

  const query = useQuery({
    queryKey: ['yarrowtech-provider-project', token, projectId],
    queryFn: () => api.getRecords(token, `provider-projects/${encodeURIComponent(projectId)}`),
    enabled: Boolean(token && projectId),
  });
  const update = useMutation({
    mutationFn: (body) => api.updateRecord(token, `provider-projects/${encodeURIComponent(projectId)}`, body),
    onSuccess: async () => {
      setEditing(null);
      await Promise.all([
        client.invalidateQueries({ queryKey: ['yarrowtech-provider-project'] }),
        client.invalidateQueries({ queryKey: ['yarrowtech-provider-projects'] }),
      ]);
    },
  });

  const project = query.data?.data;
  const money = (value) => new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: project?.currency || 'INR', maximumFractionDigits: 0,
  }).format(Number(value) || 0);

  if (query.isPending) return <p role="status" className="py-4 text-sm text-neutral-500">Loading project...</p>;
  if (query.error) return <div className="space-y-4">
    <p role="alert" className="text-sm text-rose-600">{query.error.message}</p>
    <Link className={button} to={`${basePath}/projects`}>Back to projects</Link>
  </div>;
  if (!project) return null;

  const tiles = [
    ['person', 'Client', project.client.name || '--'],
    ['engineering', 'Tech lead', project.techLead || '--'],
    ['calendar_today', 'Created', formatDate(project.created)],
    ['event', 'Expected delivery', formatDate(project.delivery)],
    ['credit_card', 'Contract', money(project.payment.contractValue)],
    ['account_balance_wallet', 'Paid', `${money(project.payment.paid)} (${project.payment.percentPaid}%)`],
  ];

  const openProjectEditor = () => {
    update.reset();
    setDraft({ status: project.status, progress: project.progress, delivery: forInput(project.delivery) });
    setEditing('project');
  };
  const openNotesEditor = () => {
    update.reset();
    setDraft({ notes: project.notes });
    setEditing('notes');
  };

  return <section className="space-y-5">
    <header className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <button type="button" className={button} onClick={() => navigate(`${basePath}/projects`)}
            title="Back to projects" aria-label="Back to projects">
            <span aria-hidden="true" className="material-symbols-outlined text-lg">arrow_back</span>
          </button>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <span className="rounded-lg border px-2 py-1 text-xs text-neutral-500">{project.id}</span>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${BADGE[project.status]}`}>{label(project.status)}</span>
            </div>
            <p className="mt-1 text-sm text-neutral-500">
              Client: {project.client.name || '--'}{project.manager ? ` · Manager: ${project.manager}` : ''}
            </p>
          </div>
        </div>
        {canWrite ? <button type="button" className={button} onClick={openProjectEditor}>
          <span aria-hidden="true" className="material-symbols-outlined text-lg">edit</span> Edit project
        </button> : null}
      </div>
      <div className="flex items-center gap-3">
        <span className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <span className="block h-full rounded-full bg-orange-500" style={{ width: `${project.progress}%` }} />
        </span>
        <span className="text-sm font-semibold tabular-nums">{project.progress}% complete</span>
      </div>
      <dl className="grid gap-px overflow-hidden rounded-xl border bg-neutral-200 sm:grid-cols-2 xl:grid-cols-6 dark:bg-neutral-800">
        {tiles.map(([icon, text, value]) => <div key={text} className="bg-white p-4 dark:bg-neutral-950">
          <dt className="flex items-center gap-2 text-xs uppercase tracking-wide text-neutral-500">
            <span aria-hidden="true" className="material-symbols-outlined text-base">{icon}</span>{text}
          </dt>
          <dd className="mt-1 truncate font-semibold" title={value}>{value}</dd>
        </div>)}
      </dl>
    </header>

    <nav aria-label="Project sections" className="flex gap-4 border-b">
      {TABS.map((name) => <button key={name} type="button" onClick={() => setTab(name)}
        aria-current={tab === name ? 'page' : undefined}
        className={`-mb-px border-b-2 px-1 py-2 text-sm ${tab === name ? 'border-orange-500 font-semibold text-orange-600' : 'border-transparent text-neutral-500'}`}>
        {name}
        {name === 'Requirements' && project.requirements.approved
          ? <span aria-label="Requirements approved" className="ml-2 inline-block h-2 w-2 rounded-full bg-emerald-500 align-middle" /> : null}
        {name === 'Payments' && project.payment.count
          ? <span className="ml-2 rounded-full bg-neutral-100 px-2 py-0.5 text-xs dark:bg-neutral-800">{project.payment.count}</span> : null}
      </button>)}
    </nav>

    {tab === 'Overview' ? <div className="grid gap-4 lg:grid-cols-2">
      <div className="rounded-xl border p-5">
        <h3 className="flex items-center gap-2 font-semibold">
          <span aria-hidden="true" className="material-symbols-outlined text-orange-500">person</span> Client
        </h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2 text-sm">
          {[['Name', project.client.name], ['Email', project.client.email], ['Phone', project.client.phone],
            ['Company', project.client.company], ['Client status', project.client.status], ['Client ID', project.client.id],
          ].map(([text, value]) => <div key={text}>
            <dt className="text-xs uppercase tracking-wide text-neutral-500">{text}</dt>
            <dd className="mt-1 break-all">{value || '--'}</dd>
          </div>)}
        </dl>
      </div>

      <div className="rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <span aria-hidden="true" className="material-symbols-outlined text-orange-500">description</span> Project notes
          </h3>
          {canWrite ? <button type="button" className="text-sm font-semibold text-orange-600" onClick={openNotesEditor}>Edit</button> : null}
        </div>
        <p className="mt-4 whitespace-pre-wrap text-sm">{project.notes || <span className="text-neutral-500">No notes yet.</span>}</p>
      </div>

      <div className="rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <span aria-hidden="true" className="material-symbols-outlined text-orange-500">account_balance_wallet</span> Payment at a glance
          </h3>
          <button type="button" className="text-sm font-semibold text-orange-600" onClick={() => setTab('Payments')}>Open</button>
        </div>
        <span className="mt-4 block h-2 overflow-hidden rounded-full bg-neutral-200 dark:bg-neutral-700">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${project.payment.percentPaid}%` }} />
        </span>
        <div className="mt-2 flex flex-wrap justify-between gap-2 text-sm">
          <span>Paid <strong>{money(project.payment.paid)}</strong></span>
          <span>Due <strong>{money(project.payment.due)}</strong></span>
          <span className="text-neutral-500">{project.payment.percentPaid}% of {money(project.payment.contractValue)}</span>
        </div>
      </div>

      <div className="rounded-xl border p-5">
        <div className="flex items-center justify-between">
          <h3 className="flex items-center gap-2 font-semibold">
            <span aria-hidden="true" className="material-symbols-outlined text-orange-500">description</span> Requirements (SRS)
          </h3>
          <button type="button" className="text-sm font-semibold text-orange-600" onClick={() => setTab('Requirements')}>Open</button>
        </div>
        <p className={`mt-4 text-sm ${project.requirements.approved ? 'font-semibold text-emerald-600' : 'text-neutral-500'}`}>
          {project.requirements.approved
            ? `Approved${project.requirements.approvedBy ? ` by ${project.requirements.approvedBy}` : ''}${project.requirements.approvedAt ? ` on ${formatDate(project.requirements.approvedAt)}` : ''}`
            : 'Not approved yet.'}
        </p>
      </div>
    </div> : null}

    {tab === 'Requirements' ? <div className="rounded-xl border p-5">
      <h3 className="font-semibold">Requirements (SRS)</h3>
      <p className={`mt-3 text-sm ${project.requirements.approved ? 'font-semibold text-emerald-600' : 'text-neutral-500'}`}>
        {project.requirements.approved
          ? `Approved${project.requirements.approvedBy ? ` by ${project.requirements.approvedBy}` : ''}${project.requirements.approvedAt ? ` on ${formatDate(project.requirements.approvedAt)}` : ''}`
          : 'Not approved yet.'}
      </p>
      <p className="mt-3 text-sm text-neutral-500">
        The provider does not expose SRS documents through a verified endpoint yet, so the approval state above is all we can show.
      </p>
    </div> : null}

    {tab === 'Payments' ? <div className="rounded-xl border p-5">
      <h3 className="font-semibold">Payments</h3>
      <dl className="mt-4 grid gap-4 sm:grid-cols-3 text-sm">
        {[['Contract', project.payment.contractValue], ['Paid', project.payment.paid], ['Due', project.payment.due]].map(([text, value]) => <div key={text}>
          <dt className="text-xs uppercase tracking-wide text-neutral-500">{text}</dt>
          <dd className="mt-1 text-lg font-semibold">{money(value)}</dd>
        </div>)}
      </dl>
      <p className="mt-4 text-sm text-neutral-500">
        {project.payment.count
          ? `The provider reports ${project.payment.count} payment${project.payment.count === 1 ? '' : 's'}. A verified payments endpoint is needed to list them individually.`
          : 'No individual payments reported by the provider.'}
      </p>
    </div> : null}

    {editing ? <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <form role="dialog" aria-modal="true" aria-labelledby="detail-editor-title"
        className="max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto rounded-lg bg-white p-6 dark:bg-neutral-950"
        onSubmit={(event) => {
          event.preventDefault();
          update.mutate(editing === 'notes' ? { notes: draft.notes } : {
            status: draft.status, progress: Number(draft.progress),
            delivery: draft.delivery ? new Date(draft.delivery).toISOString() : null,
          });
        }}>
        <h2 id="detail-editor-title" className="font-semibold">
          {editing === 'notes' ? 'Edit project notes' : `Edit ${project.name}`}
        </h2>
        {editing === 'notes'
          ? <label className="block text-sm">Notes
              <textarea rows={8} maxLength={5000} className="mt-1 w-full rounded-lg border bg-transparent p-2"
                value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} />
            </label>
          : <>
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
          </>}
        {update.error ? <p role="alert" className="text-sm text-rose-600">{update.error.message}</p> : null}
        <div className="flex justify-end gap-3">
          <button type="button" disabled={update.isPending} className={button} onClick={() => setEditing(null)}>Cancel</button>
          <button disabled={update.isPending} className={`${button} bg-emerald-600 text-white`}>{update.isPending ? 'Saving...' : 'Save changes'}</button>
        </div>
      </form>
    </div> : null}
  </section>;
}
