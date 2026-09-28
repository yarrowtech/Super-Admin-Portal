const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const ctrl = require('../controllers/finance/financeDashboard.controller');
const Invoice = require('../models/finance/Invoice');
const Payroll = require('../models/finance/Payroll');
const Budget = require('../models/finance/Budget');
const JournalEntry = require('../models/finance/JournalEntry');

// Finance maker-checker: employees prepare and submit; only the finance head approves / returns.

let mongod;
const oid = () => new mongoose.Types.ObjectId();
const headId = oid();
const empId = oid();
const otherEmpId = oid();
const users = {
  head: { _id: headId, id: headId, role: 'finance_manager', firstName: 'Fin', lastName: 'Head' },
  emp: { _id: empId, id: empId, role: 'finance_employee', firstName: 'Fin', lastName: 'Emp' },
  other: { _id: otherEmpId, id: otherEmpId, role: 'finance_employee', firstName: 'Other', lastName: 'Emp' },
  hr: { _id: oid(), id: oid(), role: 'hr', firstName: 'H', lastName: 'R' },
};

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});
const call = async (fn, { user, params = {}, body = {}, query = {} }) => {
  const res = makeRes();
  let nextCalled = false;
  await fn({ user, params, body, query }, res, () => { nextCalled = true; });
  return { res, nextCalled };
};

const makeInvoice = (over = {}) => Invoice.create({ invoiceNumber: `INV-${Math.random()}`, clientName: 'Acme', total: 1180, balanceDue: 1180, createdBy: empId, ...over });

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri());
});
test.after(async () => { await mongoose.disconnect(); await mongod.stop(); });
test.beforeEach(async () => { await mongoose.connection.db.dropDatabase(); });

test('employee submits an invoice; head approves and it is sent', async () => {
  const inv = await makeInvoice();
  const params = { module: 'invoice', id: String(inv._id) };

  const submit = await call(ctrl.submitForReview, { user: users.emp, params, body: { note: 'Ready for Acme' } });
  assert.equal(submit.res.statusCode, 200);
  assert.equal(submit.res.body.data.review.status, 'submitted');
  assert.equal(submit.res.body.data.review.submittedByName, 'Fin Emp');

  const again = await call(ctrl.submitForReview, { user: users.emp, params });
  assert.equal(again.res.statusCode, 409);

  const byEmployee = await call(ctrl.decideReview, { user: users.emp, params, body: { decision: 'approve' } });
  assert.equal(byEmployee.res.statusCode, 403);

  const approve = await call(ctrl.decideReview, { user: users.head, params, body: { decision: 'approve' } });
  assert.equal(approve.res.statusCode, 200);
  const saved = await Invoice.findById(inv._id).lean();
  assert.equal(saved.status, 'sent');
  assert.equal(saved.review.status, 'approved');
  assert.equal(saved.review.decidedByName, 'Fin Head');
});

test('returning needs a reason and unlocks the item for editing', async () => {
  const inv = await makeInvoice();
  const params = { module: 'invoice', id: String(inv._id) };
  await call(ctrl.submitForReview, { user: users.emp, params });

  // While waiting, the employee cannot edit it.
  const locked = await call(ctrl.guardNotUnderReview('invoice'), { user: users.emp, params: { id: String(inv._id) } });
  assert.equal(locked.res.statusCode, 409);
  assert.equal(locked.nextCalled, false);

  const noReason = await call(ctrl.decideReview, { user: users.head, params, body: { decision: 'return' } });
  assert.equal(noReason.res.statusCode, 400);

  const ret = await call(ctrl.decideReview, { user: users.head, params, body: { decision: 'return', note: 'GST should be 18%' } });
  assert.equal(ret.res.statusCode, 200);
  const saved = await Invoice.findById(inv._id).lean();
  assert.equal(saved.status, 'draft');
  assert.equal(saved.review.status, 'returned');
  assert.equal(saved.review.decisionNote, 'GST should be 18%');

  const unlocked = await call(ctrl.guardNotUnderReview('invoice'), { user: users.emp, params: { id: String(inv._id) } });
  assert.equal(unlocked.nextCalled, true);

  const resubmit = await call(ctrl.submitForReview, { user: users.emp, params });
  assert.equal(resubmit.res.body.data.review.status, 'submitted');
});

test('employees cannot move money-affecting statuses themselves', async () => {
  const guard = ctrl.guardHeadOnlyStatus('invoice');
  assert.equal((await call(guard, { user: users.emp, body: { status: 'sent' } })).res.statusCode, 403);
  assert.equal((await call(guard, { user: users.emp, body: { status: 'draft' } })).nextCalled, true);
  assert.equal((await call(guard, { user: users.emp, body: { clientName: 'x' } })).nextCalled, true);
  assert.equal((await call(guard, { user: users.head, body: { status: 'sent' } })).nextCalled, true);

  const payrollGuard = ctrl.guardHeadOnlyStatus('payroll');
  assert.equal((await call(payrollGuard, { user: users.emp, body: { status: 'processed' } })).res.statusCode, 403);
  assert.equal((await call(payrollGuard, { user: users.emp, body: { status: 'disbursed' } })).res.statusCode, 403);
});

test('approving a payroll run processes it and charges the department budget once', async () => {
  const budget = await Budget.create({ department: 'Ops', fiscalYear: '2026', allocated: 100000, spent: 0 });
  const run = await Payroll.create({ employeeName: 'Priya', periodStart: new Date(), periodEnd: new Date(), grossPay: 50000, netPay: 45000, budgetId: budget._id });
  const params = { module: 'payroll', id: String(run._id) };
  await call(ctrl.submitForReview, { user: users.emp, params });
  const approve = await call(ctrl.decideReview, { user: users.head, params, body: { decision: 'approve' } });
  assert.equal(approve.res.statusCode, 200);
  assert.equal((await Payroll.findById(run._id).lean()).status, 'processed');
  assert.equal((await Budget.findById(budget._id).lean()).spent, 45000);
});

test('unbalanced journal entries cannot be submitted; balanced ones post on approval', async () => {
  const acctA = oid();
  const acctB = oid();
  const bad = await JournalEntry.create({ entryNumber: 'JE-1', lines: [{ account: acctA, debit: 100, credit: 0 }, { account: acctB, debit: 0, credit: 90 }], totalDebit: 100, totalCredit: 90 });
  const badSubmit = await call(ctrl.submitForReview, { user: users.emp, params: { module: 'journal', id: String(bad._id) } });
  assert.equal(badSubmit.res.statusCode, 422);

  const good = await JournalEntry.create({ entryNumber: 'JE-2', lines: [{ account: acctA, debit: 100, credit: 0 }, { account: acctB, debit: 0, credit: 100 }], totalDebit: 100, totalCredit: 100 });
  const params = { module: 'journal', id: String(good._id) };
  await call(ctrl.submitForReview, { user: users.emp, params });
  await call(ctrl.decideReview, { user: users.head, params, body: { decision: 'approve' } });
  const saved = await JournalEntry.findById(good._id).lean();
  assert.equal(saved.status, 'posted');
  assert.ok(saved.postedAt);
});

test('queue: head sees the whole team, employees only their own submissions', async () => {
  const mineInv = await makeInvoice();
  const otherInv = await makeInvoice({ createdBy: otherEmpId });
  await call(ctrl.submitForReview, { user: users.emp, params: { module: 'invoice', id: String(mineInv._id) } });
  await call(ctrl.submitForReview, { user: users.other, params: { module: 'invoice', id: String(otherInv._id) } });

  const headQueue = await call(ctrl.getReviewQueue, { user: users.head });
  assert.equal(headQueue.res.body.data.isHead, true);
  assert.equal(headQueue.res.body.data.rows.length, 2);

  const empQueue = await call(ctrl.getReviewQueue, { user: users.emp });
  assert.equal(empQueue.res.body.data.isHead, false);
  assert.deepEqual(empQueue.res.body.data.rows.map((r) => String(r.id)), [String(mineInv._id)]);
});
