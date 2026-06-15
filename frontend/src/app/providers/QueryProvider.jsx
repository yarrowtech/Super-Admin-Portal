import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { attachQueryPersister } from '../../utils/localStorageCache';

// Per-module stale/cache strategy aligned to caching spec:
//   dashboard/kpi   → stale 1m  / gc 10m
//   projects/tasks  → stale 5m  / gc 30m
//   reports         → stale 15m / gc 1h
//   settings/config → stale 1h  / gc 24h
//   permissions     → stale 1h  / gc 24h
//   profile/auth    → stale 30m / gc 24h
//   notifications   → stale 30s / gc 5m
//   default         → stale 90s / gc 10m
const getDefaultsForKey = (queryKey) => {
  const key = Array.isArray(queryKey) ? queryKey[0] : queryKey;
  const str = String(key || '').toLowerCase();
  if (str.includes('dashboard') || str.includes('kpi') || str.includes('metric')) {
    return { staleTime: 60_000, gcTime: 10 * 60_000 };
  }
  if (str.includes('settings') || str.includes('config') || str.includes('workflow')) {
    return { staleTime: 60 * 60_000, gcTime: 24 * 60 * 60_000 };
  }
  if (str.includes('permission') || str.includes('role')) {
    return { staleTime: 60 * 60_000, gcTime: 24 * 60 * 60_000 };
  }
  if (str.includes('report') || str.includes('analytic') || str.includes('stat')) {
    return { staleTime: 15 * 60_000, gcTime: 60 * 60_000 };
  }
  if (str.includes('user') || str.includes('profile') || str.includes('auth') || str.includes('session')) {
    return { staleTime: 30 * 60_000, gcTime: 24 * 60 * 60_000 };
  }
  if (str.includes('project') || str.includes('task') || str.includes('leave')) {
    return { staleTime: 5 * 60_000, gcTime: 30 * 60_000 };
  }
  if (str.includes('notification') || str.includes('chat')) {
    return { staleTime: 30_000, gcTime: 5 * 60_000 };
  }
  return { staleTime: 90_000, gcTime: 10 * 60_000 };
};

const queryClient = new QueryClient({
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
        if (import.meta.env.DEV) {
          console.error('[QueryClient] mutation error', error);
        }
      },
    },
  },
});

// Attach localStorage persister — hydrates previous session data on startup,
// flushes successful queries on a debounced interval.
attachQueryPersister(queryClient);

// Expose queryClient for imperative cache operations (e.g. logout invalidation)
export { queryClient };

// Helper: invalidate all cached data for a given portal module
export const invalidatePortalCache = (module) => {
  queryClient.invalidateQueries({ queryKey: [module], exact: false });
};

// Helper: prefetch a query (called on sidebar hover)
export const prefetchQuery = (queryKey, queryFn, opts = {}) => {
  const merged = { ...getDefaultsForKey(queryKey), ...opts };
  return queryClient.prefetchQuery({ queryKey, queryFn, staleTime: merged.staleTime });
};

const QueryProvider = ({ children }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

export default QueryProvider;
