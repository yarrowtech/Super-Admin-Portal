const CANONICAL_PROJECT_NAMES = Object.freeze([
  'EEC',
  'EHC',
  'RMS',
  'EFMBMMS',
  'ESPORTSM',
  'SMART FARMING',
]);

const PROJECT_REGISTRY = [
  {
    code: 'EEC',
    name: 'EEC',
    description: 'Enterprise execution center and project workspace.',
    launchUrl: process.env.EEC_PORTAL_URL || 'https://eec.company.com',
    ssoPath: '/sso/eec',
    aliases: ['EEC LMS', 'EEC Portal', 'ECC'],
  },
  {
    code: 'EHC',
    name: 'EHC',
    description: 'Employee services and operations workspace.',
    launchUrl: process.env.EHC_PORTAL_URL || 'https://ehc.company.com',
    ssoPath: '/sso-login',
    aliases: ['EHC Portal'],
  },
  {
    code: 'RMS',
    name: 'RMS',
    description: 'Records and management workspace.',
    launchUrl: process.env.RMS_PORTAL_URL || 'https://rms.company.com',
    ssoPath: '/sso-login',
    aliases: ['ERMS', 'RMS Portal'],
  },
  {
    code: 'EFMBMMS',
    name: 'EFMBMMS',
    description: 'Finance and business management system workspace.',
    launchUrl: process.env.EFMBMMS_PORTAL_URL || 'https://efmbmms.company.com',
    ssoPath: '/sso-login',
    aliases: ['EFMBMS', 'EFMBMMS Portal', 'EFMBMS Portal'],
  },
  {
    code: 'ESPORTSM',
    name: 'ESPORTSM',
    description: 'Esports management workspace.',
    launchUrl: process.env.ESPORTSM_PORTAL_URL || 'https://esportsm.company.com',
    ssoPath: '/sso-login',
    aliases: ['ESPORTS M', 'ESPORTSM Portal'],
  },
  {
    code: 'SMARTFARMING',
    name: 'SMART FARMING',
    description: 'Smart farming operations workspace.',
    launchUrl: process.env.SMARTFARMING_PORTAL_URL || 'https://smartfarming.company.com',
    ssoPath: '/sso-login',
    aliases: ['Smart Farming', 'SMART FARMING Portal'],
  },
];

const findProjectByCode = (projectCode) => {
  const key = normalizeProjectKey(projectCode);
  if (!key) return null;

  return PROJECT_REGISTRY.find((project) => {
    const projectTokens = [
      project.code,
      project.name,
      ...(Array.isArray(project.aliases) ? project.aliases : []),
    ]
      .map(normalizeProjectKey)
      .filter(Boolean);

    return projectTokens.some((token) => token === key || token.includes(key) || key.includes(token));
  }) || null;
};

const normalizeProjectKey = (value) =>
  String(value || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

const normalizeProjectAssignments = (input = []) => {
  if (!Array.isArray(input)) return [];

  return input
    .map((entry) => {
      if (typeof entry === 'string') {
        const projectName = entry.trim();
        return projectName ? { projectName } : null;
      }

      if (!entry || typeof entry !== 'object') return null;

      const cleaned = {};
      if (typeof entry.projectId === 'string' && entry.projectId.trim()) cleaned.projectId = entry.projectId.trim();
      if (typeof entry.projectCode === 'string' && entry.projectCode.trim()) cleaned.projectCode = entry.projectCode.trim();
      if (typeof entry.projectName === 'string' && entry.projectName.trim()) cleaned.projectName = entry.projectName.trim();
      if (typeof entry.role === 'string' && entry.role.trim()) cleaned.role = entry.role.trim();
      if (typeof entry.status === 'string' && entry.status.trim()) cleaned.status = entry.status.trim();
      if (typeof entry.startDate === 'string' && entry.startDate.trim()) cleaned.startDate = entry.startDate.trim();
      if (typeof entry.endDate === 'string' && entry.endDate.trim()) cleaned.endDate = entry.endDate.trim();
      if (Array.isArray(entry.permissions)) {
        const permissions = entry.permissions
          .map((permission) => (typeof permission === 'string' ? permission.trim() : ''))
          .filter(Boolean);
        if (permissions.length > 0) cleaned.permissions = permissions;
      }
      if (Array.isArray(entry.moduleScopes)) {
        const moduleScopes = entry.moduleScopes
          .map((scope) => (typeof scope === 'string' ? scope.trim() : ''))
          .filter(Boolean);
        if (moduleScopes.length > 0) cleaned.moduleScopes = moduleScopes;
      }
      if (Array.isArray(entry.pages)) {
        const pages = entry.pages
          .map((page) => (typeof page === 'string' ? page.trim() : ''))
          .filter(Boolean);
        if (pages.length > 0) cleaned.pages = pages;
      }
      if (Array.isArray(entry.actions)) {
        const actions = entry.actions
          .map((action) => (typeof action === 'string' ? action.trim() : ''))
          .filter(Boolean);
        if (actions.length > 0) cleaned.actions = actions;
      }

      return Object.keys(cleaned).length > 0 ? cleaned : null;
    })
    .filter(Boolean)
    .slice(0, 100);
};

const getUserProjectAssignments = (user = {}) => {
  const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
  return normalizeProjectAssignments(metadata.projectAssignments || metadata.assignedProjects || user.projectAssignments || user.assignedProjects || []);
};

const isAssignmentActive = (assignment = {}) => {
  const status = normalizeProjectKey(assignment.status || 'active');
  if (['BLOCKED', 'REVOKED', 'SUSPENDED', 'INACTIVE', 'EXPIRED'].includes(status)) return false;

  const now = Date.now();
  if (assignment.startDate) {
    const start = new Date(assignment.startDate);
    if (!Number.isNaN(start.getTime()) && start.getTime() > now) return false;
  }
  if (assignment.endDate) {
    const end = new Date(assignment.endDate);
    if (!Number.isNaN(end.getTime()) && end.getTime() < now) return false;
  }

  return true;
};

const matchesProject = (assignment = {}, project = {}) => {
  const assignmentTokens = [
    assignment.projectId,
    assignment.projectCode,
    assignment.projectName,
    assignment.token,
  ]
    .map(normalizeProjectKey)
    .filter(Boolean);

  if (assignmentTokens.length === 0) return false;

  const projectTokens = [
    project.code,
    project.name,
    ...(Array.isArray(project.aliases) ? project.aliases : []),
  ]
    .map(normalizeProjectKey)
    .filter(Boolean);

  return assignmentTokens.some((token) =>
    projectTokens.some((projectToken) => (
      token === projectToken ||
      token.includes(projectToken) ||
      projectToken.includes(token)
    ))
  );
};

const getAccessibleProjects = (user = {}) => {
  const assignments = getUserProjectAssignments(user);
  const isAdmin = String(user?.role || '').toLowerCase() === 'admin';

  return PROJECT_REGISTRY.map((project) => {
    const assignment = assignments.find((item) => matchesProject(item, project)) || null;
    const accessGranted = Boolean(isAdmin || assignment) && (isAdmin || isAssignmentActive(assignment || {}));
    const permissions = Array.from(
      new Set([
        ...(Array.isArray(assignment?.permissions) ? assignment.permissions : []),
        ...(Array.isArray(assignment?.moduleScopes) ? assignment.moduleScopes : []),
      ])
    );

    return {
      code: project.code,
      name: project.name,
      description: project.description,
      launchUrl: project.launchUrl,
      ssoPath: project.ssoPath,
      aliases: project.aliases,
      assigned: Boolean(assignment),
      accessGranted,
      role: assignment?.role || user?.role || 'member',
      status: assignment?.status || (accessGranted ? 'active' : 'blocked'),
      startDate: assignment?.startDate || null,
      endDate: assignment?.endDate || null,
      permissions,
      projectAssignment: assignment,
    };
  });
};

const buildProjectAccessSummary = (user = {}) => {
  const projects = getAccessibleProjects(user);
  return {
    projects,
    summary: {
      total: projects.length,
      assigned: projects.filter((project) => project.assigned).length,
      accessible: projects.filter((project) => project.accessGranted).length,
      blocked: projects.filter((project) => !project.accessGranted).length,
    },
  };
};

const buildAccessTokenPayload = (user = {}, project = {}, extras = {}) => ({
  sub: String(user?._id || user?.id || ''),
  userId: String(user?._id || user?.id || ''),
  email: user?.email || '',
  name: `${String(user?.firstName || '').trim()} ${String(user?.lastName || '').trim()}`.trim(),
  role: user?.role || '',
  department: user?.department || '',
  designation: String(user?.metadata?.designation || extras.designation || '').trim(),
  employeeCode: String(user?.metadata?.employeeCode || extras.employeeCode || '').trim(),
  vendorCode: String(user?.metadata?.vendorCode || extras.vendorCode || '').trim(),
  projectCode: project.code || extras.projectCode || '',
  projectName: project.name || extras.projectName || '',
  permissions: Array.isArray(project.permissions) ? project.permissions : [],
  accessScope: project.accessGranted ? 'project_only' : 'blocked',
  source: 'outsourcing-portal',
});

const buildProjectLaunchUrl = (project = {}, token = '', options = {}) => {
  const base = String(project.launchUrl || '').replace(/\/$/, '');
  const path = project.ssoPath || '/sso-login';
  if (!base || !token) return `${base}${path}`;
  const params = new URLSearchParams();
  params.set('token', token);
  params.set('projectCode', project.code || '');
  const redirectTo = typeof options.redirectTo === 'string' ? options.redirectTo.trim() : '';
  if (redirectTo) {
    params.set('redirectTo', redirectTo);
  }
  return `${base}${path}?${params.toString()}`;
};

module.exports = {
  CANONICAL_PROJECT_NAMES,
  PROJECT_REGISTRY,
  findProjectByCode,
  normalizeProjectKey,
  normalizeProjectAssignments,
  getUserProjectAssignments,
  getAccessibleProjects,
  buildProjectAccessSummary,
  buildAccessTokenPayload,
  buildProjectLaunchUrl,
  matchesProject,
};
