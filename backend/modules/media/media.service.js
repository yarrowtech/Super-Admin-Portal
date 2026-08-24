const mongoose = require('mongoose');
const { v2: cloudinary } = require('cloudinary');
const { mediaLogger: logger } = require('./media.logger');
const Media = require('../../models/department/Media');
const SalesQuery = require('../../models/department/SalesQuery');
const Project = require('../../models/common/Project');
const User = require('../../models/auth/User');
const ApprovalWorkflow = require('../../models/finance/ApprovalWorkflow');
const ActivityLog = require('../../models/auth/ActivityLog');
const { deleteCachePrefix, getCache, setCache } = require('../../services/cache.service');
const { createApprovalRequest, decideApprovalRequest } = require('../../services/approvalEngine.service');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const { notifyApprovalPending } = require('../../services/notificationTrigger.service');
const { PROJECT_REGISTRY } = require('../../utils/projectAccess');

// Roles empowered to decide any pending media approval step regardless of
// which role the step itself is assigned to — kept in sync with
// media.middleware.js's canDecideApproval.
const MEDIA_APPROVAL_OVERRIDE_ROLES = ['media_head', 'ceo', 'admin', 'super_admin'];

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
    statusRows,
    moduleRows,
    recentItems,
  ] = await Promise.all([
    Media.distinct('projectId', projectId ? { projectId } : { projectId: { $ne: null } }),
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
  const socialReach = socialMetrics[0]?.reach || 0;
  const socialEngagement = socialMetrics[0]?.engagement || 0;

  const teamProductivity = (approvedItems + contentPublished) && contentTotal
    ? Math.round(((approvedItems + contentPublished) / contentTotal) * 100)
    : 0;

  return {
    departmentStructure: MEDIA_DEPARTMENT_STRUCTURE,
    kpis: {
      activeProjects: activeProjectIds.filter(Boolean).length,
      socialReach,
      socialEngagement,
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

  const [rawItems, total] = await Promise.all([
    Media.find(filter).sort({ [sortField]: sortDir }).skip(skip).limit(limit).populate('projectId', 'name projectCode').lean(),
    Media.countDocuments(filter),
  ]);

  // `projectName` is free-typed at record-creation time and can drift from (or
  // never match) the linked project. The populated Project.name is authoritative
  // for the "Project" column shown in the UI — the stored value is only a
  // fallback for legacy records where projectId failed to populate.
  const items = rawItems.map((item) => {
    const linkedProject = item.projectId;
    return {
      ...item,
      projectId: linkedProject?._id ? String(linkedProject._id) : (item.projectId ? String(item.projectId) : null),
      projectName: linkedProject?.name || linkedProject?.projectCode || item.projectName || '',
    };
  });

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

// Roles that see every registered project regardless of assignment — media_head
// allocates projects to media_marketing users, so the head (and anyone above)
// needs unrestricted visibility to do that allocation.
const MEDIA_FULL_PROJECT_ACCESS_ROLES = ['media_head', 'ceo', 'admin', 'super_admin'];

const listProjects = async (query = {}, user = null) => {
  const { page, limit, skip } = withPagination(query);
  const clauses = [buildAllowedProjectFilter()];
  const filter = {};
  if (query.status) filter.status = query.status;
  if (query.search) {
    const q = new RegExp(escapeRegex(query.search), 'i');
    clauses.push({ $or: [{ name: q }, { description: q }, { projectCode: q }] });
  }
  if (Object.keys(filter).length > 0) clauses.push(filter);

  // media_marketing users only see projects a media_head has allocated them to
  // (via teamMembers/projectManager) — everyone else on the media roster
  // (media_head, ceo, admin, super_admin) keeps full visibility.
  const role = String(user?.role || '').toLowerCase();
  if (role && !MEDIA_FULL_PROJECT_ACCESS_ROLES.includes(role) && user?._id) {
    clauses.push({ $or: [{ 'teamMembers.employee': user._id }, { projectManager: user._id }] });
  }

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

const parseDateRange = (query = {}) => {
  const range = {};
  if (query.dateFrom) {
    const from = new Date(query.dateFrom);
    if (!Number.isNaN(from.getTime())) range.$gte = from;
  }
  if (query.dateTo) {
    const to = new Date(query.dateTo);
    if (!Number.isNaN(to.getTime())) {
      to.setHours(23, 59, 59, 999);
      range.$lte = to;
    }
  }
  return Object.keys(range).length ? range : null;
};

const computeProjectHealth = (project = {}, now = new Date()) => {
  const status = String(project.status || '').toLowerCase();
  if (status === 'completed') return 'COMPLETED';
  if (status === 'cancelled') return 'BLOCKED';
  if (status === 'on-hold') return 'BLOCKED';

  const deadline = project.deadline || project.endDate;
  if (deadline) {
    const deadlineDate = new Date(deadline);
    if (!Number.isNaN(deadlineDate.getTime())) {
      const diffMs = deadlineDate.getTime() - now.getTime();
      const daysToDeadline = diffMs / (1000 * 60 * 60 * 24);
      const progress = Number(project.progress) || 0;
      if (daysToDeadline < 0 && progress < 100) return 'AT_RISK';
      if (daysToDeadline <= 7 && progress < 60) return 'ATTENTION';
    }
  }

  return 'ON_TRACK';
};

const mapProjectForHead = (project = {}, related = {}, now = new Date()) => {
  const campaignCount = Number(related.campaignCount || 0);
  const deliverableCount = Number(related.deliverableCount || 0);
  const pendingApprovalCount = Number(related.pendingApprovalCount || 0);
  const health = computeProjectHealth(project, now);
  const manager = project.projectManager;

  // Role-labeled roster so the Head's project list/cards can show who's
  // Media Marketing on each project, not just a single "owner" name.
  const team = [];
  const pmLabel = ownerLabel(manager);
  if (pmLabel) team.push({ ...pmLabel, role: 'Project Manager' });
  for (const tm of project.teamMembers || []) {
    const empLabel = ownerLabel(tm.employee);
    if (empLabel) team.push({ ...empLabel, role: tm.role || 'Team Member' });
  }

  return {
    id: String(project._id),
    _id: project._id,
    name: project.name,
    projectCode: project.projectCode,
    client: project.client || null,
    salesOwner: related.salesOwner || null,
    marketingOwner: manager && typeof manager === 'object'
      ? {
          id: manager._id ? String(manager._id) : undefined,
          name: [manager.firstName, manager.lastName].filter(Boolean).join(' ') || manager.email || '',
          email: manager.email || '',
        }
      : null,
    team,
    progress: Number(project.progress) || 0,
    status: project.status,
    priority: project.priority,
    health,
    deadline: project.deadline || project.endDate || null,
    campaignSummary: { total: campaignCount },
    deliverableSummary: { total: deliverableCount },
    approvalSummary: { pending: pendingApprovalCount },
    updatedAt: project.updatedAt,
    createdAt: project.createdAt,
  };
};

const getSalesSummary = async (query = {}) => {
  const createdAt = parseDateRange(query);
  const filter = createdAt ? { createdAt } : {};
  const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalLeads, newThisWeek, leadsByCategory, leadsByProject, recentLeads] = await Promise.all([
    SalesQuery.countDocuments(filter),
    SalesQuery.countDocuments({ ...filter, createdAt: { ...(filter.createdAt || {}), $gte: oneWeekAgo } }),
    SalesQuery.aggregate([
      { $match: filter },
      { $group: { _id: { $ifNull: ['$buyerCategory', 'Uncategorized'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    SalesQuery.aggregate([
      { $match: filter },
      { $group: { _id: { $ifNull: ['$project.name', 'Unspecified'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]),
    SalesQuery.find(filter)
      .sort({ createdAt: -1 })
      .limit(8)
      .select('buyerName businessName email phone buyerCategory project createdAt submittedBy')
      .populate('submittedBy', 'firstName lastName email')
      .lean(),
  ]);

  return {
    totalLeads,
    newThisWeek,
    qualifiedLeads: 0,
    opportunities: 0,
    deals: 0,
    pipeline: 0,
    revenue: 0,
    leadsByCategory,
    leadsByProject,
    recentLeads,
  };
};

const getMarketingSummary = async (query = {}) => {
  const createdAt = parseDateRange(query);
  const mediaFilter = createdAt ? { createdAt } : {};
  const now = new Date();
  const soon = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const [activeCampaigns, contentItems, assets, pendingApprovals, upcomingDeadlines, statusRows] = await Promise.all([
    Media.countDocuments({ ...mediaFilter, section: 'campaign', status: { $nin: ['Archived', 'Rejected'] } }),
    Media.countDocuments({ ...mediaFilter, section: 'content' }),
    Media.countDocuments({ ...mediaFilter, section: { $in: ['asset', 'brand', 'design', 'video', 'social'] } }),
    Media.countDocuments({ ...mediaFilter, approvalStatus: 'pending' }),
    Media.countDocuments({ ...mediaFilter, publishAt: { $gte: now, $lte: soon } }),
    Media.aggregate([
      { $match: mediaFilter },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]),
  ]);

  return {
    activeCampaigns,
    contentItems,
    assets,
    pendingApprovals,
    upcomingDeadlines,
    statusBreakdown: statusRows,
  };
};

const getRevenueSummary = async (query = {}) => {
  const sales = await getSalesSummary(query);
  const filter = buildAllowedProjectFilter();

  const [budgetAgg, spendAgg] = await Promise.all([
    Project.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          estimated: { $sum: { $ifNull: ['$budget.estimated', 0] } },
          actual: { $sum: { $ifNull: ['$budget.actual', 0] } },
          projectCount: { $sum: 1 },
        },
      },
    ]),
    Media.aggregate([
      { $match: { section: 'campaign' } },
      {
        $group: {
          _id: null,
          totalSpend: { $sum: { $ifNull: ['$budgetImpact.spend', 0] } },
          avgRoi: { $avg: '$budgetImpact.roiAtSnapshot' },
        },
      },
    ]),
  ]);

  const budgetRow = budgetAgg[0] || { estimated: 0, actual: 0, projectCount: 0 };
  const spendRow = spendAgg[0] || { totalSpend: 0, avgRoi: null };

  return {
    // Sales revenue/pipeline/deals — no Deal/Opportunity data model exists yet
    // (SalesQuery has no monetary field). Left at zero rather than fabricated;
    // revenueTracked=false tells the frontend to render this as "not tracked yet".
    revenue: 0,
    pipeline: sales.pipeline,
    wonDeals: 0,
    target: 0,
    outstanding: 0,
    revenueTracked: false,
    // Real, schema-backed figures from Project.budget and Media.budgetImpact.
    budget: {
      estimated: budgetRow.estimated,
      actual: budgetRow.actual,
      remaining: budgetRow.estimated - budgetRow.actual,
      projectCount: budgetRow.projectCount,
    },
    mediaSpend: {
      total: spendRow.totalSpend,
      avgRoi: spendRow.avgRoi === null || Number.isNaN(spendRow.avgRoi) ? null : Number(spendRow.avgRoi.toFixed(2)),
    },
  };
};

const buildHeadProjectRelated = async (projectIds = []) => {
  const [campaigns, deliverables, approvals, salesOwners] = await Promise.all([
    Media.aggregate([
      { $match: { projectId: { $in: projectIds }, section: 'campaign' } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]),
    Media.aggregate([
      { $match: { projectId: { $in: projectIds }, section: { $in: ['asset', 'content', 'brand', 'design', 'video', 'social'] } } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]),
    Media.aggregate([
      { $match: { projectId: { $in: projectIds }, approvalStatus: 'pending' } },
      { $group: { _id: '$projectId', count: { $sum: 1 } } },
    ]),
    SalesQuery.aggregate([
      { $match: { 'project.code': { $exists: true, $ne: '' } } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: '$project.code', ownerId: { $first: '$submittedBy' }, ownerName: { $first: '$department' } } },
    ]),
  ]);

  const campaignMap = new Map(campaigns.map((row) => [String(row._id), row.count]));
  const deliverableMap = new Map(deliverables.map((row) => [String(row._id), row.count]));
  const approvalMap = new Map(approvals.map((row) => [String(row._id), row.count]));
  const salesOwnerMap = new Map(salesOwners.map((row) => [String(row._id || '').toUpperCase(), row]));

  return { campaignMap, deliverableMap, approvalMap, salesOwnerMap };
};

const listMediaHeadProjects = async (query = {}) => {
  const { page, limit, skip } = withPagination({ ...query, limit: Math.min(Number(query.limit) || 20, 100) });
  const clauses = [buildAllowedProjectFilter()];
  if (query.status && String(query.status).toLowerCase() !== 'all') clauses.push({ status: query.status });
  if (query.search) {
    const q = new RegExp(escapeRegex(query.search), 'i');
    clauses.push({ $or: [{ name: q }, { description: q }, { projectCode: q }, { 'client.name': q }, { 'client.company': q }] });
  }
  const dateRange = parseDateRange(query);
  if (dateRange) clauses.push({ createdAt: dateRange });
  const filter = clauses.length > 1 ? { $and: clauses } : clauses[0];
  const allowedSortFields = new Set(['createdAt', 'updatedAt', 'name', 'status', 'priority', 'deadline', 'progress']);
  const sortBy = allowedSortFields.has(String(query.sortBy || 'updatedAt')) ? String(query.sortBy || 'updatedAt') : 'updatedAt';
  const order = String(query.order || 'desc').toLowerCase() === 'asc' ? 1 : -1;

  const [rawProjects, total] = await Promise.all([
    Project.find(filter)
      .sort({ [sortBy]: order })
      .skip(skip)
      .limit(limit)
      .populate('projectManager', 'firstName lastName email')
      .populate('teamMembers.employee', 'firstName lastName email')
      .lean(),
    Project.countDocuments(filter),
  ]);

  const projectIds = rawProjects.map((project) => project._id);
  const related = await buildHeadProjectRelated(projectIds);
  const now = new Date();
  let items = rawProjects.map((project) => mapProjectForHead(project, {
    campaignCount: related.campaignMap.get(String(project._id)) || 0,
    deliverableCount: related.deliverableMap.get(String(project._id)) || 0,
    pendingApprovalCount: related.approvalMap.get(String(project._id)) || 0,
    salesOwner: related.salesOwnerMap.get(String(project.projectCode || '').toUpperCase()) || null,
  }, now));

  if (query.health) {
    items = items.filter((project) => project.health === query.health);
  }

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

const getNeedsAttention = async () => {
  const [projectsResult, approvals] = await Promise.all([
    listMediaHeadProjects({ limit: 100, sortBy: 'deadline', order: 'asc' }),
    listApprovals({ status: 'pending' }),
  ]);

  const projectItems = projectsResult.items || [];
  const projectAlerts = projectItems
    .filter((project) => ['AT_RISK', 'BLOCKED', 'ATTENTION'].includes(project.health))
    .slice(0, 8)
    .map((project) => ({
      id: `project-${project.id}`,
      type: project.health === 'AT_RISK' ? 'OVERDUE_PROJECT' : project.health === 'BLOCKED' ? 'BLOCKED_PROJECT' : 'UPCOMING_DEADLINE',
      department: 'MEDIA_MARKETING',
      priority: project.health === 'AT_RISK' || project.health === 'BLOCKED' ? 'HIGH' : 'MEDIUM',
      title: project.name,
      description: project.health === 'AT_RISK'
        ? 'Project deadline has passed and the project is not complete.'
        : project.health === 'BLOCKED'
          ? 'Project is on hold or cancelled.'
          : 'Project deadline is near and progress is below the expected threshold.',
      entityId: project.id,
      entityType: 'Project',
      owner: project.marketingOwner,
      dueDate: project.deadline,
      action: 'VIEW_PROJECT',
    }));

  const approvalAlerts = approvals.slice(0, 5).map((workflow) => ({
    id: `approval-${workflow._id}`,
    type: 'PENDING_APPROVAL',
    department: 'MEDIA_MARKETING',
    priority: 'MEDIUM',
    title: workflow.media?.title || 'Approval pending',
    description: 'A media approval request is waiting for a decision.',
    entityId: workflow._id,
    entityType: 'ApprovalWorkflow',
    owner: workflow.requestedBy || null,
    dueDate: workflow.createdAt,
    action: 'REVIEW_APPROVAL',
  }));

  return [...projectAlerts, ...approvalAlerts].slice(0, 12);
};

const ownerLabel = (person) => {
  if (!person || typeof person !== 'object') return null;
  return {
    id: person._id ? String(person._id) : undefined,
    name: [person.firstName, person.lastName].filter(Boolean).join(' ') || person.email || 'Unknown',
    email: person.email || '',
  };
};

// 'media_marketing' -> 'Media Marketing', used to label who-did-what in
// activity feeds so media_head sees the actor's role, not just their name.
const formatRole = (role = '') =>
  String(role).split('_').filter(Boolean).map((w) => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Unknown role';

const formatApprovalEntityLabel = (workflow = {}) => {
  const value = String(workflow.entityType || 'media').trim();
  return formatRole(value.replace(/-/g, '_'));
};

const formatApprovalRequester = (requester) => {
  if (!requester || typeof requester !== 'object') return 'Unknown requester';
  return [requester.firstName, requester.lastName].filter(Boolean).join(' ') || requester.email || 'Unknown requester';
};

const invalidateMediaHeadDashboardCache = () => deleteCachePrefix('media:head:dashboard:');

const getTeamOverview = async () => {
  const filter = buildAllowedProjectFilter();
  const projects = await Project.find(filter)
    .select('name projectCode status priority progress deadline endDate projectManager teamMembers')
    .populate('projectManager', 'firstName lastName email')
    .populate('teamMembers.employee', 'firstName lastName email')
    .lean();

  const now = new Date();
  const memberMap = new Map();

  const addMember = (employee, role, project, isManager) => {
    const owner = ownerLabel(employee);
    if (!owner?.id) return;
    if (!memberMap.has(owner.id)) {
      memberMap.set(owner.id, { id: owner.id, name: owner.name, email: owner.email, roles: new Set(), projects: [] });
    }
    const entry = memberMap.get(owner.id);
    const roleLabel = isManager ? 'Project Manager' : (role || 'Team Member');
    entry.roles.add(roleLabel);
    entry.projects.push({
      id: String(project._id),
      name: project.name,
      projectCode: project.projectCode,
      status: project.status,
      health: computeProjectHealth(project, now),
      role: roleLabel,
    });
  };

  for (const project of projects) {
    addMember(project.projectManager, 'Project Manager', project, true);
    for (const tm of project.teamMembers || []) {
      addMember(tm.employee, tm.role, project, false);
    }
  }

  const members = Array.from(memberMap.values())
    .map((m) => {
      const activeProjects = m.projects.filter((p) => !['completed', 'cancelled'].includes(String(p.status || '').toLowerCase()));
      const atRiskProjects = m.projects.filter((p) => ['AT_RISK', 'BLOCKED', 'ATTENTION'].includes(p.health));
      return {
        id: m.id,
        name: m.name,
        email: m.email,
        roles: Array.from(m.roles),
        totalProjects: m.projects.length,
        activeProjects: activeProjects.length,
        atRiskProjects: atRiskProjects.length,
        projects: m.projects,
      };
    })
    .sort((a, b) => b.activeProjects - a.activeProjects);

  return {
    members,
    totalMembers: members.length,
    overloaded: members.filter((m) => m.activeProjects >= 3 || m.atRiskProjects >= 1),
  };
};

// media_head-facing roster of media_marketing users to allocate projects to.
const listMediaMarketingUsers = async () => {
  const users = await User.find({ role: 'media_marketing', isActive: { $ne: false } })
    .select('firstName lastName email')
    .sort({ firstName: 1, lastName: 1 })
    .lean();
  return users.map((u) => ownerLabel(u)).filter(Boolean);
};

const assignProjectMember = async (projectId, employeeId, role) => {
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(employeeId)) {
    const err = new Error('Invalid project or employee id');
    err.statusCode = 400;
    throw err;
  }

  const filter = buildAllowedProjectFilter();
  const project = await Project.findOne({ $and: [filter, { _id: projectId }] });
  if (!project) {
    const err = new Error('Project not found or not accessible from the Media Head portal');
    err.statusCode = 404;
    throw err;
  }

  const employee = await User.findOne({ _id: employeeId, role: 'media_marketing' }).select('firstName lastName email');
  if (!employee) {
    const err = new Error('Employee not found or is not a Media Marketing user');
    err.statusCode = 404;
    throw err;
  }

  const alreadyAssigned = (project.teamMembers || []).some((tm) => String(tm.employee) === String(employeeId));
  if (!alreadyAssigned) {
    project.teamMembers.push({ employee: employeeId, role: role || 'Team Member', assignedDate: new Date() });
    await project.save();
  }

  return { project: { id: String(project._id), name: project.name }, employee: ownerLabel(employee) };
};

const removeProjectMember = async (projectId, employeeId) => {
  if (!mongoose.Types.ObjectId.isValid(projectId) || !mongoose.Types.ObjectId.isValid(employeeId)) {
    const err = new Error('Invalid project or employee id');
    err.statusCode = 400;
    throw err;
  }

  const filter = buildAllowedProjectFilter();
  const project = await Project.findOne({ $and: [filter, { _id: projectId }] });
  if (!project) {
    const err = new Error('Project not found or not accessible from the Media Head portal');
    err.statusCode = 404;
    throw err;
  }

  project.teamMembers = (project.teamMembers || []).filter((tm) => String(tm.employee) !== String(employeeId));
  await project.save();

  return { project: { id: String(project._id), name: project.name } };
};

const bucketForDueDate = (dueDate, now) => {
  const d = new Date(dueDate);
  if (Number.isNaN(d.getTime())) return 'later';
  const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  if (diffDays < 0) return 'overdue';
  if (diffDays < 1) return 'today';
  if (diffDays <= 7) return 'thisWeek';
  return 'later';
};

const getDeadlineCenter = async () => {
  const filter = buildAllowedProjectFilter();
  const projects = await Project.find({ $and: [filter, { status: { $nin: ['completed', 'cancelled'] } }] })
    .select('name projectCode status priority progress deadline endDate milestones projectManager')
    .populate('projectManager', 'firstName lastName email')
    .lean();

  const now = new Date();
  const items = [];

  for (const project of projects) {
    const owner = ownerLabel(project.projectManager);
    const deadline = project.deadline || project.endDate;
    if (deadline) {
      items.push({
        id: `project-${project._id}`,
        type: 'project',
        title: project.name,
        projectId: String(project._id),
        projectName: project.name,
        projectCode: project.projectCode,
        owner,
        dueDate: deadline,
        health: computeProjectHealth(project, now),
        status: project.status,
      });
    }

    for (const milestone of project.milestones || []) {
      if (!milestone.deadline || milestone.status === 'completed') continue;
      const overdue = new Date(milestone.deadline).getTime() < now.getTime();
      items.push({
        id: `milestone-${project._id}-${milestone._id}`,
        type: 'milestone',
        title: milestone.title || 'Untitled milestone',
        projectId: String(project._id),
        projectName: project.name,
        projectCode: project.projectCode,
        owner,
        dueDate: milestone.deadline,
        health: overdue ? 'AT_RISK' : 'ON_TRACK',
        status: milestone.status,
      });
    }
  }

  items.sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());

  const buckets = { overdue: [], today: [], thisWeek: [], later: [] };
  for (const item of items) {
    buckets[bucketForDueDate(item.dueDate, now)].push(item);
  }

  return {
    items,
    buckets,
    counts: {
      overdue: buckets.overdue.length,
      today: buckets.today.length,
      thisWeek: buckets.thisWeek.length,
      later: buckets.later.length,
      total: items.length,
    },
  };
};

const DELIVERABLE_SECTIONS = ['asset', 'content', 'brand', 'design', 'video', 'social'];

const getProjectDetailForHead = async (projectId) => {
  if (!mongoose.Types.ObjectId.isValid(projectId)) {
    const err = new Error('Invalid project id');
    err.statusCode = 400;
    throw err;
  }

  const filter = buildAllowedProjectFilter();
  const project = await Project.findOne({ $and: [filter, { _id: projectId }] })
    .populate('projectManager', 'firstName lastName email')
    .populate('teamMembers.employee', 'firstName lastName email')
    .lean();

  if (!project) {
    const err = new Error('Project not found or not accessible from the Media Head portal');
    err.statusCode = 404;
    throw err;
  }

  const now = new Date();
  const health = computeProjectHealth(project, now);

  const mediaItems = await Media.find({ projectId: project._id })
    .select('title section status approvalStatus budgetImpact publishAt updatedAt createdAt')
    .sort({ updatedAt: -1 })
    .lean();

  const mediaIds = mediaItems.map((m) => m._id);
  const campaigns = mediaItems.filter((m) => m.section === 'campaign');
  const deliverables = mediaItems.filter((m) => DELIVERABLE_SECTIONS.includes(m.section));

  const [approvalWorkflows, salesLeads, planEditLogs] = await Promise.all([
    ApprovalWorkflow.find({ module: 'media', entityId: { $in: mediaIds } })
      .sort({ updatedAt: -1 })
      .limit(30)
      .populate('requestedBy', 'firstName lastName email')
      .lean(),
    project.projectCode
      ? SalesQuery.find({ 'project.code': project.projectCode })
          .select('buyerName businessName email phone buyerCategory createdAt submittedBy')
          .sort({ createdAt: -1 })
          .limit(20)
          .populate('submittedBy', 'firstName lastName email')
          .lean()
      : [],
    ActivityLog.find({ module: 'media', action: 'marketing_plan_saved', 'metadata.projectId': String(project._id) })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('actor', 'firstName lastName email role')
      .lean(),
  ]);

  const mediaById = new Map(mediaItems.map((m) => [String(m._id), m]));
  const approvalActivity = approvalWorkflows.map((wf) => {
    const media = mediaById.get(String(wf.entityId));
    const requester = wf.requestedBy
      ? [wf.requestedBy.firstName, wf.requestedBy.lastName].filter(Boolean).join(' ')
      : 'Someone';
    const title = media?.title || 'a media item';
    let text;
    if (wf.status === 'approved') text = `${requester}'s "${title}" was approved`;
    else if (wf.status === 'rejected') text = `${requester}'s "${title}" was rejected`;
    else text = `${requester} requested approval for "${title}"`;
    return { id: wf._id, text, status: wf.status, time: wf.updatedAt };
  });
  // Marketing-plan saves are their own activity source (ActivityLog, written
  // in marketingPlan.service.js) — interleaved here so media_head sees plan
  // edits alongside approval activity for this project, not just in the
  // separate department-wide feed on the dashboard.
  const planActivity = planEditLogs.map((log) => {
    const actorName = log.actor
      ? [log.actor.firstName, log.actor.lastName].filter(Boolean).join(' ') || log.actor.email || 'Someone'
      : 'Someone';
    const actorRole = formatRole(log.actor?.role || '');
    const changed = Array.isArray(log.metadata?.changedSections) ? log.metadata.changedSections : [];
    const changedText = changed.length ? ` (${changed.join(', ')})` : '';
    return {
      id: String(log._id),
      text: `${actorName} (${actorRole}) edited the marketing plan${changedText}`,
      status: 'plan_saved',
      time: log.createdAt,
    };
  });
  const activity = [...approvalActivity, ...planActivity]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .slice(0, 30);

  const team = [];
  const pm = ownerLabel(project.projectManager);
  if (pm) team.push({ ...pm, role: 'Project Manager' });
  for (const tm of project.teamMembers || []) {
    const emp = ownerLabel(tm.employee);
    if (emp) team.push({ ...emp, role: tm.role || 'Team Member' });
  }

  const campaignSpend = campaigns.reduce((sum, c) => sum + (Number(c.budgetImpact?.spend) || 0), 0);
  const roiValues = campaigns
    .map((c) => Number(c.budgetImpact?.roiAtSnapshot))
    .filter((v) => Number.isFinite(v) && v !== 0);
  const avgRoi = roiValues.length ? Number((roiValues.reduce((a, b) => a + b, 0) / roiValues.length).toFixed(2)) : null;

  return {
    project: {
      id: String(project._id),
      name: project.name,
      projectCode: project.projectCode,
      description: project.description,
      client: project.client || null,
      status: project.status,
      priority: project.priority,
      progress: Number(project.progress) || 0,
      health,
      startDate: project.startDate,
      endDate: project.endDate,
      deadline: project.deadline,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    },
    sales: {
      totalLeads: salesLeads.length,
      recentLeads: salesLeads,
    },
    marketing: {
      totalCampaigns: campaigns.length,
      totalDeliverables: deliverables.length,
      pendingApprovals: mediaItems.filter((m) => m.approvalStatus === 'pending').length,
    },
    execution: {
      milestones: (project.milestones || []).map((m) => ({
        id: String(m._id),
        title: m.title,
        description: m.description,
        deadline: m.deadline,
        status: m.status,
        completedDate: m.completedDate,
      })),
    },
    budget: {
      estimated: project.budget?.estimated || 0,
      actual: project.budget?.actual || 0,
      remaining: (project.budget?.estimated || 0) - (project.budget?.actual || 0),
      campaignSpend,
      avgRoi,
    },
    team,
    deliverables: deliverables.map((d) => ({
      id: String(d._id), title: d.title, section: d.section, status: d.status, updatedAt: d.updatedAt,
    })),
    campaigns: campaigns.map((c) => ({
      id: String(c._id), title: c.title, status: c.status,
      spend: c.budgetImpact?.spend || 0, roi: c.budgetImpact?.roiAtSnapshot ?? null, updatedAt: c.updatedAt,
    })),
    analytics: {
      totalMediaItems: mediaItems.length,
      approvedCount: mediaItems.filter((m) => m.approvalStatus === 'approved').length,
      rejectedCount: mediaItems.filter((m) => m.approvalStatus === 'rejected').length,
      pendingCount: mediaItems.filter((m) => m.approvalStatus === 'pending').length,
    },
    activity,
  };
};

const getMediaHeadDashboard = async (query = {}) => {
  const cacheKey = `media:head:dashboard:${JSON.stringify(query || {})}`;
  const cached = await getCache(cacheKey);
  if (cached) return cached;

  const [projects, sales, marketing, approvals, activity, team] = await Promise.all([
    listMediaHeadProjects({ limit: 100, sortBy: 'updatedAt', order: 'desc' }),
    getSalesSummary(query),
    getMarketingSummary(query),
    listApprovals({ status: 'pending' }),
    getActivity(),
    getTeamOverview(),
  ]);

  const allProjectStats = await listMediaHeadProjects({ limit: 100 });
  const projectItems = allProjectStats.items || [];
  const activeProjects = projectItems.filter((project) => !['completed', 'cancelled'].includes(String(project.status || '').toLowerCase())).length;
  const atRiskProjects = projectItems.filter((project) => ['AT_RISK', 'BLOCKED', 'ATTENTION'].includes(project.health)).length;
  const activeClients = new Set(projectItems.map((project) => project.client?.email || project.client?.name || project.client?.company).filter(Boolean)).size;
  const attention = await getNeedsAttention();

  const data = {
    kpis: {
      totalRevenue: 0,
      activeClients,
      activeProjects,
      salesPipeline: sales.pipeline,
      activeCampaigns: marketing.activeCampaigns,
      atRiskProjects,
      pendingApprovals: approvals.length,
      overdueItems: attention.filter((item) => item.type === 'OVERDUE_PROJECT').length,
    },
    attention,
    sales,
    marketing,
    projects,
    revenue: {
      revenue: 0,
      pipeline: sales.pipeline,
      wonDeals: 0,
      target: 0,
      outstanding: 0,
    },
    team: {
      members: team.members.slice(0, 8),
      overloaded: team.overloaded,
      totalMembers: team.totalMembers,
    },
    approvals,
    deadlines: attention.filter((item) => item.type === 'UPCOMING_DEADLINE'),
    activity: activity.slice(0, 10),
  };

  await setCache(cacheKey, data, 45);
  return data;
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
  if (key === 'content') return 'content';
  if (key === 'brand') return 'brand';
  if (key === 'design') return 'design';
  if (key === 'video') return 'video';
  if (key === 'social') return 'social';
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

  await invalidateMediaHeadDashboardCache();

  return workflow;
};

const listApprovals = async (query = {}) => {
  const filter = { module: 'media' };
  if (query.status) filter.status = query.status;

  const workflows = await ApprovalWorkflow.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
    .populate('requestedBy', 'firstName lastName email')
    .lean();

  const mediaIds = workflows.map((w) => w.entityId).filter((id) => mongoose.isValidObjectId(id));
  const mediaRecords = await Media.find({ _id: { $in: mediaIds } })
    .select('title section projectId')
    .lean();
  const mediaById = new Map(mediaRecords.map((record) => [String(record._id), record]));

  return workflows.map((workflow) => {
    const media = mediaById.get(String(workflow.entityId)) || null;
    const pendingStep = Array.isArray(workflow.steps)
      ? workflow.steps.find((step) => step.status === 'pending')
      : null;
    const title = media?.title || `${formatApprovalEntityLabel(workflow)} approval`;
    const section = media?.section || workflow.entityType || 'media';

    return {
      ...workflow,
      media,
      display: {
        title,
        section,
        requester: formatApprovalRequester(workflow.requestedBy),
        pendingRole: pendingStep?.role || '',
      },
    };
  });
};

const decideMediaApproval = async ({ workflowId, actorId, actorRole, decision, remarks }) => {
  const workflow = await decideApprovalRequest({
    workflowId,
    role: actorRole,
    userId: actorId,
    decision,
    remarks,
    overrideRoles: MEDIA_APPROVAL_OVERRIDE_ROLES,
  });

  if (workflow.entityType === 'media') {
    const approvalStatus = workflow.status === 'approved' ? 'approved' : workflow.status === 'rejected' ? 'rejected' : 'pending';
    const status = workflow.status === 'approved' ? 'Approved' : workflow.status === 'rejected' ? 'Rejected' : 'In Review';
    await Media.findByIdAndUpdate(workflow.entityId, {
      approvalStatus,
      status,
      approvalSteps: workflow.steps.map((step) => ({
        role: step.role,
        status: step.status,
        optional: Boolean(step.optional),
        decidedBy: step.decidedBy,
        decidedAt: step.decidedAt,
        remarks: step.remarks || '',
      })),
      updatedBy: actorId,
    });
  }

  await writeAuditTrail({
    userId: actorId,
    role: actorRole,
    module: 'media',
    action: 'media_approval_decided',
    targetType: 'ApprovalWorkflow',
    targetId: workflow._id,
    metadata: { decision, remarks, status: workflow.status },
  });

  await invalidateMediaHeadDashboardCache();

  return workflow;
};

const getActivity = async () => {
  const workflows = await ApprovalWorkflow.find({ module: 'media' })
    .sort({ updatedAt: -1 })
    .limit(20)
    .populate('requestedBy', 'firstName lastName')
    .lean();

  const mediaIds = workflows.map((w) => w.entityId).filter((id) => mongoose.isValidObjectId(id));
  const mediaRecords = await Media.find({ _id: { $in: mediaIds } })
    .select('title section')
    .lean();
  const mediaById = new Map(mediaRecords.map((record) => [String(record._id), record]));

  return workflows.map((workflow) => {
    const media = mediaById.get(String(workflow.entityId));
    const requester = workflow.requestedBy
      ? [workflow.requestedBy.firstName, workflow.requestedBy.lastName].filter(Boolean).join(' ')
      : 'Someone';
    const title = media?.title || 'a media item';
    const decidedStep = [...(workflow.steps || [])].reverse().find((step) => step.status !== 'pending');

    let text;
    if (workflow.status === 'approved' && decidedStep) {
      text = `${requester}'s "${title}" was approved`;
    } else if (workflow.status === 'rejected' && decidedStep) {
      text = `${requester}'s "${title}" was rejected`;
    } else {
      text = `${requester} requested approval for "${title}"`;
    }

    return {
      id: workflow._id,
      text,
      status: workflow.status,
      section: media?.section || '',
      time: workflow.updatedAt,
    };
  });
};

// Who edited which project's marketing plan and when — surfaced on the Media
// Head overview so the head can track marketing-plan edits without opening
// every project individually. Backed by the ActivityLog writes already made
// in marketingPlan.service.js on every save.
const getMarketingPlanActivity = async (limit = 20) => {
  const logs = await ActivityLog.find({ module: 'media', action: 'marketing_plan_saved' })
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('actor', 'firstName lastName email role')
    .lean();

  const projectIds = [...new Set(logs.map((log) => log.metadata?.projectId).filter(Boolean))];
  const projects = await Project.find({ _id: { $in: projectIds } }).select('name projectCode').lean();
  const projectMap = new Map(projects.map((p) => [String(p._id), p]));

  return logs.map((log) => {
    const project = projectMap.get(String(log.metadata?.projectId || ''));
    const actor = log.actor;
    return {
      id: String(log._id),
      actorName: actor ? ([actor.firstName, actor.lastName].filter(Boolean).join(' ') || actor.email || 'Someone') : 'Someone',
      actorEmail: actor?.email || '',
      actorRole: formatRole(actor?.role || ''),
      projectId: log.metadata?.projectId || null,
      projectName: project?.name || project?.projectCode || 'Unknown project',
      changedSections: Array.isArray(log.metadata?.changedSections) ? log.metadata.changedSections : [],
      time: log.createdAt,
    };
  });
};

// Per Media Marketing user breakdown of what they've actually produced —
// counts by module (asset/content/brand/design/video/social/...), approval
// outcomes, marketing-plan edit count, and their most recent items. Powers
// the Head portal's "Team Analytics" section (work/task-level detail,
// distinct from MediaHeadTeam.jsx's project-allocation roster).
const getMarketingUserWork = async () => {
  const users = await listMediaMarketingUsers();
  if (!users.length) return [];
  const userIds = users.map((u) => new mongoose.Types.ObjectId(u.id));

  const [totalsAgg, sectionAgg, recentItems, planEditsAgg, recentPlanLogs] = await Promise.all([
    Media.aggregate([
      { $match: { createdBy: { $in: userIds } } },
      {
        $group: {
          _id: '$createdBy',
          total: { $sum: 1 },
          pendingApprovals: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'pending'] }, 1, 0] } },
          approved: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'approved'] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$approvalStatus', 'rejected'] }, 1, 0] } },
        },
      },
    ]),
    Media.aggregate([
      { $match: { createdBy: { $in: userIds } } },
      { $group: { _id: { user: '$createdBy', section: '$section' }, count: { $sum: 1 } } },
    ]),
    Media.find({ createdBy: { $in: userIds } })
      .sort({ updatedAt: -1 })
      .limit(300)
      .select('createdBy title section status approvalStatus projectName updatedAt')
      .lean(),
    ActivityLog.aggregate([
      { $match: { module: 'media', action: 'marketing_plan_saved', actor: { $in: userIds } } },
      { $group: { _id: '$actor', count: { $sum: 1 }, lastEditAt: { $max: '$createdAt' } } },
    ]),
    ActivityLog.find({ module: 'media', action: 'marketing_plan_saved', actor: { $in: userIds } })
      .sort({ createdAt: -1 })
      .limit(1000)
      .select('actor metadata createdAt')
      .lean(),
  ]);

  const totalsMap = new Map(totalsAgg.map((row) => [String(row._id), row]));
  const planEditsMap = new Map(planEditsAgg.map((row) => [String(row._id), row]));
  const sectionMap = new Map();
  sectionAgg.forEach((row) => {
    const uid = String(row._id.user);
    if (!sectionMap.has(uid)) sectionMap.set(uid, {});
    sectionMap.get(uid)[row._id.section] = row.count;
  });
  const recentMap = new Map();
  recentItems.forEach((item) => {
    const uid = String(item.createdBy);
    const list = recentMap.get(uid) || [];
    if (list.length < 5) {
      list.push({
        id: String(item._id),
        title: item.title,
        section: item.section,
        status: item.status,
        approvalStatus: item.approvalStatus,
        projectName: item.projectName,
        updatedAt: item.updatedAt,
      });
    }
    recentMap.set(uid, list);
  });

  const planProjectIds = [...new Set(recentPlanLogs.map((log) => log.metadata?.projectId).filter(Boolean))];
  const planProjects = await Project.find({ _id: { $in: planProjectIds } }).select('name projectCode').lean();
  const planProjectMap = new Map(planProjects.map((p) => [String(p._id), p]));
  // Full per-user plan-edit history (not just a handful of "recent" ones) —
  // media_head asked to see everything a Media Marketing user has touched,
  // not a truncated preview. Bounded at 100/user only as a sanity ceiling.
  const recentPlanEditsMap = new Map();
  recentPlanLogs.forEach((log) => {
    const uid = String(log.actor);
    const list = recentPlanEditsMap.get(uid) || [];
    if (list.length < 100) {
      const project = planProjectMap.get(String(log.metadata?.projectId || ''));
      list.push({
        id: String(log._id),
        projectName: project?.name || project?.projectCode || 'Unknown project',
        changedSections: Array.isArray(log.metadata?.changedSections) ? log.metadata.changedSections : [],
        time: log.createdAt,
      });
    }
    recentPlanEditsMap.set(uid, list);
  });

  return users
    .map((u) => {
      const totals = totalsMap.get(u.id) || {};
      const planStats = planEditsMap.get(u.id) || {};
      return {
        id: u.id,
        name: u.name,
        email: u.email,
        totalItems: totals.total || 0,
        pendingApprovals: totals.pendingApprovals || 0,
        approved: totals.approved || 0,
        rejected: totals.rejected || 0,
        planEdits: planStats.count || 0,
        lastActivityAt: [planStats.lastEditAt, recentMap.get(u.id)?.[0]?.updatedAt].filter(Boolean).sort().pop() || null,
        bySection: sectionMap.get(u.id) || {},
        recentItems: recentMap.get(u.id) || [],
        recentPlanEdits: recentPlanEditsMap.get(u.id) || [],
      };
    })
    // Most active first, counting plan edits as real work — a user who has
    // only edited plans (no Media records yet) should still rank above one
    // with zero activity at all.
    .sort((a, b) => (b.totalItems + b.planEdits) - (a.totalItems + a.planEdits));
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

const HEX_COLOR_RE = /^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/;

const setProjectThemeColor = async (projectId, themeColor) => {
  if (!HEX_COLOR_RE.test(String(themeColor || ''))) {
    const err = new Error('themeColor must be a hex color like #0f766e');
    err.statusCode = 400;
    throw err;
  }

  const project = await Project.findById(projectId);
  if (!project) {
    const err = new Error('Project not found');
    err.statusCode = 404;
    throw err;
  }

  project.themeColor = themeColor;
  await project.save();

  return project.toObject();
};

module.exports = {
  getOverview,
  listMedia,
  listProjects,
  listMediaMarketingUsers,
  assignProjectMember,
  removeProjectMember,
  createMediaRecord,
  getMediaRecordById,
  updateMediaRecord,
  deleteMediaRecord,
  getModuleDataByProject,
  requestApproval,
  listApprovals,
  decideMediaApproval,
  getActivity,
  getMarketingPlanActivity,
  getMarketingUserWork,
  uploadMediaFile,
  setProjectLogo,
  setProjectThemeColor,
  getMediaHeadDashboard,
  listMediaHeadProjects,
  getSalesSummary,
  getMarketingSummary,
  getRevenueSummary,
  getNeedsAttention,
  getTeamOverview,
  getDeadlineCenter,
  getProjectDetailForHead,
};
