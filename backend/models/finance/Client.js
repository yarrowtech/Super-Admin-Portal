const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    contactEmail: { type: String, trim: true, default: '' },
    contactPhone: { type: String, trim: true, default: '' },
    paymentTerms: { type: String, trim: true, default: '' },
    balance: { type: Number, default: 0 },
    notes: { type: String, trim: true, default: '' },
  },
  { timestamps: true }
);

clientSchema.index({ name: 1, contactEmail: 1 }, { unique: true });

module.exports = mongoose.models.FinanceClient || mongoose.model('FinanceClient', clientSchema);
