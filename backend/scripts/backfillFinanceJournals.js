// Posts journal entries for financial records that were created before (or outside) the
// posting engine — typically seeded or imported rows. Without these, the ledger is empty
// and every ledger-derived report (P&L, trial balance, balance sheet) correctly reads zero.
//
//   node scripts/backfillFinanceJournals.js           # report what is unposted
//   node scripts/backfillFinanceJournals.js --apply   # post the entries
//
// Safe to re-run: `sourceKey` is unique per source document, so a record already posted
// is skipped. Amounts are never recalculated — each entry reflects what the record says.
require('dotenv').config();
const mongoose = require('mongoose');
const Invoice = require('../models/finance/Invoice');
const Expense = require('../models/finance/Expense');
const Payroll = require('../models/finance/Payroll');
const Journal = require('../models/finance/JournalEntry');
const Account = require('../models/finance/Account');

const paise = (v) => Math.round((Number(v) || 0) * 100);
const rupees = (p) => Math.round(p) / 100;

const CODES = {
  1000: ['Cash and bank', 'asset'], 1100: ['Accounts receivable', 'asset'], 1200: ['TDS receivable', 'asset'],
  2100: ['Accounts payable', 'liability'], 2200: ['Payroll payable', 'liability'], 2400: ['GST output payable', 'liability'],
  2500: ['TDS payable', 'liability'], 2510: ['Provident fund payable', 'liability'], 2520: ['Professional tax payable', 'liability'],
  4000: ['Sales revenue', 'revenue'], 5000: ['Operating expenses', 'expense'], 5100: ['Payroll expense', 'expense'],
};

(async () => {
  const apply = process.argv.includes('--apply');
  if (!process.env.MONGO_URI) { console.error('MONGO_URI is not set'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);

  const accounts = new Map();
  for (const [code, [name, type]] of Object.entries(CODES)) {
    let account = await Account.findOne({ code });
    if (!account && apply) {
      account = await Account.create({ code, name, type, normalBalance: ['asset', 'expense'].includes(type) ? 'debit' : 'credit' });
    }
    if (account) accounts.set(code, account._id);
  }

  const planned = [];
  const posted = new Set((await Journal.find({}, 'sourceKey').lean()).map((j) => j.sourceKey).filter(Boolean));

  // Issued invoices: receivable (net of TDS withheld) and TDS asset, against revenue and GST payable.
  for (const inv of await Invoice.find({ status: { $nin: ['draft', 'void'] } }).lean()) {
    const key = `invoice-${inv._id}`;
    if (posted.has(key)) continue;
    const total = paise(inv.total); const gst = paise(inv.gstAmount); const tds = paise(inv.tdsAmount);
    if (total <= 0) { console.log(`SKIP   invoice ${inv.invoiceNumber}: total is ${rupees(total)}`); continue; }
    planned.push({
      key, label: `invoice ${inv.invoiceNumber}`, date: inv.issueDate, memo: inv.invoiceNumber,
      departmentId: inv.departmentId || null, client: inv.client || null,
      lines: [['1100', total - tds, 0], ['1200', tds, 0], ['4000', 0, total - gst], ['2400', 0, gst]],
    });
  }

  // Approved expenses: operating expense against payable.
  for (const e of await Expense.find({ status: { $in: ['approved', 'processing', 'completed', 'paid'] } }).lean()) {
    const key = `expense-${e._id}`;
    if (posted.has(key)) continue;
    const amount = paise(e.amount);
    if (amount <= 0) { console.log(`SKIP   expense ${e.title}: amount is ${rupees(amount)}`); continue; }
    planned.push({
      key, label: `expense ${e.title}`, date: e.incurredDate || e.createdAt, memo: e.title,
      departmentId: e.departmentId || null, vendor: e.vendor || null,
      lines: [['5000', amount, 0], ['2100', 0, amount]],
    });
  }

  // Processed payroll: gross as expense, withholdings and net as payables.
  for (const p of await Payroll.find({ status: { $in: ['processed', 'disbursed'] } }).lean()) {
    const key = `payroll-${p._id}`;
    if (posted.has(key)) continue;
    const gross = paise(p.grossPay); const net = paise(p.netPay);
    const pf = paise(p.statutory?.pf); const pt = paise(p.statutory?.professionalTax); const tds = paise(p.statutory?.tds);
    const other = gross - net - pf - pt - tds;
    if (gross <= 0 || other < 0) { console.log(`SKIP   payroll ${p.employeeName}: does not balance (gross ${rupees(gross)})`); continue; }
    planned.push({
      key, label: `payroll ${p.employeeName} ${p.periodKey || ''}`.trim(), date: p.periodEnd, memo: p.payslipNumber || 'Payroll',
      departmentId: p.departmentId || null,
      lines: [['5100', gross, 0], ['2200', 0, net + other], ['2510', 0, pf], ['2520', 0, pt], ['2500', 0, tds]],
    });
  }

  let created = 0;
  for (const entry of planned) {
    const debit = entry.lines.reduce((n, [, dr]) => n + dr, 0);
    const credit = entry.lines.reduce((n, [, , cr]) => n + cr, 0);
    if (debit !== credit) { console.log(`SKIP   ${entry.label}: would not balance (${rupees(debit)} vs ${rupees(credit)})`); continue; }
    console.log(`POST   ${entry.label} — ${rupees(debit)}`);
    if (!apply) continue;
    const lines = entry.lines.filter(([, dr, cr]) => dr || cr).map(([code, dr, cr]) => ({
      account: accounts.get(code), debit: rupees(dr), credit: rupees(cr),
      departmentId: entry.departmentId, client: entry.client || null,
    }));
    await Journal.create({
      entryNumber: `BACKFILL-${entry.key}`, sourceKey: entry.key, memo: entry.memo,
      entryDate: entry.date || new Date(), lines,
      totalDebit: rupees(debit), totalCredit: rupees(credit),
      status: 'posted', postedAt: new Date(), departmentId: entry.departmentId, client: entry.client || null,
    });
    created += 1;
  }

  console.log(`\n${planned.length} entr(ies) to post.`);
  console.log(apply ? `${created} posted.` : 'Re-run with --apply to post them.');
  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
