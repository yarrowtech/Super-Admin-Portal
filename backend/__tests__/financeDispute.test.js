const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const ctrl = require('../controllers/finance/financeDispute.controller');
const ops = require('../controllers/finance/financeOperations.controller');
const Dispute = require('../models/finance/Dispute');
const Invoice = require('../models/finance/Invoice');
const Payment = require('../models/finance/Payment');
const JournalEntry = require('../models/finance/JournalEntry');
const Note = require('../models/finance/InvoiceNote');
const Vendor = require('../models/finance/Vendor');
const Department = require('../models/department/Department');

// Disputes freeze money movement. These tests exist to prove the freeze actually holds —
// a dispute that does not stop a payment is decoration.

let mongod;
const oid = () => new mongoose.Types.ObjectId();
const headId = oid();
const empId = oid();
const users = {
  head: { _id: headId, id: headId, role: 'finance_manager', firstName: 'Fin', lastName: 'Head' },
  emp: { _id: empId, id: empId, role: 'finance_employee', firstName: 'Fin', lastName: 'Emp' },
};

const makeRes = () => ({
  statusCode: 200,
  body: null,
  status(code) { this.statusCode = code; return this; },
  json(payload) { this.body = payload; return this; },
});
const call = async (fn, { user, params = {}, body = {}, query = {} }) => {
  const res = makeRes();
  await fn({ user, params, body, query }, res, () => {});
  return res;
};

let deptId;
const DOC = [{ url: 'https://files.example/evidence.pdf', label: 'Evidence', sha256: 'a'.repeat(64) }];

const makeInvoice = (over = {}) => Invoice.create({
  invoiceNumber: `INV-${Math.random()}`, clientName: 'Acme', status: 'sent',
  dueDate: new Date(Date.now() + 864e6),
  items: [{ description: 'Service', quantity: 1, rate: 1000, amount: 1000 }],
  subtotal: 1000, total: 1000, balanceDue: 1000, departmentId: deptId, createdBy: empId, ...over,
});

const raise = (over = {}, user = users.emp) => call(ctrl.createDispute, {
  user,
  body: {
    subjectType: 'invoice', raisedAgainst: 'client', amountDisputed: 400,
    reason: 'Client disputes the scope delivered in milestone 2.',
    documents: DOC, departmentId: String(deptId), ...over,
  },
});

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

test('raising a dispute freezes the invoice and a second active dispute is refused', async () => {
  const inv = await makeInvoice();
  const first = await raise({ subjectId: String(inv._id) });
  assert.equal(first.statusCode, 201, JSON.stringify(first.body));
  assert.equal(first.body.data.status, 'open');
  assert.match(first.body.data.disputeNumber, /^DSP-\d{6}-\d{4}$/);

  // The freeze is written onto the subject.
  assert.equal(String((await Invoice.findById(inv._id)).disputeId), String(first.body.data._id));

  // The partial unique index is what makes this a guarantee rather than a race.
  const second = await raise({ subjectId: String(inv._id) });
  assert.equal(second.statusCode, 409, JSON.stringify(second.body));
});

test('a payment against a disputed invoice is refused and leaves no writes', async () => {
  const inv = await makeInvoice();
  await raise({ subjectId: String(inv._id) });

  const res = await call(ops.createPayment, {
    user: users.head,
    body: { amount: 500, reference: `PAY-${Math.random()}`, method: 'bank', allocations: [{ invoice: String(inv._id), amount: 500 }] },
  });
  assert.equal(res.statusCode, 409, JSON.stringify(res.body));
  assert.match(res.body.error, /under dispute/i);
  // Nothing partial: no payment row, and the invoice balance is untouched.
  assert.equal(await Payment.countDocuments(), 0);
  assert.equal((await Invoice.findById(inv._id)).balanceDue, 1000);
});

test('a vendor payment is refused while the vendor is disputed, but a bill may still be booked', async () => {
  const vendor = await Vendor.create({ name: 'Supplier', status: 'active', balance: 0 });
  const recordVendorEntry = require('../services/finance/vendorLedger.service');
  await recordVendorEntry(String(vendor._id), { type: 'bill', amount: 1000, reference: 'BILL-1' }, users.head);

  const inv = await makeInvoice();
  await Dispute.create({
    disputeNumber: 'DSP-202610-9001', subjectType: 'vendor_bill', subjectId: inv._id,
    raisedAgainst: 'vendor', vendor: vendor._id, status: 'open', amountDisputed: 500,
    reason: 'Work not delivered', documents: DOC, departmentId: deptId, raisedBy: empId,
  });

  await assert.rejects(
    recordVendorEntry(String(vendor._id), { type: 'payment', amount: 100, reference: 'PAY-1' }, users.head),
    (e) => e.statusCode === 409 && /under dispute/i.test(e.message)
  );
  // Booking what is owed is still allowed — the freeze is on paying, not on recording debt.
  const after = await recordVendorEntry(String(vendor._id), { type: 'bill', amount: 50, reference: 'BILL-2' }, users.head);
  assert.equal(after.balance, 1050);
});

test('a dispute without a reason or without a document is refused', async () => {
  const inv = await makeInvoice();
  const noReason = await raise({ subjectId: String(inv._id), reason: '   ' });
  assert.equal(noReason.statusCode, 422);
  const noDocs = await raise({ subjectId: String(inv._id), documents: [] });
  assert.equal(noDocs.statusCode, 422);
  assert.equal(await Dispute.countDocuments(), 0);
});

test('illegal transitions are refused', async () => {
  const inv = await makeInvoice();
  const d = (await raise({ subjectId: String(inv._id) })).body.data;

  // Reviewing twice is not a legal path.
  assert.equal((await call(ctrl.reviewDispute, { user: users.head, params: { id: String(d._id) }, body: { comment: 'looking' } })).statusCode, 200);
  assert.equal((await call(ctrl.reviewDispute, { user: users.head, params: { id: String(d._id) }, body: { comment: 'again' } })).statusCode, 409);

  // Resolving twice is not either.
  assert.equal((await call(ctrl.resolveDispute, { user: users.head, params: { id: String(d._id) }, body: { resolution: 'released', comment: 'ok' } })).statusCode, 200);
  assert.equal((await call(ctrl.resolveDispute, { user: users.head, params: { id: String(d._id) }, body: { resolution: 'released', comment: 'ok' } })).statusCode, 409);
});

test('resolving as released unfreezes and posts no journal entry', async () => {
  const inv = await makeInvoice();
  const d = (await raise({ subjectId: String(inv._id) })).body.data;
  const before = await JournalEntry.countDocuments();

  const res = await call(ctrl.resolveDispute, {
    user: users.head, params: { id: String(d._id) },
    body: { resolution: 'released', comment: 'Client withdrew the objection.' },
  });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  assert.equal(res.body.data.resolution, 'released');
  assert.equal(await JournalEntry.countDocuments(), before, 'released posts nothing');
  assert.equal((await Invoice.findById(inv._id)).disputeId, null, 'freeze lifted');

  // And money can move again.
  const pay = await call(ops.createPayment, {
    user: users.head,
    body: { amount: 100, reference: `PAY-${Math.random()}`, method: 'bank', allocations: [{ invoice: String(inv._id), amount: 100 }] },
  });
  assert.equal(pay.statusCode, 201, JSON.stringify(pay.body));
});

test('writing off posts a balanced entry carrying the dispute dimensions', async () => {
  const projectId = oid();
  const inv = await makeInvoice({ projectId });
  const d = (await raise({ subjectId: String(inv._id), projectId: String(projectId), amountDisputed: 400 })).body.data;

  const res = await call(ctrl.resolveDispute, {
    user: users.head, params: { id: String(d._id) },
    body: { resolution: 'written_off', comment: 'Unrecoverable after legal review.' },
  });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));

  const je = await JournalEntry.findOne({ sourceKey: `dispute-writeoff-${d._id}` }).lean();
  assert.ok(je, 'a write-off entry was posted');
  assert.equal(je.totalDebit, je.totalCredit, 'entry balances');
  assert.equal(je.totalDebit, 400);
  assert.equal(je.status, 'posted');
  // Dimensions must ride along, or the write-off never appears in departmental reporting.
  for (const line of je.lines) {
    assert.equal(String(line.departmentId), String(deptId));
    assert.equal(String(line.projectId), String(projectId));
  }
  assert.equal((await Invoice.findById(inv._id)).disputeId, null);
});

test('converting to a debit note creates the note and a balanced matching entry', async () => {
  const inv = await makeInvoice();
  const d = (await raise({ subjectId: String(inv._id), amountDisputed: 250 })).body.data;

  const res = await call(ctrl.resolveDispute, {
    user: users.head, params: { id: String(d._id) },
    body: { resolution: 'converted_to_debit_note', comment: 'Rework billed back to the client.' },
  });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));

  const note = await Note.findOne({ invoice: inv._id, type: 'debit' }).lean();
  assert.ok(note, 'debit note created');
  assert.equal(note.amount, 250);

  const je = await JournalEntry.findOne({ sourceKey: `dispute-debitnote-${d._id}` }).lean();
  assert.ok(je);
  assert.equal(je.totalDebit, je.totalCredit);
  assert.equal(je.totalDebit, 250);

  // A debit note increases what is owed.
  const after = await Invoice.findById(inv._id);
  assert.equal(after.total, 1250);
  assert.equal(after.balanceDue, 1250);
});

test('an employee cannot review, resolve or cancel a dispute; the head can', async () => {
  const inv = await makeInvoice();
  const d = (await raise({ subjectId: String(inv._id) })).body.data;
  const p = { id: String(d._id) };

  assert.equal((await call(ctrl.reviewDispute, { user: users.emp, params: p, body: { comment: 'x' } })).statusCode, 403);
  assert.equal((await call(ctrl.resolveDispute, { user: users.emp, params: p, body: { resolution: 'released', comment: 'x' } })).statusCode, 403);
  assert.equal((await call(ctrl.cancelDispute, { user: users.emp, params: p, body: { comment: 'x' } })).statusCode, 403);
  assert.equal((await call(ctrl.cancelDispute, { user: users.head, params: p, body: { comment: 'Raised in error.' } })).statusCode, 200);
  assert.equal((await Invoice.findById(inv._id)).disputeId, null, 'cancel also unfreezes');
});

test('the timeline is append-only across the whole lifecycle', async () => {
  const inv = await makeInvoice();
  const d = (await raise({ subjectId: String(inv._id) })).body.data;
  assert.equal(d.timeline.length, 1);
  const raisedAt = d.timeline[0].at;

  await call(ctrl.reviewDispute, { user: users.head, params: { id: String(d._id) }, body: { comment: 'under review' } });
  await call(ctrl.resolveDispute, { user: users.head, params: { id: String(d._id) }, body: { resolution: 'released', comment: 'done' } });

  const final = await Dispute.findById(d._id).lean();
  assert.equal(final.timeline.length, 3, 'one row per transition, none replaced');
  assert.deepEqual(final.timeline.map(t => t.to), ['open', 'under_review', 'resolved']);
  // The first row is untouched by later transitions.
  assert.equal(new Date(final.timeline[0].at).toISOString(), new Date(raisedAt).toISOString());
  assert.equal(final.timeline[0].action, 'raised');
});
