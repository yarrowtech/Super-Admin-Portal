import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { taskAdapters } from '../../features/tasks/taskAdapters';
import { TASK_PRIORITIES } from '../../features/tasks/taskConstants';

const emptyForm = { title: '', description: '', dueDate: '', priority: 'medium', assignedTo: '' };

/** Minimal, real create-task form — only fields the backend genuinely accepts per portal. */
const CreateTaskModal = ({ portal, open, onClose, onSubmit }) => {
  const { token } = useAuth();
  const adapter = taskAdapters[portal];
  const [form, setForm] = useState(emptyForm);
  const [assignees, setAssignees] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && adapter?.needsAssignee && adapter.fetchAssignableUsers) {
      adapter.fetchAssignableUsers(token).then(setAssignees).catch(() => setAssignees([]));
    }
  }, [open, adapter, token]);

  if (!open) return null;

  const handleClose = () => {
    setForm(emptyForm);
    setError('');
    onClose();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || !form.description.trim() || !form.dueDate) {
      setError('Title, description, and due date are required.');
      return;
    }
    if (adapter?.needsAssignee && !form.assignedTo) {
      setError('Please choose an assignee.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        priority: form.priority,
        ...(adapter?.needsAssignee ? { assignedTo: form.assignedTo } : {}),
      };
      await onSubmit(body);
      handleClose();
    } catch (err) {
      setError(err?.message || 'Unable to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={handleClose} title="Create Task">
      <form onSubmit={handleSubmit} className="space-y-3">
        {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}
        <input
          required
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <textarea
          required
          placeholder="Description"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
        />
        <div className="grid grid-cols-2 gap-3">
          <input
            required
            type="date"
            value={form.dueDate}
            onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          />
          <select
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {TASK_PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
          </select>
        </div>
        {adapter?.needsAssignee && (
          <select
            required
            value={form.assignedTo}
            onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            <option value="">Assign to…</option>
            {assignees.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        )}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={submitting}>{submitting ? 'Creating…' : 'Create Task'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
