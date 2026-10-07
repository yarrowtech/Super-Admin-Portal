const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

const job = require('../jobs/overdueInvoiceEscalation.job');
const Invoice = require('../models/finance/Invoice');
const Project = require('../models/common/Project');
const Dispute = require('../models/finance/Dispute');
const Notification = require('../models/manager/ManagerNotification');
const User = require('../models/auth/User');
const Department = require('../models/department/Department');

// The escalation job runs unattended every night, so the behaviours that matter are the
// ones nobody is watching: it must not chase the same invoice forever, must not chase a
// disputed one, and must reach the project's manager and not only finance.

let mongod;
const oid = () => new mongoose.Types.ObjectId();
const DAY = 86400000;
let headId;
let deptId;

const makeInvoice = (over = {}) => Invoice.create({
  invoiceNumber: `INV-${Math.random().toString(36).slice(2, 9)}`,
  clientName: 'Acme', status: 'sent', invoiceType: 'customer',
  issueDate: new Date(Date.now() - 60 * DAY),
  dueDate: new Date(Date.now() - 30 * DAY),
  items: [{ description: 'Service', quantity: 1, rate: 1000, amount: 1000 }],
  subtotal: 1000, total: 1000, balanceDue: 1000,
  departmentId: deptId, createdBy: headId, ...over,
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
  // A real finance head, since the notifier resolves recipients by role.
  const head = await User.create({
    firstName: 'Fin', lastName: 'Head', email: `head-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Passw0rd!x', role: 'finance_manager', isActive: true, accountStatus: 'active',
  });
  headId = head._id;
});

test('an overdue invoice is escalated once and watermarked', async () => {
  const invoice = await makeInvoice();

  const first = await job.runOverdueEscalation();
  assert.equal(first.escalated, 1);
  assert.ok(first.notified >= 1, 'the finance head was notified');
  assert.ok((await Invoice.findById(invoice._id)).escalatedAt, 'the invoice is watermarked');

  // The point of the watermark: the next nightly run must not chase it again.
  const second = await job.runOverdueEscalation();
  assert.equal(second.escalated, 0, 'a nightly re-run does not re-escalate');
});

test('an invoice still unpaid after the re-escalation window is chased again', async () => {
  const invoice = await makeInvoice();
  await job.runOverdueEscalation();
  // Backdate the watermark past the re-escalation window.
  await Invoice.findByIdAndUpdate(invoice._id, { escalatedAt: new Date(Date.now() - 20 * DAY) });

  const again = await job.runOverdueEscalation();
  assert.equal(again.escalated, 1, 'a long-unpaid invoice is chased periodically');
});

test('invoices inside the threshold, paid, draft, void or zero-balance are left alone', async () => {
  await makeInvoice({ dueDate: new Date(Date.now() - 2 * DAY) });   // only 2 days late
  await makeInvoice({ status: 'paid', balanceDue: 0 });
  await makeInvoice({ status: 'draft' });
  await makeInvoice({ status: 'void' });
  await makeInvoice({ balanceDue: 0 });
  await makeInvoice({ invoiceType: 'vendor' });                      // not a receivable

  const result = await job.runOverdueEscalation();
  assert.equal(result.escalated, 0, 'nothing in this set should be escalated');
  assert.equal(await Notification.countDocuments(), 0);
});

test('a disputed invoice is not chased for payment', async () => {
  const invoice = await makeInvoice();
  const dispute = await Dispute.create({
    disputeNumber: 'DSP-202610-7001', subjectType: 'invoice', subjectId: invoice._id,
    raisedAgainst: 'client', status: 'open', amountDisputed: 1000, reason: 'Contested scope',
    documents: [{ url: 'https://files.example/x.pdf' }], departmentId: deptId, raisedBy: headId,
  });
  await Invoice.findByIdAndUpdate(invoice._id, { disputeId: dispute._id });

  const result = await job.runOverdueEscalation();
  assert.equal(result.escalated, 0, 'collection is wrong while the amount is contested');
  assert.equal((await Invoice.findById(invoice._id)).escalatedAt, null);
});

test("the project's manager is notified alongside the finance head", async () => {
  const manager = await User.create({
    firstName: 'Project', lastName: 'Manager', email: `pm-${Math.random().toString(36).slice(2)}@example.com`,
    password: 'Passw0rd!x', role: 'it_manager', isActive: true, accountStatus: 'active',
  });
  const project = await Project.create({
    name: 'Escalation Fixture', projectCode: 'ESCF', description: 'Fixture',
    startDate: new Date(), projectManager: manager._id,
  });
  await makeInvoice({ projectId: project._id });

  await job.runOverdueEscalation();
  const recipients = (await Notification.find({}).lean()).map((n) => String(n.manager));
  assert.ok(recipients.includes(String(manager._id)), 'the project manager is told');
  assert.ok(recipients.includes(String(headId)), 'the finance head is told');
});

test('a recipient who is both finance head and project manager is notified once', async () => {
  const project = await Project.create({
    name: 'Dual Role Fixture', projectCode: 'DUAL', description: 'Fixture',
    startDate: new Date(), projectManager: headId,
  });
  await makeInvoice({ projectId: project._id });

  await job.runOverdueEscalation();
  const forHead = await Notification.countDocuments({ manager: headId });
  assert.equal(forHead, 1, 'no duplicate notification for one person in two roles');
});

test('the notification carries the days overdue and a link to the invoice', async () => {
  const invoice = await makeInvoice({ dueDate: new Date(Date.now() - 45 * DAY) });
  await job.runOverdueEscalation();

  const notification = await Notification.findOne({ type: 'finance_overdue_invoice' }).lean();
  assert.ok(notification, 'an escalation notification was written');
  assert.match(notification.message, /45 days overdue/);
  assert.equal(notification.metadata.daysOverdue, 45);
  assert.equal(notification.metadata.path, `/finance/dashboard/invoices/${invoice._id}`);
});

test('the threshold is configurable per run', async () => {
  await makeInvoice({ dueDate: new Date(Date.now() - 3 * DAY) });
  assert.equal((await job.runOverdueEscalation({ thresholdDays: 7 })).escalated, 0);
  assert.equal((await job.runOverdueEscalation({ thresholdDays: 1 })).escalated, 1);
});

test('the scheduler refuses to start under the test runner', async () => {
  // The guard that stops a test run from notifying real users. It cannot rely on
  // NODE_ENV — this project's .env sets it to `development`, so the job detects the test
  // runner itself.
  assert.notEqual(process.env.NODE_ENV, 'test', 'NODE_ENV is not the signal here');
  assert.equal(job.startOverdueEscalationJob(), null, 'no scheduler is created under test');
});

test('an invalid cron expression is refused rather than crashing startup', async () => {
  const original = process.env.FINANCE_OVERDUE_ESCALATION_CRON;
  process.env.FINANCE_OVERDUE_ESCALATION_CRON = 'not a cron expression';
  try {
    // Reloaded so the module re-reads the env at require time.
    const path = require.resolve('../jobs/overdueInvoiceEscalation.job');
    delete require.cache[path];
    // eslint-disable-next-line global-require
    const reloaded = require('../jobs/overdueInvoiceEscalation.job');
    assert.equal(typeof reloaded.runOverdueEscalation, 'function', 'the module still loads');
  } finally {
    if (original === undefined) delete process.env.FINANCE_OVERDUE_ESCALATION_CRON;
    else process.env.FINANCE_OVERDUE_ESCALATION_CRON = original;
    delete require.cache[require.resolve('../jobs/overdueInvoiceEscalation.job')];
  }
});
