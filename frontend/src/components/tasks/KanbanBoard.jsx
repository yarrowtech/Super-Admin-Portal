import React, { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import KanbanColumn from './KanbanColumn';
import KanbanCard from './KanbanCard';
import { TASK_STATUSES } from '../../features/tasks/taskConstants';
import { useTaskStatusMutation } from '../../features/tasks/useTaskMutations';

/**
 * Production Kanban board: drag between real status columns, optimistic
 * move with automatic rollback + error toast on failure (via
 * useTaskStatusMutation -> useOptimisticMutation), real per-column loading
 * skeletons and empty states. Every move persists to the backend — there is
 * no frontend-only drag state.
 *
 * Keyboard access to status changes is provided via the TaskDetailDrawer's
 * status field (Enter on a card opens it) rather than a custom keyboard
 * drag-coordinate implementation, which is far more reliable for moving a
 * card between arbitrary columns than approximating drag offsets by keyboard.
 */
const KanbanBoard = ({ portal, columns, loading, filters, onOpenTask }) => {
  const [activeTask, setActiveTask] = useState(null);
  const statusMutation = useTaskStatusMutation(portal, filters);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const handleDragStart = (event) => {
    setActiveTask(event.active?.data?.current?.task || null);
  };

  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const task = active.data?.current?.task;
    const nextStatus = over.id;
    if (!task || task.status === nextStatus) return;
    statusMutation.mutate({ taskId: task.id, status: nextStatus });
  };

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-2">
        {TASK_STATUSES.map((statusDef) => {
          const column = columns.find((c) => c.key === statusDef.key) || { key: statusDef.key, tasks: [] };
          return (
            <KanbanColumn
              key={statusDef.key}
              column={statusDef}
              tasks={column.tasks}
              loading={loading}
              onOpenTask={onOpenTask}
            />
          );
        })}
      </div>
      <DragOverlay>{activeTask ? <KanbanCard task={activeTask} onOpen={() => {}} /> : null}</DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
