const mongoose = require('mongoose');
const Portfolio = require('../../models/Portfolio');
const Brand = require('../../models/portfolio/Brand');
const PortfolioGroup = require('../../models/portfolio/PortfolioGroup');
const PortfolioCategory = require('../../models/portfolio/PortfolioCategory');
const PortfolioAsset = require('../../models/portfolio/PortfolioAsset');
const PortfolioAssetVersion = require('../../models/portfolio/PortfolioAssetVersion');
const ActivityLog = require('../../models/auth/ActivityLog');
const User = require('../../models/auth/User');
const { writeAuditTrail } = require('../../services/auditTrail.service');
const {
  allowedTransitions,
  canTransition,
  SEMANTIC_STATUS_ACTION,
  DEFAULT_WORKFLOW_KEY,
  getWorkflow: getWorkflowPreset,
} = require('./portfolioWorkflow');
const { computeCategoryHealth } = require('./portfolioHealth.service');

// Status workflow now lives in portfolioWorkflow.js as named presets (a category
// picks one via `workflowKey`). ASSET_STATUS_TRANSITIONS is kept as a re-export
// of the default preset for any caller still importing it directly.
const ASSET_STATUS_TRANSITIONS = getWorkflowPreset(DEFAULT_WORKFLOW_KEY).transitions;

class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 404;
  }
}
class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.statusCode = 400;
  }
}

const isValidId = (id) => mongoose.Types.ObjectId.isValid(id);
const assertId = (id, label = 'id') => {
  if (!isValidId(id)) throw new ValidationError(`Invalid ${label}`);
};
const validUserId = async (id, label) => {
  if (!id) return null;
  assertId(id, `${label} id`);
  const exists = await User.exists({ _id: id, isActive: true });
  if (!exists) throw new ValidationError(`Selected ${label} is not a valid active user`);
  return id;
};

const ASSET_CONTENT_FIELDS = [
  'title', 'assetType', 'description', 'priority', 'ownerId', 'reviewerId', 'tags',
  'targetAudience', 'market', 'channel', 'campaign',
  'summary', 'content', 'cta', 'headline', 'seoTitle', 'metaDescription', 'keywords', 'angle', 'notes',
  'startDate', 'dueDate', 'reviewDate', 'publishDate', 'scheduleDate',
];

const snapshotAsset = (asset) => {
  const snapshot = {};
  ASSET_CONTENT_FIELDS.forEach((field) => { snapshot[field] = asset[field]; });
  snapshot.status = asset.status;
  return snapshot;
};

const createAssetVersion = async ({ asset, changeSummary, actorId }) => {
  const versionNumber = (asset.currentVersion || 0) + 1;
  await PortfolioAssetVersion.create({
    assetId: asset._id,
    versionNumber,
    snapshot: snapshotAsset(asset),
    changeSummary: changeSummary || 'Asset updated',
    createdBy: actorId || null,
  });
  asset.currentVersion = versionNumber;
  asset.lastVersionedAt = new Date();
};

const audit = (actor, action, targetType, targetId, metadata = {}) =>
  writeAuditTrail({
    userId: actor?.id,
    role: actor?.role,
    module: 'portfolio',
    action,
    targetType,
    targetId,
    metadata,
  }).catch(() => null);

// ==================== Brands ====================

const listBrands = () => Brand.find({ isActive: true }).sort({ name: 1 }).lean();

// ==================== Groups ====================

const listGroups = async (portfolioId, { includeArchived = true, includeTrashed = false } = {}) => {
  assertId(portfolioId, 'portfolio id');
  const filter = { portfolioId, deletedAt: includeTrashed ? { $ne: null } : null };
  if (!includeArchived) filter.isArchived = false;
  return PortfolioGroup.find(filter).sort({ order: 1, createdAt: 1 }).lean();
};

const createGroup = async (portfolioId, body, actor) => {
  assertId(portfolioId, 'portfolio id');
  const portfolio = await Portfolio.findById(portfolioId).select('_id');
  if (!portfolio) throw new NotFoundError('Portfolio not found');
  const { title, description, purpose, icon, accent, brandCode } = body;
  if (!title || !String(title).trim()) throw new ValidationError('Group title is required');

  const count = await PortfolioGroup.countDocuments({ portfolioId, deletedAt: null });
  const group = await PortfolioGroup.create({
    portfolioId,
    brandCode: brandCode || '',
    title: title.trim(),
    description: description || '',
    purpose: purpose || '',
    icon: icon || 'view_column',
    accent: accent || 'indigo',
    ownerId: await validUserId(body.ownerId, 'owner'),
    order: body.order !== undefined ? Number(body.order) : count,
    createdBy: actor?.id,
    updatedBy: actor?.id,
  });
  await audit(actor, 'PORTFOLIO_GROUP_CREATED', 'PortfolioGroup', group._id, { portfolioId, title: group.title });
  return group;
};

const findGroupOrThrow = async (groupId) => {
  assertId(groupId, 'group id');
  const group = await PortfolioGroup.findOne({ _id: groupId, deletedAt: null });
  if (!group) throw new NotFoundError('Portfolio group not found');
  return group;
};

const getGroup = (groupId) => findGroupOrThrow(groupId);

const updateGroup = async (groupId, body, actor) => {
  const group = await findGroupOrThrow(groupId);
  const { title, description, purpose, icon, accent, order, brandCode } = body;
  if (title !== undefined) group.title = title;
  if (description !== undefined) group.description = description;
  if (purpose !== undefined) group.purpose = purpose;
  if (icon !== undefined) group.icon = icon;
  if (accent !== undefined) group.accent = accent;
  if (order !== undefined) group.order = order;
  if (brandCode !== undefined) group.brandCode = brandCode;
  if (body.ownerId !== undefined) group.ownerId = await validUserId(body.ownerId, 'owner');
  group.updatedBy = actor?.id;
  await group.save();
  await audit(actor, 'PORTFOLIO_GROUP_UPDATED', 'PortfolioGroup', group._id, { fields: Object.keys(body || {}) });
  return group;
};

const archiveGroup = async (groupId, actor) => {
  const group = await findGroupOrThrow(groupId);
  group.isArchived = true;
  group.archivedAt = new Date();
  group.archivedBy = actor?.id;
  group.updatedBy = actor?.id;
  await group.save();
  await audit(actor, 'ARCHIVED', 'PortfolioGroup', group._id, {});
  return group;
};

const restoreGroupFromArchive = async (groupId, actor) => {
  const group = await findGroupOrThrow(groupId);
  group.isArchived = false;
  group.archivedAt = null;
  group.archivedBy = null;
  group.updatedBy = actor?.id;
  await group.save();
  await audit(actor, 'RESTORED', 'PortfolioGroup', group._id, { from: 'archive' });
  return group;
};

const trashGroup = async (groupId, actor) => {
  const group = await findGroupOrThrow(groupId);
  group.deletedAt = new Date();
  group.deletedBy = actor?.id;
  await group.save();
  await audit(actor, 'ARCHIVED', 'PortfolioGroup', group._id, { trashed: true });
  return group;
};

const restoreGroupFromTrash = async (groupId, actor) => {
  assertId(groupId, 'group id');
  const group = await PortfolioGroup.findById(groupId);
  if (!group) throw new NotFoundError('Portfolio group not found');
  group.deletedAt = null;
  group.deletedBy = null;
  group.updatedBy = actor?.id;
  await group.save();
  await audit(actor, 'RESTORED', 'PortfolioGroup', group._id, { from: 'trash' });
  return group;
};

// ==================== Categories ====================

const listCategories = async (groupId, { includeArchived = true, includeTrashed = false } = {}) => {
  assertId(groupId, 'group id');
  const filter = { groupId, deletedAt: includeTrashed ? { $ne: null } : null };
  if (!includeArchived) filter.isArchived = false;
  return PortfolioCategory.find(filter).sort({ order: 1, createdAt: 1 }).lean();
};

const createCategory = async (groupId, body, actor) => {
  const group = await findGroupOrThrow(groupId);
  const { title, description } = body;
  if (!title || !String(title).trim()) throw new ValidationError('Category title is required');

  const count = await PortfolioCategory.countDocuments({ groupId, deletedAt: null });
  const category = await PortfolioCategory.create({
    portfolioId: group.portfolioId,
    groupId: group._id,
    title: title.trim(),
    description: description || '',
    purpose: body.purpose || '',
    defaultAssetType: body.defaultAssetType || '',
    workflowKey: body.workflowKey || 'content_publishing',
    defaultPriority: body.defaultPriority || 'medium',
    ownerId: await validUserId(body.ownerId, 'owner'),
    reviewerId: await validUserId(body.reviewerId, 'reviewer'),
    icon: body.icon || 'folder_open',
    accent: body.accent || 'indigo',
    order: count,
    createdBy: actor?.id,
    updatedBy: actor?.id,
  });
  await audit(actor, 'PORTFOLIO_CATEGORY_CREATED', 'PortfolioCategory', category._id, { groupId, title: category.title });
  return category;
};

const findCategoryOrThrow = async (categoryId) => {
  assertId(categoryId, 'category id');
  const category = await PortfolioCategory.findOne({ _id: categoryId, deletedAt: null });
  if (!category) throw new NotFoundError('Category not found');
  return category;
};

const getCategory = async (categoryId) => {
  await findCategoryOrThrow(categoryId); // 404s before the populated read below
  return PortfolioCategory.findById(categoryId)
    .populate('ownerId', 'firstName lastName email profileImage')
    .populate('reviewerId', 'firstName lastName email profileImage')
    .lean();
};

const updateCategory = async (categoryId, body, actor) => {
  const category = await findCategoryOrThrow(categoryId);
  const { title, description, purpose, order, defaultAssetType, workflowKey, defaultPriority, icon, accent, requiredFields } = body;
  if (title !== undefined) category.title = title;
  if (description !== undefined) category.description = description;
  if (purpose !== undefined) category.purpose = purpose;
  if (defaultAssetType !== undefined) category.defaultAssetType = defaultAssetType;
  if (workflowKey !== undefined) category.workflowKey = workflowKey;
  if (defaultPriority !== undefined) category.defaultPriority = defaultPriority;
  if (body.ownerId !== undefined) category.ownerId = await validUserId(body.ownerId, 'owner');
  if (body.reviewerId !== undefined) category.reviewerId = await validUserId(body.reviewerId, 'reviewer');
  if (icon !== undefined) category.icon = icon;
  if (accent !== undefined) category.accent = accent;
  if (requiredFields !== undefined) category.requiredFields = { ...category.requiredFields.toObject?.(), ...requiredFields };
  if (order !== undefined) category.order = order;
  category.updatedBy = actor?.id;
  await category.save();
  await audit(actor, 'PORTFOLIO_CATEGORY_UPDATED', 'PortfolioCategory', category._id, { fields: Object.keys(body || {}) });
  return category;
};

const archiveCategory = async (categoryId, actor) => {
  const category = await findCategoryOrThrow(categoryId);
  category.isArchived = true;
  category.archivedAt = new Date();
  category.archivedBy = actor?.id;
  category.updatedBy = actor?.id;
  await category.save();
  await audit(actor, 'ARCHIVED', 'PortfolioCategory', category._id, {});
  return category;
};

const restoreCategoryFromArchive = async (categoryId, actor) => {
  const category = await findCategoryOrThrow(categoryId);
  category.isArchived = false;
  category.archivedAt = null;
  category.archivedBy = null;
  category.updatedBy = actor?.id;
  await category.save();
  await audit(actor, 'RESTORED', 'PortfolioCategory', category._id, { from: 'archive' });
  return category;
};

const trashCategory = async (categoryId, actor) => {
  const category = await findCategoryOrThrow(categoryId);
  category.deletedAt = new Date();
  category.deletedBy = actor?.id;
  await category.save();
  await audit(actor, 'ARCHIVED', 'PortfolioCategory', category._id, { trashed: true });
  return category;
};

const restoreCategoryFromTrash = async (categoryId, actor) => {
  assertId(categoryId, 'category id');
  const category = await PortfolioCategory.findById(categoryId);
  if (!category) throw new NotFoundError('Category not found');
  category.deletedAt = null;
  category.deletedBy = null;
  category.updatedBy = actor?.id;
  await category.save();
  await audit(actor, 'RESTORED', 'PortfolioCategory', category._id, { from: 'trash' });
  return category;
};

const buildCategoryStats = async (categoryId) => {
  const now = new Date();
  const rows = await PortfolioAsset.aggregate([
    { $match: { categoryId: new mongoose.Types.ObjectId(categoryId), deletedAt: null } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
  ]);
  const byStatus = Object.fromEntries(rows.map((r) => [r._id, r.count]));
  const total = rows.reduce((sum, r) => sum + r.count, 0);
  const overdue = await PortfolioAsset.countDocuments({
    categoryId,
    deletedAt: null,
    dueDate: { $lt: now },
    status: { $nin: ['published', 'archived'] },
  });
  const needsReview = byStatus.in_review || 0;
  return { total, byStatus, overdue, needsReview };
};

const getCategoryStats = async (categoryId) => {
  await findCategoryOrThrow(categoryId);
  return buildCategoryStats(categoryId);
};

// Rich Overview-tab payload (spec §4): counters, execution breakdown, health
// (delegated to portfolioHealth.service so the number shown here can never
// disagree with the number returned by GET /categories/:id/health), a short
// needs-attention list with reasons, upcoming deadlines, and recent activity.
const getCategoryOverview = async (categoryId) => {
  await findCategoryOrThrow(categoryId);
  const now = new Date();

  const [stats, health, overdueAssets, blockedAssets, upcoming, activityFeed] = await Promise.all([
    buildCategoryStats(categoryId),
    computeCategoryHealth(categoryId),
    PortfolioAsset.find({
      categoryId, deletedAt: null, dueDate: { $lt: now }, status: { $nin: ['published', 'measuring', 'archived'] },
    }).select('title dueDate status').sort({ dueDate: 1 }).limit(5).lean(),
    PortfolioAsset.find({ categoryId, deletedAt: null, status: 'blocked' }).select('title status updatedAt').sort({ updatedAt: -1 }).limit(5).lean(),
    PortfolioAsset.find({
      categoryId, deletedAt: null, dueDate: { $gte: now }, status: { $nin: ['published', 'measuring', 'archived'] },
    }).select('title dueDate status').sort({ dueDate: 1 }).limit(5).lean(),
    // eslint-disable-next-line global-require -- avoids a require cycle at module-load time
    require('./portfolioActivity.service').listCategoryActivity(categoryId, { limit: 8 }),
  ]);

  const byStatus = stats.byStatus || {};
  const counts = {
    total: stats.total,
    published: byStatus.published || 0,
    inProgress: byStatus.in_progress || 0,
    needsReview: byStatus.in_review || 0,
    overdue: stats.overdue,
    blocked: byStatus.blocked || 0,
  };
  const executionByStatus = {
    published: byStatus.published || 0,
    approved: byStatus.approved || 0,
    in_review: byStatus.in_review || 0,
    in_progress: byStatus.in_progress || 0,
    draft: byStatus.draft || 0,
  };
  const pct = stats.total === 0 ? 0 : Math.round(((byStatus.published || 0) / stats.total) * 100);

  const needsAttention = [
    ...overdueAssets.map((a) => ({ _id: a._id, title: a.title, reason: 'overdue', detail: a.dueDate })),
    ...blockedAssets.map((a) => ({ _id: a._id, title: a.title, reason: 'blocked', detail: a.updatedAt })),
  ].slice(0, 6);

  return {
    counts,
    execution: { pct, byStatus: executionByStatus },
    health,
    needsAttention,
    upcomingDeadlines: upcoming,
    recentActivity: activityFeed.items,
  };
};

// ==================== Assets ====================

const ASSET_LIST_FIELDS = '_id title assetType status priority ownerId reviewerId dueDate updatedAt createdAt tags channel campaign';

const listAssets = async (categoryId, params = {}) => {
  assertId(categoryId, 'category id');
  const page = Math.max(1, Number(params.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(params.limit) || 20));
  const filter = { categoryId, deletedAt: null };
  if (params.status) filter.status = params.status;
  if (params.priority) filter.priority = params.priority;
  if (params.owner) filter.ownerId = params.owner;
  if (params.reviewer) filter.reviewerId = params.reviewer;
  if (params.due === 'overdue') filter.dueDate = { $lt: new Date(), $ne: null };
  else if (params.due === '7d') filter.dueDate = { $gte: new Date(), $lte: new Date(Date.now() + 7 * 864e5) };
  else if (params.due === 'none') filter.dueDate = null;
  if (params.search) {
    const re = new RegExp(String(params.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: re }, { description: re }, { tags: re }];
  }

  const sortableFields = new Set(['title', 'priority', 'dueDate', 'updatedAt', 'createdAt']);
  const sortField = sortableFields.has(params.sortField) ? params.sortField : 'updatedAt';
  const sortDir = params.sortDir === '1' ? 1 : -1;

  const populate = (q) => q.populate('ownerId', 'firstName lastName email profileImage').populate('reviewerId', 'firstName lastName email profileImage');

  if (sortField === 'priority') {
    // Priority has a severity order (low < medium < high < critical), not an
    // alphabetical one — .sort() can't express that, so rank in application
    // code. Categories stay small enough (dozens to low hundreds of assets)
    // for an unpaginated fetch here to be cheap.
    const PRIORITY_RANK = { low: 0, medium: 1, high: 2, critical: 3 };
    const all = await populate(PortfolioAsset.find(filter).select(ASSET_LIST_FIELDS)).lean();
    all.sort((a, b) => (PRIORITY_RANK[a.priority] ?? 0) - (PRIORITY_RANK[b.priority] ?? 0));
    if (sortDir === -1) all.reverse();
    const total = all.length;
    const items = all.slice((page - 1) * limit, (page - 1) * limit + limit);
    return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
  }

  const [items, total] = await Promise.all([
    populate(PortfolioAsset.find(filter).select(ASSET_LIST_FIELDS))
      .sort({ [sortField]: sortDir })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    PortfolioAsset.countDocuments(filter),
  ]);

  return { items, pagination: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) } };
};

const createAsset = async (categoryId, body, actor) => {
  const category = await findCategoryOrThrow(categoryId);
  const { title } = body;
  if (!title || !String(title).trim()) throw new ValidationError('Asset title is required');

  const assetType = body.assetType || category.defaultAssetType || '';
  const priority = body.priority || category.defaultPriority || 'medium';
  const ownerId = body.ownerId !== undefined ? await validUserId(body.ownerId, 'owner') : category.ownerId || null;
  const reviewerId = body.reviewerId !== undefined ? await validUserId(body.reviewerId, 'reviewer') : category.reviewerId || null;
  const dueDate = body.dueDate || null;
  const campaign = body.campaign || '';

  const required = category.requiredFields || {};
  const missing = [];
  if (required.owner && !ownerId) missing.push('owner');
  if (required.reviewer && !reviewerId) missing.push('reviewer');
  if (required.dueDate && !dueDate) missing.push('due date');
  if (required.campaign && !campaign) missing.push('campaign');
  if (required.assetType && !assetType) missing.push('asset type');
  if (missing.length) throw new ValidationError(`This category requires: ${missing.join(', ')}`);

  const asset = await PortfolioAsset.create({
    categoryId: category._id,
    groupId: category.groupId,
    portfolioId: category.portfolioId,
    title: title.trim(),
    assetType,
    description: body.description || '',
    status: body.status && ASSET_STATUS_TRANSITIONS[body.status] !== undefined ? body.status : 'backlog',
    priority,
    ownerId,
    reviewerId,
    dueDate,
    campaign,
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdBy: actor?.id,
    updatedBy: actor?.id,
  });
  await audit(actor, 'ASSET_CREATED', 'PortfolioAsset', asset._id, { categoryId, title: asset.title });
  return findAssetOrThrow(asset._id);
};

const findAssetOrThrow = async (assetId) => {
  assertId(assetId, 'asset id');
  const asset = await PortfolioAsset.findOne({ _id: assetId, deletedAt: null })
    .populate('ownerId', 'firstName lastName email')
    .populate('reviewerId', 'firstName lastName email');
  if (!asset) throw new NotFoundError('Asset not found');
  return asset;
};

const getAsset = (assetId) => findAssetOrThrow(assetId);

const updateAsset = async (assetId, body, actor) => {
  const asset = await findAssetOrThrow(assetId);
  const changedFields = [];
  const previousOwner = asset.ownerId?._id ? String(asset.ownerId._id) : (asset.ownerId ? String(asset.ownerId) : null);

  if (body.ownerId !== undefined) body.ownerId = await validUserId(body.ownerId, 'owner');
  if (body.reviewerId !== undefined) body.reviewerId = await validUserId(body.reviewerId, 'reviewer');

  ASSET_CONTENT_FIELDS.forEach((field) => {
    if (body[field] === undefined) return;
    const current = asset[field];
    const currentComparable = current && current._id ? String(current._id) : current instanceof Date ? current.toISOString() : current;
    if (JSON.stringify(currentComparable) === JSON.stringify(body[field])) return;
    asset[field] = body[field];
    changedFields.push(field);
  });

  if (!changedFields.length) return asset;

  await createAssetVersion({ asset, changeSummary: body.changeSummary || 'Content updated', actorId: actor?.id });
  asset.updatedBy = actor?.id;
  await asset.save();

  await audit(actor, 'ASSET_UPDATED', 'PortfolioAsset', asset._id, { fields: changedFields, version: asset.currentVersion });
  if (changedFields.includes('ownerId') && String(asset.ownerId || '') !== previousOwner) {
    await audit(actor, 'OWNER_CHANGED', 'PortfolioAsset', asset._id, { from: previousOwner, to: asset.ownerId ? String(asset.ownerId) : null });
  }
  return findAssetOrThrow(asset._id);
};

const changeAssetStatus = async (assetId, nextStatus, actor) => {
  const asset = await findAssetOrThrow(assetId);
  const category = await findCategoryOrThrow(asset.categoryId);
  if (asset.status === nextStatus) throw new ValidationError(`Asset is already ${nextStatus}`);
  if (!canTransition(category.workflowKey, asset.status, nextStatus)) {
    throw new ValidationError(`Cannot move status from "${asset.status}" to "${nextStatus}" under this category's workflow`);
  }
  const previousStatus = asset.status;
  asset.status = nextStatus;
  await createAssetVersion({ asset, changeSummary: `Status changed: ${previousStatus} → ${nextStatus}`, actorId: actor?.id });
  asset.updatedBy = actor?.id;
  await asset.save();
  await audit(actor, 'STATUS_CHANGED', 'PortfolioAsset', asset._id, { from: previousStatus, to: nextStatus, version: asset.currentVersion });
  // Semantic alias on top of the generic STATUS_CHANGED event (spec §22), so the
  // Activity feed can read "Requested review" / "Approved" / "Published" etc.
  const semanticAction = SEMANTIC_STATUS_ACTION[nextStatus];
  if (semanticAction) {
    await audit(actor, semanticAction, 'PortfolioAsset', asset._id, { from: previousStatus, to: nextStatus });
  }
  return findAssetOrThrow(asset._id);
};

// The allowed next-statuses for an asset, derived from its category's workflow
// preset (spec §20 "frontend must not decide transition validity alone").
const getAssetTransitions = async (assetId) => {
  const asset = await findAssetOrThrow(assetId);
  const category = await findCategoryOrThrow(asset.categoryId);
  return { current: asset.status, allowed: allowedTransitions(category.workflowKey, asset.status), workflowKey: category.workflowKey };
};

// Active users selectable as an owner/reviewer/assignee (spec §19). Scoped to a
// simple prefix/contains search on name or email — good enough for a picker.
const listAssignees = async ({ search = '' } = {}) => {
  const filter = { isActive: true };
  const q = String(search || '').trim();
  if (q) {
    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ firstName: re }, { lastName: re }, { email: re }];
  }
  const users = await User.find(filter).select('firstName lastName email role profileImage').sort({ firstName: 1 }).limit(20).lean();
  return users.map((u) => ({
    _id: u._id,
    name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.email,
    email: u.email,
    role: u.role,
    profileImage: u.profileImage || '',
  }));
};

const softDeleteAsset = async (assetId, actor) => {
  const asset = await findAssetOrThrow(assetId);
  asset.deletedAt = new Date();
  asset.deletedBy = actor?.id;
  await asset.save();
  await audit(actor, 'ARCHIVED', 'PortfolioAsset', asset._id, { trashed: true });
  return asset;
};

const restoreAsset = async (assetId, actor) => {
  assertId(assetId, 'asset id');
  const asset = await PortfolioAsset.findById(assetId);
  if (!asset) throw new NotFoundError('Asset not found');
  asset.deletedAt = null;
  asset.deletedBy = null;
  asset.updatedBy = actor?.id;
  await asset.save();
  await audit(actor, 'RESTORED', 'PortfolioAsset', asset._id, { from: 'trash' });
  return asset;
};

const listAssetVersions = async (assetId) => {
  await findAssetOrThrow(assetId);
  return PortfolioAssetVersion.find({ assetId }).sort({ createdAt: -1 }).populate('createdBy', 'firstName lastName email').lean();
};

const restoreAssetVersion = async (assetId, versionId, actor) => {
  const asset = await findAssetOrThrow(assetId);
  assertId(versionId, 'version id');
  const version = await PortfolioAssetVersion.findOne({ _id: versionId, assetId });
  if (!version) throw new NotFoundError('Version not found');

  // Restoring creates a NEW version — history is never deleted (spec §9).
  Object.entries(version.snapshot || {}).forEach(([key, value]) => {
    if (key === 'status') return; // status is transitioned separately/validated below
    asset[key] = value;
  });
  await createAssetVersion({ asset, changeSummary: `Restored from version ${version.versionNumber}`, actorId: actor?.id });
  asset.updatedBy = actor?.id;
  await asset.save();
  await audit(actor, 'VERSION_RESTORED', 'PortfolioAsset', asset._id, { restoredFrom: version.versionNumber, newVersion: asset.currentVersion });
  return findAssetOrThrow(asset._id);
};

const listAssetHistory = async (assetId, { cursor, limit = 20 } = {}) => {
  assertId(assetId, 'asset id');
  const filter = { targetType: 'PortfolioAsset', targetId: String(assetId) };
  if (cursor) filter._id = { $lt: cursor };
  const pageSize = Math.min(100, Math.max(1, Number(limit) || 20));
  const rows = await ActivityLog.find(filter)
    .sort({ _id: -1 })
    .limit(pageSize + 1)
    .populate('actor', 'firstName lastName email')
    .lean();
  const hasMore = rows.length > pageSize;
  const items = hasMore ? rows.slice(0, pageSize) : rows;
  return { items, nextCursor: hasMore ? String(items[items.length - 1]._id) : null };
};

// ==================== Portfolio-level tree / stats ====================

const getPortfolioTree = async (portfolioId) => {
  assertId(portfolioId, 'portfolio id');
  const portfolio = await Portfolio.findById(portfolioId).select('_id');
  if (!portfolio) throw new NotFoundError('Portfolio not found');

  const groups = await PortfolioGroup.find({ portfolioId, deletedAt: null })
    .sort({ order: 1, createdAt: 1 })
    .populate('ownerId', 'firstName lastName email profileImage')
    .lean();
  const categories = await PortfolioCategory.find({ portfolioId, deletedAt: null })
    .sort({ order: 1, createdAt: 1 })
    .populate('ownerId', 'firstName lastName email profileImage')
    .lean();

  const categoriesByGroup = new Map();
  categories.forEach((cat) => {
    const key = String(cat.groupId);
    if (!categoriesByGroup.has(key)) categoriesByGroup.set(key, []);
    categoriesByGroup.get(key).push(cat);
  });

  const statsRows = await PortfolioAsset.aggregate([
    { $match: { portfolioId: new mongoose.Types.ObjectId(portfolioId), deletedAt: null } },
    { $group: { _id: { categoryId: '$categoryId', status: '$status' }, count: { $sum: 1 } } },
  ]);
  const now = new Date();
  const overdueRows = await PortfolioAsset.aggregate([
    { $match: { portfolioId: new mongoose.Types.ObjectId(portfolioId), deletedAt: null, dueDate: { $lt: now }, status: { $nin: ['published', 'archived'] } } },
    { $group: { _id: '$categoryId', count: { $sum: 1 } } },
  ]);
  const overdueByCategory = new Map(overdueRows.map((r) => [String(r._id), r.count]));

  const statsByCategory = new Map();
  statsRows.forEach((row) => {
    const key = String(row._id.categoryId);
    if (!statsByCategory.has(key)) statsByCategory.set(key, { total: 0, byStatus: {} });
    const entry = statsByCategory.get(key);
    entry.byStatus[row._id.status] = row.count;
    entry.total += row.count;
  });

  const tree = groups.map((group) => ({
    ...group,
    categories: (categoriesByGroup.get(String(group._id)) || []).map((cat) => {
      const stats = statsByCategory.get(String(cat._id)) || { total: 0, byStatus: {} };
      const overdue = overdueByCategory.get(String(cat._id)) || 0;
      const blocked = stats.byStatus.blocked || 0;
      // Lightweight signal for the portfolio card (no extra query — derived from
      // the aggregation above). The single-category workspace uses the fuller,
      // reasoned computeCategoryHealth() instead.
      const healthStatus = stats.total === 0 ? 'healthy' : overdue > 0 || blocked > 0 ? 'needs_attention' : 'healthy';
      return {
        ...cat,
        stats: {
          total: stats.total,
          byStatus: stats.byStatus,
          overdue,
          blocked,
          needsReview: stats.byStatus.in_review || 0,
          healthStatus,
        },
      };
    }),
  }));

  const portfolioTotals = {
    total: 0,
    active: 0,
    needsReview: 0,
    published: 0,
    overdue: 0,
    blocked: 0,
  };
  statsRows.forEach((row) => {
    portfolioTotals.total += row.count;
    if (row._id.status === 'in_review') portfolioTotals.needsReview += row.count;
    if (row._id.status === 'published') portfolioTotals.published += row.count;
    if (row._id.status === 'changes_requested') portfolioTotals.blocked += row.count;
    if (!['published', 'archived'].includes(row._id.status)) portfolioTotals.active += row.count;
  });
  overdueRows.forEach((r) => { portfolioTotals.overdue += r.count; });

  return { groups: tree, totals: portfolioTotals };
};

module.exports = {
  ASSET_STATUS_TRANSITIONS,
  NotFoundError,
  ValidationError,
  listBrands,
  listGroups,
  createGroup,
  updateGroup,
  archiveGroup,
  restoreGroupFromArchive,
  trashGroup,
  restoreGroupFromTrash,
  getGroup,
  listCategories,
  getCategory,
  createCategory,
  updateCategory,
  archiveCategory,
  restoreCategoryFromArchive,
  trashCategory,
  restoreCategoryFromTrash,
  getCategoryStats,
  getCategoryOverview,
  listAssignees,
  getAssetTransitions,
  listAssets,
  createAsset,
  getAsset,
  updateAsset,
  changeAssetStatus,
  softDeleteAsset,
  restoreAsset,
  listAssetVersions,
  restoreAssetVersion,
  listAssetHistory,
  getPortfolioTree,
};
