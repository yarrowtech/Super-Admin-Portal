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
      enum: ['submitted', 'verified', 'rejected', 'paid'],
      default: 'submitted'
    },
    department: { type: String, trim: true },
    incurredDate: { type: Date, default: Date.now },
    documents: { type: [expenseDocumentSchema], default: [] },
    notes: { type: String, trim: true },
    submittedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

expenseSchema.index({ status: 1 });
expenseSchema.index({ department: 1 });

module.exports = mongoose.models['FinanceExpense'] || mongoose.model('FinanceExpense', expenseSchema);
