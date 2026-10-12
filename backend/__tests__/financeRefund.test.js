const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const ctrl = require('../controllers/finance/financeDispute.controller');
const Refund = require('../models/finance/Refund');
const Invoice = require('../models/finance/Invoice');
const Payment = require('../models/finance/Payment');
const JournalEntry = require('../models/finance/JournalEntry');
const Dispute = require('../models/finance/Dispute');
const Department = require('../models/department/Department');

// A refund returns money already received. The invariant worth testing is that it can
// never return more than was collected, however the request is shaped or retried.

let mongod;
const oid = () => new mongoose.Types.ObjectId();
const headId = oid();
const empId = oid();
const otherHeadId = oid();
const users = {
  head: { _id: headId, id: headId, role: 'finance_manager', firstName: 'Fin', lastName: 'Head' },
  head2: { _id: otherHeadId, id: otherHeadId, role: 'finance_manager', firstName: 'Second', lastName: 'Head' },
  emp: { _id: empId, id: empId, role: 'finance_employee', firstName: 'Fin', lastName: 'Emp' },
};

const makeRes = () => ({
  statusCode: 200, body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});
const call = async (fn, { user, params = {}, body = {}, query = {} }) => {
  const res = makeRes();
  await fn({ user, params, body, query }, res, () => {});
  return res;
};

let deptId;

const setup = async ({ received = 1000 } = {}) => {
  const invoice = await Invoice.create({
    invoiceNumber: `INV-${Math.random()}`, clientName: 'Acme', status: 'paid',
    items: [{ description: 'Service', quantity: 1, rate: 1000, amount: 1000 }],
    subtotal: 1000, total: 1000, amountPaid: received, balanceDue: 1000 - received,
    departmentId: deptId, createdBy: empId,
  });
  const payment = await Payment.create({
    invoice: invoice._id, allocations: [{ invoice: invoice._id, amountMinor: Math.round(received * 100) }],
    customerName: 'Acme', direction: 'in', status: 'completed', amount: received,
    method: 'bank', paymentDate: new Date(), reference: `PAY-${Math.random()}`, createdBy: empId,
  });
  return { invoice, payment };
};

// Draft -> submitted -> approved, so `process` has something legal to act on.
const approved = async (invoice, payment, amount) => {
  const created = await call(ctrl.createRefund, {
    user: users.emp,
    body: { invoice: String(invoice._id), payment: String(payment._id), amount, reason: 'Overbilled', reference: `RF-${Math.random()}` },
  });
  assert.equal(created.statusCode, 201, JSON.stringify(created.body));
  const id = String(created.body.data._id);
  await call(ctrl.submitRefund, { user: users.emp, params: { id } });
  const decided = await call(ctrl.decideRefund, { user: users.head, params: { id }, body: { decision: 'approve' } });
  assert.equal(decided.statusCode, 200, JSON.stringify(decided.body));
  return id;
};

test.before(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongod.getUri());
});
test.after(async () => { await mongoose.disconnect(); await mongod.stop(); });
test.beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  const dept = await Department.create({ name: 'Finance', code: 'FIN' });
  deptId = dept._id;
});

test('a refund cannot exceed the unrefunded balance of the payment', async () => {
  const { invoice, payment } = await setup({ received: 1000 });
  const res = await call(ctrl.createRefund, {
    user: users.emp,
    body: { invoice: String(invoice._id), payment: String(payment._id), amount: 1500, reason: 'too much', reference: 'RF-1' },
  });
  assert.equal(res.statusCode, 409, JSON.stringify(res.body));
  assert.equal(await Refund.countDocuments(), 0);
});

test('a duplicate reference against the same payment is refused (idempotency)', async () => {
  const { invoice, payment } = await setup();
  // Idempotency is scoped to the payment: the same reference replayed against the same
  // receipt is the retry we must swallow. A unique reference per request is what a client
  // sends; a retried request sends the same one again.
  const reference = `RF-DUP-${Math.random()}`;
  const body = { invoice: String(invoice._id), payment: String(payment._id), amount: 100, reason: 'partial', reference };
  assert.equal((await call(ctrl.createRefund, { user: users.emp, body })).statusCode, 201);
  const second = await call(ctrl.createRefund, { user: users.emp, body });
  assert.equal(second.statusCode, 409, JSON.stringify(second.body));
  assert.equal(await Refund.countDocuments({ payment: payment._id }), 1);
});

test('the same reference may be reused against a different payment', async () => {
  // The index is {payment, reference}, not a global unique: two customers can both send
  // "REFUND-1", and refusing the second would be wrong.
  const a = await setup();
  const b = await setup();
  const reference = `RF-SHARED-${Math.random()}`;
  assert.equal((await call(ctrl.createRefund, {
    user: users.emp,
    body: { invoice: String(a.invoice._id), payment: String(a.payment._id), amount: 100, reason: 'r', reference },
  })).statusCode, 201);
  assert.equal((await call(ctrl.createRefund, {
    user: users.emp,
    body: { invoice: String(b.invoice._id), payment: String(b.payment._id), amount: 100, reason: 'r', reference },
  })).statusCode, 201);
});

test('a refund on a disputed invoice is refused', async () => {
  const { invoice, payment } = await setup();
  const d = await Dispute.create({
    disputeNumber: 'DSP-202610-8001', subjectType: 'invoice', subjectId: invoice._id,
    raisedAgainst: 'client', status: 'open', amountDisputed: 100, reason: 'contested',
    documents: [{ url: 'https://files.example/x.pdf' }], departmentId: deptId, raisedBy: empId,
  });
  await Invoice.findByIdAndUpdate(invoice._id, { disputeId: d._id });

  const res = await call(ctrl.createRefund, {
    user: users.emp,
    body: { invoice: String(invoice._id), payment: String(payment._id), amount: 100, reason: 'r', reference: 'RF-2' },
  });
  assert.equal(res.statusCode, 409, JSON.stringify(res.body));
  assert.match(res.body.error, /under dispute/i);
});

test('processing posts a balanced reversing entry and increments both refunded totals', async () => {
  const { invoice, payment } = await setup({ received: 1000 });
  const id = await approved(invoice, payment, 300);

  const res = await call(ctrl.processRefund, { user: users.head, params: { id } });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.status, 'processed');

  const je = await JournalEntry.findOne({ sourceKey: `refund-${id}` }).lean();
  assert.ok(je, 'a reversing entry was posted');
  assert.equal(je.totalDebit, je.totalCredit, 'entry balances');
  assert.equal(je.totalDebit, 300);

  assert.equal((await Payment.findById(payment._id)).refundedTotal, 300);
  assert.equal((await Invoice.findById(invoice._id)).refundedTotal, 300);
});

test('two refunds cannot jointly exceed the payment', async () => {
  const { invoice, payment } = await setup({ received: 1000 });

  // Both are approved while headroom still exists for each individually (700 + 700 against
  // 1000). Creation cannot catch this: at the time each was raised, nothing was refunded.
  const first = await approved(invoice, payment, 700);
  const second = await approved(invoice, payment, 700);

  assert.equal((await call(ctrl.processRefund, { user: users.head, params: { id: first } })).statusCode, 200);

  // The second must now fail, because the headroom is re-checked at processing time. This
  // is the guard that matters: an approval is not a licence to overdraw later.
  const res = await call(ctrl.processRefund, { user: users.head, params: { id: second } });
  assert.equal(res.statusCode, 409, JSON.stringify(res.body));
  assert.equal((await Payment.findById(payment._id)).refundedTotal, 700, 'no over-refund');
  assert.equal(await JournalEntry.countDocuments({ sourceKey: `refund-${second}` }), 0);
});

test('a refund raised after the headroom is gone is refused at creation', async () => {
  const { invoice, payment } = await setup({ received: 1000 });
  const first = await approved(invoice, payment, 1000);
  assert.equal((await call(ctrl.processRefund, { user: users.head, params: { id: first } })).statusCode, 200);

  // Nothing left to return, so this never becomes a record at all.
  const res = await call(ctrl.createRefund, {
    user: users.emp,
    body: { invoice: String(invoice._id), payment: String(payment._id), amount: 1, reason: 'r', reference: 'RF-LATE' },
  });
  assert.equal(res.statusCode, 409, JSON.stringify(res.body));
});

test('a refund cannot be approved by the person who submitted it', async () => {
  const { invoice, payment } = await setup();
  const created = await call(ctrl.createRefund, {
    user: users.head,
    body: { invoice: String(invoice._id), payment: String(payment._id), amount: 100, reason: 'r', reference: 'RF-3' },
  });
  const id = String(created.body.data._id);
  await call(ctrl.submitRefund, { user: users.head, params: { id } });

  const sameHead = await call(ctrl.decideRefund, { user: users.head, params: { id }, body: { decision: 'approve' } });
  assert.equal(sameHead.statusCode, 403, JSON.stringify(sameHead.body));

  const otherHead = await call(ctrl.decideRefund, { user: users.head2, params: { id }, body: { decision: 'approve' } });
  assert.equal(otherHead.statusCode, 200, JSON.stringify(otherHead.body));
});

test('an unapproved refund cannot be processed, and a rejected one posts nothing', async () => {
  const { invoice, payment } = await setup();
  const created = await call(ctrl.createRefund, {
    user: users.emp,
    body: { invoice: String(invoice._id), payment: String(payment._id), amount: 100, reason: 'r', reference: 'RF-4' },
  });
  const id = String(created.body.data._id);

  // Draft cannot be processed.
  assert.equal((await call(ctrl.processRefund, { user: users.head, params: { id } })).statusCode, 409);

  await call(ctrl.submitRefund, { user: users.emp, params: { id } });
  const rejected = await call(ctrl.decideRefund, { user: users.head, params: { id }, body: { decision: 'return', note: 'Not owed.' } });
  assert.equal(rejected.statusCode, 200);
  assert.equal(rejected.body.data.status, 'rejected');

  assert.equal((await call(ctrl.processRefund, { user: users.head, params: { id } })).statusCode, 409);
  assert.equal(await JournalEntry.countDocuments({ sourceKey: `refund-${id}` }), 0, 'nothing posted');
  assert.equal((await Payment.findById(payment._id)).refundedTotal, 0);
});

test('an employee cannot process a refund', async () => {
  const { invoice, payment } = await setup();
  const id = await approved(invoice, payment, 100);
  const res = await call(ctrl.processRefund, { user: users.emp, params: { id } });
  assert.equal(res.statusCode, 403, JSON.stringify(res.body));
  assert.equal((await Payment.findById(payment._id)).refundedTotal, 0);
});

test('an outgoing payment cannot be refunded', async () => {
  const { invoice } = await setup();
  const outgoing = await Payment.create({
    customerName: 'Supplier', direction: 'out', status: 'completed', amount: 500,
    method: 'bank', paymentDate: new Date(), reference: `OUT-${Math.random()}`, createdBy: empId,
  });
  const res = await call(ctrl.createRefund, {
    user: users.emp,
    body: { invoice: String(invoice._id), payment: String(outgoing._id), amount: 100, reason: 'r', reference: 'RF-5' },
  });
  assert.equal(res.statusCode, 422, JSON.stringify(res.body));
});


test('concurrent duplicate refund requests create one draft and one audit record', async () => {
  const { invoice, payment } = await setup();
  const body = { invoice: String(invoice._id), payment: String(payment._id), amount: 100, reason: 'Retry', reference: 'RF-CONCURRENT' };
  const results = await Promise.all([1, 2].map(() => call(ctrl.createRefund, { user: users.emp, body })));
  assert.deepEqual(results.map(r => r.statusCode).sort(), [201, 409]);
  assert.equal(await Refund.countDocuments({ payment: payment._id }), 1);
  const Audit = require('../models/finance/AuditLog');
  assert.equal(await Audit.countDocuments({ action: 'refund_created' }), 1);
});

test('refund creation requires a received payment allocated to the selected invoice', async () => {
  const a = await setup(); const b = await setup();
  const body = { invoice: String(b.invoice._id), payment: String(a.payment._id), amount: 100, reason: 'Wrong invoice', reference: 'RF-UNRELATED' };
  const unrelated = await call(ctrl.createRefund, { user: users.emp, body });
  assert.equal(unrelated.statusCode, 422, JSON.stringify(unrelated.body));
  await Payment.findByIdAndUpdate(a.payment._id, { status: 'failed' });
  const failed = await call(ctrl.createRefund, { user: users.emp, body: { ...body, invoice: String(a.invoice._id) } });
  assert.equal(failed.statusCode, 409, JSON.stringify(failed.body));
  assert.equal(await Refund.countDocuments(), 0);
});

test('a multi-invoice receipt cannot refund more than its selected invoice allocation', async () => {
  const a = await setup(); const b = await setup();
  await Payment.findByIdAndUpdate(a.payment._id, { allocations: [
    { invoice: a.invoice._id, amountMinor: 30000 }, { invoice: b.invoice._id, amountMinor: 70000 },
  ] });
  const body = { invoice: String(a.invoice._id), payment: String(a.payment._id), reason: 'Partial', reference: 'RF-ALLOCATION' };
  assert.equal((await call(ctrl.createRefund, { user: users.emp, body: { ...body, amount: 301 } })).statusCode, 409);
  const refundId = await approved(a.invoice, a.payment, 200);
  assert.equal((await call(ctrl.processRefund, { user: users.head, params: { id: refundId } })).statusCode, 200);
  assert.equal((await call(ctrl.createRefund, { user: users.emp, body: { ...body, amount: 101 } })).statusCode, 409);
  assert.equal((await call(ctrl.createRefund, { user: users.emp, body: { ...body, amount: 100 } })).statusCode, 201);
});

test('processing rechecks disputes and both financial periods after approval', async () => {
  const { invoice, payment } = await setup(); const refundId = await approved(invoice, payment, 100);
  const params = { id: refundId };
  for (const Model of [Invoice, Payment]) {
    const subjectId = Model === Invoice ? invoice._id : payment._id;
    await Model.findByIdAndUpdate(subjectId, { disputeId: oid() });
    const res = await call(ctrl.processRefund, { user: users.head, params });
    assert.equal(res.statusCode, 409, JSON.stringify(res.body));
    assert.match(res.body.error, /under dispute/i);
    await Model.findByIdAndUpdate(subjectId, { disputeId: null });
  }
  const Period = require('../models/finance/FinancialPeriod');
  const period = await Period.create({ fiscalYear: '2026', label: 'Closed month', periodType: 'month', startDate: '2026-10-01', endDate: '2026-10-31', isClosed: true });
  await Payment.findByIdAndUpdate(payment._id, { financialPeriodId: period._id });
  const closed = await call(ctrl.processRefund, { user: users.head, params });
  assert.equal(closed.statusCode, 409, JSON.stringify(closed.body));
  assert.match(closed.body.error, /closed/i);
  assert.equal((await Refund.findById(refundId)).status, 'approved');
  assert.equal((await Payment.findById(payment._id)).refundedTotal, 0);
  assert.equal((await Invoice.findById(invoice._id)).refundedTotal, 0);
  assert.equal(await JournalEntry.countDocuments({ sourceKey: `refund-${refundId}` }), 0);
});

test('concurrent approved refunds cannot together exceed the receipt', async () => {
  const { invoice, payment } = await setup();
  const ids = [await approved(invoice, payment, 700), await approved(invoice, payment, 700)];
  const results = await Promise.all(ids.map(id => call(ctrl.processRefund, { user: users.head, params: { id } })));
  assert.deepEqual(results.map(r => r.statusCode).sort(), [200, 409]);
  assert.equal((await Payment.findById(payment._id)).refundedTotal, 700);
  assert.equal(await Refund.countDocuments({ status: 'processed' }), 1);
  assert.equal(await JournalEntry.countDocuments({ sourceKey: { $in: ids.map(id => `refund-${id}`) } }), 1);
});

test('a processed refund prevents a second full reversal of its receipt', async () => {
  const { invoice, payment } = await setup();
  await Payment.findByIdAndUpdate(payment._id, { status: 'recorded' });
  const refundId = await approved(invoice, payment, 100);
  assert.equal((await call(ctrl.processRefund, { user: users.head, params: { id: refundId } })).statusCode, 200);
  const operations = require('../controllers/finance/financeOperations.controller');
  const res = await call(operations.updatePayment, { user: users.head, params: { id: String(payment._id) }, body: { status: 'failed', failureReason: 'Attempted full reversal' } });
  assert.equal(res.statusCode, 409, JSON.stringify(res.body));
  assert.equal((await Payment.findById(payment._id)).status, 'recorded');
  assert.equal(await JournalEntry.countDocuments({ sourceKey: `reversal-${payment._id}` }), 0);
});
