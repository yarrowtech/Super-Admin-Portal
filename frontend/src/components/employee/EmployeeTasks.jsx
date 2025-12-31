import React, { useEffect, useMemo, useState } from 'react';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const statusOptions = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'in-progress', label: 'In progress' },
  { value: 'review', label: 'In review' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const priorityOptions = [
  { value: '', label: 'All priorities' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'critical', label: 'Critical' },
];

const sortOptions = [
  { value: 'dueDate', label: 'Due date' },
  { value: 'priority', label: 'Priority' },
  { value: 'createdAt', label: 'Created date' },
];

const priorityTone = {
  low: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  medium: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200',
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
};

const statusTone = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-200',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200',
  completed: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200',
};

const formatDate = (value) =>
  value
    ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
    : 'No due date';

const EmployeeTasks = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState(null);
  const [meta, setMeta] = useState({ page: 1, limit: 10, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionTaskId, setActionTaskId] = useState(null);
  const [filters, setFilters] = useState({
    search: '',
    status: '',
    priority: '',
    dueFrom: '',
    dueTo: '',
    overdue: false,
    sortBy: 'dueDate',
    sortDir: 'asc',
    page: 1,
    limit: 10,
  });
  const [searchDraft, setSearchDraft] = useState('');

  const fetchTasks = async (override = {}) => {
    if (!token) return;
    setLoading(true);
    setError('');
    const params = { view: 'list', ...filters, ...override };
    try {
      const res = await employeeApi.getTasks(token, params);
      const payload = res?.data || {};
      setTasks(payload.tasks || []);
      setMeta(payload.meta || { page: 1, limit: 10, totalPages: 1 });
      setSummary(payload.summary || null);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token, filters.page, filters.limit, filters.status, filters.priority, filters.overdue, filters.sortBy, filters.sortDir, filters.dueFrom, filters.dueTo]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setFilters((prev) => ({ ...prev, search: searchDraft, page: 1 }));
    }, 400);
    return () => clearTimeout(timer);
  }, [searchDraft]);

  const handleStatusUpdate = async (taskId, status) => {
    if (!token || !taskId || !status) return;
    setActionTaskId(taskId);
    try {
      const payload = { status };
      if (status === 'completed') payload.progress = 100;
      await employeeApi.updateTaskStatus(token, taskId, payload);
      await fetchTasks();
    } catch (err) {
      setError(err.message || 'Failed to update task');
    } finally {
      setActionTaskId(null);
    }
  };

  const clearFilters = () => {
    setSearchDraft('');
    setFilters({
      search: '',
      status: '',
      priority: '',
      dueFrom: '',
      dueTo: '',
      overdue: false,
      sortBy: 'dueDate',
      sortDir: 'asc',
      page: 1,
      limit: 10,
    });
  };

  const canPrev = meta.page > 1;
  const canNext = meta.page < meta.totalPages;

  const totals = useMemo(
    () => [
      { label: 'Total', value: summary?.total ?? 0, tone: 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-200' },
      { label: 'Pending', value: summary?.pending ?? 0, tone: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-200' },
      { label: 'In progress', value: summary?.inProgress ?? 0, tone: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-200' },
      { label: 'Review', value: summary?.review ?? 0, tone: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-200' },
      { label: 'Completed', value: summary?.completed ?? 0, tone: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-200' },
      { label: 'Overdue', value: summary?.overdue ?? 0, tone: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-200' },
    ],
    [summary]
  );

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading tasks...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <header className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg shadow-primary/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Task management</p>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">My work queue</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Track priorities, update status, and keep your deliveries on time.
            </p>
          </div>
          <button
            onClick={() => fetchTasks()}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:text-slate-300"
          >
            <span className="material-symbols-outlined text-sm">refresh</span>
            Refresh
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
        {totals.map((item) => (
          <div key={item.label} className="rounded-2xl border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{item.label}</p>
            <p className={`mt-2 inline-flex rounded-full px-3 py-1 text-sm font-bold ${item.tone}`}>{item.value}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Search
            <input
              value={searchDraft}
              onChange={(e) => setSearchDraft(e.target.value)}
              placeholder="Search tasks"
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Status
            <select
              value={filters.status}
              onChange={(e) => setFilters((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Priority
            <select
              value={filters.priority}
              onChange={(e) => setFilters((prev) => ({ ...prev, priority: e.target.value, page: 1 }))}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {priorityOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Due from
            <input
              type="date"
              value={filters.dueFrom}
              onChange={(e) => setFilters((prev) => ({ ...prev, dueFrom: e.target.value, page: 1 }))}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Due to
            <input
              type="date"
              value={filters.dueTo}
              onChange={(e) => setFilters((prev) => ({ ...prev, dueTo: e.target.value, page: 1 }))}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            />
          </label>
          <label className="flex flex-col text-xs font-semibold text-slate-500">
            Sort by
            <select
              value={filters.sortBy}
              onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value, page: 1 }))}
              className="mt-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500">
            <input
              type="checkbox"
              checked={filters.overdue}
              onChange={(e) => setFilters((prev) => ({ ...prev, overdue: e.target.checked, page: 1 }))}
              className="size-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            Show overdue only
          </label>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span>
              Page {meta.page} of {meta.totalPages}
            </span>
            <button
              onClick={() => setFilters((prev) => ({ ...prev, sortDir: prev.sortDir === 'asc' ? 'desc' : 'asc', page: 1 }))}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              {filters.sortDir === 'asc' ? 'Ascending' : 'Descending'}
            </button>
            <button
              onClick={clearFilters}
              className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300"
            >
              Reset filters
            </button>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {tasks.map((task) => {
          const taskId = task.id || task._id;
          const isBusy = actionTaskId === taskId;
          return (
            <div key={taskId} className="rounded-3xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{task.title}</h3>
                    {task.isOverdue && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                        Overdue
                      </span>
                    )}
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${priorityTone[task.priority] || priorityTone.medium}`}>
                      {task.priority || 'medium'}
                    </span>
                    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusTone[task.status] || statusTone.pending}`}>
                      {task.status || 'pending'}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{task.description || 'No description provided.'}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <span className="inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">schedule</span>
                      Due {formatDate(task.dueDate)}
                    </span>
                    {task.project?.name && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">folder</span>
                        {task.project.name}
                      </span>
                    )}
                    {task.assignedBy?.name && (
                      <span className="inline-flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">person</span>
                        Assigned by {task.assignedBy.name}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <select
                    value={task.status || 'pending'}
                    onChange={(e) => handleStatusUpdate(taskId, e.target.value)}
                    disabled={isBusy}
                    className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 focus:border-primary focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  >
                    {statusOptions
                      .filter((option) => option.value)
                      .map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                  <button
                    onClick={() => handleStatusUpdate(taskId, 'completed')}
                    disabled={isBusy || task.status === 'completed'}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 dark:border-emerald-900/40 dark:text-emerald-300"
                  >
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {isBusy ? 'Updating...' : 'Mark completed'}
                  </button>
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
                  <span>Progress</span>
                  <span>{task.progress ?? 0}%</span>
                </div>
                <div className="mt-2 h-2 rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${task.progress ?? 0}%` }}></div>
                </div>
              </div>
            </div>
          );
        })}
        {tasks.length === 0 && (
          <div className="rounded-3xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
            No tasks found for the selected filters.
          </div>
        )}
      </section>

      <footer className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-500">
        <div>
          Showing page {meta.page} of {meta.totalPages} • {meta.total || tasks.length} tasks
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => canPrev && setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
            disabled={!canPrev}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            Previous
          </button>
          <button
            onClick={() => canNext && setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
            disabled={!canNext}
            className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300"
          >
            Next
          </button>
        </div>
      </footer>
    </main>
  );
};

export default EmployeeTasks;
