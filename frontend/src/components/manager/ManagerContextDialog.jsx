import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { apiClient } from '../../services/client';
import Button from '../ui/Button';
import StatusBadge from '../common/StatusBadge';
import { statusToTone } from '../../utils/statusTone';

// Matches ManagerWorkspacePages.jsx's `date()` helper exactly, so a due date
// on a project/task card and the same date inside this detail dialog never
// render in two different formats.
const day = (value) => (value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value)) : 'Not set');

const SectionTitle = ({ children }) => (
  <h3 className="text-sm font-black uppercase tracking-wide text-neutral-500 dark:text-neutral-400">{children}</h3>
);

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

  return createPortal(
    <dialog
      ref={ref}
      onCancel={onClose}
      onClose={onClose}
      className="m-auto max-h-[90dvh] w-[min(95vw,42rem)] overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-0 text-neutral-900 shadow-2xl backdrop:bg-black/50 dark:border-neutral-800 dark:bg-neutral-900 dark:text-neutral-100"
    >
      <div className="flex items-start justify-between gap-4 border-b border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-lg font-black text-neutral-900 dark:text-neutral-100">{selection.title}</h2>
        <Button variant="ghost" size="sm" className="h-9 w-9 px-0" onClick={onClose} aria-label="Close details">
          <span className="material-symbols-outlined text-lg">close</span>
        </Button>
      </div>

      <div className="p-4 lg:p-5">
        {query.isPending ? (
          <p role="status" className="text-sm text-neutral-500 dark:text-neutral-400">Loading details…</p>
        ) : query.isError ? (
          <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 dark:border-rose-900/40 dark:bg-rose-900/20">
            <p className="text-sm text-rose-700 dark:text-rose-300">{query.error.message || 'Unable to load details'}</p>
            <Button variant="secondary" size="sm" className="mt-3" onClick={() => query.refetch()}>Retry</Button>
          </div>
        ) : (
          <div className="space-y-5">
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {data.record.description || [data.record.department, data.record.role].filter(Boolean).join(' / ')}
            </p>

            {data.record.teamMembers && (
              <section className="space-y-2">
                <SectionTitle>Project team</SectionTitle>
                <p className="text-sm text-neutral-700 dark:text-neutral-200">
                  {data.record.teamMembers.map((m) => [m.employee?.firstName, m.employee?.lastName].filter(Boolean).join(' ')).filter(Boolean).join(', ') || 'No team assigned'}
                </p>
              </section>
            )}

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Open tasks ({data.taskTotal})</SectionTitle>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">Up to 20, earliest due first</span>
              </div>
              {data.tasks.length ? (
                <ul className="space-y-2">
                  {data.tasks.map((t) => (
                    <li key={t._id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                      <p className="font-semibold text-neutral-900 dark:text-neutral-100">{t.title}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-2">
                        <StatusBadge tone={statusToTone(t.status)} label={t.status} />
                        <StatusBadge tone={statusToTone(t.priority)} label={t.priority} dot={false} />
                        <span className="text-xs text-neutral-500 dark:text-neutral-400">Due {day(t.dueDate)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No open tasks.</p>
              )}
            </section>

            <section className="space-y-2">
              <div className="flex items-center justify-between gap-3">
                <SectionTitle>Recent submissions</SectionTitle>
                <span className="text-xs text-neutral-400 dark:text-neutral-500">Latest 10 reports</span>
              </div>
              {data.submissions.length ? (
                <ul className="space-y-2">
                  {data.submissions.map((r) => (
                    <li key={r._id} className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-semibold text-neutral-900 dark:text-neutral-100">{r.title}</p>
                        <StatusBadge tone={statusToTone(r.status)} label={r.status} />
                      </div>
                      <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{day(r.reportDate)}</p>
                      {r.feedback && <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">{r.feedback}</p>}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-neutral-500 dark:text-neutral-400">No submissions.</p>
              )}
            </section>

            {selection.kind === 'employee' && (
              <section className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <SectionTitle>Upcoming leave</SectionTitle>
                  <span className="text-xs text-neutral-400 dark:text-neutral-500">Next 10 · pending isn't confirmed absence</span>
                </div>
                {data.leaves.length ? (
                  <ul className="space-y-2">
                    {data.leaves.map((l) => (
                      <li key={l._id} className="flex items-center justify-between gap-2 rounded-xl border border-neutral-200 p-3 text-sm dark:border-neutral-800">
                        <span className="text-neutral-700 dark:text-neutral-200">{day(l.startDate)} — {day(l.endDate)}</span>
                        <StatusBadge tone={statusToTone(l.status)} label={l.status} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">No upcoming requests.</p>
                )}
              </section>
            )}
          </div>
        )}
      </div>
    </dialog>,
    document.body
  );
}
