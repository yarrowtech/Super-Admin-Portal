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
    department: { type: String, trim: true },
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

module.exports = mongoose.models['FinanceExpense'] || mongoose.model('FinanceExpense', expenseSchema);
