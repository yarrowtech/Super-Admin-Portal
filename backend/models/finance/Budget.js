const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    department: { type: String, required: true, trim: true },
    fiscalYear: { type: String, required: true, trim: true },
    allocated: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    utilization: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['on-track', 'at-risk', 'over'],
      default: 'on-track'
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, default: null },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

budgetSchema.index({ department: 1, fiscalYear: 1 }, { unique: false });
budgetSchema.index({ projectId: 1, fiscalYear: 1 });

module.exports = mongoose.models['FinanceBudget'] || mongoose.model('FinanceBudget', budgetSchema);
