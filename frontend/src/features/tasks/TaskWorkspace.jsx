import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import PortalHeader from '../../components/common/PortalHeader';
import QuickActions from '../../components/common/QuickActions';
import SectionCard from '../../components/ui/SectionCard';
import TaskViewSwitcher from '../../components/tasks/TaskViewSwitcher';
import TaskFilters from '../../components/tasks/TaskFilters';
import KanbanBoard from '../../components/tasks/KanbanBoard';
import TaskListView from '../../components/tasks/TaskListView';
import TaskDetailDrawer from '../../components/tasks/TaskDetailDrawer';
import CreateTaskModal from '../../components/tasks/CreateTaskModal';
import { useTaskBoard } from './useTaskBoard';
import { useCreateTaskMutation } from './useTaskMutations';

/**
 * One shared task workspace body, reused by the IT Manager, HR, and
 * Employee portals (all backed by the same Task model) — only `portal`,
 * `title`, and `description` vary per caller.
 *
 * `renderHeader=false` lets a caller that already renders its own portal
 * header (e.g. HR's HrPageShell, which also hosts a Tasks/Work-Updates tab
 * switcher) embed the task workspace without a duplicate header.
 */
const TaskWorkspace = ({ portal, icon, title, description, renderHeader = true, headerExtra }) => {
  const { user } = useAuth();
  const [view, setView] = useState('board');
  const [filters, setFilters] = useState({});
  const [openTask, setOpenTask] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const board = useTaskBoard(portal, filters);
  const createTask = useCreateTaskMutation(portal, filters);

  const content = (
    <div className={renderHeader ? 'portal-page-inner space-y-5' : 'space-y-4'}>
      {renderHeader && (
        <PortalHeader
          title={title}
          subtitle={description}
          icon={icon}
          user={user}
          onRefresh={board.refetch}
          refreshing={board.isFetching}
          primaryAction={{ label: 'Create Task', icon: 'add_task', onClick: () => setCreateOpen(true) }}
        />
      )}

      <div className="flex flex-wrap items-center justify-between gap-2">
        {headerExtra}
        <QuickActions
          actions={[
            ...(renderHeader ? [] : [{ label: 'Create Task', icon: 'add_task', onClick: () => setCreateOpen(true) }]),
            { label: view === 'board' ? 'Switch to List' : 'Switch to Board', icon: view === 'board' ? 'view_list' : 'view_kanban', onClick: () => setView(view === 'board' ? 'list' : 'board') },
          ]}
        />
      </div>

      <SectionCard
        title="Tasks"
        icon="task_alt"
        description={`${board.total} task${board.total === 1 ? '' : 's'}`}
        error={board.isError ? board.error : null}
        onRetry={board.refetch}
        noBodyPadding
      >
        <div className="p-4 lg:p-5">
          <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
            <TaskFilters filters={filters} onChange={setFilters} tasks={board.tasks} />
            <TaskViewSwitcher view={view} onChange={setView} />
          </div>

          {view === 'board' ? (
            <KanbanBoard portal={portal} columns={board.columns} loading={board.isLoading} filters={filters} onOpenTask={setOpenTask} />
          ) : (
            <TaskListView tasks={board.tasks} loading={board.isLoading} onOpenTask={setOpenTask} />
          )}
        </div>
      </SectionCard>

      <TaskDetailDrawer portal={portal} task={openTask} filters={filters} onClose={() => setOpenTask(null)} />
      <CreateTaskModal portal={portal} open={createOpen} onClose={() => setCreateOpen(false)} onSubmit={(body) => createTask.mutateAsync(body)} />
    </div>
  );

  if (!renderHeader) return content;
  return <main className="portal-page">{content}</main>;
};

export default TaskWorkspace;
