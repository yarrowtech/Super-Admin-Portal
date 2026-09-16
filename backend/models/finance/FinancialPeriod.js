const mongoose = require('mongoose');

const financialPeriodSchema = new mongoose.Schema(
  {
    fiscalYear: { type: String, required: true, trim: true },
    label: { type: String, required: true, trim: true },
    periodType: { type: String, enum: ['annual', 'quarter', 'month'], required: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    parentPeriod: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceFinancialPeriod', default: null },
    isCurrent: { type: Boolean, default: false },
    // Reserved for a later phase's period-close workflow; always false in Phase 1.
    isClosed: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
  },
  { timestamps: true }
);

financialPeriodSchema.index({ fiscalYear: 1, periodType: 1 });

module.exports = mongoose.models['FinanceFinancialPeriod'] || mongoose.model('FinanceFinancialPeriod', financialPeriodSchema);
