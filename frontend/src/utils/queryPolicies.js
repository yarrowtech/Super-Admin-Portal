const minute = 60_000;

const matchesAny = (segment, needles) => needles.some((needle) => segment.includes(needle));

export const CACHE_POLICIES = Object.freeze({
  auth: { staleTime: 10 * minute, gcTime: 60 * minute },
  permissions: { staleTime: 15 * minute, gcTime: 60 * minute },
  reference: { staleTime: 30 * minute, gcTime: 24 * 60 * minute },
  lists: { staleTime: 3 * minute, gcTime: 30 * minute },
  dashboards: { staleTime: 60_000, gcTime: 10 * minute },
  analytics: { staleTime: 3 * minute, gcTime: 60 * minute },
  notifications: { staleTime: 30_000, gcTime: 5 * minute },
  realtime: { staleTime: 0, gcTime: 60_000 },
  default: { staleTime: 90_000, gcTime: 10 * minute },
});

export const cachePolicyFor = (queryKey) => {
  const segments = Array.isArray(queryKey) ? queryKey.map((part) => String(part || '').toLowerCase()) : [String(queryKey || '').toLowerCase()];
  const seg = segments.join(':');

  if (matchesAny(seg, ['chat', 'typing', 'presence'])) return CACHE_POLICIES.realtime;
  if (matchesAny(seg, ['notification'])) return CACHE_POLICIES.notifications;
  if (matchesAny(seg, ['permission', 'role'])) return CACHE_POLICIES.permissions;
  if (matchesAny(seg, ['settings', 'config', 'workflow', 'holiday', 'department'])) return CACHE_POLICIES.reference;
  if (matchesAny(seg, ['report', 'analytic', 'stat', 'revenue'])) return CACHE_POLICIES.analytics;
  if (matchesAny(seg, ['dashboard', 'kpi', 'metric', 'overview'])) return CACHE_POLICIES.dashboards;
  if (matchesAny(seg, ['auth', 'profile', 'session', 'me'])) return CACHE_POLICIES.auth;
  if (matchesAny(seg, ['list', 'employees', 'projects', 'tasks', 'leave', 'assets', 'campaigns'])) return CACHE_POLICIES.lists;

  return CACHE_POLICIES.default;
};

export const staleTimeFor = (queryKey) => cachePolicyFor(queryKey).staleTime;
