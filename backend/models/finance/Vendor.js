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
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

vendorSchema.index({ name: 1 });

module.exports = mongoose.models['FinanceVendor'] || mongoose.model('FinanceVendor', vendorSchema);
