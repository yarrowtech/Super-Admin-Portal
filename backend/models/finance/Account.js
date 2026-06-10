const mongoose = require('mongoose');

const accountSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, trim: true, unique: true },
    name: { type: String, required: true, trim: true },
    type: {
      type: String,
      enum: ['asset', 'liability', 'equity', 'revenue', 'expense'],
      default: 'asset',
    },
    normalBalance: { type: String, enum: ['debit', 'credit'], default: 'debit' },
    isActive: { type: Boolean, default: true },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.models.FinanceAccount || mongoose.model('FinanceAccount', accountSchema);
