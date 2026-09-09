const mongoose = require('mongoose');
const Leave = require('../models/hr/Leave');
const { lockEmployee, validateLeaveRequest, recomputeLeaveBalance, syncLeaveAttendance, logLeaveAction } = require('./leaveManagement.service');
const fail = (message, statusCode = 400) => { throw Object.assign(new Error(message), { statusCode }); };

const submitLeave = async (actor, payload) => mongoose.connection.transaction(async (session) => {
  await lockEmployee(actor._id || actor.id, session);
  if (typeof payload.reason !== 'string' || !payload.reason.trim()) fail('Reason is required');
  const employeeId = actor._id || actor.id;
  const validation = await validateLeaveRequest({ ...payload, employeeId, session, excludeLeaveId: undefined });
  const leave = new Leave({
    employee: employeeId, leaveType: payload.leaveType,
    startDate: validation.startDate, endDate: validation.endDate,
    reason: payload.reason.trim(), isHalfDay: payload.isHalfDay === true || payload.leaveType === 'half_day',
    halfDaySession: payload.halfDaySession || null, handoverNotes: payload.handoverNotes,
    emergencyContact: payload.emergencyContact,
    totalDays: validation.totalDays, deductedDays: validation.deductedDays,
    year: validation.year, isPaidLeave: validation.isPaidLeave,
    status: 'pending', managerApprovalStatus: 'pending',
  });
  await leave.save({ session });
  await logLeaveAction({ leave, reviewer: employeeId, role: actor.role, action: 'applied', session });
  return leave;
});

const reviewLeave = async ({ id, actor, approve, rejectionReason }) => mongoose.connection.transaction(async (session) => {
  const leave = await Leave.findById(id).session(session);
  if (!leave) fail('Leave request not found', 404);
  await lockEmployee(leave.employee, session);
  if (!['pending', 'manager-approved'].includes(leave.status)) fail('Leave request is not awaiting HR approval', 409);
  if (String(leave.employee) === String(actor._id || actor.id)) fail('You cannot review your own leave request', 403);
  if (approve) {
    const validation = await validateLeaveRequest({
      employeeId: leave.employee, leaveType: leave.leaveType,
      startDate: leave.startDate, endDate: leave.endDate, isHalfDay: leave.isHalfDay,
      excludeLeaveId: leave._id, session,
    });
    leave.totalDays = validation.totalDays;
    leave.deductedDays = validation.deductedDays;
    leave.year = validation.year;
    leave.isPaidLeave = validation.isPaidLeave;
  } else {
    if (typeof rejectionReason !== 'string' || !rejectionReason.trim()) fail('Rejection reason is required');
    leave.rejectionReason = rejectionReason.trim();
  }
  leave.status = approve ? 'approved' : 'rejected';
  leave.approvedBy = actor._id || actor.id;
  leave.approvedDate = new Date();
  if (leave.managerApprovalStatus === 'pending') leave.managerApprovalStatus = 'bypassed';
  await leave.save({ session });
  if (approve) await syncLeaveAttendance(leave, session);
  await logLeaveAction({
    leave, reviewer: actor._id || actor.id, role: actor.role,
    action: approve ? 'hr-approved' : 'hr-rejected', comment: approve ? undefined : rejectionReason, session,
  });
  const { balance } = await recomputeLeaveBalance(leave.employee, leave.year || new Date(leave.startDate).getFullYear(), session);
  return { leave, balance };
});
module.exports = { submitLeave, reviewLeave };
