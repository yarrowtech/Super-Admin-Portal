const Campaign = require('../../models/department/Campaign');
const Task = require('../../models/common/Task');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const { generateTasksForCampaign } = require('./campaignTask.service');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const withPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const exactTextFilter = (value) => {
  const normalized = String(value || '').trim();
  return normalized ? new RegExp(`^${escapeRegex(normalized)}$`, 'i') : undefined;
};

const buildFilter = (query = {}, projectId) => {
  const filter = {};

  if (projectId) filter.projectId = projectId;
  if (query.status && String(query.status).toLowerCase() !== 'all') {
    filter.status = exactTextFilter(query.status);
  }

  if (query.search) {
    const q = new RegExp(escapeRegex(query.search), 'i');
    filter.$or = [{ name: q }, { objective: q }, { description: q }];
  }

  return filter;
};

const ALLOWED_SORT_FIELDS = new Set(['createdAt', 'updatedAt', 'name', 'status', 'startDate', 'endDate', 'budgetAllocated']);

const normalizeCampaignPayload = (payload = {}) => {
  const platform = Array.isArray(payload.platform)
    ? payload.platform.map((item) => String(item || '').trim()).filter(Boolean)
    : typeof payload.platform === 'string'
      ? payload.platform.split(',').map((item) => item.trim()).filter(Boolean)
      : [];

  const teamMembers = Array.isArray(payload.teamMembers)
    ? payload.teamMembers
        .map((row) => ({
          userId: row?.userId || row?.id || undefined,
          name: String(row?.name || row?.fullName || '').trim(),
          role: String(row?.role || '').trim(),
        }))
        .filter((row) => row.userId || row.name || row.role)
    : [];

  return {
    name: String(payload.name || '').trim(),
    objective: String(payload.objective || '').trim(),
    description: String(payload.description || '').trim(),
    platform,
    status: payload.status || undefined,
    budgetAllocated: Number.isFinite(Number(payload.budgetAllocated)) ? Number(payload.budgetAllocated) : undefined,
    teamMembers,
    startDate: payload.startDate || undefined,
    endDate: payload.endDate || undefined,
    kpiTargets: payload.kpiTargets || undefined,
    projectName: String(payload.projectName || '').trim() || undefined,
  };
};

const stripUndefined = (obj = {}) =>
  Object.fromEntries(Object.entries(obj).filter(([, value]) => value !== undefined));

const listCampaigns = async (query = {}, projectId) => {
  const { page, limit, skip } = withPagination(query);
  const filter = buildFilter(query, projectId);
  const requestedSortField = String(query.sortBy || 'updatedAt');
  const sortField = ALLOWED_SORT_FIELDS.has(requestedSortField) ? requestedSortField : 'updatedAt';
  const sortDir = String(query.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Campaign.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean(),
    Campaign.countDocuments(filter),
  ]);

  return {
    items,
    campaigns: items, // both keys: MediaWorkspace reads .items, MediaDashboard reads .campaigns
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const getCampaignById = (id, projectId) =>
  Campaign.findOne({ _id: id, ...(projectId ? { projectId } : {}) }).lean();

const createCampaign = async (payload = {}, actorId, projectId) => {
  const normalized = stripUndefined(normalizeCampaignPayload(payload));
  const doc = await Campaign.create({
    ...normalized,
    projectId: projectId || payload.projectId,
    createdBy: actorId,
    updatedBy: actorId,
    lifecycleHistory: [{ stage: normalized.status || 'draft', enteredAt: new Date(), actorId }],
  });

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'campaign_created',
    targetType: 'Campaign',
    targetId: doc._id,
    metadata: { projectId: doc.projectId, status: doc.status },
  });

  return doc;
};

const updateCampaign = async (id, payload = {}, actorId, projectId) => {
  const existing = await Campaign.findOne({ _id: id, ...(projectId ? { projectId } : {}) });
  if (!existing) return null;

  Object.assign(existing, stripUndefined(normalizeCampaignPayload(payload)), { updatedBy: actorId });
  await existing.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'campaign_updated',
    targetType: 'Campaign',
    targetId: existing._id,
    metadata: { projectId: existing.projectId, status: existing.status },
  });

  return existing;
};

const advanceLifecycleStage = async (id, targetStage, actorId, projectId) => {
  const existing = await Campaign.findOne({ _id: id, ...(projectId ? { projectId } : {}) });
  if (!existing) return null;

  const statuses = Campaign.CAMPAIGN_STATUSES;
  const currentIndex = statuses.indexOf(existing.status);
  const targetIndex = statuses.indexOf(targetStage);

  if (targetIndex === -1) {
    const err = new Error('Invalid campaign stage');
    err.statusCode = 400;
    throw err;
  }

  const isForwardStep = targetIndex === currentIndex + 1;
  const isEarlyClose = targetStage === 'closed' && existing.status !== 'closed';

  if (!isForwardStep && !isEarlyClose) {
    const err = new Error(
      `Cannot move campaign from "${existing.status}" to "${targetStage}" — campaigns advance one stage at a time (or close early).`
    );
    err.statusCode = 400;
    throw err;
  }

  const fromStage = existing.status;
  existing.status = targetStage;
  existing.lifecycleHistory = Array.isArray(existing.lifecycleHistory) ? existing.lifecycleHistory : [];
  existing.lifecycleHistory.push({ stage: targetStage, enteredAt: new Date(), actorId });
  existing.updatedBy = actorId;
  await existing.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'campaign_stage_advanced',
    targetType: 'Campaign',
    targetId: existing._id,
    metadata: { projectId: existing.projectId, fromStage, toStage: targetStage },
  });

  if (targetStage === 'content-in-progress') {
    await generateTasksForCampaign(existing, actorId);
  }

  return existing;
};

const deleteCampaign = async (id, projectId, actorId) => {
  const doc = await Campaign.findOneAndDelete({ _id: id, ...(projectId ? { projectId } : {}) });
  if (!doc) return null;

  const { deletedCount } = await Task.deleteMany({ campaignId: doc._id });

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'campaign_deleted',
    targetType: 'Campaign',
    targetId: doc._id,
    metadata: { projectId: doc.projectId, tasksDeleted: deletedCount },
  });

  return doc;
};

module.exports = {
  listCampaigns,
  getCampaignById,
  createCampaign,
  updateCampaign,
  advanceLifecycleStage,
  deleteCampaign,
};
