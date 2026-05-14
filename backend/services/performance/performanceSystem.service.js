const User = require('../../models/auth/User');
const Task = require('../../models/common/Task');
const Attendance = require('../../models/hr/Attendance');
const WorkReport = require('../../models/hr/StaffWorkReport');
const PerformanceSnapshot = require('../../models/performance/PerformanceSnapshot');
const AppraisalCycle = require('../../models/performance/AppraisalCycle');
const { ROLES } = require('../../config/roles');

const clampScore = (value) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return 0;
  return Math.min(100, Math.max(0, Math.round(numeric * 100) / 100));
};

const round = (value) => Math.round(Number(value || 0) * 100) / 100;

const getRating = (score) => {
  if (score >= 90) return 'Excellent';
  if (score >= 75) return 'Good';
  if (score >= 60) return 'Average';
  if (score >= 40) return 'Needs Improvement';
  return 'Critical Performance Alert';
};

const startOfDay = (value) => {
  const date = new Date(value);
  date.setHours(0, 0, 0, 0);
  return date;
};

const endOfDay = (value) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date;
};

const getDefaultDateRange = (periodType = 'monthly') => {
  const end = endOfDay(new Date());
  const start = new Date(end);

  if (periodType === 'weekly') {
    start.setDate(start.getDate() - 6);
  } else if (periodType === 'quarterly') {
    start.setMonth(start.getMonth() - 3);
    start.setDate(1);
  } else if (periodType === 'yearly') {
    start.setFullYear(start.getFullYear() - 1);
    start.setDate(1);
  } else {
    start.setMonth(start.getMonth() - 1);
  }

  return {
    periodStart: startOfDay(start),
    periodEnd: end,
  };
};

const buildDateRange = ({ periodType, startDate, endDate }) => {
  if (startDate && endDate) {
    return {
      periodType: periodType || 'custom',
      periodStart: startOfDay(startDate),
      periodEnd: endOfDay(endDate),
    };
  }

  const normalizedPeriodType = periodType || 'monthly';
  return {
    periodType: normalizedPeriodType,
    ...getDefaultDateRange(normalizedPeriodType),
  };
};

const getEmployeeQuery = ({ department, search, employeeId }) => {
  const query = {
    role: ROLES.EMPLOYEE,
    isActive: true,
  };

  if (employeeId) query._id = employeeId;
  if (department) query.department = department;
  if (search) {
    query.$or = [
      { firstName: { $regex: search, $options: 'i' } },
      { lastName: { $regex: search, $options: 'i' } },
      { email: { $regex: search, $options: 'i' } },
      { department: { $regex: search, $options: 'i' } },
    ];
  }

  return query;
};

const buildTaskMetrics = (tasks) => {
  const completedTasks = tasks.filter((task) => task.status === 'completed');
  const completedOnTime = completedTasks.filter(
    (task) => task.completedDate && task.dueDate && new Date(task.completedDate) <= new Date(task.dueDate)
  );
  const delayedTasks = completedTasks.filter(
    (task) => task.completedDate && task.dueDate && new Date(task.completedDate) > new Date(task.dueDate)
  );
  const overdueTasks = tasks.filter(
    (task) => task.status !== 'completed' && task.status !== 'cancelled' && task.dueDate && new Date(task.dueDate) < new Date()
  );
  const reviewTasks = tasks.filter((task) => task.status === 'review');

  const averageCompletionHours = completedTasks.length
    ? completedTasks.reduce((total, task) => {
        if (task.actualHours) return total + Number(task.actualHours);
        if (task.startDate && task.completedDate) {
          return total + (new Date(task.completedDate) - new Date(task.startDate)) / (1000 * 60 * 60);
        }
        return total;
      }, 0) / completedTasks.length
    : 0;

  const completionRate = tasks.length ? (completedTasks.length / tasks.length) * 100 : 0;
  const deadlineSuccessRate = completedTasks.length ? (completedOnTime.length / completedTasks.length) * 100 : 0;

  return {
    assigned: tasks.length,
    completed: completedTasks.length,
    overdue: overdueTasks.length,
    delayed: delayedTasks.length,
    review: reviewTasks.length,
    completionRate: clampScore(completionRate),
    deadlineSuccessRate: clampScore(deadlineSuccessRate),
    averageCompletionHours: round(averageCompletionHours),
  };
};

const buildAttendanceMetrics = (attendance) => {
  const trackedDays = attendance.length;
  const presentDays = attendance.filter((entry) => ['present', 'late'].includes(entry.status)).length;
  const lateDays = attendance.filter((entry) => entry.status === 'late').length;
  const leaveDays = attendance.filter((entry) => entry.status === 'on-leave').length;
  const totalWorkHours = attendance.reduce((sum, entry) => sum + Number(entry.workHours || 0), 0);
  const averageWorkHours = trackedDays ? totalWorkHours / trackedDays : 0;
  const consistencyScore = trackedDays ? (presentDays / trackedDays) * 100 : 0;

  return {
    trackedDays,
    presentDays,
    lateDays,
    leaveDays,
    averageWorkHours: round(averageWorkHours),
    consistencyScore: clampScore(consistencyScore),
  };
};

const buildWorkReportMetrics = (workReports, trackedDays) => {
  const totalReportedHours = workReports.reduce((sum, report) => sum + Number(report.totalHours || 0), 0);
  const approvedReports = workReports.filter((report) => report.status === 'approved').length;
  const rejectedReports = workReports.filter((report) => report.status === 'rejected').length;
  const uniqueReportDays = new Set(
    workReports.map((report) => new Date(report.reportDate).toISOString().slice(0, 10))
  ).size;
  const reportConsistencyScore = trackedDays ? (uniqueReportDays / trackedDays) * 100 : 0;

  return {
    reportsSubmitted: workReports.length,
    reportConsistencyScore: clampScore(reportConsistencyScore),
    totalReportedHours: round(totalReportedHours),
    approvedReports,
    rejectedReports,
  };
};

const buildScoreBreakdown = ({ taskMetrics, attendanceMetrics, workReportMetrics }) => {
  const taskExecution = clampScore((taskMetrics.completionRate * 0.6) + (taskMetrics.deadlineSuccessRate * 0.4));
  const qualityPenalty = (taskMetrics.review * 6) + (taskMetrics.delayed * 4) + (workReportMetrics.rejectedReports * 8);
  const quality = clampScore(100 - qualityPenalty);
  const attendance = attendanceMetrics.consistencyScore;
  const updates = workReportMetrics.reportConsistencyScore;
  const collaboration = clampScore((workReportMetrics.approvedReports * 15) + (workReportMetrics.reportsSubmitted > 0 ? 30 : 0));
  const productivity = clampScore(
    (taskMetrics.completionRate * 0.5) +
      (Math.min(attendanceMetrics.averageWorkHours, 9) / 9) * 25 +
      (Math.min(workReportMetrics.totalReportedHours, 160) / 160) * 25
  );

  return {
    taskExecution,
    quality,
    attendance,
    updates,
    collaboration,
    productivity,
  };
};

const buildAutoScore = (scoreBreakdown) =>
  clampScore(
    (scoreBreakdown.taskExecution * 0.35) +
      (scoreBreakdown.quality * 0.2) +
      (scoreBreakdown.attendance * 0.15) +
      (scoreBreakdown.updates * 0.1) +
      (scoreBreakdown.collaboration * 0.1) +
      (scoreBreakdown.productivity * 0.1)
  );

const calculateEmployeePerformance = async (employee, range) => {
  const taskQuery = {
    assignedTo: employee._id,
    createdAt: { $lte: range.periodEnd },
    $or: [
      { createdAt: { $gte: range.periodStart, $lte: range.periodEnd } },
      { dueDate: { $gte: range.periodStart, $lte: range.periodEnd } },
      { completedDate: { $gte: range.periodStart, $lte: range.periodEnd } },
    ],
  };

  const [tasks, attendance, workReports] = await Promise.all([
    Task.find(taskQuery).lean(),
    Attendance.find({
      employee: employee._id,
      date: { $gte: range.periodStart, $lte: range.periodEnd },
    }).lean(),
    WorkReport.find({
      employee: employee._id,
      reportDate: { $gte: range.periodStart, $lte: range.periodEnd },
    }).lean(),
  ]);

  const taskMetrics = buildTaskMetrics(tasks);
  const attendanceMetrics = buildAttendanceMetrics(attendance);
  const workReportMetrics = buildWorkReportMetrics(workReports, attendanceMetrics.trackedDays || 1);
  const scoreBreakdown = buildScoreBreakdown({ taskMetrics, attendanceMetrics, workReportMetrics });
  const autoScore = buildAutoScore(scoreBreakdown);
  const rating = getRating(autoScore);

  return {
    employee: {
      _id: employee._id,
      firstName: employee.firstName,
      lastName: employee.lastName,
      email: employee.email,
      department: employee.department || '',
    },
    period: {
      type: range.periodType,
      start: range.periodStart,
      end: range.periodEnd,
    },
    taskMetrics,
    attendanceMetrics,
    workReportMetrics,
    scoreBreakdown,
    autoScore,
    rating,
  };
};

const getOverview = async ({ page = 1, limit = 10, department, search, periodType, startDate, endDate }) => {
  const range = buildDateRange({ periodType, startDate, endDate });
  const query = getEmployeeQuery({ department, search });
  const skip = (page - 1) * limit;

  const [employees, total] = await Promise.all([
    User.find(query)
      .select('firstName lastName email department')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    User.countDocuments(query),
  ]);

  const items = await Promise.all(employees.map((employee) => calculateEmployeePerformance(employee, range)));
  const averageScore = items.length
    ? round(items.reduce((sum, item) => sum + item.autoScore, 0) / items.length)
    : 0;

  const ratingCounts = items.reduce(
    (acc, item) => {
      acc[item.rating] = (acc[item.rating] || 0) + 1;
      return acc;
    },
    {}
  );

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
    summary: {
      averageScore,
      employeeCount: items.length,
      ratingCounts,
      period: range,
    },
  };
};

const getEmployeeSummary = async ({ employeeId, periodType, startDate, endDate }) => {
  const employee = await User.findOne(getEmployeeQuery({ employeeId }))
    .select('firstName lastName email department')
    .lean();

  if (!employee) return null;

  return calculateEmployeePerformance(employee, buildDateRange({ periodType, startDate, endDate }));
};

const upsertSnapshot = async ({ employeeId, periodType, startDate, endDate, generatedBy }) => {
  const summary = await getEmployeeSummary({ employeeId, periodType, startDate, endDate });
  if (!summary) return null;

  const snapshot = await PerformanceSnapshot.findOneAndUpdate(
    {
      employee: employeeId,
      periodType: summary.period.type,
      periodStart: summary.period.start,
      periodEnd: summary.period.end,
    },
    {
      employee: employeeId,
      department: summary.employee.department,
      taskMetrics: summary.taskMetrics,
      attendanceMetrics: summary.attendanceMetrics,
      workReportMetrics: summary.workReportMetrics,
      scoreBreakdown: summary.scoreBreakdown,
      autoScore: summary.autoScore,
      rating: summary.rating,
      generatedBy,
      generatedAt: new Date(),
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }
  )
    .populate('employee', 'firstName lastName email department')
    .populate('generatedBy', 'firstName lastName email');

  return snapshot;
};

const listSnapshots = async ({ page = 1, limit = 10, department, rating, periodType, employeeId }) => {
  const query = {};
  if (department) query.department = department;
  if (rating) query.rating = rating;
  if (periodType) query.periodType = periodType;
  if (employeeId) query.employee = employeeId;

  const skip = (page - 1) * limit;
  const [items, total] = await Promise.all([
    PerformanceSnapshot.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('generatedBy', 'firstName lastName email')
      .sort({ periodEnd: -1, autoScore: -1 })
      .skip(skip)
      .limit(limit),
    PerformanceSnapshot.countDocuments(query),
  ]);

  return {
    items,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

const listAppraisalCycles = async ({ status, cycleType }) => {
  const query = {};
  if (status) query.status = status;
  if (cycleType) query.cycleType = cycleType;

  return AppraisalCycle.find(query)
    .populate('createdBy', 'firstName lastName email')
    .sort({ startDate: -1 });
};

const createAppraisalCycle = async ({ payload, createdBy }) => {
  return AppraisalCycle.create({
    ...payload,
    createdBy,
  });
};

module.exports = {
  getOverview,
  getEmployeeSummary,
  upsertSnapshot,
  listSnapshots,
  listAppraisalCycles,
  createAppraisalCycle,
};
