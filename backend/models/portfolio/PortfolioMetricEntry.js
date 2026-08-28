const mongoose = require('mongoose');

// A single measurement: one metric, one day, for either a specific asset or the
// category as a whole (spec §13). Entered manually or via CSV import — there is
// no external analytics integration. `date` is normalised to UTC midnight so
// re-entering the same metric/day/asset upserts instead of duplicating.
const portfolioMetricEntrySchema = new mongoose.Schema(
  {
    categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioCategory', required: true, index: true },
    portfolioId: { type: mongoose.Schema.Types.ObjectId, ref: 'Portfolio', required: true, index: true },
    assetId: { type: mongoose.Schema.Types.ObjectId, ref: 'PortfolioAsset', default: null, index: true },
    metricKey: { type: String, required: true, trim: true, lowercase: true, index: true },
    value: { type: Number, required: true },
    date: { type: Date, required: true, index: true },
    source: { type: String, enum: ['manual', 'csv'], default: 'manual' },
    note: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

// One value per (asset-or-category, metric, day). `assetId: null` entries are
// category-level; the partial unique indexes keep the two scopes independent.
portfolioMetricEntrySchema.index(
  { assetId: 1, metricKey: 1, date: 1 },
  { unique: true, partialFilterExpression: { assetId: { $type: 'objectId' } } }
);
portfolioMetricEntrySchema.index(
  { categoryId: 1, metricKey: 1, date: 1 },
  { unique: true, partialFilterExpression: { assetId: null } }
);
portfolioMetricEntrySchema.index({ categoryId: 1, metricKey: 1, date: -1 });

module.exports =
  mongoose.models.PortfolioMetricEntry || mongoose.model('PortfolioMetricEntry', portfolioMetricEntrySchema);
