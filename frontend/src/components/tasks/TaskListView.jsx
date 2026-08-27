import React from 'react';
import DataTable from '../ui/DataTable';
import StatusBadge from '../common/StatusBadge';
import Avatar from '../common/Avatar';
import { statusToTone } from '../../utils/statusTone';
import { priorityToTone, statusLabel } from '../../features/tasks/taskConstants';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '—');

/** List/table view of the same task set the board renders — same query, same cache. */
const TaskListView = ({ tasks, loading, onOpenTask }) => {
  const columns = [
    { key: 'title', header: 'Task', render: (t) => <span className="font-semibold text-neutral-900 dark:text-neutral-100">{t.title}</span> },
    { key: 'project', header: 'Project', render: (t) => t.project?.name || '—' },
    { key: 'assignee', header: 'Assignee', render: (t) => t.assignee ? <div className="flex items-center gap-2"><Avatar name={t.assignee.name} size="xs" />{t.assignee.name}</div> : '—' },
    { key: 'priority', header: 'Priority', render: (t) => <StatusBadge tone={priorityToTone(t.priority)} label={t.priority} dot={false} /> },
    { key: 'status', header: 'Status', render: (t) => <StatusBadge tone={statusToTone(t.status)} label={statusLabel(t.status)} dot={false} /> },
    { key: 'dueDate', header: 'Due date', render: (t) => <span className={t.isOverdue && t.status !== 'completed' && t.status !== 'cancelled' ? 'font-semibold text-rose-600' : ''}>{formatDate(t.dueDate)}</span> },
  ];

  return (
    <DataTable
      columns={columns}
      rows={tasks}
      rowKey="id"
      loading={loading}
      onRowClick={onOpenTask}
      emptyTitle="No tasks found"
      emptyDescription="Create a task or adjust your filters."
    />
  );
};

export default TaskListView;
