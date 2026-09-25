import React, { useMemo, useState } from 'react';
import StatusBadge from '../common/StatusBadge';
import { statusLabel } from '../../features/tasks/taskConstants';
import { statusToTone } from '../../utils/statusTone';
import { MODULE_LABELS } from './LinkedItemsPicker';
import TaskDocumentWorkspace from './TaskDocumentWorkspace';

const formatDue = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(v)) : '');
const NO_PROJECT = '__none__';

/**
 * Law: every document / contract shared through the (already filtered) tasks, grouped
 * project-wise. Built from the tasks themselves, so the same search / assignee / project
 * filters apply and each role only sees what its task scope allows.
 */
const ProjectDocumentsView = ({ tasks = [], loading, onOpenTask }) => {
  const [kind, setKind] = useState('all');
  const [workspace, setWorkspace] = useState(null);

  const groups = useMemo(() => {
    const map = new Map();
    tasks.forEach((task) => {
      (task.linkedItems || []).forEach((item) => {
        if (item.module !== 'document') return;
        if (kind === 'editable' && !item.canEdit) return;
        const key = task.project?.id || NO_PROJECT;
        if (!map.has(key)) map.set(key, { key, name: task.project?.name || 'No project', rows: [] });
        map.get(key).rows.push({ item, task });
      });
    });
    return [...map.values()].sort((a, b) => (a.key === NO_PROJECT) - (b.key === NO_PROJECT) || a.name.localeCompare(b.name));
  }, [tasks, kind]);

  const total = groups.reduce((sum, g) => sum + g.rows.length, 0);

  if (loading) return <p className="py-8 text-center text-sm text-neutral-400">Loading documents…</p>;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {[['all', 'All legal documents'], ['editable', 'Editable by assignee']].map(([key, label]) => (
          <button key={key} type="button" onClick={() => setKind(key)} className={`rounded-full px-3 py-1.5 text-xs font-semibold ${kind === key ? 'bg-primary text-white' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-300'}`}>
            {label}
          </button>
        ))}
        <span className="ml-auto text-xs text-neutral-500">{total} document{total === 1 ? '' : 's'} across {groups.length} project{groups.length === 1 ? '' : 's'}</span>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl border border-dashed border-neutral-300 p-8 text-center text-sm text-neutral-500 dark:border-neutral-700">
          No documents are linked to these tasks yet. Link them when creating or editing a task.
        </div>
      ) : groups.map((group) => (
        <section key={group.key} className="rounded-2xl border border-neutral-200 dark:border-neutral-800">
          <header className="flex items-center gap-2 border-b border-neutral-100 px-4 py-2.5 dark:border-neutral-800">
            <span className="material-symbols-outlined text-[18px] text-neutral-400">{group.key === NO_PROJECT ? 'folder_off' : 'folder'}</span>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">{group.name}</h3>
            <span className="rounded-full bg-neutral-100 px-2 text-[11px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{group.rows.length}</span>
          </header>
          <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {group.rows.map(({ item, task }) => (
              <li key={`${task.id}:${item.module}:${item.recordId}`} className="flex flex-wrap items-center gap-3 px-4 py-3">
                <span className="material-symbols-outlined text-neutral-400">{item.module === 'document' ? 'description' : 'contract'}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-neutral-900 dark:text-white">{item.title || MODULE_LABELS[item.module]}</p>
                  <p className="truncate text-xs text-neutral-500">
                    {MODULE_LABELS[item.module]} · Task: <button type="button" onClick={() => onOpenTask(task)} className="font-semibold text-primary hover:underline">{task.title}</button>
                    {task.assignee?.name ? ` · ${task.assignee.name}` : ''}{task.dueDate ? ` · due ${formatDue(task.dueDate)}` : ''}
                  </p>
                </div>
                {item.module === 'document' && (
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${item.canEdit ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300'}`}>
                    {item.canEdit ? 'Can edit' : 'Read-only'}
                  </span>
                )}
                <StatusBadge tone={statusToTone(task.status)} label={statusLabel(task.status)} dot={false} />
                {item.module === 'document' ? (
                  <button type="button" onClick={() => setWorkspace({ taskId: task.id, taskTitle: task.title, recordId: item.recordId })} className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-white hover:brightness-110">
                    Open
                  </button>
                ) : (
                  <button type="button" onClick={() => onOpenTask(task)} className="rounded-lg border border-neutral-200 px-2.5 py-1.5 text-xs font-semibold dark:border-neutral-700">
                    View
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      ))}

      {workspace && <TaskDocumentWorkspace {...workspace} onClose={() => setWorkspace(null)} />}
    </div>
  );
};

export default ProjectDocumentsView;
