process.env.NODE_ENV = 'test';
// Guards against regressions found against real data: legacy rows with negative or
// float-artifact amounts must not break listings or reports, and the full
// draft -> issue -> part-pay -> credit-note path must stay consistent.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const S = require('../services/finance/operations.service');
const ctrl = require('../controllers/finance/financeDashboard.controller');
const Invoice = require('../models/finance/Invoice');
const Journal = require('../models/finance/JournalEntry');

let db;
const oid = () => new mongoose.Types.ObjectId();
const head = { id: oid(), role: 'finance_manager', firstName: 'Fin', lastName: 'Head' };
const req = (user, body = {}, params = {}, query = {}) => ({ user, body, params, query });
const call = async (fn, user, query = {}) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(v) { this.body = v; return this; }, setHeader() {}, send(v) { this.body = v; return this; } };
  await fn(req(user, {}, {}, query), res); return res;
};

test.before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(db.getUri());
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).init().catch(() => {})));
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(v) { this.body = v; return this; } };
  await ctrl.createTaxRule(req(head, { kind: 'gst', code: 'GST18', name: 'GST 18%', rate: 18, effectiveFrom: '2020-01-01' }), res);
  assert.equal(res.statusCode, 201, JSON.stringify(res.body));
});
test.after(async () => { await mongoose.disconnect(); await db.stop(); });

test('legacy rows with negative and float-artifact amounts still list and report', async () => {
  // Written straight to the collection: these predate strict money handling and
  // would be rejected by the validated write path.
  await Invoice.collection.insertMany([
    { invoiceNumber: 'LEGACY-NEG', invoiceType: 'customer', clientName: 'Old Co', status: 'sent', total: -1000, balanceDue: -1000, amountPaid: 0, items: [], issueDate: new Date('2026-01-05'), dueDate: new Date('2026-02-05') },
    { invoiceNumber: 'LEGACY-FLOAT', invoiceType: 'customer', clientName: 'Drift Ltd', status: 'sent', total: 59279.32000000001, balanceDue: 59279.32000000001, amountPaid: 0, items: [], issueDate: new Date('2026-01-06'), dueDate: new Date('2099-01-01') },
  ]);
  const list = await call(ctrl.getInvoices, head, { page: '1', limit: '25' });
  assert.equal(list.statusCode, 200, JSON.stringify(list.body).slice(0, 200));
  assert.equal(list.body.data.items.length, 2);
  // A non-positive balance reads as settled rather than throwing.
  assert.equal(list.body.data.items.find((i) => i.invoiceNumber === 'LEGACY-NEG').status, 'paid');
  for (const [name, fn] of [['summary', ctrl.summary], ['aging', ctrl.getAgingSummary], ['balances', ctrl.getCustomerBalances], ['trial balance', ctrl.getTrialBalance]]) {
    assert.equal((await call(fn, head)).statusCode, 200, `${name} tolerates legacy rows`);
  }
});

test('multi-line invoice with mixed GST slabs and a discount posts a balanced journal', async () => {
  // 5% and 18% on one invoice, with a discount spread pro rata across both lines.
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(v) { this.body = v; return this; } };
  await ctrl.createTaxRule(req(head, { kind: 'gst', code: 'GST5', name: 'GST 5%', rate: 5, effectiveFrom: '2020-01-01' }), res);
  assert.equal(res.statusCode, 201, JSON.stringify(res.body));

  const inv = await S.createInvoice(req(head, {
    clientName: 'Mixed Slab Co', dueDate: '2099-12-31', issueDate: '2026-07-01', status: 'sent', discount: 1000,
    items: [
      { description: 'Consulting', quantity: 1, rate: 10000, taxRate: 18 },
      { description: 'Printed manuals', quantity: 10, rate: 1000, taxRate: 5 },
    ],
  }));

  assert.equal(inv.subtotal, 20000);
  assert.equal(inv.discount, 1000);
  assert.equal(inv.taxableValue, 19000);
  // Discount splits 500/500, so GST is 18% of 9500 (1710) + 5% of 9500 (475).
  assert.deepEqual(inv.items.map((i) => [i.taxableValue, i.taxAmount]), [[9500, 1710], [9500, 475]]);
  assert.equal(inv.gstAmount, 2185);
  assert.equal(inv.total, 21185);
  assert.equal(inv.balanceDue, 21185);

  const j = await Journal.findById(inv.journalEntryId).lean();
  assert.equal(j.totalDebit, j.totalCredit, 'mixed-slab invoice posts a balanced journal');
  assert.equal(j.totalDebit, 21185);

  // The GST worksheet must break the same invoice out by slab.
  const gst = (await call(ctrl.getGstReturn, head, { from: '2026-06-01', to: '2026-08-01' })).body.data;
  const slab18 = gst.rates.find((r) => r.rate === 18);
  const slab5 = gst.rates.find((r) => r.rate === 5);
  assert.equal(slab18.taxableValue, 9500);
  assert.equal(slab18.tax, 1710);
  assert.equal(slab5.taxableValue, 9500);
  assert.equal(slab5.tax, 475);
});

test('payroll withholds PF and professional tax to their own payable accounts', async () => {
  const Department = require('../models/department/Department');
  const User = require('../models/auth/User');
  const W = require('../services/finance/workflows.service');
  const dept = await Department.create({ name: 'Ops Statutory', code: 'OPSSTAT' });
  const staff = (await User.collection.insertOne({ firstName: 'Ravi', lastName: 'K', email: 'ravi@t.test', isActive: true })).insertedId;

  const salaryRes = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(v) { this.body = v; return this; } };
  await ctrl.saveSalary(req(head, { employee: String(staff), departmentId: String(dept._id), basePay: 30000, allowances: 5000, deductions: 0, effectiveFrom: '2026-01-01' }), salaryRes);
  assert.equal(salaryRes.statusCode, 200, JSON.stringify(salaryRes.body));

  const run = await W.createPayroll(req(head, { employee: String(staff), periodStart: '2026-05-01', periodEnd: '2026-05-31' }));
  // Basic 30,000 is above the 15,000 ceiling, so PF is 12% of 15,000.
  assert.equal(run.statutory.pf, 1800);
  assert.equal(run.statutory.professionalTax, 200);
  assert.equal(run.grossPay, 35000);
  assert.equal(run.deductions, 2000);
  assert.equal(run.netPay, 33000);

  const processed = await W.updatePayroll(req(head, { status: 'processed' }, { id: String(run._id) }));
  const j = await Journal.findById(processed.journalEntryId).populate('lines.account', 'code').lean();
  const byCode = Object.fromEntries(j.lines.map((l) => [l.account.code, l.debit || -l.credit]));
  assert.equal(byCode['5100'], 35000, 'gross is the expense to the business');
  assert.equal(byCode['2200'], -33000, 'only net is owed to the employee');
  assert.equal(byCode['2510'], -1800, 'PF becomes a payable');
  assert.equal(byCode['2520'], -200, 'professional tax becomes a payable');
  assert.equal(j.totalDebit, j.totalCredit);
});

test('a department head cannot approve another department\'s expense', async () => {
  const Department = require('../models/department/Department');
  const W = require('../services/finance/workflows.service');
  const [it, law] = await Promise.all([
    Department.findOneAndUpdate({ code: 'IT' }, { $setOnInsert: { name: 'Information Technology', code: 'IT' } }, { upsert: true, new: true }),
    Department.findOneAndUpdate({ code: 'LAW' }, { $setOnInsert: { name: 'Law', code: 'LAW' } }, { upsert: true, new: true }),
  ]);
  const budgetRes = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(v) { this.body = v; return this; } };
  await ctrl.createBudget(req(head, { departmentId: String(law._id), fiscalYear: '2026', allocated: 50000 }), budgetRes);
  assert.equal(budgetRes.statusCode, 201, JSON.stringify(budgetRes.body));

  const submitter = { id: oid(), role: 'law_employee' };
  const lawClaim = await W.createExpense(req(submitter, {
    title: 'Court filing fee', category: 'Filing Fees', amount: 4000, departmentId: String(law._id), incurredDate: '2026-04-01',
    documents: [{ label: 'Receipt', url: 'https://files.example/court.pdf' }],
  }));
  await W.expenseAction(req(submitter, {}, { id: String(lawClaim._id), action: 'verify' }));

  const itManager = { id: oid(), role: 'it_manager', firstName: 'Ian', lastName: 'T' };
  const lawHead = { id: oid(), role: 'law_head', firstName: 'Lara', lastName: 'H' };
  await assert.rejects(
    W.expenseAction(req(itManager, {}, { id: String(lawClaim._id), action: 'approve' })),
    { statusCode: 403 },
    'IT manager cannot approve a Law expense',
  );
  const approved = await W.expenseAction(req(lawHead, {}, { id: String(lawClaim._id), action: 'approve' }));
  assert.equal(approved.request.status, 'approved', 'the Law head can approve it');
  // Releasing the money stays with Finance even for the owning department's head.
  await W.expenseAction(req(head, {}, { id: String(lawClaim._id), action: 'process' }));
  await assert.rejects(
    W.expenseAction(req(lawHead, {}, { id: String(lawClaim._id), action: 'complete' })),
    { statusCode: 403 },
    'paying out is Finance-only',
  );
  void it;
});

test('draft to issued to part-paid to credit-noted stays consistent', async () => {
  const draft = await S.createInvoice(req(head, {
    clientName: 'Ferrous Ltd', dueDate: '2099-12-31', issueDate: '2026-06-01',
    items: [{ description: 'Build', quantity: 2, rate: 5000, taxRate: 18 }],
  }));
  assert.equal(draft.status, 'draft');
  assert.equal(draft.total, 11800);
  assert.equal(draft.balanceDue, 11800);

  const issued = await S.updateInvoice(req(head, { status: 'sent' }, { id: String(draft._id) }));
  assert.equal(issued.status, 'sent');

  await S.createPayment(req(head, { invoice: String(draft._id), amount: 3000, reference: 'UTR-RG1' }));
  let saved = await Invoice.findById(draft._id).lean();
  assert.equal(saved.status, 'partially_paid');
  assert.equal(saved.balanceDue, 8800);

  await S.note(req(head, { type: 'credit', amount: 800, reason: 'Rework', reference: 'CN-RG1' }, { id: String(draft._id) }));
  saved = await Invoice.findById(draft._id).lean();
  assert.equal(saved.total, 11000);
  assert.equal(saved.balanceDue, 8000);

  // The ledger must still balance after all of it.
  const tb = (await call(ctrl.getTrialBalance, head)).body.data;
  assert.equal(tb.balanced, true);
});
