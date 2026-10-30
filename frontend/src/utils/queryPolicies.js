const minute = 60_000;

const matchesAny = (segment, needles) => needles.some((needle) => segment.includes(needle));

export const CACHE_POLICIES = Object.freeze({
  auth: { staleTime: 10 * minute, gcTime: 60 * minute, meta: { persist: true } },
  permissions: { staleTime: 15 * minute, gcTime: 60 * minute, meta: { persist: true } },
  reference: { staleTime: 30 * minute, gcTime: 24 * 60 * minute, meta: { persist: true } },
  lists: { staleTime: 3 * minute, gcTime: 30 * minute },
  // Persisted: a dashboard is aggregate counts and chart series, not records, so it is
  // safe to restore in-tab, and it is the first screen after every sign-in and reload —
  // the surface where a cold fetch is most visible. The persister is session-scoped and
  // cleared on any session change (utils/localStorageCache.js), so the numbers can never
  // outlive the user who loaded them. Still 60s stale, so what is painted is immediately
  // revalidated in the background.
  dashboards: { staleTime: 60_000, gcTime: 10 * minute, meta: { persist: true } },
  analytics: { staleTime: 3 * minute, gcTime: 60 * minute },
  notifications: { staleTime: 30_000, gcTime: 5 * minute },
  operational: { staleTime: 15_000, gcTime: 10 * minute },
  realtime: { staleTime: 0, gcTime: 60_000 },
  default: { staleTime: 90_000, gcTime: 10 * minute },
});

export const cachePolicyFor = (queryKey) => {
  const segments = Array.isArray(queryKey) ? queryKey.map((part) => String(part || '').toLowerCase()) : [String(queryKey || '').toLowerCase()];
  const seg = segments.join(':');

  if (matchesAny(seg, ['chat', 'typing', 'presence'])) return CACHE_POLICIES.realtime;
  if (matchesAny(seg, ['notification'])) return CACHE_POLICIES.notifications;
  if (matchesAny(seg, ['approval', 'activity', 'attention', 'deadline'])) return CACHE_POLICIES.operational;
  if (matchesAny(seg, ['permission', 'role'])) return CACHE_POLICIES.permissions;
  if (matchesAny(seg, ['settings', 'config', 'workflow', 'holiday', 'department'])) return CACHE_POLICIES.reference;
  // Finance risk surfaces. The server refuses to cache these at all (see the `skip` list in
  // backend/routes/finance.routes.js: "a freeze state served stale could show money as
  // payable after it has been frozen"), so the client must not reintroduce staleness the
  // backend deliberately prevents. `realtime` = always refetch, but still de-duplicates
  // concurrent requests and keeps the previous rows visible while refetching.
  if (segments[0] === 'finance' && matchesAny(seg, ['dispute', 'refund', 'non-compliance', 'control-tower', 'justification'])) {
    return CACHE_POLICIES.realtime;
  }
  // Approval queues: a stale row invites a duplicate approval or an action on a record
  // somebody else already decided.
  if (segments[0] === 'finance' && matchesAny(seg, ['review', 'approval'])) return CACHE_POLICIES.operational;
  // Ledger-bearing finance lists: an invoice balance, a payment's reconciliation state or
  // an expense's approval stage changes as a direct result of what the user just did, and
  // showing money as outstanding after it has been settled is worse than a refetch. These
  // would otherwise fall through to `default` (90s), so they are pinned to `operational`.
  if (segments[0] === 'finance' && matchesAny(seg, ['invoice', 'payment', 'expense', 'budget'])) return CACHE_POLICIES.operational;
  if (matchesAny(seg, ['report', 'analytic', 'stat', 'revenue'])) return CACHE_POLICIES.analytics;
  if (matchesAny(seg, ['dashboard', 'kpi', 'metric', 'overview'])) return CACHE_POLICIES.dashboards;
  if (segments.some(part => ['auth', 'profile', 'session', 'me'].includes(part))) return CACHE_POLICIES.auth;
  if (matchesAny(seg, ['list', 'employees', 'projects', 'tasks', 'leave', 'assets', 'campaigns'])) return CACHE_POLICIES.lists;

  return CACHE_POLICIES.default;
};

export const staleTimeFor = (queryKey) => cachePolicyFor(queryKey).staleTime;
