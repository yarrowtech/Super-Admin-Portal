const asyncHandler = require('../utils/asyncHandler');
const logger = require('../utils/logger').child({ module: 'workspace.records' });
const service = require('../services/workspaceRecords.service');
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
exports.list = (kind) => asyncHandler(async (req, res) => ok(res, await service.list(req.user, req.params.projectId || req.query.projectId, kind, req.query)));
exports.detail = (kind) => asyncHandler(async (req, res) => ok(res, await service.detail(req.user, req.params.resourceId, kind, false, req.query.projectId)));
exports.create = (kind) => asyncHandler(async (req, res) => ok(res, await service.create(req.user, req.params.projectId || req.body?.projectId, kind, req.body), 201));
exports.update = (kind) => asyncHandler(async (req, res) => {
  if (req.query.projectId) await service.detail(req.user, req.params.resourceId, kind, true, req.query.projectId);
  ok(res, await service.update(req.user, req.params.resourceId, kind, req.body));
});
exports.cancel = asyncHandler(async (req, res) => {
  if (req.query.projectId) await service.detail(req.user, req.params.resourceId, 'subscription', true, req.query.projectId);
  ok(res, await service.cancel(req.user, req.params.resourceId));
});
exports.productList = (kind) => asyncHandler(async (req, res) => {
  const product = await service.detail(req.user, req.params.resourceId, 'product', false, req.query.projectId);
  ok(res, await service.list(req.user, product.projectId, kind, req.query, { productId: product._id }));
});
exports.productWorkspace = asyncHandler(async (req, res) => {
  const product = await service.detail(req.user, req.params.resourceId, 'product', false, req.query.projectId);
  ok(res, { product, subscriptions: await service.list(req.user, product.projectId, 'subscription', req.query, { productId: product._id }) });
});
exports.analytics = asyncHandler(async (req, res) => {
  const filter = await service.resolveProjectId(req.user, req.params.projectId);
  service.databaseReady();
  const Record = require('../models/WorkspaceRecord');
  const counts = await Record.aggregate([{ $match: filter }, { $group: { _id: { kind: '$kind', status: '$status' }, count: { $sum: 1 } } }]);
  ok(res, { projectId: filter.projectId, counts });
});
exports.users = asyncHandler(async (req, res) => {
  const filter = await service.resolveProjectId(req.user, req.params.projectId, true);
  service.databaseReady();
  const User = require('../models/auth/User');
  const page = Number(req.query.page || 1);
  const limit = Number(req.query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) {
    return res.status(400).json({ success: false, error: 'Invalid pagination' });
  }
  const project = (await service.accessibleProjects(req.user)).find((item) => item.code === filter.projectId);
  const names = [project.code, project.name, ...(project.aliases || []), ...(project.canonicalProjectId ? [String(project.canonicalProjectId)] : [])];
  const active = { status: { $nin: ['blocked', 'revoked', 'suspended', 'inactive', 'expired'] }, $and: [
    { $or: [{ startDate: { $exists: false } }, { startDate: { $lte: new Date().toISOString() } }] },
    { $or: [{ endDate: { $exists: false } }, { endDate: { $gte: new Date().toISOString() } }] },
  ] };
  const criteria = { $or: ['metadata.projectAssignments', 'metadata.assignedProjects'].flatMap((field) => [
    { [field]: { $elemMatch: { ...active, $or: [{ projectCode: { $in: names } }, { projectName: { $in: names } }, { projectId: { $in: names } }] } } },
    { [field]: { $in: names } },
  ]) };
  const [items, total] = await Promise.all([
    User.find(criteria).select('_id firstName lastName role').sort({ _id: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(criteria),
  ]);
  ok(res, { items: items.map((user) => ({ ...user, name: `${user.firstName} ${user.lastName}` })), total, page, limit });
});
exports.audit = asyncHandler(async (req, res) => {
  const filter = await service.resolveProjectId(req.user, req.params.projectId);
  service.databaseReady();
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ success: false, error: 'Invalid pagination' });
  const extraAudit = (Model, kind, name) => ({ $unionWith: { coll: Model.collection.name, pipeline: [
    { $match: filter }, { $unwind: '$history' }, { $project: { name, kind: { $literal: kind }, resourceId: '$_id', action: '$history.action', actor: '$history.actor', at: '$history.at', fields: '$history.fields' } },
  ] } });
  const rows = await require('../models/WorkspaceRecord').aggregate([
    { $match: filter }, { $unwind: '$history' },
    { $project: { name: 1, kind: 1, resourceId: '$_id', action: '$history.action', actor: '$history.actor', at: '$history.at', fields: '$history.fields' } },
    extraAudit(require('../models/WorkspaceConfiguration'), 'configuration', '$displayName'),
    extraAudit(require('../models/WorkspaceProductMember'), 'membership', { $literal: 'Product membership' }),
    extraAudit(require('../models/WorkspaceSync').State, 'integration', { $ifNull: ['$displayName', '$integrationId'] }),
    { $unionWith: { coll: require('../models/WorkspaceSync').Job.collection.name, pipeline: [
      { $match: filter }, { $project: { name: '$integrationId', kind: { $literal: 'sync' }, resourceId: '$_id', action: '$status', actor: '$requestedBy', at: '$updatedAt' } },
    ] } },
    { $sort: { at: -1, _id: -1 } }, { $facet: { items: [{ $skip: (page - 1) * limit }, { $limit: limit }], total: [{ $count: 'count' }] } },
  ]);
  ok(res, { items: rows[0]?.items || [], total: rows[0]?.total[0]?.count || 0, page, limit });
});
exports.productUsers = asyncHandler(async (req, res) => {
  const product = await service.detail(req.user, req.params.resourceId, 'product', false, req.query.projectId);
  const Member = require('../models/WorkspaceProductMember');
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ success: false, error: 'Invalid pagination' });
  const filter = { organizationId: product.organizationId, projectId: product.projectId, productId: product._id };
  const [items, total] = await Promise.all([Member.find(filter).populate('userId', 'firstName lastName role').sort({ _id: 1 }).skip((page - 1) * limit).limit(limit).lean(), Member.countDocuments(filter)]);
  ok(res, { items: items.map((item) => ({ ...item, name: item.userId ? `${item.userId.firstName} ${item.userId.lastName}` : 'Unavailable user' })), total, page, limit });
});
exports.addProductUser = asyncHandler(async (req, res) => {
  const product = await service.detail(req.user, req.params.resourceId, 'product', true, req.query.projectId);
  const body = req.body;
  if (!body || Object.keys(body).some((key) => !['userId', 'role'].includes(key)) || !require('mongoose').isObjectIdOrHexString(body.userId) || !['member', 'operator', 'manager'].includes(body.role || 'member')) return res.status(400).json({ success: false, error: 'Invalid membership' });
  const user = await require('../models/auth/User').findById(body.userId).lean();
  if (!user || user.isActive === false) return res.status(404).json({ success: false, error: 'User not found or inactive' });
  await service.resolveProjectId(user, product.projectId);
  const Member = require('../models/WorkspaceProductMember');
  const filter = { organizationId: product.organizationId, projectId: product.projectId, productId: product._id, userId: user._id };
  ok(res, await Member.findOneAndUpdate(filter, { $set: { role: body.role || 'member' }, $setOnInsert: { ...filter, addedBy: req.user._id || req.user.id }, $push: { history: { action: 'assigned', actor: req.user._id || req.user.id, at: new Date(), fields: ['role'] } } }, { new: true, upsert: true, runValidators: true }).lean());
});
