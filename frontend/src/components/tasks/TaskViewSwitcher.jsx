import React from 'react';

const VIEWS = [
  { key: 'board', label: 'Board', icon: 'view_kanban' },
  { key: 'list', label: 'List', icon: 'view_list' },
];

/** Board | List toggle — both views share the same underlying task query/cache. */
const TaskViewSwitcher = ({ view, onChange }) => (
  <div role="group" aria-label="Task view" className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-800 dark:bg-neutral-900">
    {VIEWS.map((v) => {
      const active = v.key === view;
      return (
        <button
          key={v.key}
          type="button"
          onClick={() => onChange(v.key)}
          aria-pressed={active}
          className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-bold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${
            active ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500 hover:text-neutral-700 dark:text-neutral-400 dark:hover:text-neutral-200'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">{v.icon}</span>
          {v.label}
        </button>
      );
    })}
  </div>
);

export default TaskViewSwitcher;
