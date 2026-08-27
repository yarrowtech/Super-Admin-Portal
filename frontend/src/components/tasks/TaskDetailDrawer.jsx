import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import Drawer from '../ui/Drawer';
import StatusBadge from '../common/StatusBadge';
import Avatar from '../common/Avatar';
import { TASK_STATUSES, priorityToTone } from '../../features/tasks/taskConstants';
import { useAuth } from '../../context/AuthContext';
import { QK, cachePolicyFor } from '../../utils/queryKeys';
import { taskAdapters } from '../../features/tasks/taskAdapters';
import { useTaskStatusMutation, useAddTaskCommentMutation } from '../../features/tasks/useTaskMutations';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');

/**
 * Shared task detail — only shows fields confirmed real on the Task schema.
 * Status is changed via a real <select> (not just drag) so status changes
 * are fully keyboard-accessible without needing custom keyboard-drag math.
 * Attachments/comments render only where the backend actually returns them
 * for that portal (see taskAdapters' canFetchDetail/canComment flags).
 */
const TaskDetailDrawer = ({ portal, task, filters, onClose }) => {
  const { token, user } = useAuth();
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

  if (!task) return null;
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
            <StatusBadge tone={priorityToTone(full.priority)} label={full.priority} dot={false} className="mt-1" />
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
              <div className="mt-1 flex items-center gap-2"><Avatar name={full.assignee.name} size="xs" />{full.assignee.name}</div>
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
