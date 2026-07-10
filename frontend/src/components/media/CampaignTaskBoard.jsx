import React from 'react';

const COLUMNS = [
  { status: 'pending', label: 'Pending', icon: 'pending_actions' },
  { status: 'in-progress', label: 'Working', icon: 'engineering' },
  { status: 'review', label: 'Review', icon: 'rate_review' },
  { status: 'completed', label: 'Completed', icon: 'task_alt' },
];

const CampaignTaskBoard = ({ tasks = [], busy, onMove }) => (
  <div className="grid grid-cols-1 gap-4 xl:grid-cols-4">
    {COLUMNS.map((column) => {
      const items = tasks.filter((task) => task.status === column.status);

      return (
        <div key={column.status} className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm dark:border-neutral-800 dark:bg-neutral-900">
          <div className="mb-3 flex items-center justify-between rounded-2xl bg-slate-50 px-3 py-2 dark:bg-neutral-950/60">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-teal-700 dark:text-teal-300">{column.icon}</span>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-neutral-500 dark:text-neutral-400">{column.label}</p>
            </div>
            <span className="rounded-full bg-white px-2 py-0.5 text-xs font-black text-slate-700 dark:bg-neutral-800 dark:text-neutral-200">
              {items.length}
            </span>
          </div>

          <div className="space-y-3">
            {items.map((task) => (
              <article key={task._id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-neutral-800 dark:bg-neutral-950/50">
                <p className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">{task.title}</p>
                <p className="mt-1 text-[11px] text-neutral-500 dark:text-neutral-400">{task.campaignName || 'Campaign task'}</p>
                {task.dueDate ? (
                  <p className="mt-1 text-[11px] text-neutral-400 dark:text-neutral-500">Due {new Date(task.dueDate).toLocaleDateString()}</p>
                ) : null}
                <div className="mt-2 flex flex-wrap gap-1">
                  {COLUMNS.filter((target) => target.status !== column.status).map((target) => (
                    <button
                      key={target.status}
                      type="button"
                      disabled={busy}
                      onClick={() => onMove?.(task, target.status)}
                      className="rounded-full border border-teal-200 bg-teal-50 px-2 py-0.5 text-[10px] font-semibold text-teal-700 transition hover:bg-teal-100 disabled:opacity-50 dark:border-teal-900/60 dark:bg-teal-500/10 dark:text-teal-300 dark:hover:bg-teal-500/20"
                    >
                      Move to {target.label}
                    </button>
                  ))}
                </div>
              </article>
            ))}

            {!items.length ? (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-center text-xs font-semibold text-neutral-400 dark:border-neutral-800 dark:bg-neutral-950/40 dark:text-neutral-500">
                Empty
              </div>
            ) : null}
          </div>
        </div>
      );
    })}
  </div>
);

export default CampaignTaskBoard;
