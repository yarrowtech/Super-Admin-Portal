process.env.NODE_ENV = 'test';
const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryReplSet } = require('mongodb-memory-server');
const User = require('../models/auth/User');
const Task = require('../models/common/Task');
const Report = require('../models/hr/StaffWorkReport');
const Log = require('../models/auth/ActivityLog');
const { resolveManagerScope } = require('../services/managerScope.service');
const { buildManagerSnapshot } = require('../services/dashboard.service');
const { review } = require('../services/managerReview.service');
let repl, manager, employee, outsider;
before(async () => {
  repl = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  await mongoose.connect(repl.getUri(), { dbName: 'manager_integrity' });
  await Promise.all([User, Task, Report, Log].map(m => m.init()));
  const make = (email, role, department) => User.create({ email, password: 'Test-only-password', firstName: 'Test', lastName: 'User', role, department });
  manager = await make('manager@example.test', 'it_manager', 'IT');
  employee = await make('employee@example.test', 'it_employee', 'IT');
  outsider = await make('other@example.test', 'finance_employee', 'Finance');
}, { timeout: 240000 });
after(async () => { await mongoose.disconnect(); if (repl) await repl.stop(); });
test('manager scope excludes unrelated departments and platform accounts', async () => {
  const scope = await resolveManagerScope(manager);
  const ids = scope.employeeIds.map(String);
  assert.ok(ids.includes(String(employee._id)));
  assert.ok(!ids.includes(String(outsider._id)));
  assert.ok(!ids.includes(String(manager._id)));
  const absentDepartment = await resolveManagerScope({ _id: manager._id });
  assert.equal(absentDepartment.employeeIds.length, 0);
});
test('dashboard team totals are not truncated to the 12-row preview', async () => {
  await User.collection.insertMany(Array.from({ length: 14 }, (_, i) => ({ firstName: 'Extra', lastName: String(i), email: 'extra' + i + '@example.test', role: 'it_employee', department: 'IT', isActive: true })));
  const snapshot = await buildManagerSnapshot(manager);
  assert.equal(snapshot.teamSummary.totalMembers, 15);
  assert.equal(snapshot.teamSummary.members.length, 12);
});
test('out-of-scope work review is forbidden without changing the report', async () => {
  const report = await Report.create({ employee: outsider._id, title: 'External', description: 'Unrelated work' });
  await assert.rejects(review({ actor: manager, id: report.id, kind: 'work', approve: true }), { statusCode: 403 });
  assert.equal((await Report.findById(report.id)).status, 'submitted');
});
test('concurrent work decisions update the task and audit exactly once', async () => {
  const task = await Task.create({ title: 'Review task', description: 'Test', assignedBy: manager._id, assignedTo: employee._id, dueDate: new Date(), status: 'review' });
  const report = await Report.create({ employee: employee._id, taskId: task._id, title: 'Submission', description: 'Test' });
  const results = await Promise.allSettled([1, 2].map(() => review({ actor: manager, id: report.id, kind: 'work', approve: true })));
  assert.equal(results.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal((await Task.findById(task.id)).status, 'completed');
  assert.equal(await Log.countDocuments({ entityId: report.id }), 1);
});
test('rejection requires actual manager feedback', async () => {
  await assert.rejects(review({ actor: manager, id: new mongoose.Types.ObjectId(), kind: 'work', approve: false, reason: ' ' }), { statusCode: 400 });
});

test('manager task updates reject skipped transitions and closed task edits', async () => {
  const { saveTask } = require('../services/managerTask.service');
  const task = await Task.create({ title: 'Pending task', description: 'Test', assignedBy: manager._id, assignedTo: employee._id, dueDate: new Date() });
  await assert.rejects(saveTask({ actor: manager, id: task.id, body: { status: 'completed' } }), { statusCode: 409 });
  await saveTask({ actor: manager, id: task.id, body: { status: 'cancelled' } });
  await assert.rejects(saveTask({ actor: manager, id: task.id, body: { title: 'Changed' } }), { statusCode: 409 });
});
test('manager task creation rejects missing project and unrelated employee', async () => {
  const { saveTask } = require('../services/managerTask.service');
  const body = { title: 'Test', description: 'Test', dueDate: new Date(), assignedTo: employee._id };
  await assert.rejects(saveTask({ actor: manager, body }), { statusCode: 400 });
  await assert.rejects(saveTask({ actor: manager, body: { ...body, assignedTo: outsider._id } }), { statusCode: 403 });
});
