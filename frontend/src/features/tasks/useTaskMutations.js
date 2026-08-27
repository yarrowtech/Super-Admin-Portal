import { useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useOptimisticMutation } from '../../hooks/useOptimisticMutation';
import { QK } from '../../utils/queryKeys';
import { taskAdapters } from './taskAdapters';

/**
 * Drag-and-drop / status-change mutation. Optimistic update + automatic
 * rollback is handled by the shared useOptimisticMutation hook (already
 * used elsewhere in the app) — this just supplies the per-portal mutation
 * function and the updater/invalidation shape specific to task boards.
 *
 * On success it also invalidates the projects and dashboard cache roots
 * (not the whole app) so a status move that finishes/starts a task shows up
 * in project-progress rollups and portal dashboard task counts without a
 * manual refresh — never a blanket invalidateQueries() of everything.
 */
export const useTaskStatusMutation = (portal, filters = {}) => {
  const { token } = useAuth();
  const toast = useToast();
  const adapter = taskAdapters[portal];
  const boardKey = QK.tasks.board(portal, filters);

  return useOptimisticMutation({
    queryKey: boardKey,
    mutationFn: ({ taskId, status }) => adapter.updateStatus(token, taskId, status),
    updater: (data, { taskId, status }) => {
      if (!data?.tasks) return data;
      return { ...data, tasks: data.tasks.map((t) => (t.id === taskId ? { ...t, status } : t)) };
    },
    invalidateKeys: [boardKey, QK.projects.root(), QK.dashboard.root()],
    onError: () => {
      toast?.error?.('Unable to move task. Changes were reverted.');
    },
    onSuccess: () => {
      toast?.success?.('Task updated successfully');
    },
  });
};

/** Create a task on the given portal, then refresh that portal's board. */
export const useCreateTaskMutation = (portal, filters = {}) => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const adapter = taskAdapters[portal];
  const boardKey = QK.tasks.board(portal, filters);

  return {
    mutateAsync: async (body) => {
      try {
        const result = await adapter.createTask(token, body);
        queryClient.invalidateQueries({ queryKey: boardKey });
        toast?.success?.('Task created successfully');
        return result;
      } catch (error) {
        toast?.error?.(error?.message || 'Unable to create task.');
        throw error;
      }
    },
  };
};

/** Add a comment to a task (only supported today on portals where canComment is true). */
export const useAddTaskCommentMutation = (portal, taskId) => {
  const { token } = useAuth();
  const toast = useToast();
  const queryClient = useQueryClient();
  const adapter = taskAdapters[portal];
  const detailKey = QK.tasks.portalDetail(portal, taskId);

  return {
    mutateAsync: async (text) => {
      if (!adapter?.canComment) return null;
      try {
        const result = await adapter.addComment(token, taskId, text);
        queryClient.invalidateQueries({ queryKey: detailKey });
        return result;
      } catch (error) {
        toast?.error?.(error?.message || 'Unable to add comment.');
        throw error;
      }
    },
  };
};
