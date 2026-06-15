import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Generic optimistic mutation hook with automatic rollback on error.
 *
 * @param {object} options
 * @param {string|string[]} options.queryKey  - Single key or array of keys to optimistically update
 * @param {function} options.mutationFn       - Async function that performs the actual mutation
 * @param {function} options.updater          - (oldData, variables) => newData
 * @param {string[]|string[][]} [options.invalidateKeys] - Keys to invalidate on settle (defaults to queryKey)
 * @param {function} [options.onSuccess]      - Called after mutation succeeds
 * @param {function} [options.onError]        - Called after rollback with (error, variables, context)
 *
 * Usage:
 *   const mutation = useOptimisticMutation({
 *     queryKey: QK.tasks.list({ projectId }),
 *     mutationFn: (vars) => api.patch(`/tasks/${vars.id}`, vars),
 *     updater: (tasks, vars) => tasks.map(t => t._id === vars.id ? { ...t, ...vars } : t),
 *   });
 *   mutation.mutate({ id: '123', status: 'done' });
 */
export const useOptimisticMutation = ({
  queryKey,
  mutationFn,
  updater,
  invalidateKeys,
  onSuccess,
  onError,
}) => {
  const queryClient = useQueryClient();

  const normaliseKeys = (k) => {
    if (!k) return [];
    if (Array.isArray(k) && Array.isArray(k[0])) return k;
    return [k];
  };

  const targetKeys = normaliseKeys(queryKey);
  const keysToInvalidate = invalidateKeys ? normaliseKeys(invalidateKeys) : targetKeys;

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await Promise.all(
        targetKeys.map((key) => queryClient.cancelQueries({ queryKey: key }))
      );

      // Snapshot current data for each key
      const snapshots = targetKeys.map((key) => ({
        key,
        data: queryClient.getQueryData(key),
      }));

      // Apply optimistic update
      if (updater) {
        targetKeys.forEach((key) => {
          queryClient.setQueryData(key, (oldData) => {
            if (oldData === undefined) return oldData;
            try {
              return updater(oldData, variables);
            } catch {
              return oldData;
            }
          });
        });
      }

      return { snapshots };
    },

    onError: (error, variables, context) => {
      // Roll back to snapshot
      if (context?.snapshots) {
        context.snapshots.forEach(({ key, data }) => {
          if (data !== undefined) {
            queryClient.setQueryData(key, data);
          }
        });
      }
      onError?.(error, variables, context);
    },

    onSuccess: (data, variables, context) => {
      onSuccess?.(data, variables, context);
    },

    onSettled: () => {
      keysToInvalidate.forEach((key) => {
        queryClient.invalidateQueries({ queryKey: key });
      });
    },
  });
};
