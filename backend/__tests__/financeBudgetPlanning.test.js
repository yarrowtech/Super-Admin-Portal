// End-to-end over the real Express app for budget planning and cost control: the
// fixed/variable split, phasing, plan-to-date pacing, forecasting, the baseline and its
// revisions, and the hard/soft overspend gate. Only the database is in-memory.
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'planning-test-secret';

const test = require('node:test');
const assert = require('node:assert/strict');
const { MongoMemoryReplSet } = require('mongodb-memory-server');

let mongod;
let server;
let baseUrl;
let mongoose;
let Department;
let Project;
const tokens = {};
const ids = {};
const PASSWORD = 'Plan!Passw0rd';
const F = '/api/dept/finance';
const FY = String(new Date().getUTCFullYear());

const api = async (method, path, who, body) => {
  const res = await fetch(`${baseUrl}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(who ? { Authorization: `Bearer ${tokens[who]}` } : {}) },
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
  finHead: { email: 'plan.head@plan.test', role: 'finance_manager', firstName: 'Pia', lastName: 'Head', department: 'Finance' },
  finEmp: { email: 'plan.emp@plan.test', role: 'finance_employee', firstName: 'Pavel', lastName: 'Emp', department: 'Finance' },
};

test.before(async () => {
  mongod = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  process.env.MONGO_URI = mongod.getUri();
  // app.js exports a server that already has Socket.IO attached; wrapping `app` in a fresh
  // http.createServer would bypass it and never serve a request.
  ({ server } = require('../app'));
  mongoose = require('mongoose');
  const { User } = require('../models/auth');
  Department = require('../models/department/Department');
  Project = require('../models/common/Project');

  await new Promise((resolve) => server.listen(0, resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
  for (let i = 0; i < 100 && mongoose.connection.readyState !== 1; i += 1) await new Promise((r) => setTimeout(r, 100));
  assert.equal(mongoose.connection.readyState, 1, 'database connected');

  for (const [key, u] of Object.entries(USERS)) {
    const doc = await User.create({ ...u, password: PASSWORD, isActive: true, accountStatus: 'active' });
    ids[key] = String(doc._id);
    const login = await api('POST', '/api/auth/login', null, { email: u.email, password: PASSWORD });
    tokens[key] = login.body?.data?.accessToken || login.body?.data?.token;
    assert.ok(tokens[key], `token for ${key}`);
  }
  const dept = await Department.create({ name: 'Plan Dept', code: 'PLAND', isActive: true });
  ids.dept = String(dept._id);
  const dept2 = await Department.create({ name: 'Plan Dept Two', code: 'PLAND2', isActive: true });
  ids.dept2 = String(dept2._id);
  const proj = await Project.collection.insertOne({ name: 'Plan Project', projectCode: 'PLANP', status: 'in-progress', createdAt: new Date(), updatedAt: new Date() });
  ids.project = String(proj.insertedId);
});

test.after(async () => {
  await new Promise((resolve) => server.close(resolve));
  await mongoose.disconnect();
  await mongod.stop();
  setTimeout(() => process.exit(0), 200).unref();
});

test('fixed/variable split must reconcile to the total, and an even phasing profile adds back exactly', async () => {
  // A split that does not add up is the one error that would corrupt every later variance.
  expectStatus(await api('POST', `${F}/budgets`, 'finHead', {
    departmentId: ids.dept, fiscalYear: FY, allocated: 120000, allocatedFixed: 60000, allocatedVariable: 50000,
  }), 422, 'mismatched split refused');

  const b = expectStatus(await api('POST', `${F}/budgets`, 'finHead', {
    departmentId: ids.dept, fiscalYear: FY, allocated: 120000, allocatedFixed: 72000, allocatedVariable: 48000,
    phasingMethod: 'even', control: 'hard',
  }), 201, 'budget created').data;
  ids.budget = String(b._id);

  assert.equal(b.allocatedFixed, 72000);
  assert.equal(b.allocatedVariable, 48000);
  assert.equal(b.phasing.length, 12, 'even phasing produced twelve periods');
  // Rounding must not lose or invent money: the profile has to add back to the allocation.
  const pf = b.phasing.reduce((n, r) => n + r.fixed, 0);
  const pv = b.phasing.reduce((n, r) => n + r.variable, 0);
  assert.equal(Math.round(pf * 100) / 100, 72000, 'phased fixed adds back to the fixed allocation');
  assert.equal(Math.round(pv * 100) / 100, 48000, 'phased variable adds back to the variable allocation');
});

test('a manual phasing profile is refused unless it reconciles to the allocation', async () => {
  const short = Array.from({ length: 12 }, (_, i) => ({ period: i + 1, fixed: 1000, variable: 4000 }));
  expectStatus(await api('PUT', `${F}/budgets/${ids.budget}/phasing`, 'finHead', { phasing: short }), 422, 'under-stated profile refused');

  // Duplicated periods would double-count a month in every plan-to-date figure.
  const dup = Array.from({ length: 12 }, (_, i) => ({ period: i === 11 ? 1 : i + 1, fixed: 6000, variable: 4000 }));
  expectStatus(await api('PUT', `${F}/budgets/${ids.budget}/phasing`, 'finHead', { phasing: dup }), 422, 'duplicate period refused');

  // Front-loaded but reconciling: 72000 fixed and 48000 variable across twelve periods.
  const good = Array.from({ length: 12 }, (_, i) => ({ period: i + 1, fixed: i === 0 ? 17000 : 5000, variable: i === 0 ? 4000 : 4000 }));
  const sumF = good.reduce((n, r) => n + r.fixed, 0);
  assert.equal(sumF, 72000, 'test fixture reconciles');
  const out = expectStatus(await api('PUT', `${F}/budgets/${ids.budget}/phasing`, 'finHead', { phasing: good }), 200, 'valid profile accepted').data;
  assert.equal(out.phasingMethod, 'manual');
  assert.equal(out.toDate.phased, true, 'plan to date now comes from the profile');
});

test('plan-to-date, pace and forecast are reported against the phased plan', async () => {
  const [b] = expectStatus(await api('GET', `${F}/budgets?scope=department`, 'finHead'), 200, 'list').data
    .filter((x) => String(x._id) === ids.budget);
  assert.ok(b.toDate, 'snapshot carries a plan-to-date block');
  assert.ok(b.forecast, 'snapshot carries a forecast block');
  assert.ok(b.control, 'snapshot carries the control policy');

  // Nothing committed yet: the plan to date is whatever the profile says has been reached,
  // and the timing variance is the full amount still unspent.
  assert.equal(b.toDate.committed, 0);
  assert.equal(b.toDate.variance, b.toDate.planned, 'with no spend the variance is the whole plan to date');
  assert.equal(b.control.mode, 'hard');
  assert.equal(b.control.breached, false);
  assert.equal(b.baselineView, null, 'no baseline until one is approved');
});

test('baseline locks the plan, adjustments become numbered revisions, and drift is reported', async () => {
  expectStatus(await api('POST', `${F}/budgets/${ids.budget}/baseline`, 'finEmp', {}), 403, 'employee cannot baseline');
  const based = expectStatus(await api('POST', `${F}/budgets/${ids.budget}/baseline`, 'finHead', {}), 200, 'head approves baseline').data;
  assert.equal(based.baselineView.allocated, 120000);
  assert.equal(based.baselineView.drift, 0);
  assert.equal(based.revision, 0);

  // A second baseline without an explicit re-baseline is refused, so the approved plan
  // cannot be quietly moved to match whatever has been spent.
  expectStatus(await api('POST', `${F}/budgets/${ids.budget}/baseline`, 'finHead', {}), 409, 'implicit re-baseline refused');
  expectStatus(await api('POST', `${F}/budgets/${ids.budget}/baseline`, 'finHead', { rebaseline: true }), 422, 're-baseline needs a reason');

  // Raising the allocation drifts from the baseline and counts as a revision.
  const adj = expectStatus(await api('POST', `${F}/budgets/${ids.budget}/adjust`, 'finHead', {
    delta: '30000', reason: 'Approved top-up', costType: 'variable',
  }), 200, 'head adjusts').data;
  assert.equal(adj.allocated, 150000);
  assert.equal(adj.allocatedVariable, 78000, 'the named side absorbed the adjustment');
  assert.equal(adj.allocatedFixed + adj.allocatedVariable, adj.allocated, 'split still reconciles after an adjustment');
  assert.equal(adj.revision, 1, 'adjustment after a baseline is revision 1');
  assert.equal(adj.baselineView.allocated, 120000, 'baseline is unchanged by the adjustment');
  assert.equal(adj.baselineView.drift, 30000, 'drift from the approved plan is reported');
});

test('hard control refuses spend past the limit; tolerance and soft control change the gate', async () => {
  // A small budget makes the boundary easy to hit exactly.
  const b = expectStatus(await api('POST', `${F}/budgets`, 'finHead', {
    departmentId: ids.dept2, fiscalYear: FY, allocated: 10000, allocatedFixed: 0, allocatedVariable: 10000,
  }), 201, 'control budget').data;
  const budgetId = String(b._id);
  const claim = (amount) => api('POST', `${F}/expenses`, 'finHead', {
    title: `Claim ${amount}`, departmentId: ids.dept2, amount, costType: 'variable', budgetId,
    documents: [{ label: 'Bill', url: 'https://example.test/bill.pdf' }],
  });

  // Spending exactly to the limit is allowed; a rupee beyond it is not.
  expectStatus(await claim(10000), 201, 'spend up to the limit');
  expectStatus(await claim(1), 409, 'hard control blocks the overrun');

  // Tolerance opens a controlled amount of headroom above the allocation.
  expectStatus(await api('PUT', `${F}/budgets/${budgetId}`, 'finHead', { tolerancePct: 5 }), 200, 'set tolerance');
  expectStatus(await claim(400), 201, 'within the 5% tolerance');
  expectStatus(await claim(200), 409, 'past the tolerance is still blocked');

  // Soft control lets the work proceed and records the breach instead of refusing it.
  expectStatus(await api('PUT', `${F}/budgets/${budgetId}`, 'finHead', { control: 'soft' }), 200, 'switch to soft control');
  const after = expectStatus(await claim(200), 201, 'soft control allows the overrun').data;
  assert.ok(after, 'expense created under soft control');
  const [snap] = expectStatus(await api('GET', `${F}/budgets?scope=department`, 'finHead'), 200, 'list').data
    .filter((x) => String(x._id) === budgetId);
  assert.equal(snap.control.mode, 'soft');
  assert.equal(snap.control.breached, true, 'the breach is reported rather than hidden');
  assert.ok(snap.breachedAt, 'the breach is stamped on the budget');
});

test('a project budget is charged for project costs, and the variance roll-up groups by dimension', async () => {
  const pb = expectStatus(await api('POST', `${F}/budgets`, 'finHead', {
    scope: 'project', projectId: ids.project, departmentId: ids.dept, fiscalYear: FY,
    allocated: 50000, allocatedFixed: 20000, allocatedVariable: 30000, phasingMethod: 'even',
  }), 201, 'project budget').data;
  assert.equal(pb.scope, 'project');

  // A project budget needs a project, and a duplicate for the same project/year is refused.
  expectStatus(await api('POST', `${F}/budgets`, 'finHead', { scope: 'project', departmentId: ids.dept, fiscalYear: FY, allocated: 1000 }), 422, 'project required');
  expectStatus(await api('POST', `${F}/budgets`, 'finHead', {
    scope: 'project', projectId: ids.project, departmentId: ids.dept, fiscalYear: FY, allocated: 1000,
  }), 409, 'duplicate project budget refused');

  // With a project on the cost, the project's own budget is charged, not the department's.
  expectStatus(await api('POST', `${F}/expenses`, 'finHead', {
    title: 'Project materials', departmentId: ids.dept, projectId: ids.project, amount: 12000, costType: 'variable',
    documents: [{ label: 'Bill', url: 'https://example.test/p.pdf' }],
  }), 201, 'project expense');
  const [charged] = expectStatus(await api('GET', `${F}/budgets?scope=project`, 'finHead'), 200, 'project budgets').data
    .filter((x) => String(x._id) === String(pb._id));
  assert.equal(charged.reserved, 12000, 'the project budget carries the reservation');

  // Department-scoped listing must not include project budgets, or totals double-count.
  const deptList = expectStatus(await api('GET', `${F}/budgets?scope=department`, 'finHead'), 200, 'dept budgets').data;
  assert.equal(deptList.some((x) => String(x._id) === String(pb._id)), false, 'project budgets stay out of the department view');

  const byProject = expectStatus(await api('GET', `${F}/budgets/variance?groupBy=project`, 'finHead'), 200, 'variance by project').data;
  assert.equal(byProject.groupBy, 'project');
  assert.ok(byProject.rows.length >= 1);
  const row = byProject.rows.find((r) => r.label === 'Plan Project');
  assert.ok(row, 'the project appears in the roll-up');
  assert.equal(row.allocated, 50000);
  assert.equal(row.variable.committed, 12000);
  assert.ok('pace' in row && 'forecastVariance' in row, 'roll-up carries pacing and forecast');

  const byDept = expectStatus(await api('GET', `${F}/budgets/variance?groupBy=department`, 'finHead'), 200, 'variance by department').data;
  assert.equal(byDept.groupBy, 'department');
  assert.equal(byDept.rows.some((r) => r.label === 'Plan Project'), false, 'project rows do not leak into the department roll-up');
});

test('read-only and employee roles cannot change the plan', async () => {
  expectStatus(await api('PUT', `${F}/budgets/${ids.budget}/phasing`, 'finEmp', { method: 'even' }), 403, 'employee cannot phase');
  expectStatus(await api('POST', `${F}/budgets/${ids.budget}/adjust`, 'finEmp', { delta: '100', reason: 'nope' }), 403, 'employee cannot adjust');
  // The planning views stay readable, so an employee can still see what they are spending against.
  expectStatus(await api('GET', `${F}/budgets/variance?groupBy=department`, 'finEmp'), 200, 'employee reads variance');
});
