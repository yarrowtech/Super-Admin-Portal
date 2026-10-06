const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const ctrl = require('../controllers/finance/financeControlTower.controller');
const T = require('../services/finance/controlTower.service');
const Invoice = require('../models/finance/Invoice');
const Budget = require('../models/finance/Budget');
const Expense = require('../models/finance/Expense');
const Dispute = require('../models/finance/Dispute');
const NonCompliance = require('../models/finance/NonCompliance');
const Justification = require('../models/finance/Justification');
const Department = require('../models/department/Department');

// The Control Tower's job is to be trustworthy at a glance. Two properties matter more
// than the arithmetic: a broken card must not blank the dashboard, and the number a card
// shows must match the list it opens.

let mongod;
const oid = () => new mongoose.Types.ObjectId();
const headId = oid();
const users = {
  head: { _id: headId, id: headId, role: 'finance_manager', firstName: 'Fin', lastName: 'Head' },
  itManager: { _id: oid(), id: oid(), role: 'it_manager', firstName: 'IT', lastName: 'Lead' },
  stranger: { _id: oid(), id: oid(), role: 'media_head', firstName: 'No', lastName: 'Dept' },
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

const DAY = 24 * 60 * 60 * 1000;
let finDeptId;

const overdueInvoice = (daysPastDue, over = {}) => Invoice.create({
  invoiceNumber: `INV-${Math.random()}`, clientName: 'Acme', status: 'sent',
  issueDate: new Date(Date.now() - (daysPastDue + 30) * DAY),
  dueDate: new Date(Date.now() - daysPastDue * DAY),
  items: [{ description: 'Service', quantity: 1, rate: 1000, amount: 1000 }],
  subtotal: 1000, total: 1000, balanceDue: 1000, departmentId: finDeptId, createdBy: headId, ...over,
});

// Takes the `data` payload (res.body.data) and picks one card out of it.
const cardFor = (data, key) => {
  const card = data?.cards?.find(c => c.key === key);
  assert.ok(card, `card "${key}" missing from ${JSON.stringify(data)}`);
  return card;
};

test.before(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(mongod.getUri());
});
test.after(async () => { await mongoose.disconnect(); await mongod.stop(); });
test.beforeEach(async () => {
  await mongoose.connection.db.dropDatabase();
  const dept = await Department.create({ name: 'Finance', code: 'FIN' });
  finDeptId = dept._id;
});

test('all five cards are returned and are green on an empty portal', async () => {
  const res = await call(ctrl.getControlTower, { user: users.head });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  const keys = res.body.data.cards.map(c => c.key);
  assert.deepEqual(keys.sort(), [...T.KEYS].sort());
  for (const card of res.body.data.cards) {
    assert.equal(card.status, 'green', `${card.key} should be green with no data`);
    assert.ok(card.drilldown.path, 'every card offers a drill-down');
  }
  assert.ok(res.body.data.generatedAt);
});

test('one failing aggregation degrades to a grey card instead of blanking the dashboard', async () => {
  const original = T.CARDS.open_disputes.grade;
  T.CARDS.open_disputes.grade = async () => { throw new Error('simulated failure'); };
  try {
    const res = await call(ctrl.getControlTower, { user: users.head });
    assert.equal(res.statusCode, 200, 'the dashboard still renders');
    assert.equal(res.body.data.cards.length, 5, 'all five cards are still present');
    const broken = cardFor(res.body.data, 'open_disputes');
    assert.equal(broken.status, 'unknown');
    assert.match(broken.error, /simulated failure/);
    // The other cards are unaffected.
    assert.equal(cardFor(res.body.data, 'budget_health').status, 'green');
  } finally {
    T.CARDS.open_disputes.grade = original;
  }
});

test('a breached budget drives budget_health red; a threshold crossing drives amber', async () => {
  // Utilisation is derived from real approved expenses, never from the budget's own
  // `spent` field — budgetSnapshot() is the single source of truth for budget state, so
  // the fixture has to post actual costs rather than assert a number into the budget.
  const budget = await Budget.create({
    department: 'Finance', departmentId: finDeptId, fiscalYear: '2026', allocated: 1000,
    status: 'active', alertThreshold: 85, scope: 'department',
  });
  await Expense.create({
    title: 'Licences', amount: 900, status: 'approved', departmentId: finDeptId,
    budgetId: budget._id, incurredDate: new Date(), submittedBy: headId,
  });
  let res = await call(ctrl.getControlTower, { user: users.head });
  assert.equal(cardFor(res.body.data, 'budget_health').status, 'amber', JSON.stringify(cardFor(res.body.data, 'budget_health')));

  // Red: an explicitly breached budget.
  await Budget.create({
    department: 'Finance', departmentId: finDeptId, fiscalYear: '2026', allocated: 500,
    status: 'active', scope: 'project', projectId: oid(), breachedAt: new Date(),
  });
  res = await call(ctrl.getControlTower, { user: users.head });
  const card = cardFor(res.body.data, 'budget_health');
  assert.equal(card.status, 'red');
  assert.equal(card.metrics.red, 1);
});

test('a 90+ day invoice drives payment delays and ageing receivables red', async () => {
  await overdueInvoice(120);
  const res = await call(ctrl.getControlTower, { user: users.head });
  assert.equal(cardFor(res.body.data, 'payment_delays').status, 'red');
  assert.equal(cardFor(res.body.data, 'payment_delays').metrics.over90, 1);
  const ageing = cardFor(res.body.data, 'overdue_invoices');
  assert.equal(ageing.status, 'red');
  assert.equal(ageing.metrics.bucket90plus, 1);
});

test('a 70-day overdue invoice is amber on ageing, not red', async () => {
  await overdueInvoice(70);
  const res = await call(ctrl.getControlTower, { user: users.head });
  const ageing = cardFor(res.body.data, 'overdue_invoices');
  assert.equal(ageing.status, 'amber');
  assert.equal(ageing.metrics.bucket61to90, 1);
  assert.equal(ageing.metrics.bucket90plus, 0);
});

test('a critical non-compliance drives its card red; a low one is amber', async () => {
  await NonCompliance.create({
    ticketNumber: 'NC-202610-0001', kind: 'quality_deviation', severity: 'low', status: 'open',
    party: 'vendor', description: 'Minor', departmentId: finDeptId,
  });
  let res = await call(ctrl.getControlTower, { user: users.head });
  assert.equal(cardFor(res.body.data, 'non_compliance').status, 'amber');

  await NonCompliance.create({
    ticketNumber: 'NC-202610-0002', kind: 'scope_deviation', severity: 'critical', status: 'open',
    party: 'vendor', description: 'Severe', departmentId: finDeptId,
  });
  res = await call(ctrl.getControlTower, { user: users.head });
  const card = cardFor(res.body.data, 'non_compliance');
  assert.equal(card.status, 'red');
  assert.equal(card.metrics.critical, 1);
});

test('a dispute older than the configured age drives open_disputes red', async () => {
  const base = {
    subjectType: 'invoice', subjectId: oid(), raisedAgainst: 'client', status: 'open',
    amountDisputed: 100, reason: 'contested', documents: [{ url: 'https://x/y.pdf' }],
    departmentId: finDeptId, raisedBy: headId,
  };
  await Dispute.create({ ...base, disputeNumber: 'DSP-202610-0001' });
  let res = await call(ctrl.getControlTower, { user: users.head });
  assert.equal(cardFor(res.body.data, 'open_disputes').status, 'amber', 'a fresh dispute is amber');

  // 45 days old, past the 30-day default.
  await Dispute.create({ ...base, disputeNumber: 'DSP-202610-0002', subjectId: oid(), createdAt: new Date(Date.now() - 45 * DAY) });
  res = await call(ctrl.getControlTower, { user: users.head });
  const card = cardFor(res.body.data, 'open_disputes');
  assert.equal(card.status, 'red');
  assert.equal(card.metrics.stale, 1);
});

test("each card's drill-down returns exactly the rows the card counted", async () => {
  await overdueInvoice(120);
  await overdueInvoice(70);
  await overdueInvoice(10);
  await Dispute.create({
    disputeNumber: 'DSP-202610-0003', subjectType: 'invoice', subjectId: oid(), raisedAgainst: 'client',
    status: 'open', amountDisputed: 100, reason: 'r', documents: [{ url: 'https://x/y.pdf' }],
    departmentId: finDeptId, raisedBy: headId,
  });
  await NonCompliance.create({
    ticketNumber: 'NC-202610-0003', kind: 'other', severity: 'high', status: 'open',
    party: 'internal', description: 'd', departmentId: finDeptId,
  });

  const overview = await call(ctrl.getControlTower, { user: users.head });
  // This is the invariant that keeps the dashboard honest: the badge and the list must agree.
  for (const card of overview.body.data.cards) {
    const drill = await call(ctrl.getControlTowerCard, { user: users.head, params: { card: card.key }, query: { limit: 100 } });
    assert.equal(drill.statusCode, 200, `${card.key}: ${JSON.stringify(drill.body)}`);
    assert.equal(
      drill.body.data.pagination.total,
      card.metrics.total,
      `${card.key}: card says ${card.metrics.total}, drill-down returns ${drill.body.data.pagination.total}`
    );
  }
});

test('an unknown card is a 404', async () => {
  const res = await call(ctrl.getControlTowerCard, { user: users.head, params: { card: 'vibes' } });
  assert.equal(res.statusCode, 404, JSON.stringify(res.body));
});

test("a department-scoped role sees only its own department's rows", async () => {
  const it = await Department.create({ name: 'IT', code: 'IT' });
  await overdueInvoice(100);                               // finance dept
  await overdueInvoice(100, { departmentId: it._id });     // IT dept

  const headView = await call(ctrl.getControlTower, { user: users.head });
  assert.equal(cardFor(headView.body.data, 'payment_delays').metrics.total, 2, 'the head sees both');

  const itView = await call(ctrl.getControlTower, { user: users.itManager });
  assert.equal(cardFor(itView.body.data, 'payment_delays').metrics.total, 1, 'IT sees only its own');

  // A role whose department does not exist must be denied, not shown everything.
  const denied = await call(ctrl.getControlTower, { user: users.stranger });
  assert.equal(denied.statusCode, 403, JSON.stringify(denied.body));
});

test('the summary pack names what needs attention and lists open justifications', async () => {
  await overdueInvoice(120);
  await Justification.create({
    subjectType: 'expense', subjectId: oid(), question: 'Why?', askedBy: headId,
    outcome: 'pending', departmentId: finDeptId,
    responses: [{ body: 'Because of CR-22.', documents: [{ url: 'https://files/cr22.pdf', label: 'CR-22' }], links: [], respondedBy: headId }],
  });

  const res = await call(ctrl.getSummaryPack, { user: users.head });
  assert.equal(res.statusCode, 200, JSON.stringify(res.body));
  const pack = res.body.data;
  assert.ok(pack.requiresAttention.length >= 1, 'red/amber cards are named');
  assert.match(pack.narrative, /past due|over 90/i);
  assert.equal(pack.openJustifications.length, 1);
  assert.equal(pack.attachmentManifest.length, 1, 'evidence is carried into the export manifest');
  assert.equal(pack.attachmentManifest[0].label, 'CR-22');
});

test('an all-green portal produces a green narrative', async () => {
  const res = await call(ctrl.getSummaryPack, { user: users.head });
  assert.equal(res.body.data.requiresAttention.length, 0);
  assert.match(res.body.data.narrative, /all finance control indicators are green/i);
});
