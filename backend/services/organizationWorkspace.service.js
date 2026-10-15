const {
  WORKSPACE_ORGANIZATION,
  WORKSPACE_BRANDS,
  buildWorkspaceCatalog,
  findProjectByCode,
  getAccessibleProjects,
  isPrivilegedProjectLauncher,
  normalizeProjectKey,
} = require('../utils/projectAccess');
const env = require('../config/env');

const YARROWTECH_PROJECT_CODE = 'YARROWTECH';

const getUserProject = (user, projectId) => {
  const key = normalizeProjectKey(projectId);
  const project = require('./workspaceRecords.service').authorizedProjects(user).find((item) => normalizeProjectKey(item.code) === key);
  if (!project) return null;
  if (!project.accessGranted && !isPrivilegedProjectLauncher(user)) return null;
  return project;
};

const safeUrlPart = (value, part) => {
  try {
    if (!value) return null;
    const url = new URL(value);
    return part === 'origin' ? url.origin : url.pathname || '/';
  } catch {
    return null;
  }
};

const integrationInventory = () => [
  {
    id: 'efnbmms-admin-management',
    name: 'EFNBMMS admin-management API',
    projectCode: 'EFNBMMS',
    providerBaseUrl: safeUrlPart(env.EFNBMMS_ADMIN_MANAGEMENT_API_URL, 'origin'),
    resourceEndpoint: safeUrlPart(env.EFNBMMS_ADMIN_MANAGEMENT_API_URL, 'pathname'),
    method: 'GET',
    authentication: env.EFNBMMS_API_TOKEN ? 'Bearer/service token configured server-side' : 'Not configured',
    direction: 'Inbound',
    resource: 'Admin management records',
    databaseMapping: 'Proxy response; no durable external-resource mapping model found',
    capabilities: ['read'],
    status: env.EFNBMMS_ADMIN_MANAGEMENT_API_URL && env.EFNBMMS_API_TOKEN ? 'unverified' : 'blocked',
    blockedBy: env.EFNBMMS_ADMIN_MANAGEMENT_API_URL && env.EFNBMMS_API_TOKEN ? null : 'Missing EFNBMMS admin API URL or token',
  },
  {
    id: 'edifyeight-teachers',
    name: 'EdifyEight teacher API',
    projectCode: 'EEC',
    providerBaseUrl: safeUrlPart(env.EDIFYEIGHT_TEACHER_API_URL, 'origin'),
    resourceEndpoint: safeUrlPart(env.EDIFYEIGHT_TEACHER_API_URL, 'pathname'),
    method: 'GET/POST/PATCH where existing service supports it',
    authentication: env.EDIFYEIGHT_API_TOKEN ? 'Bearer/service token configured server-side' : 'Not configured',
    direction: 'Bidirectional where provider supports writes',
    resource: 'Teachers',
    databaseMapping: 'External API proxy; no durable sync cursor model found',
    capabilities: ['read', 'write-unverified'],
    status: env.EDIFYEIGHT_TEACHER_API_URL && env.EDIFYEIGHT_API_TOKEN ? 'unverified' : 'blocked',
    blockedBy: env.EDIFYEIGHT_TEACHER_API_URL && env.EDIFYEIGHT_API_TOKEN ? null : 'Missing EdifyEight teacher API URL or token',
  },
  {
    id: 'edifyeight-study-materials',
    name: 'EdifyEight study material API',
    projectCode: 'EEC',
    providerBaseUrl: safeUrlPart(env.EDIFYEIGHT_STUDY_MATERIAL_API_URL, 'origin'),
    resourceEndpoint: safeUrlPart(env.EDIFYEIGHT_STUDY_MATERIAL_API_URL, 'pathname'),
    method: 'GET/POST/PATCH where existing service supports it',
    authentication: env.EDIFYEIGHT_API_TOKEN ? 'Bearer/service token configured server-side' : 'Not configured',
    direction: 'Bidirectional where provider supports writes',
    resource: 'Study materials',
    databaseMapping: 'External API proxy; no durable sync cursor model found',
    capabilities: ['read', 'write-unverified'],
    status: env.EDIFYEIGHT_STUDY_MATERIAL_API_URL && env.EDIFYEIGHT_API_TOKEN ? 'unverified' : 'blocked',
    blockedBy: env.EDIFYEIGHT_STUDY_MATERIAL_API_URL && env.EDIFYEIGHT_API_TOKEN ? null : 'Missing EdifyEight study-material API URL or token',
  },
].map((integration) => {
  const adapter = require('./workspaceSync.service').adapters[integration.id];
  const url = adapter.provider.getBaseUrl();
  const configured = Boolean(url && adapter.provider.getServiceToken());
  return { ...integration, providerBaseUrl: safeUrlPart(url, 'origin'), resourceEndpoint: safeUrlPart(url, 'pathname'),
    method: adapter.write ? 'GET / POST / PUT / DELETE in existing adapter; durable jobs support GET and PUT' : 'GET',
    capabilities: adapter.write ? ['read', 'update-existing-record'] : ['read'], writeFields: adapter.writeFields || [],
    direction: adapter.write ? 'Inbound and outbound updates' : 'Inbound',
    databaseMapping: 'WorkspaceExternalRecord scoped by organization, project, integration and external ID',
    authentication: configured ? 'Bearer and x-service-token stored server-side' : 'Not configured',
    status: configured ? 'unverified' : 'blocked', blockedBy: configured ? null : 'Provider URL or credential missing',
  };
}).concat(require('./yarrowtechApi.service').inventory());

const buildOrganization = async (user) => {
  require('./workspaceRecords.service').databaseReady();
  const persisted = await require('../models/WorkspaceOrganization').findOne({ code: WORKSPACE_ORGANIZATION.id }).lean();
  const catalog = buildWorkspaceCatalog();
  const allProjects = await require('./workspaceRecords.service').accessibleProjects(user);
  const accessible = new Map(allProjects.map((project) => [normalizeProjectKey(project.code), project]));

  return {
    ...WORKSPACE_ORGANIZATION,
    name: persisted?.name || WORKSPACE_ORGANIZATION.name,
    projects: allProjects,
    capabilities: ['organization_administration', 'brand_directory', 'project_directory', 'membership_permissions', 'integration_management'],
    brands: WORKSPACE_BRANDS.map((brand) => ({
      id: brand.id,
      code: brand.code,
      name: brand.name,
      projectCodes: brand.projectCodes.filter((code) => accessible.has(normalizeProjectKey(code))),
      projects: catalog.brands.find((item) => item.code === brand.code)?.projects.filter((project) => accessible.has(normalizeProjectKey(project.code))).map((project) => ({
        ...project,
        ...accessible.get(normalizeProjectKey(project.code)),
        access: accessible.get(normalizeProjectKey(project.code)) || null,
      })) || [],
    })),
  };
};

const buildProjectWorkspace = async (user, projectId) => {
  const filter = await require('./workspaceRecords.service').resolveProjectId(user, projectId);
  const project = (await require('./workspaceRecords.service').accessibleProjects(user)).find((item) => item.code === filter.projectId);
  if (!project) return null;
  const registryProject = findProjectByCode(project.code) || project;
  const isYarrowtech = normalizeProjectKey(project.code) === YARROWTECH_PROJECT_CODE;
  const integrations = integrationInventory().filter((integration) => normalizeProjectKey(integration.projectCode) === normalizeProjectKey(project.code));
  const config = await require('./workspaceConfiguration.service').get(user, project.code);
  const { Job, State } = require('../models/WorkspaceSync');
  const [pendingJobs, failedJobs, states] = await Promise.all([
    Job.countDocuments({ ...filter, status: { $in: ['queued', 'running'] } }),
    Job.countDocuments({ ...filter, status: 'failed' }), State.find(filter).lean(),
  ]);
  const enabledModules = config?.modules || require('./workspaceConfiguration.service').defaults();

  return {
    project: {
      code: project.code,
      name: config?.displayName || project.name,
      description: config?.description ?? project.description,
      canonicalProjectId: config?.canonicalProjectId || project.canonicalProjectId || null,
      brandCode: project.brandCode,
      projectType: project.projectType,
      role: project.role,
      status: project.status,
      permissions: project.permissions || [],
      canWrite: ['admin', 'super_admin', 'superadmin'].includes(String(user.role).toLowerCase()) || project.permissions.includes('workspace.write'),
      configured: Boolean(registryProject.launchUrl || integrations.length || isYarrowtech),
    },
    modules: [
      { id: 'overview', name: 'Overview', enabled: true },
      { id: 'services', name: 'Services', enabled: true },
      { id: 'products', name: 'Products', enabled: true },
      { id: 'subscriptions', name: 'Subscriptions', enabled: true },
      { id: 'crm', name: 'CRM and Operations', enabled: true },
      { id: 'integrations', name: 'Integrations', enabled: true },
    ].map((module) => ({ ...module, enabled: enabledModules.includes(module.id) })),
    configuration: { persisted: Boolean(config), modules: enabledModules },
    integrations: integrations.map((integration) => {
      const state = states.find((item) => item.integrationId === integration.id);
      if (integration.id === 'yarrowtech-srs') return require('./yarrowtechApi.service').withState(state);
      return { ...integration, name: state?.displayName || integration.name, enabled: state?.enabled !== false, status: state?.enabled === false ? 'disabled' : integration.id === 'yarrowtech-srs' ? 'blocked' : state?.status || integration.status, checkedAt: state?.checkedAt || null, blockedBy: state?.error || integration.blockedBy };
    }),
    sync: {
      lastSuccessfulInboundSync: states.reduce((latest, item) => item.lastInboundAt && (!latest || item.lastInboundAt > latest) ? item.lastInboundAt : latest, null),
      lastSuccessfulOutboundSync: states.reduce((latest, item) => item.lastOutboundAt && (!latest || item.lastOutboundAt > latest) ? item.lastOutboundAt : latest, null),
      pendingJobs,
      failedJobs,
      status: failedJobs ? 'failed' : pendingJobs ? 'pending' : states.some((item) => item.status === 'connected') ? 'connected' : integrations.length ? 'pending_verification' : 'not_configured',
    },
  };
};

const buildYarrowtechWorkspace = async (user) => {
  const workspace = await buildProjectWorkspace(user, YARROWTECH_PROJECT_CODE);
  if (!workspace) return null;
  const childProjects = (await require('./workspaceRecords.service').accessibleProjects(user))
    .filter((project) => project.accessGranted && project.brandCode === 'YARROWTECH' && project.code !== YARROWTECH_PROJECT_CODE)
    .map((project) => ({
      code: project.code,
      name: project.name,
      description: project.description,
      status: project.status,
      accessGranted: project.accessGranted,
      role: project.role,
    }));

  const records = require('./workspaceRecords.service');
  const [products, services, subscriptions, customers, supportTickets] = await Promise.all(
    ['product', 'service', 'subscription', 'customer', 'ticket'].map((kind) => records.list(user, YARROWTECH_PROJECT_CODE, kind))
  );
  return {
    ...workspace,
    products: products.items,
    childProjects,
    services: services.items,
    subscriptions: subscriptions.items,
    customers: customers.items,
    supportTickets: supportTickets.items,
    activity: [],
    metrics: {
      products: products.total,
      services: services.total,
      subscriptions: subscriptions.total,
      customers: customers.total,
      supportTickets: supportTickets.total,
    },
    limitations: [
      'Provider synchronization is unavailable until provider contracts and credentials are verified.',
      'Configured external URLs are reported only from environment variable presence and are marked unverified until tested with credentials.',
    ],
  };
};

module.exports = {
  YARROWTECH_PROJECT_CODE,
  buildOrganization,
  buildProjectWorkspace,
  buildYarrowtechWorkspace,
  integrationInventory,
};
