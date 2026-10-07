process.env.NODE_ENV = 'test';
// Finance module behaviour against a real (in-memory) replica set: tax rules, invoice maths,
// partial payments, notes, reconciliation, expenses, budgets and report consistency.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const S = require('../services/finance/operations.service');
const W = require('../services/finance/workflows.service');
const ctrl = require('../controllers/finance/financeDashboard.controller');
const Invoice = require('../models/finance/Invoice');
const Budget = require('../models/finance/Budget');
const Journal = require('../models/finance/JournalEntry');
const Department = require('../models/department/Department');
const User = require('../models/auth/User');

let db;
const oid = () => new mongoose.Types.ObjectId();
const head = { id: oid(), role: 'finance_manager', firstName: 'Fin', lastName: 'Head' };
const head2 = { id: oid(), role: 'admin', firstName: 'Ad', lastName: 'Min' };
const emp = { id: oid(), role: 'finance_employee', firstName: 'Fin', lastName: 'Emp' };
const req = (user, body = {}, params = {}, query = {}) => ({ user, body, params, query });
const call = async (fn, user, body = {}, params = {}, query = {}) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(v) { this.body = v; return this; }, setHeader() {}, send(v) { this.body = v; return this; } };
  await fn(req(user, body, params, query), res); return res;
};
const rule = (kind, code, rate, effectiveFrom = '2020-01-01', extra = {}) => call(ctrl.createTaxRule, head, { kind, code, name: code, rate, effectiveFrom, ...extra });
const issue = async (body) => {
  const inv = await S.createInvoice(req(head, { clientName: 'Acme', dueDate: '2099-12-31', issueDate: '2026-09-01', status: 'sent', ...body }));
  return inv;
};

test.before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(db.getUri());
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).init().catch(() => {})));
  assert.equal((await rule('gst', 'GST18', 18)).statusCode, 201);
  assert.equal((await rule('gst', 'GST5', 5)).statusCode, 201);
  assert.equal((await rule('tds', '194J', 10, '2020-01-01', { section: '194J' })).statusCode, 201);
});
test.after(async () => { await mongoose.disconnect(); await db.stop(); });

test('tax rules: effective dates, overlap, immutability and head-only configuration', async () => {
  assert.equal((await call(ctrl.createTaxRule, emp, { kind: 'gst', code: 'X', name: 'X', rate: 12, effectiveFrom: '2020-01-01' })).statusCode, 403);
  assert.equal((await rule('gst', 'GST18', 18, '2025-01-01')).statusCode, 409, 'overlapping window for the same code');
  const future = await rule('gst', 'GST12', 12, '2027-04-01');
  assert.equal(future.statusCode, 201);
  await assert.rejects(issue({ items: [{ description: 'x', quantity: 1, rate: 100, taxRate: 12 }] }), /No active GST rule at 12%/);
  await assert.rejects(issue({ items: [{ description: 'x', quantity: 1, rate: 100, taxRate: 7 }] }), { statusCode: 422 });
  assert.equal((await call(ctrl.updateTaxRule, head, { rate: 15 }, { id: String(future.body.data._id) })).statusCode, 422, 'rate cannot be rewritten');
  const onDate = await call(ctrl.listTaxRules, emp, {}, {}, { kind: 'gst', on: '2026-09-01' });
  assert.deepEqual(onDate.body.data.map((r) => r.rate).sort((a, b) => a - b), [5, 18]);
});

test('invoice maths: pro-rata discount, per-line GST, TDS withheld, exact minor units', async () => {
  const inv = await issue({ discount: 100, tdsRate: 10, items: [{ description: 'Design', quantity: 3, rate: '333.33', taxRate: 18 }, { description: 'Hosting', quantity: 1, rate: 100, taxRate: 5 }] });
  assert.equal(inv.subtotal, 1099.99);
  assert.deepEqual(inv.items.map((i) => [i.taxableValue, i.taxAmount]), [[909.09, 163.64], [90.9, 4.55]]);
  assert.equal(inv.taxableValue, 999.99);
  assert.equal(inv.gstAmount, 168.19);
  assert.equal(inv.total, 1168.18);
  assert.equal(inv.tdsAmount, 100);
  assert.equal(inv.balanceDue, 1068.18, 'customer owes total less TDS');
  assert.equal(inv.status, 'sent');
  const j = await Journal.findById(inv.journalEntryId).populate('lines.account', 'code').lean();
  const by = Object.fromEntries(j.lines.map((l) => [l.account.code, l.debit || -l.credit]));
  assert.deepEqual(by, { 1100: 1068.18, 1200: 100, 4000: -999.99, 2400: -168.19 });
  await assert.rejects(S.updateInvoice(req(head, { clientName: 'Changed' }, { id: String(inv._id) })), { statusCode: 409 }, 'issued invoice is locked');
  await assert.rejects(S.createInvoice(req(emp, { clientName: 'A', dueDate: '2099-01-01', status: 'sent', items: [{ description: 'x', quantity: 1, rate: 1 }] })), { statusCode: 403 });
  await assert.rejects(issue({ discount: 5000, items: [{ description: 'x', quantity: 1, rate: 100 }] }), /Discount cannot exceed/);
});

test('partial payments, duplicate references, overpayment and reversal', async () => {
  const inv = await issue({ items: [{ description: 'Retainer', quantity: 1, rate: 1000, taxRate: 18 }] });
  const id = String(inv._id);
  await S.createPayment(req(emp, { invoice: id, amount: 500, reference: 'UTR-1', method: 'bank' }));
  let saved = await Invoice.findById(id).lean();
  assert.equal(saved.status, 'partially_paid');
  assert.equal(saved.balanceDue, 680);
  await assert.rejects(S.createPayment(req(emp, { invoice: id, amount: 10, reference: 'UTR-1' })), { statusCode: 409 }, 'idempotent reference');
  await assert.rejects(S.createPayment(req(emp, { invoice: id, amount: 681, reference: 'UTR-2' })), { statusCode: 409 }, 'overpayment');
  await assert.rejects(S.createPayment(req(emp, { invoice: id, amount: 1, reference: 'UTR-3', method: 'crypto' })), { statusCode: 422 });
  const p2 = await S.createPayment(req(emp, { invoice: id, amount: 680, reference: 'UTR-4', method: 'online' }));
  saved = await Invoice.findById(id).lean();
  assert.equal(saved.status, 'paid');
  assert.equal(saved.balanceDue, 0);
  await S.updatePayment(req(head, { status: 'failed', failureReason: 'Bounced' }, { id: String(p2._id) }));
  saved = await Invoice.findById(id).lean();
  assert.equal(saved.balanceDue, 680, 'reversal restores the balance');
  assert.equal(saved.status, 'partially_paid');
  const balances = await call(ctrl.getCustomerBalances, head);
  assert.ok(balances.body.data.find((r) => r.customer === 'Acme').outstanding >= 680);
});

test('credit and debit notes adjust total, GST and balance with balanced journals', async () => {
  const inv = await issue({ items: [{ description: 'Licence', quantity: 1, rate: 1000, taxRate: 18 }] });
  const id = String(inv._id);
  await assert.rejects(S.note(req(head, { type: 'credit', amount: 2000, reason: 'x', reference: 'CN-0' }, { id })), { statusCode: 409 });
  await S.note(req(head, { type: 'credit', amount: 118, reason: 'Service credit', reference: 'CN-1' }, { id }));
  let saved = await Invoice.findById(id).lean();
  assert.equal(saved.total, 1062);
  assert.equal(saved.gstAmount, 162, 'GST share of 118 at 18% inclusive is 18');
  assert.equal(saved.balanceDue, 1062);
  await assert.rejects(S.note(req(head, { type: 'credit', amount: 1, reason: 'dup', reference: 'CN-1' }, { id })), { statusCode: 409 });
  await S.note(req(head, { type: 'debit', amount: 59, reason: 'Extra seat', reference: 'DN-1' }, { id }));
  saved = await Invoice.findById(id).lean();
  assert.equal(saved.total, 1121);
  assert.equal(saved.gstAmount, 171);
  const gst = await call(ctrl.getGstReturn, head, {}, {}, { from: '2026-01-01', to: '2099-12-31' });
  assert.equal(gst.statusCode, 200);
  assert.equal(gst.body.data.filing.status, 'unavailable');
});

test('bank reconciliation matches only equal-amount unmatched deposits; imports are idempotent', async () => {
  const inv = await issue({ items: [{ description: 'Audit', quantity: 1, rate: 200 }] });
  const pay = await S.createPayment(req(emp, { invoice: String(inv._id), amount: 200, reference: 'UTR-R1' }));
  const rows = [{ account: 'HDFC-01', reference: 'BNK-1', amount: 200, direction: 'in', date: '2026-09-02' }, { account: 'HDFC-01', reference: 'BNK-2', amount: 150, direction: 'in', date: '2026-09-02' }];
  assert.deepEqual((await call(ctrl.bankImport, emp, { rows })).body.data, { imported: 2, skipped: 0 });
  assert.deepEqual((await call(ctrl.bankImport, emp, { rows })).body.data, { imported: 0, skipped: 2 });
  const bank = (await call(ctrl.bankList, emp, {}, {}, { unmatched: 'true' })).body.data.items;
  const wrong = bank.find((b) => b.reference === 'BNK-2'); const right = bank.find((b) => b.reference === 'BNK-1');
  await assert.rejects(S.updatePayment(req(emp, { status: 'reconciled', bankTransactionId: String(wrong._id) }, { id: String(pay._id) })), { statusCode: 422 });
  const done = await S.updatePayment(req(emp, { status: 'reconciled', bankTransactionId: String(right._id) }, { id: String(pay._id) }));
  assert.equal(done.status, 'reconciled');
});

test('expenses: documents before verification, separate approver, budget cannot be exceeded', async () => {
  const dept = await Department.create({ name: 'Marketing T', code: 'MKTT' });
  const budget = await call(ctrl.createBudget, head, { departmentId: String(dept._id), fiscalYear: '2026', allocated: 1000, alertThreshold: 80 });
  assert.equal(budget.statusCode, 201);
  // Claims at or above the configured limit need a receipt up front.
  await assert.rejects(
    W.createExpense(req(head, { title: 'Ads', category: 'Marketing', amount: 700, departmentId: String(dept._id), incurredDate: '2026-05-01' })),
    /supporting document is required/,
    'large claim without a receipt is rejected',
  );
  // A small claim still goes through without one.
  const small = await W.createExpense(req(head, { title: 'Stamps', category: 'Office', amount: 100, departmentId: String(dept._id), incurredDate: '2026-05-01' }));
  assert.equal(small.status, 'submitted');

  const e = await W.createExpense(req(head, {
    title: 'Ads', category: 'Marketing', amount: 700, departmentId: String(dept._id), incurredDate: '2026-05-01',
    documents: [{ label: 'Receipt', url: 'https://files.example/r.pdf' }],
  }));
  assert.equal(String(e.budgetId), String(budget.body.data._id));
  await assert.rejects(W.createExpense(req(emp, { title: 'Big', amount: 400, departmentId: String(dept._id), incurredDate: '2026-05-01', documents: [{ label: 'R', url: 'https://files.example/b.pdf' }] })), { statusCode: 409 }, 'over budget');
  await assert.rejects(W.updateExpense(req(head, { documents: [] }, { id: String(e._id) })), /supporting document is required/, 'receipt cannot be removed from a large claim');
  await assert.rejects(W.updateExpense(req(head, { documents: [{ label: 'x', url: 'http://insecure/x' }] }, { id: String(e._id) })), { statusCode: 422 });
  await W.expenseAction(req(emp, {}, { id: String(e._id), action: 'verify' }));
  await assert.rejects(W.expenseAction(req(emp, {}, { id: String(e._id), action: 'approve' })), { statusCode: 403 });
  await assert.rejects(W.expenseAction(req(head, {}, { id: String(e._id), action: 'approve' })), /different reviewer/);
  await W.expenseAction(req(head2, {}, { id: String(e._id), action: 'approve' }));
  await W.expenseAction(req(head2, {}, { id: String(e._id), action: 'process' }));
  const { request } = await W.expenseAction(req(head2, {}, { id: String(e._id), action: 'complete' }));
  assert.ok(request.paymentId);
  const b = await W.budgetSnapshot(await Budget.findById(budget.body.data._id), null);
  // 700 approved and paid, plus the 100 small claim still reserved in the workflow.
  assert.equal(b.spent, 700); assert.equal(b.reserved, 100);
  assert.equal(b.utilization, 80); assert.equal(b.status, 'at-risk', 'crossing the 80% threshold flags the budget');
});

test('a split expense must account for the whole amount, and posts one debit per allocation', async () => {
  const Journal = require('../models/finance/JournalEntry');
  const deptA = await Department.create({ name: 'Split IT', code: 'SPIT' });
  const deptB = await Department.create({ name: 'Split Media', code: 'SPMD' });
  const projectA = oid(); const projectB = oid();

  // Verification requires a document on file, so the fixture carries one.
  const base = { title: 'Shared cloud bill', category: 'Software', amount: 100, departmentId: String(deptA._id), incurredDate: '2026-05-01', documents: [{ label: 'Invoice', url: 'https://files.example/cloud.pdf' }] };

  // Under-allocated: 60 of 100. Silently accepting this would under-charge the budgets.
  await assert.rejects(
    W.createExpense(req(head, { ...base, allocations: [{ departmentId: String(deptA._id), amount: 60 }] })),
    (e) => e.statusCode === 422 && /add up to the expense total/.test(e.message),
  );
  // Over-allocated: 120 of 100.
  await assert.rejects(
    W.createExpense(req(head, { ...base, allocations: [
      { departmentId: String(deptA._id), amount: 60 }, { departmentId: String(deptB._id), amount: 60 },
    ] })),
    (e) => e.statusCode === 422,
  );
  // Rounding must not create free spend: 33.33 x 3 is 99.99, not 100.
  await assert.rejects(
    W.createExpense(req(head, { ...base, allocations: [
      { departmentId: String(deptA._id), amount: 33.33 },
      { departmentId: String(deptA._id), amount: 33.33 },
      { departmentId: String(deptB._id), amount: 33.33 },
    ] })),
    (e) => e.statusCode === 422,
  );
  // An inactive or unknown department in a row is refused.
  await assert.rejects(
    W.createExpense(req(head, { ...base, allocations: [
      { departmentId: String(deptA._id), amount: 50 }, { departmentId: String(oid()), amount: 50 },
    ] })),
    (e) => e.statusCode === 422 && /active department/.test(e.message),
  );

  // An exact split is accepted and stored.
  const e = await W.createExpense(req(head, { ...base, allocations: [
    { departmentId: String(deptA._id), projectId: String(projectA), amount: 70 },
    { departmentId: String(deptB._id), projectId: String(projectB), amount: 30 },
  ] }));
  assert.equal(e.allocations.length, 2);
  assert.equal(e.allocations[0].amount, 70);
  assert.equal(e.allocations[1].amount, 30);

  // Approval posts one debit per allocation, each carrying its own dimensions, against a
  // single payable credit — and the entry still balances.
  await W.expenseAction(req(emp, {}, { id: String(e._id), action: 'verify' }));
  await W.expenseAction(req(head2, {}, { id: String(e._id), action: 'approve' }));
  const je = await Journal.findOne({ sourceKey: `expense-${e._id}` }).lean();
  assert.ok(je, 'an entry was posted');
  assert.equal(je.totalDebit, je.totalCredit, 'split entry balances');
  assert.equal(je.totalDebit, 100);

  const debits = je.lines.filter((l) => l.debit > 0);
  assert.equal(debits.length, 2, 'one debit line per allocation');
  const byDept = new Map(debits.map((l) => [String(l.departmentId), l]));
  assert.equal(byDept.get(String(deptA._id)).debit, 70);
  assert.equal(String(byDept.get(String(deptA._id)).projectId), String(projectA));
  assert.equal(byDept.get(String(deptB._id)).debit, 30);
  assert.equal(String(byDept.get(String(deptB._id)).projectId), String(projectB));
});

test('an unsplit expense still posts a single debit line', async () => {
  const Journal = require('../models/finance/JournalEntry');
  const dept = await Department.create({ name: 'No Split', code: 'NOSP' });
  const e = await W.createExpense(req(head, { title: 'Stamps', category: 'Office', amount: 100, departmentId: String(dept._id), incurredDate: '2026-05-01', documents: [{ label: 'Receipt', url: 'https://files.example/stamps.pdf' }] }));
  assert.equal(e.allocations.length, 0, 'no allocations means no split');
  await W.expenseAction(req(emp, {}, { id: String(e._id), action: 'verify' }));
  await W.expenseAction(req(head2, {}, { id: String(e._id), action: 'approve' }));
  const je = await Journal.findOne({ sourceKey: `expense-${e._id}` }).lean();
  assert.equal(je.lines.filter((l) => l.debit > 0).length, 1);
  assert.equal(je.totalDebit, je.totalCredit);
});

test('reports agree with each other and with the ledger', async () => {
  const tb = (await call(ctrl.getTrialBalance, head)).body.data;
  assert.equal(tb.balanced, true);
  assert.equal(tb.totals.debit, tb.totals.credit);
  const summary = (await call(ctrl.summary, head)).body.data;
  const open = await Invoice.find({ status: { $nin: ['draft', 'void'] } }).lean();
  const receivable = open.reduce((n, i) => n + Math.round(i.balanceDue * 100), 0) / 100;
  assert.equal(summary.receivables, receivable, 'dashboard receivables equal open invoice balances');
  const ledger1100 = tb.rows.find((r) => r.code === '1100');
  assert.equal(Math.round((ledger1100.debit - ledger1100.credit) * 100) / 100, receivable, 'receivables control account ties to sub-ledger');
  const year = (await call(ctrl.getPeriodSummary, head, {}, {}, { year: '2026' })).body.data;
  const all = (await call(ctrl.getProfitLoss, head, {}, {}, { from: '2026-01-01', to: '2026-12-31' })).body.data;
  assert.equal(year.totals.revenue, all.revenue);
  assert.equal(year.totals.expenses, all.expenses);
  const gst1 = (await call(ctrl.getGstReturn, head, {}, {}, { from: '2020-01-01', to: '2099-12-31' })).body.data;
  const ledger2400 = tb.rows.find((r) => r.code === '2400');
  assert.equal(gst1.netOutputTax, Math.round((ledger2400.credit - ledger2400.debit) * 100) / 100, 'GST worksheet ties to GST payable');
  assert.equal((await call(ctrl.auditCsv, emp, {}, {}, { from: '2020-01-01', to: '2099-01-01' })).statusCode, 403);
  assert.equal((await call(ctrl.auditCsv, head, {}, {}, { from: '2020-01-01', to: '2099-01-01' })).statusCode, 200);
});
