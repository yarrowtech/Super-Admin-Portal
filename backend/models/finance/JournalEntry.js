const mongoose = require('mongoose');

const lineSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceAccount', required: true },
    description: { type: String, trim: true, default: '' },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
  },
  { _id: false }
);

const journalEntrySchema = new mongoose.Schema(
  {
    entryNumber: { type: String, required: true, unique: true, trim: true },
    memo: { type: String, trim: true, default: '' },
    entryDate: { type: Date, default: Date.now },
    lines: { type: [lineSchema], default: [] },
    totalDebit: { type: Number, default: 0 },
    totalCredit: { type: Number, default: 0 },
    status: { type: String, enum: ['draft', 'posted'], default: 'draft' },
    postedAt: { type: Date },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

journalEntrySchema.index({ entryDate: -1 });

module.exports = mongoose.models.FinanceJournalEntry || mongoose.model('FinanceJournalEntry', journalEntrySchema);
