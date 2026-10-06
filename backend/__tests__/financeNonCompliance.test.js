const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const ctrl = require('../controllers/finance/financeDispute.controller');
const NonCompliance = require('../models/finance/NonCompliance');
const Dispute = require('../models/finance/Dispute');
const Invoice = require('../models/finance/Invoice');
const Justification = require('../models/finance/Justification');
const Department = require('../models/department/Department');

// Non-compliance records a breach of what was agreed. Most are remediated without freezing
// money; the ones that matter financially escalate into a dispute, and that handover is
// what these tests pin down.

let mongod;
const oid = () => new mongoose.Types.ObjectId();
const headId = oid();
const empId = oid();
const users = {
  head: { _id: headId, id: headId, role: 'finance_manager', firstName: 'Fin', lastName: 'Head' },
  emp: { _id: empId, id: empId, role: 'finance_employee', firstName: 'Fin', lastName: 'Emp' },
  itManager: { _id: oid(), id: oid(), role: 'it_manager', firstName: 'IT', lastName: 'Lead' },
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
const raise = (over = {}, user = users.emp) => call(ctrl.createNonCompliance, {
  user,
  body: {
    kind: 'missed_deadline', severity: 'medium', party: 'vendor',
    description: 'Vendor delivered milestone 3 eleven days late.',
    departmentId: String(deptId), ...over,
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

test('raising, acknowledging and closing walks the full lifecycle', async () => {
  const created = await raise();
  assert.equal(created.statusCode, 201, JSON.stringify(created.body));
  assert.match(created.body.data.ticketNumber, /^NC-\d{6}-\d{4}$/);
  assert.equal(created.body.data.status, 'open');
  const id = String(created.body.data._id);

  const ack = await call(ctrl.acknowledgeNonCompliance, { user: users.emp, params: { id }, body: { comment: 'Vendor has confirmed.' } });
  assert.equal(ack.statusCode, 200, JSON.stringify(ack.body));
  assert.equal(ack.body.data.status, 'acknowledged');

  const closed = await call(ctrl.closeNonCompliance, {
    user: users.head, params: { id }, body: { status: 'remediated', comment: 'Delivered and credited.' },
  });
  assert.equal(closed.statusCode, 200, JSON.stringify(closed.body));
  assert.equal(closed.body.data.status, 'remediated');
  assert.equal(closed.body.data.timeline.length, 3, 'append-only across the lifecycle');
});

test('invalid kind, severity, party or a missing description are refused', async () => {
  assert.equal((await raise({ kind: 'vibes' })).statusCode, 422);
  assert.equal((await raise({ severity: 'apocalyptic' })).statusCode, 422);
  assert.equal((await raise({ party: 'aliens' })).statusCode, 422);
  assert.equal((await raise({ description: '  ' })).statusCode, 422);
  assert.equal((await raise({ departmentId: undefined })).statusCode, 422);
  assert.equal(await NonCompliance.countDocuments(), 0);
});

test('an employee cannot close a record; the head can waive it', async () => {
  const id = String((await raise()).body.data._id);
  const denied = await call(ctrl.closeNonCompliance, { user: users.emp, params: { id }, body: { status: 'waived', comment: 'x' } });
  assert.equal(denied.statusCode, 403, JSON.stringify(denied.body));

  const waived = await call(ctrl.closeNonCompliance, {
    user: users.head, params: { id }, body: { status: 'waived', comment: 'Commercially accepted.' },
  });
  assert.equal(waived.statusCode, 200);
  assert.equal(waived.body.data.status, 'waived');
  // Closing twice is not a legal path.
  assert.equal((await call(ctrl.closeNonCompliance, { user: users.head, params: { id }, body: { status: 'remediated', comment: 'y' } })).statusCode, 409);
});

test('closing requires a note and a valid status', async () => {
  const id = String((await raise()).body.data._id);
  assert.equal((await call(ctrl.closeNonCompliance, { user: users.head, params: { id }, body: { status: 'remediated' } })).statusCode, 422);
  assert.equal((await call(ctrl.closeNonCompliance, { user: users.head, params: { id }, body: { status: 'ignored', comment: 'x' } })).statusCode, 422);
  assert.equal((await NonCompliance.findById(id)).status, 'open');
});

test('escalating creates a linked dispute that freezes the invoice', async () => {
  const invoice = await Invoice.create({
    invoiceNumber: `INV-${Math.random()}`, clientName: 'Acme', status: 'sent',
    items: [{ description: 'Service', quantity: 1, rate: 1000, amount: 1000 }],
    subtotal: 1000, total: 1000, balanceDue: 1000, departmentId: deptId, createdBy: empId,
  });
  const created = await raise({
    kind: 'quality_deviation', subjectType: 'invoice', subjectId: String(invoice._id),
    financialImpact: 250, documents: [{ url: 'https://files.example/qa.pdf', label: 'QA report' }],
  });
  const id = String(created.body.data._id);

  const escalated = await call(ctrl.escalateNonCompliance, { user: users.head, params: { id }, body: {} });
  assert.equal(escalated.statusCode, 201, JSON.stringify(escalated.body));
  const dispute = escalated.body.data;
  assert.equal(dispute.status, 'open');
  assert.equal(dispute.amountDisputed, 250);
  assert.match(dispute.reason, /Escalated from NC-/);

  // The link is recorded both ways, and the invoice is frozen.
  assert.equal(String((await NonCompliance.findById(id)).disputeId), String(dispute._id));
  assert.equal(String((await Invoice.findById(invoice._id)).disputeId), String(dispute._id));

  // Escalating twice would double-freeze; it is refused.
  assert.equal((await call(ctrl.escalateNonCompliance, { user: users.head, params: { id }, body: {} })).statusCode, 409);
});

test('a record not attached to an invoice or expense cannot be escalated', async () => {
  const id = String((await raise({ subjectType: 'project', subjectId: String(oid()) })).body.data._id);
  const res = await call(ctrl.escalateNonCompliance, { user: users.head, params: { id }, body: { amountDisputed: 100 } });
  assert.equal(res.statusCode, 422, JSON.stringify(res.body));
  assert.equal(await Dispute.countDocuments(), 0);
});

test('listing filters by kind, severity and status, and counts agree with the rows', async () => {
  await raise({ kind: 'budget_overrun', severity: 'critical' });
  await raise({ kind: 'missed_deadline', severity: 'low' });
  await raise({ kind: 'missed_deadline', severity: 'high' });

  const all = await call(ctrl.getNonCompliances, { user: users.head, query: {} });
  assert.equal(all.body.data.pagination.total, 3);
  assert.equal(all.body.data.counts.open, 3, 'status counts match the filtered set');

  const byKind = await call(ctrl.getNonCompliances, { user: users.head, query: { kind: 'missed_deadline' } });
  assert.equal(byKind.body.data.pagination.total, 2);
  assert.equal(byKind.body.data.items.length, 2);
});

// ── Justifications ──────────────────────────────────────────────────────────

test('finance asks, a department stakeholder answers with evidence, finance decides', async () => {
  const asked = await call(ctrl.askJustification, {
    user: users.head,
    body: { subjectType: 'expense', subjectId: String(oid()), question: 'Why was this incurred?', departmentId: String(deptId) },
  });
  assert.equal(asked.statusCode, 201, JSON.stringify(asked.body));
  const id = String(asked.body.data._id);
  assert.equal(asked.body.data.outcome, 'pending');

  // Deciding with no response yet is refused — there is nothing to judge.
  assert.equal((await call(ctrl.decideJustification, { user: users.head, params: { id }, body: { outcome: 'accepted' } })).statusCode, 409);

  const responded = await call(ctrl.respondJustification, {
    user: users.head, params: { id },
    body: {
      body: 'Approved change request CR-22 added the extra environment.',
      links: [{ kind: 'change_request', refId: String(oid()), label: 'CR-22' }],
      documents: [{ url: 'https://files.example/cr22.pdf', label: 'CR-22' }],
    },
  });
  assert.equal(responded.statusCode, 200, JSON.stringify(responded.body));
  assert.equal(responded.body.data.responses.length, 1);
  assert.equal(responded.body.data.responses[0].links[0].kind, 'change_request');

  const decided = await call(ctrl.decideJustification, {
    user: users.head, params: { id }, body: { outcome: 'accepted' },
  });
  assert.equal(decided.statusCode, 200);
  assert.equal(decided.body.data.outcome, 'accepted');
  // Deciding twice is refused.
  assert.equal((await call(ctrl.decideJustification, { user: users.head, params: { id }, body: { outcome: 'rejected', outcomeNote: 'x' } })).statusCode, 409);
});

test('a stakeholder from another department cannot respond', async () => {
  const other = await Department.create({ name: 'Media', code: 'MEDIA' });
  const asked = await call(ctrl.askJustification, {
    user: users.head,
    body: { subjectType: 'expense', subjectId: String(oid()), question: 'Why?', departmentId: String(other._id) },
  });
  const id = String(asked.body.data._id);

  // it_manager maps to the IT department, which does not own this record.
  const res = await call(ctrl.respondJustification, { user: users.itManager, params: { id }, body: { body: 'Because.' } });
  assert.equal(res.statusCode, 403, JSON.stringify(res.body));
  assert.equal((await Justification.findById(id)).responses.length, 0);
});

test('rejecting or escalating a justification requires a note', async () => {
  const asked = await call(ctrl.askJustification, {
    user: users.head,
    body: { subjectType: 'budget', subjectId: String(oid()), question: 'Why the overrun?', departmentId: String(deptId) },
  });
  const id = String(asked.body.data._id);
  await call(ctrl.respondJustification, { user: users.head, params: { id }, body: { body: 'Scope grew.' } });

  assert.equal((await call(ctrl.decideJustification, { user: users.head, params: { id }, body: { outcome: 'rejected' } })).statusCode, 422);
  const ok = await call(ctrl.decideJustification, {
    user: users.head, params: { id }, body: { outcome: 'escalated', outcomeNote: 'Raising with the sponsor.' },
  });
  assert.equal(ok.statusCode, 200);
  assert.equal(ok.body.data.outcome, 'escalated');
});

test('an invalid evidence link kind is refused', async () => {
  const asked = await call(ctrl.askJustification, {
    user: users.head,
    body: { subjectType: 'expense', subjectId: String(oid()), question: 'Why?', departmentId: String(deptId) },
  });
  const id = String(asked.body.data._id);
  const res = await call(ctrl.respondJustification, {
    user: users.head, params: { id },
    body: { body: 'See attached.', links: [{ kind: 'telepathy', label: 'trust me' }] },
  });
  assert.equal(res.statusCode, 422, JSON.stringify(res.body));
});
