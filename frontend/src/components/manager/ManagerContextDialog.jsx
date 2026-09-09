import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/client';

const day = value => value ? new Date(value).toLocaleDateString('en-IN') : 'Not set';
export default function ManagerContextDialog({ selection, onClose }) {
  const { token } = useAuth();
  const ref = useRef(null);
  const query = useQuery({
    queryKey: ['manager', 'context', token, selection?.kind, selection?.id],
    enabled: Boolean(selection && token),
    queryFn: async () => (await apiClient.get('/api/dept/manager/' + (selection.kind === 'employee' ? 'team' : 'projects') + '/' + selection.id + '/context', token)).data,
  });
  useEffect(() => {
    if (selection && ref.current && !ref.current.open) ref.current.showModal();
  }, [selection]);
  if (!selection) return null;
  const data = query.data;
  return createPortal(<dialog ref={ref} onCancel={onClose} onClose={onClose} className="m-auto max-h-[90dvh] w-[min(95vw,48rem)] overflow-y-auto rounded-2xl bg-white p-6 text-neutral-900 shadow-xl backdrop:bg-black/50 dark:bg-neutral-900 dark:text-neutral-100">
    <div className="mb-5 flex items-start justify-between gap-4"><h2 className="text-xl font-bold">{selection.title}</h2><button autoFocus onClick={onClose} className="rounded-lg border px-3 py-2" aria-label="Close detail">Close</button></div>
    {query.isPending ? <p role="status">Loading details...</p> : query.isError ? <div role="alert"><p>{query.error.message || 'Unable to load details'}</p><button onClick={() => query.refetch()} className="mt-3 rounded-lg border p-2">Retry</button></div> : <div className="space-y-5">
      <p className="text-sm">{data.record.description || [data.record.department, data.record.role].filter(Boolean).join(' / ')}</p>
      {data.record.teamMembers && <section><h3 className="font-semibold">Project team</h3><p className="mt-2 text-sm">{data.record.teamMembers.map(m => [m.employee?.firstName, m.employee?.lastName].filter(Boolean).join(' ')).filter(Boolean).join(', ') || 'No team assigned'}</p></section>}
      <section><h3 className="font-semibold">Open tasks ({data.taskTotal})</h3><p className="text-xs text-neutral-500">Showing up to 20 tasks, earliest due first.</p>{data.tasks.length ? <ul className="mt-2 space-y-2">{data.tasks.map(t => <li key={t._id} className="rounded-lg border p-3"><p className="font-medium">{t.title}</p><p className="text-sm">{t.status} / {t.priority} / Due {day(t.dueDate)}</p></li>)}</ul> : <p className="mt-2 text-sm">No open tasks.</p>}</section>
      <section><h3 className="font-semibold">Recent submissions</h3><p className="text-xs text-neutral-500">Latest 10 reports.</p>{data.submissions.length ? <ul className="mt-2 space-y-2">{data.submissions.map(r => <li key={r._id} className="rounded-lg border p-3">{r.title}<p className="text-sm">{r.status} / {day(r.reportDate)}</p>{r.feedback && <p className="text-sm">{r.feedback}</p>}</li>)}</ul> : <p className="mt-2 text-sm">No submissions.</p>}</section>
      {selection.kind === 'employee' && <section><h3 className="font-semibold">Upcoming leave</h3><p className="text-xs text-neutral-500">Next 10 requests. Pending requests are not confirmed absence.</p>{data.leaves.length ? <ul className="mt-2 space-y-2">{data.leaves.map(l => <li key={l._id}>{day(l.startDate)} to {day(l.endDate)} / {l.status}</li>)}</ul> : <p className="mt-2 text-sm">No upcoming requests.</p>}</section>}
    </div>}
  </dialog>, document.body);
}
