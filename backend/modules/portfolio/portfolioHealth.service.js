const mongoose = require('mongoose');
const PortfolioAsset = require('../../models/portfolio/PortfolioAsset');
const PortfolioCategory = require('../../models/portfolio/PortfolioCategory');
const { resolveCategoryChain, toObjectId } = require('./portfolioShared');

// Server-computed category / portfolio health (spec §23). Health is derived, never
// stored — so it can never drift from the underlying assets.

const STALE_DAYS = 14;
const REVIEW_BACKLOG_LIMIT = 5; // > this many assets sitting in review => a signal
const ACTIVE_STATUSES = ['draft', 'in_progress', 'in_review', 'changes_requested', 'approved', 'scheduled'];

const REASON_LABELS = {
  overdue: (n) => `${n} asset${n === 1 ? '' : 's'} overdue`,
  blocked: (n) => `${n} asset${n === 1 ? '' : 's'} blocked`,
  review_backlog: (n) => `${n} asset${n === 1 ? '' : 's'} waiting for review`,
  missing_owner: (n) => `${n} active asset${n === 1 ? '' : 's'} missing an owner`,
  missing_due_date: (n) => `${n} active asset${n === 1 ? '' : 's'} without a due date`,
  stale: (n) => `${n} asset${n === 1 ? '' : 's'} not updated in ${STALE_DAYS}+ days`,
  missing_required: (n) => `${n} asset${n === 1 ? '' : 's'} missing required fields`,
};

// Each signal carries a weight; the score is 100 minus the weighted penalty
// (clamped). Thresholds map score -> status.
const SIGNAL_WEIGHT = {
  overdue: 12,
  blocked: 10,
  review_backlog: 6,
  missing_owner: 8,
  missing_due_date: 4,
  stale: 5,
  missing_required: 6,
};

const scoreToStatus = (score) => {
  if (score >= 80) return 'healthy';
  if (score >= 55) return 'needs_attention';
  return 'at_risk';
};

const buildReasons = (counts) =>
  Object.entries(counts)
    .filter(([, n]) => n > 0)
    .map(([code, n]) => ({ code, count: n, label: REASON_LABELS[code](n) }));

const computeCategoryHealth = async (categoryId) => {
  const category =
    (await PortfolioCategory.findOne({ _id: categoryId, deletedAt: null }).lean()) ||
    (await resolveCategoryChain(categoryId));

  const required = category.requiredFields || {};
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_DAYS * 864e5);
  const match = { categoryId: toObjectId(categoryId), deletedAt: null, status: { $ne: 'archived' } };

  const assets = await PortfolioAsset.find(match)
    .select('status ownerId reviewerId dueDate assetType campaign updatedAt')
    .lean();

  const counts = {
    overdue: 0,
    blocked: 0,
    review_backlog: 0,
    missing_owner: 0,
    missing_due_date: 0,
    stale: 0,
    missing_required: 0,
  };

  let inReview = 0;
  assets.forEach((a) => {
    const isActive = ACTIVE_STATUSES.includes(a.status);
    if (a.dueDate && new Date(a.dueDate) < now && !['published', 'measuring', 'archived'].includes(a.status)) {
      counts.overdue += 1;
    }
    if (a.status === 'blocked') counts.blocked += 1;
    if (a.status === 'in_review') inReview += 1;
    if (isActive && !a.ownerId) counts.missing_owner += 1;
    if (isActive && !a.dueDate) counts.missing_due_date += 1;
    if (a.updatedAt && new Date(a.updatedAt) < staleBefore && isActive) counts.stale += 1;

    const missing =
      (required.owner && !a.ownerId) ||
      (required.reviewer && !a.reviewerId) ||
      (required.dueDate && !a.dueDate) ||
      (required.campaign && !a.campaign) ||
      (required.assetType && !a.assetType);
    if (isActive && missing) counts.missing_required += 1;
  });
  if (inReview > REVIEW_BACKLOG_LIMIT) counts.review_backlog = inReview;

  const penalty = Object.entries(counts).reduce((sum, [code, n]) => {
    if (n <= 0) return sum;
    // Diminishing returns: first occurrence full weight, extras half.
    return sum + SIGNAL_WEIGHT[code] + Math.min(n - 1, 6) * (SIGNAL_WEIGHT[code] / 2);
  }, 0);

  const score = Math.max(0, Math.min(100, Math.round(100 - penalty)));
  const totalAssets = assets.length;
  // A brand-new empty category is "healthy" (nothing wrong), not "at risk".
  const status = totalAssets === 0 ? 'healthy' : scoreToStatus(score);

  return { status, score, totalAssets, reasons: buildReasons(counts) };
};

const computePortfolioHealth = async (portfolioId) => {
  const categories = await PortfolioCategory.find({ portfolioId, deletedAt: null }).select('_id').lean();
  const healths = await Promise.all(categories.map((c) => computeCategoryHealth(c._id)));
  if (!healths.length) return { status: 'healthy', score: 100, reasons: [], categories: [] };

  const avg = Math.round(healths.reduce((s, h) => s + h.score, 0) / healths.length);
  const worst = healths.reduce((w, h) => (h.score < w.score ? h : w), healths[0]);
  const status =
    healths.some((h) => h.status === 'at_risk') ? 'at_risk'
      : healths.some((h) => h.status === 'needs_attention') ? 'needs_attention'
        : 'healthy';

  return {
    status,
    score: avg,
    reasons: worst.reasons,
    categories: categories.map((c, i) => ({ categoryId: c._id, ...healths[i] })),
  };
};

module.exports = { computeCategoryHealth, computePortfolioHealth, STALE_DAYS };
