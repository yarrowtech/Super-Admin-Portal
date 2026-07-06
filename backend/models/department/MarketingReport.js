const mongoose = require('mongoose');

const PERIOD_TYPES = ['weekly', 'monthly', 'quarterly', 'annual'];

const marketingReportSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', required: true, index: true },
    periodType: { type: String, enum: PERIOD_TYPES, required: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    snapshot: { type: mongoose.Schema.Types.Mixed, default: {} },
    generatedAt: { type: Date, default: Date.now },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

marketingReportSchema.index({ projectId: 1, periodType: 1, periodStart: -1 });

module.exports = mongoose.models.MarketingReport || mongoose.model('MarketingReport', marketingReportSchema);
module.exports.PERIOD_TYPES = PERIOD_TYPES;
