import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { QK, cachePolicyFor } from '../../utils/queryKeys';
import { taskAdapters } from './taskAdapters';
import { TASK_STATUS_KEYS, sortTasksDeterministically } from './taskConstants';

/**
 * Shared data source for both the Kanban board and the list view of a
 * portal's Tasks module — same query key, same cache entry, so switching
 * views never re-fetches or duplicates the request.
 */
export const useTaskBoard = (portal, filters = {}) => {
  const { token, user } = useAuth();
  const adapter = taskAdapters[portal];
  const queryKey = QK.tasks.board(portal, filters);

  const query = useQuery({
    queryKey,
    queryFn: () => adapter.fetchTasks(token, filters, user),
    enabled: Boolean(token) && Boolean(adapter),
    ...cachePolicyFor(queryKey),
  });

  // `project` isn't a server-supported filter on any of the three portals'
  // task-list endpoints (confirmed in the Phase 2B schema audit), so it's
  // applied client-side over the already-fetched page rather than faking
  // server support for it.
  const tasks = useMemo(() => {
    const all = query.data?.tasks || [];
    return all.filter((task) => {
      if (filters.project && task.project?.id !== filters.project) return false;
      if (portal !== 'hr') return true;
      if (filters.department && (task.department || 'Unassigned department') !== filters.department) return false;
      if (filters.assignee && task.assignee?.id !== filters.assignee) return false;
      if (filters.priority && task.priority !== filters.priority) return false;
      if (filters.status && task.status !== filters.status) return false;
      if (filters.dueTo && (!task.dueDate || task.dueDate.slice(0, 10) > filters.dueTo)) return false;
      const search = (filters.search || '').trim().toLowerCase();
      return !search || [task.title, task.description, task.assignee?.name, task.department].filter(Boolean).join(' ').toLowerCase().includes(search);
    });
  }, [query.data, filters, portal]);

  const columns = useMemo(() => {
    const byStatus = new Map(TASK_STATUS_KEYS.map((key) => [key, []]));
    tasks.forEach((task) => {
      const bucket = byStatus.get(task.status) || byStatus.get('pending');
      bucket.push(task);
    });
    return TASK_STATUS_KEYS.map((key) => ({
      key,
      tasks: sortTasksDeterministically(byStatus.get(key) || []),
    }));
  }, [tasks]);

  return {
    ...query,
    tasks,
    columns,
    allTasks: query.data?.tasks || [],
    total: portal === 'hr' ? tasks.length : (query.data?.total ?? tasks.length),
    queryKey,
    adapter,
  };
};
