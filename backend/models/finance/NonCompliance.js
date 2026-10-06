const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    label: { type: String, trim: true, default: '' },
    url: { type: String, trim: true, required: true },
    sha256: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

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

// Tracks a breach of what was agreed: a missed deadline, a budget overrun, work that did
// not meet quality or that drifted out of scope. Separate from a dispute because most
// breaches are recorded and remediated without ever freezing money; the ones that matter
// financially get escalated into a dispute, which is what `disputeId` records.
const nonComplianceSchema = new mongoose.Schema(
  {
    ticketNumber: { type: String, required: true, unique: true, trim: true },
    kind: {
      type: String,
      required: true,
      enum: ['missed_deadline', 'budget_overrun', 'quality_deviation', 'scope_deviation', 'other'],
      index: true,
    },
    severity: { type: String, enum: ['low', 'medium', 'high', 'critical'], default: 'medium', index: true },
    status: { type: String, enum: ['open', 'acknowledged', 'remediated', 'waived'], default: 'open', index: true },

    party: { type: String, required: true, enum: ['vendor', 'client', 'internal'] },
    vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceVendor', default: null },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceClient', default: null },
    // Free text or a Law-portal document id — the agreement that was breached.
    contractRef: { type: String, trim: true, default: '' },

    subjectType: { type: String, enum: ['invoice', 'expense', 'budget', 'project', 'vendor'], default: 'project' },
    subjectId: { type: mongoose.Schema.Types.ObjectId, default: null },

    description: { type: String, required: true, trim: true, maxlength: 2000 },
    // Quantified where it is known; 0 means "not quantified", not "no impact".
    financialImpact: { type: Number, default: 0 },
    documents: { type: [documentSchema], default: [] },

    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true, index: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null, index: true },

    disputeId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceDispute', default: null },
    timeline: { type: [timelineSchema], default: [] },

    raisedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    acknowledgedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    closedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    dueBy: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

nonComplianceSchema.index({ status: 1, severity: 1, createdAt: -1 });
nonComplianceSchema.index({ departmentId: 1, status: 1 });
nonComplianceSchema.index({ projectId: 1, status: 1 });

module.exports = mongoose.models.FinanceNonCompliance || mongoose.model('FinanceNonCompliance', nonComplianceSchema);
