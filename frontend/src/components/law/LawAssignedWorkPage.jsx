import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';
import PortalHeader from '../common/PortalHeader';
import StatusBadge from '../common/StatusBadge';
import SectionCard from '../ui/SectionCard';
import { priorityToTone } from '../../features/tasks/taskConstants';
import { ItemDetail, statusTone } from '../tasks/LinkedItemsSection';
import { humanize } from '../tasks/LinkedItemsPicker';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-');

const GROUPS = [
  { key: 'contracts', title: 'Contracts', icon: 'contract', modules: ['contract', 'outsourcing_contract'] },
  { key: 'documents', title: 'Documents', icon: 'description', modules: ['document'] },
  { key: 'compliance', title: 'Compliance & Risk', icon: 'policy', modules: ['record'] },
];

/** Read-only list of everything the law head linked to the caller's own tasks. */
const LawAssignedWorkPage = () => {
  const { user, token } = useAuth();
  const [openKey, setOpenKey] = useState(null);
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['law', 'my-task-items'],
    queryFn: () => lawApi.getMyTaskItems(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
  const items = useMemo(() => data?.data || [], [data]);
  const grouped = useMemo(
    () => GROUPS.map((g) => ({ ...g, rows: items.filter((i) => g.modules.includes(i.module)) })).filter((g) => g.rows.length),
    [items],
  );

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader
          title="Assigned Work"
          subtitle="Contracts, documents and compliance items the head linked to your tasks (read-only)"
          icon="assignment"
          user={user}
          onRefresh={refetch}
          refreshing={isFetching}
        />
        {isLoading ? (
          <p className="animate-pulse text-sm text-neutral-500">Loading assigned items...</p>
        ) : isError && !(error?.status === 403 || /403|forbidden|permission|not authori/i.test(String(error?.message || ''))) ? (
          <SectionCard title="Assigned items" icon="error" error={error} onRetry={refetch} />
        ) : grouped.length === 0 ? (
          <SectionCard title="Assigned items" icon="assignment">
            <p className="text-sm text-neutral-500">No items assigned yet — the head links documents and contracts to your tasks.</p>
          </SectionCard>
        ) : grouped.map((group) => (
          <SectionCard key={group.key} title={`${group.title} (${group.rows.length})`} icon={group.icon}>
            <ul className="space-y-2">
              {group.rows.map((item) => {
                const key = `${item.task._id}:${item.module}:${item.recordId}`;
                const open = openKey === key;
                return (
                  <li key={key} className="rounded-xl border border-neutral-200 dark:border-neutral-700">
                    <button type="button" disabled={item.missing} onClick={() => setOpenKey(open ? null : key)} className="flex w-full items-center gap-3 px-3 py-2 text-left disabled:opacity-60">
                      <span className="material-symbols-outlined text-neutral-400">{group.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold">{item.title}</span>
                        <span className="block truncate text-xs text-neutral-500">
                          {item.missing ? 'No longer available' : `${humanize(item.type)}${item.fileCount ? ` · ${item.fileCount} file${item.fileCount === 1 ? '' : 's'}` : ''}`}
                          {` · Task: ${item.task.title} (${humanize(item.task.status)}, due ${formatDate(item.task.dueDate)})`}
                        </span>
                      </span>
                      <StatusBadge tone={priorityToTone(item.task.priority)} label={item.task.priority} dot={false} />
                      {item.status && <StatusBadge tone={statusTone(item.status)} label={humanize(item.status)} dot={false} />}
                      {!item.missing && <span className="material-symbols-outlined text-base text-neutral-400">{open ? 'expand_less' : 'expand_more'}</span>}
                    </button>
                    {open && <ItemDetail taskId={item.task._id} item={item} />}
                  </li>
                );
              })}
            </ul>
          </SectionCard>
        ))}
      </div>
    </main>
  );
};

export default LawAssignedWorkPage;
