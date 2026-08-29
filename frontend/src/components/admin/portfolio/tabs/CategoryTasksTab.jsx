import { useState } from 'react';
import { DndContext, DragOverlay, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../../../context/AuthContext';
import { useToast } from '../../../../context/ToastContext';
import { portfolioHierarchyApi } from '../../../../services/portfolioHierarchy';
import { QK, cachePolicyFor } from '../../../../utils/queryKeys';
import { useOptimisticMutation } from '../../../../hooks/useOptimisticMutation';
import DataTable from '../../../ui/DataTable';
import EmptyState from '../../../ui/EmptyState';
import ErrorState from '../../../ui/ErrorState';
import Skeleton from '../../../ui/Skeleton';
import Button from '../../../common/Button';
import { UserAvatar } from '../UserPicker';
import { TASK_STATUS_LABELS, TASK_STATUS_OPTIONS, TASK_BOARD_COLUMNS } from '../portfolioStatus';
import { TaskStatusPill, PriorityPill } from '../PortfolioStatusPills';
import TaskEditModal from './TaskEditModal';

const unwrap = (res) => res?.data ?? res ?? {};

const fmtDate = (v) => {
  if (!v) return 'No due date';
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? 'No due date' : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

const TaskCard = ({ task, onOpen }) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task._id, data: { task } });
  const style = { transform: CSS.Translate.toString(transform), opacity: isDragging ? 0.4 : 1 };
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
      {task.asset?.title && <p className="mt-1 truncate text-xs text-neutral-500 dark:text-neutral-400">{task.asset.title}</p>}
      <div className="mt-2 flex items-center justify-between gap-2">
        <PriorityPill value={task.priority} />
        {task.assignee ? <UserAvatar user={task.assignee} size={20} /> : <span className="text-[11px] text-neutral-400">Unassigned</span>}
      </div>
      {task.dueDate && <p className="mt-2 text-[11px] font-semibold text-neutral-400">{fmtDate(task.dueDate)}</p>}
    </div>
  );
};

const BoardColumn = ({ status, tasks, onOpen }) => {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  return (
    <div
      ref={setNodeRef}
      className={`flex w-64 shrink-0 flex-col rounded-2xl border bg-neutral-50/60 p-2.5 transition-colors dark:bg-neutral-900/40 ${
        isOver ? 'border-primary bg-primary/5' : 'border-neutral-200 dark:border-neutral-800'
      }`}
    >
      <div className="mb-2 flex items-center justify-between px-1">
        <h3 className="text-xs font-bold uppercase tracking-wide text-neutral-600 dark:text-neutral-300">{TASK_STATUS_LABELS[status]}</h3>
        <span className="rounded-full bg-neutral-200 px-2 py-0.5 text-[11px] font-bold text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300">{tasks.length}</span>
      </div>
      <div className="flex min-h-24 flex-1 flex-col gap-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <div className="flex h-20 items-center justify-center rounded-xl border border-dashed border-neutral-300 text-center text-xs text-neutral-400 dark:border-neutral-700">No tasks</div>
        ) : (
          tasks.map((t) => <TaskCard key={t._id} task={t} onOpen={onOpen} />)
        )}
      </div>
    </div>
  );
};

const CategoryTasksTab = ({ portfolioId, categoryId }) => {
  const { token } = useAuth();
  const toast = useToast();
  const [view, setView] = useState('board');
  const [status, setStatus] = useState('');
  const [priority, setPriority] = useState('');
  const [editing, setEditing] = useState(undefined); // undefined = closed, null = create, task = edit
  const [activeTask, setActiveTask] = useState(null);

  const params = { view, status, priority };
  const taskQueryKey = QK.portfolioHierarchy.tasks(categoryId, params);
  const tasksQuery = useQuery({
    queryKey: taskQueryKey,
    queryFn: () => portfolioHierarchyApi.getTasks(token, categoryId, params),
    enabled: Boolean(token && categoryId),
    ...cachePolicyFor(taskQueryKey),
  });
  const data = unwrap(tasksQuery.data);

  // Optimistic: the dropped card moves instantly (board cache updated in
  // onMutate) instead of waiting on a round trip, with automatic rollback if
  // the server rejects the move.
  const moveMutation = useOptimisticMutation({
    queryKey: taskQueryKey,
    invalidateKeys: [taskQueryKey, ['portfolioHierarchy', 'activity', categoryId]],
    mutationFn: ({ taskId, nextStatus }) => portfolioHierarchyApi.moveTask(token, taskId, { status: nextStatus }),
    updater: (oldData, { taskId, nextStatus }) => {
      const columns = oldData?.data?.columns;
      if (!columns) return oldData;
      let moved = null;
      const stripped = columns.map((col) => ({
        ...col,
        tasks: col.tasks.filter((t) => {
          if (t._id !== taskId) return true;
          moved = { ...t, status: nextStatus };
          return false;
        }),
      }));
      if (!moved) return oldData;
      return {
        ...oldData,
        data: {
          ...oldData.data,
          columns: stripped.map((col) => (col.status === nextStatus ? { ...col, tasks: [...col.tasks, moved] } : col)),
        },
      };
    },
    onError: (err) => toast.error(err?.message || 'Failed to move task'),
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));
  const handleDragEnd = (event) => {
    const { active, over } = event;
    setActiveTask(null);
    if (!over) return;
    const task = active.data?.current?.task;
    const nextStatus = over.id;
    if (!task || task.status === nextStatus) return;
    moveMutation.mutate({ taskId: task._id, nextStatus });
  };

  if (tasksQuery.isError) return <ErrorState title="Could not load tasks" description={tasksQuery.error?.message} onRetry={() => tasksQuery.refetch()} />;

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5 dark:border-neutral-700 dark:bg-neutral-900">
          {['list', 'board'].map((v) => (
            <button key={v} type="button" onClick={() => setView(v)} className={`rounded-md px-3 py-1.5 text-xs font-bold capitalize transition ${view === v ? 'bg-primary text-white' : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400'}`}>
              {v}
            </button>
          ))}
        </div>
        <select value={status} onChange={(e) => setStatus(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900">
          <option value="">All Status</option>
          {TASK_STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <select value={priority} onChange={(e) => setPriority(e.target.value)} className="h-9 rounded-lg border border-neutral-200 bg-white px-2 text-xs dark:border-neutral-700 dark:bg-neutral-900">
          <option value="">All Priority</option>
          <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option><option value="critical">Critical</option>
        </select>
        <Button variant="primary" size="sm" className="ml-auto" onClick={() => setEditing(null)} icon={<span className="material-symbols-outlined text-lg">add</span>}>New Task</Button>
      </div>

      {tasksQuery.isLoading ? (
        <div className="flex gap-3 overflow-x-auto">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-56 w-64 shrink-0 rounded-2xl" />)}</div>
      ) : view === 'board' ? (
        (data.columns || []).every((c) => c.tasks.length === 0) ? (
          <EmptyState icon="checklist" title="No tasks yet" description="Create tasks to track execution." actionLabel="New Task" onAction={() => setEditing(null)} />
        ) : (
          <DndContext sensors={sensors} onDragStart={(e) => setActiveTask(e.active?.data?.current?.task || null)} onDragEnd={handleDragEnd}>
            <div className="flex gap-3 overflow-x-auto pb-2">
              {TASK_BOARD_COLUMNS.map((col) => (
                <BoardColumn key={col} status={col} tasks={(data.columns || []).find((c) => c.status === col)?.tasks || []} onOpen={setEditing} />
              ))}
            </div>
            <DragOverlay>{activeTask ? <TaskCard task={activeTask} onOpen={() => {}} /> : null}</DragOverlay>
          </DndContext>
        )
      ) : (data.items || []).length === 0 ? (
        <EmptyState icon="checklist" title="No tasks yet" description="Create tasks to track execution." actionLabel="New Task" onAction={() => setEditing(null)} />
      ) : (
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-sm dark:border-neutral-800 dark:bg-neutral-950">
          <DataTable
            columns={[
              { key: 'title', header: 'Task', render: (t) => <span className="font-semibold text-neutral-900 dark:text-white">{t.title}</span> },
              { key: 'asset', header: 'Asset', render: (t) => t.asset?.title || '—' },
              { key: 'assignee', header: 'Assignee', render: (t) => t.assignee?.name || 'Unassigned' },
              { key: 'status', header: 'Status', render: (t) => <TaskStatusPill value={t.status} /> },
              { key: 'priority', header: 'Priority', render: (t) => <PriorityPill value={t.priority} /> },
              { key: 'dueDate', header: 'Due', render: (t) => fmtDate(t.dueDate) },
              { key: 'updatedAt', header: 'Updated', render: (t) => fmtDate(t.updatedAt) },
            ]}
            rows={data.items || []}
            rowKey="_id"
            onRowClick={setEditing}
            rowActions={(t) => [{ label: 'Edit', icon: 'edit', onClick: () => setEditing(t) }]}
          />
        </div>
      )}

      <TaskEditModal open={editing !== undefined} onClose={() => setEditing(undefined)} portfolioId={portfolioId} categoryId={categoryId} task={editing || null} />
    </section>
  );
};

export default CategoryTasksTab;
