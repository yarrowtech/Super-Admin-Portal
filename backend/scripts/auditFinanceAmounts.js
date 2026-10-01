// Finds money fields that strict handling rejects: negatives and float artifacts
// (e.g. 59279.32000000001) left by the older floating-point calculations.
//
//   node scripts/auditFinanceAmounts.js           # report only
//   node scripts/auditFinanceAmounts.js --apply   # round float artifacts to 2 dp
//
// Rounding is safe and reversible in meaning; NEGATIVE amounts are never auto-corrected,
// because a negative invoice is a data decision (a credit note or a void) a person must make.
require('dotenv').config();
const mongoose = require('mongoose');

const round2 = (n) => Math.round(n * 100) / 100;
const TARGETS = [
  ['FinanceInvoice', require('../models/finance/Invoice'), ['total', 'balanceDue', 'amountPaid', 'subtotal', 'discount', 'gstAmount', 'tdsAmount', 'taxTotal'], 'invoiceNumber'],
  ['FinancePayment', require('../models/finance/Payment'), ['amount'], 'reference'],
  ['FinanceExpense', require('../models/finance/Expense'), ['amount'], 'title'],
  ['FinanceBudget', require('../models/finance/Budget'), ['allocated', 'spent', 'reserved'], 'department'],
  ['FinancePayroll', require('../models/finance/Payroll'), ['grossPay', 'deductions', 'netPay'], 'employeeName'],
];

(async () => {
  const apply = process.argv.includes('--apply');
  if (!process.env.MONGO_URI) { console.error('MONGO_URI is not set'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);
  let negatives = 0; let artifacts = 0; let fixed = 0;

  for (const [label, Model, fields, nameField] of TARGETS) {
    for await (const doc of Model.find({}).cursor()) {
      const updates = {};
      for (const field of fields) {
        const value = doc[field];
        if (value === undefined || value === null) continue;
        const n = Number(value);
        if (!Number.isFinite(n)) continue;
        if (n < 0) {
          negatives += 1;
          console.log(`NEGATIVE  ${label} ${doc[nameField] || doc._id} .${field} = ${n}  (needs a human decision)`);
          continue;
        }
        if (round2(n) !== n) {
          artifacts += 1;
          console.log(`ARTIFACT  ${label} ${doc[nameField] || doc._id} .${field} = ${n} -> ${round2(n)}`);
          updates[field] = round2(n);
        }
      }
      if (apply && Object.keys(updates).length) {
        await Model.updateOne({ _id: doc._id }, { $set: updates });
        fixed += 1;
      }
    }
  }

  console.log(`\n${artifacts} float artifact(s), ${negatives} negative amount(s).`);
  if (artifacts && !apply) console.log('Re-run with --apply to round the artifacts.');
  if (apply) console.log(`${fixed} document(s) updated.`);
  if (negatives) console.log('Negative amounts were left untouched: void the record or raise a credit note instead.');
  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
