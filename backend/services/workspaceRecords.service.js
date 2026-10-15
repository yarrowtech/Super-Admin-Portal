const mongoose = require('mongoose');
const Record = require('../models/WorkspaceRecord');
const { createHash } = require('node:crypto');
const { getAccessibleProjects, getUserProjectAssignments, isPrivilegedProjectLauncher, normalizeProjectKey, WORKSPACE_ORGANIZATION } = require('../utils/projectAccess');

const fail = (status, message) => { const error = new Error(message); error.status = status; error.statusCode = status; throw error; };
const activeAssignment = (assignment) =>
    !['blocked', 'revoked', 'suspended', 'inactive', 'expired'].includes(String(assignment.status || 'active').toLowerCase()) &&
    (!assignment.startDate || new Date(assignment.startDate).getTime() <= Date.now()) &&
    (!assignment.endDate || new Date(assignment.endDate).getTime() >= Date.now());
const authorizedProjects = (user) => getAccessibleProjects(user).flatMap((project) => {
  const assignment = getUserProjectAssignments(user).find((assignment) => activeAssignment(assignment) &&
    [assignment.projectId, assignment.projectCode, assignment.projectName].some((value) => value &&
      [project.code, project.name, ...(project.aliases || [])].some((alias) => normalizeProjectKey(value) === normalizeProjectKey(alias)))
  );
  if (!assignment && !isPrivilegedProjectLauncher(user)) return [];
  return [{ ...project, accessGranted: true, permissions: [...(assignment?.permissions || []), ...(assignment?.moduleScopes || [])] }];
});
const scope = (user, projectId, write = false) => {
  const project = authorizedProjects(user).find((item) => normalizeProjectKey(item.code) === normalizeProjectKey(projectId));
  if (!project) fail(404, 'Project not found or access denied');
  if (write && !['admin', 'super_admin', 'superadmin'].includes(String(user.role).toLowerCase()) &&
      !project.permissions.includes('workspace.write')) fail(403, 'Workspace write permission required');
  return { organizationId: WORKSPACE_ORGANIZATION.id, projectId: project.code };
};
const databaseReady = () => { if (mongoose.connection.readyState !== 1) fail(503, 'Workspace database is unavailable'); };
const accessibleProjects = async (user) => {
  databaseReady();
  const Project = require('../models/common/Project');
  const assignments = getUserProjectAssignments(user);
  const active = assignments.filter(activeAssignment);
  const values = active.flatMap((item) => [item.projectCode, item.projectName, item.projectId]).filter(Boolean);
  const objectIds = values.filter((value) => mongoose.isObjectIdOrHexString(value));
  const registry = authorizedProjects(user);
  const actor = user._id || user.id;
  const conditions = [{ projectCode: { $in: registry.map((item) => item.code) } }, { projectCode: { $in: values } }, { name: { $in: values } }, { _id: { $in: objectIds } }];
  if (mongoose.isObjectIdOrHexString(actor)) conditions.push({ projectManager: actor }, { 'teamMembers.employee': actor });
  const documents = await Project.find(isPrivilegedProjectLauncher(user) ? {} : { $or: conditions }).select('name projectCode description status projectManager teamMembers').lean();
  const map = new Map(registry.map((item) => [item.code, item]));
  for (const doc of documents) {
    if (!doc.projectCode) continue;
    const matches = (assignment) => [assignment.projectCode, assignment.projectName, assignment.projectId].some((value) => value && [doc.projectCode, doc.name, String(doc._id)].some((key) => normalizeProjectKey(key) === normalizeProjectKey(value)));
    const assignment = assignments.find(matches);
    if (!isPrivilegedProjectLauncher(user) && assignment && !activeAssignment(assignment)) { map.delete(doc.projectCode); continue; }
    const existing = map.get(doc.projectCode);
    const manager = String(doc.projectManager) === String(actor);
    map.set(doc.projectCode, { ...existing, code: doc.projectCode, canonicalProjectId: doc._id, name: doc.name, description: doc.description,
      brandCode: existing?.brandCode || WORKSPACE_ORGANIZATION.id, projectType: existing?.projectType || 'internal_project', accessGranted: true,
      assigned: Boolean(assignment || manager || doc.teamMembers.some((member) => String(member.employee) === String(actor))), status: doc.status,
      permissions: [...new Set([...(existing?.permissions || []), ...(assignment?.permissions || []), ...(manager ? ['workspace.write'] : [])])], role: assignment?.role || user.role,
    });
  }
  return [...map.values()];
};
const resolveProjectId = async (user, projectId, write = false) => {
  if (mongoose.isObjectIdOrHexString(projectId)) {
    databaseReady();
    const project = await require('../models/common/Project').findById(projectId).select('projectCode').lean();
    if (!project) fail(404, 'Project not found');
    projectId = project.projectCode;
  }
  const project = (await accessibleProjects(user)).find((item) => String(item.code).toUpperCase() === String(projectId).toUpperCase());
  if (!project) fail(404, 'Project not found or access denied');
  if (write && !['admin', 'super_admin', 'superadmin'].includes(String(user.role).toLowerCase()) && !project.permissions.includes('workspace.write')) fail(403, 'Workspace write permission required');
  return { organizationId: WORKSPACE_ORGANIZATION.id, projectId: project.code };
};
const databaseScope = async (user) => ({ organizationId: WORKSPACE_ORGANIZATION.id, projectId: { $in: (await accessibleProjects(user)).map((item) => item.code) } });
const id = (value) => { if (!mongoose.isObjectIdOrHexString(value)) fail(400, 'Invalid resource ID'); return value; };
const queryScope = (user) => ({ organizationId: WORKSPACE_ORGANIZATION.id, projectId: { $in: authorizedProjects(user).map((project) => project.code) } });

const detail = async (user, resourceId, kind, write = false, expectedProjectId) => {
  id(resourceId);
  databaseReady();
  const filter = expectedProjectId ? await resolveProjectId(user, expectedProjectId, write) : await databaseScope(user);
  const record = await Record.findOne({ ...filter, _id: resourceId, kind }).lean();
  if (!record) fail(404, 'Resource not found or access denied');
  await resolveProjectId(user, record.projectId, write);
  return record;
};
const list = async (user, projectId, kind, query = {}, extra = {}) => {
  const filter = projectId ? await resolveProjectId(user, projectId) : await databaseScope(user);
  databaseReady();
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 25);
  if (!Number.isInteger(page) || page < 1 || page > 10000 || !Number.isInteger(limit) || limit < 1 || limit > 100) fail(400, 'Invalid pagination');
  const criteria = { ...filter, kind, ...extra };
  if (filter.projectId === 'YARROWTECH') {
    if (query.status !== undefined && (typeof query.status !== 'string' || !['all', 'active', 'inactive', 'cancelled', 'open', 'in_progress', 'resolved', 'closed', 'archived'].includes(query.status))) fail(400, 'Invalid status filter');
    if (query.status && query.status !== 'all' && query.status !== 'archived') criteria.status = query.status;
    if (['service', 'product'].includes(kind)) criteria.archivedAt = query.status === 'archived' ? { $ne: null } : null;
  }
  if (query.search !== undefined) {
    if (typeof query.search !== 'string' || query.search.length > 200) fail(400, 'Invalid search');
    if (query.search.trim()) criteria.name = { $regex: query.search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), $options: 'i' };
  }
  const [items, total] = await Promise.all([
    Record.find(criteria).sort({ createdAt: -1, _id: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Record.countDocuments(criteria),
  ]);
  return { items, total, page, limit };
};
const validate = (body, creating, kind) => {
  if (!body || typeof body !== 'object' || Array.isArray(body)) fail(400, 'Object body required');
  const resourceFields = { service: [], product: [], customer: ['email', 'phone'], ticket: ['priority'], plan: ['amountMinor', 'currency', 'billingInterval'], subscription: ['startsAt', 'endsAt'] };
  const allowed = ['name', 'description', 'status', ...(resourceFields[kind] || []), ...(creating ? ['productId', 'customerId', 'planId', 'projectId', 'idempotencyKey'] : ['version'])];
  if (Object.keys(body).some((key) => !allowed.includes(key))) fail(400, 'Unsupported resource field');
  if (creating && (typeof body.name !== 'string' || !body.name.trim())) fail(400, 'Name required');
  if (body.name !== undefined && (typeof body.name !== 'string' || !body.name.trim() || body.name.length > 200)) fail(400, 'Invalid name');
  if (body.description !== undefined && (typeof body.description !== 'string' || body.description.length > 5000)) fail(400, 'Invalid description');
  const statuses = kind === 'ticket' ? ['open', 'in_progress', 'resolved', 'closed'] : ['active', 'inactive'];
  if (body.status !== undefined && !statuses.includes(body.status)) fail(400, 'Invalid status for resource');
  if (body.email !== undefined && (typeof body.email !== 'string' || body.email.length > 254 || (body.email && !/^\S+@\S+\.\S+$/.test(body.email)))) fail(400, 'Invalid email');
  if (body.phone !== undefined && (typeof body.phone !== 'string' || body.phone.length > 40)) fail(400, 'Invalid phone');
  if (body.priority !== undefined && !['low', 'normal', 'high', 'urgent'].includes(body.priority)) fail(400, 'Invalid priority');
  if (body.version !== undefined && (!Number.isInteger(body.version) || body.version < 0)) fail(400, 'Invalid version');
  if (body.idempotencyKey !== undefined && (typeof body.idempotencyKey !== 'string' || !/^[A-Za-z0-9_-]{8,100}$/.test(body.idempotencyKey))) fail(400, 'Invalid idempotency key');
  if (kind === 'plan' && (creating || body.amountMinor !== undefined) && (!Number.isSafeInteger(body.amountMinor) || body.amountMinor < 0)) fail(400, 'Price must be a nonnegative integer in minor currency units');
  if (kind === 'plan' && (creating || body.currency !== undefined) && (typeof body.currency !== 'string' || !/^[A-Z]{3}$/.test(body.currency))) fail(400, 'Three-letter currency required');
  if (kind === 'plan' && (creating || body.billingInterval !== undefined) && !['monthly', 'yearly', 'one_time'].includes(body.billingInterval)) fail(400, 'Billing interval required');
  for (const field of ['startsAt', 'endsAt']) if (body[field] !== undefined && (typeof body[field] !== 'string' || !Number.isFinite(Date.parse(body[field])))) fail(400, 'Invalid subscription date');
  if (body.startsAt && body.endsAt && new Date(body.endsAt) <= new Date(body.startsAt)) fail(400, 'End must follow start');
};
const create = async (user, projectId, kind, body) => {
  const filter = await resolveProjectId(user, projectId, true);
  validate(body, true, kind);
  databaseReady();
  if (body.projectId && (await resolveProjectId(user, body.projectId)).projectId !== filter.projectId) fail(400, 'Project relationship mismatch');
  const relations = {};
  for (const [field, relatedKind] of [['productId', 'product'], ['customerId', 'customer'], ['planId', 'plan']]) {
    if (!body[field]) continue;
    const related = await detail(user, body[field], relatedKind);
    if (related.projectId !== filter.projectId) fail(400, 'Cross-project relationship rejected');
    relations[field] = related;
  }
  if (kind === 'plan' && !body.productId) fail(400, 'Product required for plan');
  if (kind === 'subscription' && (!body.productId || !body.customerId || !body.planId)) fail(400, 'Product, customer and plan required');
  if (relations.planId && (String(relations.planId.productId) !== String(body.productId) || relations.planId.status !== 'active')) fail(400, 'Plan must be active and belong to selected product');
  if (kind === 'subscription' && (relations.productId.status !== 'active' || relations.customerId.status !== 'active')) fail(400, 'Product and customer must be active');
  const project = (await accessibleProjects(user)).find((item) => item.code === filter.projectId);
  const { projectId: ignoredProject, idempotencyKey, ...fields } = body;
  void ignoredProject;
  const createdBy = user._id || user.id;
  const creationHash = createHash('sha256').update(JSON.stringify(Object.keys(fields).sort().map((key) => [key, fields[key]]))).digest('hex');
  const duplicate = async () => {
    const existing = await Record.findOne({ ...filter, kind, createdBy, creationKey: idempotencyKey });
    if (existing && existing.creationHash !== creationHash) fail(409, 'Idempotency key already used for a different request');
    return existing;
  };
  if (idempotencyKey) { const existing = await duplicate(); if (existing) return existing; }
  const billing = kind === 'subscription' ? { amountMinor: relations.planId.amountMinor, currency: relations.planId.currency, billingInterval: relations.planId.billingInterval, startsAt: fields.startsAt || new Date() } : {};
  if (kind === 'subscription' && fields.endsAt && new Date(fields.endsAt) <= new Date(billing.startsAt)) fail(400, 'End must follow start');
  try {
    return await Record.create({ ...fields, ...billing, ...filter, status: fields.status || (kind === 'ticket' ? 'open' : 'active'), brandId: project.brandCode, kind, createdBy,
      ...(idempotencyKey ? { creationKey: idempotencyKey, creationHash } : {}), history: [{ action: 'created', actor: createdBy, fields: Object.keys(fields) }] });
  } catch (error) {
    if (idempotencyKey && error.code === 11000) { const existing = await duplicate(); if (existing) return existing; }
    throw error;
  }
};
const update = async (user, resourceId, kind, body) => {
  validate(body, false, kind);
  const record = await detail(user, resourceId, kind, true);
  if (record.source !== 'internal') fail(409, 'Externally owned record requires a verified provider write adapter');
  if (record.projectId === 'YARROWTECH' && record.archivedAt) fail(409, 'Archived records are read-only');
  if (record.status === 'cancelled') fail(409, 'Cancelled subscription cannot be changed');
  const { version, ...fields } = body;
  if (!Object.keys(fields).length) fail(400, 'At least one editable field required');
  if (kind === 'subscription' && (fields.startsAt || fields.endsAt) && new Date(fields.endsAt || record.endsAt) <= new Date(fields.startsAt || record.startsAt)) fail(400, 'End must follow start');
  const updated = await Record.findOneAndUpdate({ ...await resolveProjectId(user, record.projectId, true), _id: record._id, __v: version ?? record.__v, kind, source: 'internal', status: { $ne: 'cancelled' } }, {
    $set: fields, $inc: { __v: 1 }, $push: { history: { action: 'updated', actor: user._id || user.id, at: new Date(), fields: Object.keys(fields) } },
  }, { new: true, runValidators: true }).lean();
  if (!updated) fail(409, 'Record changed; reload before editing');
  return updated;
};
const cancel = async (user, resourceId) => {
  const record = await detail(user, resourceId, 'subscription', true);
  if (record.source !== 'internal') fail(409, 'Provider cancellation is not configured');
  if (record.status === 'cancelled') return record;
  const updated = await Record.findOneAndUpdate({ ...await resolveProjectId(user, record.projectId, true), _id: record._id, __v: record.__v, kind: 'subscription', source: 'internal' }, {
    $set: { status: 'cancelled', cancelledAt: new Date() }, $inc: { __v: 1 }, $push: { history: { action: 'cancelled', actor: user._id || user.id, at: new Date(), fields: ['status'] } },
  }, { new: true }).lean();
  if (!updated) fail(409, 'Subscription changed; reload before cancelling');
  return updated;
};

module.exports = { authorizedProjects, accessibleProjects, scope, queryScope, databaseScope, resolveProjectId, databaseReady, detail, list, create, update, cancel, activeAssignment };
