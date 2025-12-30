import React, { useEffect, useState } from 'react';
import { employeeApi } from '../../api/employee';
import { useAuth } from '../../context/AuthContext';

const EmployeeTasks = () => {
  const { token } = useAuth();
  const [buckets, setBuckets] = useState({ today: [], upcoming: [], blocked: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionTaskId, setActionTaskId] = useState(null);

  const buildBucketsFromTasks = (tasks = []) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const nextBuckets = { today: [], upcoming: [], blocked: [] };

    tasks.forEach((task) => {
      const status = task.status?.toLowerCase?.() || '';
      if (status === 'cancelled' || status === 'blocked') {
        nextBuckets.blocked.push(task);
        return;
      }
      if (task.dueDate) {
        const due = new Date(task.dueDate);
        due.setHours(0, 0, 0, 0);
        if (due.getTime() <= today.getTime()) {
          nextBuckets.today.push(task);
          return;
        }
      }
      nextBuckets.upcoming.push(task);
    });

    return nextBuckets;
  };

  const fetchTasks = async () => {
    if (!token) return;
    setLoading(true);
    setError('');
    try {
      const res = await employeeApi.getTasks(token);
      const payload = res?.data || res || {};
      if (payload.tasks) {
        setBuckets(buildBucketsFromTasks(payload.tasks));
      } else {
        setBuckets(payload || { today: [], upcoming: [], blocked: [] });
      }
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token]);

  const handleCompleteTask = async (taskId) => {
    if (!token || !taskId) return;
    setActionTaskId(taskId);
    try {
      await employeeApi.updateTaskStatus(token, taskId, { status: 'completed' });
      await fetchTasks();
    } catch (err) {
      setError(err.message || 'Failed to update task');
    } finally {
      setActionTaskId(null);
    }
  };

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-neutral-600 dark:text-neutral-200">Loading tasks...</div>;
  }

  if (error) {
    return <div className="flex min-h-screen items-center justify-center text-red-600 dark:text-red-400">{error}</div>;
  }

  const bucketsConfig = [
    { key: 'today', title: 'Today', accent: 'bg-amber-100 text-amber-700' },
    { key: 'upcoming', title: 'Upcoming', accent: 'bg-blue-100 text-blue-700' },
    { key: 'blocked', title: 'Blocked', accent: 'bg-rose-100 text-rose-700' },
  ];

  return (
    <main className="mx-auto flex max-w-[1200px] flex-col gap-6">
      <header className="rounded-3xl border border-slate-200/70 bg-white/90 p-6 shadow-lg shadow-primary/5 dark:border-slate-800 dark:bg-slate-900/70">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400">Task detail</p>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white">My work queue</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Stay on top of what\'s due today and what\'s coming next.</p>
          </div>
        </div>
      </header>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {bucketsConfig.map((bucket) => (
          <div key={bucket.key} className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900 dark:text-white">{bucket.title}</p>
                <p className="text-xs text-slate-500">{(buckets[bucket.key] || []).length} tasks</p>
              </div>
              <span className={`rounded-full px-3 py-1 text-xs font-semibold ${bucket.accent}`}>
                {bucket.title}
              </span>
            </div>
            <div className="space-y-3">
              {(buckets[bucket.key] || []).map((task) => (
                <div key={task.id} className="rounded-2xl border border-slate-100 bg-white/80 p-4 shadow-sm transition hover:border-primary/30 dark:border-slate-700 dark:bg-slate-900/60">
                  <p className="text-sm font-semibold text-slate-900 dark:text-white">{task.title}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{task.project || task.status}</p>
                  <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <span className="material-symbols-outlined text-base text-slate-400">schedule</span>
                      {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-GB', { 
                        day: '2-digit', 
                        month: '2-digit', 
                        year: '2-digit' 
                      }) : 'No due date'}
                    </div>
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:bg-white/10 dark:text-slate-200">
                      {task.priority || 'Normal'}
                    </span>
                  </div>
                  <div className="mt-3 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 capitalize">
                      {task.status || 'pending'}
                    </span>
                    <button
                      onClick={() => handleCompleteTask(task.id || task._id)}
                      disabled={actionTaskId === (task.id || task._id)}
                      className="inline-flex items-center gap-1 rounded-full border border-emerald-200 px-3 py-1 text-xs font-semibold text-emerald-600 transition hover:border-emerald-400 hover:text-emerald-700 disabled:opacity-50 dark:border-emerald-900/40 dark:text-emerald-300"
                    >
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      {actionTaskId === (task.id || task._id) ? 'Updating...' : 'Mark completed'}
                    </button>
                  </div>
                </div>
              ))}
              {(buckets[bucket.key] || []).length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400">Nothing in this bucket.</p>
              )}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
};

export default EmployeeTasks;
