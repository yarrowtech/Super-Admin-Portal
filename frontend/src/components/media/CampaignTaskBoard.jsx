import React from 'react';

const COLUMNS = [
  { status: 'pending', label: 'Pending' },
  { status: 'in-progress', label: 'Working' },
  { status: 'review', label: 'Review' },
  { status: 'completed', label: 'Completed' },
];

const CampaignTaskBoard = ({ tasks = [], busy, onMove }) => {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
      {COLUMNS.map((column) => {
        const items = tasks.filter((task) => task.status === column.status);
        return (
          <div key={column.status} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-900/60">
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-neutral-500 dark:text-neutral-400">
              {column.label} <span className="text-neutral-400 dark:text-neutral-500">({items.length})</span>
            </p>
            <div className="space-y-2">
              {items.map((task) => (
                <article key={task._id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm dark:border-neutral-700 dark:bg-neutral-800">
                  <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{task.title}</p>
                  <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{task.campaignName}</p>
                  {task.dueDate ? (
                    <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">Due {new Date(task.dueDate).toLocaleDateString()}</p>
                  ) : null}
                  <div className="mt-2 flex flex-wrap gap-1">
                    {COLUMNS.filter((c) => c.status !== column.status).map((target) => (
                      <button
                        key={target.status}
                        type="button"
                        disabled={busy}
                        onClick={() => onMove?.(task, target.status)}
                        className="rounded-full border border-blue-200 bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 transition hover:bg-blue-100 disabled:opacity-50 dark:border-blue-900/60 dark:bg-blue-500/10 dark:text-blue-300 dark:hover:bg-blue-500/20"
                      >
                        → {target.label}
                      </button>
                    ))}
                  </div>
                </article>
              ))}
              {!items.length ? <p className="text-xs text-neutral-400 dark:text-neutral-500">No tasks</p> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CampaignTaskBoard;
