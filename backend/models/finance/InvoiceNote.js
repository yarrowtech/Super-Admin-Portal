const mongoose = require('mongoose');

const invoiceNoteSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice', required: true },
    type: { type: String, enum: ['credit', 'debit'], default: 'credit' },
    amount: { type: Number, required: true, min: 0 },
    reason: { type: String, trim: true, default: '' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

invoiceNoteSchema.index({ invoice: 1, createdAt: -1 });

module.exports = mongoose.models.FinanceInvoiceNote || mongoose.model('FinanceInvoiceNote', invoiceNoteSchema);
