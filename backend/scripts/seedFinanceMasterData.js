// Seeds the master data every finance module depends on: the chart of accounts and
// the GST/TDS rules. Without these, issuing a taxed invoice fails ("no active rule")
// and the trial balance has nothing to group by.
//
//   node scripts/seedFinanceMasterData.js           # report what is missing
//   node scripts/seedFinanceMasterData.js --apply   # create it
//
// Idempotent: an account code or tax-rule code that already exists is left untouched,
// so re-running never duplicates or overwrites live configuration.
require('dotenv').config();
const mongoose = require('mongoose');
const Account = require('../models/finance/Account');
const { TaxRule } = require('../models/finance/FinanceOperations');

// Codes 1000-1299 assets, 2100-2499 liabilities, 3000 equity, 4000s revenue, 5000s expense.
// The posting engine auto-creates the codes it needs; these make the rest of the
// chart explicit so the Accounting page has a real structure to show.
const ACCOUNTS = [
  ['1000', 'Cash and bank', 'asset'],
  ['1010', 'Petty cash', 'asset'],
  ['1100', 'Accounts receivable', 'asset'],
  ['1200', 'TDS receivable', 'asset'],
  ['1300', 'Prepaid expenses', 'asset'],
  ['1500', 'Office equipment', 'asset'],
  ['2100', 'Accounts payable', 'liability'],
  ['2200', 'Payroll payable', 'liability'],
  ['2300', 'Customer advances', 'liability'],
  ['2400', 'GST output payable', 'liability'],
  ['2410', 'GST input credit', 'asset'],
  ['2500', 'TDS payable', 'liability'],
  ['2510', 'Provident fund payable', 'liability'],
  ['2520', 'Professional tax payable', 'liability'],
  ['3000', 'Owner equity', 'equity'],
  ['3100', 'Retained earnings', 'equity'],
  ['4000', 'Sales revenue', 'revenue'],
  ['4100', 'Service revenue', 'revenue'],
  ['4900', 'Other income', 'revenue'],
  ['5000', 'Operating expenses', 'expense'],
  ['5100', 'Payroll expense', 'expense'],
  ['5200', 'Rent', 'expense'],
  ['5300', 'Utilities', 'expense'],
  ['5400', 'Software and subscriptions', 'expense'],
  ['5500', 'Travel', 'expense'],
  ['5600', 'Professional fees', 'expense'],
  ['5700', 'Marketing', 'expense'],
  ['5900', 'Bank charges', 'expense'],
];

// Indian GST slabs and the common TDS sections. Rates are basis points (1800 = 18%).
// effectiveFrom is deliberately early so historical invoices can be issued; a rate
// change is a NEW rule with a later date, never an edit to these.
const TAX_RULES = [
  ['gst', 'GST0', 'GST exempt / nil rated', '', 0],
  ['gst', 'GST5', 'GST 5%', '', 500],
  ['gst', 'GST12', 'GST 12%', '', 1200],
  ['gst', 'GST18', 'GST 18%', '', 1800],
  ['gst', 'GST28', 'GST 28%', '', 2800],
  ['tds', '194C', 'TDS - contractor payments', '194C', 200],
  ['tds', '194J', 'TDS - professional / technical fees', '194J', 1000],
  ['tds', '194H', 'TDS - commission or brokerage', '194H', 500],
  ['tds', '194I', 'TDS - rent', '194I', 1000],
];
const EFFECTIVE_FROM = new Date('2017-07-01T00:00:00Z'); // GST commencement in India.

(async () => {
  const apply = process.argv.includes('--apply');
  if (!process.env.MONGO_URI) { console.error('MONGO_URI is not set'); process.exit(1); }
  await mongoose.connect(process.env.MONGO_URI);

  const existingAccounts = new Set((await Account.find({}, 'code').lean()).map((a) => a.code));
  const missingAccounts = ACCOUNTS.filter(([code]) => !existingAccounts.has(code));
  const existingRules = new Set((await TaxRule.find({}, 'code kind').lean()).map((r) => `${r.kind}:${r.code}`));
  const missingRules = TAX_RULES.filter(([kind, code]) => !existingRules.has(`${kind}:${code}`));

  for (const [code, name, type] of missingAccounts) console.log(`ACCOUNT   ${code} ${name} (${type})`);
  for (const [kind, code, name, , bp] of missingRules) console.log(`TAX RULE  ${kind.toUpperCase()} ${code} ${name} @ ${bp / 100}%`);

  if (apply) {
    if (missingAccounts.length) {
      await Account.insertMany(missingAccounts.map(([code, name, type]) => ({
        code, name, type,
        normalBalance: ['asset', 'expense'].includes(type) ? 'debit' : 'credit',
        isActive: true,
      })));
    }
    if (missingRules.length) {
      await TaxRule.insertMany(missingRules.map(([kind, code, name, section, rateBp]) => ({
        kind, code, name, section, rateBp, effectiveFrom: EFFECTIVE_FROM, effectiveTo: null, isActive: true,
        notes: 'Seeded default. Verify against current statute before filing.',
      })));
    }
  }

  console.log(`\n${missingAccounts.length} account(s) and ${missingRules.length} tax rule(s) missing.`);
  console.log(apply
    ? 'Created. Verify the rates against current law before relying on them for filing.'
    : 'Re-run with --apply to create them.');
  await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });
