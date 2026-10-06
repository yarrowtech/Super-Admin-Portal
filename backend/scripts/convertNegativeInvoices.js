// Converts invoices holding a negative total into proper credit notes.
//
// A negative invoice is not a real document: it is a credit that was recorded in the wrong
// place. Left alone it understates receivables and makes the ageing report meaningless,
// which is why `auditFinanceAmounts.js` reports them but deliberately does not fix them —
// the fix is a business decision, so it lives here behind an explicit flag.
//
//   node scripts/convertNegativeInvoices.js           # report what would change
//   node scripts/convertNegativeInvoices.js --apply   # make the change
//
// Safe to re-run: each correcting journal entry carries a `sourceKey`, and that field has a
// unique index, so a second run skips anything already converted.
require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/finance/Invoice');
const Note = require('../models/finance/InvoiceNote');
const Journal = require('../models/finance/JournalEntry');
const Account = require('../models/finance/Account');
const Audit = require('../models/finance/AuditLog');

const apply = process.argv.includes('--apply');
const paise = (v) => Math.round((Number(v) || 0) * 100);
const rupees = (p) => Math.round(p) / 100;

// The two accounts a credit correction touches: revenue comes back down, and the
// receivable that should never have been negative is cleared.
const CODES = {
  1100: ['Receivables', 'asset'],
  4000: ['Sales revenue', 'revenue'],
};

async function accountFor(code, session) {
  const [name, type] = CODES[code];
  return Account.findOneAndUpdate(
    { code: String(code) },
    { $setOnInsert: { name, type, normalBalance: ['asset', 'expense'].includes(type) ? 'debit' : 'credit' } },
    { upsert: true, new: true, session }
  );
}

(async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (!uri) {
    console.error('Set MONGO_URI (or MONGODB_URI) before running this script.');
    process.exit(1);
  }
  await mongoose.connect(uri);
  console.log(apply ? 'MODE: apply — changes will be written\n' : 'MODE: dry run — nothing will be written (pass --apply to commit)\n');

  const negatives = await Invoice.find({ total: { $lt: 0 } }).lean();
  if (!negatives.length) {
    console.log('No negative invoices found. Nothing to do.');
    await mongoose.disconnect();
    return;
  }

  console.log(`Found ${negatives.length} invoice(s) with a negative total:\n`);
  let converted = 0;
  let skipped = 0;

  for (const inv of negatives) {
    const amount = Math.abs(paise(inv.total));
    const label = `${inv.invoiceNumber} (${inv.clientName || 'unknown customer'})`;

    if (!amount) {
      console.log(`SKIP   ${label}: total rounds to zero`);
      skipped += 1;
      continue;
    }
    const sourceKey = `negative-invoice-fix-${inv._id}`;
    if (await Journal.exists({ sourceKey })) {
      console.log(`SKIP   ${label}: already converted on a previous run`);
      skipped += 1;
      continue;
    }

    console.log(`CONVERT ${label}: total ${rupees(paise(inv.total))} -> credit note of ${rupees(amount)}, invoice voided`);
    if (!apply) { converted += 1; continue; }

    const session = await mongoose.startSession();
    try {
      await session.withTransaction(async () => {
        // 1. The original figures, recorded before anything changes.
        await Audit.create([{
          action: 'negative_invoice_converted',
          resourceType: 'FinanceInvoice',
          resourceId: String(inv._id),
          actorRole: 'migration',
          riskFlag: 'medium',
          meta: {
            before: { total: inv.total, balanceDue: inv.balanceDue, status: inv.status },
            after: { total: 0, balanceDue: 0, status: 'void' },
            reason: 'Negative invoice converted to a credit note (scripts/convertNegativeInvoices.js)',
          },
        }], { session });

        // 2. The credit note that should have carried this amount all along.
        await Note.create([{
          invoice: inv._id,
          type: 'credit',
          amount: rupees(amount),
          reason: 'Migration: negative invoice total converted to a credit note',
          reference: `MIGRATION-${inv._id}`,
          createdBy: inv.createdBy || null,
        }], { session });

        // 3. The correcting entry: reverse the revenue, clear the negative receivable.
        const [receivable, revenue] = await Promise.all([accountFor(1100, session), accountFor(4000, session)]);
        await Journal.create([{
          entryNumber: `AUTO-${sourceKey}`,
          sourceKey,
          memo: `Negative invoice ${inv.invoiceNumber} converted to a credit note`,
          entryDate: inv.issueDate || new Date(),
          departmentId: inv.departmentId || null,
          client: inv.client || null,
          costCenterId: inv.costCenterId || null,
          lines: [
            { account: revenue._id, debit: rupees(amount), credit: 0, departmentId: inv.departmentId || null, projectId: inv.projectId || null, client: inv.client || null },
            { account: receivable._id, debit: 0, credit: rupees(amount), departmentId: inv.departmentId || null, projectId: inv.projectId || null, client: inv.client || null },
          ],
          totalDebit: rupees(amount),
          totalCredit: rupees(amount),
          status: 'posted',
          postedAt: new Date(),
          createdBy: inv.createdBy || null,
        }], { session });

        // 4. The invoice itself is voided at zero, not left holding a negative number.
        await Invoice.updateOne(
          { _id: inv._id },
          { $set: { total: 0, balanceDue: 0, taxTotal: 0, gstAmount: 0, status: 'void' } },
          { session }
        );
      });
      converted += 1;
    } catch (err) {
      console.error(`FAILED ${label}: ${err.message}`);
      skipped += 1;
    } finally {
      await session.endSession();
    }
  }

  console.log(`\n${converted} invoice(s) ${apply ? 'converted' : 'would be converted'}, ${skipped} skipped.`);
  if (!apply) console.log('Re-run with --apply to commit. Take a database backup first.');
  await mongoose.disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
