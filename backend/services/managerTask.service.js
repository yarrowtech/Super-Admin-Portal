const mongoose = require('mongoose');
const Task = require('../models/common/Task');
const User = require('../models/auth/User');
const Project = require('../models/common/Project');
const Log = require('../models/auth/ActivityLog');
const Report = require('../models/hr/StaffWorkReport');
const { resolveManagerScope } = require('./managerScope.service');
const transitions = { pending: ['in-progress', 'cancelled'], 'in-progress': ['review', 'cancelled'], review: ['in-progress', 'completed', 'cancelled'], completed: [], cancelled: [] };
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };
const saveTask = async ({ actor, id, body }) => mongoose.connection.transaction(async session => {
  const scope = await resolveManagerScope(actor, session);
  if (id && !mongoose.isObjectIdOrHexString(id)) fail('Invalid task ID');
  const task = id ? await Task.findOne({ $and: [{ _id: id }, scope.tasks] }).session(session) : new Task({ assignedBy: scope.managerId, status: 'pending' });
  if (!task) fail('Task is outside your managed scope', 403);
  const before = task.status;
  if (id && ['completed', 'cancelled'].includes(before)) fail('Closed tasks cannot be edited', 409);
  if (body.status && body.status !== before && !(transitions[before] || []).includes(body.status)) fail('Invalid task status transition', 409);
  if (!id && body.status && body.status !== 'pending') fail('New tasks must start pending');
  if (body.status === 'completed' && await Report.exists({ taskId: task._id, status: 'submitted' }).session(session)) fail('Approve the pending work submission to complete this task', 409);
  if (body.assignedTo || !id) {
    if (!mongoose.isObjectIdOrHexString(body.assignedTo)) fail('Valid assignee required');
    if (!await User.exists({ $and: [{ _id: body.assignedTo, isActive: true, accountStatus: { $nin: ['inactive', 'suspended', 'blocked', 'pending_verification'] } }, scope.employees] }).session(session)) fail('Assignee is outside your active managed team', 403);
    task.assignedTo = body.assignedTo;
  }
  if (body.project || !id) {
    if (!mongoose.isObjectIdOrHexString(body.project)) fail('A managed project is required');
    if (!await Project.exists({ _id: body.project, ...scope.projects, status: { $in: ['planning', 'in-progress'] } }).session(session)) fail('Project is outside your active managed projects', 403);
    task.project = body.project;
  }
  for (const field of ['title', 'description', 'priority', 'dueDate', 'estimatedHours']) if (body[field] !== undefined) task[field] = body[field];
  if (body.status) task.status = body.status;
  if (task.status === 'completed') { task.completedDate = new Date(); task.progress = 100; }
  await task.save({ session });
  await Log.create([{ actor: scope.managerId, action: id ? 'manager_task_updated' : 'manager_task_created', module: 'tasks', portal: 'manager', entityType: 'Task', entityId: String(task._id), metadata: { before: id ? before : null, after: task.status, assignedTo: task.assignedTo } }], { session });
  return task;
});
module.exports = { saveTask, transitions };
