import { useCallback, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { cachePolicyFor } from '../utils/queryKeys';

const PREFETCH_DELAY_MS = 150;
const prefetchedRoutes = new Set();

/**
 * Returns event handlers that trigger prefetching on hover/focus.
 *
 * Usage — data only:
 *   const { prefetchHandlers } = usePrefetch();
 *   <NavLink {...prefetchHandlers(() => api.getDashboard(), QK.dashboard.all())} />
 *
 * Usage — route + data:
 *   const { prefetchHandlers } = usePrefetch();
 *   <NavLink {...prefetchHandlers(
 *     () => api.getDashboard(),
 *     QK.dashboard.all(),
 *     () => import('../components/hr/HRModuleDashboard')
 *   )} />
 */
export const usePrefetch = () => {
  const queryClient = useQueryClient();
  const timer = useRef(null);

  const prefetchHandlers = useCallback(
    (queryFn, queryKey, routeImportFn = null, staleTime = null) => {
      const run = () => {
        const effectiveStaleTime = staleTime ?? cachePolicyFor(queryKey).staleTime;

        // Prefetch data
        if (queryFn && queryKey) {
          queryClient.prefetchQuery({
            queryKey,
            queryFn,
            staleTime: effectiveStaleTime,
          }).catch(() => {});
        }

        // Prefetch route chunk (one-time per route)
        if (routeImportFn) {
          const routeId = routeImportFn.toString().slice(0, 80);
          if (!prefetchedRoutes.has(routeId)) {
            prefetchedRoutes.add(routeId);
            routeImportFn().catch(() => {});
          }
        }
      };

      return {
        onMouseEnter: () => {
          timer.current = window.setTimeout(run, PREFETCH_DELAY_MS);
        },
        onMouseLeave: () => {
          window.clearTimeout(timer.current);
        },
        onFocus: run,
      };
    },
    [queryClient]
  );

  /**
   * Prefetch a list of queries imperatively (e.g. after login to warm cache).
   */
  const warmCache = useCallback(
    (entries) => {
      entries.forEach(({ queryKey, queryFn, staleTime = null }) => {
        const effectiveStaleTime = staleTime ?? cachePolicyFor(queryKey).staleTime;
        if (queryKey && queryFn) {
          queryClient.prefetchQuery({ queryKey, queryFn, staleTime: effectiveStaleTime }).catch(() => {});
        }
      });
    },
    [queryClient]
  );

  return { prefetchHandlers, warmCache };
};
