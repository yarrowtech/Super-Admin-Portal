const mongoose = require('mongoose');
const reviewSchema = require('./reviewSchema');

const documentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, required: true },
    sha256: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// A refund returns money already received, so it is anchored to the *payment* as well as
// the invoice. Anchoring to the invoice alone would allow refunding more than was ever
// collected on it.
const refundSchema = new mongoose.Schema(
  {
    refundNumber: { type: String, required: true, unique: true, trim: true },
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice', required: true, index: true },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancePayment', required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    method: { type: String, enum: ['bank', 'cash', 'online', 'adjustment'], default: 'bank' },
    // Unique per payment — makes a retried request idempotent instead of double-refunding.
    reference: { type: String, required: true, trim: true, maxlength: 120 },
    status: { type: String, enum: ['draft', 'submitted', 'approved', 'processed', 'rejected'], default: 'draft', index: true },
    documents: { type: [documentSchema], default: [] },

    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCostCenter', default: null },

    journalEntryId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceJournalEntry', default: null },
    creditNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoiceNote', default: null },

    // Reuses the portal's existing maker-checker, so a refund follows the same
    // submit/approve/return path finance staff already know from invoices and journals.
    review: { type: reviewSchema, default: () => ({}) },

    requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    approvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  },
  { timestamps: true }
);

refundSchema.index({ invoice: 1, createdAt: -1 });
refundSchema.index({ status: 1, createdAt: -1 });
refundSchema.index({ payment: 1, reference: 1 }, { unique: true });

module.exports = mongoose.models.FinanceRefund || mongoose.model('FinanceRefund', refundSchema);
