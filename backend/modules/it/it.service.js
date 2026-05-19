const User = require("../../models/auth/User");
const ActivityLog = require("../../models/auth/ActivityLog");
const ITAsset = require("../../models/it/ITAsset");
const ITTicket = require("../../models/it/ITTicket");
const { createApprovalRequest, decideApprovalRequest } = require("../../services/approvalEngine.service");
const { writeAuditTrail } = require("../../services/auditTrail.service");

const withPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const getOverview = async () => {
  const [activeUsers, assets, openTickets, securityAlerts] = await Promise.all([
    User.countDocuments({ isActive: true }),
    ITAsset.countDocuments(),
    ITTicket.countDocuments({ status: { $in: ["open", "in-progress"] } }),
    ActivityLog.countDocuments({ action: { $regex: "failed|blocked|suspicious", $options: "i" } }),
  ]);
  return { activeUsers, assets, openTickets, securityAlerts };
};

const listAssets = async (query = {}) => {
  const { page, limit, skip } = withPagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  const [items, total] = await Promise.all([
    ITAsset.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    ITAsset.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

const createAsset = async (payload = {}, actorId) =>
  ITAsset.create({ ...payload, createdBy: actorId, updatedBy: actorId });
const getAssetById = async (id) => ITAsset.findById(id).lean();
const updateAsset = async (id, payload = {}, actorId) =>
  ITAsset.findByIdAndUpdate(id, { ...payload, updatedBy: actorId }, { new: true });
const deleteAsset = async (id) => ITAsset.findByIdAndDelete(id);

const listTickets = async (query = {}) => {
  const { page, limit, skip } = withPagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  const [items, total] = await Promise.all([
    ITTicket.find(filter)
      .populate("requester", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    ITTicket.countDocuments(filter),
  ]);
  return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 } };
};

const createTicket = async (payload = {}, requesterId) => ITTicket.create({ ...payload, requester: requesterId });
const getTicketById = async (id) => ITTicket.findById(id).populate("requester assignedTo", "firstName lastName email").lean();
const updateTicket = async (id, payload = {}) => ITTicket.findByIdAndUpdate(id, payload, { new: true });
const deleteTicket = async (id) => ITTicket.findByIdAndDelete(id);

const updateTicketStatus = async ({ id, status, actor }) => {
  const updated = await ITTicket.findByIdAndUpdate(id, { status }, { new: true });
  if (!updated) return null;
  await writeAuditTrail({
    userId: actor.id,
    role: actor.role,
    module: "it",
    action: "it_ticket_status_updated",
    targetType: "ITTicket",
    targetId: updated._id,
    metadata: { status },
    ipAddress: actor.ipAddress,
    userAgent: actor.userAgent,
  });
  return updated;
};

const requestSystemAccess = async ({ requesterId, targetUserId, accessScope }) => {
  const workflow = await createApprovalRequest({
    module: "it",
    entityType: "system_access",
    entityId: targetUserId,
    requestedBy: requesterId,
    steps: [{ role: "it_admin" }, { role: "admin" }],
  });
  await writeAuditTrail({
    userId: requesterId,
    module: "it",
    action: "it_access_request_created",
    targetType: "ApprovalWorkflow",
    targetId: workflow._id,
    metadata: { targetUserId, accessScope },
  });
  return workflow;
};

const decideSystemAccess = async ({ workflowId, actorRole, actorId, decision, remarks }) => {
  const workflow = await decideApprovalRequest({
    workflowId,
    role: actorRole,
    userId: actorId,
    decision,
    remarks,
  });
  await writeAuditTrail({
    userId: actorId,
    role: actorRole,
    module: "it",
    action: "it_access_request_decision",
    targetType: "ApprovalWorkflow",
    targetId: workflow._id,
    metadata: { decision, remarks },
  });
  return workflow;
};

module.exports = {
  getOverview,
  listAssets,
  createAsset,
  getAssetById,
  updateAsset,
  deleteAsset,
  listTickets,
  createTicket,
  getTicketById,
  updateTicket,
  deleteTicket,
  updateTicketStatus,
  requestSystemAccess,
  decideSystemAccess,
};
