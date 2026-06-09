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

const escapeRegExp = (value = "") => String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSort = (query = {}, fallback = { createdAt: -1 }) => {
  const sortBy = String(query.sortBy || "").trim();
  const sortOrder = String(query.sortOrder || query.order || "desc").toLowerCase();
  if (!sortBy) return fallback;
  return { [sortBy]: sortOrder === "asc" ? 1 : -1 };
};

const buildSearchFilter = (fields = [], query = {}) => {
  const search = String(query.search || query.q || "").trim();
  if (!search) return {};
  const regex = new RegExp(escapeRegExp(search), "i");
  return { $or: fields.map((field) => ({ [field]: regex })) };
};

const getOverview = async (projectId) => {
  const scope = projectId ? { projectId } : {};
  const [activeUsers, assets, openTickets, securityAlerts] = await Promise.all([
    User.countDocuments({ isActive: true }),
    ITAsset.countDocuments(scope),
    ITTicket.countDocuments({ ...scope, status: { $in: ["open", "in-progress"] } }),
    ActivityLog.countDocuments({ action: { $regex: "failed|blocked|suspicious", $options: "i" } }),
  ]);
  const [maintenanceAssets, retiredAssets, criticalTickets] = await Promise.all([
    ITAsset.countDocuments({ ...scope, status: "maintenance" }),
    ITAsset.countDocuments({ ...scope, status: "retired" }),
    ITTicket.countDocuments({ ...scope, priority: "critical", status: { $nin: ["resolved", "closed"] } }),
  ]);

  const healthScore = Math.max(
    42,
    Math.min(
      100,
      Math.round(100 - openTickets * 2 - securityAlerts * 1.5 - criticalTickets * 4 + Math.min(activeUsers / 4, 12))
    )
  );

  const infrastructureScore = Math.max(
    40,
    Math.min(100, Math.round(92 - maintenanceAssets * 3 - retiredAssets * 1.5 + Math.min(assets / 8, 10)))
  );

  const securityScore = Math.max(
    35,
    Math.min(100, Math.round(96 - securityAlerts * 2 - criticalTickets * 5 + Math.min(activeUsers / 8, 8)))
  );

  return {
    activeUsers,
    assets,
    openTickets,
    securityAlerts,
    criticalTickets,
    healthScore,
    infrastructureScore,
    securityScore,
    resourceForecast: {
      next30Days: Math.max(assets, Math.round(assets * 1.05)),
      next90Days: Math.max(assets, Math.round(assets * 1.14)),
    },
    costOptimization: {
      recyclableAssets: retiredAssets,
      maintenanceAssets,
      potentialSavings: Math.max(0, retiredAssets * 250 + maintenanceAssets * 75),
    },
    recentActivity: {
      signalCount: securityAlerts + criticalTickets + openTickets,
      trend: [Math.max(0, openTickets - 2), openTickets, Math.max(0, openTickets - 1), Math.max(0, securityAlerts - 1)],
    },
  };
};

const listAssets = async (query = {}, projectId) => {
  const { page, limit, skip } = withPagination(query);
  const filter = projectId ? { projectId } : {};
  if (query.status) filter.status = query.status;
  if (query.type) filter.type = query.type;
  Object.assign(filter, buildSearchFilter(["assetTag", "name", "type", "status", "department"], query));
  const sort = buildSort(query, { createdAt: -1 });
  const [items, total] = await Promise.all([
    ITAsset.find(filter).sort(sort).skip(skip).limit(limit).lean(),
    ITAsset.countDocuments(filter),
  ]);
  const [active, maintenance, retired] = await Promise.all([
    ITAsset.countDocuments({ ...filter, status: "active" }),
    ITAsset.countDocuments({ ...filter, status: "maintenance" }),
    ITAsset.countDocuments({ ...filter, status: "retired" }),
  ]);
  const storageAgg = await ITAsset.aggregate([
    { $match: filter },
    {
      $project: {
        size: { $ifNull: ["$storageUsageBytes", { $ifNull: ["$fileSizeBytes", 0] }] },
      },
    },
    { $group: { _id: null, total: { $sum: "$size" } } },
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: { total, active, maintenance, retired, storageUsageBytes: storageAgg?.[0]?.total || 0 },
  };
};

const createAsset = async (payload = {}, actorId, projectId) =>
  ITAsset.create({ ...payload, projectId, createdBy: actorId, updatedBy: actorId });
const getAssetById = async (id, projectId) => ITAsset.findOne({ _id: id, projectId }).lean();
const updateAsset = async (id, payload = {}, actorId, projectId) =>
  ITAsset.findOneAndUpdate({ _id: id, projectId }, { ...payload, updatedBy: actorId }, { new: true });
const deleteAsset = async (id, projectId) => ITAsset.findOneAndDelete({ _id: id, projectId });

const listTickets = async (query = {}, projectId) => {
  const { page, limit, skip } = withPagination(query);
  const filter = projectId ? { projectId } : {};
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.category) filter.category = query.category;
  Object.assign(filter, buildSearchFilter(["title", "description", "priority", "status", "category"], query));
  const sort = buildSort(query, { createdAt: -1 });
  const [items, total] = await Promise.all([
    ITTicket.find(filter)
      .populate("requester", "firstName lastName email")
      .populate("assignedTo", "firstName lastName email")
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    ITTicket.countDocuments(filter),
  ]);
  const [open, inProgress, resolved, closed] = await Promise.all([
    ITTicket.countDocuments({ ...filter, status: "open" }),
    ITTicket.countDocuments({ ...filter, status: "in-progress" }),
    ITTicket.countDocuments({ ...filter, status: "resolved" }),
    ITTicket.countDocuments({ ...filter, status: "closed" }),
  ]);
  return {
    items,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
    summary: { total, open, inProgress, resolved, closed },
  };
};

const createTicket = async (payload = {}, requesterId, projectId) => ITTicket.create({ ...payload, projectId, requester: requesterId });
const getTicketById = async (id, projectId) => ITTicket.findOne({ _id: id, projectId }).populate("requester assignedTo", "firstName lastName email").lean();
const updateTicket = async (id, payload = {}, projectId) => ITTicket.findOneAndUpdate({ _id: id, projectId }, payload, { new: true });
const deleteTicket = async (id, projectId) => ITTicket.findOneAndDelete({ _id: id, projectId });

const updateTicketStatus = async ({ id, status, actor, projectId }) => {
  const updated = await ITTicket.findOneAndUpdate({ _id: id, projectId }, { status }, { new: true });
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
