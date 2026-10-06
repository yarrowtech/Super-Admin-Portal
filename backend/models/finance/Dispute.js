const mongoose = require('mongoose');

// An attachment, with a content hash so the audit trail can prove the document behind a
// decision was not swapped afterwards (§1 requires attachment hashes on the audit log).
const documentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, required: true },
    sha256: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// Append-only history. Every transition adds a row; no row is ever rewritten, which is
// what makes "who froze this and why" answerable months later.
const timelineSchema = new mongoose.Schema(
  {
    from: { type: String, trim: true, default: '' },
    to: { type: String, trim: true, default: '' },
    action: { type: String, trim: true, default: '' },
    comment: { type: String, trim: true, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    actorRole: { type: String, trim: true, default: '' },
    documents: { type: [documentSchema], default: [] },
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

// A dispute freezes money movement on one document until it is resolved. It is its own
// collection rather than a flag on the invoice because it has a lifecycle, participants
// and evidence of its own — and because the partial unique index below is what makes
// "at most one active dispute per document" true under concurrency.
const disputeSchema = new mongoose.Schema(
  {
    disputeNumber: { type: String, required: true, unique: true, trim: true },
    subjectType: { type: String, required: true, enum: ['invoice', 'payment', 'expense', 'vendor_bill'] },
    subjectId: { type: mongoose.Schema.Types.ObjectId, required: true },
    raisedAgainst: { type: String, required: true, enum: ['client', 'vendor', 'internal'] },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceClient', default: null },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceVendor', default: null },

    status: { type: String, enum: ['open', 'under_review', 'resolved', 'cancelled'], default: 'open', index: true },
    resolution: { type: String, enum: ['released', 'written_off', 'converted_to_debit_note', null], default: null },

    amountDisputed: { type: Number, required: true, min: 0 },
    reason: { type: String, required: true, trim: true, maxlength: 2000 },
    documents: { type: [documentSchema], default: [] },

    // Dimensions, so a dispute shows up in departmental and project reporting like any
    // other financial fact. Department is required; project is null for pure overhead.
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },
    costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCostCenter', default: null },

    // Resolution artefacts — which note or journal entry carried out the decision.
    debitNoteId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoiceNote', default: null },
    writeOffJournalId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceJournalEntry', default: null },

    timeline: { type: [timelineSchema], default: [] },

    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    resolvedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// The freeze lookup — read on every payment allocation, so it must be indexed.
disputeSchema.index({ subjectType: 1, subjectId: 1, status: 1 });
disputeSchema.index({ status: 1, createdAt: -1 });
disputeSchema.index({ departmentId: 1, status: 1 });
disputeSchema.index({ projectId: 1, status: 1 });

// At most one *active* dispute per subject. Enforced by the database rather than a
// read-then-write check, because two concurrent POSTs would both pass that check.
disputeSchema.index(
  { subjectType: 1, subjectId: 1 },
  { unique: true, partialFilterExpression: { status: { $in: ['open', 'under_review'] } } }
);

module.exports = mongoose.models.FinanceDispute || mongoose.model('FinanceDispute', disputeSchema);
