/**
 * CRM data access through the shared TanStack Query cache.
 *
 * The CRM was the one large module still fetching with `useEffect` + `fetch`,
 * which meant: every tab switch refetched from cold, the same reference lists
 * (stages, users, projects) were re-requested by each module that needed them,
 * two modules showing the same client could disagree, and nothing de-duplicated
 * concurrent requests. These hooks put it on the same footing as the rest of the
 * portal.
 *
 * Cache policy comes from `cachePolicyFor(key)` rather than per-call numbers, so
 * staleness is decided in one place (utils/queryPolicies.js) and documented
 * there. Note what is deliberately NOT persisted: every client-shaped payload
 * stays in memory only, because it carries customer names, emails and phone
 * numbers. Only stage and template config — pure configuration — may reach
 * sessionStorage.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { QK, cachePolicyFor } from '../utils/queryKeys';
import { API_BASE_URL } from '../config/backend';

// ── Transport ────────────────────────────────────────────────────────────────

/**
 * One fetch wrapper for the whole module.
 *
 * `signal` is threaded through from TanStack Query so a query that unmounts or
 * is superseded actually aborts the request instead of resolving into a cache
 * entry nobody is waiting for. The error carries `status`, which the shared
 * retry policy reads to decide whether retrying is pointless (a 4xx) or worth
 * it (a 5xx, 408, 429).
 */
export const crmFetch = async (path, token, { signal, ...options } = {}) => {
  const res = await fetch(`${API_BASE_URL}/api/v1/crm${path}`, {
    ...options,
    signal,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(body.error || `HTTP ${res.status}`), { status: res.status });
  }
  return body;
};

/** Drops empty filter values so `{ status: '' }` and `{}` are the same cache key. */
const clean = (params = {}) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== '' && v !== null && v !== undefined),
  );

const qs = (params) => new URLSearchParams(clean(params)).toString();

/** Builds a query whose policy is resolved from its own key. */
const policied = (queryKey, queryFn, extra = {}) => ({
  queryKey,
  queryFn,
  ...cachePolicyFor(queryKey),
  ...extra,
});

// ── Reference data ───────────────────────────────────────────────────────────
// Shared by nearly every CRM screen. Before these hooks each module fetched its
// own copy on mount; now the first caller pays and the rest read the cache.

export function useCrmStatuses(department = 'all') {
  const { token } = useAuth();
  const key = QK.crm.statuses(department);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/statuses?department=${department}`, token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

export function useCrmUsers() {
  const { token } = useAuth();
  const key = QK.crm.users();
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch('/users', token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

export function useCrmProjects() {
  const { token } = useAuth();
  const key = QK.crm.projects();
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch('/import/projects', token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

export function useCrmEmailTemplates(department = 'all') {
  const { token } = useAuth();
  const key = QK.crm.emailTemplates(department);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/email-templates?department=${department}`, token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

// ── Clients ──────────────────────────────────────────────────────────────────

/**
 * Paginated client list.
 *
 * `placeholderData` keeps the previous page's rows on screen while the next one
 * loads, so paging does not flash an empty table — the single most visible
 * difference from the old useEffect version.
 */
export function useCrmClients(params = {}) {
  const { token } = useAuth();
  const filters = clean(params);
  const key = QK.crm.clients(filters);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/clients?${qs(filters)}`, token, { signal }),
    {
      enabled: Boolean(token),
      placeholderData: (prev) => prev,
    },
  ));
}

export function useCrmClientOverview(clientId) {
  const { token } = useAuth();
  const key = QK.crm.clientOverview(clientId);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/clients/${clientId}/overview`, token, { signal }).then(r => r.data),
    { enabled: Boolean(token && clientId) },
  ));
}

export function useCrmClientOptions(department = 'all') {
  const { token } = useAuth();
  const key = QK.crm.clientOptions(department);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/clients/options?department=${department}`, token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

// ── Other surfaces ───────────────────────────────────────────────────────────

export function useCrmDashboard(department = 'all') {
  const { token } = useAuth();
  const key = QK.crm.dashboard(department);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/dashboard?department=${department}`, token, { signal }).then(r => r.data),
    { enabled: Boolean(token) },
  ));
}

export function useCrmPipeline(department = 'all') {
  const { token } = useAuth();
  const key = QK.crm.pipeline(department);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/pipeline?department=${department}`, token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

export function useCrmReminders(params = {}) {
  const { token } = useAuth();
  const filters = clean(params);
  const key = QK.crm.reminders(filters);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/reminders?${qs(filters)}`, token, { signal }),
    { enabled: Boolean(token) },
  ));
}

export function useCrmActivity(params = {}) {
  const { token } = useAuth();
  const filters = clean(params);
  const key = QK.crm.activity(filters);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/activity?${qs(filters)}`, token, { signal }),
    { enabled: Boolean(token), placeholderData: (prev) => prev },
  ));
}

export function useCrmFollowUps(params = {}) {
  const { token } = useAuth();
  const filters = clean(params);
  const key = QK.crm.followups(filters);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/followups?${qs(filters)}`, token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

export function useCrmProjectBreakdown(department = 'all') {
  const { token } = useAuth();
  const key = QK.crm.projectBreakdown(department);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/projects/breakdown?department=${department}`, token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

export function useCrmImportBatches(params = {}) {
  const { token } = useAuth();
  const filters = clean(params);
  const key = QK.crm.importBatches(filters);
  return useQuery(policied(
    key,
    ({ signal }) => crmFetch(`/import/batches?${qs(filters)}`, token, { signal }).then(r => r.data || []),
    { enabled: Boolean(token) },
  ));
}

// ── Invalidation ─────────────────────────────────────────────────────────────

/**
 * Centralised cache fan-out after a write.
 *
 * A single CRM write is almost never confined to one screen: moving a client's
 * stage changes the clients list, the pipeline board, the project rollup, the
 * dashboard counts and the activity feed. Hand-picking keys at each call site is
 * how one of them gets forgotten and a screen shows a value the user already
 * changed. Everything funnels through here instead.
 *
 * `clientId` additionally refreshes that client's own detail and 360 view.
 */
export function useCrmInvalidate() {
  const queryClient = useQueryClient();

  return useCallback(({ clientId, scope = 'client' } = {}) => {
    const drop = (queryKey) => queryClient.invalidateQueries({ queryKey });

    if (clientId) {
      drop(QK.crm.client(clientId));
      drop(QK.crm.clientOverview(clientId));
    }

    // Prefix invalidation: ['crm','clients'] covers every filter/page variant of
    // the list without enumerating them.
    if (scope === 'client' || scope === 'all') {
      drop(['crm', 'clients']);
      drop(['crm', 'pipeline']);
      drop(['crm', 'projects']);
      drop(['crm', 'dashboard']);
      drop(['crm', 'activity']);
      drop(['crm', 'analytics']);
    }
    if (scope === 'followup' || scope === 'all') {
      drop(['crm', 'followups']);
      drop(['crm', 'reminders']);
      drop(['crm', 'dashboard']);
      // A follow-up completing writes a communication, which the feed shows.
      drop(['crm', 'activity']);
      // nextFollowUpAt lives on the client row, so the list's overdue
      // highlighting is stale until the clients list is refetched too.
      drop(['crm', 'clients']);
    }
    if (scope === 'import' || scope === 'all') {
      drop(['crm', 'import']);
      drop(['crm', 'clients']);
      drop(['crm', 'projects']);
      drop(['crm', 'dashboard']);
    }
    if (scope === 'reference' || scope === 'all') {
      drop(['crm', 'statuses']);
      drop(['crm', 'emailTemplates']);
    }
    if (scope === 'contact' || scope === 'all') {
      drop(['crm', 'contacts']);
    }
  }, [queryClient]);
}

// ── Mutations ────────────────────────────────────────────────────────────────

/**
 * Update one client.
 *
 * The cached detail entries are written directly from the response so the
 * drawer updates without a round trip, while the lists are invalidated — their
 * ordering and filter membership may have changed, which a local patch cannot
 * know.
 */
export function useUpdateCrmClient() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const invalidate = useCrmInvalidate();

  return useMutation({
    mutationFn: ({ id, patch }) =>
      crmFetch(`/clients/${id}`, token, { method: 'PUT', body: JSON.stringify(patch) })
        .then(r => r.data),
    onSuccess: (data, { id }) => {
      if (data) queryClient.setQueryData(QK.crm.client(id), data);
      invalidate({ clientId: id, scope: 'client' });
    },
  });
}

export function useCreateCrmClient() {
  const { token } = useAuth();
  const invalidate = useCrmInvalidate();

  return useMutation({
    mutationFn: (payload) =>
      crmFetch('/clients', token, { method: 'POST', body: JSON.stringify(payload) }).then(r => r.data),
    onSuccess: () => invalidate({ scope: 'client' }),
  });
}

export function useDeactivateCrmClient() {
  const { token } = useAuth();
  const invalidate = useCrmInvalidate();

  return useMutation({
    mutationFn: (id) => crmFetch(`/clients/${id}`, token, { method: 'DELETE' }),
    onSuccess: (_data, id) => invalidate({ clientId: id, scope: 'client' }),
  });
}

/** Bulk actions all invalidate the same set, so one hook covers every variant. */
export function useCrmBulkAction() {
  const { token } = useAuth();
  const invalidate = useCrmInvalidate();

  return useMutation({
    mutationFn: ({ action, ids, ...body }) =>
      crmFetch(`/clients/bulk/${action}`, token, {
        method: 'POST',
        body: JSON.stringify({ ids, ...body }),
      }).then(r => r.data),
    onSuccess: () => invalidate({ scope: 'all' }),
  });
}

export function useCompleteCrmFollowUp() {
  const { token } = useAuth();
  const invalidate = useCrmInvalidate();

  return useMutation({
    mutationFn: (id) =>
      crmFetch(`/followups/${id}`, token, {
        method: 'PUT',
        body: JSON.stringify({ status: 'completed' }),
      }).then(r => r.data),
    onSuccess: (data) => invalidate({
      clientId: data?.client?._id || data?.client,
      scope: 'followup',
    }),
  });
}

export function useSnoozeCrmFollowUp() {
  const { token } = useAuth();
  const invalidate = useCrmInvalidate();

  return useMutation({
    mutationFn: ({ id, days }) =>
      crmFetch(`/followups/${id}/snooze`, token, {
        method: 'PUT',
        body: JSON.stringify({ days }),
      }).then(r => r.data),
    onSuccess: (data) => invalidate({
      clientId: data?.client?._id || data?.client,
      scope: 'followup',
    }),
  });
}

export function useRevertCrmImport() {
  const { token } = useAuth();
  const invalidate = useCrmInvalidate();

  return useMutation({
    mutationFn: (batchId) =>
      crmFetch(`/import/batches/${batchId}`, token, { method: 'DELETE' }).then(r => r.data),
    onSuccess: () => invalidate({ scope: 'import' }),
  });
}

// ── Prefetch ─────────────────────────────────────────────────────────────────

/**
 * Warm a client's 360 view before it is opened.
 *
 * Called on row hover: by the time the drawer mounts the request is usually
 * already in flight or done, so the drawer opens populated instead of on a
 * spinner. `ensureQueryData` is a no-op when a fresh entry already exists, so
 * hovering a list repeatedly costs nothing.
 */
export function useCrmPrefetch() {
  const { token } = useAuth();
  const queryClient = useQueryClient();

  const prefetchClientOverview = useCallback((clientId) => {
    if (!token || !clientId) return;
    const key = QK.crm.clientOverview(clientId);
    queryClient.ensureQueryData({
      queryKey: key,
      queryFn: ({ signal }) => crmFetch(`/clients/${clientId}/overview`, token, { signal }).then(r => r.data),
      ...cachePolicyFor(key),
    }).catch(() => { /* A prefetch must never surface an error. */ });
  }, [token, queryClient]);

  return { prefetchClientOverview };
}
