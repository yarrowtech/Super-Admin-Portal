const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    invoice: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceInvoice' },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceClient' },
    customerName: { type: String, trim: true },
    amount: { type: Number, required: true },
    method: {
      type: String,
      enum: ['cash', 'bank', 'online'],
      default: 'bank'
    },
    status: {
      type: String,
      enum: ['recorded', 'reconciled'],
      default: 'recorded'
    },
    paymentDate: { type: Date, default: Date.now },
    reference: { type: String, trim: true },
    notes: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

paymentSchema.index({ status: 1 });
paymentSchema.index({ paymentDate: -1 });

module.exports = mongoose.models['FinancePayment'] || mongoose.model('FinancePayment', paymentSchema);
