import React, { useEffect, useMemo, useState } from 'react';
import { hrApi } from '../../api/hr';
import { useAuth } from '../../context/AuthContext';

const priorityStyles = {
  low: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  medium: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  high: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  critical: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const statusStyles = {
  pending: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
  'in-progress': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200',
  review: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-200',
  cancelled: 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200',
};

const initialForm = {
  title: '',
  description: '',
  assignedTo: '',
  dueDate: '',
  priority: 'medium',
  status: 'pending',
  estimatedHours: '',
  progress: 0,
};

const HRTaskManagement = () => {
  const { token } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [team, setTeam] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({ status: '', priority: '', assignee: '', search: '' });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState(null);

  const fetchTasks = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError('');
      const response = await hrApi.getTasks(token, {
        page,
        limit: 10,
        status: filters.status || undefined,
        priority: filters.priority || undefined,
        assignee: filters.assignee || undefined,
        search: filters.search || undefined,
      });
      const payload = response?.data || {};
      setTasks(payload.tasks || []);
      setTotalPages(payload.totalPages || 1);
    } catch (err) {
      setError(err.message || 'Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchTeam = async () => {
    if (!token) return;
    try {
      const response = await hrApi.getEmployees(token, { role: 'employee', isActive: true, page: 1, limit: 200 });
      const payload = response?.data || {};
      setTeam(payload.employees || []);
    } catch (err) {
      console.error('Failed to load team', err.message);
    }
  };

  useEffect(() => {
    fetchTasks();
  }, [token, page, filters]);

  useEffect(() => {
    fetchTeam();
  }, [token]);

  const openCreateModal = () => {
    setEditingTask(null);
    setForm(initialForm);
    setFormError('');
    setIsModalOpen(true);
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setForm({
      title: task.title || '',
      description: task.description || '',
      assignedTo: task.assignedTo?._id || task.assignedTo || '',
      dueDate: task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : '',
      priority: task.priority || 'medium',
      status: task.status || 'pending',
      estimatedHours: task.estimatedHours ?? '',
      progress: task.progress ?? 0,
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormError('');
    setForm(initialForm);
    setEditingTask(null);
  };

  const handleSubmit = async () => {
    if (!token) return;
    setFormError('');
    setSaving(true);

    try {
      if (!form.title.trim() || !form.description.trim() || !form.assignedTo || !form.dueDate) {
        setFormError('Title, description, assignee, and due date are required.');
        setSaving(false);
        return;
      }

      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        assignedTo: form.assignedTo,
        dueDate: form.dueDate,
        priority: form.priority,
        status: form.status,
        estimatedHours: form.estimatedHours ? Number(form.estimatedHours) : undefined,
        progress: Number(form.progress) || 0,
      };

      if (!editingTask) {
        await hrApi.createTask(payload, token);
      } else {
        const taskId = editingTask._id || editingTask.id;
        await hrApi.updateTask(taskId, payload, token);
      }

      closeModal();
      fetchTasks();
    } catch (err) {
      setFormError(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleCloseTask = async (taskId) => {
    try {
      setActionLoadingId(taskId);
      await hrApi.closeTask(taskId, token);
      fetchTasks();
    } catch (err) {
      setError(err.message || 'Failed to close task');
    } finally {
      setActionLoadingId(null);
    }
  };

  const formattedTasks = useMemo(() => {
    return tasks.map((task) => {
      const assignee = task.assignedTo
        ? `${task.assignedTo.firstName || ''} ${task.assignedTo.lastName || ''}`.trim()
        : 'Unassigned';
      return {
        ...task,
        assignee,
        dueLabel: task.dueDate ? new Date(task.dueDate).toLocaleDateString() : '-',
        priorityClass: priorityStyles[task.priority] || priorityStyles.medium,
        statusClass: statusStyles[task.status] || statusStyles.pending,
      };
    });
  }, [tasks]);

  return (
    <main className="flex-1 overflow-y-auto p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-900 dark:text-white">Task Management</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Create, assign, and track tasks across the organization.
            </p>
          </div>
          <button
            onClick={openCreateModal}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
          >
            <span className="material-symbols-outlined text-base">add</span>
            New Task
          </button>
        </div>

        <div className="grid gap-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900/60 md:grid-cols-4">
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Search</label>
            <input
              value={filters.search}
              onChange={(e) => setFilters((prev) => ({ ...prev, search: e.target.value }))}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
              placeholder="Search by title or description"
            />
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Status</label>
            <select
              value={filters.status}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, status: e.target.value }));
                setPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="">All</option>
              <option value="pending">Pending</option>
              <option value="in-progress">In progress</option>
              <option value="review">In review</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Priority</label>
            <select
              value={filters.priority}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, priority: e.target.value }));
                setPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="">All</option>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">Assignee</label>
            <select
              value={filters.assignee}
              onChange={(e) => {
                setFilters((prev) => ({ ...prev, assignee: e.target.value }));
                setPage(1);
              }}
              className="mt-2 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
            >
              <option value="">All employees</option>
              {team.map((member) => (
                <option key={member._id} value={member._id}>
                  {member.firstName} {member.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            {error}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900/60">
          <table className="w-full text-left">
            <thead className="border-b border-gray-200 text-xs font-semibold uppercase text-gray-500 dark:border-gray-800 dark:text-gray-400">
              <tr>
                <th className="px-4 py-3">Task</th>
                <th className="px-4 py-3">Assignee</th>
                <th className="px-4 py-3">Due</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    Loading tasks...
                  </td>
                </tr>
              )}
              {!loading && formattedTasks.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-sm text-gray-500 dark:text-gray-400">
                    No tasks found.
                  </td>
                </tr>
              )}
              {!loading &&
                formattedTasks.map((task) => (
                  <tr key={task._id} className="border-b border-gray-200 dark:border-gray-800 last:border-b-0">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{task.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">{task.description}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{task.assignee}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{task.dueLabel}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${task.priorityClass}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${task.statusClass}`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {task.progress || 0}%
                    </td>
                    <td className="px-4 py-3 text-right text-sm">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(task)}
                          className="rounded-md border border-gray-200 px-2 py-1 text-xs font-semibold text-gray-600 hover:border-primary hover:text-primary dark:border-gray-700 dark:text-gray-300"
                        >
                          Edit
                        </button>
                        {task.status !== 'completed' && (
                          <button
                            onClick={() => handleCloseTask(task._id)}
                            disabled={actionLoadingId === task._id}
                            className="rounded-md border border-green-500 px-2 py-1 text-xs font-semibold text-green-600 disabled:opacity-50"
                          >
                            Close
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
          <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3 text-sm text-gray-500 dark:border-gray-800 dark:text-gray-400">
            <p>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page === totalPages}
                className="rounded-full border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 disabled:opacity-50 dark:border-gray-800 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-2xl rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {editingTask ? 'Edit Task' : 'Create Task'}
              </h3>
              <button
                onClick={closeModal}
                className="rounded-full p-1 text-gray-500 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <span className="material-symbols-outlined text-lg">close</span>
              </button>
            </div>

            {formError && (
              <div className="mt-3 rounded-lg border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
                {formError}
              </div>
            )}

            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Title</label>
                <input
                  value={form.title}
                  onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
              <div className="md:col-span-2">
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Assignee</label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => setForm((prev) => ({ ...prev, assignedTo: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="">Select employee</option>
                  {team.map((member) => (
                    <option key={member._id} value={member._id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Due date</label>
                <input
                  type="date"
                  value={form.dueDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Priority</label>
                <select
                  value={form.priority}
                  onChange={(e) => setForm((prev) => ({ ...prev, priority: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Status</label>
                <select
                  value={form.status}
                  onChange={(e) => setForm((prev) => ({ ...prev, status: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                >
                  <option value="pending">Pending</option>
                  <option value="in-progress">In progress</option>
                  <option value="review">In review</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Estimated hours</label>
                <input
                  type="number"
                  min="0"
                  value={form.estimatedHours}
                  onChange={(e) => setForm((prev) => ({ ...prev, estimatedHours: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-600 dark:text-gray-300">Progress (%)</label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={form.progress}
                  onChange={(e) => setForm((prev) => ({ ...prev, progress: e.target.value }))}
                  className="mt-1 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-200"
                />
              </div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-3">
              <button
                onClick={closeModal}
                className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-100 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving}
                className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {saving ? 'Saving...' : editingTask ? 'Update Task' : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default HRTaskManagement;
