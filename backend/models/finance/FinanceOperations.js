const mongoose = require('mongoose');
const { Schema } = mongoose;
const bankSchema = new Schema({
  account: { type: String, required: true, maxlength: 120 },
  reference: { type: String, required: true, maxlength: 120 },
  date: { type: Date, required: true },
  amountMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  direction: { type: String, enum: ['in', 'out'], required: true },
  description: { type: String, maxlength: 500 },
  payment: { type: Schema.Types.ObjectId, ref: 'FinancePayment', default: null },
  importedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  matchedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  matchedAt: Date,
}, { timestamps: true });
bankSchema.index({ account: 1, reference: 1 }, { unique: true });
bankSchema.index({ payment: 1 }, { unique: true, partialFilterExpression: { payment: { $type: 'objectId' } } });
bankSchema.index({ date: -1, payment: 1 });
const salarySchema = new Schema({
  employee: { type: Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  baseMinor: { type: Number, required: true, min: 1, validate: Number.isSafeInteger },
  allowanceMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  deductionMinor: { type: Number, default: 0, min: 0, validate: Number.isSafeInteger },
  departmentId: { type: Schema.Types.ObjectId, ref: 'Department', required: true },
  effectiveFrom: { type: Date, required: true },
  authorizedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
// Configurable statutory rates. A rate change is a new rule with a new effective date;
// used rules are never rewritten, only closed with effectiveTo.
const taxRuleSchema = new Schema({
  kind: { type: String, enum: ['gst', 'tds'], required: true },
  code: { type: String, required: true, trim: true, maxlength: 40 },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  section: { type: String, trim: true, maxlength: 40, default: '' },
  rateBp: { type: Number, required: true, min: 0, max: 10000, validate: Number.isInteger },
  effectiveFrom: { type: Date, required: true },
  effectiveTo: { type: Date, default: null },
  isActive: { type: Boolean, default: true },
  notes: { type: String, trim: true, maxlength: 1000 },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User' },
}, { timestamps: true });
taxRuleSchema.index({ kind: 1, rateBp: 1, effectiveFrom: -1 });
taxRuleSchema.index({ kind: 1, code: 1, effectiveFrom: 1 }, { unique: true });
module.exports = {
  TaxRule: mongoose.models.FinanceTaxRule || mongoose.model('FinanceTaxRule', taxRuleSchema),
  BankTransaction: mongoose.models.FinanceBankTransaction || mongoose.model('FinanceBankTransaction', bankSchema),
  Salary: mongoose.models.FinanceSalary || mongoose.model('FinanceSalary', salarySchema),
};
