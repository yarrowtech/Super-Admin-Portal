const mongoose = require('mongoose');
const Task = require('../models/common/Task');
const Law = require('../models/department/Law');
const LawContract = require('../models/law/LawContract');
const LegalDocument = require('../models/law/LegalDocument.v2');
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

// Loads just enough of a record to validate it exists and derive a display title.
const findForTitle = (module, recordId) => {
  const filter = { _id: recordId };
  if (module === 'document') filter.deletedAt = null;
  const query = MODULES[module].findOne(filter);
  if (module === 'outsourcing_contract') return query.select('job').populate('job', 'title').lean();
  return query.select('title documentNumber').lean();
};

/**
 * Task create/update hook (Law). Only the head/admin may set `linkedItems`; each entry must
 * reference an existing record. Titles are re-read from the database (never trusted from the
 * client) and the normalised list is exposed as req.validatedLinkedItems for the controller.
 */
const validateLinkedItems = async (req, res, next) => {
  try {
    const raw = req.body?.linkedItems;
    if (raw === undefined) return next();
    if (!isManager(req)) {
      delete req.body.linkedItems;
      return res.status(403).json({ success: false, error: 'Only the law head can link items to a task' });
    }
    if (!Array.isArray(raw) || raw.length > MAX_LINKED_ITEMS) {
      return res.status(400).json({ success: false, error: `linkedItems must be an array of at most ${MAX_LINKED_ITEMS} items` });
    }
    const seen = new Set();
    const normalized = [];
    for (const entry of raw) {
      const module = String(entry?.module || '');
      const recordId = String(entry?.recordId || '');
      if (!MODULES[module] || !isValidId(recordId)) {
        return res.status(400).json({ success: false, error: 'Each linked item needs a valid module (record, contract, document, outsourcing_contract) and recordId' });
      }
      if (seen.has(`${module}:${recordId}`)) continue;
      seen.add(`${module}:${recordId}`);
      const doc = await findForTitle(module, recordId);
      if (!doc) {
        return res.status(404).json({ success: false, error: `Linked ${module} not found` });
      }
      normalized.push({ module, recordId, title: displayTitle(module, doc) });
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
  const task = await Task.findById(taskId).select('assignedTo linkedItems title').lean();
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
  };
};

const SELECT = {
  record: 'title section status priority description referenceNumber owner dueDate updatedAt metadata.referencePdfs',
  contract: 'title status approvalStatus expiryDate updatedAt metadata.description metadata.referenceNumber metadata.referencePdfs metadata.attachments metadata.files',
  outsourcing_contract: 'job status lawStatus terms endDate updatedAt',
  document: 'title documentNumber type status priority description currentVersion confidentiality expiryDate updatedAt attachments.originalFileName attachments.mimeType attachments.fileSize attachments.url attachments.data',
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
    const CAP = 200;
    const [records, contracts, documents, outsourcing] = await Promise.all([
      Law.find(rx ? { title: rx } : {}).select('title section status').sort({ updatedAt: -1 }).limit(CAP).lean(),
      LawContract.find(rx ? { title: rx } : {}).select('title status').sort({ updatedAt: -1 }).limit(CAP).lean(),
      LegalDocument.find({ deletedAt: null, ...(rx ? { title: rx } : {}) }).select('title type status').sort({ updatedAt: -1 }).limit(CAP).lean(),
      OutsourcingContract.find({}).select('job status').populate('job', 'title').sort({ updatedAt: -1 }).limit(CAP).lean(),
    ]);
    const data = [
      ...records.map((d) => ({ module: 'record', recordId: d._id, title: displayTitle('record', d), type: d.section, status: d.status })),
      ...contracts.map((d) => ({ module: 'contract', recordId: d._id, title: displayTitle('contract', d), type: 'contract', status: d.status })),
      ...documents.map((d) => ({ module: 'document', recordId: d._id, title: displayTitle('document', d), type: d.type, status: d.status })),
      ...outsourcing.filter((d) => !rx || rx.test(d.job?.title || '')).map((d) => ({ module: 'outsourcing_contract', recordId: d._id, title: displayTitle('outsourcing_contract', d), type: 'outsourcing contract', status: d.status })),
    ];
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
      'linkedItems.0': { $exists: true },
    }).select('title status priority dueDate linkedItems').sort({ dueDate: 1 }).limit(200).lean();

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
        return { ...base, title: s.title || link.title, type: s.type, status: s.status, fileCount: fileMeta(filesOf(link.module, doc)).length };
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
      return { module: link.module, recordId: link.recordId, title: s.title || link.title, type: s.type, status: s.status, fileCount: fileMeta(filesOf(link.module, doc)).length };
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
    return res.json({ success: true, data: { module, recordId: req.params.recordId, ...summarize(module, doc), files: fileMeta(filesOf(module, doc)) } });
  } catch (err) {
    logger.error({ err }, 'Law task item detail error');
    return sendError(res, 500, 'Failed to load linked item');
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

module.exports = { freelancerOnly, denyLawEmployee, validateLinkedItems, listLinkableItems, listMyItems, listTaskItems, getTaskItem, viewTaskItemFile };
