const mongoose = require('mongoose');
const Task = require('../models/common/Task');
const Law = require('../models/department/Law');
const LawContract = require('../models/law/LawContract');
const LegalDocument = require('../models/law/LegalDocument.v2');
const LegalDocumentVersion = require('../models/law/LegalDocumentVersion.v2');
const LegalAuditLog = require('../models/law/LegalAuditLog');
const Project = require('../models/common/Project');
const OutsourcingContract = require('../models/outsourcing/OutsourcingContract');
const { ROLES } = require('../config/roles');
const logger = require('../utils/logger');
const User = require('../models/auth/User');
const { getAssociatedPortals } = require('../utils/freelancerPortals');

// Law head / admin manage tasks and may attach records to them.
const MANAGER_ROLES = [ROLES.LAW_HEAD, ROLES.ADMIN, ROLES.SUPER_ADMIN, 'superadmin'];
const MAX_LINKED_ITEMS = 25;
const MODULES = { record: Law, contract: LawContract, document: LegalDocument, outsourcing_contract: OutsourcingContract };

const roleOf = (req) => String(req.user?.role || '').toLowerCase();
const isManager = (req) => MANAGER_ROLES.includes(roleOf(req));
const isValidId = (id) => mongoose.Types.ObjectId.isValid(String(id || ''));
const idStr = (v) => String(v && v._id ? v._id : v);

// Law employees have no direct access to the Contracts / Documents / Compliance / Risk modules;
// they only see records the head links to one of their tasks (see the task-item endpoints below).
// Freelancers associated with Law may read items linked to a task the law head assigned to them -
// same task-scoped rule as law employees. The law router only lets freelancers reach the
// /task-items read endpoints (see routes/law.routes.js); everything else stays closed to them.
const freelancerOnly = (req, res, next) => (roleOf(req) === ROLES.FREELANCER ? next() : next('route'));

const denyLawEmployee = (req, res, next) => {
  if (roleOf(req) === ROLES.LAW_EMPLOYEE) {
    return res.status(403).json({ success: false, error: 'Law employees can only view items linked to their tasks' });
  }
  return next();
};

const displayTitle = (module, doc) => String(
  doc?.title || doc?.job?.title || doc?.documentNumber || `${module.replace('_', ' ')} ${String(doc?._id || '').slice(-6)}`,
).slice(0, 200);

/**
 * Task create/update hook (Law). Only the head/admin may set `linkedItems`; each entry must
 * reference an existing record. Titles are re-read from the database (never trusted from the
 * client) and the normalised list is exposed as req.validatedLinkedItems for the controller.
 */
const validateLinkedItems = async (req, res, next) => {
  try {
    // Optional project the task belongs to (head only). '' / null clears it.
    if (req.body?.project !== undefined) {
      if (!isManager(req)) {
        delete req.body.project;
      } else if (!req.body.project) {
        req.validatedProject = null;
      } else {
        if (!isValidId(req.body.project)) return res.status(400).json({ success: false, error: 'Invalid project' });
        const exists = await Project.exists({ _id: req.body.project });
        if (!exists) return res.status(404).json({ success: false, error: 'Project not found' });
        req.validatedProject = String(req.body.project);
      }
    }
    const raw = req.body?.linkedItems;
    if (raw === undefined) {
      // Moving a task to another project must not leave it pointing at the old project's documents.
      if (req.validatedProject !== undefined && req.params?.id && isValidId(req.params.id)) {
        const current = await Task.findById(req.params.id).select('linkedItems').lean();
        const docIds = (current?.linkedItems || []).filter((l) => l.module === 'document').map((l) => l.recordId);
        if (docIds.length) {
          if (!req.validatedProject) return res.status(400).json({ success: false, error: 'Remove the linked documents before clearing the project' });
          const outside = await LegalDocument.countDocuments({ _id: { $in: docIds }, projectId: { $ne: req.validatedProject } });
          if (outside) return res.status(400).json({ success: false, error: 'Linked documents belong to another project — update the documents together with the project' });
        }
      }
      return next();
    }
    if (!isManager(req)) {
      delete req.body.linkedItems;
      return res.status(403).json({ success: false, error: 'Only the law head can link items to a task' });
    }
    if (!Array.isArray(raw) || raw.length > MAX_LINKED_ITEMS) {
      return res.status(400).json({ success: false, error: `linkedItems must be an array of at most ${MAX_LINKED_ITEMS} items` });
    }
    // Tasks share project-wise legal documents only: every link must be a live (not archived)
    // legal document of the task's own project. The project comes from this request, or from
    // the existing task when an update doesn't change it.
    let taskProject = req.validatedProject;
    if (taskProject === undefined && req.params?.id && isValidId(req.params.id)) {
      const current = await Task.findById(req.params.id).select('project').lean();
      taskProject = current?.project ? String(current.project) : null;
    }
    if (raw.length > 0 && !taskProject) {
      return res.status(400).json({ success: false, error: 'Choose the task project before linking documents' });
    }
    const seen = new Set();
    const normalized = [];
    for (const entry of raw) {
      const module = String(entry?.module || '');
      const recordId = String(entry?.recordId || '');
      if (module !== 'document' || !isValidId(recordId)) {
        return res.status(400).json({ success: false, error: 'Only legal documents can be linked to a task' });
      }
      if (seen.has(`${module}:${recordId}`)) continue;
      seen.add(`${module}:${recordId}`);
      const doc = await LegalDocument.findOne({ _id: recordId, deletedAt: null, isArchived: { $ne: true } }).select('title documentNumber projectId').lean();
      if (!doc) {
        return res.status(404).json({ success: false, error: 'Linked document not found' });
      }
      if (String(doc.projectId || '') !== String(taskProject)) {
        return res.status(400).json({ success: false, error: `"${doc.title}" does not belong to this task's project` });
      }
      normalized.push({ module, recordId, title: displayTitle(module, doc), canEdit: module === 'document' && entry.canEdit === true });
    }
    req.validatedLinkedItems = normalized;
    return next();
  } catch (err) {
    return next(err);
  }
};

// --- Task-scoped read-only access to linked items -----------------------------------------------

const sendError = (res, status, error) => res.status(status).json({ success: false, error });

// Loads the task and enforces the access rule:
//   head/admin/super_admin: any task, but the record must still be listed on it
//   law_employee: only tasks assigned to them, and only records listed on that task
const loadTaskForItem = async (req, res) => {
  const { taskId, recordId } = req.params;
  if (!isValidId(taskId) || (recordId !== undefined && !isValidId(recordId))) {
    sendError(res, 400, 'Invalid id');
    return null;
  }
  const role = roleOf(req);
  if (!isManager(req) && role !== ROLES.LAW_EMPLOYEE && role !== ROLES.FREELANCER) {
    sendError(res, 403, 'Not allowed');
    return null;
  }
  const task = await Task.findById(taskId).select('assignedTo linkedItems title status project').lean();
  if (!task) {
    sendError(res, 404, 'Task not found');
    return null;
  }
  if (role === ROLES.FREELANCER) {
    const me = await User.findById(req.user._id).select('role department metadata isActive').lean();
    if (!me || me.isActive === false || !getAssociatedPortals(me).includes('law')) {
      sendError(res, 403, 'Not allowed');
      return null;
    }
  }
  if ((role === ROLES.LAW_EMPLOYEE || role === ROLES.FREELANCER) && idStr(task.assignedTo) !== idStr(req.user._id)) {
    // 404, not 403: do not reveal that the task exists.
    sendError(res, 404, 'Task not found');
    return null;
  }
  // Employees / freelancers only ever reach legal-document links; older tasks may still carry
  // contract / compliance links, which stay visible to the head only.
  if (!isManager(req)) task.linkedItems = (task.linkedItems || []).filter((l) => l.module === 'document');
  const link = recordId === undefined ? null : (task.linkedItems || []).find((l) => idStr(l.recordId) === String(recordId));
  if (recordId !== undefined && !link) {
    sendError(res, 404, 'Item is not linked to this task');
    return null;
  }
  return { task, link };
};

const fileMeta = (files = []) => files
  .map((f, index) => ({ index, name: f.originalName || f.originalFileName || f.fileName || `file-${index + 1}`, contentType: f.contentType || f.mimeType || '', bytes: f.bytes || f.fileSize || 0, hasFile: Boolean(f.url || f.data) }))
  .filter((f) => f.hasFile)
  .map(({ hasFile, ...rest }) => rest);

const filesOf = (module, doc) => {
  if (module === 'document') return Array.isArray(doc.attachments) ? doc.attachments : [];
  const meta = doc.metadata || {};
  const list = meta.referencePdfs || meta.attachments || meta.files;
  return Array.isArray(list) ? list.filter((f) => f && typeof f === 'object') : [];
};

const dateOrNull = (v) => (v ? new Date(v) : null);

// Whitelisted, read-only projection: never returns metadata blobs, internal notes, or document body.
const summarize = (module, doc) => {
  if (module === 'record') {
    return {
      type: doc.section, title: doc.title, status: doc.status, priority: doc.priority,
      description: doc.description || '', referenceNumber: doc.referenceNumber || '', owner: doc.owner || '',
      dueDate: dateOrNull(doc.dueDate), updatedAt: doc.updatedAt,
    };
  }
  if (module === 'contract') {
    return {
      type: 'contract', title: doc.title, status: doc.status, approvalStatus: doc.approvalStatus,
      description: typeof doc.metadata?.description === 'string' ? doc.metadata.description : '',
      referenceNumber: doc.metadata?.referenceNumber || '',
      dueDate: dateOrNull(doc.expiryDate), updatedAt: doc.updatedAt,
    };
  }
  if (module === 'outsourcing_contract') {
    return {
      type: 'outsourcing contract', title: doc.job?.title || 'Outsourcing contract', status: doc.status, lawStatus: doc.lawStatus,
      description: String(doc.terms || '').slice(0, 4000), dueDate: dateOrNull(doc.endDate), updatedAt: doc.updatedAt,
    };
  }
  return {
    type: doc.type || 'document', title: doc.title, status: doc.status, priority: doc.priority,
    description: doc.description || '', referenceNumber: doc.documentNumber || '',
    version: doc.currentVersion, confidentiality: doc.confidentiality,
    dueDate: dateOrNull(doc.expiryDate), updatedAt: doc.updatedAt,
    projectId: doc.projectId || null, projectName: doc.projectName || '',
    isLocked: Boolean(doc.isLocked),
    annotations: (doc.annotations || []).map((a) => ({
      _id: a._id, kind: a.kind, text: a.text, critical: Boolean(a.critical), quote: a.quote || '',
      taskId: a.taskId || null, createdBy: a.createdBy || null, createdByName: a.createdByName || '', createdAt: a.createdAt,
    })),
  };
};

// Edits through a task are only allowed while the document is still a working draft:
// once it is submitted (Pending) or Approved it belongs to the CEO approval flow.
const EDITABLE_DOC_STATUSES = ['Draft', 'Rejected'];
const CLOSED_TASK_STATUSES = ['completed', 'cancelled'];

// Why the caller may not edit this linked document through this task ('' = may edit).
const editBlocker = (req, ctx, doc) => {
  if (ctx.link.module !== 'document') return 'Only legal documents can be edited through a task';
  if (!isManager(req) && !ctx.link.canEdit) return 'The law head has shared this document read-only';
  if (!isManager(req) && CLOSED_TASK_STATUSES.includes(String(ctx.task.status || ''))) return 'This task is closed';
  if (doc.isLocked) return 'The document is locked';
  if (!EDITABLE_DOC_STATUSES.includes(doc.status)) return `The document is ${doc.status} and can no longer be edited`;
  return '';
};

const actorName = (req) => [req.user?.firstName, req.user?.lastName].filter(Boolean).join(' ').trim() || req.user?.email || 'Unknown';

const auditDoc = (req, documentId, action, remarks, metadata = {}) => LegalAuditLog.create({
  documentId, action, performedBy: req.user._id, role: req.user?.role || 'unknown', remarks, metadata, timestamp: new Date(),
}).catch((err) => logger.warn({ err }, 'Law task document audit failed'));

const SELECT = {
  record: 'title section status priority description referenceNumber owner dueDate updatedAt metadata.referencePdfs',
  contract: 'title status approvalStatus expiryDate updatedAt metadata.description metadata.referenceNumber metadata.referencePdfs metadata.attachments metadata.files',
  outsourcing_contract: 'job status lawStatus terms endDate updatedAt',
  document: 'title documentNumber type status priority description currentVersion confidentiality expiryDate updatedAt projectId projectName isLocked annotations attachments.originalFileName attachments.mimeType attachments.fileSize attachments.url attachments.data',
};

const loadRecord = (module, recordId) => {
  const filter = { _id: recordId };
  if (module === 'document') filter.deletedAt = null;
  const query = MODULES[module].findOne(filter).select(SELECT[module]);
  if (module === 'outsourcing_contract') query.populate('job', 'title');
  return query.lean();
};

// GET /task-items/options — what the head can link (head/admin only; capped, lightweight).
const listLinkableItems = async (req, res) => {
  try {
    if (!isManager(req)) return sendError(res, 403, 'Only the law head can link items to a task');
    const search = String(req.query.search || '').trim().slice(0, 80);
    const rx = search ? new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;
    // Project-wise legal documents only: a project is required and nothing else is offered.
    if (!isValidId(req.query.projectId)) return sendError(res, 400, 'Choose a project to list its legal documents');
    const documents = await LegalDocument.find({ deletedAt: null, isArchived: { $ne: true }, projectId: String(req.query.projectId), ...(rx ? { title: rx } : {}) })
      .select('title documentNumber type status projectId projectName').sort({ updatedAt: -1 }).limit(200).lean();
    const data = documents.map((d) => ({
      module: 'document', recordId: d._id, title: displayTitle('document', d), type: d.type, status: d.status,
      referenceNumber: d.documentNumber || '', projectId: d.projectId, projectName: d.projectName || '',
    }));
    return res.json({ success: true, data });
  } catch (err) {
    logger.error({ err }, 'Law linkable items error');
    return sendError(res, 500, 'Failed to load linkable items');
  }
};

// GET /task-items/mine — every item linked to the caller's OWN (non-cancelled) tasks.
// Self-scoped: law_employee and Law-associated freelancers only; the query is always
// `assignedTo = caller`, and details/files still go through the per-item endpoints above.
const listMyItems = async (req, res) => {
  try {
    const role = roleOf(req);
    if (role !== ROLES.LAW_EMPLOYEE && role !== ROLES.FREELANCER) return sendError(res, 403, 'Not allowed');
    if (role === ROLES.FREELANCER) {
      const me = await User.findById(req.user._id).select('role department metadata isActive').lean();
      if (!me || me.isActive === false || !getAssociatedPortals(me).includes('law')) return sendError(res, 403, 'Not allowed');
    }
    const tasks = await Task.find({
      assignedTo: req.user._id,
      status: { $ne: 'cancelled' },
      'linkedItems.module': 'document',
    }).select('title status priority dueDate linkedItems').sort({ dueDate: 1 }).limit(200).lean();
    tasks.forEach((t) => { t.linkedItems = (t.linkedItems || []).filter((l) => l.module === 'document'); });

    const cache = new Map();
    const load = (link) => {
      const key = `${link.module}:${idStr(link.recordId)}`;
      if (!cache.has(key)) cache.set(key, loadRecord(link.module, link.recordId));
      return cache.get(key);
    };
    const data = [];
    for (const task of tasks) {
      const rows = await Promise.all((task.linkedItems || []).map(async (link) => {
        const base = {
          module: link.module, recordId: link.recordId,
          task: { _id: task._id, title: task.title, status: task.status, priority: task.priority, dueDate: task.dueDate },
        };
        const doc = await load(link);
        if (!doc) return { ...base, title: link.title, missing: true };
        const s = summarize(link.module, doc);
        return {
          ...base, title: s.title || link.title, type: s.type, status: s.status, fileCount: fileMeta(filesOf(link.module, doc)).length,
          canEdit: Boolean(link.canEdit), projectName: s.projectName || '', annotationCount: (s.annotations || []).length,
          highlightCount: (s.annotations || []).filter((a) => a.kind === 'highlight').length,
          criticalCount: (s.annotations || []).filter((a) => a.critical).length,
          // Up to 3 key points for the list preview: critical first, then newest.
          topPoints: (s.annotations || [])
            .filter((a) => a.kind === 'highlight' || a.critical)
            .sort((a, b) => (Number(b.critical) - Number(a.critical)) || (new Date(b.createdAt) - new Date(a.createdAt)))
            .slice(0, 3)
            .map((a) => ({ text: String(a.text).slice(0, 160), critical: a.critical, kind: a.kind })),
        };
      }));
      data.push(...rows);
    }
    return res.json({ success: true, data });
  } catch (err) {
    logger.error({ err }, 'Law my items error');
    return sendError(res, 500, 'Failed to load assigned items');
  }
};

// GET /task-items/:taskId — summaries of every item linked to the task.
const listTaskItems = async (req, res) => {
  try {
    const ctx = await loadTaskForItem(req, res);
    if (!ctx) return undefined;
    const items = await Promise.all((ctx.task.linkedItems || []).map(async (link) => {
      const doc = await loadRecord(link.module, link.recordId);
      if (!doc) return { module: link.module, recordId: link.recordId, title: link.title, missing: true };
      const s = summarize(link.module, doc);
      return {
        module: link.module, recordId: link.recordId, title: s.title || link.title, type: s.type, status: s.status,
        fileCount: fileMeta(filesOf(link.module, doc)).length, canEdit: Boolean(link.canEdit),
        projectName: s.projectName || '', annotationCount: (s.annotations || []).length,
        criticalCount: (s.annotations || []).filter((a) => a.critical).length,
      };
    }));
    return res.json({ success: true, data: items });
  } catch (err) {
    logger.error({ err }, 'Law task items list error');
    return sendError(res, 500, 'Failed to load linked items');
  }
};

// GET /task-items/:taskId/:recordId — limited read-only detail.
const getTaskItem = async (req, res) => {
  try {
    const ctx = await loadTaskForItem(req, res);
    if (!ctx) return undefined;
    const { module } = ctx.link;
    const doc = await loadRecord(module, req.params.recordId);
    if (!doc) return sendError(res, 404, 'Linked item no longer exists');
    const data = {
      module, recordId: req.params.recordId, ...summarize(module, doc), files: fileMeta(filesOf(module, doc)),
      taskStatus: ctx.task.status, isAssignee: idStr(ctx.task.assignedTo) === idStr(req.user._id),
    };
    if (module === 'document') {
      const blocker = editBlocker(req, ctx, doc);
      data.canEdit = !blocker;
      data.editBlockedReason = blocker;
      data.sharedForEdit = Boolean(ctx.link.canEdit);
      // The body is only sent to people allowed to edit it (and the head).
      if (isManager(req) || ctx.link.canEdit) {
        const body = await LegalDocument.findById(doc._id).select('latestContent').lean();
        data.content = body?.latestContent || '';
      }
    }
    return res.json({ success: true, data });
  } catch (err) {
    logger.error({ err }, 'Law task item detail error');
    return sendError(res, 500, 'Failed to load linked item');
  }
};

// PUT /task-items/:taskId/:recordId/content — save the document body through the task.
// Same versioning as the document editor: minor version bump + version snapshot + audit.
const saveTaskItemContent = async (req, res) => {
  try {
    const ctx = await loadTaskForItem(req, res);
    if (!ctx) return undefined;
    const doc = await LegalDocument.findOne({ _id: req.params.recordId, deletedAt: null });
    if (!doc) return sendError(res, 404, 'Linked item no longer exists');
    const blocker = editBlocker(req, ctx, doc);
    if (blocker) return sendError(res, 403, blocker);
    const content = req.body?.content;
    if (typeof content !== 'string') return sendError(res, 400, 'content is required');
    if (content.length > 5 * 1024 * 1024) return sendError(res, 413, 'Document is too large');
    const changeSummary = String(req.body?.changeSummary || '').trim().slice(0, 300) || `Edited via task "${ctx.task.title}"`;
    doc.latestContent = content;
    doc.versionMinor = (doc.versionMinor || 0) + 1;
    doc.currentVersion = `v${doc.versionMajor || 1}.${doc.versionMinor}`;
    await doc.save();
    await LegalDocumentVersion.create({
      documentId: doc._id, version: doc.currentVersion, content: content.trim() ? content : '<p><br></p>',
      editedBy: req.user._id, editedByName: actorName(req), changeSummary, statusAtTime: doc.status,
    });
    await auditDoc(req, doc._id, 'UPDATE', changeSummary, { version: doc.currentVersion, taskId: ctx.task._id });
    return res.json({ success: true, data: { version: doc.currentVersion, updatedAt: doc.updatedAt } });
  } catch (err) {
    logger.error({ err }, 'Law task document save error');
    return sendError(res, 500, 'Failed to save document');
  }
};

// POST /task-items/:taskId/:recordId/annotations — add a note or key highlight point.
const addTaskItemAnnotation = async (req, res) => {
  try {
    const ctx = await loadTaskForItem(req, res);
    if (!ctx) return undefined;
    const doc = await LegalDocument.findOne({ _id: req.params.recordId, deletedAt: null });
    if (!doc) return sendError(res, 404, 'Linked item no longer exists');
    // Notes may still be added after approval (they don't change the signed text); only the
    // share permission and an open task are required.
    if (ctx.link.module !== 'document') return sendError(res, 400, 'Notes can only be added to legal documents');
    if (!isManager(req) && !ctx.link.canEdit) return sendError(res, 403, 'The law head has shared this document read-only');
    if (!isManager(req) && CLOSED_TASK_STATUSES.includes(String(ctx.task.status || ''))) return sendError(res, 403, 'This task is closed');
    const text = String(req.body?.text || '').trim();
    if (!text) return sendError(res, 400, 'Text is required');
    if (text.length > 2000) return sendError(res, 400, 'Keep it under 2000 characters');
    const kind = req.body?.kind === 'highlight' ? 'highlight' : 'note';
    if ((doc.annotations || []).length >= 200) return sendError(res, 409, 'This document already has the maximum of 200 notes');
    doc.annotations.push({
      kind, text, critical: req.body?.critical === true, quote: String(req.body?.quote || '').trim().slice(0, 500), taskId: ctx.task._id,
      createdBy: req.user._id, createdByName: actorName(req), createdAt: new Date(),
    });
    await doc.save();
    const added = doc.annotations[doc.annotations.length - 1];
    await auditDoc(req, doc._id, 'UPDATE', `${kind === 'highlight' ? 'Key point' : 'Note'} added via task`, { taskId: ctx.task._id, annotationId: added._id });
    return res.status(201).json({ success: true, data: added });
  } catch (err) {
    logger.error({ err }, 'Law task annotation error');
    return sendError(res, 500, 'Failed to add note');
  }
};

// DELETE /task-items/:taskId/:recordId/annotations/:annotationId — author or head only.
const deleteTaskItemAnnotation = async (req, res) => {
  try {
    const ctx = await loadTaskForItem(req, res);
    if (!ctx) return undefined;
    if (!isValidId(req.params.annotationId)) return sendError(res, 400, 'Invalid id');
    const doc = await LegalDocument.findOne({ _id: req.params.recordId, deletedAt: null });
    if (!doc) return sendError(res, 404, 'Linked item no longer exists');
    const note = doc.annotations.id(req.params.annotationId);
    if (!note) return sendError(res, 404, 'Note not found');
    if (!isManager(req) && idStr(note.createdBy) !== idStr(req.user._id)) return sendError(res, 403, 'You can only remove your own notes');
    note.deleteOne();
    await doc.save();
    await auditDoc(req, doc._id, 'UPDATE', 'Note removed via task', { taskId: ctx.task._id, annotationId: req.params.annotationId });
    return res.json({ success: true });
  } catch (err) {
    logger.error({ err }, 'Law task annotation delete error');
    return sendError(res, 500, 'Failed to remove note');
  }
};

// GET /task-items/:taskId/:recordId/files/:index[?download=1] — streams one attached file.
const viewTaskItemFile = async (req, res) => {
  try {
    const ctx = await loadTaskForItem(req, res);
    if (!ctx) return undefined;
    const { module } = ctx.link;
    const doc = await loadRecord(module, req.params.recordId);
    if (!doc) return sendError(res, 404, 'Linked item no longer exists');
    const index = Number.parseInt(req.params.index, 10);
    const file = Number.isInteger(index) && index >= 0 ? filesOf(module, doc)[index] : null;
    if (!file || (!file.url && !file.data)) return sendError(res, 404, 'File not found');

    let buffer;
    let contentType = file.contentType || file.mimeType || 'application/octet-stream';
    if (file.data && !file.url) {
      buffer = Buffer.isBuffer(file.data) ? file.data : Buffer.from(file.data.buffer || file.data);
    } else if (String(file.url).startsWith('data:')) {
      const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(String(file.url));
      if (!match) return sendError(res, 422, 'Unsupported file encoding');
      contentType = match[1] || contentType;
      buffer = match[2] ? Buffer.from(match[3], 'base64') : Buffer.from(decodeURIComponent(match[3]));
    } else {
      const source = new URL(file.url);
      if (source.protocol !== 'https:' || source.hostname !== 'res.cloudinary.com') {
        return sendError(res, 400, 'Unsupported file storage location');
      }
      const upstream = await fetch(source, { signal: AbortSignal.timeout(15000) });
      if (!upstream.ok) throw new Error(`File storage returned ${upstream.status}`);
      buffer = Buffer.from(await upstream.arrayBuffer());
    }
    if (!buffer.length || buffer.length > 25 * 1024 * 1024) {
      return sendError(res, 422, 'File is empty or exceeds the preview limit');
    }
    const name = String(file.originalName || file.originalFileName || file.fileName || 'file').replace(/[\r\n"\\]/g, '_');
    res.set({
      'Content-Type': contentType,
      'Content-Disposition': `${req.query.download ? 'attachment' : 'inline'}; filename="${name}"`,
      'Content-Length': String(buffer.length),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    });
    return res.send(buffer);
  } catch (err) {
    logger.error({ err }, 'Law task item file error');
    return sendError(res, 502, 'Unable to load file');
  }
};

// GET /task-items/monitor — law head only: every legal document shared through a task, with the
// assignee, task progress, edit access, last edit and notes, plus a recent activity feed.
const monitorDocumentWork = async (req, res) => {
  try {
    if (!isManager(req)) return sendError(res, 403, 'Only the law head can monitor document work');
    const tasks = await Task.find({ 'linkedItems.module': 'document' })
      .select('title status priority dueDate isOverdue assignedTo project linkedItems updatedAt createdAt')
      .populate('project', 'name projectCode')
      .sort({ updatedAt: -1 })
      .limit(500)
      .lean();
    // Names are looked up separately so the assignee id survives even if the account was removed.
    const userIds = [...new Set(tasks.map((t) => idStr(t.assignedTo)).filter(isValidId))];
    const usersById = new Map((await User.find({ _id: { $in: userIds } }).select('firstName lastName email').lean()).map((u) => [idStr(u._id), u]));

    const docIds = [...new Set(tasks.flatMap((t) => (t.linkedItems || []).filter((l) => l.module === 'document').map((l) => idStr(l.recordId))))];
    const [docs, versions] = await Promise.all([
      LegalDocument.find({ _id: { $in: docIds } })
        .select('title documentNumber type status currentVersion isLocked projectId projectName updatedAt deletedAt isArchived annotations')
        .lean(),
      LegalDocumentVersion.find({ documentId: { $in: docIds } })
        .select('documentId version editedBy editedByName changeSummary createdAt')
        .sort({ createdAt: -1 })
        .limit(2000)
        .lean(),
    ]);
    const docById = new Map(docs.map((d) => [idStr(d._id), d]));
    const lastEditByDoc = new Map();
    const lastEditByDocUser = new Map();
    versions.forEach((v) => {
      const d = idStr(v.documentId);
      if (!lastEditByDoc.has(d)) lastEditByDoc.set(d, v);
      const key = `${d}:${idStr(v.editedBy)}`;
      if (!lastEditByDocUser.has(key)) lastEditByDocUser.set(key, v);
    });

    const personName = (p) => [p?.firstName, p?.lastName].filter(Boolean).join(' ').trim() || p?.email || 'Employee';
    const rows = [];
    tasks.forEach((task) => {
      (task.linkedItems || []).filter((l) => l.module === 'document').forEach((link) => {
        const docId = idStr(link.recordId);
        const doc = docById.get(docId);
        const notes = doc?.annotations || [];
        const assigneeId = idStr(task.assignedTo);
        const lastByAssignee = lastEditByDocUser.get(`${docId}:${assigneeId}`);
        const lastAny = lastEditByDoc.get(docId);
        rows.push({
          key: `${idStr(task._id)}:${docId}`,
          taskId: task._id,
          taskTitle: task.title,
          taskStatus: task.status,
          priority: task.priority,
          dueDate: task.dueDate,
          isOverdue: Boolean(task.isOverdue || (task.dueDate && new Date(task.dueDate) < new Date() && !CLOSED_TASK_STATUSES.includes(task.status))),
          assignee: { id: assigneeId, name: usersById.has(assigneeId) ? personName(usersById.get(assigneeId)) : 'Former employee' },
          project: task.project ? { id: idStr(task.project), name: task.project.name || task.project.projectCode || 'Project' } : null,
          canEdit: Boolean(link.canEdit),
          document: doc && !doc.deletedAt ? {
            _id: doc._id, title: doc.title, documentNumber: doc.documentNumber, type: doc.type, status: doc.status,
            currentVersion: doc.currentVersion, isLocked: Boolean(doc.isLocked), isArchived: Boolean(doc.isArchived),
            projectId: doc.projectId, projectName: doc.projectName, updatedAt: doc.updatedAt, annotations: notes,
          } : null,
          title: doc?.title || link.title,
          missing: !doc || Boolean(doc.deletedAt),
          noteCount: notes.length,
          highlightCount: notes.filter((a) => a.kind === 'highlight').length,
          criticalCount: notes.filter((a) => a.critical).length,
          assigneeNoteCount: notes.filter((a) => idStr(a.createdBy) === assigneeId).length,
          assigneeLastEdit: lastByAssignee ? { at: lastByAssignee.createdAt, version: lastByAssignee.version, summary: lastByAssignee.changeSummary } : null,
          lastEdit: lastAny ? { at: lastAny.createdAt, by: lastAny.editedByName, version: lastAny.version } : null,
        });
      });
    });

    // Recent activity across these documents: edits (versions) and notes, newest first.
    const activity = [
      ...versions.slice(0, 40).map((v) => ({
        type: 'edit', at: v.createdAt, by: v.editedByName || 'Someone', docId: v.documentId,
        docTitle: docById.get(idStr(v.documentId))?.title || 'Document', text: v.changeSummary, version: v.version,
      })),
      ...docs.flatMap((d) => (d.annotations || []).map((a) => ({
        type: a.kind === 'highlight' ? 'highlight' : 'note', critical: Boolean(a.critical), at: a.createdAt,
        by: a.createdByName || 'Someone', docId: d._id, docTitle: d.title, text: String(a.text || '').slice(0, 200),
      }))),
    ].sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 40);

    return res.json({ success: true, data: { rows, activity } });
  } catch (err) {
    logger.error({ err }, 'Law document monitor error');
    return sendError(res, 500, 'Failed to load document work');
  }
};

module.exports = {
  monitorDocumentWork,
  freelancerOnly, denyLawEmployee, validateLinkedItems, listLinkableItems, listMyItems, listTaskItems, getTaskItem, viewTaskItemFile,
  saveTaskItemContent, addTaskItemAnnotation, deleteTaskItemAnnotation,
};
