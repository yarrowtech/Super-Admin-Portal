import { QueryClient } from '@tanstack/react-query';
import { attachQueryPersister } from '../../utils/localStorageCache';
import { QK, cachePolicyFor } from '../../utils/queryKeys';
import { createLogger } from '../../utils/logger';

const queryLogger = createLogger({ module: 'query-client' });

const queryRoots = [
  QK.auth.root(),
  QK.dashboard.root(),
  QK.users.root(),
  QK.projects.root(),
  QK.tasks.root(),
  QK.hr.root(),
  QK.manager.root(),
  QK.employee.root(),
  QK.ceo.root(),
  QK.admin.root(),
  QK.finance.root(),
  QK.it.root(),
  QK.law.root(),
  QK.outsourcing.root(),
  QK.reports.root(),
  QK.analytics.root(),
  QK.settings.root(),
  QK.notifications.root(),
  QK.chat.root(),
  QK.media.root(),
];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 90_000,
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
      retry: (failureCount, error) => {
        const status = error?.status ?? error?.response?.status;
        if (status === 401 || status === 403 || status === 404) return false;
        return failureCount < 2;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),
    },
    mutations: {
      retry: 0,
      onError: (error) => {
        queryLogger.error({ err: error }, 'Mutation error');
      },
    },
  },
});

queryRoots.forEach((queryKey) => {
  queryClient.setQueryDefaults(queryKey, cachePolicyFor(queryKey));
});

attachQueryPersister(queryClient);

export const invalidatePortalCache = (module) => {
  queryClient.invalidateQueries({ queryKey: [module], exact: false });
};

export const prefetchQuery = (queryKey, queryFn, opts = {}) => {
  const merged = { ...cachePolicyFor(queryKey), ...opts };
  return queryClient.prefetchQuery({ queryKey, queryFn, staleTime: merged.staleTime });
};
