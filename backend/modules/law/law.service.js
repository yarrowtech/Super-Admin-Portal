const Law = require("../../models/department/Law");
const LawContract = require("../../models/law/LawContract");
const Invoice = require("../../models/finance/Invoice");
const ActivityLog = require("../../models/auth/ActivityLog");
const Project = require("../../models/common/Project");
const { createApprovalRequest, decideApprovalRequest } = require("../../services/approvalEngine.service");
const { writeAuditTrail } = require("../../services/auditTrail.service");
const { projectOverviewScope } = require("../../services/projectOverviewAccess.service");

const withPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const SECTION_LIFECYCLE_DATE = {
  agreements: { field: "expiryDate", label: "expires" },
  "privacy-policy": { field: "nextReviewDate", label: "review_due" },
  "disputes-fraud": { field: "resolutionEta", label: "resolution_eta" },
  "ip-copyright": { field: "expiryDate", label: "renewal_due" },
};

const parseLifecycleDate = (value) => {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const enrichLawRecord = (record = {}) => {
  const config = SECTION_LIFECYCLE_DATE[record.section] || {};
  const lifecycleDate = parseLifecycleDate(record.metadata?.[config.field] || record.dueDate);
  const daysUntil = lifecycleDate ? Math.ceil((lifecycleDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null;
  return {
    ...record,
    lifecycle: {
      dateField: config.field || "dueDate",
      label: config.label || "due",
      date: lifecycleDate,
      daysUntil,
      state: daysUntil === null ? "unscheduled" : daysUntil < 0 ? "overdue" : daysUntil <= 30 ? "due_soon" : "scheduled",
    },
  };
};

const getOverview = async (projectId) => {
  const scope = projectId ? { projectId } : {};
  const [records, contracts, expiringSoon, disputes] = await Promise.all([
    Law.countDocuments(scope),
    LawContract.countDocuments(scope),
    LawContract.countDocuments({
      ...scope,
      expiryDate: {
        $gte: new Date(),
        $lte: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      },
    }),
    Law.countDocuments({ ...scope, section: { $in: ["cases", "disputes-fraud"] } }),
  ]);
  return { records, contracts, expiringSoon, disputes };
};

const listContracts = async (query = {}, projectId) => {
  const { page, limit, skip } = withPagination(query);
  const filter = projectId ? { projectId } : {};
  if (query.status) filter.status = query.status;
  const [items, total] = await Promise.all([
    LawContract.find(filter).sort({ expiryDate: 1 }).skip(skip).limit(limit).lean(),
    LawContract.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

const createContract = async (payload = {}, actorId, projectId) =>
  LawContract.create({ ...payload, projectId, createdBy: actorId, updatedBy: actorId });
const getContractById = async (id, projectId) => LawContract.findOne({ _id: id, projectId }).lean();
const updateContract = async (id, payload = {}, actorId, projectId) =>
  LawContract.findOneAndUpdate(
    { _id: id, projectId },
    { ...payload, projectId, updatedBy: actorId },
    { new: true, runValidators: true }
  );
const deleteContract = async (id, projectId) => LawContract.findOneAndDelete({ _id: id, projectId });

const complianceSnapshot = async (projectId) => {
  const scope = projectId ? { projectId } : {};
  const [complianceRows, invoices] = await Promise.all([
    Law.find({ ...scope, section: { $in: ["compliance", "privacy-policy"] } }).sort({ updatedAt: -1 }).limit(10).lean(),
    Invoice.find({ ...scope, status: { $in: ["overdue", "pending"] } }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  return { complianceRows, financeInvoices: invoices };
};

const createContractApproval = async ({ contractId, requestedBy, projectId }) => {
  const contract = await LawContract.findOne({ _id: contractId, projectId }).select('_id').lean();
  if (!contract) {
    const err = new Error('Contract not found');
    err.statusCode = 404;
    throw err;
  }
  const workflow = await createApprovalRequest({
    module: "law",
    entityType: "contract",
    entityId: contractId,
    requestedBy,
    steps: [{ role: "law_head" }, { role: "admin" }],
  });
  await writeAuditTrail({
    userId: requestedBy,
    module: "law",
    action: "law_contract_approval_requested",
    targetType: "ApprovalWorkflow",
    targetId: workflow._id,
    metadata: { contractId },
  });
  return workflow;
};

const decideContractApproval = async ({ workflowId, actorId, actorRole, decision, remarks }) => {
  const workflow = await decideApprovalRequest({
    workflowId,
    role: actorRole,
    userId: actorId,
    decision,
    remarks,
  });
  if (workflow.entityType === "contract") {
    const approvalStatus = workflow.status === "approved" ? "approved" : workflow.status === "rejected" ? "rejected" : "pending";
    const status = workflow.status === "approved" ? "active" : "draft";
    await LawContract.findByIdAndUpdate(workflow.entityId, { approvalStatus, status, updatedBy: actorId });
  }
  await writeAuditTrail({
    userId: actorId,
    role: actorRole,
    module: "law",
    action: "law_contract_approval_decided",
    targetType: "ApprovalWorkflow",
    targetId: workflow._id,
    metadata: { decision, remarks, status: workflow.status },
  });
  return workflow;
};

const raiseDispute = async ({ payload = {}, actor, projectId }) => {
  const row = await Law.create({
    projectId,
    section: "disputes-fraud",
    title: payload.title || "Dispute Request",
    description: payload.description || "",
    status: "Pending",
    priority: payload.priority || "Medium",
    createdBy: actor.id,
    updatedBy: actor.id,
    metadata: { source: "employee_dispute", ...payload.metadata },
  });
  await writeAuditTrail({
    userId: actor.id,
    role: actor.role,
    module: "law",
    action: "law_dispute_raised",
    targetType: "Law",
    targetId: row._id,
    metadata: { priority: row.priority },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
    riskFlag: row.priority === "Critical" ? "high" : "medium",
  });
  return row;
};

const getSecurityComplianceLogs = async (query = {}, projectId) => {
  const { page, limit, skip } = withPagination(query);
  const filter = { module: { $in: ["it", "law"] }, action: { $regex: "security|compliance|login|access", $options: "i" } };
  if (projectId) filter.$or = [{ projectId }, { "metadata.projectId": projectId }];
  const [items, total] = await Promise.all([
    ActivityLog.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ActivityLog.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

const listProjects = async (query = {}, user = {}) => {
  const { page, limit, skip } = withPagination(query);
  const filter = await projectOverviewScope(user, 'law');
  if (query.status) filter.status = query.status;
  if (query.search) {
    const q = new RegExp(query.search, "i");
    filter.$and = [...(filter.$and || []), { $or: [{ name: q }, { description: q }, { projectCode: q }] }];
  }
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

// Sections managed through the generic Law-record CRUD (Compliance, Risk and
// the non-outsourcing Contracts pages) — Legal Documents is a separate
// system (LegalDocument.v2 / legalDocument.v2.controller.js) and never
// touches this collection.
const LAW_RECORD_SECTIONS = ["agreements", "privacy-policy", "disputes-fraud", "ip-copyright", "work-hire", "third-party"];

const listRecords = async (query = {}, projectId) => {
  const { page, limit, skip } = withPagination(query);
  const filter = {};
  if (projectId) filter.projectId = projectId;
  if (query.section && LAW_RECORD_SECTIONS.includes(query.section)) filter.section = query.section;
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { referenceNumber: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    Law.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Law.countDocuments(filter),
  ]);
  return { items: items.map(enrichLawRecord), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

const createRecord = async (payload = {}, actorId, projectId) => {
  if (!LAW_RECORD_SECTIONS.includes(payload.section)) {
    const err = new Error("A valid section is required");
    err.statusCode = 400;
    throw err;
  }
  const row = await Law.create({
    section: payload.section,
    title: payload.title,
    description: payload.description || "",
    status: payload.status || "Draft",
    priority: payload.priority || "Medium",
    owner: payload.owner || "",
    dueDate: payload.dueDate || undefined,
    referenceNumber: payload.referenceNumber || "",
    tags: Array.isArray(payload.tags) ? payload.tags : [],
    notes: payload.notes || "",
    projectId: projectId || undefined,
    createdBy: actorId,
    updatedBy: actorId,
    metadata: payload.metadata || {},
  });
  await writeAuditTrail({
    userId: actorId,
    module: "law",
    action: "law_record_created",
    targetType: "Law",
    targetId: row._id,
    metadata: { section: row.section, projectId: row.projectId || null },
  });
  return enrichLawRecord(row.toObject());
};

const getRecordById = async (id, projectId) => {
  const filter = { _id: id };
  if (projectId) filter.projectId = projectId;
  const row = await Law.findOne(filter).lean();
  return row ? enrichLawRecord(row) : null;
};

const RECORD_UPDATABLE_FIELDS = ["title", "description", "status", "priority", "owner", "dueDate", "referenceNumber", "tags", "notes", "metadata"];

const updateRecord = async (id, payload = {}, actorId, projectId) => {
  const filter = { _id: id };
  if (projectId) filter.projectId = projectId;
  const updates = { updatedBy: actorId };
  RECORD_UPDATABLE_FIELDS.forEach((field) => {
    if (payload[field] !== undefined) updates[field] = payload[field];
  });
  const row = await Law.findOneAndUpdate(filter, updates, { new: true, runValidators: true });
  if (!row) return null;
  await writeAuditTrail({
    userId: actorId,
    module: "law",
    action: "law_record_updated",
    targetType: "Law",
    targetId: row._id,
    metadata: { section: row.section },
  });
  return enrichLawRecord(row.toObject());
};

const deleteRecord = async (id, actorId, projectId) => {
  const filter = { _id: id };
  if (projectId) filter.projectId = projectId;
  const row = await Law.findOneAndDelete(filter);
  if (row) {
    await writeAuditTrail({
      userId: actorId,
      module: "law",
      action: "law_record_deleted",
      targetType: "Law",
      targetId: row._id,
      metadata: { section: row.section },
    });
  }
  return row;
};

const mapModuleToLawSection = (moduleKey = "") => {
  const key = String(moduleKey).toLowerCase();
  if (key === "agreements") return "agreements";
  if (key === "policy" || key === "privacy-policy") return "privacy-policy";
  if (key === "disputes") return "disputes-fraud";
  if (key === "ip" || key === "ip-copyright") return "ip-copyright";
  if (key === "third-party") return "third-party";
  if (key === "work-hire") return "work-hire";
  return null;
};

const getModuleDataByProject = async ({ moduleKey, projectId, query = {} }) => {
  const section = mapModuleToLawSection(moduleKey);
  if (!section) {
    const err = new Error("Unsupported law module key");
    err.statusCode = 400;
    throw err;
  }
  const { page, limit, skip } = withPagination(query);
  const filter = { section, projectId };
  if (query.status) filter.status = query.status;
  if (query.search) {
    filter.$or = [
      { title: { $regex: query.search, $options: "i" } },
      { description: { $regex: query.search, $options: "i" } },
      { referenceNumber: { $regex: query.search, $options: "i" } },
    ];
  }
  const [items, total] = await Promise.all([
    Law.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Law.countDocuments(filter),
  ]);
  return { items: items.map(enrichLawRecord), section, projectId, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

module.exports = {
  getOverview,
  listContracts,
  createContract,
  getContractById,
  updateContract,
  deleteContract,
  complianceSnapshot,
  createContractApproval,
  decideContractApproval,
  raiseDispute,
  getSecurityComplianceLogs,
  listProjects,
  getModuleDataByProject,
  listRecords,
  createRecord,
  getRecordById,
  updateRecord,
  deleteRecord,
};
