const mongoose = require('mongoose');

const invoiceItemSchema = new mongoose.Schema(
  {
    description: { type: String, trim: true },
    quantity: { type: Number, default: 0 },
    rate: { type: Number, default: 0 },
    amount: { type: Number, default: 0 },
    taxRate: { type: Number, default: 0 },
    taxAmount: { type: Number, default: 0 }
  },
  { _id: false }
);

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, unique: true, trim: true },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'FinanceClient' },
    clientName: { type: String, required: true, trim: true },
    clientEmail: { type: String, trim: true },
    clientPhone: { type: String, trim: true },
    status: {
      type: String,
      enum: ['draft', 'sent', 'paid', 'overdue', 'void'],
      default: 'draft'
    },
    issueDate: { type: Date, default: Date.now },
    dueDate: { type: Date },
    currency: { type: String, default: 'INR' },
    gstRate: { type: Number, default: 0 },
    gstAmount: { type: Number, default: 0 },
    tdsRate: { type: Number, default: 0 },
    tdsAmount: { type: Number, default: 0 },
    items: { type: [invoiceItemSchema], default: [] },
    subtotal: { type: Number, default: 0 },
    taxTotal: { type: Number, default: 0 },
    discount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },
    amountPaid: { type: Number, default: 0 },
    balanceDue: { type: Number, default: 0 },
    notes: { type: String, trim: true },
    terms: { type: String, trim: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  { timestamps: true }
);

invoiceSchema.index({ status: 1 });

module.exports = mongoose.models['FinanceInvoice'] || mongoose.model('FinanceInvoice', invoiceSchema);
