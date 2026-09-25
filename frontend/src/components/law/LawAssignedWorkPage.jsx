import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';
import PortalHeader from '../common/PortalHeader';
import StatusBadge from '../common/StatusBadge';
import KPICard from '../common/KPICard';
import SectionCard from '../ui/SectionCard';
import { statusLabel } from '../../features/tasks/taskConstants';
import { statusToTone } from '../../utils/statusTone';
import TaskDocumentWorkspace from '../tasks/TaskDocumentWorkspace';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-');
const DOC_STATUS_TONE = { Approved: 'success', Pending: 'warning', Draft: 'info', Rejected: 'danger' };
const NO_PROJECT = 'No project';

/**
 * Law employee / associated freelancer: the project-wise legal documents the head shared
 * through their tasks. Editable ones open in the full editor with notes and key points;
 * access is enforced per task link on the server.
 */
const LawAssignedWorkPage = () => {
  const { user, token } = useAuth();
  const [workspace, setWorkspace] = useState(null);
  const [project, setProject] = useState('');
  const [access, setAccess] = useState('all');
  const [search, setSearch] = useState('');
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['law', 'my-task-items'],
    queryFn: () => lawApi.getMyTaskItems(token),
    enabled: Boolean(token),
    staleTime: 30_000,
  });

  const documents = useMemo(() => (data?.data || []).filter((d) => d.module === 'document' && !d.missing), [data]);
  const projects = useMemo(() => [...new Set(documents.map((d) => d.projectName || NO_PROJECT))].sort(), [documents]);

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    const map = new Map();
    documents
      .filter((d) => !project || (d.projectName || NO_PROJECT) === project)
      .filter((d) => access === 'all' || (access === 'edit' ? d.canEdit : !d.canEdit))
      .filter((d) => !q || `${d.title} ${d.type} ${d.task?.title}`.toLowerCase().includes(q))
      .forEach((d) => {
        const key = d.projectName || NO_PROJECT;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(d);
      });
    return [...map.entries()].sort(([a], [b]) => (a === NO_PROJECT) - (b === NO_PROJECT) || a.localeCompare(b));
  }, [documents, project, access, search]);

  const shown = groups.reduce((sum, [, rows]) => sum + rows.length, 0);
  const forbidden = isError && (error?.status === 403 || /403|forbidden|permission|not authori/i.test(String(error?.message || '')));
  const selectCls = 'h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900';

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader
          title="My Legal Documents"
          subtitle="Project-wise legal documents the Law head shared with you through your tasks"
          icon="description"
          user={user}
          onRefresh={refetch}
          refreshing={isFetching}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard title="Documents" value={documents.length} icon="description" />
          <KPICard title="Projects" value={projects.length} icon="folder" />
          <KPICard title="Can edit" value={documents.filter((d) => d.canEdit).length} icon="edit_document" tone="success" />
          <KPICard title="Read-only" value={documents.filter((d) => !d.canEdit).length} icon="visibility" />
        </div>

        {isLoading ? (
          <p className="animate-pulse text-sm text-neutral-500">Loading your documents...</p>
        ) : isError && !forbidden ? (
          <SectionCard title="My legal documents" icon="error" error={error} onRetry={refetch} />
        ) : documents.length === 0 ? (
          <SectionCard title="My legal documents" icon="description">
            <p className="text-sm text-neutral-500">No documents shared with you yet. They appear here when the Law head attaches a project document to one of your tasks.</p>
          </SectionCard>
        ) : (
          <SectionCard title="My legal documents" icon="description" description={`${shown} of ${documents.length} shown`}>
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <input type="search" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search documents or tasks…" aria-label="Search documents" className={`${selectCls} min-w-48 flex-1`} />
              <select value={project} onChange={(e) => setProject(e.target.value)} aria-label="Filter by project" className={selectCls}>
                <option value="">All projects</option>
                {projects.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
              <select value={access} onChange={(e) => setAccess(e.target.value)} aria-label="Filter by access" className={selectCls}>
                <option value="all">Any access</option>
                <option value="edit">Can edit</option>
                <option value="read">Read-only</option>
              </select>
            </div>

            {groups.length === 0 ? (
              <p className="text-sm text-neutral-500">No documents match these filters.</p>
            ) : (
              <div className="space-y-5">
                {groups.map(([name, rows]) => (
                  <div key={name}>
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
                      <span className="material-symbols-outlined text-[16px]">{name === NO_PROJECT ? 'folder_off' : 'folder'}</span>
                      {name}
                      <span className="rounded-full bg-neutral-100 px-1.5 text-[10px] text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{rows.length}</span>
                    </p>
                    <ul className="divide-y divide-neutral-100 rounded-xl border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
                      {rows.map((doc) => (
                        <li key={`${doc.task?._id}:${doc.recordId}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                          <span className="material-symbols-outlined text-neutral-400">description</span>
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{doc.title}</p>
                            <p className="truncate text-xs text-neutral-500">
                              {doc.type} · Task: {doc.task?.title}{doc.task?.dueDate ? ` · due ${formatDate(doc.task.dueDate)}` : ''}
                            </p>
                            {doc.annotationCount > 0 && (
                              <p className="mt-1 flex flex-wrap gap-1">
                                {doc.criticalCount > 0 && <span className="rounded-full bg-rose-50 px-1.5 py-0.5 text-[10px] font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-300">{doc.criticalCount} critical</span>}
                                {doc.highlightCount > 0 && <span className="rounded-full bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">{doc.highlightCount} key point{doc.highlightCount === 1 ? '' : 's'}</span>}
                                {doc.annotationCount - (doc.highlightCount || 0) > 0 && <span className="rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">{doc.annotationCount - (doc.highlightCount || 0)} note{doc.annotationCount - (doc.highlightCount || 0) === 1 ? '' : 's'}</span>}
                              </p>
                            )}
                            {doc.topPoints?.length > 0 && (
                              <ul className="mt-1.5 space-y-0.5">
                                {doc.topPoints.map((p, i) => (
                                  <li key={i} className={`flex items-start gap-1 text-xs ${p.critical ? 'text-rose-700 dark:text-rose-300' : 'text-neutral-600 dark:text-neutral-300'}`}>
                                    <span className="material-symbols-outlined mt-px text-[13px]" style={{ fontVariationSettings: "'FILL' 1" }}>{p.critical ? 'priority_high' : 'star'}</span>
                                    <span className="line-clamp-1">{p.text}</span>
                                  </li>
                                ))}
                              </ul>
                            )}
                          </div>
                          {doc.status && <StatusBadge tone={DOC_STATUS_TONE[doc.status] || 'neutral'} label={doc.status} dot={false} />}
                          {doc.task?.status && <StatusBadge tone={statusToTone(doc.task.status)} label={`Task: ${statusLabel(doc.task.status)}`} dot={false} />}
                          <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${doc.canEdit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                            {doc.canEdit ? 'Can edit' : 'Read-only'}
                          </span>
                          <button type="button" onClick={() => setWorkspace({ taskId: doc.task?._id, taskTitle: doc.task?.title, recordId: doc.recordId })} className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                            {doc.canEdit ? 'Open & edit' : 'Open'}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </SectionCard>
        )}
      </div>

      {workspace && <TaskDocumentWorkspace {...workspace} onClose={() => { setWorkspace(null); refetch(); }} />}
    </main>
  );
};

export default LawAssignedWorkPage;
