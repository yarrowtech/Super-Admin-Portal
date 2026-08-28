const mongoose = require('mongoose');

// The spec's "Asset / Record" level (e.g. one blog post) — the actual content
// item with its own lifecycle. Genuinely new; no prior equivalent existed
// (the legacy `items[]` row was a flat category label, not a content record).
//
// Fields are scoped to what the Foundation-phase UI renders (Overview/Content/
// Execution/History tabs). Files/Comments/Performance/Relations are documented
// as a follow-up roadmap and intentionally have no backing fields here yet, to
// avoid a half-built schema.
const ASSET_STATUSES = [
  'backlog',
  'draft',
  'in_progress',
  'in_review',
  'changes_requested',
  'approved',
  'scheduled',
  'published',
  'measuring',
  'blocked',
  'archived',
];

const ASSET_PRIORITIES = ['low', 'medium', 'high', 'critical'];

const portfolioAssetSchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioCategory', required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioGroup', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },

    // Overview
    title: { type: String, required: true, trim: true },
    assetType: { type: String, trim: true, default: '' },
    description: { type: String, trim: true, default: '' },
    status: { type: String, enum: ASSET_STATUSES, default: 'backlog', index: true },
    priority: { type: String, enum: ASSET_PRIORITIES, default: 'medium' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    tags: [{ type: String, trim: true }],
    targetAudience: { type: String, trim: true, default: '' },
    market: { type: String, trim: true, default: '' },
    channel: { type: String, trim: true, default: '' },
    campaign: { type: String, trim: true, default: '' },

    // Content
    summary: { type: String, trim: true, default: '' },
    content: { type: String, default: '' },
    cta: { type: String, trim: true, default: '' },
    headline: { type: String, trim: true, default: '' },
    seoTitle: { type: String, trim: true, default: '' },
    metaDescription: { type: String, trim: true, default: '' },
    keywords: [{ type: String, trim: true }],
    angle: { type: String, trim: true, default: '' },
    notes: { type: String, trim: true, default: '' },

    // Execution
    startDate: { type: Date, default: null },
    dueDate: { type: Date, default: null, index: true },
    reviewDate: { type: Date, default: null },
    publishDate: { type: Date, default: null },
    scheduleDate: { type: Date, default: null },

    // Versioning
    currentVersion: { type: Number, default: 1 },
    lastVersionedAt: { type: Date, default: null },

    // Migration traceability
    legacyItemId: { type: String, default: null },
    legacyId: { type: String, default: null },
    legacySource: { type: String, default: null },
    migratedAt: { type: Date, default: null },
    migrationBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'MigrationBatch', default: null },
    migrationCreated: { type: Boolean, default: false },

    // Soft delete
    deletedAt: { type: Date, default: null, index: true },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

portfolioAssetSchema.index({ categoryId: 1, status: 1 });
portfolioAssetSchema.index({ portfolioId: 1, status: 1 });
portfolioAssetSchema.index(
  { portfolioId: 1, legacySource: 1, legacyId: 1 },
  { unique: true, partialFilterExpression: { legacyId: { $type: 'string' }, legacySource: { $type: 'string' } } }
);

const PortfolioAsset = mongoose.models.PortfolioAsset || mongoose.model('PortfolioAsset', portfolioAssetSchema);

module.exports = PortfolioAsset;
module.exports.ASSET_STATUSES = ASSET_STATUSES;
module.exports.ASSET_PRIORITIES = ASSET_PRIORITIES;
