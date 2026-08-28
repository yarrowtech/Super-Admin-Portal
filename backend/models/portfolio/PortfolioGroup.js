const mongoose = require('mongoose');

// The spec's "Portfolio" level (e.g. "Product Portfolio 1") — one of the named
// groups inside a project's Digital Portfolio. Additive alongside the legacy
// `Portfolio.sections[]` embedded array, which is left untouched for rollback
// safety (see backend/scripts/migratePortfolioHierarchy.js).
const portfolioGroupSchema = new mongoose.Schema(
  {
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    brandCode: { type: String, trim: true, uppercase: true, default: '' },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    // The strategic role of this portfolio group, e.g. "Awareness + Organic
    // Demand" — shown on the portfolio card under the title.
    purpose: { type: String, trim: true, default: '' },
    icon: { type: String, trim: true, default: 'view_column' },
    accent: { type: String, trim: true, default: 'indigo' },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    order: { type: Number, default: 0 },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date, default: null },
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // Migration traceability — the legacy embedded section this group was
    // migrated from, if any. Lets the migration script re-run idempotently.
    legacySectionId: { type: String, default: null },
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

portfolioGroupSchema.index({ portfolioId: 1, order: 1 });
portfolioGroupSchema.index(
  { portfolioId: 1, legacySource: 1, legacyId: 1 },
  { unique: true, partialFilterExpression: { legacyId: { $type: 'string' }, legacySource: { $type: 'string' } } }
);
portfolioGroupSchema.index({ deletedAt: 1 });

module.exports = mongoose.models.PortfolioGroup || mongoose.model('PortfolioGroup', portfolioGroupSchema);
