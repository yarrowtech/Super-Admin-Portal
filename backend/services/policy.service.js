const mongoose = require('mongoose');
const Policy = require('../models/policy/Policy');
const PolicyVersion = require('../models/policy/PolicyVersion');
const PolicySection = require('../models/policy/PolicySection');
const PolicyProjectAssignment = require('../models/policy/PolicyProjectAssignment');
const PolicyAcceptance = require('../models/policy/PolicyAcceptance');
const PolicyAuditLog = require('../models/policy/PolicyAuditLog');
const Project = require('../models/common/Project');

const MAX_LIMIT = 100;
const err = (code, status, message) => Object.assign(new Error(message), { code, status });
const objectId = (value, code = 'VALIDATION_ERROR') => {
  if (!mongoose.Types.ObjectId.isValid(value)) throw err(code, 400, 'Invalid identifier');
  return new mongoose.Types.ObjectId(value);
};
const slugify = (value) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cleanText = (value) => String(value || '').replace(/<\/?(script|style)[^>]*>/gi, '').replace(/on\w+\s*=\s*(['"]).*?\1/gi, '').trim();
const page = (query = {}) => ({ page: Math.max(Number(query.page) || 1, 1), limit: Math.min(Math.max(Number(query.limit) || 25, 1), MAX_LIMIT) });
const privileged = (user) => ['super_admin', 'admin'].includes(user?.role);
const assignmentIds = (user) => (Array.isArray(user?.assignedProjects) ? user.assignedProjects : [])
  .map((x) => x?.projectId || x).map(String).filter(mongoose.Types.ObjectId.isValid);

async function assertProjectAccess(user, projectId) {
  const id = objectId(projectId, 'PROJECT_NOT_FOUND');
  const project = await Project.findOne({ _id: id, archivedAt: null }).select('_id').lean();
  if (!project) throw err('PROJECT_NOT_FOUND', 404, 'Project not found');
  if (!privileged(user) && !assignmentIds(user).includes(String(id))) throw err('PROJECT_ACCESS_DENIED', 403, 'Project access denied');
  return id;
}
async function audit(actorId, action, policyId, metadata = {}, projectId = null, version = null) {
  return PolicyAuditLog.create({ actorId, action, entityType: 'Policy', entityId: String(policyId), policyId, projectId, version, metadata });
}
async function sectionsFor(versionId) { return PolicySection.find({ policyVersionId: versionId, enabled: true }).sort({ order: 1 }).lean(); }

async function listPolicies(query, user) {
  const { page: currentPage, limit } = page(query);
  const filter = { deletedAt: null };
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.priority) filter.priority = query.priority;
  if (query.projectId) {
    const projectId = await assertProjectAccess(user, query.projectId);
    filter.$or = [{ scope: 'GLOBAL' }, { _id: { $in: await PolicyProjectAssignment.find({ projectId, enabled: true }).distinct('policyId') } }];
  }
  if (query.search) filter.$text = { $search: String(query.search).slice(0, 100) };
  const sortBy = ['updatedAt', 'createdAt', 'title', 'effectiveDate', 'priority'].includes(query.sortBy) ? query.sortBy : 'updatedAt';
  const sort = { [sortBy]: String(query.sortOrder).toLowerCase() === 'asc' ? 1 : -1 };
  const [items, total] = await Promise.all([Policy.find(filter).sort(sort).skip((currentPage - 1) * limit).limit(limit).lean(), Policy.countDocuments(filter)]);
  return { items, pagination: { page: currentPage, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}
async function getPolicy(id) {
  const policy = await Policy.findOne({ _id: objectId(id), deletedAt: null }).lean();
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  const [version, assignments] = await Promise.all([policy.currentVersionId ? PolicyVersion.findById(policy.currentVersionId).lean() : null, PolicyProjectAssignment.find({ policyId: policy._id }).lean()]);
  return { ...policy, currentVersion: version ? { ...version, sections: await sectionsFor(version._id) } : null, assignments };
}
async function createPolicy(payload, actorId) {
  const scope = payload.scope;
  if (!['GLOBAL', 'SINGLE_PROJECT', 'SELECTED_PROJECTS'].includes(scope)) throw err('VALIDATION_ERROR', 400, 'Invalid policy scope');
  const title = cleanText(payload.title);
  const policyCode = String(payload.policyCode || '').trim().toUpperCase();
  if (!title || !policyCode) throw err('VALIDATION_ERROR', 400, 'Policy title and code are required');
  const policy = await Policy.create({ policyCode, title, slug: slugify(payload.slug || title), type: payload.type || 'OTHER', description: cleanText(payload.description), scope, priority: payload.priority || 'MEDIUM', ownerId: payload.ownerId || null, requiresAcceptance: Boolean(payload.requiresAcceptance), requiresReAcceptance: Boolean(payload.requiresReAcceptance), effectiveDate: payload.effectiveDate || null, reviewDate: payload.reviewDate || null, expirationDate: payload.expirationDate || null, createdBy: actorId, updatedBy: actorId });
  await audit(actorId, 'POLICY_CREATED', policy._id);
  return policy;
}
async function updatePolicy(id, payload, actorId) {
  const policy = await Policy.findOne({ _id: objectId(id), deletedAt: null });
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  const allowed = ['title', 'description', 'type', 'priority', 'ownerId', 'requiresAcceptance', 'requiresReAcceptance', 'effectiveDate', 'reviewDate', 'expirationDate'];
  allowed.forEach((key) => { if (payload[key] !== undefined) policy[key] = ['title', 'description'].includes(key) ? cleanText(payload[key]) : payload[key]; });
  // Scope changes require assignment management and are deliberately excluded from generic PATCH.
  policy.updatedBy = actorId;
  await policy.save(); await audit(actorId, 'POLICY_UPDATED', policy._id); return policy;
}
async function createVersion(policyId, payload, actorId) {
  const policy = await Policy.findOne({ _id: objectId(policyId), deletedAt: null });
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  const existingDraft = await PolicyVersion.exists({ policyId: policy._id, status: { $in: ['DRAFT', 'IN_REVIEW', 'APPROVED'] } });
  if (existingDraft) throw err('CONFLICT', 409, 'Finish or archive the existing draft version before creating another version');
  const latest = await PolicyVersion.findOne({ policyId: policy._id }).sort({ versionNumber: -1 }).lean();
  const versionNumber = latest ? latest.versionNumber + 1 : 1;
  const version = await PolicyVersion.create({ policyId: policy._id, versionNumber, title: cleanText(payload.title || policy.title), summary: cleanText(payload.summary), changeSummary: cleanText(payload.changeSummary), content: cleanText(payload.content), effectiveDate: payload.effectiveDate || policy.effectiveDate || null, createdBy: actorId });
  const incoming = Array.isArray(payload.sections) ? payload.sections.slice(0, 100) : [];
  if (incoming.length) await PolicySection.insertMany(incoming.map((section, index) => ({ policyVersionId: version._id, key: slugify(section.key || section.title), title: cleanText(section.title), content: cleanText(section.content), order: Number.isFinite(Number(section.order)) ? Number(section.order) : index, enabled: section.enabled !== false })));
  // A new draft must never replace the currently published version. For a
  // brand-new policy it is retained as a draft pointer solely for authoring.
  if (!policy.currentVersionId) { policy.currentVersionId = version._id; await policy.save(); }
  await audit(actorId, 'VERSION_CREATED', policy._id, {}, null, versionNumber); return version;
}
const transitions = { DRAFT: ['IN_REVIEW'], IN_REVIEW: ['APPROVED'], APPROVED: ['PUBLISHED'], PUBLISHED: ['ARCHIVED'], ARCHIVED: [] };
async function transition(policyId, target, actorId) {
  const policy = await Policy.findOne({ _id: objectId(policyId), deletedAt: null });
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  let version;
  if (target === 'ARCHIVED' && policy.status === 'PUBLISHED') {
    version = policy.currentVersionId ? await PolicyVersion.findById(policy.currentVersionId) : null;
    if (!version || version.status !== 'PUBLISHED') throw err('INVALID_POLICY_STATE', 409, 'Published version is missing');
    version.status = 'ARCHIVED'; await version.save();
    policy.status = 'ARCHIVED'; policy.updatedBy = actorId; await policy.save();
  } else {
    // For revisions, transition the latest non-published version. The live
    // policy and its live version remain usable until the replacement is published.
    version = await PolicyVersion.findOne({ policyId: policy._id, status: target === 'IN_REVIEW' ? 'DRAFT' : target === 'APPROVED' ? 'IN_REVIEW' : 'APPROVED' }).sort({ versionNumber: -1 });
    if (!version) throw err('INVALID_POLICY_STATE', 409, 'No version is available for this workflow transition');
    if (!transitions[version.status]?.includes(target)) throw err('INVALID_POLICY_STATE', 409, `Cannot transition version ${version.status} to ${target}`);
    if (target === 'PUBLISHED' && !String(version.content || '').trim() && !(await PolicySection.exists({ policyVersionId: version._id, enabled: true }))) {
      throw err('VALIDATION_ERROR', 400, 'A policy version needs content or at least one enabled section before publishing');
    }
    if (target === 'PUBLISHED' && version.effectiveDate && version.effectiveDate > new Date()) throw err('INVALID_POLICY_STATE', 409, 'Version is not yet effective');
    if (target === 'PUBLISHED') {
      await PolicyVersion.updateMany({ policyId: policy._id, status: 'PUBLISHED', _id: { $ne: version._id } }, { $set: { status: 'ARCHIVED' } });
      version.publishedAt = new Date(); version.publishedBy = actorId; policy.currentVersionId = version._id; policy.status = 'PUBLISHED';
    } else if (policy.status !== 'PUBLISHED') {
      policy.status = target;
    }
    version.status = target; await version.save(); policy.updatedBy = actorId; await policy.save();
  }
  const action = target === 'IN_REVIEW' ? 'REVIEW_SUBMITTED' : target === 'APPROVED' ? 'POLICY_APPROVED' : target === 'PUBLISHED' ? 'POLICY_PUBLISHED' : 'POLICY_ARCHIVED';
  await audit(actorId, action, policy._id, {}, null, version?.versionNumber || null); return policy;
}
async function setAssignments(policyId, projectIds, actorId) {
  const policy = await Policy.findOne({ _id: objectId(policyId), deletedAt: null });
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  const ids = [...new Set((Array.isArray(projectIds) ? projectIds : []).map(String))];
  if (policy.scope === 'GLOBAL' && ids.length) throw err('VALIDATION_ERROR', 400, 'Global policies cannot have project assignments');
  if (policy.scope === 'SINGLE_PROJECT' && ids.length !== 1) throw err('VALIDATION_ERROR', 400, 'Single-project policy requires exactly one project');
  await Promise.all(ids.map((id) => assertProjectAccess({ role: 'super_admin' }, id)));
  const current = await PolicyProjectAssignment.find({ policyId: policy._id }).lean();
  const currentIds = new Set(current.filter((row) => row.enabled).map((row) => String(row.projectId)));
  const requested = new Set(ids);
  await PolicyProjectAssignment.updateMany({ policyId: policy._id, projectId: { $nin: ids }, enabled: true }, { $set: { enabled: false } });
  if (ids.length) await PolicyProjectAssignment.bulkWrite(ids.map((projectId) => ({
    updateOne: { filter: { policyId: policy._id, projectId }, update: { $set: { enabled: true, required: true }, $setOnInsert: { createdBy: actorId } }, upsert: true }
  })));
  await Promise.all([
    ...ids.filter((id) => !currentIds.has(id)).map((projectId) => audit(actorId, 'PROJECT_ASSIGNED', policy._id, {}, projectId)),
    ...[...currentIds].filter((id) => !requested.has(id)).map((projectId) => audit(actorId, 'PROJECT_UNASSIGNED', policy._id, {}, projectId)),
  ]);
  return PolicyProjectAssignment.find({ policyId: policy._id }).lean();
}
async function applicablePolicies(user, projectId) {
  const id = await assertProjectAccess(user, projectId); const now = new Date();
  const assigned = await PolicyProjectAssignment.find({ projectId: id, enabled: true }).distinct('policyId');
  const policies = await Policy.find({ deletedAt: null, status: 'PUBLISHED', $or: [{ scope: 'GLOBAL' }, { _id: { $in: assigned } }], $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }, { $or: [{ expirationDate: null }, { expirationDate: { $gt: now } }] }] }).lean();
  const versionIds = policies.map((p) => p.currentVersionId).filter(Boolean);
  const [versions, accepted] = await Promise.all([PolicyVersion.find({ _id: { $in: versionIds }, status: 'PUBLISHED' }).lean(), PolicyAcceptance.find({ userId: user.id, projectId: id, policyId: { $in: policies.map((row) => row._id) } }).lean()]);
  const versionMap = new Map(versions.map((version) => [String(version._id), version]));
  const exactAcceptance = new Set(accepted.map((row) => String(row.policyVersionId)));
  const acceptedPolicyIds = new Set(accepted.map((row) => String(row.policyId)));
  const items = await Promise.all(policies.map(async (policy) => {
    const version = versionMap.get(String(policy.currentVersionId));
    if (!version) return null;
    const acceptedCurrentVersion = exactAcceptance.has(String(version._id));
    const acceptedEarlierVersion = acceptedPolicyIds.has(String(policy._id));
    const accepted = acceptedCurrentVersion || (!policy.requiresReAcceptance && acceptedEarlierVersion);
    return { ...policy, currentVersion: { ...version, sections: await sectionsFor(version._id) }, accepted, outstanding: Boolean(policy.requiresAcceptance && !accepted) };
  }));
  return { projectId: String(id), items: items.filter(Boolean), outstanding: items.filter((item) => item?.outstanding) };
}
async function acceptPolicy(user, policyId, projectId, ipAddress, userAgent) {
  const requirements = await applicablePolicies(user, projectId); const policy = requirements.items.find((item) => String(item._id) === String(policyId));
  if (!policy || !policy.currentVersion || !policy.requiresAcceptance) throw err('POLICY_NOT_PUBLISHED', 409, 'Policy is not available for acceptance');
  const filter = { userId: user.id, projectId: requirements.projectId, policyId: policy._id, policyVersionId: policy.currentVersion._id };
  const existing = await PolicyAcceptance.findOne(filter).lean();
  if (existing) return existing; // idempotent retries do not create duplicate audit events.
  try {
    const acceptance = await PolicyAcceptance.create({ ...filter, version: policy.currentVersion.versionNumber, acceptedAt: new Date(), ipAddress: String(ipAddress || '').slice(0, 128), userAgent: String(userAgent || '').slice(0, 512) });
    await audit(user.id, 'POLICY_ACCEPTED', policy._id, {}, requirements.projectId, policy.currentVersion.versionNumber);
    return acceptance;
  } catch (error) {
    if (error?.code !== 11000) throw error;
    return PolicyAcceptance.findOne(filter).lean();
  }
}
module.exports = { listPolicies, getPolicy, createPolicy, updatePolicy, createVersion, transition, setAssignments, applicablePolicies, acceptPolicy, assertProjectAccess, page };
