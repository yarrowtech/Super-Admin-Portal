const crypto = require('crypto');
const mongoose = require('mongoose');
const Policy = require('../models/policy/Policy');
const PolicyVersion = require('../models/policy/PolicyVersion');
const PolicySection = require('../models/policy/PolicySection');
const PolicyProjectAssignment = require('../models/policy/PolicyProjectAssignment');
const PolicyAcceptance = require('../models/policy/PolicyAcceptance');
const PolicyAuditLog = require('../models/policy/PolicyAuditLog');
const PolicyDocument = require('../models/policy/PolicyDocument');
const ApiClient = require('../models/policy/ApiClient');
const ApiClientScope = require('../models/policy/ApiClientScope');
const Project = require('../models/common/Project');
const User = require('../models/auth/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const jwtConfig = require('../config/jwt');

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
const EFNBMMS_CODE = 'EFNBMMS';
const EFNBMMS_NAME = 'EFNBMMS';
const assignmentIds = (user) => (Array.isArray(user?.assignedProjects) ? user.assignedProjects : [])
  .map((x) => x?.projectId || x).map(String).filter(mongoose.Types.ObjectId.isValid);

async function assertProjectAccess(user, projectId) {
  const id = objectId(projectId, 'PROJECT_NOT_FOUND');
  const project = await Project.findOne({ _id: id, archivedAt: null }).select('_id').lean();
  if (!project) throw err('PROJECT_NOT_FOUND', 404, 'Project not found');
  if (!privileged(user) && !assignmentIds(user).includes(String(id))) throw err('PROJECT_ACCESS_DENIED', 403, 'Project access denied');
  return id;
}
// Policy authoring (list/create) is a LAW-team-wide capability, not a
// per-project-assignment one — the route's policy.read/policy.create
// permission is the real authorization gate here, matching how the wider Law
// module already exposes the full project list to any LAW user. This only
// confirms the target project actually exists and is active.
async function assertProjectExists(projectId) {
  const id = objectId(projectId, 'PROJECT_NOT_FOUND');
  const project = await Project.findOne({ _id: id, archivedAt: null }).select('_id').lean();
  if (!project) throw err('PROJECT_NOT_FOUND', 404, 'Project not found');
  return id;
}
async function audit(actorId, action, policyId, metadata = {}, projectId = null, version = null) {
  return PolicyAuditLog.create({ actorId, action, entityType: 'Policy', entityId: String(policyId), policyId, projectId, version, metadata });
}
async function auditClient(client, action, resource, resourceId, requestId, result, metadata = {}) {
  return PolicyAuditLog.create({
    actorId: null,
    action,
    entityType: resource || 'PolicyApi',
    entityId: String(resourceId || client?._id || 'policy-api'),
    policyId: resource === 'Policy' && mongoose.Types.ObjectId.isValid(resourceId) ? resourceId : null,
    projectId: client?.projectId || null,
    metadata: { clientId: client?.clientId || null, requestId: requestId || null, result, ...metadata },
  });
}
async function sectionsFor(versionId) { return PolicySection.find({ policyVersionId: versionId, enabled: true }).sort({ order: 1 }).lean(); }
async function documentsFor(policyId, versionId) {
  const filter = { policyId };
  if (versionId) filter.versionId = versionId;
  return PolicyDocument.find(filter).sort({ uploadedAt: -1 }).lean();
}

async function getFallbackUserId() {
  const user = await User.findOne({ role: { $in: ['super_admin', 'admin', 'law_head'] }, isActive: true }).select('_id').lean()
    || await User.findOne({ isActive: true }).select('_id').lean();
  if (!user?._id) throw err('BOOTSTRAP_USER_REQUIRED', 500, 'Create an admin user before bootstrapping EFNBMMS policies');
  return user._id;
}

async function ensureEfnbmmsProject() {
  let project = await Project.findOne({ projectCode: EFNBMMS_CODE, archivedAt: null }).lean();
  if (project) return project;
  const managerId = await getFallbackUserId();
  project = await Project.create({
    name: EFNBMMS_NAME,
    projectCode: EFNBMMS_CODE,
    description: 'EFNBMMS policy management project',
    status: 'in-progress',
    priority: 'high',
    startDate: new Date(),
    projectManager: managerId,
    createdBy: managerId,
    updatedBy: managerId,
  });
  return project.toObject();
}

const normalizeStatus = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (raw === 'ACTIVE' || raw === 'READY') return raw === 'ACTIVE' ? 'PUBLISHED' : 'APPROVED';
  return ['DRAFT', 'IN_REVIEW', 'APPROVED', 'PUBLISHED', 'ARCHIVED'].includes(raw) ? raw : 'DRAFT';
};
const normalizeType = (value) => {
  const raw = String(value || '').trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  const aliases = { PRIVACY: 'PRIVACY_POLICY', PRIVACY_POLICY: 'PRIVACY_POLICY', DATA_PROTECTION_POLICY: 'DATA_PRIVACY_POLICY' };
  return Policy.POLICY_TYPES.includes(aliases[raw] || raw) ? (aliases[raw] || raw) : 'OTHER';
};
const normalizePriority = (value) => {
  const raw = String(value || '').trim().toUpperCase();
  return Policy.POLICY_PRIORITIES.includes(raw) ? raw : 'MEDIUM';
};
const mapPolicy = async (policy) => {
  const plain = policy?.toObject ? policy.toObject() : policy;
  if (!plain) return null;
  const version = plain.currentVersionId ? await PolicyVersion.findById(plain.currentVersionId).lean() : null;
  const sections = version ? await sectionsFor(version._id) : [];
  const docs = await documentsFor(plain._id, version?._id);
  return {
    ...plain,
    currentVersion: version ? { ...version, sections } : null,
    sections,
    documents: docs,
    policy_type: plain.type,
    review_date: plain.reviewDate,
    effective_from: plain.effectiveDate,
    effective_until: plain.expirationDate,
  };
};

// Admin policy listing is owned-by-project, not the assignment/sharing model
// (that's applicablePolicies, for the consumer-acceptance flow). No project
// selected means no results — the caller is responsible for showing a
// "select a project" state rather than silently defaulting to EFNBMMS.
async function listPolicies(query, user) {
  const { page: currentPage, limit } = page(query);
  const filter = { deletedAt: null };
  if (!query.projectId) return { items: [], pagination: { page: currentPage, limit, total: 0, totalPages: 1 } };
  filter.projectId = await assertProjectExists(query.projectId);
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  if (query.priority) filter.priority = query.priority;
  if (query.search) filter.$text = { $search: String(query.search).slice(0, 100) };
  const sortBy = ['updatedAt', 'createdAt', 'title', 'effectiveDate', 'priority'].includes(query.sortBy) ? query.sortBy : 'updatedAt';
  const sort = { [sortBy]: String(query.sortOrder).toLowerCase() === 'asc' ? 1 : -1 };
  const [rows, total] = await Promise.all([Policy.find(filter).sort(sort).skip((currentPage - 1) * limit).limit(limit).lean(), Policy.countDocuments(filter)]);
  const items = await Promise.all(rows.map(mapPolicy));
  return { items, pagination: { page: currentPage, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}
async function getPolicy(id) {
  const policy = await Policy.findOne({ _id: objectId(id), deletedAt: null }).lean();
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  const [mapped, assignments] = await Promise.all([mapPolicy(policy), PolicyProjectAssignment.find({ policyId: policy._id }).lean()]);
  return { ...mapped, assignments };
}
async function createPolicy(payload, actorId, user) {
  if (!payload.projectId) throw err('VALIDATION_ERROR', 400, 'projectId is required');
  const project = { _id: await assertProjectExists(payload.projectId) };
  const scope = payload.scope || 'SINGLE_PROJECT';
  if (!['GLOBAL', 'SINGLE_PROJECT', 'SELECTED_PROJECTS'].includes(scope)) throw err('VALIDATION_ERROR', 400, 'Invalid policy scope');
  const title = cleanText(payload.title);
  const policyCode = String(payload.policyCode || payload.code || title).trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '');
  if (!title || !policyCode) throw err('VALIDATION_ERROR', 400, 'Policy title and code are required');
  const session = await mongoose.startSession();
  try {
    let created;
    await session.withTransaction(async () => {
      const [policy] = await Policy.create([{
        projectId: project._id,
        policyCode,
        title,
        slug: slugify(payload.slug || title),
        type: normalizeType(payload.type || payload.policy_type || payload.policyType),
        category: cleanText(payload.category),
        description: cleanText(payload.description),
        scope,
        priority: normalizePriority(payload.priority),
        owner: cleanText(payload.owner),
        ownerId: payload.ownerId || null,
        requiresAcceptance: Boolean(payload.requiresAcceptance),
        requiresReAcceptance: Boolean(payload.requiresReAcceptance),
        effectiveDate: payload.effectiveDate || payload.effective_from || null,
        reviewDate: payload.reviewDate || payload.review_date || null,
        expirationDate: payload.expirationDate || payload.effective_until || null,
        createdBy: actorId,
        updatedBy: actorId,
      }], { session });
      const incoming = Array.isArray(payload.sections) ? payload.sections : [];
      const [version] = await PolicyVersion.create([{
        policyId: policy._id,
        versionNumber: 1,
        title,
        summary: cleanText(payload.summary || payload.description),
        changeSummary: cleanText(payload.changeSummary || 'Initial version'),
        content: cleanText(payload.content),
        effectiveDate: payload.effectiveDate || payload.effective_from || null,
        createdBy: actorId,
      }], { session });
      if (incoming.length) {
        await PolicySection.insertMany(incoming.slice(0, 100).map((section, index) => ({
          policyId: policy._id,
          policyVersionId: version._id,
          key: slugify(section.key || section.section_code || section.title || section.section_title),
          title: cleanText(section.title || section.section_title),
          content: cleanText(section.content || section.section_content),
          order: Number.isFinite(Number(section.order ?? section.display_order)) ? Number(section.order ?? section.display_order) : index,
          enabled: section.enabled !== false,
        })), { session });
      }
      policy.currentVersionId = version._id;
      policy.currentVersion = 1;
      await policy.save({ session });
      await PolicyProjectAssignment.updateOne({ policyId: policy._id, projectId: project._id }, { $set: { enabled: true, required: true }, $setOnInsert: { createdBy: actorId } }, { upsert: true, session });
      created = policy;
    });
    await audit(actorId, 'POLICY_CREATED', created._id, {}, project._id, 1);
    return mapPolicy(created);
  } finally {
    await session.endSession();
  }
}
async function updatePolicy(id, payload, actorId) {
  const policy = await Policy.findOne({ _id: objectId(id), deletedAt: null });
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  const allowed = ['title', 'description', 'type', 'category', 'priority', 'owner', 'ownerId', 'requiresAcceptance', 'requiresReAcceptance', 'effectiveDate', 'reviewDate', 'expirationDate'];
  allowed.forEach((key) => { if (payload[key] !== undefined) policy[key] = ['title', 'description', 'category', 'owner'].includes(key) ? cleanText(payload[key]) : payload[key]; });
  if (payload.policy_type !== undefined || payload.policyType !== undefined) policy.type = normalizeType(payload.policy_type || payload.policyType);
  if (payload.review_date !== undefined) policy.reviewDate = payload.review_date || null;
  if (payload.effective_from !== undefined) policy.effectiveDate = payload.effective_from || null;
  if (payload.effective_until !== undefined) policy.expirationDate = payload.effective_until || null;
  if (payload.priority !== undefined) policy.priority = normalizePriority(payload.priority);
  // Scope changes require assignment management and are deliberately excluded from generic PATCH.
  policy.updatedBy = actorId;
  await policy.save(); await audit(actorId, 'POLICY_UPDATED', policy._id, {}, policy.projectId); return mapPolicy(policy);
}
async function deletePolicy(id, actorId) {
  const policy = await Policy.findOne({ _id: objectId(id), deletedAt: null });
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  policy.deletedAt = new Date();
  policy.updatedBy = actorId;
  await policy.save();
  await audit(actorId, 'POLICY_DELETED', policy._id, {}, policy.projectId);
  return { id: policy._id };
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
  if (incoming.length) await PolicySection.insertMany(incoming.map((section, index) => ({ policyId: policy._id, policyVersionId: version._id, key: slugify(section.key || section.title), title: cleanText(section.title), content: cleanText(section.content), order: Number.isFinite(Number(section.order)) ? Number(section.order) : index, enabled: section.enabled !== false })));
  // A new draft must never replace the currently published version. For a
  // brand-new policy it is retained as a draft pointer solely for authoring.
  if (!policy.currentVersionId) { policy.currentVersionId = version._id; await policy.save(); }
  await audit(actorId, 'VERSION_CREATED', policy._id, {}, null, versionNumber); return version;
}
// DRAFT can go straight to PUBLISHED (skip review/approval for policies that
// don't need a formal review cycle) as well as through IN_REVIEW as usual.
const transitions = { DRAFT: ['IN_REVIEW', 'PUBLISHED'], IN_REVIEW: ['APPROVED'], APPROVED: ['PUBLISHED'], PUBLISHED: ['ARCHIVED'], ARCHIVED: [] };
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
    // PUBLISHED may come from either APPROVED (normal path) or DRAFT (skip-review path).
    const fromStatus = target === 'IN_REVIEW' ? ['DRAFT'] : target === 'APPROVED' ? ['IN_REVIEW'] : ['APPROVED', 'DRAFT'];
    version = await PolicyVersion.findOne({ policyId: policy._id, status: { $in: fromStatus } }).sort({ versionNumber: -1 });
    if (!version) throw err('INVALID_POLICY_STATE', 409, 'No version is available for this workflow transition');
    if (!transitions[version.status]?.includes(target)) throw err('INVALID_POLICY_STATE', 409, `Cannot transition version ${version.status} to ${target}`);
    if (target === 'PUBLISHED' && !String(version.content || '').trim() && !(await PolicySection.exists({ policyVersionId: version._id, enabled: true }))) {
      throw err('VALIDATION_ERROR', 400, 'A policy version needs content or at least one enabled section before publishing');
    }
    if (target === 'PUBLISHED' && version.effectiveDate && version.effectiveDate > new Date()) throw err('INVALID_POLICY_STATE', 409, 'Version is not yet effective');
    if (target === 'PUBLISHED') {
      await PolicyVersion.updateMany({ policyId: policy._id, status: 'PUBLISHED', _id: { $ne: version._id } }, { $set: { status: 'ARCHIVED' } });
      version.publishedAt = new Date(); version.publishedBy = actorId; policy.currentVersionId = version._id; policy.currentVersion = version.versionNumber; policy.status = 'PUBLISHED'; policy.publishedAt = version.publishedAt;
    } else if (policy.status !== 'PUBLISHED') {
      policy.status = target;
    }
    version.status = target; await version.save(); policy.updatedBy = actorId; await policy.save();
  }
  const action = target === 'IN_REVIEW' ? 'REVIEW_SUBMITTED' : target === 'APPROVED' ? 'POLICY_APPROVED' : target === 'PUBLISHED' ? 'POLICY_PUBLISHED' : 'POLICY_ARCHIVED';
  await audit(actorId, action, policy._id, {}, policy.projectId, version?.versionNumber || null); return mapPolicy(policy);
}

async function replaceSections(policyId, payload, actorId) {
  const policy = await Policy.findOne({ _id: objectId(policyId), deletedAt: null });
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  let version = await PolicyVersion.findOne({ policyId: policy._id, status: { $in: ['DRAFT', 'IN_REVIEW', 'APPROVED'] } }).sort({ versionNumber: -1 });
  if (!version) version = await createVersion(policy._id, { title: policy.title, content: '', changeSummary: payload.changeSummary || 'Section update' }, actorId);
  const versionId = version._id || version.id;
  await PolicySection.deleteMany({ policyVersionId: versionId });
  const incoming = Array.isArray(payload.sections) ? payload.sections : [];
  if (incoming.length) await PolicySection.insertMany(incoming.slice(0, 100).map((section, index) => ({
    policyId: policy._id,
    policyVersionId: versionId,
    key: slugify(section.key || section.section_code || section.title || section.section_title),
    title: cleanText(section.title || section.section_title),
    content: cleanText(section.content || section.section_content),
    order: Number.isFinite(Number(section.order ?? section.display_order)) ? Number(section.order ?? section.display_order) : index,
    enabled: section.enabled !== false,
  })));
  await audit(actorId, 'POLICY_SECTIONS_UPDATED', policy._id, {}, policy.projectId, version.versionNumber);
  return mapPolicy(policy);
}

async function uploadDocuments(policyId, files, actorId) {
  const policy = await Policy.findOne({ _id: objectId(policyId), deletedAt: null });
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Policy not found');
  if (!Array.isArray(files) || !files.length) throw err('VALIDATION_ERROR', 400, 'At least one document is required');
  const docs = await PolicyDocument.insertMany(files.map((file) => ({
    policyId: policy._id,
    versionId: policy.currentVersionId || null,
    fileName: file.originalname,
    storageReference: `data:${file.mimetype};base64,${file.buffer.toString('base64')}`,
    mimeType: file.mimetype,
    fileSize: file.size,
    uploadedBy: actorId,
    provider: 'inline',
  })));
  await audit(actorId, 'DOCUMENT_UPLOADED', policy._id, { count: docs.length }, policy.projectId, policy.currentVersion || null);
  return docs;
}

// Admin-facing API client management. `clientSecret` is only ever returned
// once, at creation/rotation time — only its bcrypt hash is ever persisted.
// A client is always scoped to exactly one project (defaults to EFNBMMS for
// backward compatibility), and the consumer API only ever returns that
// project's published policies to it — see listPublishedForClient.
async function listApiClients(query) {
  const { page: currentPage, limit } = page(query);
  const filter = {};
  if (query.projectId) filter.projectId = await assertProjectExists(query.projectId);
  const [rows, total] = await Promise.all([
    ApiClient.find(filter).sort({ createdAt: -1 }).skip((currentPage - 1) * limit).limit(limit).populate('projectId', 'name projectCode').lean(),
    ApiClient.countDocuments(filter),
  ]);
  const items = await Promise.all(rows.map(async (client) => ({
    ...client,
    project: client.projectId && typeof client.projectId === 'object' ? { id: client.projectId._id, name: client.projectId.name, projectCode: client.projectId.projectCode } : null,
    projectId: client.projectId && typeof client.projectId === 'object' ? client.projectId._id : client.projectId,
    scopes: await ApiClientScope.find({ clientId: client._id }).distinct('scope'),
  })));
  return { items, pagination: { page: currentPage, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function createApiClient(payload, actorId) {
  const projectId = payload.projectId ? await assertProjectExists(payload.projectId) : (await ensureEfnbmmsProject())._id;
  const scopes = Array.isArray(payload.scopes) && payload.scopes.length ? payload.scopes : ['policies:read'];
  const clientId = `client_${crypto.randomBytes(8).toString('hex')}`;
  const clientSecret = crypto.randomBytes(24).toString('base64url');
  const secretHash = await bcrypt.hash(clientSecret, 12);
  const label = cleanText(payload.label || payload.name || 'Unnamed consumer');
  const client = await ApiClient.create({
    projectId,
    clientId,
    secretHash,
    label,
    status: 'ACTIVE',
    expiresAt: payload.expiresAt || null,
  });
  await ApiClientScope.insertMany(scopes.map((scope) => ({ clientId: client._id, scope })));
  await auditClient(client, 'API_CLIENT_CREATED', 'ApiClient', client._id, null, 'success', { label, scopes });
  // clientSecret is returned once only; it is never retrievable again.
  return { id: client._id, clientId, clientSecret, scopes, status: client.status, label, projectId };
}

// Looked up by the public `clientId` string (e.g. "efnbmms_xxxx"), not the
// Mongo _id — that's what's shown in the admin UI and what a consumer quotes.
async function findApiClientOr404(clientId) {
  const client = await ApiClient.findOne({ clientId: String(clientId || '').trim() });
  if (!client) throw err('CLIENT_NOT_FOUND', 404, 'API client not found');
  return client;
}

async function updateApiClient(clientId, payload, actorId) {
  const client = await findApiClientOr404(clientId);
  if (payload.label !== undefined) client.label = cleanText(payload.label);
  await client.save();
  await auditClient(client, 'API_CLIENT_UPDATED', 'ApiClient', client._id, null, 'success', { actorId: String(actorId), label: client.label });
  return { id: client._id, clientId: client.clientId, label: client.label, status: client.status };
}

async function revokeApiClient(clientId, actorId) {
  const client = await findApiClientOr404(clientId);
  client.status = 'REVOKED';
  client.revokedAt = new Date();
  await client.save();
  await auditClient(client, 'API_CLIENT_REVOKED', 'ApiClient', client._id, null, 'success', { actorId: String(actorId) });
  return { id: client._id, status: client.status };
}

async function rotateApiClientSecret(clientId, actorId) {
  const client = await findApiClientOr404(clientId);
  const clientSecret = crypto.randomBytes(24).toString('base64url');
  client.secretHash = await bcrypt.hash(clientSecret, 12);
  client.status = 'ACTIVE';
  client.revokedAt = null;
  await client.save();
  await auditClient(client, 'API_CLIENT_SECRET_ROTATED', 'ApiClient', client._id, null, 'success', { actorId: String(actorId) });
  return { id: client._id, clientId: client.clientId, clientSecret };
}

async function deleteApiClient(clientId, actorId) {
  const client = await findApiClientOr404(clientId);
  await ApiClientScope.deleteMany({ clientId: client._id });
  await client.deleteOne();
  await auditClient(client, 'API_CLIENT_DELETED', 'ApiClient', client._id, null, 'success', { actorId: String(actorId) });
  return { id: client._id };
}

async function issueClientToken(payload, requestId) {
  const clientId = String(payload.client_id || payload.clientId || '').trim();
  const clientSecret = String(payload.client_secret || payload.clientSecret || '').trim();
  if (!clientId || !clientSecret) throw err('INVALID_CLIENT', 401, 'Invalid client credentials');
  const client = await ApiClient.findOne({ clientId }).select('+secretHash');
  if (!client || !(await bcrypt.compare(clientSecret, client.secretHash))) {
    await auditClient({ clientId }, 'UNAUTHORIZED_REQUEST', 'ApiClient', clientId, requestId, 'failure');
    throw err('INVALID_CLIENT', 401, 'Invalid client credentials');
  }
  if (client.status !== 'ACTIVE' || client.revokedAt || (client.expiresAt && client.expiresAt <= new Date())) {
    await auditClient(client, 'PERMISSION_FAILURE', 'ApiClient', client._id, requestId, 'failure');
    throw err('CLIENT_INACTIVE', 403, 'API client is not active');
  }
  const scopes = await ApiClientScope.find({ clientId: client._id }).distinct('scope');
  const scope = scopes.includes('policies:read') ? 'policies:read' : scopes.join(' ');
  if (!scope) throw err('MISSING_SCOPE', 403, 'API client has no scopes');
  const expiresIn = 3600;
  const accessToken = jwt.sign({ typ: 'policy_client', clientId: client._id, cid: client.clientId, projectId: client.projectId, scope }, jwtConfig.accessSecret, { expiresIn });
  client.lastUsedAt = new Date();
  await client.save();
  await auditClient(client, 'TOKEN_ISSUED', 'ApiClient', client._id, requestId, 'success', { scope });
  return { access_token: accessToken, token_type: 'Bearer', expires_in: expiresIn, scope };
}

async function verifyConsumerToken(token) {
  let decoded;
  try {
    decoded = jwt.verify(token, jwtConfig.accessSecret);
  } catch (e) {
    throw err(e.name === 'TokenExpiredError' ? 'TOKEN_EXPIRED' : 'INVALID_TOKEN', 401, 'Invalid or expired access token');
  }
  if (decoded.typ !== 'policy_client') throw err('INVALID_TOKEN', 401, 'Invalid access token');
  const client = await ApiClient.findById(decoded.clientId).lean();
  if (!client || client.status !== 'ACTIVE' || client.revokedAt || (client.expiresAt && client.expiresAt <= new Date())) throw err('CLIENT_INACTIVE', 403, 'API client is not active');
  const scopes = String(decoded.scope || '').split(/\s+/).filter(Boolean);
  if (!scopes.includes('policies:read')) throw err('MISSING_SCOPE', 403, 'Missing policies:read scope');
  const project = await Project.findOne({ _id: client.projectId, archivedAt: null }).lean();
  if (!project) throw err('PROJECT_INACTIVE', 403, 'Client project is not active');
  return { ...client, scopes };
}

async function listPublishedForClient(client, query = {}, requestId = null) {
  const { page: currentPage, limit } = page(query);
  const now = new Date();
  const filter = {
    projectId: client.projectId,
    deletedAt: null,
    status: 'PUBLISHED',
    $and: [{ $or: [{ effectiveDate: null }, { effectiveDate: { $lte: now } }] }, { $or: [{ expirationDate: null }, { expirationDate: { $gt: now } }] }],
  };
  const [rows, total] = await Promise.all([
    Policy.find(filter).sort({ publishedAt: -1, updatedAt: -1 }).skip((currentPage - 1) * limit).limit(limit).lean(),
    Policy.countDocuments(filter),
  ]);
  await auditClient(client, 'POLICY_API_ACCESSED', 'Policy', 'list', requestId, 'success');
  return { items: await Promise.all(rows.map(mapPolicy)), pagination: { page: currentPage, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
}

async function getPublishedForClient(client, selector, byCode = false, requestId = null) {
  const filter = { projectId: client.projectId, deletedAt: null, status: 'PUBLISHED' };
  if (byCode) filter.policyCode = String(selector || '').trim().toUpperCase();
  else filter._id = objectId(selector, 'POLICY_NOT_FOUND');
  const policy = await Policy.findOne(filter).lean();
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Published policy not found');
  await auditClient(client, 'POLICY_API_ACCESSED', 'Policy', policy._id, requestId, 'success');
  return mapPolicy(policy);
}

async function publishedVersionsForClient(client, policyId, query = {}, requestId = null) {
  const policy = await Policy.findOne({ _id: objectId(policyId, 'POLICY_NOT_FOUND'), projectId: client.projectId, deletedAt: null, status: 'PUBLISHED' }).select('_id').lean();
  if (!policy) throw err('POLICY_NOT_FOUND', 404, 'Published policy not found');
  const { page: currentPage, limit } = page(query);
  const [items, total] = await Promise.all([
    PolicyVersion.find({ policyId: policy._id, status: 'PUBLISHED' }).sort({ versionNumber: -1 }).skip((currentPage - 1) * limit).limit(limit).lean(),
    PolicyVersion.countDocuments({ policyId: policy._id, status: 'PUBLISHED' }),
  ]);
  await auditClient(client, 'POLICY_API_ACCESSED', 'PolicyVersion', policy._id, requestId, 'success');
  return { items, pagination: { page: currentPage, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
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
module.exports = {
  listPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  createVersion,
  replaceSections,
  uploadDocuments,
  transition,
  setAssignments,
  applicablePolicies,
  acceptPolicy,
  assertProjectAccess,
  ensureEfnbmmsProject,
  listApiClients,
  createApiClient,
  updateApiClient,
  revokeApiClient,
  rotateApiClientSecret,
  deleteApiClient,
  issueClientToken,
  verifyConsumerToken,
  listPublishedForClient,
  getPublishedForClient,
  publishedVersionsForClient,
  page,
};
