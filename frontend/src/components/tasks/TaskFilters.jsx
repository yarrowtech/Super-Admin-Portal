import React, { useMemo } from 'react';
import { TASK_PRIORITIES } from '../../features/tasks/taskConstants';

/**
 * Search/priority/assignee/project/due-date filters for a portal's task
 * board or list. Assignee/project option lists are derived from the
 * already-loaded tasks (no extra endpoint) since neither is a dedicated
 * reference-data list in this app.
 */
const TaskFilters = ({ filters, onChange, tasks = [], departmentEnabled = false }) => {
  const assigneeOptions = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => { if (t.assignee?.id && (!filters.department || (t.department || 'Unassigned department') === filters.department)) map.set(t.assignee.id, t.assignee.name); });
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [tasks, filters.department]);

  const projectOptions = useMemo(() => {
    const map = new Map();
    tasks.forEach((t) => { if (t.project?.id) map.set(t.project.id, t.project.name); });
    return Array.from(map, ([value, label]) => ({ value, label }));
  }, [tasks]);

  const set = (patch) => onChange({ ...filters, ...patch });

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <div className="relative min-w-48 flex-1 sm:flex-none">
        <span className="material-symbols-outlined pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[16px] text-neutral-400">search</span>
        <input
          type="search"
          placeholder="Search tasks..."
          value={filters.search || ''}
          onChange={(e) => set({ search: e.target.value })}
          className="h-9 w-full rounded-lg border border-neutral-200 bg-white pl-9 pr-3 text-sm focus:border-primary focus:outline-none dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        />
      </div>

      <select
        value={filters.priority || ''}
        onChange={(e) => set({ priority: e.target.value || undefined })}
        className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      >
        <option value="">All priorities</option>
        {TASK_PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
      </select>

      {departmentEnabled && <>
        <select aria-label="Filter by department" value={filters.department || ''} onChange={(e) => set({ department: e.target.value || undefined, assignee: undefined })} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option value="">All departments</option>
          {[...new Set(tasks.map((t) => t.department || 'Unassigned department'))].sort().map((d) => <option key={d} value={d}>{d}</option>)}
        </select>
        <select aria-label="Filter by status" value={filters.status || ''} onChange={(e) => set({ status: e.target.value || undefined })} className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900">
          <option value="">All statuses</option>
          {['pending', 'in-progress', 'review', 'completed', 'cancelled'].map((s) => <option key={s} value={s}>{s.replace('-', ' ')}</option>)}
        </select>
      </>}
      {(assigneeOptions.length > 0 || filters.assignee) && (
        <select
          value={filters.assignee || ''}
          onChange={(e) => set({ assignee: e.target.value || undefined })}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="">All assignees</option>
          {assigneeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      {projectOptions.length > 0 && (
        <select
          value={filters.project || ''}
          onChange={(e) => set({ project: e.target.value || undefined })}
          className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
        >
          <option value="">All projects</option>
          {projectOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      )}

      <input
        type="date"
        title="Due before"
        value={filters.dueTo || ''}
        onChange={(e) => set({ dueTo: e.target.value || undefined })}
        className="h-9 rounded-lg border border-neutral-200 bg-white px-3 text-sm dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />

      {(filters.department || filters.status || filters.search || filters.priority || filters.assignee || filters.project || filters.dueTo) && (
        <button type="button" onClick={() => onChange({})} className="text-xs font-semibold text-primary hover:underline">
          Clear filters
        </button>
      )}
    </div>
  );
};

export default TaskFilters;
