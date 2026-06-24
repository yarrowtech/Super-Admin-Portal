const mongoose = require('mongoose');
const LegalDocument = require('../models/law/LegalDocument.v2');
const LegalDocumentVersion = require('../models/law/LegalDocumentVersion.v2');
const LegalAuditLog = require('../models/law/LegalAuditLog');
const logger = require('../utils/logger');

const VALID_TYPES = new Set(['Contract', 'Agreement', 'Policy', 'NDA', 'Compliance', 'IP', 'Dispute', 'Other']);
const VALID_STATUSES = new Set(['Draft', 'Pending', 'Approved', 'Rejected']);
const VALID_PRIORITIES = new Set(['Low', 'Medium', 'High', 'Critical']);

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

const listFilter = (query, base = {}) => {
  const { status, type, priority, projectId, scope, search } = query;
  const filter = { ...base };
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
  if (search) filter.$text = { $search: search };
  return filter;
};

const sortFor = (value, fallback = 'updated-desc') => {
  const map = {
    'updated-asc': { updatedAt: 1 },
    'title-asc': { title: 1 },
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
  const filter = listFilter(req.query, baseFilter);
  let query = LegalDocument.find(filter);
  if (omitContent) query = query.select('-latestContent');
  const [items, total] = await Promise.all([
    query.sort(sortFor(sort, defaultSort)).skip(skip).limit(normalizedLimit).lean(),
    LegalDocument.countDocuments(filter),
  ]);
  return res.json({ success: true, data: { items, total, page: normalizedPage, limit: normalizedLimit } });
};

exports.create = async (req, res) => {
  try {
    const { title, type, projectId, projectName, content, priority, tags, owner } = req.body;
    if (!title || !String(title).trim()) return res.status(400).json({ success: false, error: 'Title is required' });
    if (projectId) ensureObjectId(projectId, 'projectId');
    const actor = actorFrom(req);
    const doc = await LegalDocument.create({
      title: String(title).trim(),
      type: VALID_TYPES.has(type) ? type : 'Other',
      projectId: projectId || undefined,
      projectName: projectName ? String(projectName).trim() : '',
      owner: owner ? String(owner).trim() : actor.name,
      latestContent: content || '',
      currentVersion: 'v1.0',
      versionMajor: 1,
      versionMinor: 0,
      status: 'Draft',
      isLocked: false,
      isPublished: false,
      createdBy: actor.id,
      createdByName: actor.name,
      priority: VALID_PRIORITIES.has(priority) ? priority : 'Medium',
      tags: Array.isArray(tags) ? tags : [],
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
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked' });
    if (req.body.content !== undefined) doc.latestContent = req.body.content;
    if (req.body.title !== undefined) doc.title = String(req.body.title).trim();
    if (req.body.type !== undefined) doc.type = VALID_TYPES.has(req.body.type) ? req.body.type : doc.type;
    if (req.body.projectId !== undefined && req.body.projectId) {
      ensureObjectId(req.body.projectId, 'projectId');
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
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked' });
    const { title, type, content, projectId, projectName, owner, priority, tags, changeSummary } = req.body;
    if (title !== undefined) doc.title = String(title).trim();
    if (type !== undefined) doc.type = VALID_TYPES.has(type) ? type : doc.type;
    if (content !== undefined) doc.latestContent = content;
    if (projectId !== undefined && projectId) {
      ensureObjectId(projectId, 'projectId');
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
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked' });
    if (!['Draft', 'Rejected'].includes(doc.status)) return res.status(400).json({ success: false, error: `Cannot submit a document with status: ${doc.status}` });
    if (req.body.content !== undefined) doc.latestContent = req.body.content;
    if (!doc.latestContent || !String(doc.latestContent).trim()) return res.status(400).json({ success: false, error: 'Content required before submission' });
    Object.assign(doc, bumpVersion(doc, doc.status === 'Rejected'));
    doc.status = 'Pending';
    doc.submittedAt = new Date();
    doc.approvedAt = null;
    doc.rejectedAt = null;
    doc.ceoRemarks = '';
    await doc.save();
    await snapshot(doc, req, 'Submitted to CEO for approval');
    await audit(req, doc._id, 'SUBMIT', 'Submitted to CEO for approval', { version: doc.currentVersion });
    emit(req, 'legal:document:submitted', { documentId: doc._id, title: doc.title, status: doc.status });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.submit failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.approve = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
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

exports.deleteDocument = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Cannot delete an approved document' });
    await audit(req, doc._id, 'DELETE', 'Document deleted', { status: doc.status, version: doc.currentVersion });
    await LegalDocumentVersion.deleteMany({ documentId: doc._id });
    await doc.deleteOne();
    return res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    logger.error({ err }, 'legalDocument.delete failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};

exports.generatePdf = async (req, res) => {
  try {
    ensureObjectId(req.params.id, 'document id');
    const doc = await LegalDocument.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${doc.title || 'Legal Document'}</title><style>body{font-family:"Times New Roman",serif;margin:0;padding:32px;color:#111}.page{max-width:900px;margin:auto}.content{font-size:12pt;line-height:1.7}</style></head><body><div class="page"><h1>${doc.title || 'Legal Document'}</h1><div>Type: ${doc.type || 'Other'} | Version: ${doc.currentVersion || 'v1.0'} | Status: ${doc.status || 'Draft'}</div><hr><main class="content">${doc.latestContent || '<p>No content available.</p>'}</main></div></body></html>`;
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
      const pdfBuffer = await page.pdf({ format: 'A4', printBackground: true, margin: { top: '20mm', right: '16mm', bottom: '20mm', left: '16mm' } });
      await audit(req, doc._id, 'PDF_GENERATE', 'PDF generated', { version: doc.currentVersion });
      const safeTitle = String(doc.title || 'legal-document').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'legal-document';
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${safeTitle}-${doc.currentVersion || 'v1-0'}.pdf"`);
      return res.send(pdfBuffer);
    } finally {
      await browser.close();
    }
  } catch (err) {
    logger.error({ err }, 'legalDocument.generatePdf failed');
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};
