import React, { useEffect, useState } from 'react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { useAuth } from '../../context/AuthContext';
import { taskAdapters } from '../../features/tasks/taskAdapters';
import { TASK_PRIORITIES } from '../../features/tasks/taskConstants';
import LinkedItemsPicker from './LinkedItemsPicker';

const emptyForm = { title: '', description: '', dueDate: '', priority: 'medium', assignedTo: '', department: '', project: '', linkedItems: [] };

export const fieldCls = 'mt-1 w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-900 placeholder:text-neutral-400 focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100';

// Every box carries a visible label; placeholders are only examples.
export const Field = ({ label, hint, required, children }) => (
  <label className="block">
    <span className="text-sm font-semibold text-neutral-700 dark:text-neutral-200">
      {label}{required && <span className="ml-0.5 text-rose-500">*</span>}
    </span>
    {children}
    {hint && <span className="mt-1 block text-xs text-neutral-500 dark:text-neutral-400">{hint}</span>}
  </label>
);

const todayIso = () => new Date().toISOString().split('T')[0];

/** Create-task form — only fields the backend genuinely accepts per portal. */
const CreateTaskModal = ({ portal, open, onClose, onSubmit }) => {
  const { token } = useAuth();
  const adapter = taskAdapters[portal];
  const [form, setForm] = useState(emptyForm);
  const [projects, setProjects] = useState([]);
  const [projectsError, setProjectsError] = useState('');
  const [assignees, setAssignees] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [usersError, setUsersError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    if (open && adapter?.needsAssignee && adapter.fetchAssignableUsers) {
      adapter.fetchAssignableUsers(token).then((users) => { if (active) setAssignees(users); }).catch(() => { if (active) { setAssignees([]); setUsersError('Unable to load employees. Close and reopen to retry.'); } }).finally(() => { if (active) setLoadingUsers(false); });
    }
    return () => { active = false; };
  }, [open, adapter, token]);

  useEffect(() => {
    let active = true;
    if (open && adapter?.fetchProjects) {
      setProjectsError('');
      adapter.fetchProjects(token).then((rows) => { if (active) setProjects(rows); }).catch(() => { if (active) setProjectsError('Unable to load projects. Close and reopen to retry.'); });
    }
    return () => { active = false; };
  }, [open, adapter, token]);

  if (!open) return null;

  const showProject = adapter?.needsProject || adapter?.supportsProject;
  const projectName = projects.find((p) => p._id === form.project)?.name || '';

  const handleClose = () => {
    setLoadingUsers(true);
    setUsersError('');
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
    if (adapter?.needsProject && !form.project) { setError('Choose a managed project.'); return; }
    if (submitting) return;
    setSubmitting(true);
    setError('');
    try {
      const body = {
        title: form.title.trim(),
        description: form.description.trim(),
        dueDate: form.dueDate,
        priority: form.priority,
        ...(showProject && form.project ? { project: form.project } : {}),
        ...(adapter?.needsAssignee ? { assignedTo: form.assignedTo } : {}),
        ...(adapter?.supportsLinkedItems && form.linkedItems.length ? { linkedItems: form.linkedItems } : {}),
      };
      await onSubmit(body);
      handleClose();
    } catch (err) {
      setError(err?.message || 'Unable to create task.');
    } finally {
      setSubmitting(false);
    }
  };

  const visibleAssignees = assignees.filter((a) => portal !== 'hr' || (a.department || 'Unassigned department') === form.department);

  return (
    <Modal open={open} onClose={handleClose} title="Create Task" description="Assign work, set the deadline and share the documents needed.">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</p>}

        <Field label="Task title" required>
          <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Review vendor NDA before signing" className={fieldCls} />
        </Field>

        <Field label="Description" required hint="What should be done and what “done” looks like.">
          <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="e.g. Check liability and termination clauses, add key points for the head." className={fieldCls} />
        </Field>

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Due date" required>
            <input required type="date" min={todayIso()} value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={fieldCls} />
          </Field>
          <Field label="Priority">
            <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={fieldCls}>
              {TASK_PRIORITIES.map((p) => <option key={p.key} value={p.key}>{p.label}</option>)}
            </select>
          </Field>
        </div>

        {portal === 'hr' && (
          <Field label="Department" required hint={form.department && !loadingUsers ? `${visibleAssignees.length} active employees in this department` : undefined}>
            <select required value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value, assignedTo: '' })} className={fieldCls}>
              <option value="">Choose department</option>
              {[...new Set(assignees.map((a) => a.department || 'Unassigned department'))].sort().map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
        )}

        {adapter?.needsAssignee && (
          <Field label="Assign to" required hint={loadingUsers ? 'Loading employees…' : usersError || undefined}>
            <select
              required
              disabled={loadingUsers || (portal === 'hr' && !form.department)}
              value={form.assignedTo}
              onChange={(e) => setForm({ ...form, assignedTo: e.target.value })}
              className={fieldCls}
            >
              <option value="">Choose a person…</option>
              {visibleAssignees.map((a) => <option key={a.id} value={a.id}>{a.name}{a.isFreelancer ? ' (Freelancer)' : ''}</option>)}
            </select>
          </Field>
        )}

        {showProject && (
          <Field label="Project" required={adapter?.needsProject} hint={projectsError || (adapter?.supportsLinkedItems ? 'Pick a project to see and create its legal documents below.' : undefined)}>
            <select required={adapter?.needsProject} value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className={fieldCls}>
              <option value="">{adapter?.needsProject ? 'Choose a managed project' : 'No project'}</option>
              {projects.map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
            </select>
          </Field>
        )}

        {adapter?.supportsLinkedItems && (
          <LinkedItemsPicker
            portal={portal}
            projectId={form.project}
            projectName={projectName}
            value={form.linkedItems}
            onChange={(linkedItems) => setForm((f) => ({ ...f, linkedItems }))}
          />
        )}

        <div className="flex justify-end gap-2 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <Button type="button" variant="secondary" onClick={handleClose}>Cancel</Button>
          <Button type="submit" disabled={submitting || (adapter?.needsAssignee && loadingUsers) || Boolean(usersError)}>{submitting ? 'Creating…' : 'Create Task'}</Button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateTaskModal;
