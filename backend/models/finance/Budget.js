const mongoose = require('mongoose');

const budgetSchema = new mongoose.Schema(
  {
    // @deprecated legacy free-text department — kept for backward compatibility during migration.
    // New code must read/write `departmentId`; this stays dual-written for now.
    department: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
    fiscalYear: { type: String, required: true, trim: true },
    financialPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceFinancialPeriod', index: true, default: null },
    allocated: { type: Number, required: true },
    spent: { type: Number, default: 0 },
    reserved: { type: Number, default: 0 },
    available: { type: Number, default: 0 },
    utilization: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'approved', 'active', 'closed', 'on-track', 'at-risk', 'over'],
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

budgetSchema.add({ costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCostCenter' }, alertThreshold: { type: Number, min: 1, max: 100, default: 85 } });

budgetSchema.index({ departmentId: 1, fiscalYear: 1, costCenterId: 1, financialPeriodId: 1 }, { unique: true, partialFilterExpression: { departmentId: { $type: 'objectId' } } });

module.exports = mongoose.models['FinanceBudget'] || mongoose.model('FinanceBudget', budgetSchema);
