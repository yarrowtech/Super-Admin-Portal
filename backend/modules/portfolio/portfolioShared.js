const mongoose = require('mongoose');
const Portfolio = require('../../models/Portfolio');
const PortfolioGroup = require('../../models/portfolio/PortfolioGroup');
const PortfolioCategory = require('../../models/portfolio/PortfolioCategory');
const PortfolioAsset = require('../../models/portfolio/PortfolioAsset');
const User = require('../../models/auth/User');
const { writeAuditTrail } = require('../../services/auditTrail.service');

// Shared primitives for every portfolio-hierarchy service module. Extracted from
// portfolioHierarchy.service.js so the Tasks / Files / Metrics / Comments /
// Relations / Health / Activity services can enforce the same validation and
// audit conventions without importing the (larger) hierarchy service.

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
const toObjectId = (id) => new mongoose.Types.ObjectId(id);

// Fire-and-forget audit — never blocks or fails the mutation it records.
const audit = (actor, action, targetType, targetId, metadata = {}) =>
  writeAuditTrail({
    userId: actor?.id,
    role: actor?.role,
    module: 'portfolio',
    action,
    targetType,
    targetId: targetId ? String(targetId) : '',
    metadata,
  }).catch(() => null);

// Loads a category and its full parent chain, throwing 404 if missing/trashed.
// When `portfolioId` is supplied (from a route param) the chain must match it —
// this is the server-side hierarchy check the spec §33 requires.
const resolveCategoryChain = async (categoryId, { portfolioId } = {}) => {
  assertId(categoryId, 'category id');
  const category = await PortfolioCategory.findOne({ _id: categoryId, deletedAt: null });
  if (!category) throw new NotFoundError('Category not found');
  if (portfolioId && String(category.portfolioId) !== String(portfolioId)) {
    throw new ValidationError('Category does not belong to this portfolio');
  }
  return category;
};

const resolveAssetChain = async (assetId, { portfolioId, categoryId } = {}) => {
  assertId(assetId, 'asset id');
  const asset = await PortfolioAsset.findOne({ _id: assetId, deletedAt: null });
  if (!asset) throw new NotFoundError('Asset not found');
  if (portfolioId && String(asset.portfolioId) !== String(portfolioId)) {
    throw new ValidationError('Asset does not belong to this portfolio');
  }
  if (categoryId && String(asset.categoryId) !== String(categoryId)) {
    throw new ValidationError('Asset does not belong to this category');
  }
  return asset;
};

const getPortfolioProjectId = async (portfolioId) => {
  const portfolio = await Portfolio.findById(portfolioId).select('project').lean();
  return portfolio?.project || null;
};

// Validates a user id is a real, active user. Returns the id (as ObjectId) or
// null for empty input; throws 400 for a non-existent / inactive user.
const assertActiveUser = async (userId, label = 'user') => {
  if (userId === undefined || userId === null || userId === '') return null;
  assertId(userId, `${label} id`);
  const user = await User.findOne({ _id: userId, isActive: true }).select('_id').lean();
  if (!user) throw new ValidationError(`Selected ${label} is not a valid active user`);
  return toObjectId(userId);
};

const USER_SUMMARY_FIELDS = 'firstName lastName email role profileImage';

const userSummary = (user) => {
  if (!user || typeof user !== 'object') return null;
  return {
    _id: user._id,
    firstName: user.firstName || '',
    lastName: user.lastName || '',
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || 'User',
    email: user.email || '',
    role: user.role || '',
    profileImage: user.profileImage || '',
  };
};

// Start-of-day / end-of-day helpers for metric dates and range filters.
const startOfUTCDay = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const rangeStart = (range) => {
  const now = new Date();
  switch (range) {
    case 'today': return startOfUTCDay(now);
    case 'week': return new Date(now.getTime() - 7 * 864e5);
    case 'month': return new Date(now.getTime() - 30 * 864e5);
    case '90d': return new Date(now.getTime() - 90 * 864e5);
    case 'all':
    default: return null;
  }
};

module.exports = {
  NotFoundError,
  ValidationError,
  isValidId,
  assertId,
  toObjectId,
  audit,
  resolveCategoryChain,
  resolveAssetChain,
  getPortfolioProjectId,
  assertActiveUser,
  userSummary,
  USER_SUMMARY_FIELDS,
  startOfUTCDay,
  rangeStart,
  PortfolioGroup,
  PortfolioCategory,
  PortfolioAsset,
};
