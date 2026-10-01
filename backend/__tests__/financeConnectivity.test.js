process.env.NODE_ENV = 'test';
// The manager <-> employee loop: an employee's submission must reach the finance head,
// and the head's decision must reach the employee who raised it.
const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const ctrl = require('../controllers/finance/financeDashboard.controller');
const W = require('../services/finance/workflows.service');
const Notification = require('../models/manager/ManagerNotification');
const User = require('../models/auth/User');
const Department = require('../models/department/Department');
const Invoice = require('../models/finance/Invoice');

let db;
const oid = () => new mongoose.Types.ObjectId();
const req = (user, body = {}, params = {}, query = {}) => ({ user, body, params, query });
const call = async (fn, user, body = {}, params = {}, query = {}) => {
  const res = { statusCode: 200, status(c) { this.statusCode = c; return this; }, json(v) { this.body = v; return this; } };
  await fn(req(user, body, params, query), res);
  return res;
};
let head; let employee;

test.before(async () => {
  db = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(db.getUri());
  await Promise.all(mongoose.modelNames().map((n) => mongoose.model(n).init().catch(() => {})));
  const headDoc = await User.create({ firstName: 'Fiona', lastName: 'Head', email: 'head@conn.test', password: 'Passw0rd!x', role: 'finance_manager', isActive: true });
  const empDoc = await User.create({ firstName: 'Farhan', lastName: 'Emp', email: 'emp@conn.test', password: 'Passw0rd!x', role: 'finance_employee', isActive: true });
  head = { id: headDoc._id, _id: headDoc._id, role: 'finance_manager', firstName: 'Fiona', lastName: 'Head' };
  employee = { id: empDoc._id, _id: empDoc._id, role: 'finance_employee', firstName: 'Farhan', lastName: 'Emp' };
  const r = await call(ctrl.createTaxRule, head, { kind: 'gst', code: 'GST18', name: 'GST 18%', rate: 18, effectiveFrom: '2020-01-01' });
  assert.equal(r.statusCode, 201, JSON.stringify(r.body));
});
test.after(async () => { await mongoose.disconnect(); await db.stop(); });
test.beforeEach(async () => { await Notification.deleteMany({}); });

const inboxOf = (user) => Notification.find({ manager: user.id }).sort({ createdAt: -1 }).lean();

test('submitting an invoice notifies the head; the decision notifies the employee', async () => {
  const created = await call(ctrl.createInvoice, employee, {
    clientName: 'Acme Corp', dueDate: '2099-12-31',
    items: [{ description: 'Consulting', quantity: 10, rate: 1000, taxRate: 18 }],
  });
  assert.equal(created.statusCode, 201, JSON.stringify(created.body));
  const invoiceId = String(created.body.data._id);

  // Employee submits -> the head is told, and the employee is not notified of their own action.
  const submitted = await call(ctrl.submitForReview, employee, { note: 'Ready for Acme' }, { module: 'invoice', id: invoiceId });
  assert.equal(submitted.statusCode, 200, JSON.stringify(submitted.body));
  const headInbox = await inboxOf(head);
  assert.equal(headInbox.length, 1, 'the head is notified once');
  assert.equal(headInbox[0].type, 'finance_review_submitted');
  assert.match(headInbox[0].message, /Farhan Emp/);
  assert.match(headInbox[0].message, /Ready for Acme/);
  assert.equal(headInbox[0].metadata.recordId, invoiceId);
  assert.equal((await inboxOf(employee)).length, 0, 'the submitter is not notified of their own submission');

  // Head returns it -> the employee is told, with the reason.
  const returned = await call(ctrl.decideReview, head, { decision: 'return', note: 'Use 10 hours, not 12' }, { module: 'invoice', id: invoiceId });
  assert.equal(returned.statusCode, 200, JSON.stringify(returned.body));
  const empInbox = await inboxOf(employee);
  assert.equal(empInbox.length, 1, 'the submitter hears the outcome');
  assert.equal(empInbox[0].type, 'finance_review_returned');
  assert.match(empInbox[0].message, /Use 10 hours, not 12/);

  // Resubmit and approve -> the employee hears the approval.
  await call(ctrl.submitForReview, employee, {}, { module: 'invoice', id: invoiceId });
  await Notification.deleteMany({ manager: employee.id });
  const approved = await call(ctrl.decideReview, head, { decision: 'approve' }, { module: 'invoice', id: invoiceId });
  assert.equal(approved.statusCode, 200, JSON.stringify(approved.body));
  const after = await inboxOf(employee);
  assert.equal(after[0].type, 'finance_review_approved');
  assert.equal((await Invoice.findById(invoiceId).lean()).status, 'sent', 'approval actually issues the invoice');
});

test('an expense decision reaches the employee who raised it', async () => {
  const dept = await Department.create({ name: 'Ops Connectivity', code: 'OPSCONN' });
  const budget = await call(ctrl.createBudget, head, { departmentId: String(dept._id), fiscalYear: '2026', allocated: 100000 });
  assert.equal(budget.statusCode, 201, JSON.stringify(budget.body));

  const claim = await W.createExpense(req(employee, {
    title: 'Team offsite', category: 'Travel', amount: 4000, departmentId: String(dept._id), incurredDate: '2026-03-01',
    documents: [{ label: 'Receipt', url: 'https://files.example/offsite.pdf' }],
  }));
  await W.expenseAction(req(employee, {}, { id: String(claim._id), action: 'verify' }));
  await Notification.deleteMany({});

  await W.expenseAction(req(head, { comment: 'Approved, within policy' }, { id: String(claim._id), action: 'approve' }));
  const inbox = await inboxOf(employee);
  assert.equal(inbox.length, 1, 'the claimant is told their expense was approved');
  assert.equal(inbox[0].type, 'finance_expense_approve');
  assert.match(inbox[0].message, /Team offsite/);
  assert.match(inbox[0].message, /within policy/);
});

test('the review queue shows an employee only their own items, and the head everyone\'s', async () => {
  const other = await User.create({ firstName: 'Faith', lastName: 'Other', email: 'other@conn.test', password: 'Passw0rd!x', role: 'finance_employee', isActive: true });
  const otherEmp = { id: other._id, _id: other._id, role: 'finance_employee', firstName: 'Faith', lastName: 'Other' };
  for (const [who, client] of [[employee, 'Mine Ltd'], [otherEmp, 'Theirs Ltd']]) {
    const res = await call(ctrl.createInvoice, who, { clientName: client, dueDate: '2099-12-31', items: [{ description: 'Work', quantity: 1, rate: 500, taxRate: 18 }] });
    await call(ctrl.submitForReview, who, {}, { module: 'invoice', id: String(res.body.data._id) });
  }
  const mine = await call(ctrl.getReviewQueue, employee, {}, {}, { status: 'all' });
  assert.equal(mine.body.data.isHead, false);
  assert.ok(mine.body.data.rows.every((r) => r.review.submittedByName === 'Farhan Emp'), 'no one else\'s submissions');

  const all = await call(ctrl.getReviewQueue, head, {}, {}, { status: 'all' });
  assert.equal(all.body.data.isHead, true);
  const names = new Set(all.body.data.rows.map((r) => r.review.submittedByName));
  assert.ok(names.has('Farhan Emp') && names.has('Faith Other'), 'the head sees the whole team');
});
