const asyncHandler = require('../utils/asyncHandler');
const {
  buildOrganization,
  buildProjectWorkspace,
  buildYarrowtechWorkspace,
  integrationInventory,
} = require('../services/organizationWorkspace.service');

const ok = (res, data) => res.status(200).json({ success: true, data });

exports.getOrganizations = asyncHandler(async (req, res) => {
  ok(res, { items: [await buildOrganization(req.user)] });
});

exports.getOrganization = asyncHandler(async (req, res) => {
  const organization = await buildOrganization(req.user);
  if (String(req.params.organizationId || '').toUpperCase() !== organization.id) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  return ok(res, organization);
});

exports.getOrganizationProjects = asyncHandler(async (req, res) => {
  const organization = await buildOrganization(req.user);
  if (String(req.params.organizationId || '').toUpperCase() !== organization.id) {
    return res.status(404).json({ success: false, error: 'Organization not found' });
  }
  return ok(res, {
    items: organization.projects,
  });
});

exports.getProjects = asyncHandler(async (req, res) => {
  const organization = await buildOrganization(req.user);
  ok(res, {
    items: organization.projects,
  });
});

exports.getProject = asyncHandler(async (req, res) => {
  const workspace = await buildProjectWorkspace(req.user, req.params.projectId);
  if (!workspace) return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  return ok(res, workspace.project);
});

exports.getProjectWorkspace = asyncHandler(async (req, res) => {
  const workspace = await buildProjectWorkspace(req.user, req.params.projectId);
  if (!workspace) return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  return ok(res, workspace);
});

exports.getProjectModules = asyncHandler(async (req, res) => {
  const workspace = await buildProjectWorkspace(req.user, req.params.projectId);
  if (!workspace) return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  return ok(res, { items: workspace.modules });
});

exports.getProjectIntegrations = asyncHandler(async (req, res) => {
  const workspace = await buildProjectWorkspace(req.user, req.params.projectId);
  if (!workspace) return res.status(404).json({ success: false, error: 'Project not found or access denied' });
  return ok(res, { items: workspace.integrations });
});

exports.getIntegration = asyncHandler(async (req, res) => {
  const integration = integrationInventory().find((item) => item.id === req.params.integrationId);
  if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });
  require('../services/workspaceRecords.service').scope(req.user, integration.projectCode);
  const workspace = await buildProjectWorkspace(req.user, integration.projectCode);
  return ok(res, workspace.integrations.find((item) => item.id === integration.id));
});

exports.getIntegrationStatus = asyncHandler(async (req, res) => {
  const integration = integrationInventory().find((item) => item.id === req.params.integrationId);
  if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });
  require('../services/workspaceRecords.service').scope(req.user, integration.projectCode);
  return ok(res, { id: integration.id, status: integration.status, blockedBy: integration.blockedBy || null });
});

exports.getIntegrationCapabilities = asyncHandler(async (req, res) => {
  const integration = integrationInventory().find((item) => item.id === req.params.integrationId);
  if (!integration) return res.status(404).json({ success: false, error: 'Integration not found' });
  require('../services/workspaceRecords.service').scope(req.user, integration.projectCode);
  return ok(res, { id: integration.id, capabilities: integration.capabilities });
});

exports.getYarrowtechWorkspace = asyncHandler(async (req, res) => {
  const workspace = await buildYarrowtechWorkspace(req.user);
  if (!workspace) return res.status(403).json({ success: false, error: 'YarrowTech access denied' });
  return ok(res, workspace);
});

exports.updateWorkspace = asyncHandler(async (req, res) => ok(res, await require('../services/workspaceConfiguration.service').update(req.user, req.params.projectId, req.body)));
