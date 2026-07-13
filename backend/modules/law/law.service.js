const Law = require("../../models/department/Law");
const LawContract = require("../../models/law/LawContract");
const Invoice = require("../../models/finance/Invoice");
const ActivityLog = require("../../models/auth/ActivityLog");
const Project = require("../../models/common/Project");
const { createApprovalRequest, decideApprovalRequest } = require("../../services/approvalEngine.service");
const { writeAuditTrail } = require("../../services/auditTrail.service");

const withPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
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
  LawContract.findOneAndUpdate({ _id: id, projectId }, { ...payload, updatedBy: actorId }, { new: true });
const deleteContract = async (id, projectId) => LawContract.findOneAndDelete({ _id: id, projectId });

const complianceSnapshot = async (projectId) => {
  const scope = projectId ? { projectId } : {};
  const [complianceRows, invoices] = await Promise.all([
    Law.find({ ...scope, section: { $in: ["compliance", "privacy-policy"] } }).sort({ updatedAt: -1 }).limit(10).lean(),
    Invoice.find({ ...scope, status: { $in: ["overdue", "pending"] } }).sort({ createdAt: -1 }).limit(10).lean(),
  ]);
  return { complianceRows, financeInvoices: invoices };
};

const createContractApproval = async ({ contractId, requestedBy }) => {
  const workflow = await createApprovalRequest({
    module: "law",
    entityType: "contract",
    entityId: contractId,
    requestedBy,
    steps: [{ role: "legal_head" }, { role: "admin" }],
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

const listProjects = async (query = {}) => {
  const { page, limit, skip } = withPagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const q = new RegExp(query.search, "i");
    filter.$or = [{ name: q }, { description: q }];
  }
  const [items, total] = await Promise.all([
    Project.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
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
  return { items, section, projectId, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
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
};
