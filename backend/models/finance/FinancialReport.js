const mongoose = require('mongoose');

const financialReportSchema = new mongoose.Schema(
  {
    type: { type: String, required: true, trim: true },
    periodStart: { type: Date },
    periodEnd: { type: Date },
    summary: { type: String, trim: true, default: '' },
    exportFormat: { type: String, enum: ['pdf', 'csv', 'xlsx', 'json'], default: 'pdf' },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FinanceFinancialReport || mongoose.model('FinanceFinancialReport', financialReportSchema);
