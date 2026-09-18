const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, default: null },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', index: true, default: null },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceClient' },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceVendor' },
    requestId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceExpense', index: true, default: null },
    budgetId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceBudget', index: true, default: null },
    approvalId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceApprovalWorkflow', index: true, default: null },
    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceJournalEntry', index: true, default: null },
    financialPeriodId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceFinancialPeriod', index: true, default: null },
    customerName: { type: String, trim: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'bank', 'online'],
      default: 'bank'
    },
    status: {
      type: String,
      enum: ['requested', 'approval_pending', 'approved', 'scheduled', 'processing', 'completed', 'failed', 'cancelled', 'recorded', 'reconciled'],
      default: 'recorded'
    },
    paymentDate: { type: Date, default: Date.now },
    scheduledDate: { type: Date },
    failureReason: { type: String, trim: true, default: '' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentDate: -1 });
paymentSchema.index({ projectId: 1, status: 1, paymentDate: -1 });
paymentSchema.index({ projectId: 1, reference: 1 }, { unique: true, sparse: true });

module.exports = mongoose.models['FinancePayment'] || mongoose.model('FinancePayment', paymentSchema);
