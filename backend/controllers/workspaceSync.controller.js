const asyncHandler = require('../utils/asyncHandler');
const service = require('../services/workspaceSync.service');
const records = require('../services/workspaceRecords.service');
const { Job, External, State } = require('../models/WorkspaceSync');
const ok = (res, data, status = 200) => res.status(status).json({ success: true, data });
exports.test = asyncHandler(async (req, res) => ok(res, await service.testConnection(req.user, req.params.integrationId)));
exports.sync = asyncHandler(async (req, res) => ok(res, await service.enqueue(req.user, req.params.integrationId, req.body), 202));
exports.detail = asyncHandler(async (req, res) => ok(res, await service.jobDetail(req.user, req.params.jobId)));
exports.retry = asyncHandler(async (req, res) => ok(res, await service.retry(req.user, req.params.jobId), 202));
exports.status = asyncHandler(async (req, res) => {
  const { adapter, filter } = service.getAdapter(req.user, req.params.integrationId);
  records.databaseReady();
  const state = await State.findOne(filter).lean();
  ok(res, { id: req.params.integrationId, enabled: state?.enabled !== false, status: state?.enabled === false ? 'disabled' : state?.status || (adapter.provider.getBaseUrl() && adapter.provider.getServiceToken() ? 'unverified' : 'blocked'), checkedAt: state?.checkedAt || null, lastInboundAt: state?.lastInboundAt || null, lastOutboundAt: state?.lastOutboundAt || null, error: state?.error || null });
});
exports.configure = asyncHandler(async (req, res) => {
  const integrationId = req.params.integrationId || req.body?.integrationId;
  const { filter } = service.getAdapter(req.user, integrationId, true);
  records.databaseReady();
  if (req.params.projectId && (await records.resolveProjectId(req.user, req.params.projectId, true)).projectId !== filter.projectId) return res.status(400).json({ success: false, error: 'Integration belongs to another project' });
  const body = req.body;
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !['integrationId', 'displayName', 'enabled'].includes(key)) ||
      (body.displayName !== undefined && (typeof body.displayName !== 'string' || !body.displayName.trim() || body.displayName.length > 200)) ||
      (body.enabled !== undefined && typeof body.enabled !== 'boolean')) return res.status(400).json({ success: false, error: 'Invalid integration settings; credentials are configured server-side' });
  const fields = {};
  if (body.displayName !== undefined) fields.displayName = body.displayName;
  if (body.enabled !== undefined) fields.enabled = body.enabled;
  ok(res, await State.findOneAndUpdate(filter, { $set: fields, $setOnInsert: { ...filter, status: 'unverified' }, $push: { history: { action: 'configured', actor: req.user._id || req.user.id, at: new Date(), fields: Object.keys(fields) } } }, { upsert: true, new: true, runValidators: true }).lean());
});
exports.list = (external = false) => asyncHandler(async (req, res) => {
  let filter = records.queryScope(req.user);
  if (req.params.integrationId) filter = service.getAdapter(req.user, req.params.integrationId).filter;
  else if (req.query.projectId) filter = await records.resolveProjectId(req.user, req.query.projectId);
  records.databaseReady();
  const page = Number(req.query.page || 1), limit = Number(req.query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) return res.status(400).json({ success: false, error: 'Invalid pagination' });
  const Model = external ? External : Job;
  if (external) filter.present = { $ne: false };
  const [items, total] = await Promise.all([Model.find(filter).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Model.countDocuments(filter)]);
  ok(res, { items, total, page, limit });
});
