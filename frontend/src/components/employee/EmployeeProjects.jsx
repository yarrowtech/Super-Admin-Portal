import React, { useEffect, useMemo, useState } from 'react';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const filters = ['All', 'Backlog', 'In Progress', 'Review', 'Completed'];

const EmployeeProjects = () => {
  const { token } = useAuth();
  const [board, setBoard] = useState([]);
  const [summary, setSummary] = useState(null);
  const [activeFilter, setActiveFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError('');

    (async () => {
      try {
        const res = await employeeApi.getProjects(token);
        const payload = res?.data || res;
        setBoard(payload?.columns || []);
        setSummary(payload?.summary || null);
      } catch (err) {
        setError(err.message || 'Failed to load projects');
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const filteredColumns = useMemo(() => {
    if (activeFilter === 'All') return board;
    return board.filter((col) => col.title?.toLowerCase().includes(activeFilter.toLowerCase()));
  }, [board, activeFilter]);

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading project board...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <main className="mx-auto flex max-w-[1400px] flex-col gap-6">
      <header className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg shadow-primary/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500">Projects</p>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">Kanban board</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">Track sprint health and unblock your work.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                  activeFilter === filter
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-slate-200 text-slate-600 hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>
        {summary && (
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-600 dark:text-slate-400">
            <span>Total tasks: <strong className="text-slate-900 dark:text-white">{summary.totalTasks}</strong></span>
            <span>Overdue: <strong className="text-rose-600">{summary.overdue}</strong></span>
            <span>Active projects: <strong className="text-slate-900 dark:text-white">{summary.activeProjects}</strong></span>
          </div>
        )}
      </header>

      <section className="overflow-x-auto rounded-3xl border border-slate-200 bg-white/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/60">
        <div className="flex min-w-[900px] gap-4">
          {filteredColumns.map((column) => (
            <div key={column.id || column.title} className="flex w-full min-w-[220px] flex-col rounded-2xl bg-slate-50/70 p-4 dark:bg-white/5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{column.title}</p>
                  <p className="text-xs text-slate-500">{column.cards?.length || 0} cards</p>
                </div>
              </div>
              <div className="mt-4 flex flex-col gap-4">
                {(column.cards || []).map((task) => (
                  <article
                    key={task.id}
                    className="rounded-2xl border border-white/70 bg-white/90 p-4 shadow-sm ring-1 ring-black/5 transition hover:-translate-y-0.5 hover:shadow-lg dark:border-white/10 dark:bg-slate-900/70 dark:ring-white/5"
                  >
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</h3>
                    <p className="text-xs text-slate-500">{task.project || task.status}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3 text-[11px] font-semibold text-slate-500">
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-slate-400">schedule</span>
                        {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'No due date'}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-slate-400">chat</span>
                        {task.comments || 0}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-base text-slate-400">attach_file</span>
                        {task.attachments || 0}
                      </div>
                    </div>
                  </article>
                ))}
                {(column.cards || []).length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    Nothing here yet.
                  </div>
                )}
              </div>
            </div>
          ))}
          {filteredColumns.length === 0 && (
            <div className="text-sm text-slate-500 dark:text-slate-400">No columns match this filter.</div>
          )}
        </div>
      </section>
    </main>
  );
};

export default EmployeeProjects;
