const mongoose = require('mongoose');
const User = require('../models/auth/User');
const Project = require('../models/common/Project');
const Task = require('../models/common/Task');
const Report = require('../models/hr/StaffWorkReport');
const Leave = require('../models/hr/Leave');
const { resolveManagerScope } = require('./managerScope.service');
const context = async ({ actor, kind, id }) => {
  if (!mongoose.isObjectIdOrHexString(id)) throw Object.assign(new Error('Invalid record ID'), { statusCode: 400 });
  const scope = await resolveManagerScope(actor);
  const employee = kind === 'employee';
  const record = employee
    ? await User.findOne({ $and: [{ _id: id }, scope.employees] }).select('firstName lastName email role department isActive').lean()
    : await Project.findOne({ _id: id, ...scope.projects }).select('name description status deadline teamMembers').populate('teamMembers.employee', 'firstName lastName role').lean();
  if (!record) throw Object.assign(new Error('Record is outside your managed scope'), { statusCode: 403 });
  const taskScope = { $and: [scope.tasks, employee ? { assignedTo: id } : { project: id }] };
  const [tasks, taskTotal, submissions, leaves] = await Promise.all([
    Task.find({ $and: [taskScope, { status: { $nin: ['completed', 'cancelled'] } }] }).select('title status priority dueDate project assignedTo').populate('project', 'name').populate('assignedTo', 'firstName lastName').sort({ dueDate: 1 }).limit(20).lean(),
    Task.countDocuments({ $and: [taskScope, { status: { $nin: ['completed', 'cancelled'] } }] }),
    Report.find({ $and: [scope.reports, employee ? { employee: id } : { project: id }] }).select('title status reportDate feedback').sort({ reportDate: -1 }).limit(10).lean(),
    employee ? Leave.find({ employee: id, status: { $in: ['pending', 'manager-approved', 'approved'] }, endDate: { $gte: new Date(new Date().setHours(0, 0, 0, 0)) } }).select('startDate endDate status totalDays').sort({ startDate: 1 }).limit(10).lean() : [],
  ]);
  return { record, tasks, taskTotal, submissions, leaves };
};
module.exports = { context };
