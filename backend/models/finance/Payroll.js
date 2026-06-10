const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    employeeName: { type: String, trim: true },
    periodStart: { type: Date, required: true },
    periodEnd: { type: Date, required: true },
    grossPay: { type: Number, required: true },
    deductions: { type: Number, default: 0 },
    netPay: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['draft', 'processed', 'disbursed'],
      default: 'draft'
    },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Project', index: true, default: null },
    payslipNumber: { type: String, trim: true },
    paidOn: { type: Date },
    notes: { type: String, trim: true }
  },
  { timestamps: true }
);

payrollSchema.index({ periodStart: 1, periodEnd: 1 });
payrollSchema.index({ projectId: 1, periodStart: -1 });

module.exports = mongoose.models['FinancePayroll'] || mongoose.model('FinancePayroll', payrollSchema);
