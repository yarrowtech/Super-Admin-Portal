process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../models/auth/User');
const Leave = require('../models/hr/Leave');
const Policy = require('../models/hr/LeavePolicy');
const Balance = require('../models/hr/LeaveBalance');
const LeaveLog = require('../models/hr/LeaveApprovalLog');
const Attendance = require('../models/hr/Attendance');
const Task = require('../models/common/Task');
const Report = require('../models/hr/StaffWorkReport');
const Holiday = require('../models/hr/Holiday');
const Chat = require('../models/common/Chat');
const PortalAccess = require('../models/superAdmin/PortalAccess');
const { submitLeave, reviewLeave } = require('../services/leaveWorkflow.service');
const { calculateLeaveDays, recomputeLeaveBalance } = require('../services/leaveManagement.service');
const { saveAttendance } = require('../services/hrAttendance.service');
const performance = require('../services/performance/performanceSystem.service');
const { employeeScope } = require('../services/employeeScope.service');
const { assertUserAdministration } = require('../services/userAdministrationPolicy');
const { canAccessRoom } = require('../services/socketAccess.service');
const { escapeCsv } = require('../utils/csv');
const { hrInput } = require('../middlewares/hrInput.middleware');
let repl, employee, hr;
before(async () => {
  // Only this generated URI is used. Never load .env or a configured database.
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1, storageEngine: 'wiredTiger' } });
  await mongoose.connect(repl.getUri(), { dbName: 'hrms_audit_test' });
  await Promise.all([User, Leave, Policy, Balance, LeaveLog, Attendance, Task, Report, Holiday, Chat, PortalAccess].map((model) => model.init()));
  employee = await User.create({ email: 'employee@example.test', password: 'Test-only-password', role: 'it_employee', firstName: 'Test', lastName: 'Employee', department: 'IT' });
  hr = await User.create({ email: 'hr@example.test', password: 'Test-only-password', role: 'hr', firstName: 'Test', lastName: 'HR', department: 'Human Resources' });
  await Policy.create({ year: 2026, excludeHolidays: true });
}, { timeout: 240000 });
after(async () => { await mongoose.disconnect(); if (repl) await repl.stop(); });
const leavePayload = (day, extra = {}) => ({ leaveType: 'casual', startDate: day, endDate: day, reason: 'Test fixture', ...extra });
const actor = () => ({ _id: hr._id, role: 'hr' });

test('calendar calculations exclude weekends and holidays, including half days', () => {
  assert.equal(calculateLeaveDays({ startDate: '2026-09-11', endDate: '2026-09-15', holidays: ['2026-09-14'] }), 2);
  assert.equal(calculateLeaveDays({ startDate: '2026-09-12', endDate: '2026-09-12', isHalfDay: true }), 0);
  assert.throws(() => calculateLeaveDays({ startDate: '2026-09-15', endDate: '2026-09-14' }), /End date/);
});
test('HR cannot create platform accounts or assign custom permissions', () => {
  assert.throws(() => assertUserAdministration({ role: 'hr' }, null, { role: 'super_admin' }), { statusCode: 403 });
  assert.throws(() => assertUserAdministration({ role: 'it_hr' }, { role: 'it_employee' }, { permissions: ['manage_all_users'] }), { statusCode: 403 });
  assert.doesNotThrow(() => assertUserAdministration({ role: 'hr' }, { role: 'it_employee' }, { firstName: 'Updated' }));
});
test('pagination and nested filters are rejected before querying', () => {
  for (const query of [{ limit: '0' }, { page: '-1' }, { limit: '1000' }, { search: { $ne: '' } }, { page: '1oops' }]) {
    let status; let called = false;
    hrInput({ query, body: {}, params: {} }, { status(code) { status = code; return this; }, json() {} }, () => { called = true; });
    assert.equal(status, 400); assert.equal(called, false);
  }
});
test('CSV quotes values and neutralizes spreadsheet formulas', () => {
  assert.equal(escapeCsv('=1+1'), "\"'=1+1\"");
  assert.equal(escapeCsv(' @SUM(A1)'), "\"' @SUM(A1)\"");
  assert.equal(escapeCsv('a,b\"c'), '\"a,b\"\"c\"');
});
test('concurrent overlapping leave submissions create exactly one request', async () => {
  const results = await Promise.allSettled([submitLeave(employee, leavePayload('2026-09-14')), submitLeave(employee, leavePayload('2026-09-14'))]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  assert.equal(await Leave.countDocuments({ employee: employee._id }), 1);
});
test('concurrent HR approvals deduct once and create one approval audit', async () => {
  const leave = await Leave.findOne({ employee: employee._id });
  const results = await Promise.allSettled([reviewLeave({ id: leave._id, actor: actor(), approve: true }), reviewLeave({ id: leave._id, actor: actor(), approve: true })]);
  assert.equal(results.filter((result) => result.status === 'fulfilled').length, 1);
  const { balance } = await recomputeLeaveBalance(employee._id, 2026);
  assert.equal(balance.totalApprovedLeaves, 1);
  assert.equal(balance.remainingLeaveBalance, 29);
  assert.equal(await LeaveLog.countDocuments({ leave: leave._id, action: 'hr-approved' }), 1);
  assert.equal(await Attendance.countDocuments({ employee: employee._id }), 1);
});
test('audit failure rolls back approval, attendance and balance', async () => {
  const leave = await submitLeave(employee, leavePayload('2026-09-15'));
  const original = LeaveLog.prototype.save;
  LeaveLog.prototype.save = async function () { throw new Error('Injected audit failure'); };
  try { await assert.rejects(reviewLeave({ id: leave._id, actor: actor(), approve: true }), /Injected audit failure/); }
  finally { LeaveLog.prototype.save = original; }
  assert.equal((await Leave.findById(leave._id)).status, 'pending');
  assert.equal(await Attendance.countDocuments({ employee: employee._id }), 1);
  assert.equal((await Balance.findOne({ employee: employee._id, year: 2026 })).totalApprovedLeaves, 1);
});
test('approval rechecks changed entitlement and rejects self approval', async () => {
  const leave = await Leave.findOne({ employee: employee._id, status: 'pending' });
  await Policy.updateOne({ year: 2026 }, { clDays: 1 });
  await assert.rejects(reviewLeave({ id: leave._id, actor: actor(), approve: true }), /Insufficient CL/);
  await Policy.updateOne({ year: 2026 }, { clDays: 12 });
  await assert.rejects(reviewLeave({ id: leave._id, actor: { _id: employee._id, role: 'hr' }, approve: true }), { statusCode: 403 });
});
test('missing policy never creates a default allowance', async () => {
  await assert.rejects(submitLeave(employee, leavePayload('2027-01-04')), /No active leave policy/);
  assert.equal(await Policy.countDocuments({ year: 2027 }), 0);
});
test('leave cannot cross calendar years or use an unknown type', async () => {
  await assert.rejects(submitLeave(employee, leavePayload('2026-12-31', { endDate: '2027-01-01' })), /calendar year/);
  await assert.rejects(submitLeave(employee, leavePayload('2026-09-16', { leaveType: 'invented' })), /Invalid leave type/);
});
test('attendance ignores client work hours and normalizes the daily key', async () => {
  const record = await saveAttendance(null, { employee: employee._id, date: '2026-01-05T10:00:00Z', checkIn: '2026-01-05T03:30:00Z', checkOut: '2026-01-05T11:30:00Z', workHours: 999 }, actor());
  assert.equal(record.workHours, 8);
  assert.equal(record.date.getHours(), 0);
  await assert.rejects(saveAttendance(null, { employee: employee._id, date: '2026-01-05', checkIn: '2026-01-05T04:00:00Z', checkOut: '2026-01-05T12:00:00Z' }, actor()), { code: 11000 });
  await assert.rejects(saveAttendance(record._id, { checkOut: '2026-01-05T02:00:00Z' }, actor()), /Check-out/);
});
test('missing performance evidence is not zero or a critical rating', async () => {
  const result = await performance.calculateEmployeePerformance(employee, performance.buildDateRange({ periodType: 'monthly' }), [[], [], []]);
  assert.equal(result.autoScore, null);
  assert.equal(result.dataStatus, 'INSUFFICIENT_DATA');
  assert.equal(result.rating, 'Insufficient Data');
});
test('performance uses real related tasks, attendance and reports with bounded query count', async () => {
  await Task.create({ title: 'Task', description: 'Fixture', assignedTo: employee._id, assignedBy: hr._id, dueDate: new Date(), completedDate: new Date(), status: 'completed' });
  await Report.create({ title: 'Report', description: 'Fixture', employee: employee._id, reportDate: new Date(), status: 'approved', totalHours: 8 });
  await Attendance.create({ employee: employee._id, date: new Date(), checkIn: new Date(Date.now() - 3600000), checkOut: new Date(), status: 'present' });
  const counts = new Map(); mongoose.set('debug', (collection, method) => counts.set(collection + ':' + method, (counts.get(collection + ':' + method) || 0) + 1));
  let result;
  try { result = await performance.getOverview({ page: 1, limit: 100, startDate: '2026-01-01', endDate: '2026-12-31' }); }
  finally { mongoose.set('debug', false); }
  const row = result.items.find((item) => String(item.employee._id) === String(employee._id));
  assert.equal(row.taskMetrics.completed, 1);
  assert.equal(row.workReportMetrics.reportsSubmitted, 1);
  assert.equal(typeof row.autoScore, 'number');
  assert.equal(counts.get(Task.collection.name + ':find'), 1);
  assert.equal(counts.get(Attendance.collection.name + ':find'), 1);
  assert.equal(counts.get(Report.collection.name + ':find'), 1);
  assert.equal(result.summary.eligibleEmployeeCount, await User.countDocuments(employeeScope({ activeOnly: true })));
});
test('socket subscriptions reject unrelated users and private rooms', async () => {
  const chat = await Chat.create({ name: 'Private', members: [hr._id] });
  const user = { userId: String(employee._id), role: 'it_employee' };
  assert.equal(await canAccessRoom(user, String(chat._id)), false);
  assert.equal(await canAccessRoom(user, 'hr'), false);
  assert.equal(await canAccessRoom(user, 'outsourcing:user:' + hr._id), false);
  assert.equal(await canAccessRoom(user, 'support:user:' + employee._id), true);
  await PortalAccess.create({ role: 'hr', portal: 'hr', canAccess: false });
  assert.equal(await canAccessRoom({ userId: String(hr._id), role: 'hr' }, 'hr'), false);
});

test('project overview pages count only accessible persisted projects and never double-skip', async () => {
  const Project = require('../models/common/Project');
  const { PROJECT_REGISTRY } = require('../utils/projectAccess');
  const router = require('../routes/projectOverview.routes');
  await Project.init();
  const fixtures = PROJECT_REGISTRY.slice(0, 3);
  assert.equal(fixtures.length, 3);
  for (const [index, project] of fixtures.entries()) {
    await Project.create({
      name: project.name, projectCode: project.code, description: 'Fixture',
      startDate: new Date(), projectManager: index < 2 ? employee._id : hr._id,
    });
  }
  const user = { _id: employee._id, role: 'it_employee' };
  const first = await router.listProjects({ page: 1, limit: 1 }, user);
  const second = await router.listProjects({ page: 2, limit: 1 }, user);
  assert.equal(first.pagination.total, 2);
  assert.equal(second.pagination.total, 2);
  assert.equal(first.items.length, 1);
  assert.equal(second.items.length, 1);
  assert.notEqual(String(first.items[0]._id), String(second.items[0]._id));
  const denied = await router.listProjects({}, { _id: new mongoose.Types.ObjectId(), role: 'it_employee' });
  assert.equal(denied.pagination.total, 0);
  assert.deepEqual(denied.items, []);
});
