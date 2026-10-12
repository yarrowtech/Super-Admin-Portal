import { useCallback, useEffect, useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';

/**
 * The finance portal's data-loading hook, shared by FinanceWorkspacePages and
 * FinanceRiskPages (which each had their own copy of it).
 *
 * `loading` is derived rather than stored: it stays true until the result for the current
 * request key arrives, so the effect never sets state synchronously and the previous
 * page's rows stay visible while the next request is in flight.
 *
 * Pass `cacheKey` (a `QK.finance.*` tuple) to route the load through React Query, so the
 * result is shared with the rest of the app, survives navigating away and back, and picks
 * up the per-key policy in utils/queryPolicies.js — including the deliberately uncached
 * risk surfaces (disputes, refunds, control tower), which revalidate every time but still
 * de-duplicate concurrent requests and keep their rows on screen while refetching.
 *
 * Without `cacheKey` the hook keeps its original local-state behaviour, which is what the
 * ad-hoc one-off loads still want.
 */
export const useFinanceAsync = (loader, deps = [], cacheKey = null) => {
  const [state, setState] = useState({ key: null, error: '', data: {} });
  const [reloadKey, setReloadKey] = useState(0);
  const key = JSON.stringify([...deps.map((d) => (typeof d === 'object' ? String(d) : d)), reloadKey]);

  // Keep the latest loader in a ref so the cached branch never closes over a stale one
  // while still keeping a stable queryFn identity.
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const cached = useQuery({
    queryKey: cacheKey ? [...cacheKey, key] : ['__finance_disabled__'],
    queryFn: () => loaderRef.current(),
    enabled: Boolean(cacheKey),
    // Mirrors the uncached branch: show the last result while the next one loads instead
    // of flashing an empty state on every filter change.
    placeholderData: (prev) => prev,
  });

  useEffect(() => {
    if (cacheKey) return undefined;
    let alive = true;
    (async () => {
      try {
        const raw = await loaderRef.current();
        if (alive) setState({ key, error: '', data: raw });
      } catch (err) {
        if (alive) setState((prev) => ({ key, error: err.message || 'Failed to load data', data: prev.data || {} }));
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, Boolean(cacheKey)]);

  const localRefetch = useCallback(() => setReloadKey((k) => k + 1), []);

  if (cacheKey) {
    return {
      loading: cached.isPending || cached.isLoading,
      error: cached.isError ? (cached.error?.message || 'Failed to load data') : '',
      data: cached.data ?? {},
      refetch: cached.refetch,
    };
  }
  return { loading: state.key !== key, error: state.key === key ? state.error : '', data: state.data, refetch: localRefetch };
};

export default useFinanceAsync;
