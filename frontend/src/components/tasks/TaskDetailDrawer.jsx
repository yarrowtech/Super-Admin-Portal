import React, { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import Drawer from '../ui/Drawer';
import StatusBadge from '../common/StatusBadge';
import Avatar from '../common/Avatar';
import { TASK_STATUSES, TASK_PRIORITIES, priorityToTone, priorityLabel } from '../../features/tasks/taskConstants';
import { useAuth } from '../../context/AuthContext';
import { QK, cachePolicyFor } from '../../utils/queryKeys';
import { taskAdapters, portalLabel } from '../../features/tasks/taskAdapters';
import { useTaskStatusMutation, useAddTaskCommentMutation } from '../../features/tasks/useTaskMutations';
import { useToast } from '../../context/ToastContext';
import LinkedItemsPicker from './LinkedItemsPicker';
import LinkedItemsSection from './LinkedItemsSection';
import { Field, fieldCls } from './CreateTaskModal';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');

/**
 * Shared task detail — only shows fields confirmed real on the Task schema.
 * Status is changed via a real <select> (not just drag) so status changes
 * are fully keyboard-accessible without needing custom keyboard-drag math.
 * Attachments/comments render only where the backend actually returns them
 * for that portal (see taskAdapters' canFetchDetail/canComment flags).
 */
const TaskDetailDrawer = ({ portal, task, filters, onClose, canManage = false }) => {
  const { token, user } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const adapter = taskAdapters[portal];
  const statusMutation = useTaskStatusMutation(portal, filters);
  const [commentText, setCommentText] = useState('');

  const detailKey = QK.tasks.portalDetail(portal, task?.id);
  const detailQuery = useQuery({
    queryKey: detailKey,
    queryFn: () => adapter.fetchDetail(token, task.id, user),
    enabled: Boolean(task) && Boolean(adapter?.canFetchDetail),
    ...cachePolicyFor(detailKey),
  });

  const addComment = useAddTaskCommentMutation(portal, task?.id);

  const manageEnabled = canManage && Boolean(adapter?.updateTask || adapter?.deleteTask);
  const assigneesQuery = useQuery({
    queryKey: ['task-assignees', portal],
    queryFn: () => adapter.fetchAssignableUsers(token),
    enabled: Boolean(task) && manageEnabled && editing && Boolean(adapter?.fetchAssignableUsers),
    staleTime: 60_000,
  });
  const projectsQuery = useQuery({
    queryKey: ['task-projects', portal],
    queryFn: () => adapter.fetchProjects(token),
    enabled: Boolean(task) && manageEnabled && editing && Boolean(adapter?.supportsProject),
    staleTime: 60_000,
  });

  useEffect(() => { setEditing(false); }, [task?.id]);

  if (!task) return null;

  const refreshBoard = () => queryClient.invalidateQueries({ queryKey: QK.tasks.board(portal, filters) });

  const startEdit = () => {
    setForm({
      title: task.title || '',
      description: task.description || '',
      priority: task.priority || 'medium',
      dueDate: task.dueDate ? String(task.dueDate).slice(0, 10) : '',
      assignedTo: task.assignee?.id || '',
      project: task.project?.id || '',
      // canEdit must round-trip, or saving the task would silently revoke edit rights.
      linkedItems: (task.linkedItems || []).map((l) => ({ module: l.module, recordId: l.recordId, title: l.title, canEdit: Boolean(l.canEdit) })),
    });
    setEditing(true);
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adapter.updateTask(token, task.id, {
        title: form.title.trim(),
        description: form.description.trim(),
        priority: form.priority,
        dueDate: form.dueDate,
        ...(form.assignedTo ? { assignedTo: form.assignedTo } : {}),
        ...(adapter.supportsLinkedItems ? { linkedItems: form.linkedItems } : {}),
        ...(adapter.supportsProject ? { project: form.project || null } : {}),
      });
      toast?.success?.('Task updated');
      setEditing(false);
      refreshBoard();
      onClose();
    } catch (err) {
      toast?.error?.(err?.message || 'Unable to update task.');
    } finally {
      setSaving(false);
    }
  };

  const removeTask = async () => {
    if (!window.confirm('Delete this task permanently?')) return;
    try {
      await adapter.deleteTask(token, task.id);
      toast?.success?.('Task deleted');
      refreshBoard();
      onClose();
    } catch (err) {
      toast?.error?.(err?.message || 'Unable to delete task.');
    }
  };

  const full = adapter?.canFetchDetail && detailQuery.data ? detailQuery.data : task;

  const submitComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    await addComment.mutateAsync(commentText.trim());
    setCommentText('');
    detailQuery.refetch();
  };

  return (
    <Drawer open={Boolean(task)} title={full.title} onClose={onClose}>
      <div className="space-y-5">
        {manageEnabled && (
          <div className="flex flex-wrap gap-2">
            {adapter.updateTask && !editing && (
              <button type="button" onClick={startEdit} className="rounded-lg border border-neutral-200 px-3 py-1.5 text-sm font-semibold dark:border-neutral-700">Edit task</button>
            )}
            {adapter.deleteTask && (
              <button type="button" onClick={removeTask} className="rounded-lg border border-rose-200 px-3 py-1.5 text-sm font-semibold text-rose-600 dark:border-rose-900">Delete</button>
            )}
          </div>
        )}
        {editing && form && (
          <form onSubmit={saveEdit} className="space-y-3 rounded-xl border border-neutral-200 p-3 dark:border-neutral-700">
            <Field label="Task title" required>
              <input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className={fieldCls} />
            </Field>
            <Field label="Description" required>
              <textarea required rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={fieldCls} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Due date" required>
                <input required type="date" value={form.dueDate} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} className={fieldCls} />
              </Field>
              <Field label="Priority">
                <select value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })} className={fieldCls}>
                  {TASK_PRIORITIES.map((p) => <option key={p.key || p} value={p.key || p}>{p.label || p}</option>)}
                </select>
              </Field>
            </div>
            {adapter.needsAssignee && (
              <Field label="Assignee">
                <select value={form.assignedTo} onChange={(e) => setForm({ ...form, assignedTo: e.target.value })} className={fieldCls}>
                  <option value="">Keep current assignee</option>
                  {(assigneesQuery.data || []).map((u) => <option key={u.id} value={u.id}>{u.name}{u.isFreelancer ? ' (Freelancer)' : ''}</option>)}
                </select>
              </Field>
            )}
            {adapter.supportsProject && (
              <Field label="Project">
                <select value={form.project} onChange={(e) => setForm({ ...form, project: e.target.value })} className={fieldCls}>
                  <option value="">No project</option>
                  {(projectsQuery.data || []).map((p) => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </Field>
            )}
            {adapter.supportsLinkedItems && (
              <LinkedItemsPicker
                portal={portal}
                projectId={form.project}
                projectName={(projectsQuery.data || []).find((p) => p._id === form.project)?.name || ''}
                value={form.linkedItems}
                onChange={(linkedItems) => setForm((f) => ({ ...f, linkedItems }))}
              />
            )}
            <div className="flex gap-2">
              <button type="submit" disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white disabled:opacity-60">{saving ? 'Saving…' : 'Save changes'}</button>
              <button type="button" onClick={() => setEditing(false)} className="rounded-lg border border-neutral-200 px-3 py-2 text-sm font-semibold dark:border-neutral-700">Cancel</button>
            </div>
          </form>
        )}
        <div>
          <p className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Status</p>
          <select
            value={full.status}
            onChange={(e) => statusMutation.mutate({ taskId: full.id, status: e.target.value })}
            className="w-full rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
          >
            {TASK_STATUSES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>

        {full.description && (
          <div>
            <p className="mb-1 text-xs font-bold uppercase tracking-wide text-neutral-400">Description</p>
            <p className="text-sm text-neutral-700 dark:text-neutral-300">{full.description}</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Priority</p>
            <StatusBadge tone={priorityToTone(full.priority)} label={priorityLabel(full.priority)} dot={false} className="mt-1" />
          </div>
          {full.project && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Project</p>
              <p className="mt-1 font-semibold">{full.project.name}</p>
            </div>
          )}
          {full.assignee && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Assignee</p>
              <div className="mt-1 flex items-center gap-2"><Avatar name={full.assignee.name} size="xs" />{full.assignee.name}{full.assignee.isFreelancer && <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">Freelancer</span>}</div>
            </div>
          )}
          {portalLabel(full.sourcePortal) && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Assigned by portal</p>
              <p className="mt-1">{portalLabel(full.sourcePortal)}</p>
            </div>
          )}
          {full.reporter && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Reported by</p>
              <p className="mt-1">{full.reporter.name}</p>
            </div>
          )}
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Due date</p>
            <p className="mt-1">{formatDate(full.dueDate)}</p>
          </div>
          {full.completedDate && (
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-neutral-400">Completed</p>
              <p className="mt-1">{formatDate(full.completedDate)}</p>
            </div>
          )}
        </div>

        {(adapter?.supportsLinkedItems || full.linkedItems?.length > 0) && (
          <LinkedItemsSection taskId={full.id} taskTitle={full.title} hasLinks={Boolean(full.linkedItems?.length)} />
        )}

        {full.tags?.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {full.tags.map((tag) => (
              <span key={tag} className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{tag}</span>
            ))}
          </div>
        )}

        {full.attachments?.length > 0 && (
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Attachments</p>
            <ul className="space-y-1.5">
              {full.attachments.map((file, i) => (
                <li key={file.fileUrl || i}>
                  <a href={file.fileUrl} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-semibold text-primary hover:underline">
                    <span className="material-symbols-outlined text-base">attach_file</span>{file.fileName}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-wide text-neutral-400">Comments</p>
          {adapter?.canFetchDetail && detailQuery.isLoading ? (
            <p className="text-sm text-neutral-400">Loading comments…</p>
          ) : full.comments?.length ? (
            <ul className="space-y-3">
              {full.comments.map((comment) => (
                <li key={comment.id} className="rounded-lg bg-neutral-50 p-3 text-sm dark:bg-neutral-800/60">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-semibold">{comment.author?.name || 'Someone'}</span>
                    <span className="text-[11px] text-neutral-400">{formatDate(comment.at)}</span>
                  </div>
                  <p className="mt-1 text-neutral-700 dark:text-neutral-300">{comment.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-neutral-400">No comments yet.</p>
          )}

          {adapter?.canComment && (
            <form onSubmit={submitComment} className="mt-3 flex gap-2">
              <input
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Add a comment..."
                className="flex-1 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm dark:border-neutral-700 dark:bg-neutral-900"
              />
              <button type="submit" className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">Send</button>
            </form>
          )}
        </div>
      </div>
    </Drawer>
  );
};

export default TaskDetailDrawer;
