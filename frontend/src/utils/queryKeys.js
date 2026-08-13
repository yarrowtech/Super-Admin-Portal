/**
 * Centralised query-key factory.
 * Every key is a tuple so TanStack Query can diff / invalidate at any level.
 *
 * Usage:
 *   useQuery({ queryKey: QK.dashboard.all() })
 *   useQuery({ queryKey: QK.users.list({ page: 1, search: 'ali' }) })
 *   queryClient.invalidateQueries({ queryKey: QK.users.root() })
 */

export const QK = {
  // ── Auth / session ──────────────────────────────────────────────────
  auth: {
    root: ()          => ['auth'],
    me:   ()          => ['auth', 'me'],
    permissions: ()   => ['auth', 'permissions'],
  },

  // ── Dashboard (per-role) ─────────────────────────────────────────────
  dashboard: {
    root:    ()                   => ['dashboard'],
    all:     (role = 'all')       => ['dashboard', role],
    metrics: (role = 'all')       => ['dashboard', role, 'metrics'],
    kpi:     (role = 'all')       => ['dashboard', role, 'kpi'],
  },

  // ── Users ────────────────────────────────────────────────────────────
  users: {
    root:    ()                           => ['users'],
    list:    (params = {})                => ['users', 'list', params],
    detail:  (id)                         => ['users', 'detail', id],
    profile: (id = 'me')                  => ['users', 'profile', id],
    roles:   ()                           => ['users', 'roles'],
    search:  (term, params = {})          => ['users', 'search', term, params],
  },

  // ── Projects ─────────────────────────────────────────────────────────
  projects: {
    root:   ()                            => ['projects'],
    list:   (params = {})                 => ['projects', 'list', params],
    detail: (id)                          => ['projects', 'detail', id],
    tasks:  (projectId, params = {})      => ['projects', projectId, 'tasks', params],
    search: (term, params = {})           => ['projects', 'search', term, params],
  },

  // ── Tasks ────────────────────────────────────────────────────────────
  tasks: {
    root:    ()                           => ['tasks'],
    list:    (params = {})                => ['tasks', 'list', params],
    detail:  (id)                         => ['tasks', 'detail', id],
    my:      (params = {})                => ['tasks', 'my', params],
    buckets: (params = {})                => ['tasks', 'buckets', params],
  },

  // ── HR ───────────────────────────────────────────────────────────────
  hr: {
    root:         ()                      => ['hr'],
    employees:    (params = {})           => ['hr', 'employees', params],
    employee:     (id)                    => ['hr', 'employee', id],
    attendance:   (params = {})           => ['hr', 'attendance', params],
    leave:        (params = {})           => ['hr', 'leave', params],
    leaveBalances:(params = {})           => ['hr', 'leaveBalances', params],
    leavePolicies:(params = {})           => ['hr', 'leavePolicies', params],
    holidays:     (params = {})           => ['hr', 'holidays', params],
    recruitment:  (params = {})           => ['hr', 'recruitment', params],
    performance:  (params = {})           => ['hr', 'performance', params],
    notices:      (params = {})           => ['hr', 'notices', params],
    complaints:   (params = {})           => ['hr', 'complaints', params],
    workReports:  (params = {})           => ['hr', 'workReports', params],
    tasks:        (params = {})           => ['hr', 'tasks', params],
    profiles:     (params = {})           => ['hr', 'profiles', params],
    profile:      (id)                    => ['hr', 'profile', id],
    dashboard:    ()                      => ['hr', 'dashboard'],
    analytics:    ()                      => ['hr', 'analytics'],
    predictive:   ()                      => ['hr', 'predictive'],
    automation:   ()                      => ['hr', 'automation'],
    summary:      ()                      => ['hr', 'summary'],
  },

  // ── Manager ──────────────────────────────────────────────────────────
  manager: {
    root:      ()                         => ['manager'],
    dashboard: ()                         => ['manager', 'dashboard'],
    team:      (params = {})              => ['manager', 'team', params],
    reports:   (params = {})              => ['manager', 'reports', params],
    workboard: (params = {})              => ['manager', 'workboard', params],
  },

  // ── Employee ─────────────────────────────────────────────────────────
  employee: {
    root:      ()                         => ['employee'],
    dashboard: ()                         => ['employee', 'dashboard'],
    profile:   ()                         => ['employee', 'profile'],
    projects:  (params = {})              => ['employee', 'projects', params],
    tasks:     (params = {})              => ['employee', 'tasks', params],
    leave:     (params = {})              => ['employee', 'leave', params],
    documents: (params = {})              => ['employee', 'documents', params],
    team:      ()                         => ['employee', 'team'],
  },

  // ── CEO ──────────────────────────────────────────────────────────────
  ceo: {
    root:      ()                         => ['ceo'],
    dashboard: (period = '30d')           => ['ceo', 'dashboard', period],
    analytics: (period = '30d')           => ['ceo', 'analytics', period],
    reports:   (params = {})              => ['ceo', 'reports', params],
    employees: (params = {})              => ['ceo', 'employees', params],
  },

  // ── Admin ─────────────────────────────────────────────────────────────
  admin: {
    root:        ()                       => ['admin'],
    dashboard:   ()                       => ['admin', 'dashboard'],
    users:       (params = {})            => ['admin', 'users', params],
    departments: ()                       => ['admin', 'departments'],
    security:    (params = {})            => ['admin', 'security', params],
    reports:     (params = {})            => ['admin', 'reports', params],
    workflows:   ()                       => ['admin', 'workflows'],
    outsourcing: (sub, params = {})       => ['admin', 'outsourcing', sub, params],
    projects:    (params = {})            => ['admin', 'projects', params],
    legalDocs:   (params = {})            => ['admin', 'legalDocs', params],
    legalDoc:    (id)                     => ['admin', 'legalDoc', id],
    // Nested — SuperAdminDashboard.jsx's six tabs, each independently keyed so
    // a change in one (e.g. the users search box) can't invalidate the others.
    superAdmin: {
      overview:      ()                   => ['admin', 'superAdmin', 'overview'],
      metrics:       ()                   => ['admin', 'superAdmin', 'metrics'],
      sessionCount:  ()                   => ['admin', 'superAdmin', 'sessionCount'],
      users:         (params = {})        => ['admin', 'superAdmin', 'users', params],
      user:          (id)                 => ['admin', 'superAdmin', 'user', id],
      userSessions:  (id)                 => ['admin', 'superAdmin', 'userSessions', id],
      sessions:      ()                   => ['admin', 'superAdmin', 'sessions'],
      audit:         ()                   => ['admin', 'superAdmin', 'audit'],
      security:      ()                   => ['admin', 'superAdmin', 'security'],
      health:        ()                   => ['admin', 'superAdmin', 'health'],
    },
  },

  // ── Finance ───────────────────────────────────────────────────────────
  finance: {
    root:      ()                         => ['finance'],
    dashboard: ()                         => ['finance', 'dashboard'],
    invoices:  (params = {})              => ['finance', 'invoices', params],
    payments:  (params = {})              => ['finance', 'payments', params],
    expenses:  (params = {})              => ['finance', 'expenses', params],
    budgets:   (params = {})              => ['finance', 'budgets', params],
    reports:   (params = {})              => ['finance', 'reports', params],
    kpi:       ()                         => ['finance', 'kpi'],
  },

  // ── IT ────────────────────────────────────────────────────────────────
  it: {
    root:           ()                    => ['it'],
    dashboard:      ()                    => ['it', 'dashboard'],
    overview:       ()                    => ['it', 'overview'],
    monitoring:     ()                    => ['it', 'monitoring'],
    infrastructure: ()                    => ['it', 'infrastructure'],
    networkInfra:   ()                    => ['it', 'networkInfra'],
    backupRecovery: ()                    => ['it', 'backupRecovery'],
    security:       ()                    => ['it', 'security'],
    threatLogs:     (params = {})         => ['it', 'threatLogs', params],
    userAccess:     ()                    => ['it', 'userAccess'],
    rolesPermissions: ()                  => ['it', 'rolesPermissions'],
    accessRequests: ()                    => ['it', 'accessRequests'],
    deployments:    ()                    => ['it', 'deployments'],
    devopsCicd:     ()                    => ['it', 'devopsCicd'],
    auditLogs:      (params = {})         => ['it', 'auditLogs', params],
    systemLogs:     (params = {})         => ['it', 'systemLogs', params],
    assets:         (params = {})         => ['it', 'assets', params],
    tickets:        (params = {})         => ['it', 'tickets', params],
    ticket:         (id)                  => ['it', 'ticket', id],
    projects:       (params = {})         => ['it', 'projects', params],
    products:       (params = {})         => ['it', 'products', params],
    product:        (id)                  => ['it', 'product', id],
  },

  // ── Law ───────────────────────────────────────────────────────────────
  law: {
    root:       ()                        => ['law'],
    dashboard:  (params = {})             => ['law', 'dashboard', params],
    projects:   (params = {})             => ['law', 'projects', params],
    records:    (section, params = {})    => ['law', 'records', section, params],
    moduleData: (moduleKey, projectId)    => ['law', 'moduleData', moduleKey, projectId],
    contracts:  (projectId)               => ['law', 'contracts', projectId],
    compliance: (projectId)               => ['law', 'compliance', projectId],
    library:    (params = {})             => ['law', 'library', params],
  },

  // ── Outsourcing ───────────────────────────────────────────────────────
  outsourcing: {
    root:      ()                         => ['outsourcing'],
    dashboard: ()                         => ['outsourcing', 'dashboard'],
    jobs:      (params = {})              => ['outsourcing', 'jobs', params],
    contracts: (params = {})              => ['outsourcing', 'contracts', params],
    timeLogs:  (params = {})              => ['outsourcing', 'timeLogs', params],
    invoices:  (params = {})              => ['outsourcing', 'invoices', params],
    payments:  (params = {})              => ['outsourcing', 'payments', params],
  },

  // ── Reports / Analytics (cross-portal) ────────────────────────────────
  reports: {
    root:    ()                           => ['reports'],
    list:    (params = {})                => ['reports', 'list', params],
    detail:  (id)                         => ['reports', 'detail', id],
    export:  (params = {})                => ['reports', 'export', params],
  },

  analytics: {
    root:    ()                           => ['analytics'],
    summary: (params = {})                => ['analytics', 'summary', params],
    revenue: (period = '30d')             => ['analytics', 'revenue', period],
    users:   (period = '30d')             => ['analytics', 'users', period],
  },

  // ── Settings / Config ─────────────────────────────────────────────────
  settings: {
    root:        ()                       => ['settings'],
    portal:      (role)                   => ['settings', 'portal', role],
    permissions: (role)                   => ['settings', 'permissions', role],
    workflow:    (role)                   => ['settings', 'workflow', role],
  },

  // ── Notifications ─────────────────────────────────────────────────────
  notifications: {
    root:   ()                            => ['notifications'],
    list:   (params = {})                 => ['notifications', 'list', params],
    unread: ()                            => ['notifications', 'unread'],
  },

  // ── Chat ──────────────────────────────────────────────────────────────
  chat: {
    root:    ()                           => ['chat'],
    threads: (params = {})                => ['chat', 'threads', params],
    thread:  (id)                         => ['chat', 'thread', id],
    unread:  ()                           => ['chat', 'unread'],
  },

  // ── Media ─────────────────────────────────────────────────────────────
  media: {
    root:           ()                    => ['media'],
    dashboard:      (params = {})         => ['media', 'dashboard', params],
    projects:       (params = {})         => ['media', 'projects', params],
    assets:         (params = {})         => ['media', 'assets', params],
    campaigns:      (params = {})         => ['media', 'campaigns', params],
    campaignTasks:  (params = {})         => ['media', 'campaignTasks', params],
    content:        (params = {})         => ['media', 'content', params],
    brandAssets:    (params = {})         => ['media', 'brandAssets', params],
    approvals:      (params = {})         => ['media', 'approvals', params],
    activity:       (params = {})         => ['media', 'activity', params],
    reporting:      (params = {})         => ['media', 'reporting', params],
    design:         (params = {})         => ['media', 'design', params],
    video:          (params = {})         => ['media', 'video', params],
    social:         (params = {})         => ['media', 'social', params],
    advertisements: (params = {})         => ['media', 'advertisements', params],
    seo:            (params = {})         => ['media', 'seo', params],
    website:        (params = {})         => ['media', 'website', params],
    testimonials:   (params = {})         => ['media', 'testimonials', params],
    caseStudies:    (params = {})         => ['media', 'caseStudies', params],
  },

  mediaHead: {
    root:             ()                  => ['mediaHead'],
    dashboard:        (params = {})       => ['mediaHead', 'dashboard', params],
    projects:         (params = {})       => ['mediaHead', 'projects', params],
    sales:            (params = {})       => ['mediaHead', 'sales', params],
    marketing:        (params = {})       => ['mediaHead', 'marketing', params],
    approvals:        (params = {})       => ['mediaHead', 'approvals', params],
    activity:         (params = {})       => ['mediaHead', 'activity', params],
    planActivity:     (params = {})       => ['mediaHead', 'planActivity', params],
    userWork:         ()                  => ['mediaHead', 'userWork'],
    attention:        (params = {})       => ['mediaHead', 'attention', params],
    revenue:          (params = {})       => ['mediaHead', 'revenue', params],
    team:             (params = {})       => ['mediaHead', 'team', params],
    deadlines:        (params = {})       => ['mediaHead', 'deadlines', params],
    projectDetail:    (projectId)         => ['mediaHead', 'projectDetail', projectId],
    projectPlan:      (projectId)         => ['mediaHead', 'projectPlan', projectId],
    marketingUsers:   ()                  => ['mediaHead', 'marketingUsers'],
  },
};

const matchesAny = (segment, needles) => needles.some((needle) => segment.includes(needle));

/**
 * Shared client-side cache policy for React Query.
 *
 * The first segment of the query key drives both stale time and cache
 * retention so the policy stays consistent across providers, prefetching,
 * and hooks.
 */
export const cachePolicyFor = (queryKey) => {
  const seg = Array.isArray(queryKey) ? String(queryKey[0] || '') : String(queryKey || '');

  if (matchesAny(seg, ['dashboard', 'kpi', 'metric'])) {
    return { staleTime: 60_000, gcTime: 10 * 60_000 };
  }
  if (matchesAny(seg, ['settings', 'config', 'workflow', 'permission', 'role'])) {
    return { staleTime: 60 * 60_000, gcTime: 24 * 60 * 60_000 };
  }
  if (matchesAny(seg, ['report', 'analytic', 'stat'])) {
    return { staleTime: 15 * 60_000, gcTime: 60 * 60_000 };
  }
  if (matchesAny(seg, ['auth', 'profile', 'user', 'session'])) {
    return { staleTime: 30 * 60_000, gcTime: 24 * 60 * 60_000 };
  }
  if (matchesAny(seg, ['project', 'task', 'leave'])) {
    return { staleTime: 5 * 60_000, gcTime: 30 * 60_000 };
  }
  if (matchesAny(seg, ['notification', 'chat'])) {
    return { staleTime: 30_000, gcTime: 5 * 60_000 };
  }

  return { staleTime: 90_000, gcTime: 10 * 60_000 };
};

export const staleTimeFor = (queryKey) => cachePolicyFor(queryKey).staleTime;
