const mongoose = require('mongoose');
const Leave = require('../models/hr/Leave');
const Report = require('../models/hr/StaffWorkReport');
const Task = require('../models/common/Task');
const ActivityLog = require('../models/auth/ActivityLog');
const { resolveManagerScope } = require('./managerScope.service');
const { logLeaveAction } = require('./leaveManagement.service');
const fail = (message, statusCode) => { throw Object.assign(new Error(message), { statusCode }); };
const review = async ({ actor, id, kind, approve, reason }) => {
  if (!mongoose.isObjectIdOrHexString(id)) fail('Invalid record ID', 400);
  if (!approve && (typeof reason !== 'string' || !reason.trim())) fail('A rejection reason is required', 400);
  if (reason && (typeof reason !== 'string' || reason.length > 2000)) fail('Feedback must be at most 2000 characters', 400);
  return mongoose.connection.transaction(async session => {
    const scope = await resolveManagerScope(actor, session);
    const isLeave = kind === 'leave';
    const Model = isLeave ? Leave : Report;
    const record = await Model.findOne({ _id: id, ...(isLeave ? scope.leaves : scope.reports) }).session(session);
    if (!record) fail('Record is outside your managed scope', 403);
    if (record.status !== (isLeave ? 'pending' : 'submitted')) fail('This record has already been reviewed', 409);
    const before = record.status;
    if (isLeave) {
      record.status = approve ? 'manager-approved' : 'rejected';
      record.managerApprovalStatus = approve ? 'approved' : 'rejected';
      record.managerApprovedBy = scope.managerId;
      record.managerApprovedDate = new Date();
      record.managerRejectionReason = approve ? undefined : reason.trim();
      await record.save({ session });
      await logLeaveAction({ leave: record, reviewer: scope.managerId, role: actor.role, action: approve ? 'manager-approved' : 'manager-rejected', comment: reason, session });
    } else {
      record.status = approve ? 'approved' : 'rejected';
      record.reviewedBy = scope.managerId;
      record.reviewedDate = new Date();
      record.feedback = reason?.trim() || 'Approved by manager';
      if (record.taskId) {
        const task = await Task.findOne({ $and: [{ _id: record.taskId, assignedTo: record.employee }, scope.tasks] }).session(session);
        if (!task) fail('Linked task is outside this employee assignment', 409);
        if (task.status !== 'review') fail('Linked task is not awaiting review', 409);
        task.status = approve ? 'completed' : 'in-progress';
        if (approve) task.completedDate = new Date();
        await task.save({ session });
      }
      await record.save({ session });
    }
    await ActivityLog.create([{ actor: scope.managerId, action: approve ? 'manager_approved' : 'manager_rejected', module: isLeave ? 'leave' : 'work-reviews', portal: 'manager', entityId: String(record._id), entityType: isLeave ? 'Leave' : 'WorkReport', metadata: { before, after: record.status, reason } }], { session });
    return record;
  });
};
module.exports = { review };
