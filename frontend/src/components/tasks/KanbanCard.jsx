import React from 'react';
import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import StatusBadge from '../common/StatusBadge';
import Avatar from '../common/Avatar';
import { statusToTone } from '../../utils/statusTone';
import { priorityToTone, statusLabel } from '../../features/tasks/taskConstants';

const formatDueDate = (value) => {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short' }).format(new Date(value));
};

/** A single draggable task card — only the fields a viewer needs to triage at a glance. */
const KanbanCard = ({ task, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: task.id,
    data: { task },
  });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onOpen(task)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter') onOpen(task); }}
      className="cursor-grab rounded-xl border border-neutral-200 bg-white p-3 shadow-sm transition-shadow hover:shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 active:cursor-grabbing dark:border-neutral-800 dark:bg-neutral-900"
    >
      <p className="line-clamp-2 text-sm font-bold text-neutral-900 dark:text-neutral-100">{task.title}</p>
      {task.project?.name && (
        <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{task.project.name}</p>
      )}

      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <StatusBadge tone={priorityToTone(task.priority)} label={task.priority} dot={false} />
        {task.isOverdue && task.status !== 'completed' && task.status !== 'cancelled' ? (
          <StatusBadge tone="danger" label="Overdue" />
        ) : (
          <StatusBadge tone={statusToTone(task.status)} label={statusLabel(task.status)} dot={false} />
        )}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        {task.assignee ? (
          <div title={task.assignee.name}>
            <Avatar name={task.assignee.name} size="xs" />
          </div>
        ) : <span />}
        <div className="flex items-center gap-2 text-[11px] text-neutral-400">
          {task.comments?.length > 0 && (
            <span className="flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">chat_bubble</span>{task.comments.length}
            </span>
          )}
          {task.attachments?.length > 0 && (
            <span className="flex items-center gap-0.5">
              <span className="material-symbols-outlined text-[13px]">attach_file</span>{task.attachments.length}
            </span>
          )}
          {formatDueDate(task.dueDate) && <span>{formatDueDate(task.dueDate)}</span>}
        </div>
      </div>
    </div>
  );
};

export default KanbanCard;
