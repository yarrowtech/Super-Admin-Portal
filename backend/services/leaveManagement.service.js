const mongoose = require('mongoose');
const User = require('../models/auth/User');
const Holiday = require('../models/hr/Holiday');
const Leave = require('../models/hr/Leave');
const LeavePolicy = require('../models/hr/LeavePolicy');
const LeaveBalance = require('../models/hr/LeaveBalance');
const LeaveApprovalLog = require('../models/hr/LeaveApprovalLog');
const Attendance = require('../models/hr/Attendance');

const LEAVE_TYPES = {
  casual: { label: 'CL', paid: true, bucket: 'casual' },
  annual: { label: 'PL', paid: true, bucket: 'annual' },
  sick: { label: 'Sick', paid: true, bucket: 'sick' },
  half_day: { label: 'Half Day', paid: true, bucket: 'half_day' },
  emergency: { label: 'Emergency', paid: true, bucket: 'emergency' },
  work_from_home: { label: 'Work From Home', paid: false, bucket: 'work_from_home' },
  unpaid: { label: 'Unpaid', paid: false, bucket: 'unpaid' },
  maternity: { label: 'Maternity', paid: false, bucket: 'other' },
  paternity: { label: 'Paternity', paid: false, bucket: 'other' },
  other: { label: 'Other', paid: false, bucket: 'other' },
};

const businessError = (message, statusCode = 400) => Object.assign(new Error(message), { statusCode });

const normalizeDate = (value) => {
  if (!value || (typeof value !== 'string' && !(value instanceof Date))) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const toDateKey = (value) => {
  const date = normalizeDate(value);
  return date ? date.toISOString().slice(0, 10) : null;
};

const isWeekend = (date) => {
  const day = date.getDay();
  return day === 0 || day === 6;
};

const defaultPolicyPayload = (year) => ({
  year,
  clDays: 12,
  plDays: 12,
  sickDays: 6,
  yearlyPaidLeaveLimit: 30,
  plCarryForwardLimit: 12,
  excludeWeekends: true,
  excludeHolidays: false,
  sandwichRuleEnabled: false,
  active: true,
});

const getLeaveTypeConfig = (leaveType) => LEAVE_TYPES[leaveType] || LEAVE_TYPES.other;

const calculateLeaveDays = ({
  startDate,
  endDate,
  isHalfDay = false,
  leaveType,
  excludeWeekends = true,
  holidays = [],
}) => {
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);

  if (!start || !end || end < start) {
    throw businessError('End date must be after start date');
  }

  const holidayKeys = new Set(holidays.map(toDateKey));
  const eligible = (date) => !(excludeWeekends && isWeekend(date)) && !holidayKeys.has(toDateKey(date));
  if (isHalfDay || leaveType === 'half_day') {
    if (start.getTime() !== end.getTime()) {
      throw businessError('Half-day leave must be for a single date');
    }
    return eligible(start) ? 0.5 : 0;
  }

  let total = 0;
  const cursor = new Date(start);
  while (cursor <= end) {
    if (eligible(cursor)) {
      total += 1;
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return total;
};

const ensurePolicy = async (year, session = null) => {
  const policy = await LeavePolicy.findOne({ year, active: true }).session(session);
  if (!policy) throw businessError('No active leave policy exists for this year', 409);
  return policy;
};

const listApprovedLeavesForYear = async (employeeId, year, session = null) => {
  return Leave.find({
    employee: employeeId,
    year,
    status: 'approved',
  }).select('leaveType deductedDays totalDays').session(session);
};

const ensureBalance = async (employeeId, year, session = null) => {
  const policy = await ensurePolicy(year, session);
  let balance = await LeaveBalance.findOne({ employee: employeeId, year }).session(session);

  if (!balance) {
    let carriedForwardPL = 0;
    const previousYearBalance = await LeaveBalance.findOne({ employee: employeeId, year: year - 1 }).session(session);
    if (previousYearBalance) {
      carriedForwardPL = Math.min(
        previousYearBalance.leaveTypeWiseBalance?.annual?.remaining || 0,
        policy.plCarryForwardLimit
      );
    }

    balance = new LeaveBalance({
      employee: employeeId,
      year,
      yearlyLeaveQuota: policy.yearlyPaidLeaveLimit,
      totalApprovedLeaves: 0,
      remainingLeaveBalance: policy.yearlyPaidLeaveLimit,
      leaveTypeWiseBalance: {
        casual: { allocated: policy.clDays, used: 0, remaining: policy.clDays },
        annual: {
          allocated: policy.plDays,
          carriedForward: carriedForwardPL,
          used: 0,
          remaining: policy.plDays + carriedForwardPL,
        },
        sick: { allocated: policy.sickDays, used: 0, remaining: policy.sickDays },
        emergency: { allocated: 0, used: 0, remaining: 0 },
        half_day: { allocated: 0, used: 0, remaining: 0 },
        unpaid: { allocated: 0, used: 0, remaining: 0 },
        work_from_home: { allocated: 0, used: 0, remaining: 0 },
      },
    });
  }

  return { balance, policy };
};

const lockEmployee = async (employeeId, session) => {
  const employee = await User.findOneAndUpdate({ _id: employeeId }, { $inc: { __v: 1 } }, { new: true, session });
  if (!employee) throw businessError('Employee not found', 404);
  return employee;
};

const recomputeLeaveBalance = async (employeeId, year, session = null) => {
  if (!session) return mongoose.connection.transaction(async (transaction) => {
    await lockEmployee(employeeId, transaction);
    return recomputeLeaveBalance(employeeId, year, transaction);
  });
  const { balance, policy } = await ensureBalance(employeeId, year, session);
  const approvedLeaves = await listApprovedLeavesForYear(employeeId, year, session);

  const casualUsed = approvedLeaves.filter((leave) => leave.leaveType === 'casual').reduce((sum, leave) => sum + (leave.deductedDays ?? leave.totalDays ?? 0), 0);
  const annualUsed = approvedLeaves.filter((leave) => leave.leaveType === 'annual').reduce((sum, leave) => sum + (leave.deductedDays ?? leave.totalDays ?? 0), 0);
  const sickUsed = approvedLeaves.filter((leave) => leave.leaveType === 'sick').reduce((sum, leave) => sum + (leave.deductedDays ?? leave.totalDays ?? 0), 0);
  const emergencyUsed = approvedLeaves.filter((leave) => leave.leaveType === 'emergency').reduce((sum, leave) => sum + (leave.deductedDays ?? leave.totalDays ?? 0), 0);
  const halfDayUsed = approvedLeaves.filter((leave) => leave.leaveType === 'half_day').reduce((sum, leave) => sum + (leave.deductedDays ?? leave.totalDays ?? 0), 0);
  const unpaidUsed = approvedLeaves.filter((leave) => leave.leaveType === 'unpaid').reduce((sum, leave) => sum + (leave.totalDays || 0), 0);
  const workFromHomeUsed = approvedLeaves.filter((leave) => leave.leaveType === 'work_from_home').reduce((sum, leave) => sum + (leave.totalDays || 0), 0);

  const paidApprovedLeaves = approvedLeaves
    .filter((leave) => getLeaveTypeConfig(leave.leaveType).paid)
    .reduce((sum, leave) => sum + (leave.deductedDays ?? leave.totalDays ?? 0), 0);

  const annualCarryForward = balance.leaveTypeWiseBalance?.annual?.carriedForward || 0;

  balance.yearlyLeaveQuota = policy.yearlyPaidLeaveLimit + annualCarryForward;
  balance.totalApprovedLeaves = Number(paidApprovedLeaves.toFixed(1));
  balance.remainingLeaveBalance = Number(Math.max(0, balance.yearlyLeaveQuota - paidApprovedLeaves).toFixed(1));
  balance.leaveTypeWiseBalance.casual = {
    allocated: policy.clDays,
    used: Number(casualUsed.toFixed(1)),
    remaining: Number(Math.max(0, policy.clDays - casualUsed).toFixed(1)),
  };
  balance.leaveTypeWiseBalance.annual = {
    allocated: policy.plDays,
    carriedForward: annualCarryForward,
    used: Number(annualUsed.toFixed(1)),
    remaining: Number(Math.max(0, policy.plDays + annualCarryForward - annualUsed).toFixed(1)),
  };
  balance.leaveTypeWiseBalance.sick = {
    allocated: policy.sickDays,
    used: Number(sickUsed.toFixed(1)),
    remaining: Number(Math.max(0, policy.sickDays - sickUsed).toFixed(1)),
  };
  balance.leaveTypeWiseBalance.emergency = {
    allocated: 0,
    used: Number(emergencyUsed.toFixed(1)),
    remaining: 0,
  };
  balance.leaveTypeWiseBalance.half_day = {
    allocated: 0,
    used: Number(halfDayUsed.toFixed(1)),
    remaining: 0,
  };
  balance.leaveTypeWiseBalance.unpaid = {
    allocated: 0,
    used: Number(unpaidUsed.toFixed(1)),
    remaining: 0,
  };
  balance.leaveTypeWiseBalance.work_from_home = {
    allocated: 0,
    used: Number(workFromHomeUsed.toFixed(1)),
    remaining: 0,
  };

  await balance.save({ session });
  return { balance, policy };
};

const detectOverlap = async ({ employeeId, startDate, endDate, excludeLeaveId, session = null }) => {
  const query = {
    employee: employeeId,
    status: { $in: ['pending', 'manager-approved', 'approved'] },
    startDate: { $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)) },
    endDate: { $gte: new Date(startDate) },
  };
  if (excludeLeaveId) {
    query._id = { $ne: excludeLeaveId };
  }
  return Leave.findOne(query).session(session);
};

const validateLeaveRequest = async ({ employeeId, leaveType, startDate, endDate, isHalfDay, excludeLeaveId, session = null }) => {
  if (!Object.prototype.hasOwnProperty.call(LEAVE_TYPES, leaveType)) throw businessError('Invalid leave type');
  if (isHalfDay !== undefined && typeof isHalfDay !== 'boolean') throw businessError('isHalfDay must be a boolean');
  const start = normalizeDate(startDate);
  const end = normalizeDate(endDate);
  if (!start || !end) {
    throw businessError('Start date and end date are required');
  }

  if (start.getFullYear() !== end.getFullYear()) throw businessError('Split leave requests at the calendar year boundary');
  const policy = await ensurePolicy(start.getFullYear(), session);
  if (policy.sandwichRuleEnabled) throw businessError('Sandwich-rule policy requires a configured calculation rule', 409);
  const employee = await User.findById(employeeId).select('department').session(session);
  if (!employee) throw businessError('Employee not found', 404);
  const holidays = policy.excludeHolidays ? await Holiday.find({
    date: { $gte: start, $lte: end }, type: 'public',
    $or: [{ department: employee.department }, { department: '' }, { department: null }],
  }).select('date').session(session).lean() : [];
  const totalDays = calculateLeaveDays({
    startDate: start,
    endDate: end,
    isHalfDay,
    leaveType,
    excludeWeekends: policy.excludeWeekends,
    holidays: holidays.map((holiday) => holiday.date),
  });
  if (totalDays <= 0) throw businessError('Leave must include at least one eligible working day');
  const overlap = await detectOverlap({ employeeId, startDate: start, endDate: end, excludeLeaveId, session });
  if (overlap) {
    throw businessError('Leave request overlaps with an existing request');
  }

  const { balance } = await recomputeLeaveBalance(employeeId, start.getFullYear(), session);
  const leaveTypeConfig = getLeaveTypeConfig(leaveType);
  const paidDeductionDays = leaveTypeConfig.paid ? totalDays : 0;

  if (leaveType === 'casual' && balance.leaveTypeWiseBalance.casual.remaining < totalDays) {
    throw businessError('Insufficient CL balance');
  }
  if (leaveType === 'annual' && balance.leaveTypeWiseBalance.annual.remaining < totalDays) {
    throw businessError('Insufficient PL balance');
  }
  if (leaveType === 'sick' && balance.leaveTypeWiseBalance.sick.remaining < totalDays) {
    throw businessError('Insufficient Sick Leave balance');
  }
  if (leaveTypeConfig.paid && paidDeductionDays > balance.remainingLeaveBalance) {
    throw businessError('Approved leave limit for this year has been reached');
  }

  return {
    startDate: start,
    endDate: end,
    policy,
    balance,
    totalDays,
    deductedDays: paidDeductionDays,
    year: start.getFullYear(),
    isPaidLeave: leaveTypeConfig.paid,
  };
};

const syncLeaveAttendance = async (leave, session = null) => {
  const start = normalizeDate(leave.startDate);
  const end = normalizeDate(leave.endDate);
  if (!start || !end) return;

  if (leave.leaveType === 'work_from_home') {
    leave.attendanceSyncStatus = 'skipped';
    await leave.save({ session });
    return;
  }
  const policy = await ensurePolicy(leave.year, session);
  const employee = await User.findById(leave.employee?._id || leave.employee).select('department').session(session);
  const holidays = policy.excludeHolidays ? await Holiday.find({
    date: { $gte: start, $lte: end }, type: 'public',
    $or: [{ department: employee?.department }, { department: '' }, { department: null }],
  }).select('date').session(session).lean() : [];
  const holidayKeys = new Set(holidays.map((holiday) => toDateKey(holiday.date)));
  const location = leave.leaveType === 'work_from_home' ? 'remote' : 'office';
  const status = leave.leaveType === 'half_day' || leave.isHalfDay ? 'half-day' : 'on-leave';

  const cursor = new Date(start);
  while (cursor <= end) {
    if ((policy.excludeWeekends && isWeekend(cursor)) || holidayKeys.has(toDateKey(cursor))) {
      cursor.setDate(cursor.getDate() + 1);
      continue;
    }
    const date = new Date(cursor);
    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);

    const baseRecord = {
      employee: leave.employee,
      date: dayStart,
      checkIn: dayStart,
      checkOut: dayStart,
      workHours: 0,
      status,
      location,
      notes: `Auto-synced from approved ${leave.leaveType.replace(/_/g, ' ')} leave`,
      isApproved: true,
      approvedBy: leave.approvedBy,
    };

    await Attendance.findOneAndUpdate(
      {
        employee: leave.employee,
        date: { $gte: dayStart, $lt: dayEnd },
      },
      { $setOnInsert: baseRecord },
      {
        session,
        upsert: true,
        new: true,
        setDefaultsOnInsert: true,
      }
    );
    cursor.setDate(cursor.getDate() + 1);
  }

  leave.attendanceSyncStatus = 'synced';
  await leave.save({ session });
};

const logLeaveAction = async ({ leave, reviewer, role, action, comment, session = null }) => {
  const log = new LeaveApprovalLog({
    leave: leave._id,
    employee: leave.employee,
    reviewer,
    role,
    action,
    comment,
  });
  return log.save({ session });
};

module.exports = {
  lockEmployee,
  LEAVE_TYPES,
  ensurePolicy,
  ensureBalance,
  recomputeLeaveBalance,
  validateLeaveRequest,
  syncLeaveAttendance,
  logLeaveAction,
  calculateLeaveDays,
};
