import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { lawApi } from '../../services/law';
import PortalHeader from '../common/PortalHeader';
import WarmGreeting from '../common/WarmGreeting';
import KPICard from '../common/KPICard';
import StatusBadge from '../common/StatusBadge';
import SectionCard from '../ui/SectionCard';
import { priorityToTone } from '../../features/tasks/taskConstants';

const formatDate = (v) => (v ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(v)) : '-');

const QUICK_LINKS = [
  { label: 'My tasks', icon: 'task', to: '/law/tasks' },
  { label: 'Assigned work', icon: 'assignment', to: '/law/assigned-work' },
  { label: 'Project overview', icon: 'folder_copy', to: '/law/project-overview' },
  { label: 'Attendance', icon: 'calendar_month', to: '/law/attendance' },
  { label: 'Team', icon: 'group', to: '/law/team' },
  { label: 'Messages', icon: 'forum', to: '/law/messages' },
  { label: 'Leave', icon: 'event_busy', to: '/law/leave' },
];

/**
 * Dashboard for law_employee. Deliberately has no project selector and no access to the
 * contracts / documents / compliance modules: an employee's legal work arrives as tasks (with
 * read-only linked items inside each task), so this page is a task summary.
 */
const LawEmployeeDashboard = () => {
  const { user, token } = useAuth();
  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ['law', 'employee-dashboard-tasks'],
    queryFn: () => lawApi.getTasks(token, { limit: 100 }),
    enabled: Boolean(token),
    staleTime: 30_000,
  });
  const tasks = useMemo(() => data?.data?.tasks || [], [data]);
  const stats = useMemo(() => {
    const count = (fn) => tasks.filter(fn).length;
    return {
      open: count((t) => ['pending', 'in-progress', 'review'].includes(t.status)),
      review: count((t) => t.status === 'review'),
      completed: count((t) => t.status === 'completed'),
      overdue: count((t) => t.isOverdue && !['completed', 'cancelled'].includes(t.status)),
    };
  }, [tasks]);
  const upcoming = useMemo(
    () => tasks.filter((t) => !['completed', 'cancelled'].includes(t.status))
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate)).slice(0, 6),
    [tasks],
  );

  return (
    <main className="portal-page">
      <div className="portal-page-inner space-y-5">
        <PortalHeader
          title="Legal Workspace"
          subtitle="Your legal work, assigned by the Law head"
          icon="gavel"
          user={user}
          onRefresh={refetch}
          refreshing={isFetching}
        />
        <WarmGreeting user={user} roleHint="assigned legal work" className="!mb-0" />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <KPICard title="Open tasks" value={stats.open} icon="task" subtitle="Assigned to you" />
          <KPICard title="In review" value={stats.review} icon="rate_review" tone="info" />
          <KPICard title="Overdue" value={stats.overdue} icon="warning" tone={stats.overdue ? 'danger' : 'neutral'} />
          <KPICard title="Completed" value={stats.completed} icon="check_circle" tone="success" />
        </div>
        <SectionCard title="Up next" icon="event" description="Your nearest deadlines" error={isError ? error : null} onRetry={refetch}>
          {isLoading ? (
            <p className="animate-pulse text-sm text-neutral-500">Loading tasks...</p>
          ) : upcoming.length === 0 ? (
            <p className="text-sm text-neutral-500">Nothing pending. New tasks from the Law head will appear here.</p>
          ) : (
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {upcoming.map((task) => (
                <li key={task._id || task.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <Link to="/law/tasks" className="block truncate font-semibold hover:underline">{task.title}</Link>
                    <p className="text-xs text-neutral-500">
                      Due {formatDate(task.dueDate)}
                      {task.linkedItems?.length ? ` · ${task.linkedItems.length} linked item${task.linkedItems.length === 1 ? '' : 's'}` : ''}
                    </p>
                  </div>
                  <StatusBadge tone={priorityToTone(task.priority)} label={task.priority} dot={false} />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
        <SectionCard title="Shortcuts" icon="bolt">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
            {QUICK_LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="flex flex-col items-center gap-2 rounded-xl border border-neutral-200 p-4 text-center text-sm font-semibold hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900">
                <span className="material-symbols-outlined text-2xl">{link.icon}</span>
                {link.label}
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>
    </main>
  );
};

export default LawEmployeeDashboard;
