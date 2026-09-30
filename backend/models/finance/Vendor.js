const mongoose = require('mongoose');

const vendorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true },
    contactPhone: { type: String, trim: true },
    address: { type: String, trim: true },
    paymentTerms: { type: String, trim: true },
    taxId: { type: String, trim: true },
    balance: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    notes: { type: String, trim: true },
    // Vendor account: bills received raise what we owe (balance); payments made lower it.
    ledger: {
      type: [{
        type: { type: String, enum: ['bill', 'payment'], required: true },
        amount: { type: Number, required: true, min: 0 },
        reference: { type: String, trim: true, default: '' },
        date: { type: Date, default: Date.now },
        dueDate: { type: Date, default: null },
        method: { type: String, enum: ['cash', 'bank', 'online', ''], default: '' },
        note: { type: String, trim: true, default: '' },
        paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'FinancePayment', default: null },
        createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
        createdByName: { type: String, default: '' },
      }],
      default: [],
    }
  },
  { timestamps: true }
);

vendorSchema.index({ name: 1 });

module.exports = mongoose.models['FinanceVendor'] || mongoose.model('FinanceVendor', vendorSchema);
