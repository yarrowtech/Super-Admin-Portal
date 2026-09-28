// End-to-end: the real Express app over real HTTP (login → session → routes → guards →
// controllers → MongoDB), for the Finance head/employee maker-checker flow and the Law
// head/employee document flow. Nothing is mocked except the database, which is in-memory.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'e2e-test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongod;
let server;
let baseUrl;
let mongoose;
let User;
let Project;
const tokens = {};

const PASSWORD = 'E2e!Passw0rd';

// One HTTP call; returns { status, body }.
const api = async (method, path, who, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  let parsed;
  try { parsed = JSON.parse(text); } catch { parsed = text; }
  return { status: res.status, body: parsed };
};

const expectStatus = (r, status, label) => {
  assert.equal(r.status, status, `${label}: expected ${status}, got ${r.status} — ${JSON.stringify(r.body).slice(0, 400)}`);
  return r.body;
};

const USERS = {
  finHead: { email: 'fin.head@e2e.test', role: 'finance_manager', firstName: 'Fiona', lastName: 'Head', department: 'Finance' },
  finEmp: { email: 'fin.emp@e2e.test', role: 'finance_employee', firstName: 'Farhan', lastName: 'Emp', department: 'Finance' },
  finEmp2: { email: 'fin.emp2@e2e.test', role: 'finance_employee', firstName: 'Faith', lastName: 'Other', department: 'Finance' },
  ceo: { email: 'ceo@e2e.test', role: 'ceo', firstName: 'Cora', lastName: 'Ceo', department: 'Management' },
  hr: { email: 'hr@e2e.test', role: 'hr', firstName: 'Hari', lastName: 'Hr', department: 'HR' },
  lawHead: { email: 'law.head@e2e.test', role: 'law_head', firstName: 'Lara', lastName: 'Head', department: 'Law' },
  lawEmp: { email: 'law.emp@e2e.test', role: 'law_employee', firstName: 'Leo', lastName: 'Emp', department: 'Law' },
  lawEmp2: { email: 'law.emp2@e2e.test', role: 'law_employee', firstName: 'Lina', lastName: 'Other', department: 'Law' },
};
const ids = {};

test.before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  // Require only after MONGO_URI is set — app.js connects on load.
  ({ server } = require('../app'));
  mongoose = require('mongoose');
  ({ User } = require('../models/auth'));
  Project = require('../models/common/Project');

  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  // Wait for app.js's own connectDB().
  for (let i = 0; i < 100 && mongoose.connection.readyState !== 1; i += 1) await new Promise((r) => setTimeout(r, 100));
  assert.equal(mongoose.connection.readyState, 1, 'database connected');

  for (const [key, u] of Object.entries(USERS)) {
    const doc = await User.create({ ...u, password: PASSWORD, isActive: true, accountStatus: 'active' });
    ids[key] = String(doc._id);
    const login = await api('POST', '/api/auth/login', null, { email: u.email, password: PASSWORD });
    assert.equal(login.status, 200, `login ${key}: ${JSON.stringify(login.body).slice(0, 300)}`);
    tokens[key] = login.body?.data?.accessToken || login.body?.data?.token || login.body?.accessToken || login.body?.token;
    assert.ok(tokens[key], `token for ${key}: ${JSON.stringify(login.body).slice(0, 300)}`);
  }
  // Raw insert: only the id/name matter to these flows.
  ids.project = String((await Project.collection.insertOne({ name: 'Better Pass', projectCode: 'BP', status: 'in-progress', createdAt: new Date(), updatedAt: new Date() })).insertedId);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongod.stop();
  setTimeout(() => process.exit(0), 200).unref();
});

// ────────────────────────────────────────────────────────────────────────────
// FINANCE
// ────────────────────────────────────────────────────────────────────────────

const F = '/api/dept/finance';
const invoiceBody = { clientName: 'Acme Corp', clientEmail: 'ap@acme.test', dueDate: '2026-12-31', gstRate: 18, items: [{ description: 'Consulting', quantity: 10, rate: 1000, taxRate: 18 }] };

test('finance: read-only roles and the head-only areas are enforced over HTTP', async () => {
  expectStatus(await api('POST', `${F}/invoices`, 'ceo', invoiceBody), 403, 'CEO create invoice');
  expectStatus(await api('POST', `${F}/invoices`, 'hr', invoiceBody), 403, 'HR create invoice');

  expectStatus(await api('POST', `${F}/budgets`, 'finEmp', { departmentId: ids.project, fiscalYear: '2026', allocated: 1000 }), 403, 'employee create budget');
  expectStatus(await api('POST', `${F}/accounts`, 'finEmp', { code: '9999', name: 'X', type: 'asset', normalBalance: 'debit' }), 403, 'employee create account');
  expectStatus(await api('POST', `${F}/accounts`, 'ceo', { code: '9998', name: 'Y', type: 'asset', normalBalance: 'debit' }), 403, 'CEO create account');

  expectStatus(await api('POST', `${F}/invoices`, 'finEmp', { ...invoiceBody, status: 'sent' }), 403, 'employee create already-sent invoice');
  expectStatus(await api('GET', `${F}/review/queue`), 401, 'no token');
});

test('finance: invoice — employee drafts & submits, head returns, employee fixes, head approves, employee collects payment', async () => {
  const created = expectStatus(await api('POST', `${F}/invoices`, 'finEmp', invoiceBody), 201, 'employee drafts invoice').data;
  assert.equal(created.status, 'draft');
  assert.equal(created.total, 11800);
  const invId = created._id;

  expectStatus(await api('PUT', `${F}/invoices/${invId}`, 'finEmp', { status: 'sent' }), 403, 'employee approves own invoice');

  const sub = expectStatus(await api('POST', `${F}/review/invoice/${invId}/submit`, 'finEmp', { note: 'Ready for Acme' }), 200, 'employee submits').data;
  assert.equal(sub.review.status, 'submitted');

  expectStatus(await api('PUT', `${F}/invoices/${invId}`, 'finEmp', { clientName: 'Changed' }), 409, 'employee edits while under review');
  expectStatus(await api('POST', `${F}/review/invoice/${invId}/decision`, 'finEmp', { decision: 'approve' }), 403, 'employee decides');

  const headQueue = expectStatus(await api('GET', `${F}/review/queue?status=submitted`, 'finHead'), 200, 'head queue').data;
  const row = headQueue.rows.find((r) => String(r.id) === String(invId));
  assert.ok(row, 'invoice is in the head queue');
  assert.equal(row.review.submittedByName, 'Farhan Emp');
  assert.equal(row.details.total, 11800, 'queue carries invoice details');

  expectStatus(await api('POST', `${F}/review/invoice/${invId}/decision`, 'finHead', { decision: 'return' }), 400, 'return without reason');
  expectStatus(await api('POST', `${F}/review/invoice/${invId}/decision`, 'finHead', { decision: 'return', note: 'Use 10 hours, not 12' }), 200, 'head returns');

  const empQueue = expectStatus(await api('GET', `${F}/review/queue?status=returned`, 'finEmp'), 200, 'employee sees returned').data;
  assert.equal(empQueue.rows[0].review.decisionNote, 'Use 10 hours, not 12');

  expectStatus(await api('PUT', `${F}/invoices/${invId}`, 'finEmp', { clientName: 'Acme Corporation' }), 200, 'employee edits returned invoice');
  expectStatus(await api('POST', `${F}/review/invoice/${invId}/submit`, 'finEmp', { note: 'Fixed' }), 200, 'employee resubmits');
  const approved = expectStatus(await api('POST', `${F}/review/invoice/${invId}/decision`, 'finHead', { decision: 'approve', note: 'OK' }), 200, 'head approves').data;
  assert.equal(approved.status, 'sent');
  assert.equal(approved.review.status, 'approved');

  // Paid is reached only through a payment, and never above the balance.
  expectStatus(await api('PUT', `${F}/invoices/${invId}`, 'finHead', { status: 'paid' }), 409, 'mark paid without payment');
  expectStatus(await api('POST', `${F}/payments`, 'finEmp', { invoice: invId, customerName: 'Acme Corporation', amount: 20000, method: 'bank' }), 409, 'overpayment');
  expectStatus(await api('POST', `${F}/payments`, 'finEmp', { invoice: invId, customerName: 'Acme Corporation', amount: 11800, method: 'bank', reference: 'UTR-E2E-1' }), 201, 'full payment');
  const inv = (expectStatus(await api('GET', `${F}/invoices`, 'finHead'), 200, 'list invoices').data).find((i) => String(i._id) === String(invId));
  assert.equal(inv.status, 'paid');
  assert.equal(inv.balanceDue, 0);
});

test('finance: payroll — employee submits, head approves (budget charged once), only the head disburses', async () => {
  const Department = require('../models/department/Department');
  const dept = await Department.create({ name: 'Operations E2E', code: 'OPSE2E' }).catch(async () => Department.collection.insertOne({ name: 'Operations E2E', code: 'OPSE2E', isSystem: false }).then((r) => ({ _id: r.insertedId })));
  const deptId = String(dept._id);
  const budget = expectStatus(await api('POST', `${F}/budgets`, 'finHead', { departmentId: deptId, fiscalYear: String(new Date().getFullYear()), allocated: 500000 }), 201, 'head creates budget').data;

  expectStatus(await api('POST', `${F}/payrolls`, 'finEmp', { employeeName: 'Priya', grossPay: 60000, deductions: 5000, departmentId: deptId, status: 'processed' }), 403, 'employee creates processed payroll');
  const run = expectStatus(await api('POST', `${F}/payrolls`, 'finEmp', { employeeName: 'Priya', grossPay: 60000, deductions: 5000, departmentId: deptId, status: 'draft' }), 201, 'employee drafts payroll').data;
  assert.equal(run.netPay, 55000);

  expectStatus(await api('POST', `${F}/review/payroll/${run._id}/submit`, 'finEmp'), 200, 'employee submits payroll');
  const processed = expectStatus(await api('POST', `${F}/review/payroll/${run._id}/decision`, 'finHead', { decision: 'approve' }), 200, 'head approves payroll').data;
  assert.equal(processed.status, 'processed');

  const budgets = expectStatus(await api('GET', `${F}/budgets`, 'finHead'), 200, 'budgets').data;
  assert.equal(budgets.find((b) => String(b._id) === String(budget._id)).spent, 55000, 'budget charged exactly once');

  expectStatus(await api('PUT', `${F}/payrolls/${run._id}`, 'finEmp', { status: 'disbursed' }), 403, 'employee disburses');
  const paid = expectStatus(await api('PUT', `${F}/payrolls/${run._id}`, 'finHead', { status: 'disbursed' }), 200, 'head disburses').data;
  assert.equal(paid.status, 'disbursed');
  assert.ok(paid.paidOn, 'paidOn stamped');
  expectStatus(await api('PUT', `${F}/payrolls/${run._id}`, 'finHead', { status: 'draft' }), 409, 'payroll cannot move backwards');
});

test('finance: journal — unbalanced cannot be submitted; approved entry posts and reaches the trial balance', async () => {
  const cash = expectStatus(await api('POST', `${F}/accounts`, 'finHead', { code: '1000', name: 'Cash', type: 'asset', normalBalance: 'debit' }), 201, 'head creates account').data;
  const revenue = expectStatus(await api('POST', `${F}/accounts`, 'finHead', { code: '4000', name: 'Revenue', type: 'revenue', normalBalance: 'credit' }), 201, 'head creates account').data;

  expectStatus(await api('POST', `${F}/journals`, 'finEmp', { memo: 'bad', lines: [{ account: cash._id, debit: 100 }, { account: revenue._id, credit: 90 }] }), 422, 'unbalanced journal rejected');
  const je = expectStatus(await api('POST', `${F}/journals`, 'finEmp', { memo: 'Consulting income', lines: [{ account: cash._id, debit: 5000 }, { account: revenue._id, credit: 5000 }] }), 201, 'employee drafts journal').data;

  expectStatus(await api('POST', `${F}/journals/${je._id}/post`, 'finEmp'), 403, 'employee posts directly');
  expectStatus(await api('POST', `${F}/review/journal/${je._id}/submit`, 'finEmp'), 200, 'employee submits journal');
  const posted = expectStatus(await api('POST', `${F}/review/journal/${je._id}/decision`, 'finHead', { decision: 'approve' }), 200, 'head approves journal').data;
  assert.equal(posted.status, 'posted');

  const tb = expectStatus(await api('GET', `${F}/reports/trial-balance`, 'finHead'), 200, 'trial balance').data;
  assert.equal(tb.totals.debit, 5000);
  assert.equal(tb.totals.credit, 5000);
});

test('finance: each employee sees only their own submissions; the head sees everyone', async () => {
  const other = expectStatus(await api('POST', `${F}/invoices`, 'finEmp2', { ...invoiceBody, clientName: 'Globex' }), 201, 'second employee drafts').data;
  expectStatus(await api('POST', `${F}/review/invoice/${other._id}/submit`, 'finEmp2'), 200, 'second employee submits');

  const mine = expectStatus(await api('GET', `${F}/review/queue?status=all`, 'finEmp'), 200, 'employee queue').data.rows;
  assert.ok(mine.length > 0);
  assert.ok(mine.every((r) => r.review.submittedByName === 'Farhan Emp'), 'no one else\'s items');

  const all = expectStatus(await api('GET', `${F}/review/queue?status=all`, 'finHead'), 200, 'head queue').data.rows;
  const names = new Set(all.map((r) => r.review.submittedByName));
  assert.ok(names.has('Farhan Emp') && names.has('Faith Other'), 'head sees the whole team');
});

// ────────────────────────────────────────────────────────────────────────────
// LAW
// ────────────────────────────────────────────────────────────────────────────

const L = '/api/dept/law';

test('law: head assigns a project document, employee edits + pins points + submits, head monitors and approves', async () => {
  // Head creates a project legal document.
  const doc = expectStatus(await api('POST', '/api/legal/create', 'lawHead', { title: 'E2E Master Services Agreement', type: 'Agreement', scope: 'project', projectId: ids.project, projectName: 'Better Pass', content: '<p>Liability shall not exceed the fees paid.</p>' }), 201, 'head creates project document').data;

  // Employee has no direct access to the documents module.
  expectStatus(await api('GET', `/api/legal/${doc._id}`, 'lawEmp'), 403, 'employee opens document module directly');

  // Picker: project-scoped, documents only.
  expectStatus(await api('GET', `${L}/task-items/options`, 'lawHead'), 400, 'picker without project');
  const options = expectStatus(await api('GET', `${L}/task-items/options?projectId=${ids.project}`, 'lawHead'), 200, 'picker').data;
  assert.ok(options.some((o) => String(o.recordId) === String(doc._id)));
  expectStatus(await api('GET', `${L}/task-items/options?projectId=${ids.project}`, 'lawEmp'), 403, 'employee uses picker');

  // Linking rules.
  expectStatus(await api('POST', `${L}/tasks`, 'lawHead', { title: 'x', description: 'x', dueDate: '2026-12-31', assignedTo: ids.lawEmp, linkedItems: [{ module: 'document', recordId: doc._id }] }), 400, 'link without project');

  const task = expectStatus(await api('POST', `${L}/tasks`, 'lawHead', {
    title: 'Work on MSA', description: 'Tighten liability', dueDate: '2026-12-31', priority: 'high',
    assignedTo: ids.lawEmp, project: ids.project, linkedItems: [{ module: 'document', recordId: doc._id, canEdit: true }],
  }), 201, 'head assigns document').data;
  assert.equal(String(task.project?._id || task.project), ids.project);
  assert.equal(task.linkedItems[0].canEdit, true);
  const taskId = task._id;
  const itemPath = `${L}/task-items/${taskId}/${doc._id}`;

  // Employee side.
  const mine = expectStatus(await api('GET', `${L}/task-items/mine`, 'lawEmp'), 200, 'employee my documents').data;
  assert.equal(mine.length, 1);
  assert.equal(mine[0].projectName, 'Better Pass');
  assert.equal(mine[0].canEdit, true);

  const detail = expectStatus(await api('GET', itemPath, 'lawEmp'), 200, 'employee opens document').data;
  assert.equal(detail.canEdit, true);
  assert.match(detail.content, /Liability/);

  expectStatus(await api('GET', itemPath, 'lawEmp2'), 404, 'another employee opens it');

  const saved = expectStatus(await api('PUT', `${itemPath}/content`, 'lawEmp', { content: '<p>Liability shall not exceed 2x the fees paid.</p>', changeSummary: 'Raised cap to 2x' }), 200, 'employee saves version').data;
  assert.equal(saved.version, 'v1.1');

  const point = expectStatus(await api('POST', `${itemPath}/annotations`, 'lawEmp', { kind: 'highlight', critical: true, text: 'Cap was 1x — raised to 2x', quote: 'Liability shall not exceed' }), 201, 'employee pins critical point').data;
  assert.equal(point.critical, true);

  // Employee cannot close their own task; they submit for review instead.
  expectStatus(await api('PUT', `${L}/tasks/${taskId}`, 'lawEmp', { status: 'completed' }), 403, 'employee completes own task');
  expectStatus(await api('PUT', `${L}/tasks/${taskId}`, 'lawEmp', { status: 'review' }), 200, 'employee submits for review');

  // Head monitors.
  const monitor = expectStatus(await api('GET', `${L}/task-items/monitor`, 'lawHead'), 200, 'head monitor').data;
  const row = monitor.rows.find((r) => String(r.taskId) === String(taskId));
  assert.equal(row.taskStatus, 'review');
  assert.equal(row.criticalCount, 1);
  assert.equal(row.assigneeLastEdit.summary, 'Raised cap to 2x');
  assert.ok(monitor.activity.some((a) => a.type === 'edit'));
  expectStatus(await api('GET', `${L}/task-items/monitor`, 'lawEmp'), 403, 'employee opens monitor');

  // Head sees the employee's point on the document, and approves.
  const headDoc = expectStatus(await api('GET', `/api/legal/${doc._id}`, 'lawHead'), 200, 'head opens document').data;
  assert.equal(headDoc.annotations.length, 1);
  assert.match(headDoc.latestContent, /2x/);
  expectStatus(await api('PUT', `${L}/tasks/${taskId}`, 'lawHead', { status: 'completed' }), 200, 'head approves (completes)');

  // Closed task: no more edits by the employee.
  expectStatus(await api('PUT', `${itemPath}/content`, 'lawEmp', { content: '<p>late</p>' }), 403, 'edit after completion');
});

test('law: read-only share never exposes the text and blocks edits', async () => {
  const doc = expectStatus(await api('POST', '/api/legal/create', 'lawHead', { title: 'E2E NDA', type: 'NDA', scope: 'project', projectId: ids.project, content: '<p>Secret terms</p>' }), 201, 'head creates NDA').data;
  const task = expectStatus(await api('POST', `${L}/tasks`, 'lawHead', {
    title: 'Read NDA', description: 'Review only', dueDate: '2026-12-31', assignedTo: ids.lawEmp, project: ids.project,
    linkedItems: [{ module: 'document', recordId: doc._id, canEdit: false }],
  }), 201, 'head shares read-only').data;
  const itemPath = `${L}/task-items/${task._id}/${doc._id}`;
  const detail = expectStatus(await api('GET', itemPath, 'lawEmp'), 200, 'employee opens read-only').data;
  assert.equal(detail.canEdit, false);
  assert.equal(detail.content, undefined, 'body not sent to read-only viewer');
  expectStatus(await api('PUT', `${itemPath}/content`, 'lawEmp', { content: 'x' }), 403, 'read-only edit');
  expectStatus(await api('POST', `${itemPath}/annotations`, 'lawEmp', { text: 'x' }), 403, 'read-only note');
});
