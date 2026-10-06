const mongoose = require('mongoose');

const expenseDocumentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true },
    url: { type: String, trim: true }
  },
  { _id: false }
);

const expenseSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true },
    amount: { type: Number, required: true },
    status: {
      type: String,
      enum: ['draft', 'submitted', 'pending', 'under_review', 'needs_information', 'verified', 'pending_approval', 'approved', 'rejected', 'processing', 'completed', 'cancelled', 'paid'],
      default: 'submitted'
    },
    // @deprecated legacy free-text department — kept for backward compatibility during migration.
    department: { type: String, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
    financialPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceFinancialPeriod', index: true, default: null },
    budgetId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceBudget', index: true, default: null },
    approvalId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceApprovalWorkflow', index: true, default: null },
    paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancePayment', index: true, default: null },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceJournalEntry', index: true, default: null },
    budgetReservedAt: { type: Date },
    budgetConsumedAt: { type: Date },
    budgetReleasedAt: { type: Date },
    incurredDate: { type: Date, default: Date.now },
    documents: { type: [expenseDocumentSchema], default: [] },
    notes: { type: String, trim: true },
    requestedInfo: { type: String, trim: true, default: '' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    statusHistory: {
      type: [
        {
          from: { type: String, trim: true, default: '' },
          to: { type: String, trim: true, default: '' },
          action: { type: String, trim: true, default: '' },
          comment: { type: String, trim: true, default: '' },
          actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
          actorRole: { type: String, trim: true, default: '' },
          at: { type: Date, default: Date.now }
        }
      ],
      default: []
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, default: null }
  },
  { timestamps: true }
);

expenseSchema.index({ status: 1 });
expenseSchema.index({ department: 1 });
expenseSchema.index({ projectId: 1, status: 1, createdAt: -1 });

expenseSchema.add({ vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceVendor' }, costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCostCenter' } });

// Cost behaviour. Fixed costs recur regardless of activity (rent, salaries, licences);
// variable costs move with it (materials, per-unit vendor work, travel). Classifying at the
// expense is what makes a fixed-vs-variable budget variance reportable rather than guessed.
expenseSchema.add({ costType: { type: String, enum: ['fixed', 'variable'], default: 'variable', index: true } });

// Split allocation (§C): one cost shared across several projects or departments, e.g. a
// cloud bill serving IT and Media. `departmentId`/`projectId` above remain the primary
// dimension for backward compatibility and for single-allocation costs; when `allocations`
// is non-empty it is authoritative, and the service enforces that it sums to `amount`.
expenseSchema.add({
  allocations: {
    type: [{
      departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
      projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
      costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCostCenter', default: null },
      amount: { type: Number, required: true, min: 0 },
    }],
    default: [],
  },
  disputeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceDispute', default: null, index: true },
  nonComplianceId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceNonCompliance', default: null },
});

module.exports = mongoose.models['FinanceExpense'] || mongoose.model('FinanceExpense', expenseSchema);
