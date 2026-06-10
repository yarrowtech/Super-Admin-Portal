const Media = require('../../models/department/Media');
const Project = require('../../models/common/Project');
const ActivityLog = require('../../models/auth/ActivityLog');
const { createApprovalRequest, decideApprovalRequest } = require('../../services/approvalEngine.service');
const { writeAuditTrail } = require('../../services/auditTrail.service');

const DEFAULT_APPROVAL_STEPS = [
  { role: 'media' },
  { role: 'team_lead' },
  { role: 'department_head' },
  { role: 'marketing_head' },
  { role: 'client_viewer' },
  { role: 'admin' },
];

const withPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildFilter = (query = {}, projectId) => {
  const filter = {};

  if (projectId) filter.projectId = projectId;
  if (query.section) filter.section = query.section;
  if (query.moduleType) filter.moduleType = query.moduleType;
  if (query.status) filter.status = query.status;
  if (query.priority) filter.priority = query.priority;
  if (query.clientId) filter.clientId = query.clientId;
  if (query.campaignId) filter.campaignId = query.campaignId;
  if (query.approvalStatus) filter.approvalStatus = query.approvalStatus;

  if (query.search) {
    const q = new RegExp(query.search, 'i');
    filter.$or = [
      { title: q },
      { description: q },
      { category: q },
      { tags: q },
      { projectName: q },
      { clientName: q },
      { campaignName: q },
    ];
  }

  return filter;
};

const normalizeMediaPayload = (payload = {}) => {
  const assignedEmployees = Array.isArray(payload.assignedEmployees)
    ? payload.assignedEmployees
        .map((row) => ({
          userId: row?.userId || row?.id || undefined,
          name: String(row?.name || row?.fullName || '').trim(),
          role: String(row?.role || '').trim(),
        }))
        .filter((row) => row.userId || row.name || row.role)
    : [];

  const tags = Array.isArray(payload.tags)
    ? payload.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : typeof payload.tags === 'string'
      ? payload.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [];

  return {
    section: payload.section || 'asset',
    moduleType: payload.moduleType || payload.section || 'asset',
    title: String(payload.title || '').trim(),
    description: String(payload.description || '').trim(),
    status: payload.status || 'Draft',
    priority: payload.priority || 'Medium',
    projectId: payload.projectId || undefined,
    projectName: String(payload.projectName || '').trim(),
    departmentId: payload.departmentId || undefined,
    departmentName: String(payload.departmentName || '').trim(),
    clientId: payload.clientId || undefined,
    clientName: String(payload.clientName || '').trim(),
    teamId: payload.teamId || undefined,
    teamName: String(payload.teamName || '').trim(),
    campaignId: payload.campaignId || undefined,
    campaignName: String(payload.campaignName || '').trim(),
    ownerId: payload.ownerId || undefined,
    ownerName: String(payload.ownerName || '').trim(),
    folderPath: String(payload.folderPath || '').trim(),
    category: String(payload.category || '').trim(),
    tags,
    mimeType: String(payload.mimeType || '').trim(),
    storageProvider: String(payload.storageProvider || 'local').trim(),
    storageKey: String(payload.storageKey || '').trim(),
    storageUrl: String(payload.storageUrl || '').trim(),
    thumbnailUrl: String(payload.thumbnailUrl || '').trim(),
    previewUrl: String(payload.previewUrl || '').trim(),
    fileSizeBytes: toNumber(payload.fileSizeBytes),
    isWatermarked: Boolean(payload.isWatermarked),
    canDownload: payload.canDownload !== undefined ? Boolean(payload.canDownload) : true,
    canShare: payload.canShare !== undefined ? Boolean(payload.canShare) : true,
    expiresAt: payload.expiresAt || undefined,
    publishAt: payload.publishAt || undefined,
    submittedAt: payload.submittedAt || undefined,
    analytics: payload.analytics || {},
    metadata: payload.metadata || {},
    assignedEmployees,
  };
};

const getOverview = async (projectId) => {
  const scope = projectId ? { projectId } : {};
  const now = new Date();
  const inTwoWeeks = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);

  const [
    activeProjectIds,
    runningCampaigns,
    pendingApprovals,
    designRequests,
    videoRequests,
    socialItems,
    contentItems,
    upcomingDeadlines,
    storageAgg,
    spendAgg,
    roiAgg,
    statusRows,
    moduleRows,
    recentItems,
  ] = await Promise.all([
    Media.distinct('projectId', projectId ? { projectId } : { projectId: { $ne: null } }),
    Media.countDocuments({ ...scope, moduleType: 'campaign', status: { $in: ['Live', 'Active', 'Running', 'Scheduled'] } }),
    Media.countDocuments({ ...scope, approvalStatus: 'pending' }),
    Media.countDocuments({ ...scope, moduleType: { $in: ['design'] } }),
    Media.countDocuments({ ...scope, moduleType: { $in: ['video'] } }),
    Media.find({ ...scope, moduleType: 'social' }).select('metadata analytics status').lean(),
    Media.find({ ...scope, moduleType: 'content' }).select('status approvalStatus').lean(),
    Media.countDocuments({ ...scope, dueDate: { $gte: now, $lte: inTwoWeeks } }),
    Media.aggregate([
      { $match: { ...scope } },
      { $group: { _id: null, totalBytes: { $sum: '$storageUsageBytes' } } },
    ]),
    Media.aggregate([
      { $match: { ...scope, moduleType: { $in: ['advertisement', 'campaign'] } } },
      { $group: { _id: null, spend: { $sum: { $ifNull: ['$metadata.spend', 0] } } } },
    ]),
    Media.aggregate([
      { $match: { ...scope, moduleType: { $in: ['advertisement', 'campaign'] } } },
      { $group: { _id: null, roi: { $avg: { $ifNull: ['$metadata.roi', 0] } } } },
    ]),
    Media.aggregate([
      { $match: { ...scope } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Media.aggregate([
      { $match: { ...scope } },
      { $group: { _id: '$moduleType', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
    Media.find(scope).sort({ updatedAt: -1 }).limit(6).lean(),
  ]);

  const totalBytes = storageAgg[0]?.totalBytes || 0;
  const totalSpend = spendAgg[0]?.spend || 0;
  const avgRoi = roiAgg[0]?.roi || 0;

  const socialReach = socialItems.reduce(
    (sum, item) => sum + toNumber(item?.metadata?.reach || item?.analytics?.reach || 0),
    0
  );
  const socialEngagement = socialItems.reduce(
    (sum, item) => sum + toNumber(item?.metadata?.engagement || item?.analytics?.engagement || 0),
    0
  );
  const contentPublished = contentItems.filter((row) => ['Published', 'Live', 'Approved'].includes(row.status)).length;
  const contentInReview = contentItems.filter((row) => ['Pending', 'In Review'].includes(row.status)).length;
  const approvedItems = contentItems.filter((row) => row.approvalStatus === 'approved').length;
  const teamProductivity = (approvedItems + contentPublished) && contentItems.length
    ? Math.round(((approvedItems + contentPublished) / contentItems.length) * 100)
    : 0;

  return {
    kpis: {
      activeProjects: activeProjectIds.filter(Boolean).length,
      runningCampaigns,
      socialReach,
      socialEngagement,
      advertisementSpend: totalSpend,
      marketingRoi: avgRoi,
      contentProductionStatus: {
        published: contentPublished,
        inReview: contentInReview,
        total: contentItems.length,
      },
      pendingApprovals,
      designRequests,
      videoProductionStatus: videoRequests,
      teamProductivity,
      assetStorageUsage: totalBytes,
      assetStorageUsageLabel: `${(totalBytes / (1024 * 1024)).toFixed(1)} MB`,
      upcomingDeadlines,
    },
    charts: {
      statusBreakdown: statusRows.map((row) => ({ name: row._id || 'Unknown', value: row.count })),
      moduleBreakdown: moduleRows.map((row) => ({ name: row._id || 'unknown', value: row.count })),
      recentItems: recentItems.map((item) => ({
        id: String(item._id),
        title: item.title,
        section: item.section,
        status: item.status,
        updatedAt: item.updatedAt,
      })),
      socialPerformance: {
        reach: socialReach,
        engagement: socialEngagement,
      },
    },
  };
};

const listMedia = async (query = {}, projectId, section) => {
  const { page, limit, skip } = withPagination(query);
  const filter = buildFilter(query, projectId);
  if (section) filter.section = section;
  const sortField = String(query.sortBy || 'updatedAt');
  const sortDir = String(query.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;

  const [items, total] = await Promise.all([
    Media.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit).lean(),
    Media.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const listProjects = async (query = {}) => {
  const { page, limit, skip } = withPagination(query);
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const q = new RegExp(query.search, 'i');
    filter.$or = [{ name: q }, { description: q }, { projectCode: q }];
  }

  const [items, total] = await Promise.all([
    Project.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(filter),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const createMediaRecord = async (payload = {}, actorId, projectId, defaults = {}) => {
  const doc = await Media.create({
    ...defaults,
    ...normalizeMediaPayload(payload),
    projectId: projectId || payload.projectId || defaults.projectId,
    createdBy: actorId,
    updatedBy: actorId,
    approvalStatus: 'draft',
    version: {
      current: 'v1.0',
      major: 1,
      minor: 0,
      history: [
        {
          number: 1,
          label: 'v1.0',
          note: 'Initial version',
          changedBy: actorId,
          changedAt: new Date(),
        },
      ],
    },
  });

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'media_record_created',
    targetType: 'Media',
    targetId: doc._id,
    metadata: { section: doc.section, moduleType: doc.moduleType, projectId: doc.projectId },
  });

  return doc;
};

const getMediaRecordById = (id, projectId) =>
  Media.findOne({ _id: id, ...(projectId ? { projectId } : {}) }).lean();

const updateMediaRecord = async (id, payload = {}, actorId, projectId) => {
  const existing = await Media.findOne({ _id: id, ...(projectId ? { projectId } : {}) });
  if (!existing) return null;

  const update = normalizeMediaPayload(payload);
  const shouldBumpVersion = Boolean(payload.versionNote || payload.changeSummary || payload.bumpVersion);

  if (shouldBumpVersion) {
    const nextMinor = Number(existing.version?.minor || 0) + 1;
    const nextMajor = Number(existing.version?.major || 1);
    const nextVersion = `v${nextMajor}.${nextMinor}`;
    existing.version = existing.version || {};
    existing.version.current = nextVersion;
    existing.version.major = nextMajor;
    existing.version.minor = nextMinor;
    existing.version.history = Array.isArray(existing.version.history) ? existing.version.history : [];
    existing.version.history.push({
      number: existing.version.history.length + 1,
      label: nextVersion,
      note: String(payload.versionNote || payload.changeSummary || 'Version updated'),
      changedBy: actorId,
      changedAt: new Date(),
    });
  }

  Object.assign(existing, update, { updatedBy: actorId });
  await existing.save();

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'media_record_updated',
    targetType: 'Media',
    targetId: existing._id,
    metadata: { section: existing.section, moduleType: existing.moduleType, projectId: existing.projectId },
  });

  return existing;
};

const deleteMediaRecord = async (id, projectId, actorId) => {
  const doc = await Media.findOneAndDelete({ _id: id, ...(projectId ? { projectId } : {}) });
  if (!doc) return null;

  await writeAuditTrail({
    userId: actorId,
    module: 'media',
    action: 'media_record_deleted',
    targetType: 'Media',
    targetId: doc._id,
    metadata: { section: doc.section, moduleType: doc.moduleType, projectId: doc.projectId },
  });

  return doc;
};

const mapModuleKeyToSection = (moduleKey = '') => {
  const key = String(moduleKey).toLowerCase();
  if (key === 'dashboard') return 'dashboard';
  if (key === 'assets' || key === 'asset') return 'asset';
  if (key === 'campaigns' || key === 'campaign') return 'campaign';
  if (key === 'content') return 'content';
  if (key === 'brand') return 'brand';
  if (key === 'design') return 'design';
  if (key === 'video') return 'video';
  if (key === 'social') return 'social';
  if (key === 'ads' || key === 'advertisements' || key === 'advertisement') return 'advertisement';
  if (key === 'seo') return 'seo';
  if (key === 'website') return 'website';
  if (key === 'testimonials' || key === 'testimonial') return 'testimonial';
  if (key === 'case-studies' || key === 'case-study') return 'case-study';
  if (key === 'approvals') return 'approval';
  if (key === 'reports' || key === 'reporting') return 'report';
  if (key === 'archive') return 'archive';
  return null;
};

const getModuleDataByProject = async ({ moduleKey, projectId, query = {} }) => {
  const section = mapModuleKeyToSection(moduleKey);
  if (!section) {
    const err = new Error('Unsupported media module key');
    err.statusCode = 400;
    throw err;
  }

  return listMedia(query, projectId, section);
};

const requestApproval = async ({ mediaId, requestedBy, steps = DEFAULT_APPROVAL_STEPS }) => {
  const record = await Media.findById(mediaId);
  if (!record) {
    const err = new Error('Media record not found');
    err.statusCode = 404;
    throw err;
  }

  const workflow = await createApprovalRequest({
    module: 'media',
    entityType: 'media',
    entityId: record._id,
    requestedBy,
    steps,
  });

  record.approvalWorkflowId = workflow._id;
  record.approvalStatus = 'pending';
  record.status = 'In Review';
  record.submittedAt = new Date();
  record.approvalSteps = workflow.steps.map((step) => ({
    role: step.role,
    status: step.status,
    decidedBy: step.decidedBy,
    decidedAt: step.decidedAt,
    remarks: step.remarks || '',
  }));
  record.updatedBy = requestedBy;
  await record.save();

  await writeAuditTrail({
    userId: requestedBy,
    module: 'media',
    action: 'media_approval_requested',
    targetType: 'ApprovalWorkflow',
    targetId: workflow._id,
    metadata: { mediaId: record._id, projectId: record.projectId },
  });

  return workflow;
};

const decideApproval = async ({ workflowId, actorId, actorRole, decision, remarks }) => {
  const workflow = await decideApprovalRequest({
    workflowId,
    role: actorRole,
    userId: actorId,
    decision,
    remarks,
  });

  const media = await Media.findOne({ approvalWorkflowId: workflow._id });
  if (media) {
    media.approvalStatus = workflow.status;
    media.approvalSteps = workflow.steps.map((step) => ({
      role: step.role,
      status: step.status,
      decidedBy: step.decidedBy,
      decidedAt: step.decidedAt,
      remarks: step.remarks || '',
    }));
    if (workflow.status === 'approved') {
      media.status = 'Approved';
      media.approvedAt = new Date();
    } else if (workflow.status === 'rejected') {
      media.status = 'Needs Revision';
      media.rejectedAt = new Date();
    } else {
      media.status = 'In Review';
    }
    media.updatedBy = actorId;
    await media.save();
  }

  await writeAuditTrail({
    userId: actorId,
    role: actorRole,
    module: 'media',
    action: 'media_approval_decided',
    targetType: 'ApprovalWorkflow',
    targetId: workflow._id,
    metadata: { decision, remarks, workflowStatus: workflow.status },
  });

  return workflow;
};

const getReportingSummary = async (projectId) => {
  const scope = projectId ? { projectId } : {};
  const [byStatus, byType, auditRows, recentItems] = await Promise.all([
    Media.aggregate([{ $match: { ...scope } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
    Media.aggregate([{ $match: { ...scope } }, { $group: { _id: '$moduleType', count: { $sum: 1 } } }]),
    ActivityLog.find({
      module: 'media',
      ...(projectId ? { $or: [{ projectId }, { 'metadata.projectId': projectId }] } : {}),
    })
      .sort({ createdAt: -1 })
      .limit(25)
      .lean(),
    Media.find(scope).sort({ updatedAt: -1 }).limit(10).lean(),
  ]);

  return {
    byStatus,
    byType,
    auditRows,
    recentItems,
  };
};

module.exports = {
  getOverview,
  listMedia,
  listProjects,
  createMediaRecord,
  getMediaRecordById,
  updateMediaRecord,
  deleteMediaRecord,
  getModuleDataByProject,
  requestApproval,
  decideApproval,
  getReportingSummary,
};
