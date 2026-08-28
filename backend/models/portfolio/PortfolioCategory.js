const mongoose = require('mongoose');

// The spec's "Category" level (e.g. "Blogs") — sits under a PortfolioGroup and
// holds individual PortfolioAsset records. Additive alongside the legacy
// `Portfolio.sections[].items[]` embedded rows, which are left untouched.
const portfolioCategorySchema = new mongoose.Schema(
  {
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    groupId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioGroup', required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // Why this category exists — shown in the workspace header, distinct from the
    // one-line `description`. e.g. "Create, manage, review and measure editorial
    // content for organic acquisition and destination discovery."
    purpose: { type: String, trim: true, default: '' },
    order: { type: Number, default: 0 },

    // Defaults applied when an asset is created in this category (the create
    // drawer pre-fills from these; the user can still override).
    defaultAssetType: { type: String, trim: true, default: '' },
    workflowKey: { type: String, trim: true, default: 'content_publishing' },
    defaultPriority: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    reviewerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },

    // Which fields an asset MUST have set before it can be created / moved past
    // draft. Enforced server-side (createAsset / changeAssetStatus).
    requiredFields: {
      owner: { type: Boolean, default: false },
      reviewer: { type: Boolean, default: false },
      dueDate: { type: Boolean, default: false },
      campaign: { type: Boolean, default: false },
      assetType: { type: Boolean, default: false },
    },

    // Visual identity in the portfolio card + workspace header.
    icon: { type: String, trim: true, default: 'folder_open' },
    accent: { type: String, trim: true, default: 'indigo' },

    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Migration traceability — the legacy embedded item this category shell
    // was migrated from, if any (see migratePortfolioHierarchy.js).
    legacyItemId: { type: String, default: null },
    legacyId: { type: String, default: null },
    legacySource: { type: String, default: null },
    migratedAt: { type: Date, default: null },
    migrationBatchId: { type: mongoose.Schema.Types.ObjectId, ref: 'MigrationBatch', default: null },
    migrationCreated: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

portfolioCategorySchema.index({ groupId: 1, order: 1 });
portfolioCategorySchema.index(
  { portfolioId: 1, legacySource: 1, legacyId: 1 },
  { unique: true, partialFilterExpression: { legacyId: { $type: 'string' }, legacySource: { $type: 'string' } } }
);
portfolioCategorySchema.index({ deletedAt: 1 });

module.exports = mongoose.models.PortfolioCategory || mongoose.model('PortfolioCategory', portfolioCategorySchema);
