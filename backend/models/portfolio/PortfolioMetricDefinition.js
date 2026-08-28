const mongoose = require('mongoose');

// The catalogue of measurable metrics (spec §13). Categories/assets do not
// hardcode "Blogs metrics" — the Metrics tab renders whatever definitions are
// active. Seeded idempotently by backend/scripts/seedPortfolioMetricDefinitions.js.
const METRIC_UNITS = ['number', 'percent', 'currency', 'rating', 'rank'];
const METRIC_AGGREGATIONS = ['sum', 'avg', 'latest'];

const portfolioMetricDefinitionSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true, trim: true, lowercase: true },
    label: { type: String, required: true, trim: true },
    unit: { type: String, enum: METRIC_UNITS, default: 'number' },
    // How a set of daily entries rolls up into a single summary number.
    aggregation: { type: String, enum: METRIC_AGGREGATIONS, default: 'sum' },
    // `asset` metrics can be entered per-asset AND rolled up to the category;
    // `category` metrics are only entered at the category level.
    scope: { type: String, enum: ['asset', 'category'], default: 'asset' },
    description: { type: String, trim: true, default: '' },
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports =
  mongoose.models.PortfolioMetricDefinition ||
  mongoose.model('PortfolioMetricDefinition', portfolioMetricDefinitionSchema);
module.exports.METRIC_UNITS = METRIC_UNITS;
module.exports.METRIC_AGGREGATIONS = METRIC_AGGREGATIONS;
