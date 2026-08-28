const ActivityLog = require('../../models/auth/ActivityLog');
const PortfolioAsset = require('../../models/portfolio/PortfolioAsset');
const PortfolioTask = require('../../models/portfolio/PortfolioTask');
const PortfolioFile = require('../../models/portfolio/PortfolioFile');
const PortfolioComment = require('../../models/portfolio/PortfolioComment');
const { resolveCategoryChain, rangeStart } = require('./portfolioShared');

// Category-scoped activity feed (spec §10). Reads the append-only ActivityLog
// (written by services/auditTrail.service.js) — there is no separate/parallel
// history store and nothing is fabricated client-side.

const WORKFLOW_ACTIONS = new Set([
  'STATUS_CHANGED',
  'APPROVAL_REQUESTED',
  'APPROVED',
  'CHANGES_REQUESTED',
  'PUBLISHED',
  'MEASURING_STARTED',
  'VERSION_CREATED',
  'VERSION_RESTORED',
]);

const typeOf = (row) => {
  const t = row.targetType;
  if (t === 'PortfolioTask') return 'tasks';
  if (t === 'PortfolioFile') return 'files';
  if (t === 'PortfolioComment') return 'comments';
  if (t === 'PortfolioAsset') return WORKFLOW_ACTIONS.has(row.action) ? 'workflow' : 'assets';
  return 'system';
};

// Builds the id-set that belongs to a category: the category, its assets, its
// tasks, its files, and comments on its assets.
const categoryTargetIds = async (categoryId) => {
  const [assets, tasks, files] = await Promise.all([
    PortfolioAsset.find({ categoryId }).select('_id').lean(),
    PortfolioTask.find({ categoryId }).select('_id').lean(),
    PortfolioFile.find({ categoryId }).select('_id').lean(),
  ]);
  const assetIds = assets.map((a) => a._id);
  const comments = await PortfolioComment.find({ assetId: { $in: assetIds } }).select('_id').lean();

  return [
    String(categoryId),
    ...assetIds.map(String),
    ...tasks.map((t) => String(t._id)),
    ...files.map((f) => String(f._id)),
    ...comments.map((c) => String(c._id)),
  ];
};

const listCategoryActivity = async (categoryId, { type = 'all', range = 'all', cursor, limit = 25 } = {}) => {
  await resolveCategoryChain(categoryId);
  const ids = await categoryTargetIds(categoryId);

  const filter = { module: 'portfolio', targetId: { $in: ids } };
  const since = rangeStart(range);
  if (since) filter.createdAt = { $gte: since };
  if (cursor) filter._id = { $lt: cursor };

  const pageSize = Math.min(100, Math.max(1, Number(limit) || 25));
  // Over-fetch so client-side `type` narrowing still fills a page.
  const rows = await ActivityLog.find(filter)
    .sort({ _id: -1 })
    .limit((type && type !== 'all' ? pageSize * 4 : pageSize) + 1)
    .populate('actor', 'firstName lastName email profileImage')
    .lean();

  let filtered = rows.map((r) => ({ ...r, activityType: typeOf(r) }));
  if (type && type !== 'all') filtered = filtered.filter((r) => r.activityType === type);

  const hasMore = filtered.length > pageSize;
  const items = hasMore ? filtered.slice(0, pageSize) : filtered;
  return { items, nextCursor: hasMore ? String(items[items.length - 1]._id) : null };
};

module.exports = { listCategoryActivity, categoryTargetIds, typeOf };
