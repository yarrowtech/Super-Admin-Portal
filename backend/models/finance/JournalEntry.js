const mongoose = require('mongoose');
const reviewSchema = require('./reviewSchema');

const lineSchema = new mongoose.Schema(
  {
    account: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceAccount', required: true },
    description: { type: String, trim: true, default: '' },
    debit: { type: Number, default: 0 },
    credit: { type: Number, default: 0 },
    // Per-line dimensions, so one entry can be split across departments, projects or
    // clients (e.g. a shared cloud bill allocated to IT and Media). Each line inherits
    // the entry's dimension when it does not set its own.
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', default: null },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', default: null },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceClient', default: null },
    costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCostCenter', default: null },
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
    review: { type: reviewSchema, default: () => ({}) },
  },
  { timestamps: true }
);

journalEntrySchema.index({ entryDate: -1 });

journalEntrySchema.add({ sourceKey: String, departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, client: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceClient' }, vendor: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceVendor' }, costCenterId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceCostCenter' } });
journalEntrySchema.index({ status: 1, entryDate: -1, departmentId: 1 });
// Departmental P&L reads posted lines by their own dimension.
journalEntrySchema.index({ status: 1, 'lines.departmentId': 1, entryDate: -1 });
journalEntrySchema.index({ sourceKey: 1 }, { unique: true, partialFilterExpression: { sourceKey: { $type: 'string' } } });

module.exports = mongoose.models.FinanceJournalEntry || mongoose.model('FinanceJournalEntry', journalEntrySchema);
