const Configuration = require('../models/WorkspaceConfiguration');
const Organization = require('../models/WorkspaceOrganization');
const Project = require('../models/common/Project');
const records = require('./workspaceRecords.service');
const { WORKSPACE_ORGANIZATION, WORKSPACE_BRANDS, PROJECT_REGISTRY } = require('../utils/projectAccess');

const defaults = () => ['overview', 'services', 'products', 'subscriptions', 'crm', 'integrations'];
const get = async (user, projectId) => {
  const filter = await records.resolveProjectId(user, projectId);
  records.databaseReady();
  return Configuration.findOne(filter).lean();
};
const update = async (user, projectId, body) => {
  const filter = await records.resolveProjectId(user, projectId, true);
  records.databaseReady();
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !['displayName', 'description', 'modules'].includes(key))) {
    const error = new Error('Invalid workspace configuration'); error.statusCode = 400; throw error;
  }
  if ((body.displayName !== undefined && (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 200)) ||
      (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000)) ||
      (body.modules !== undefined && (!Array.isArray(body.modules) || !body.modules.includes('overview') || body.modules.some((module) => !defaults().includes(module))))) {
    const error = new Error('Invalid workspace fields'); error.statusCode = 400; throw error;
  }
  const project = (await records.accessibleProjects(user)).find((item) => item.code === filter.projectId);
  const canonical = await Project.findOne({ projectCode: project.code }).select('_id').lean();
  return Configuration.findOneAndUpdate(filter, {
    $set: body,
    $setOnInsert: { ...filter, brandId: project.brandCode, ...(canonical ? { canonicalProjectId: canonical._id } : {}), ...(body.modules ? {} : { modules: defaults() }) },
    $push: { history: { action: 'configured', actor: user._id || user.id, at: new Date() } },
  }, { upsert: true, new: true, runValidators: true }).lean();
};
const initialize = async () => {
  records.databaseReady();
  await Promise.all([Configuration.init(), Organization.init()]);
  await Organization.updateOne({ code: WORKSPACE_ORGANIZATION.id }, { $setOnInsert: { code: WORKSPACE_ORGANIZATION.id, name: WORKSPACE_ORGANIZATION.name, brands: WORKSPACE_BRANDS } }, { upsert: true });
  const documents = await Project.find({ projectCode: { $exists: true } }).select('name projectCode description').lean();
  const known = new Map(PROJECT_REGISTRY.map((project) => [project.code, project]));
  for (const doc of documents) known.set(doc.projectCode, { ...known.get(doc.projectCode), code: doc.projectCode, name: doc.name, description: doc.description, canonicalProjectId: doc._id, brandCode: known.get(doc.projectCode)?.brandCode || WORKSPACE_ORGANIZATION.id });
  for (const project of known.values()) {
    const canonical = project.canonicalProjectId ? { _id: project.canonicalProjectId } : null;
    await Configuration.updateOne({ organizationId: WORKSPACE_ORGANIZATION.id, projectId: project.code }, { $setOnInsert: {
      organizationId: WORKSPACE_ORGANIZATION.id, projectId: project.code, brandId: project.brandCode,
      displayName: project.name, description: project.description, modules: defaults(),
      ...(canonical ? { canonicalProjectId: canonical._id } : {}),
    } }, { upsert: true });
    if (canonical) await Configuration.updateOne({ organizationId: WORKSPACE_ORGANIZATION.id, projectId: project.code, canonicalProjectId: { $exists: false } }, { $set: { canonicalProjectId: canonical._id } });
  }
  return { organization: WORKSPACE_ORGANIZATION.id, projectCount: known.size };
};
module.exports = { get, update, initialize, defaults };
