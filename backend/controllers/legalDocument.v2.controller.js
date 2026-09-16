const mongoose = require('mongoose');
const LegalDocument = require('../models/law/LegalDocument.v2');
const LegalDocumentVersion = require('../models/law/LegalDocumentVersion.v2');
const LegalAuditLog = require('../models/law/LegalAuditLog');
const logger = require('../utils/logger');
const { hasProjectAccess } = require('../middlewares/project.middleware');
const { uploadBufferToCloudinary } = require('../utils/cloudinaryUpload');
const { extractTextFromFile } = require('../utils/extractDocumentText');

const VALID_TYPES = new Set(['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other']);
const VALID_STATUSES = new Set(['Draft', 'Pending', 'Approved', 'Rejected']);
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High', 'Critical']);
const VALID_SCOPES = new Set(['project', 'company']);
const VALID_SOURCE_TYPES = new Set(['blank', 'template', 'upload']);
const VALID_CONFIDENTIALITY = new Set(['Internal', 'Confidential', 'Restricted']);

const normalizePagination = (value, fallback, max) => {
  const parsed = parseInt(value, 10);
  if (Number.isNaN(parsed)) return fallback;
  return Math.min(Math.max(parsed, 1), max);
};

const ensureObjectId = (value, label) => {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) {
    const error = new Error(`Valid ${label} is required`);
    error.statusCode = 400;
    throw error;
  }
};

const isRealObjectId = (value) => {
  const raw = String(value || '').trim();
  return raw && raw !== 'all' && !raw.startsWith('virtual-') && mongoose.Types.ObjectId.isValid(raw);
};

const ensureProjectAccess = (req, projectId) => {
  if (projectId && !hasProjectAccess(req.user, projectId)) {
    const error = new Error('No access to requested project');
    error.statusCode = 403;
    throw error;
  }
};

const parseOptionalDate = (value) => {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const parseTags = (value) => {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 20);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) return parseTags(parsed);
  } catch {
    // Fall through to comma-separated parsing.
  }
  return String(value).split(',').map((item) => item.trim()).filter(Boolean).slice(0, 20);
};

const parseString = (value, max = 1000) => String(value || '').trim().slice(0, max);

// Uploads every attached file to Cloudinary (raw resource) instead of
// storing it as a Buffer inside the document — attachments were previously
// write-only (every list/detail query explicitly excludes `.data`, so there
// was no way to actually retrieve one); Cloudinary gives each attachment a
// real, servable URL.
const attachmentFromRequest = async (req) => {
  const files = [];
  if (req.file) files.push({ file: req.file, purpose: 'source' });
  const sourceFiles = Array.isArray(req.files?.sourceFile) ? req.files.sourceFile : [];
  const legacyFiles = Array.isArray(req.files?.attachment) ? req.files.attachment : [];
  const supportingFiles = Array.isArray(req.files?.attachments) ? req.files.attachments : [];
  sourceFiles.forEach((file) => files.push({ file, purpose: 'source' }));
  legacyFiles.forEach((file) => files.push({ file, purpose: 'source' }));
  supportingFiles.forEach((file) => files.push({ file, purpose: 'supporting' }));
  return Promise.all(files.map(async ({ file, purpose }) => {
    const uploaded = await uploadBufferToCloudinary(file, {
      folder: `legal-documents/${req.body?.projectId || 'company'}`,
    });
    return {
      originalFileName: file.originalname || 'attachment',
      mimeType: file.mimetype || '',
      fileSize: file.size || 0,
      purpose,
      url: uploaded.url,
      publicId: uploaded.publicId || '',
      storageProvider: uploaded.provider,
      uploadedBy: req.user?._id || req.user?.id,
      uploadedAt: new Date(),
    };
  }));
};

const actorFrom = (req) => ({
  id: req.user?._id || req.user?.id,
  role: req.user?.role || 'unknown',
  name:
    [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim() ||
    req.user?.name ||
    req.user?.email ||
    'Unknown',
});

const audit = async (req, documentId, action, remarks = '', metadata = {}) => {
  const actor = actorFrom(req);
  if (!actor.id) return;
  await LegalAuditLog.create({
    documentId,
    action,
    performedBy: actor.id,
    role: actor.role,
    remarks,
    metadata,
    timestamp: new Date(),
  });
};

const emit = (req, event, payload) => {
  const io = req.app?.get('io');
  if (io) io.emit(event, payload);
};

const bumpVersion = (doc, major = false) => {
  if (major) {
    return { versionMajor: doc.versionMajor + 1, versionMinor: 0, currentVersion: `v${doc.versionMajor + 1}.0` };
  }
  return { versionMajor: doc.versionMajor, versionMinor: doc.versionMinor + 1, currentVersion: `v${doc.versionMajor}.${doc.versionMinor + 1}` };
};

const snapshot = async (doc, req, changeSummary) => {
  const actor = actorFrom(req);
  return LegalDocumentVersion.create({
    documentId: doc._id,
    version: doc.currentVersion,
    content: doc.latestContent && String(doc.latestContent).trim() ? doc.latestContent : '<p><br></p>',
    editedBy: actor.id,
    editedByName: actor.name,
    changeSummary: changeSummary || 'Document saved',
    statusAtTime: doc.status,
  });
};

const documentNumberPrefix = { Contract: 'CON', Agreement: 'AGR', Policy: 'POL', NDA: 'NDA', Compliance: 'CMP', IP: 'IP', Dispute: 'DIS', Other: 'GEN' };

const generateDocumentNumber = async (type) => {
  const prefix = documentNumberPrefix[type] || 'GEN';
  const year = new Date().getFullYear();
  const count = await LegalDocument.countDocuments({ documentNumber: new RegExp(`^LEG-${prefix}-${year}-`) });
  const seq = String(count + 1).padStart(3, '0');
  return `LEG-${prefix}-${year}-${seq}`;
};

const listFilter = (query, base = {}) => {
  const { status, type, priority, projectId, scope, search } = query;
  const filter = { ...base, deletedAt: null };
  if (status && VALID_STATUSES.has(status)) filter.status = status;
  if (type && VALID_TYPES.has(type)) filter.type = type;
  if (priority && VALID_PRIORITIES.has(priority)) filter.priority = priority;
  if (isRealObjectId(projectId)) {
    filter.projectId = projectId;
  } else if (scope === 'company') {
    filter.$or = [{ projectId: { $exists: false } }, { projectId: null }];
  } else if (scope === 'project') {
    filter.projectId = { $exists: true, $ne: null };
  }
  if (query.archived === 'true') filter.isArchived = true;
  else if (!base.isArchived) filter.isArchived = { $ne: true };
  if (search) filter.$text = { $search: search };
  return filter;
};

const sortFor = (value, fallback = 'updated-desc') => {
  const map = {
    'updated-asc': { updatedAt: 1 },
    'title-asc': { title: 1 },
    'title-desc': { title: -1 },
    'created-desc': { createdAt: -1 },
    'priority-desc': { priority: -1, updatedAt: -1 },
    'approved-desc': { approvedAt: -1 },
    'submitted-desc': { submittedAt: -1 },
    'updated-desc': { updatedAt: -1 },
  };
  return map[value] || map[fallback] || map['updated-desc'];
};

const listDocuments = async (req, res, baseFilter = {}, defaultSort = 'updated-desc', omitContent = false) => {
  const { page = 1, limit = 50, sort } = req.query;
  const normalizedPage = normalizePagination(page, 1, 1000000);
  const normalizedLimit = normalizePagination(limit, 50, 100);
  const skip = (normalizedPage - 1) * normalizedLimit;
  if (req.query.projectId) ensureProjectAccess(req, req.query.projectId);
  const filter = listFilter(req.query, baseFilter);
  let query = LegalDocument.find(filter);
  query = query.select(`${omitContent ? '-latestContent ' : ''}-attachments.data`);
  const [items, total] = await Promise.all([
    query.sort(sortFor(sort, defaultSort)).skip(skip).limit(normalizedLimit).lean(),
    LegalDocument.countDocuments(filter),
  ]);
  return res.json({ success: true, data: { items, total, page: normalizedPage, limit: normalizedLimit } });
};

exports.create = async (req, res) => {
  try {
    const {
      title,
      documentNumber,
      description,
      type,
      category,
      scope,
      projectId,
      projectName,
      content,
      priority,
      tags,
      owner,
      ownerId,
      assignedTo,
      assignedToId,
      legalTeam,
      sourceType,
      templateId,
      templateName,
      internalNotes,
      confidentiality,
    } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: 'Title is required' });
    const normalizedScope = VALID_SCOPES.has(scope) ? scope : (projectId ? 'project' : 'company');
    if (normalizedScope === 'project' && !projectId) return res.status(400).json({ success: false, error: 'Project is required for project documents' });
    if (projectId) ensureObjectId(projectId, 'projectId');
    ensureProjectAccess(req, projectId);
    if (ownerId) ensureObjectId(ownerId, 'ownerId');
    if (assignedToId) ensureObjectId(assignedToId, 'assignedToId');
    const effectiveDate = parseOptionalDate(req.body.effectiveDate);
    const expiryDate = parseOptionalDate(req.body.expiryDate);
    const reviewDate = parseOptionalDate(req.body.reviewDate);
    const signedDate = parseOptionalDate(req.body.signedDate);
    if (effectiveDate && expiryDate && expiryDate < effectiveDate) {
      return res.status(400).json({ success: false, error: 'Expiry date must be after effective date' });
    }
    const actor = actorFrom(req);
    const resolvedType = VALID_TYPES.has(type) ? type : 'Other';
    const trimmedDocNumber = parseString(documentNumber, 80);
    const finalDocumentNumber = trimmedDocNumber || await generateDocumentNumber(resolvedType);
    const normalizedSourceType = VALID_SOURCE_TYPES.has(sourceType) ? sourceType : 'blank';
    // "Upload" source: pull the document straight into the editor instead of
    // leaving it blank — extraction runs on whichever file is the primary
    // upload, independent of where that file ends up being stored.
    const sourceFile = req.file || (Array.isArray(req.files?.sourceFile) ? req.files.sourceFile[0] : null);
    const extractedContent = normalizedSourceType === 'upload' && sourceFile
      ? await extractTextFromFile(sourceFile)
      : '';
    const uploadedAttachments = await attachmentFromRequest(req);
    const doc = await LegalDocument.create({
      title: parseString(title, 180),
      documentNumber: finalDocumentNumber,
      description: parseString(description, 1000),
      type: VALID_TYPES.has(type) ? type : 'Other',
      category: parseString(category, 80),
      scope: normalizedScope,
      projectId: normalizedScope === 'project' ? projectId : undefined,
      projectName: normalizedScope === 'project' && projectName ? parseString(projectName, 160) : '',
      owner: owner ? parseString(owner, 160) : actor.name,
      ownerId: ownerId || actor.id,
      assignedTo: parseString(assignedTo, 160),
      assignedToId: assignedToId || undefined,
      legalTeam: parseString(legalTeam, 120),
      latestContent: extractedContent || content || '',
      sourceType: normalizedSourceType,
      templateId: parseString(templateId, 80),
      templateName: parseString(templateName, 120),
      currentVersion: 'v1.0',
      versionMajor: 1,
      versionMinor: 0,
      status: 'Draft',
      isLocked: false,
      isPublished: false,
      createdBy: actor.id,
      createdByName: actor.name,
      priority: VALID_PRIORITIES.has(priority) ? priority : 'Medium',
      tags: parseTags(tags),
      internalNotes: parseString(internalNotes, 2000),
      confidentiality: VALID_CONFIDENTIALITY.has(confidentiality) ? confidentiality : 'Internal',
      effectiveDate,
      expiryDate,
      reviewDate,
      signedDate,
      attachments: uploadedAttachments,
    });
    await snapshot(doc, req, 'Document created');
    await audit(req, doc._id, 'CREATE', 'Document created', { title: doc.title, type: doc.type, projectId: doc.projectId || null });
    emit(req, 'legal:document:created', { documentId: doc._id, title: doc.title, createdBy: actor.name, status: doc.status });
    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.create failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.myDocuments = async (req, res) => {
  try {
    return await listDocuments(req, res, { createdBy: req.user._id }, 'updated-desc', false);
  } catch (err) {
    logger.error({ err }, 'legalDocument.myDocuments failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// Every document tagged to a project, regardless of who created it — unlike
// myDocuments (creator-scoped), this is what a project-scoped workspace view
// should read from so teammates see each other's documents for the project.
exports.forProject = async (req, res) => {
  try {
    ensureObjectId(req.query.projectId, 'projectId');
    ensureProjectAccess(req, req.query.projectId);
    return await listDocuments(req, res, {}, 'updated-desc', false);
  } catch (err) {
    logger.error({ err }, 'legalDocument.forProject failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.getPending = async (req, res) => {
  try {
    return await listDocuments(req, res, { status: 'Pending' }, 'submitted-desc', false);
  } catch (err) {
    logger.error({ err }, 'legalDocument.getPending failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.getApproved = async (req, res) => {
  try {
    return await listDocuments(req, res, { status: 'Approved', isPublished: true }, 'approved-desc', true);
  } catch (err) {
    logger.error({ err }, 'legalDocument.getApproved failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.getAll = async (req, res) => {
  try {
    return await listDocuments(req, res, {}, 'updated-desc', true);
  } catch (err) {
    logger.error({ err }, 'legalDocument.getAll failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.getById = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getById failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.autoSave = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked' });
    if (req.body.content !== undefined) doc.latestContent = req.body.content;
    if (req.body.title !== undefined) doc.title = String(req.body.title).trim();
    if (req.body.type !== undefined) doc.type = VALID_TYPES.has(req.body.type) ? req.body.type : doc.type;
    if (req.body.projectId !== undefined && req.body.projectId) {
      ensureObjectId(req.body.projectId, 'projectId');
      ensureProjectAccess(req, req.body.projectId);
      doc.projectId = req.body.projectId;
    }
    if (req.body.projectName !== undefined) doc.projectName = String(req.body.projectName || '').trim();
    if (req.body.owner !== undefined) doc.owner = String(req.body.owner || '').trim();
    await doc.save();
    return res.json({ success: true, data: { savedAt: doc.updatedAt } });
  } catch (err) {
    logger.error({ err }, 'legalDocument.autoSave failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.saveDraft = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked' });
    const { title, type, content, projectId, projectName, owner, priority, tags, changeSummary } = req.body;
    if (title !== undefined) doc.title = String(title).trim();
    if (type !== undefined) doc.type = VALID_TYPES.has(type) ? type : doc.type;
    if (content !== undefined) doc.latestContent = content;
    if (projectId !== undefined && projectId) {
      ensureObjectId(projectId, 'projectId');
      ensureProjectAccess(req, projectId);
      doc.projectId = projectId;
    }
    if (projectName !== undefined) doc.projectName = String(projectName || '').trim();
    if (owner !== undefined) doc.owner = String(owner || '').trim();
    if (priority !== undefined) doc.priority = VALID_PRIORITIES.has(priority) ? priority : doc.priority;
    if (tags !== undefined) doc.tags = Array.isArray(tags) ? tags : [];
    Object.assign(doc, bumpVersion(doc, false));
    await doc.save();
    await snapshot(doc, req, changeSummary || 'Draft saved');
    await audit(req, doc._id, 'UPDATE', changeSummary || 'Draft saved', { version: doc.currentVersion });
    emit(req, 'legal:document:updated', { documentId: doc._id, title: doc.title, version: doc.currentVersion, status: doc.status });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.saveDraft failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.submit = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked' });
    if (!['Draft', 'Rejected'].includes(doc.status)) return res.status(400).json({ success: false, error: `Cannot submit a document with status: ${doc.status}` });
    if (req.body.content !== undefined) doc.latestContent = req.body.content;
    if (!doc.latestContent || !String(doc.latestContent).trim()) return res.status(400).json({ success: false, error: 'Content required before submission' });
    Object.assign(doc, bumpVersion(doc, doc.status === 'Rejected'));
    const actor = actorFrom(req);
    doc.status = 'Approved';
    doc.isLocked = true;
    doc.isPublished = true;
    doc.submittedAt = new Date();
    doc.approvedBy = actor.id;
    doc.approvedByName = actor.name;
    doc.approvedAt = new Date();
    doc.rejectedAt = null;
    doc.ceoRemarks = '';
    await doc.save();
    await snapshot(doc, req, 'Finalized document');
    await audit(req, doc._id, 'SUBMIT', 'Finalized document', { version: doc.currentVersion });
    emit(req, 'legal:document:approved', { documentId: doc._id, title: doc.title, approvedBy: actor.name });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.submit failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// Records whether the project's client (Project.client — no separate customer
// registry) has acknowledged this document. Only meaningful for project-linked
// documents, since the client identity lives on the Project record.
exports.setCustomerAgreement = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    if (!doc.projectId) return res.status(400).json({ success: false, error: 'Customer agreement requires a project-linked document' });
    const agreed = Boolean(req.body.agreed);
    const actor = actorFrom(req);
    doc.customerAgreement = {
      agreed,
      agreedAt: agreed ? new Date() : null,
      recordedBy: actor.id,
      recordedByName: actor.name,
      notes: parseString(req.body.notes, 500),
    };
    await doc.save();
    await audit(req, doc._id, agreed ? 'CUSTOMER_AGREED' : 'CUSTOMER_AGREEMENT_CLEARED', req.body.notes || '', {});
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.setCustomerAgreement failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    if (doc.status !== 'Pending') return res.status(400).json({ success: false, error: 'Only pending documents can be approved' });
    const actor = actorFrom(req);
    doc.status = 'Approved';
    doc.isLocked = true;
    doc.isPublished = true;
    doc.approvedBy = actor.id;
    doc.approvedByName = actor.name;
    doc.approvedAt = new Date();
    doc.rejectedAt = null;
    doc.ceoRemarks = req.body.remarks || '';
    await doc.save();
    await audit(req, doc._id, 'APPROVE', req.body.remarks || 'Approved', { version: doc.currentVersion });
    emit(req, 'legal:document:approved', { documentId: doc._id, title: doc.title, approvedBy: actor.name });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.approve failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.reject = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const remarks = String(req.body.remarks || '').trim();
    if (!remarks) return res.status(400).json({ success: false, error: 'Rejection remarks are required' });
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    if (doc.status !== 'Pending') return res.status(400).json({ success: false, error: 'Only pending documents can be rejected' });
    doc.status = 'Rejected';
    doc.ceoRemarks = remarks;
    doc.rejectedAt = new Date();
    doc.approvedAt = null;
    doc.isLocked = false;
    doc.isPublished = false;
    await doc.save();
    await audit(req, doc._id, 'REJECT', remarks, { version: doc.currentVersion });
    emit(req, 'legal:document:rejected', { documentId: doc._id, title: doc.title, remarks });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.reject failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.getVersions = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id).select('projectId').lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    const versions = await LegalDocumentVersion.find({ documentId: req.params.id }).sort({ createdAt: -1 }).lean();
    return res.json({ success: true, data: versions });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getVersions failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.getVersionById = async (req, res) => {
  try {
    ensureObjectId(req.params.versionId, 'version id');
    const version = await LegalDocumentVersion.findById(req.params.versionId).lean();
    if (!version) return res.status(404).json({ success: false, error: 'Version not found' });
    const doc = await LegalDocument.findById(version.documentId).select('projectId').lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    return res.json({ success: true, data: version });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getVersionById failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.restoreVersion = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    ensureObjectId(req.params.versionId, 'version id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked and cannot be restored' });
    const version = await LegalDocumentVersion.findById(req.params.versionId);
    if (!version) return res.status(404).json({ success: false, error: 'Version not found' });
    if (String(version.documentId) !== String(doc._id)) return res.status(400).json({ success: false, error: 'Version does not belong to this document' });
    doc.latestContent = version.content;
    Object.assign(doc, bumpVersion(doc, false));
    await doc.save();
    await snapshot(doc, req, `Restored from ${version.version}`);
    await audit(req, doc._id, 'RESTORE', `Restored from ${version.version}`, { restoredFrom: version._id });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.restoreVersion failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// Soft delete — moves the document to Trash. Versions and audit history are
// preserved; only ADMIN/SUPER_ADMIN can permanently delete afterwards.
exports.deleteDocument = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Cannot delete an approved document' });
    if (doc.deletedAt) return res.status(400).json({ success: false, error: 'Document is already in trash' });
    const actor = actorFrom(req);
    doc.deletedAt = new Date();
    doc.deletedBy = actor.id;
    doc.deletedByName = actor.name;
    await doc.save();
    await audit(req, doc._id, 'DELETE', 'Moved to trash', { status: doc.status, version: doc.currentVersion });
    emit(req, 'legal:document:trashed', { documentId: doc._id, title: doc.title });
    return res.json({ success: true, message: 'Document moved to trash', data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.delete failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.getTrash = async (req, res) => {
  try {
    const filter = { deletedAt: { $ne: null } };
    const items = await LegalDocument.find(filter).select('-latestContent -attachments.data').sort({ deletedAt: -1 }).limit(200).lean();
    return res.json({ success: true, data: { items, total: items.length } });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getTrash failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.restoreFromTrash = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (!doc.deletedAt) return res.status(400).json({ success: false, error: 'Document is not in trash' });
    doc.deletedAt = null;
    doc.deletedBy = undefined;
    doc.deletedByName = '';
    await doc.save();
    await audit(req, doc._id, 'RESTORE', 'Restored from trash', { version: doc.currentVersion });
    emit(req, 'legal:document:restored', { documentId: doc._id, title: doc.title });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.restoreFromTrash failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

// Hard delete. Only reachable for documents already in trash — this is the
// last, irreversible step, so the route restricts it to ADMIN/SUPER_ADMIN.
exports.permanentDelete = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (!doc.deletedAt) return res.status(400).json({ success: false, error: 'Only trashed documents can be permanently deleted' });
    await audit(req, doc._id, 'DELETE', 'Permanently deleted', { status: doc.status, version: doc.currentVersion });
    await LegalDocumentVersion.deleteMany({ documentId: doc._id });
    await doc.deleteOne();
    return res.json({ success: true, message: 'Document permanently deleted' });
  } catch (err) {
    logger.error({ err }, 'legalDocument.permanentDelete failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.archiveDocument = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.deletedAt) return res.status(400).json({ success: false, error: 'Cannot archive a trashed document' });
    if (doc.isArchived) return res.status(400).json({ success: false, error: 'Document is already archived' });
    const actor = actorFrom(req);
    doc.isArchived = true;
    doc.archivedAt = new Date();
    doc.archivedBy = actor.id;
    doc.archivedByName = actor.name;
    await doc.save();
    await audit(req, doc._id, 'ARCHIVE', 'Document archived', { version: doc.currentVersion });
    emit(req, 'legal:document:archived', { documentId: doc._id, title: doc.title });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.archiveDocument failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.restoreFromArchive = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (!doc.isArchived) return res.status(400).json({ success: false, error: 'Document is not archived' });
    doc.isArchived = false;
    doc.archivedAt = null;
    doc.archivedBy = undefined;
    doc.archivedByName = '';
    await doc.save();
    await audit(req, doc._id, 'RESTORE', 'Restored from archive', { version: doc.currentVersion });
    emit(req, 'legal:document:unarchived', { documentId: doc._id, title: doc.title });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.restoreFromArchive failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.generatePdf = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    ensureProjectAccess(req, doc.projectId);
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${doc.title || 'Legal Document'}</title><style>body{font-family:"Times New Roman",serif;margin:0;padding:0;color:#1a1a1a}.header{border-bottom:2px solid #333;padding-bottom:4mm;margin-bottom:8mm}h1{font-size:18pt;font-weight:700;margin:0}.meta{font-size:9pt;color:#666;margin-top:2mm}.content{font-size:12pt;line-height:1.8}.content p{margin:0 0 4mm;text-align:justify}</style></head><body><div class="header"><h1>${doc.title || 'Legal Document'}</h1><div class="meta">Type: ${doc.type || 'Other'} | Version: ${doc.currentVersion || 'v1.0'} | Status: ${doc.status || 'Draft'}</div></div><main class="content">${doc.latestContent || '<p>No content available.</p>'}</main></body></html>`;
    let puppeteer;
    try {
      puppeteer = require('puppeteer');
    } catch {
      return res.status(500).json({ success: false, error: 'PDF generation requires puppeteer to be installed' });
    }
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    try {
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'load' });
      const pdfBytes = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '25mm', bottom: '20mm', left: '25mm' } });
      await audit(req, doc._id, 'PDF_GENERATE', 'PDF generated', { version: doc.currentVersion });
      const safeTitle = String(doc.title || 'legal-document').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'legal-document';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-${doc.currentVersion || 'v1-0'}.pdf"`);
      return res.send(Buffer.from(pdfBytes));
    } finally {
      await browser.close();
    }
  } catch (err) {
    logger.error({ err }, 'legalDocument.generatePdf failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};
