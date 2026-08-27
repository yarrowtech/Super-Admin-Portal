import React from 'react';
import { useDroppable } from '@dnd-kit/core';
import KanbanCard from './KanbanCard';
import Skeleton from '../ui/Skeleton';

/** One status column. Droppable target for drag-and-drop; renders its own compact empty state. */
const KanbanColumn = ({ column, tasks, loading, onOpenTask }) => {
  const { setNodeRef, isOver } = useDroppable({ id: column.key, data: { status: column.key } });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-72 shrink-0 flex-col rounded-2xl border bg-neutral-50/60 p-2.5 transition-colors dark:bg-neutral-900/40 ${
        isOver ? 'border-(--portal-accent,var(--color-primary)) bg-(--portal-accent-soft,var(--color-primary-50))' : 'border-neutral-200 dark:border-neutral-800'
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">{column.label}</h3>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">
          {tasks.length}
        </span>
      </div>

      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto">
        {loading ? (
          Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-xl" />)
        ) : tasks.length === 0 ? (
          <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-400 dark:border-neutral-700">
            No tasks
          </div>
        ) : (
          tasks.map((task) => <KanbanCard key={task.id} task={task} onOpen={onOpenTask} />)
        )}
      </div>
    </div>
  );
};

export default KanbanColumn;
