const mongoose = require('mongoose');
const { createHash } = require('node:crypto');
const records = require('./workspaceRecords.service');
const Record = require('../models/WorkspaceRecord');
const { Details, Delivery, Payment } = require('../models/YarrowtechOperations');
const fail = (statusCode, message) => { const error = new Error(message); error.statusCode = statusCode; throw error; };
const scope = async (user, projectId = 'YARROWTECH', write = false) => {
  const filter = await records.resolveProjectId(user, projectId, write);
  if (filter.projectId !== 'YARROWTECH') fail(404, 'YarrowTech resource not found');
  return filter;
};
const detail = async (user, resourceId, kind, write = false) => records.detail(user, resourceId, kind, write, 'YARROWTECH');
const pagination = (query = {}) => {
  const page = Number(query.page || 1), limit = Number(query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) fail(400, 'Invalid pagination');
  return { page, limit };
};
const list = async (Model, filter, query, searchField = 'name') => {
  const { page, limit } = pagination(query);
  const criteria = { ...filter };
  if (query.search) {
    if (typeof query.search !== 'string' || query.search.length > 200) fail(400, 'Invalid search');
    criteria[searchField] = { $regex: query.search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  const [items, total] = await Promise.all([Model.find(criteria).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(), Model.countDocuments(criteria)]);
  return { items, total, page, limit };
};
const archive = async (user, resourceId, kind) => {
  const record = await detail(user, resourceId, kind, true);
  if (record.source !== 'internal') fail(409, 'Provider archive contract is unverified');
  if (record.archivedAt) return record;
  const updated = await Record.findOneAndUpdate({ ...await scope(user, 'YARROWTECH', true), _id: record._id, __v: record.__v, source: 'internal' }, {
    $set: { status: 'inactive', archivedAt: new Date() }, $inc: { __v: 1 }, $push: { history: { action: 'archived', actor: user._id || user.id, at: new Date(), fields: ['status', 'archivedAt'] } },
  }, { new: true }).lean();
  if (!updated) fail(409, 'Record changed; reload before archiving');
  return updated;
};
const getSettings = async (user, resourceId, kind = 'product') => {
  const resource = await detail(user, resourceId, kind);
  const settings = await Details.findOne({ organizationId: resource.organizationId, projectId: resource.projectId, resourceId: resource._id }).lean();
  return { resource, settings };
};
const saveSettings = async (user, resourceId, body, kind = 'product') => {
  const resource = await detail(user, resourceId, kind, true);
  if (resource.source !== 'internal') fail(409, 'Provider settings contract is unverified');
  if (resource.archivedAt) fail(409, 'Archived records are read-only');
  const allowed = kind === 'product' ? ['category', 'productCode', 'releaseVersion', 'notificationsEnabled'] : ['category'];
  if (!body || typeof body !== 'object' || Array.isArray(body) || !Object.keys(body).length || Object.keys(body).some((key) => !allowed.includes(key))) fail(400, 'Invalid settings');
  for (const [key, value] of Object.entries(body)) {
    if (key === 'notificationsEnabled' ? typeof value !== 'boolean' : typeof value !== 'string' || value.length > 100 || (key === 'productCode' && !value.trim())) fail(400, 'Invalid settings value');
  }
  const filter = { organizationId: resource.organizationId, projectId: resource.projectId, resourceId: resource._id };
  return Details.findOneAndUpdate(filter, { $set: body, $setOnInsert: filter, $push: { history: { action: 'settings_updated', actor: user._id || user.id, at: new Date(), fields: Object.keys(body) } } }, { upsert: true, new: true, runValidators: true }).lean();
};
const deliveries = async (user, projectId, query) => {
  const filter = await scope(user, projectId);
  if (query.serviceId) { await detail(user, query.serviceId, 'service'); filter.serviceId = query.serviceId; }
  return list(Delivery, filter, query);
};
const saveDelivery = async (user, projectId, body, resourceId) => {
  const filter = await scope(user, projectId, true);
  const allowed = ['name', 'description', 'status', 'dueAt', 'ownerId', 'teamIds', 'tasks', ...(resourceId ? ['version'] : ['serviceId', 'customerId', 'idempotencyKey'])];
  if (!body || typeof body !== 'object' || Array.isArray(body) || Object.keys(body).some((key) => !allowed.includes(key))) fail(400, 'Invalid service project');
  if (body.version !== undefined && (!Number.isInteger(body.version) || body.version < 0)) fail(400, 'Invalid revision');
  if (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.idempotencyKey))) fail(400, 'Invalid idempotency key');
  if ((!resourceId || body.name !== undefined) && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200)) fail(400, 'Project name required');
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000)) fail(400, 'Invalid description');
  if (body.status !== undefined && !['planning', 'in_progress', 'on_hold', 'completed', 'cancelled'].includes(body.status)) fail(400, 'Invalid delivery status');
  if (body.dueAt !== undefined && body.dueAt !== null && (typeof body.dueAt !== 'string' || !Number.isFinite(Date.parse(body.dueAt)))) fail(400, 'Invalid due date');
  if (body.teamIds !== undefined && (!Array.isArray(body.teamIds) || body.teamIds.length > 50 || body.teamIds.some((userId) => !mongoose.isObjectIdOrHexString(userId)))) fail(400, 'Invalid team');
  if (body.ownerId !== undefined && body.ownerId !== null && !mongoose.isObjectIdOrHexString(body.ownerId)) fail(400, 'Invalid owner');
  for (const userId of [body.ownerId, ...(body.teamIds || [])].filter(Boolean)) {
    if (!mongoose.isObjectIdOrHexString(userId)) fail(400, 'Invalid team user');
    const member = await require('../models/auth/User').findById(userId).lean();
    if (!member || !member.isActive || ['inactive', 'blocked', 'suspended'].includes(member.accountStatus)) fail(400, 'Team user is unavailable');
    await scope(member);
  }
  if (body.tasks !== undefined && (!Array.isArray(body.tasks) || body.tasks.length > 100 || body.tasks.some((task) => !task || typeof task.title !== 'string' || !task.title.trim() || task.title.length > 200 || !['pending', 'in_progress', 'completed'].includes(task.status || 'pending') || Object.keys(task).some((key) => !['title', 'status'].includes(key))))) fail(400, 'Invalid delivery tasks');
  if (resourceId) {
    if (!mongoose.isObjectIdOrHexString(resourceId)) fail(400, 'Invalid service project ID');
    const current = await Delivery.findOne({ ...filter, _id: resourceId }).select('__v').lean();
    if (!current) fail(404, 'Service project not found');
    const { version, ...fields } = body;
    if (!Object.keys(fields).length) fail(400, 'At least one editable field required');
    const result = await Delivery.findOneAndUpdate({ ...filter, _id: resourceId, __v: version ?? current.__v }, { $set: fields, $inc: { __v: 1 }, $push: { history: { action: 'updated', actor: user._id || user.id, at: new Date(), fields: Object.keys(fields) } } }, { new: true, runValidators: true }).lean();
    if (!result) fail(409, 'Service project changed; reload before editing');
    return result;
  }
  const [service, customer] = await Promise.all([detail(user, body.serviceId, 'service'), detail(user, body.customerId, 'customer')]);
  if (service.status !== 'active' || customer.status !== 'active') fail(400, 'Service and customer must be active');
  const { idempotencyKey, ...fields } = body;
  const createdBy = user._id || user.id;
  const creationHash = createHash('sha256').update(JSON.stringify(Object.keys(fields).sort().map((key) => [key, fields[key]]))).digest('hex');
  const existingRequest = async () => {
    const existing = await Delivery.findOne({ ...filter, createdBy, creationKey: idempotencyKey }).select('+creationHash');
    if (existing && existing.creationHash !== creationHash) fail(409, 'Idempotency key was used with a different service project');
    if (!existing) return null;
    const result = existing.toObject(); delete result.creationHash; return result;
  };
  if (idempotencyKey) { const existing = await existingRequest(); if (existing) return existing; }
  try {
    const created = await Delivery.create({ ...filter, ...fields, createdBy, ...(idempotencyKey ? { creationKey: idempotencyKey, creationHash } : {}), history: [{ action: 'created', actor: createdBy, fields: Object.keys(fields) }] });
    const result = created.toObject(); delete result.creationHash; return result;
  } catch (error) { if (idempotencyKey && error.code === 11000) { const existing = await existingRequest(); if (existing) return existing; } throw error; }
};
const clients = async (user, projectId, query) => {
  const filter = await scope(user, projectId);
  const [serviceClients, projectClients] = await Promise.all([Record.distinct('customerId', { ...filter, kind: 'service', customerId: { $exists: true } }), Delivery.distinct('customerId', filter)]);
  return list(Record, { ...filter, kind: 'customer', _id: { $in: [...serviceClients, ...projectClients] } }, query);
};
const payments = async (user, subscriptionId, query) => {
  const subscription = await detail(user, subscriptionId, 'subscription');
  return list(Payment, { organizationId: subscription.organizationId, projectId: subscription.projectId, subscriptionId: subscription._id }, query, 'externalTransactionId');
};
module.exports = { scope, detail, archive, getSettings, saveSettings, deliveries, saveDelivery, clients, payments };
