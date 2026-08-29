import { cachePolicyFor, staleTimeFor } from './queryPolicies';

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
    // Shared task domain layer (Phase 2B) — one Task model, reused by the
    // IT Manager / HR / Employee portals. `board` is the single data source
    // for BOTH the Kanban board and list view (same query, same cache entry
    // — switching views never re-fetches). `portalDetail` backs the
    // detail-drawer fetch on portals that support it (employee only today).
    board:        (portal, filters = {})  => ['tasks', portal, 'board', filters],
    portalDetail: (portal, taskId)        => ['tasks', portal, 'detail', taskId],
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
    root:          ()                     => ['manager'],
    dashboard:     ()                     => ['manager', 'dashboard'],
    team:          (params = {})          => ['manager', 'team', params],
    reports:       (params = {})          => ['manager', 'reports', params],
    workboard:     (params = {})          => ['manager', 'workboard', params],
    projects:      (params = {})          => ['manager', 'projects', params],
    workReviews:   (params = {})          => ['manager', 'workReviews', params],
    leaveRequests: (params = {})          => ['manager', 'leaveRequests', params],
  },

  // ── Employee ─────────────────────────────────────────────────────────
  employee: {
    root:           ()                    => ['employee'],
    dashboard:      ()                     => ['employee', 'dashboard'],
    profile:        ()                     => ['employee', 'profile'],
    projects:       (params = {})          => ['employee', 'projects', params],
    tasks:          (params = {})          => ['employee', 'tasks', params],
    attendance:     (params = {})          => ['employee', 'attendance', params],
    leave:          (params = {})          => ['employee', 'leave', params],
    documents:      (params = {})          => ['employee', 'documents', params],
    team:           ()                     => ['employee', 'team'],
    jobOpenings:    ()                     => ['employee', 'jobOpenings'],
    myApplications: ()                     => ['employee', 'myApplications'],
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

  // ── Digital Portfolios — hierarchy (Foundation phase) ───────────────────
  portfolioHierarchy: {
    root:         ()                       => ['portfolioHierarchy'],
    brands:       ()                       => ['portfolioHierarchy', 'brands'],
    assignees:    (search='')              => ['portfolioHierarchy', 'assignees', search],
    tree:         (portfolioId)            => ['portfolioHierarchy', 'tree', portfolioId],
    groups:       (portfolioId)            => ['portfolioHierarchy', 'groups', portfolioId],
    group:        (groupId)                => ['portfolioHierarchy', 'group', groupId],
    categories:   (groupId)                => ['portfolioHierarchy', 'categories', groupId],
    category:     (categoryId)             => ['portfolioHierarchy', 'category', categoryId],
    categoryStats:(categoryId)             => ['portfolioHierarchy', 'categoryStats', categoryId],
    overview:     (categoryId)             => ['portfolioHierarchy', 'overview', categoryId],
    assets:       (categoryId, params={})  => ['portfolioHierarchy', 'assets', categoryId, params],
    asset:        (assetId)                => ['portfolioHierarchy', 'asset', assetId],
    assetVersions:(assetId)                => ['portfolioHierarchy', 'assetVersions', assetId],
    assetHistory: (assetId, cursor=null)   => ['portfolioHierarchy', 'assetHistory', assetId, cursor],
    assetTransitions:(assetId)             => ['portfolioHierarchy', 'assetTransitions', assetId],
    tasks:        (categoryId, params={})  => ['portfolioHierarchy', 'tasks', categoryId, params],
    activity:     (categoryId, params={})  => ['portfolioHierarchy', 'activity', categoryId, params],
    files:        (categoryId, params={})  => ['portfolioHierarchy', 'files', categoryId, params],
    fileVersions: (fileId)                 => ['portfolioHierarchy', 'fileVersions', fileId],
    metricDefs:   ()                       => ['portfolioHierarchy', 'metricDefs'],
    metrics:      (categoryId, params={})  => ['portfolioHierarchy', 'metrics', categoryId, params],
    metricsTimeseries:(categoryId, params={}) => ['portfolioHierarchy', 'metricsTimeseries', categoryId, params],
    metricsByAsset:(categoryId, params={}) => ['portfolioHierarchy', 'metricsByAsset', categoryId, params],
    health:       (categoryId)             => ['portfolioHierarchy', 'health', categoryId],
    portfolioHealth:(portfolioId)          => ['portfolioHierarchy', 'portfolioHealth', portfolioId],
    comments:     (assetId)                => ['portfolioHierarchy', 'comments', assetId],
    relations:    (assetId)                => ['portfolioHierarchy', 'relations', assetId],
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

export const queryScope = (user = {}) => ({
  tenantId: user.tenantId || user.organizationId || user.orgId || user.metadata?.tenantId || user.metadata?.organizationId || 'global',
  userId: user.id || user._id || 'anonymous',
  role: user.role || 'anonymous',
  departmentId: user.departmentId || user.department || 'none',
});

export const scopedKey = (scope, key) => {
  const normalizedScope = queryScope(scope || {});
  const suffix = Array.isArray(key) ? key : [key];
  return [
    'scope',
    {
      tenantId: normalizedScope.tenantId,
      userId: normalizedScope.userId,
      role: normalizedScope.role,
      departmentId: normalizedScope.departmentId,
    },
    ...suffix,
  ];
};

export { cachePolicyFor, staleTimeFor };
