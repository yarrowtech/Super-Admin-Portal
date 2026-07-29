const { v2: cloudinary } = require('cloudinary');
const { mediaLogger: logger } = require('./media.logger');
const Media = require('../../models/department/Media');
const Project = require('../../models/common/Project');
const Campaign = require('../../models/department/Campaign');
const ActivityLog = require('../../models/auth/ActivityLog');
const { createApprovalRequest, decideApprovalRequest } = require('../../services/approvalEngine.service');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const { notifyApprovalPending } = require('../../services/notificationTrigger.service');
const { PROJECT_REGISTRY } = require('../../utils/projectAccess');

if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
}

// Content-approval pipeline: Draft -> Designer -> Content Writer -> Marketing Head -> CEO (optional) -> Scheduled -> Published
const DEFAULT_APPROVAL_STEPS = [
  { role: 'graphic_designer' },
  { role: 'content_writer' },
  { role: 'marketing_head' },
  { role: 'ceo', optional: true },
];
const MEDIA_APPROVAL_OVERRIDE_ROLES = ['admin', 'super_admin', 'ceo', 'department_head'];

const MEDIA_DEPARTMENT_STRUCTURE = {
  department: 'MEDIA ON & OFFLINE',
  summary:
    'Centralizes branding, promotions, advertising, marketing materials, and communication across digital and traditional channels.',
  purpose:
    'The department aligns communication, brand consistency, promotional output, and creative delivery so campaigns stay coordinated end to end.',
  teams: [
    {
      name: 'Branding Officer',
      description: 'Manages brand identity, visual consistency, and brand campaigns.',
      responsibilities: [
        'Brand guidelines',
        'Logo and visual consistency',
        'Brand positioning',
      ],
    },
    {
      name: 'Marketing',
      description: 'Plans and executes campaigns to promote products and services.',
      responsibilities: [
        'Campaign planning',
        'Lead generation',
        'Customer engagement',
      ],
    },
    {
      name: 'PR',
      description: 'Handles public communication, press releases, and media relations.',
      responsibilities: [
        'Press releases',
        'Public image',
        'External stakeholders',
      ],
    },
    {
      name: 'Sales',
      description: 'Supports revenue growth through lead conversion and client coordination.',
      responsibilities: [
        'Lead conversion',
        'Client relationships',
        'Sales targets',
      ],
    },
    {
      name: 'FAQs',
      description: 'Creates customer support documentation and response libraries.',
      responsibilities: [
        'FAQ content',
        'Support documentation',
        'Customer query handling',
      ],
    },
    {
      name: 'Graphics',
      description: 'Designs visuals for online and offline marketing use.',
      responsibilities: [
        'Social media assets',
        'Brochures and posters',
        'Presentations and ads',
      ],
    },
  ],
  reportingStructure: [
    'MEDIA ON & OFFLINE',
    'Branding Officer',
    'Marketing',
    'PR',
    'Sales',
    'FAQs',
    'Graphics',
  ],
};

const withPagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 20, 1), 200);
  return { page, limit, skip: (page - 1) * limit };
};

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const buildAllowedProjectFilter = () => {
  const projectTokens = PROJECT_REGISTRY.flatMap((project) => [
    project.code,
    project.name,
    ...(Array.isArray(project.aliases) ? project.aliases : []),
  ])
    .map((token) => String(token || '').trim())
    .filter(Boolean);

  const tokenMatches = projectTokens.map((token) => new RegExp(`^${escapeRegex(token)}$`, 'i'));

  return {
    $or: [
      { name: { $in: tokenMatches } },
      { projectCode: { $in: tokenMatches } },
    ],
  };
};

const toNumber = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const exactTextFilter = (value) => {
  const normalized = String(value || '').trim();
  return normalized ? new RegExp(`^${escapeRegex(normalized)}$`, 'i') : undefined;
};

const buildFilter = (query = {}, projectId) => {
  const filter = {};

  if (projectId) filter.projectId = projectId;
  if (query.section) filter.section = exactTextFilter(query.section);
  if (query.moduleType) filter.moduleType = exactTextFilter(query.moduleType);
  if (query.status && String(query.status).toLowerCase() !== 'all') filter.status = exactTextFilter(query.status);
  if (query.priority && String(query.priority).toLowerCase() !== 'all') filter.priority = exactTextFilter(query.priority);
  if (query.clientId) filter.clientId = query.clientId;
  if (query.campaignId) filter.campaignId = query.campaignId;
  if (query.approvalStatus && String(query.approvalStatus).toLowerCase() !== 'all') {
    filter.approvalStatus = exactTextFilter(query.approvalStatus);
  }

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

const normalizeMediaPayload = (payload = {}, existing = null) => {
  const source = existing && typeof existing.toObject === 'function'
    ? existing.toObject()
    : (existing || {});
  const isUpdate = Boolean(existing);

  const assignedEmployees = Array.isArray(payload.assignedEmployees)
    ? payload.assignedEmployees
        .map((row) => ({
          userId: row?.userId || row?.id || undefined,
          name: String(row?.name || row?.fullName || '').trim(),
          role: String(row?.role || '').trim(),
        }))
        .filter((row) => row.userId || row.name || row.role)
    : isUpdate && Array.isArray(source.assignedEmployees)
      ? source.assignedEmployees
      : [];

  const tags = Array.isArray(payload.tags)
    ? payload.tags.map((tag) => String(tag || '').trim()).filter(Boolean)
    : typeof payload.tags === 'string'
      ? payload.tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : isUpdate && Array.isArray(source.tags)
        ? source.tags
        : [];

  return {
    section: payload.section !== undefined
      ? String(payload.section || 'asset').trim() || 'asset'
      : (isUpdate ? source.section : 'asset'),
    moduleType: payload.moduleType !== undefined
      ? String(payload.moduleType || payload.section || 'asset').trim() || 'asset'
      : (isUpdate ? source.moduleType : 'asset'),
    title: payload.title !== undefined ? String(payload.title || '').trim() : (isUpdate ? source.title : ''),
    description: payload.description !== undefined ? String(payload.description || '').trim() : (isUpdate ? source.description : ''),
    status: payload.status !== undefined ? String(payload.status || '').trim() : (isUpdate ? source.status : 'Draft'),
    priority: payload.priority !== undefined ? String(payload.priority || '').trim() : (isUpdate ? source.priority : 'Medium'),
    projectId: payload.projectId !== undefined ? payload.projectId || undefined : (isUpdate ? source.projectId : undefined),
    projectName: payload.projectName !== undefined ? String(payload.projectName || '').trim() : (isUpdate ? source.projectName : ''),
    departmentId: payload.departmentId !== undefined ? payload.departmentId || undefined : (isUpdate ? source.departmentId : undefined),
    departmentName: payload.departmentName !== undefined ? String(payload.departmentName || '').trim() : (isUpdate ? source.departmentName : ''),
    clientId: payload.clientId !== undefined ? payload.clientId || undefined : (isUpdate ? source.clientId : undefined),
    clientName: payload.clientName !== undefined ? String(payload.clientName || '').trim() : (isUpdate ? source.clientName : ''),
    teamId: payload.teamId !== undefined ? payload.teamId || undefined : (isUpdate ? source.teamId : undefined),
    teamName: payload.teamName !== undefined ? String(payload.teamName || '').trim() : (isUpdate ? source.teamName : ''),
    campaignId: payload.campaignId !== undefined ? payload.campaignId || undefined : (isUpdate ? source.campaignId : undefined),
    campaignName: payload.campaignName !== undefined ? String(payload.campaignName || '').trim() : (isUpdate ? source.campaignName : ''),
    budgetImpact: {
      spend: toNumber(
        payload.budgetImpact?.spend ?? payload.spend ?? (isUpdate ? source.budgetImpact?.spend : 0)
      ),
      roiAtSnapshot: toNumber(
        payload.budgetImpact?.roiAtSnapshot ?? payload.roi ?? (isUpdate ? source.budgetImpact?.roiAtSnapshot : 0)
      ),
    },
    ownerId: payload.ownerId !== undefined ? payload.ownerId || undefined : (isUpdate ? source.ownerId : undefined),
    ownerName: payload.ownerName !== undefined ? String(payload.ownerName || '').trim() : (isUpdate ? source.ownerName : ''),
    folderPath: payload.folderPath !== undefined ? String(payload.folderPath || '').trim() : (isUpdate ? source.folderPath : ''),
    category: payload.category !== undefined ? String(payload.category || '').trim() : (isUpdate ? source.category : ''),
    tags,
    mimeType: payload.mimeType !== undefined ? String(payload.mimeType || '').trim() : (isUpdate ? source.mimeType : ''),
    storageProvider: payload.storageProvider !== undefined ? String(payload.storageProvider || 'local').trim() || 'local' : (isUpdate ? source.storageProvider : 'local'),
    storageKey: payload.storageKey !== undefined ? String(payload.storageKey || '').trim() : (isUpdate ? source.storageKey : ''),
    storageUrl: payload.storageUrl !== undefined ? String(payload.storageUrl || '').trim() : (isUpdate ? source.storageUrl : ''),
    thumbnailUrl: payload.thumbnailUrl !== undefined ? String(payload.thumbnailUrl || '').trim() : (isUpdate ? source.thumbnailUrl : ''),
    previewUrl: payload.previewUrl !== undefined ? String(payload.previewUrl || '').trim() : (isUpdate ? source.previewUrl : ''),
    fileSizeBytes: payload.fileSizeBytes !== undefined ? toNumber(payload.fileSizeBytes) : (isUpdate ? source.fileSizeBytes : 0),
    storageUsageBytes: payload.fileSizeBytes !== undefined
      ? toNumber(payload.fileSizeBytes)
      : (isUpdate ? source.storageUsageBytes : 0),
    isWatermarked: payload.isWatermarked !== undefined ? Boolean(payload.isWatermarked) : (isUpdate ? source.isWatermarked : false),
    canDownload: payload.canDownload !== undefined ? Boolean(payload.canDownload) : (isUpdate ? source.canDownload : true),
    canShare: payload.canShare !== undefined ? Boolean(payload.canShare) : (isUpdate ? source.canShare : true),
    expiresAt: payload.expiresAt !== undefined ? payload.expiresAt || undefined : (isUpdate ? source.expiresAt : undefined),
    publishAt: payload.publishAt !== undefined ? payload.publishAt || undefined : (isUpdate ? source.publishAt : undefined),
    submittedAt: payload.submittedAt !== undefined ? payload.submittedAt || undefined : (isUpdate ? source.submittedAt : undefined),
    analytics: payload.analytics !== undefined ? payload.analytics : (isUpdate ? source.analytics : {}),
    metadata: payload.metadata !== undefined ? payload.metadata : (isUpdate ? source.metadata : {}),
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
    socialMetrics,
    contentPublished,
    contentInReview,
    approvedItems,
    contentTotal,
    upcomingDeadlines,
    storageAgg,
    spendAgg,
    roiAgg,
    statusRows,
    moduleRows,
    recentItems,
  ] = await Promise.all([
    Media.distinct('projectId', projectId ? { projectId } : { projectId: { $ne: null } }),
    Campaign.countDocuments({ ...scope, status: { $in: Campaign.RUNNING_CAMPAIGN_STATUSES } }),
    Media.countDocuments({ ...scope, approvalStatus: 'pending' }),
    Media.countDocuments({ ...scope, moduleType: { $in: ['design'] } }),
    Media.countDocuments({ ...scope, moduleType: { $in: ['video'] } }),
    Media.aggregate([
      { $match: { ...scope, moduleType: 'social' } },
      {
        $group: {
          _id: null,
          reach: { $sum: { $ifNull: ['$metadata.reach', '$analytics.reach'] } },
          engagement: { $sum: { $ifNull: ['$metadata.engagement', '$analytics.engagement'] } },
        },
      },
    ]),
    Media.countDocuments({ ...scope, moduleType: 'content', status: { $in: ['Published', 'Live', 'Approved'] } }),
    Media.countDocuments({ ...scope, moduleType: 'content', status: { $in: ['Pending', 'In Review'] } }),
    Media.countDocuments({ ...scope, moduleType: 'content', approvalStatus: 'approved' }),
    Media.countDocuments({ ...scope, moduleType: 'content' }),
    Media.countDocuments({ ...scope, dueDate: { $gte: now, $lte: inTwoWeeks } }),
    Media.aggregate([
      { $match: { ...scope } },
      { $group: { _id: null, totalBytes: { $sum: '$storageUsageBytes' } } },
    ]),
    Media.aggregate([
      { $match: { ...scope, moduleType: 'advertisement' } },
      { $group: { _id: null, spend: { $sum: { $ifNull: ['$budgetImpact.spend', 0] } } } },
    ]),
    Media.aggregate([
      { $match: { ...scope, moduleType: 'advertisement' } },
      { $group: { _id: null, roi: { $avg: { $ifNull: ['$budgetImpact.roiAtSnapshot', 0] } } } },
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
    Media.find(scope).select('title section status updatedAt').sort({ updatedAt: -1 }).limit(6).lean(),
  ]);

  const totalBytes = storageAgg[0]?.totalBytes || 0;
  const totalSpend = spendAgg[0]?.spend || 0;
  const avgRoi = roiAgg[0]?.roi || 0;
  const socialReach = socialMetrics[0]?.reach || 0;
  const socialEngagement = socialMetrics[0]?.engagement || 0;

  const teamProductivity = (approvedItems + contentPublished) && contentTotal
    ? Math.round(((approvedItems + contentPublished) / contentTotal) * 100)
    : 0;

  return {
    departmentStructure: MEDIA_DEPARTMENT_STRUCTURE,
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
        total: contentTotal,
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
  const allowedSortFields = new Set(['createdAt', 'updatedAt', 'title', 'status', 'priority', 'publishAt', 'submittedAt']);
  const requestedSortField = String(query.sortBy || 'updatedAt');
  const sortField = allowedSortFields.has(requestedSortField) ? requestedSortField : 'updatedAt';
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
  const clauses = [buildAllowedProjectFilter()];
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const q = new RegExp(escapeRegex(query.search), 'i');
    clauses.push({ $or: [{ name: q }, { description: q }, { projectCode: q }] });
  }
  if (Object.keys(filter).length > 0) clauses.push(filter);

  const projectFilter = clauses.length > 1 ? { $and: clauses } : (clauses[0] || {});

  const [items, total] = await Promise.all([
    Project.find(projectFilter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Project.countDocuments(projectFilter),
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
    ...normalizeMediaPayload(payload),
    ...defaults,
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

const buildRecordScope = (id, projectId, section) => ({
  _id: id,
  ...(projectId ? { projectId } : {}),
  ...(section ? { section } : {}),
});

const getMediaRecordById = (id, projectId, section) =>
  Media.findOne(buildRecordScope(id, projectId, section)).lean();

const updateMediaRecord = async (id, payload = {}, actorId, projectId, section) => {
  const existing = await Media.findOne(buildRecordScope(id, projectId, section));
  if (!existing) return null;

  const update = normalizeMediaPayload(payload, existing);
  const previousStorageKey = existing.storageKey;
  const previousMimeType = existing.mimeType;
  const replacedCloudinaryAsset =
    existing.storageProvider === 'cloudinary' &&
    previousStorageKey &&
    update.storageProvider === 'cloudinary' &&
    update.storageKey &&
    update.storageKey !== previousStorageKey;
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

  if (replacedCloudinaryAsset) {
    try {
      await deleteCloudinaryAsset(previousStorageKey, previousMimeType);
    } catch (err) {
      logger.warn({ err, storageKey: previousStorageKey }, 'Failed to delete replaced Cloudinary file for media record');
    }
  }

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

const deleteMediaRecord = async (id, projectId, actorId, section) => {
  const doc = await Media.findOneAndDelete(buildRecordScope(id, projectId, section));
  if (!doc) return null;

  if (doc.storageProvider === 'cloudinary' && doc.storageKey) {
    try {
      await deleteCloudinaryAsset(doc.storageKey, doc.mimeType);
    } catch (err) {
      logger.warn({ err, storageKey: doc.storageKey }, 'Failed to delete Cloudinary file for deleted media record');
    }
  }

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

const listApprovals = async (query = {}, projectId) => {
  const { page, limit, skip } = withPagination(query);
  const filter = {
    ...(projectId ? { projectId } : {}),
    approvalWorkflowId: { $ne: null },
  };

  if (query.approvalStatus && String(query.approvalStatus).toLowerCase() !== 'all') {
    filter.approvalStatus = exactTextFilter(query.approvalStatus);
  }
  if (query.status && String(query.status).toLowerCase() !== 'all') filter.status = exactTextFilter(query.status);
  if (query.search) {
    const q = new RegExp(query.search, 'i');
    filter.$or = [
      { title: q },
      { description: q },
      { projectName: q },
      { campaignName: q },
      { ownerName: q },
    ];
  }

  const [items, total] = await Promise.all([
    Media.find(filter).sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
    Media.countDocuments(filter),
  ]);

  return {
    items: items.map((item) => ({
      ...item,
      workflowId: item.approvalWorkflowId,
    })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

const requestApproval = async ({ mediaId, requestedBy, projectId, section, steps = DEFAULT_APPROVAL_STEPS }) => {
  const record = await Media.findOne({ _id: mediaId, ...(projectId ? { projectId } : {}), ...(section ? { section } : {}) });
  if (!record) {
    const err = new Error('Media record not found');
    err.statusCode = 404;
    throw err;
  }

  const workflowSteps = Array.isArray(steps)
    ? steps.map((step) => ({ ...step }))
    : DEFAULT_APPROVAL_STEPS.map((step) => ({ ...step }));

  const workflow = await createApprovalRequest({
    module: 'media',
    entityType: 'media',
    entityId: record._id,
    requestedBy,
    steps: workflowSteps,
  });

  record.approvalWorkflowId = workflow._id;
  record.approvalStatus = 'pending';
  record.status = 'In Review';
  record.submittedAt = new Date();
  record.approvalSteps = workflow.steps.map((step) => ({
    role: step.role,
    status: step.status,
    optional: Boolean(step.optional),
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

  const firstStep = workflow.steps.find((step) => step.status === 'pending');
  if (firstStep) {
    await notifyApprovalPending(firstStep.role, {
      title: 'Approval pending',
      message: `"${record.title}" is waiting on your approval.`,
      metadata: { mediaId: record._id, workflowId: workflow._id, projectId: record.projectId },
    });
  }

  return workflow;
};

const decideApproval = async ({ workflowId, actorId, actorRole, decision, remarks }) => {
  const workflow = await decideApprovalRequest({
    workflowId,
    role: actorRole,
    userId: actorId,
    decision,
    remarks,
    overrideRoles: MEDIA_APPROVAL_OVERRIDE_ROLES,
  });

  const media = await Media.findOne({ approvalWorkflowId: workflow._id });
  if (media) {
    media.approvalStatus = workflow.status;
    media.approvalSteps = workflow.steps.map((step) => ({
      role: step.role,
      status: step.status,
      optional: Boolean(step.optional),
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

  if (workflow.status === 'pending' && media) {
    const nextStep = workflow.steps.find((step) => step.status === 'pending');
    if (nextStep) {
      await notifyApprovalPending(nextStep.role, {
        title: 'Approval pending',
        message: `"${media.title}" is waiting on your approval.`,
        metadata: { mediaId: media._id, workflowId: workflow._id, projectId: media.projectId },
      });
    }
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

const resolveResourceType = (mimetype = '') => {
  if (mimetype.startsWith('image/')) return 'image';
  if (mimetype.startsWith('video/')) return 'video';
  return 'raw';
};

const isCloudinaryConfigured = () => Boolean(
  process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
);

const deleteCloudinaryAsset = async (storageKey, mimeType) => {
  if (!storageKey || !isCloudinaryConfigured()) return;
  await cloudinary.uploader.destroy(storageKey, { resource_type: resolveResourceType(mimeType) });
};

const uploadMediaFile = async ({ file, section, projectId }) => {
  if (!file) {
    const err = new Error('No file provided');
    err.statusCode = 400;
    throw err;
  }

  const resourceType = resolveResourceType(file.mimetype);
  const folder = `media/${section || 'asset'}/${projectId || 'general'}`;

  if (!isCloudinaryConfigured()) {
    const err = new Error('Cloudinary is not configured for media uploads');
    err.statusCode = 503;
    throw err;
  }

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder,
    resource_type: resourceType,
    use_filename: true,
    unique_filename: true,
  });

  const thumbnailUrl =
    resourceType === 'image'
      ? cloudinary.url(uploaded.public_id, { width: 400, crop: 'limit', secure: true })
      : resourceType === 'video'
        ? cloudinary.url(uploaded.public_id, { resource_type: 'video', format: 'jpg', secure: true })
        : '';

  return {
    url: uploaded.secure_url,
    storageKey: uploaded.public_id,
    storageProvider: 'cloudinary',
    thumbnailUrl,
    mimeType: file.mimetype,
    fileSizeBytes: file.size,
    originalName: file.originalname,
  };
};

const setProjectLogo = async (projectId, file) => {
  if (!file) {
    const err = new Error('No logo file provided');
    err.statusCode = 400;
    throw err;
  }
  if (resolveResourceType(file.mimetype) !== 'image') {
    const err = new Error('Logo must be an image file');
    err.statusCode = 400;
    throw err;
  }
  if (!isCloudinaryConfigured()) {
    const err = new Error('Cloudinary is not configured for media uploads');
    err.statusCode = 503;
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  const previousStorageKey = project.logo?.storageKey;

  const dataUri = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
  const uploaded = await cloudinary.uploader.upload(dataUri, {
    folder: `media/project-logos/${projectId}`,
    resource_type: 'image',
    use_filename: true,
    unique_filename: true,
  });

  project.logo = {
    url: uploaded.secure_url,
    storageKey: uploaded.public_id,
    storageProvider: 'cloudinary',
  };
  await project.save();

  if (previousStorageKey && previousStorageKey !== uploaded.public_id) {
    await deleteCloudinaryAsset(previousStorageKey, 'image/png');
  }

  return project.toObject();
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
    Media.find(scope).select('title section status updatedAt projectId').sort({ updatedAt: -1 }).limit(10).lean(),
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
  listApprovals,
  requestApproval,
  decideApproval,
  getReportingSummary,
  uploadMediaFile,
  setProjectLogo,
};
