const asyncHandler = require('../utils/asyncHandler');
const operations = require('../services/yarrowtechOperations.service');
const provider = require('../services/yarrowtechApi.service');
const projectsAdapter = require('../services/yarrowtechProjects.adapter');
const { Job, External, State } = require('../models/WorkspaceSync');
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
exports.archive = (kind) => asyncHandler(async (req, res) => ok(res, await operations.archive(req.user, req.params.resourceId, kind)));
exports.settings = (kind) => asyncHandler(async (req, res) => ok(res, await operations.getSettings(req.user, req.params.resourceId, kind)));
exports.saveSettings = (kind) => asyncHandler(async (req, res) => ok(res, await operations.saveSettings(req.user, req.params.resourceId, req.body, kind)));
exports.clients = asyncHandler(async (req, res) => ok(res, await operations.clients(req.user, req.params.projectId, req.query)));
exports.deliveries = asyncHandler(async (req, res) => ok(res, await operations.deliveries(req.user, req.params.projectId, req.query)));
exports.createDelivery = asyncHandler(async (req, res) => ok(res, await operations.saveDelivery(req.user, req.params.projectId, req.body), 201));
exports.updateDelivery = asyncHandler(async (req, res) => ok(res, await operations.saveDelivery(req.user, 'YARROWTECH', req.body, req.params.resourceId)));
exports.payments = asyncHandler(async (req, res) => ok(res, await operations.payments(req.user, req.params.resourceId, req.query)));
exports.audit = asyncHandler(async (req, res) => {
  const filter = await operations.scope(req.user, req.params.projectId || 'YARROWTECH');
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ success: false, error: 'Invalid pagination' });
  const { Details, Delivery } = require('../models/YarrowtechOperations');
  const eventProjection = { name: 1, kind: 1, resourceId: '$_id', action: '$history.action', actor: '$history.actor', at: '$history.at', fields: '$history.fields' };
  const union = (Model, kind, name) => ({ $unionWith: { coll: Model.collection.name, pipeline: [{ $match: filter }, { $unwind: '$history' }, { $project: { ...eventProjection, kind: { $literal: kind }, name } }] } });
  const result = await require('../models/WorkspaceRecord').aggregate([
    { $match: filter }, { $unwind: '$history' }, { $project: eventProjection },
    union(Details, 'settings', { $literal: 'Resource settings' }), union(Delivery, 'service_project', '$name'),
    union(require('../models/WorkspaceConfiguration'), 'configuration', '$displayName'),
    union(require('../models/WorkspaceProductMember'), 'membership', { $literal: 'Product membership' }),
    union(State, 'integration', '$integrationId'),
    { $unionWith: { coll: Job.collection.name, pipeline: [{ $match: filter }, { $project: { name: '$integrationId', kind: { $literal: 'sync' }, resourceId: '$_id', action: '$status', actor: '$requestedBy', at: '$updatedAt' } }] } },
    { $sort: { at: -1, _id: -1 } }, { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } },
  ]);
  ok(res, { items: result[0]?.items || [], total: result[0]?.total[0]?.count || 0, page, limit });
});
exports.overview = asyncHandler(async (req, res) => {
  await operations.scope(req.user, req.params.projectId);
  ok(res, await require('../services/organizationWorkspace.service').buildYarrowtechWorkspace(req.user));
});
exports.integration = asyncHandler(async (req, res) => {
  const filter = { ...await operations.scope(req.user), integrationId: 'yarrowtech-srs' };
  const state = await State.findOne(filter).lean();
  ok(res, provider.withState(state));
});
exports.capabilities = asyncHandler(async (req, res) => {
  await operations.scope(req.user);
  ok(res, { id: 'yarrowtech-srs', capabilities: [], status: 'blocked', blockedBy: provider.CONTRACT_BLOCKER, webhookVerification: 'Unverified protocol; no webhook events accepted' });
});
exports.testConnection = asyncHandler(async (req, res) => {
  const filter = { ...await operations.scope(req.user, 'YARROWTECH', true), integrationId: 'yarrowtech-srs' };
  const result = await provider.probe();
  const connectionCheck = Object.fromEntries(['baseUrl', 'connectionStatus', 'reachable', 'healthy', 'httpStatus', 'connectionMessage', 'checkedAt'].filter((key) => result[key] !== undefined).map((key) => [key, result[key]]));
  await State.findOneAndUpdate(filter, { $set: { status: 'blocked', checkedAt: result.checkedAt,
    connectionCheck, error: result.healthy ? null : result.connectionMessage }, $setOnInsert: filter }, { upsert: true, runValidators: true });
  ok(res, result);
});
exports.sync = asyncHandler(async (req, res) => {
  await operations.scope(req.user, 'YARROWTECH', true);
  try { provider.rejectUnverifiedOperation(); }
  catch (error) { res.status(error.statusCode).json({ success: false, code: error.code, error: error.message }); }
});
exports.configureIntegration = asyncHandler(async (req, res) => {
  const filter = { ...await operations.scope(req.user, req.params.projectId || 'YARROWTECH', true), integrationId: 'yarrowtech-srs' };
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !['integrationId', 'enabled', 'displayName'].includes(key)) ||
    (body.enabled !== undefined && typeof body.enabled !== 'boolean') || (body.displayName !== undefined && (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 200))) return res.status(400).json({ success: false, error: 'Invalid integration settings; configure credentials only on the server' });
  const fields = { status: 'blocked' };
  if (body.enabled !== undefined) fields.enabled = body.enabled;
  if (body.displayName !== undefined) fields.displayName = body.displayName;
  ok(res, await State.findOneAndUpdate(filter, { $set: fields, $setOnInsert: filter, $push: { history: { action: 'configured', actor: req.user._id || req.user.id, at: new Date(), fields: Object.keys(fields) } } }, { new: true, upsert: true, runValidators: true }).lean());
});
exports.integrationRecords = asyncHandler(async (req, res) => {
  const filter = { ...await operations.scope(req.user), integrationId: 'yarrowtech-srs', present: { $ne: false } };
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ success: false, error: 'Invalid pagination' });
  const [items, total] = await Promise.all([External.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), External.countDocuments(filter)]);
  ok(res, { items, total, page, limit });
});
// Provider-backed projects. Unlike the Mongo-backed resources above, these read
// through yarrowtechProjects.adapter. Until that adapter's contract is verified
// it reports unconfigured rather than returning invented rows.
const projectsQuery = (query = {}) => {
  const page = Number(query.page || 1), limit = Number(query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return null;
  const search = query.search === undefined ? '' : String(query.search).trim().slice(0, 200);
  const status = query.status === undefined || query.status === '' ? '' : String(query.status).trim().toLowerCase();
  if (status && !projectsAdapter.STATUSES.includes(status)) return null;
  return { page, limit, search, status };
};
const summarise = (items) => ({
  total: items.length,
  ...Object.fromEntries(projectsAdapter.STATUSES.map((name) => [name, items.filter((item) => item.status === name).length])),
});
exports.projects = asyncHandler(async (req, res) => {
  await operations.scope(req.user, req.params.projectId || 'YARROWTECH');
  const criteria = projectsQuery(req.query);
  if (!criteria) return res.status(400).json({ success: false, error: 'Invalid projects query' });
  if (!projectsAdapter.configured()) {
    return ok(res, { items: [], total: 0, page: criteria.page, limit: criteria.limit,
      summary: summarise([]), configured: false, blockedBy: projectsAdapter.unconfiguredReason() });
  }
  const result = await projectsAdapter.listProjects(criteria);
  // Stat cards describe every matching project, not just this page.
  const all = result.total > result.items.length
    ? await projectsAdapter.listProjects({ ...criteria, page: 1, limit: 100 })
    : result;
  ok(res, { ...result, summary: summarise(all.items), configured: true, blockedBy: null });
});
exports.project = asyncHandler(async (req, res) => {
  await operations.scope(req.user, 'YARROWTECH');
  if (!projectsAdapter.configured()) {
    return res.status(409).json({ success: false, code: 'YARROWTECH_PROJECTS_UNVERIFIED', error: projectsAdapter.unconfiguredReason() });
  }
  ok(res, await projectsAdapter.getProject(req.params.resourceId));
});
exports.updateProject = asyncHandler(async (req, res) => {
  await operations.scope(req.user, 'YARROWTECH', true);
  const body = req.body;
  const allowed = ['status', 'progress', 'delivery', 'notes'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length ||
    Object.keys(body).some((key) => !allowed.includes(key)) ||
    (body.notes !== undefined && (typeof body.notes !== 'string' || body.notes.length > 5000)) ||
    (body.status !== undefined && !projectsAdapter.STATUSES.includes(body.status)) ||
    (body.progress !== undefined && (!Number.isInteger(body.progress) || body.progress < 0 || body.progress > 100)) ||
    (body.delivery !== undefined && body.delivery !== null && Number.isNaN(new Date(body.delivery).getTime()))) {
    return res.status(400).json({ success: false, error: 'Invalid project update' });
  }
  if (!projectsAdapter.configured()) {
    return res.status(409).json({ success: false, code: 'YARROWTECH_PROJECTS_UNVERIFIED', error: projectsAdapter.unconfiguredReason() });
  }
  ok(res, await projectsAdapter.updateProject(req.params.resourceId, body));
});
exports.syncHistory = asyncHandler(async (req, res) => {
  const filter = { ...await operations.scope(req.user, req.params.projectId || 'YARROWTECH') };
  if (req.params.integrationId) filter.integrationId = 'yarrowtech-srs';
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ success: false, error: 'Invalid pagination' });
  const [items, total] = await Promise.all([Job.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(), Job.countDocuments(filter)]);
  ok(res, { items, total, page, limit });
});
