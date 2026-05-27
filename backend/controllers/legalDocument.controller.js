// backend/controllers/legalDocument.controller.js
const LegalDocument = require('../models/law/LegalDocument');
const LegalDocumentVersion = require('../models/law/LegalDocumentVersion');
const logger = require('../utils/logger');

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Bump version: minor increment by default, major on re-submit after rejection */
const bumpVersion = (doc, major = false) => {
  if (major) {
    return {
      versionMajor: doc.versionMajor + 1,
      versionMinor: 0,
      currentVersion: `v${doc.versionMajor + 1}.0`,
    };
  }
  return {
    versionMajor: doc.versionMajor,
    versionMinor: doc.versionMinor + 1,
    currentVersion: `v${doc.versionMajor}.${doc.versionMinor + 1}`,
  };
};

/** Create a version snapshot */
const createVersionSnapshot = async (doc, userId, userName, summary) => {
  return LegalDocumentVersion.create({
    documentId: doc._id,
    version: doc.currentVersion,
    content: doc.latestContent,
    editedBy: userId,
    editedByName: userName,
    changeSummary: summary || 'Document saved',
    statusAtTime: doc.status,
  });
};

// ── LAW PORTAL ────────────────────────────────────────────────────────────────

/**
 * POST /api/legal/create
 * Create a new legal document (LAW role)
 */
exports.create = async (req, res) => {
  try {
    const { title, type, projectId, projectName, content, priority, tags } = req.body;
    if (!title) return res.status(400).json({ success: false, error: 'Title is required' });

    const userId = req.user._id;
    const userName = req.user.name || req.user.email || 'Unknown';

    const doc = await LegalDocument.create({
      title,
      type: type || 'Other',
      projectId: projectId || undefined,
      projectName: projectName || '',
      latestContent: content || '',
      currentVersion: 'v1.0',
      versionMajor: 1,
      versionMinor: 0,
      status: 'Draft',
      isLocked: false,
      isPublished: false,
      createdBy: userId,
      createdByName: userName,
      priority: priority || 'Medium',
      tags: tags || [],
    });

    // Initial version snapshot
    await LegalDocumentVersion.create({
      documentId: doc._id,
      version: 'v1.0',
      content: content || '',
      editedBy: userId,
      editedByName: userName,
      changeSummary: 'Document created',
      statusAtTime: 'Draft',
    });

    return res.status(201).json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.create failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /api/legal/:id/auto-save
 * Auto-save (just updates content, no version snapshot, no version bump)
 */
exports.autoSave = async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked' });

    doc.latestContent = req.body.content ?? doc.latestContent;
    await doc.save();

    return res.json({ success: true, data: { savedAt: doc.updatedAt } });
  } catch (err) {
    logger.error({ err }, 'legalDocument.autoSave failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * PUT /api/legal/:id/save-draft
 * Manual save — bumps minor version, creates snapshot
 */
exports.saveDraft = async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked' });

    const userId = req.user._id;
    const userName = req.user.name || req.user.email || 'Unknown';

    const { title, type, content, projectId, projectName, priority, tags, changeSummary } = req.body;

    // Update fields
    if (title) doc.title = title;
    if (type) doc.type = type;
    if (content !== undefined) doc.latestContent = content;
    if (projectId) doc.projectId = projectId;
    if (projectName) doc.projectName = projectName;
    if (priority) doc.priority = priority;
    if (tags) doc.tags = tags;

    // Bump minor version
    const bump = bumpVersion(doc, false);
    doc.versionMajor = bump.versionMajor;
    doc.versionMinor = bump.versionMinor;
    doc.currentVersion = bump.currentVersion;

    await doc.save();

    // Create version snapshot
    await createVersionSnapshot(doc, userId, userName, changeSummary || 'Draft saved');

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.saveDraft failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/legal/:id/submit
 * Submit to CEO for approval
 */
exports.submit = async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked (already approved)' });
    if (!['Draft', 'Rejected'].includes(doc.status)) {
      return res.status(400).json({ success: false, error: `Cannot submit a document with status: ${doc.status}` });
    }

    const userId = req.user._id;
    const userName = req.user.name || req.user.email || 'Unknown';

    // If re-submitting after rejection → major version bump
    const wasRejected = doc.status === 'Rejected';
    const bump = bumpVersion(doc, wasRejected);
    doc.versionMajor = bump.versionMajor;
    doc.versionMinor = bump.versionMinor;
    doc.currentVersion = bump.currentVersion;

    doc.status = 'Pending';
    doc.submittedAt = new Date();
    doc.ceoRemarks = ''; // Clear previous remarks on re-submit

    // Update content if provided
    if (req.body.content !== undefined) doc.latestContent = req.body.content;

    await doc.save();

    // Version snapshot
    await createVersionSnapshot(
      doc,
      userId,
      userName,
      wasRejected ? 'Re-submitted after rejection' : 'Submitted to CEO for approval'
    );

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.submit failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/legal/my-documents
 * LAW user's own documents
 */
exports.myDocuments = async (req, res) => {
  try {
    const { status, type, page = 1, limit = 50, search } = req.query;
    const filter = { createdBy: req.user._id };
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (search) filter.$text = { $search: search };

    const skip = (Math.max(parseInt(page), 1) - 1) * Math.min(parseInt(limit), 100);
    const [items, total] = await Promise.all([
      LegalDocument.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      LegalDocument.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { items, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    logger.error({ err }, 'legalDocument.myDocuments failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/legal/:id
 * Get single document
 */
exports.getById = async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id).lean();
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getById failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── CEO PORTAL ────────────────────────────────────────────────────────────────

/**
 * GET /api/legal/pending
 * CEO: Get all pending documents
 */
exports.getPending = async (req, res) => {
  try {
    const { page = 1, limit = 50, type, priority } = req.query;
    const filter = { status: 'Pending' };
    if (type) filter.type = type;
    if (priority) filter.priority = priority;

    const skip = (Math.max(parseInt(page), 1) - 1) * Math.min(parseInt(limit), 100);
    const [items, total] = await Promise.all([
      LegalDocument.find(filter).sort({ submittedAt: -1 }).skip(skip).limit(parseInt(limit)).lean(),
      LegalDocument.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { items, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getPending failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/legal/:id/approve
 * CEO: Approve a document
 */
exports.approve = async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.status !== 'Pending') {
      return res.status(400).json({ success: false, error: 'Only pending documents can be approved' });
    }

    const ceoId = req.user._id;
    const ceoName = req.user.name || req.user.email || 'CEO';

    doc.status = 'Approved';
    doc.isLocked = true;
    doc.isPublished = true;
    doc.approvedBy = ceoId;
    doc.approvedByName = ceoName;
    doc.approvedAt = new Date();
    doc.ceoRemarks = req.body.remarks || '';

    await doc.save();

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.approve failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/legal/:id/reject
 * CEO: Reject a document (remark is mandatory)
 */
exports.reject = async (req, res) => {
  try {
    const { remarks } = req.body;
    if (!remarks || !remarks.trim()) {
      return res.status(400).json({ success: false, error: 'Rejection remarks are required' });
    }

    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.status !== 'Pending') {
      return res.status(400).json({ success: false, error: 'Only pending documents can be rejected' });
    }

    doc.status = 'Rejected';
    doc.ceoRemarks = remarks;
    doc.rejectedAt = new Date();
    doc.isLocked = false;
    doc.isPublished = false;

    await doc.save();

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.reject failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── ADMIN / LSW PORTAL ────────────────────────────────────────────────────────

/**
 * GET /api/legal/approved
 * Admin/LSW: Get all approved/published documents
 */
exports.getApproved = async (req, res) => {
  try {
    const { type, projectId, page = 1, limit = 50, search } = req.query;
    const filter = { status: 'Approved', isPublished: true };
    if (type) filter.type = type;
    if (projectId) filter.projectId = projectId;
    if (search) filter.$text = { $search: search };

    const skip = (Math.max(parseInt(page), 1) - 1) * Math.min(parseInt(limit), 100);
    const [items, total] = await Promise.all([
      LegalDocument.find(filter)
        .select('-latestContent') // omit heavy content from list view
        .sort({ approvedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LegalDocument.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { items, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getApproved failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/legal/all
 * Admin: All documents (any status) for oversight
 */
exports.getAll = async (req, res) => {
  try {
    const { status, type, projectId, page = 1, limit = 50, search } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (projectId) filter.projectId = projectId;
    if (search) filter.$text = { $search: search };

    const skip = (Math.max(parseInt(page), 1) - 1) * Math.min(parseInt(limit), 100);
    const [items, total] = await Promise.all([
      LegalDocument.find(filter)
        .select('-latestContent')
        .sort({ updatedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      LegalDocument.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: { items, total, page: parseInt(page), limit: parseInt(limit) },
    });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getAll failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

// ── VERSION CONTROL ───────────────────────────────────────────────────────────

/**
 * GET /api/legal/:id/versions
 * Get version history for a document
 */
exports.getVersions = async (req, res) => {
  try {
    const versions = await LegalDocumentVersion.find({ documentId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    return res.json({ success: true, data: versions });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getVersions failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * GET /api/legal/version/:versionId
 * Get a single version (for preview)
 */
exports.getVersionById = async (req, res) => {
  try {
    const version = await LegalDocumentVersion.findById(req.params.versionId).lean();
    if (!version) return res.status(404).json({ success: false, error: 'Version not found' });
    return res.json({ success: true, data: version });
  } catch (err) {
    logger.error({ err }, 'legalDocument.getVersionById failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * POST /api/legal/:id/restore/:versionId
 * Restore document to a previous version
 */
exports.restoreVersion = async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Document is locked and cannot be restored' });

    const version = await LegalDocumentVersion.findById(req.params.versionId);
    if (!version) return res.status(404).json({ success: false, error: 'Version not found' });

    const userId = req.user._id;
    const userName = req.user.name || req.user.email || 'Unknown';

    doc.latestContent = version.content;

    // Bump minor version for the restore action
    const bump = bumpVersion(doc, false);
    doc.versionMajor = bump.versionMajor;
    doc.versionMinor = bump.versionMinor;
    doc.currentVersion = bump.currentVersion;

    await doc.save();

    // Snapshot the restored state
    await createVersionSnapshot(doc, userId, userName, `Restored from ${version.version}`);

    return res.json({ success: true, data: doc });
  } catch (err) {
    logger.error({ err }, 'legalDocument.restoreVersion failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};

/**
 * DELETE /api/legal/:id
 * Admin only: delete a document (must be Draft or Rejected)
 */
exports.deleteDocument = async (req, res) => {
  try {
    const doc = await LegalDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, error: 'Document not found' });
    if (doc.isLocked) return res.status(403).json({ success: false, error: 'Cannot delete an approved document' });

    await LegalDocumentVersion.deleteMany({ documentId: doc._id });
    await doc.deleteOne();

    return res.json({ success: true, message: 'Document deleted' });
  } catch (err) {
    logger.error({ err }, 'legalDocument.delete failed');
    return res.status(500).json({ success: false, error: err.message });
  }
};
