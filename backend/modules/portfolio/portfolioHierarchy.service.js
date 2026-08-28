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

// ---- Status workflow (spec §7 "Default general workflow", hardcoded for the
// Foundation phase — a real configurable Workflow collection can replace this
// map later without an asset-schema migration). ----
const ASSET_STATUS_TRANSITIONS = {
  backlog: ['draft', 'archived'],
  draft: ['backlog', 'in_progress', 'archived'],
  in_progress: ['draft', 'in_review', 'archived'],
  in_review: ['in_progress', 'changes_requested', 'approved', 'archived'],
  changes_requested: ['in_progress', 'archived'],
  approved: ['in_review', 'scheduled', 'published', 'archived'],
  scheduled: ['approved', 'published', 'archived'],
  published: ['archived'],
  archived: ['draft'],
};

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
  'summary', 'content', 'cta', 'headline', 'seoTitle', 'metaDescription', 'keywords', 'notes',
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
  const { title, description, icon, brandCode } = body;
  if (!title || !String(title).trim()) throw new ValidationError('Group title is required');

  const count = await PortfolioGroup.countDocuments({ portfolioId, deletedAt: null });
  const group = await PortfolioGroup.create({
    portfolioId,
    brandCode: brandCode || '',
    title: title.trim(),
    description: description || '',
    icon: icon || 'view_column',
    order: count,
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
  const { title, description, icon, order, brandCode } = body;
  if (title !== undefined) group.title = title;
  if (description !== undefined) group.description = description;
  if (icon !== undefined) group.icon = icon;
  if (order !== undefined) group.order = order;
  if (brandCode !== undefined) group.brandCode = brandCode;
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

const getCategory = (categoryId) => findCategoryOrThrow(categoryId);

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
  if (params.search) {
    const re = new RegExp(String(params.search).trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    filter.$or = [{ title: re }, { description: re }, { tags: re }];
  }

  const [items, total] = await Promise.all([
    PortfolioAsset.find(filter)
      .select(ASSET_LIST_FIELDS)
      .populate('ownerId', 'firstName lastName email')
      .populate('reviewerId', 'firstName lastName email')
      .sort({ updatedAt: -1 })
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

  const asset = await PortfolioAsset.create({
    categoryId: category._id,
    groupId: category.groupId,
    portfolioId: category.portfolioId,
    title: title.trim(),
    assetType: body.assetType || '',
    description: body.description || '',
    priority: body.priority || 'medium',
    ownerId: body.ownerId || null,
    tags: Array.isArray(body.tags) ? body.tags : [],
    createdBy: actor?.id,
    updatedBy: actor?.id,
  });
  await audit(actor, 'ASSET_CREATED', 'PortfolioAsset', asset._id, { categoryId, title: asset.title });
  return asset;
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
  const allowed = ASSET_STATUS_TRANSITIONS[asset.status] || [];
  if (asset.status === nextStatus) throw new ValidationError(`Asset is already ${nextStatus}`);
  if (!allowed.includes(nextStatus)) {
    throw new ValidationError(`Cannot move status from "${asset.status}" to "${nextStatus}"`);
  }
  const previousStatus = asset.status;
  asset.status = nextStatus;
  await createAssetVersion({ asset, changeSummary: `Status changed: ${previousStatus} → ${nextStatus}`, actorId: actor?.id });
  asset.updatedBy = actor?.id;
  await asset.save();
  await audit(actor, 'STATUS_CHANGED', 'PortfolioAsset', asset._id, { from: previousStatus, to: nextStatus, version: asset.currentVersion });
  return findAssetOrThrow(asset._id);
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

  const groups = await PortfolioGroup.find({ portfolioId, deletedAt: null }).sort({ order: 1, createdAt: 1 }).lean();
  const categories = await PortfolioCategory.find({ portfolioId, deletedAt: null }).sort({ order: 1, createdAt: 1 }).lean();

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
      return {
        ...cat,
        stats: {
          total: stats.total,
          byStatus: stats.byStatus,
          overdue: overdueByCategory.get(String(cat._id)) || 0,
          needsReview: stats.byStatus.in_review || 0,
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
