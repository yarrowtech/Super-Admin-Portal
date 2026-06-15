const logger = require('../../utils/logger');
// backend/controllers/dept/hr.controller.js
const mongoose = require('mongoose');
const User = require('../../models/auth/User');
const ActivityLog = require('../../models/auth/ActivityLog');
const Applicant = require('../../models/hr/Applicant');
const Attendance = require('../../models/hr/Attendance');
const Leave = require('../../models/hr/Leave');
const Notice = require('../../models/common/Notification');
const Performance = require('../../models/hr/StaffWorkReport');
const WorkReport = require('../../models/hr/StaffWorkReport');
const Complaint = require('../../models/hr/EmployeeRecord');
const Department = require('../../models/hr/EmployeeRecord');
const Task = require('../../models/common/Task');
const Designation = require('../../models/hr/EmployeeRecord');
const EmployeeDocument = require('../../models/employee/EmployeeDocument');
const BiometricEnrollment = require('../../models/hr/EmployeeRecord');
const LeavePolicy = require('../../models/hr/LeavePolicy');
const LeaveBalance = require('../../models/hr/LeaveBalance');
const Holiday = require('../../models/hr/EmployeeRecord');
const JobPost = require('../../models/hr/JobPost');
const Interview = require('../../models/hr/EmployeeRecord');
const Offer = require('../../models/hr/EmployeeRecord');
const AppraisalCycle = require('../../models/hr/EmployeeRecord');
const AppraisalReview = require('../../models/hr/EmployeeRecord');
const PolicyDocument = require('../../models/hr/EmployeeRecord');
const PolicyAcknowledgement = require('../../models/hr/EmployeeRecord');
const SupportTicket = require('../../models/common/Notification');
const ExitInterview = require('../../models/hr/EmployeeRecord');
const { ROLES } = require('../../config/roles');
const { getCache, setCache } = require('../../services/cache.service');
const { evaluateAttendanceRecord } = require('../../utils/shiftRules');
const {
  recomputeLeaveBalance,
  ensurePolicy,
  logLeaveAction,
  syncLeaveAttendance,
} = require('../../services/leaveManagement.service');

const enhanceAttendanceRecord = (record) => {
  if (!record) return record;
  const plain = typeof record.toObject === 'function' ? record.toObject() : record;
  const computed = evaluateAttendanceRecord(plain);
  if (computed) {
    plain.status = computed.status;
    plain.workHours = computed.workHours;
    plain.notes = computed.notes;
  }
  return plain;
};

const toNonNegativeNumber = (value, fallback = 0) => {
  const parsed = Number(value);
  if (Number.isFinite(parsed) && parsed >= 0) return parsed;
  return fallback;
};

const normalizeLeaveBalanceMeta = (userDoc) => {
  const metadata = userDoc?.metadata && typeof userDoc.metadata === 'object' ? userDoc.metadata : {};
  const leaveBalance = {
    annual: toNonNegativeNumber(metadata?.leaveBalance?.annual, 24),
    sick: toNonNegativeNumber(metadata?.leaveBalance?.sick, 10),
    casual: toNonNegativeNumber(metadata?.leaveBalance?.casual, 12),
    unpaid: toNonNegativeNumber(metadata?.leaveBalance?.unpaid, 0)
  };
  return { ...metadata, leaveBalance };
};

const asString = (value, fallback = '') => (typeof value === 'string' ? value : fallback);

const normalizeUserProfile = (userDoc) => {
  const metadata = userDoc?.metadata && typeof userDoc.metadata === 'object' ? userDoc.metadata : {};
  const profile = metadata.profile && typeof metadata.profile === 'object' ? metadata.profile : {};
  const profileMeta = metadata.profileMeta && typeof metadata.profileMeta === 'object' ? metadata.profileMeta : {};
  return {
    basic: profile.basic || {},
    professional: profile.professional || {},
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    experience: Array.isArray(profile.experience) ? profile.experience : [],
    education: Array.isArray(profile.education) ? profile.education : [],
    projects: Array.isArray(profile.projects) ? profile.projects : [],
    certifications: Array.isArray(profile.certifications) ? profile.certifications : [],
    achievements: Array.isArray(profile.achievements) ? profile.achievements : [],
    socialLinks: profile.socialLinks || {},
    preferences: profile.preferences || {},
    resumeUrl: asString(profile.resumeUrl),
    metadata: {
      completion: Number(profileMeta.completion || 0),
      lastUpdated: profileMeta.lastUpdated || userDoc?.updatedAt || null,
      viewsCount: Number(profileMeta.viewsCount || 0),
    }
  };
};

const toHrProfileListItem = (userDoc) => {
  const profile = normalizeUserProfile(userDoc);
  return {
    _id: userDoc._id,
    id: userDoc._id,
    firstName: userDoc.firstName,
    lastName: userDoc.lastName,
    email: userDoc.email,
    role: userDoc.role,
    department: userDoc.department,
    isActive: userDoc.isActive,
    profileImage: userDoc.profileImage || '',
    profile
  };
};

const getHrProfilesCacheKey = (query = {}) =>
  `hr:profiles:${JSON.stringify({
    page: Number(query.page || 1),
    limit: Number(query.limit || 10),
    search: String(query.search || ''),
    skills: String(query.skills || ''),
    experience: String(query.experience || ''),
    status: String(query.status || ''),
    role: String(query.role || ''),
    department: String(query.department || '')
  })}`;

const getLeaveBucket = (leaveType = '') => {
  const normalized = String(leaveType).toLowerCase();
  if (normalized === 'annual') return 'annual';
  if (normalized === 'sick') return 'sick';
  if (normalized === 'casual') return 'casual';
  return 'unpaid';
};

const monthRange = (year, month) => {
  const now = new Date();
  const y = Number.isInteger(year) ? year : now.getFullYear();
  const m = Number.isInteger(month) ? month : now.getMonth() + 1;
  const start = new Date(y, m - 1, 1, 0, 0, 0, 0);
  const end = new Date(y, m, 0, 23, 59, 59, 999);
  return { start, end, year: y, month: m };
};

const HR_MANAGEABLE_ROLES = [
  ROLES.EMPLOYEE,
  ROLES.MANAGER,
  ROLES.HR,
  ROLES.FINANCE,
  ROLES.IT,
  ROLES.LAW,
  ROLES.MEDIA,
  ROLES.SALES,
  ROLES.RESEARCH_OPERATOR,
];

const normalizeRoleValue = (role) => String(role || '').trim().toLowerCase();

/**
 * @route   GET /api/dept/hr/dashboard
 * @desc    Get HR dashboard with statistics
 * @access  Private (HR only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const now = new Date();
    const dayStart = new Date(now);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(now);
    dayEnd.setHours(23, 59, 59, 999);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const safeCount = async (fn) => {
      try {
        return await fn();
      } catch {
        return 0;
      }
    };

    const [totalEmployees, activeEmployees, pendingApplicants, pendingLeaves, todayAttendance, openComplaints] = await Promise.all([
      User.countDocuments({ role: ROLES.EMPLOYEE }),
      User.countDocuments({ role: ROLES.EMPLOYEE, isActive: true }),
      safeCount(() => Applicant.countDocuments({ status: 'pending' })),
      Leave.countDocuments({ status: 'pending' }),
      Attendance.countDocuments({ date: { $gte: dayStart, $lte: dayEnd } }),
      safeCount(() => Complaint.countDocuments({ status: { $in: ['pending', 'investigating'] } })),
    ]);

    const [monthAttendanceRecords, tasks] = await Promise.all([
      Attendance.find({ date: { $gte: monthStart, $lte: monthEnd } }).select('status workHours date employee'),
      safeCount(async () =>
        Task.find({})
          .select('status createdAt')
          .sort({ createdAt: -1 })
          .limit(1000)
      ),
    ]);

    const attendanceSummary = {
      month: now.getMonth() + 1,
      year: now.getFullYear(),
      totalRecords: 0,
      present: 0,
      late: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
      totalWorkHours: 0,
    };
    (Array.isArray(monthAttendanceRecords) ? monthAttendanceRecords : []).forEach((record) => {
      const normalized = enhanceAttendanceRecord(record);
      attendanceSummary.totalRecords += 1;
      if (normalized?.status === 'present') attendanceSummary.present += 1;
      if (normalized?.status === 'late') attendanceSummary.late += 1;
      if (normalized?.status === 'absent') attendanceSummary.absent += 1;
      if (normalized?.status === 'half-day') attendanceSummary.halfDay += 1;
      if (normalized?.status === 'on-leave') attendanceSummary.onLeave += 1;
      attendanceSummary.totalWorkHours += Number(normalized?.workHours || 0);
    });
    attendanceSummary.totalWorkHours = Math.round(attendanceSummary.totalWorkHours * 100) / 100;

    const taskRows = Array.isArray(tasks) ? tasks : [];
    const tasksSummary = {
      total: taskRows.length,
      pending: taskRows.filter((item) => item?.status === 'pending').length,
      inProgress: taskRows.filter((item) => ['in-progress', 'in_progress'].includes(String(item?.status || '').toLowerCase())).length,
      review: taskRows.filter((item) => ['review', 'in-review', 'in_review'].includes(String(item?.status || '').toLowerCase())).length,
      completed: taskRows.filter((item) => String(item?.status || '').toLowerCase() === 'completed').length,
      cancelled: taskRows.filter((item) => String(item?.status || '').toLowerCase() === 'cancelled').length,
    };

    const [appraisalCyclesTotal, appraisalCyclesActive, appraisalReviewsTotal, performanceReviewsTotal] = await Promise.all([
      safeCount(() => AppraisalCycle.countDocuments({})),
      safeCount(() => AppraisalCycle.countDocuments({ status: 'active' })),
      safeCount(() => AppraisalReview.countDocuments({})),
      safeCount(() => Performance.countDocuments({})),
    ]);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        employeeSummary: {
          total: totalEmployees,
          active: activeEmployees,
          inactive: Math.max(totalEmployees - activeEmployees, 0)
        },
        pendingApplicants,
        pendingLeaves,
        todayAttendance,
        openComplaints,
        modules: {
          employeeManagement: {
            totalEmployees,
            activeEmployees,
            inactiveEmployees: Math.max(totalEmployees - activeEmployees, 0),
            pendingApplicants,
          },
          attendanceManagement: {
            todayAttendance,
            monthSummary: attendanceSummary,
            trackingMode: 'manual_no_gps',
          },
          taskAndWorkUpdates: tasksSummary,
          performanceAndAppraisal: {
            appraisalCyclesTotal,
            appraisalCyclesActive,
            appraisalReviewsTotal,
            performanceReviewsTotal,
          },
        },
        permissions: ['manage_employees', 'recruitment', 'payroll_access', 'performance_reviews', 'leave_management']
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'HR dashboard error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch HR dashboard',
      details: error.message
    });
  }
};

/**
 * APPLICANTS MANAGEMENT
 */

/**
 * @route   GET /api/dept/hr/applicants
 * @desc    Get all applicants with filtering and pagination
 * @access  Private (HR only)
 */
exports.getApplicants = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, position, department, appliedByUser, job } = req.query;
    const query = {};

    if (status) query.status = status;
    if (position) query.position = new RegExp(position, 'i');
    if (department) query.department = new RegExp(department, 'i');
    if (appliedByUser) query.appliedByUser = appliedByUser;
    if (job) query.job = job;

    const applicants = await Applicant.find(query)
      .populate('reviewedBy', 'firstName lastName email')
      .sort({ appliedDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Applicant.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        applicants,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get applicants error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applicants',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/hr/applicants
 * @desc    Create a new applicant
 * @access  Private (HR only)
 */
exports.createApplicant = async (req, res) => {
  try {
    const payload = { ...req.body };
    if (!payload.appliedByUser && req.user?._id) payload.appliedByUser = req.user._id;
    if (!payload.appliedDate) payload.appliedDate = new Date();
    const applicant = await Applicant.create(payload);

    res.status(201).json({
      success: true,
      message: 'Applicant created successfully',
      data: applicant
    });
  } catch (error) {
    logger.error({ err: error }, 'Create applicant error');
    res.status(500).json({
      success: false,
      error: 'Failed to create applicant',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/hr/applicants/:id
 * @desc    Get applicant by ID
 * @access  Private (HR only)
 */
exports.getApplicantById = async (req, res) => {
  try {
    const applicant = await Applicant.findById(req.params.id)
      .populate('reviewedBy', 'firstName lastName email');

    if (!applicant) {
      return res.status(404).json({
        success: false,
        error: 'Applicant not found'
      });
    }

    res.status(200).json({
      success: true,
      data: applicant
    });
  } catch (error) {
    logger.error({ err: error }, 'Get applicant error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch applicant',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/applicants/:id
 * @desc    Update applicant
 * @access  Private (HR only)
 */
exports.updateApplicant = async (req, res) => {
  try {
    const applicant = await Applicant.findByIdAndUpdate(
      req.params.id,
      { ...req.body, reviewedBy: req.user._id },
      { new: true, runValidators: true }
    );

    if (!applicant) {
      return res.status(404).json({
        success: false,
        error: 'Applicant not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Applicant updated successfully',
      data: applicant
    });
  } catch (error) {
    logger.error({ err: error }, 'Update applicant error');
    res.status(500).json({
      success: false,
      error: 'Failed to update applicant',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/dept/hr/applicants/:id
 * @desc    Delete applicant
 * @access  Private (HR only)
 */
exports.deleteApplicant = async (req, res) => {
  try {
    const applicant = await Applicant.findByIdAndDelete(req.params.id);

    if (!applicant) {
      return res.status(404).json({
        success: false,
        error: 'Applicant not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Applicant deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete applicant error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete applicant',
      details: error.message
    });
  }
};

/**
 * ATTENDANCE MANAGEMENT
 */

/**
 * @route   GET /api/dept/hr/attendance
 * @desc    Get attendance records with filtering
 * @access  Private (HR only)
 */
exports.getAttendance = async (req, res) => {
  try {
    const { page = 1, limit = 10, employee, status, startDate, endDate, month, year } = req.query;
    const query = {};

    if (employee) query.employee = employee;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('approvedBy', 'firstName lastName')
      .sort({ date: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Attendance.countDocuments(query);
    const normalizedRecords = attendance.map(enhanceAttendanceRecord);
    const parsedMonth = month ? parseInt(month, 10) : undefined;
    const parsedYear = year ? parseInt(year, 10) : undefined;
    const { start: monthStart, end: monthEnd, month: summaryMonth, year: summaryYear } = monthRange(
      Number.isInteger(parsedYear) ? parsedYear : undefined,
      Number.isInteger(parsedMonth) ? parsedMonth : undefined
    );
    const monthQuery = {
      ...(employee ? { employee } : {}),
      date: { $gte: monthStart, $lte: monthEnd }
    };
    const monthRecords = await Attendance.find(monthQuery).populate('employee', 'firstName lastName email');
    const monthNormalizedRecords = monthRecords.map(enhanceAttendanceRecord);
    const monthTotal = monthNormalizedRecords.length;
    const monthSummary = {
      year: summaryYear,
      month: summaryMonth,
      totalRecords: monthTotal,
      present: 0,
      late: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
      totalWorkHours: 0
    };
    monthNormalizedRecords.forEach((record) => {
      const statusValue = record?.status;
      if (statusValue === 'present') monthSummary.present += 1;
      if (statusValue === 'late') monthSummary.late += 1;
      if (statusValue === 'absent') monthSummary.absent += 1;
      if (statusValue === 'half-day') monthSummary.halfDay += 1;
      if (statusValue === 'on-leave') monthSummary.onLeave += 1;
      monthSummary.totalWorkHours += Number(record?.workHours || 0);
    });
    monthSummary.totalWorkHours = Math.round(monthSummary.totalWorkHours * 100) / 100;

    res.status(200).json({
      success: true,
      data: {
        attendance: normalizedRecords,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count,
        monthSummary
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get attendance error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/hr/attendance
 * @desc    Create attendance record
 * @access  Private (HR only)
 */
exports.createAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.create({
      ...req.body,
      approvedBy: req.user._id
    });

    await attendance.populate('employee', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Attendance record created successfully',
      data: attendance
    });
  } catch (error) {
    logger.error({ err: error }, 'Create attendance error');
    res.status(500).json({
      success: false,
      error: 'Failed to create attendance record',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/attendance/:id
 * @desc    Update attendance record
 * @access  Private (HR only)
 */
exports.updateAttendance = async (req, res) => {
  try {
    const attendance = await Attendance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName email');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'Attendance record not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Attendance record updated successfully',
      data: attendance
    });
  } catch (error) {
    logger.error({ err: error }, 'Update attendance error');
    res.status(500).json({
      success: false,
      error: 'Failed to update attendance record',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/hr/attendance/employee/:employeeId
 * @desc    Get attendance for specific employee
 * @access  Private (HR only)
 */
exports.getEmployeeAttendance = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    const query = { employee: req.params.employeeId };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
      .sort({ date: -1 })
      .populate('employee', 'firstName lastName email');

    res.status(200).json({
      success: true,
      data: attendance.map(enhanceAttendanceRecord)
    });
  } catch (error) {
    logger.error({ err: error }, 'Get employee attendance error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee attendance',
      details: error.message
    });
  }
};

/**
 * EMPLOYEES MANAGEMENT
 */

/**
 * @route   GET /api/dept/hr/employees
 * @desc    Get all employees
 * @access  Private (HR only)
 */
exports.getEmployees = async (req, res) => {
  try {
    const { page = 1, limit = 10, role, department, isActive, search } = req.query;
    const query = {};

    if (role) query.role = role;
    if (department) query.department = new RegExp(department, 'i');
    if (isActive !== undefined) query.isActive = isActive === 'true';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }

    const employees = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();
    const normalizedEmployees = employees.map((employeeDoc) => {
      const employee = typeof employeeDoc.toObject === 'function' ? employeeDoc.toObject() : employeeDoc;
      employee.metadata = normalizeLeaveBalanceMeta(employee);
      return employee;
    });

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        employees: normalizedEmployees,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'HR employees error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      details: error.message
    });
  }
};

/**
 * LEAVE MANAGEMENT
 */

/**
 * @route   POST /api/dept/hr/leave/request
 * @desc    Request leave for current HR user
 * @access  Private (HR only)
 */
exports.requestLeave = async (req, res) => {
  try {
    const leave = await Leave.create({
      ...req.body,
      employee: req.user._id
    });

    await leave.populate('employee', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: leave
    });
  } catch (error) {
    logger.error({ err: error }, 'HR request leave error');
    res.status(500).json({
      success: false,
      error: 'Failed to request leave',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/hr/leave
 * @desc    Get all leave requests
 * @access  Private (HR only)
 */
exports.getLeaveRequests = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, leaveType, employee, year } = req.query;
    const query = {};

    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (employee) query.employee = employee;
    if (year) query.year = Number(year);

    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('approvedBy', 'firstName lastName')
      .populate('managerApprovedBy', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Leave.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        leaves,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get leave requests error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave requests',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/leave/:id/approve
 * @desc    Approve leave request
 * @access  Private (HR only)
 */
exports.approveLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id).populate('employee', 'firstName lastName email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    if (!['pending', 'manager-approved'].includes(leave.status)) {
      return res.status(400).json({
        success: false,
        error: 'Leave request is not awaiting HR approval'
      });
    }

    if (leave.managerApprovalStatus === 'pending') {
      leave.managerApprovalStatus = 'bypassed';
    }

    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedDate = Date.now();
    await leave.save();
    await syncLeaveAttendance(leave);
    await logLeaveAction({
      leave,
      reviewer: req.user._id,
      role: req.user.role || 'hr',
      action: 'hr-approved',
    });
    const { balance } = await recomputeLeaveBalance(leave.employee?._id || leave.employee, leave.year || new Date(leave.startDate).getFullYear());

    res.status(200).json({
      success: true,
      message: 'Leave request approved successfully',
      data: leave,
      meta: {
        leaveBalance: balance
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Approve leave error');
    res.status(500).json({
      success: false,
      error: 'Failed to approve leave request',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/leave/:id/reject
 * @desc    Reject leave request
 * @access  Private (HR only)
 */
exports.rejectLeave = async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    const leave = await Leave.findById(req.params.id).populate('employee', 'firstName lastName email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

    if (!['pending', 'manager-approved'].includes(leave.status)) {
      return res.status(400).json({
        success: false,
        error: 'Leave request is not awaiting HR approval'
      });
    }

    leave.status = 'rejected';
    leave.approvedBy = req.user._id;
    leave.approvedDate = Date.now();
    leave.rejectionReason = rejectionReason;
    if (leave.managerApprovalStatus === 'pending') {
      leave.managerApprovalStatus = 'bypassed';
    }
    await leave.save();
    await logLeaveAction({
      leave,
      reviewer: req.user._id,
      role: req.user.role || 'hr',
      action: 'hr-rejected',
      comment: rejectionReason,
    });
    const { balance } = await recomputeLeaveBalance(leave.employee?._id || leave.employee, leave.year || new Date(leave.startDate).getFullYear());

    res.status(200).json({
      success: true,
      message: 'Leave request rejected',
      data: leave,
      meta: {
        leaveBalance: balance
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Reject leave error');
    res.status(500).json({
      success: false,
      error: 'Failed to reject leave request',
      details: error.message
    });
  }
};

/**
 * NOTICES MANAGEMENT
 */

/**
 * @route   GET /api/dept/hr/notices
 * @desc    Get all notices
 * @access  Private (HR only)
 */
exports.getNotices = async (req, res) => {
  try {
    const { page = 1, limit = 10, type, priority, isActive } = req.query;
    const query = {};

    if (type) query.type = type;
    if (priority) query.priority = priority;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const notices = await Notice.find(query)
      .populate('publishedBy', 'firstName lastName email')
      .sort({ publishDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Notice.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        notices,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get notices error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notices',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/hr/notices
 * @desc    Create a new notice
 * @access  Private (HR only)
 */
exports.createNotice = async (req, res) => {
  try {
    const notice = await Notice.create({
      ...req.body,
      publishedBy: req.user._id
    });

    await notice.populate('publishedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Notice created successfully',
      data: notice
    });
  } catch (error) {
    logger.error({ err: error }, 'Create notice error');
    res.status(500).json({
      success: false,
      error: 'Failed to create notice',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/notices/:id
 * @desc    Update notice
 * @access  Private (HR only)
 */
exports.updateNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('publishedBy', 'firstName lastName email');

    if (!notice) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notice updated successfully',
      data: notice
    });
  } catch (error) {
    logger.error({ err: error }, 'Update notice error');
    res.status(500).json({
      success: false,
      error: 'Failed to update notice',
      details: error.message
    });
  }
};

/**
 * @route   DELETE /api/dept/hr/notices/:id
 * @desc    Delete notice
 * @access  Private (HR only)
 */
exports.deleteNotice = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndDelete(req.params.id);

    if (!notice) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notice deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete notice error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete notice',
      details: error.message
    });
  }
};

/**
 * PERFORMANCE MANAGEMENT
 */

/**
 * @route   GET /api/dept/hr/performance
 * @desc    Get all performance reviews
 * @access  Private (HR only)
 */
exports.getPerformanceReviews = async (req, res) => {
  try {
    const { page = 1, limit = 10, employee, reviewType, status } = req.query;
    const query = {};

    if (employee) query.employee = employee;
    if (reviewType) query.reviewType = reviewType;
    if (status) query.status = status;

    const reviews = await Performance.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('reviewer', 'firstName lastName email')
      .sort({ 'reviewPeriod.endDate': -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Performance.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get performance reviews error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance reviews',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/hr/performance
 * @desc    Create performance review
 * @access  Private (HR only)
 */
exports.createPerformanceReview = async (req, res) => {
  try {
    const review = await Performance.create({
      ...req.body,
      reviewer: req.user._id
    });

    await review.populate('employee', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Performance review created successfully',
      data: review
    });
  } catch (error) {
    logger.error({ err: error }, 'Create performance review error');
    res.status(500).json({
      success: false,
      error: 'Failed to create performance review',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/performance/:id
 * @desc    Update performance review
 * @access  Private (HR only)
 */
exports.updatePerformanceReview = async (req, res) => {
  try {
    const review = await Performance.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName email')
      .populate('reviewer', 'firstName lastName email');

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Performance review not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Performance review updated successfully',
      data: review
    });
  } catch (error) {
    logger.error({ err: error }, 'Update performance review error');
    res.status(500).json({
      success: false,
      error: 'Failed to update performance review',
      details: error.message
    });
  }
};

/**
 * TASK MANAGEMENT
 */
exports.getTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, assignee, search } = req.query;
    const filters = {};

    if (status) filters.status = status;
    if (priority) filters.priority = priority;
    if (assignee) filters.assignedTo = assignee;
    if (search) {
      filters.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const tasks = await Task.find(filters)
      .populate('assignedTo', 'firstName lastName email department')
      .populate('assignedBy', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Task.countDocuments(filters);

    res.status(200).json({
      success: true,
      data: {
        tasks,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'HR get tasks error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: error.message
    });
  }
};

exports.createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, dueDate, priority, estimatedHours, status, progress } = req.body;

    if (!title || !description || !assignedTo || !dueDate) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: title, description, assignedTo, and dueDate'
      });
    }

    const task = await Task.create({
      title: title.trim(),
      description: description.trim(),
      assignedTo,
      assignedBy: req.user._id,
      dueDate,
      priority,
      estimatedHours,
      status,
      progress
    });

    await task.populate('assignedTo', 'firstName lastName email department');
    await task.populate('assignedBy', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Task created successfully',
      data: task
    });
  } catch (error) {
    logger.error({ err: error }, 'HR create task error');
    res.status(500).json({
      success: false,
      error: 'Failed to create task',
      details: error.message
    });
  }
};

exports.updateTask = async (req, res) => {
  try {
    const { title, description, priority, status, dueDate, progress, assignedTo, estimatedHours, actualHours } = req.body;

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid task ID format'
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    if (assignedTo) task.assignedTo = assignedTo;
    if (title) task.title = title.trim();
    if (description) task.description = description.trim();
    if (priority) task.priority = priority;
    if (status) task.status = status;
    if (dueDate) task.dueDate = dueDate;
    if (progress !== undefined) task.progress = progress;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (actualHours !== undefined) task.actualHours = actualHours;

    if (status === 'completed' && !task.completedDate) {
      task.completedDate = Date.now();
    }

    await task.save();
    await task.populate('assignedTo', 'firstName lastName email department');
    await task.populate('assignedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Task updated successfully',
      data: task
    });
  } catch (error) {
    logger.error({ err: error }, 'HR update task error');
    res.status(500).json({
      success: false,
      error: 'Failed to update task',
      details: error.message
    });
  }
};

exports.closeTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    task.status = 'completed';
    task.progress = 100;
    task.completedDate = Date.now();
    await task.save();

    await task.populate('assignedTo', 'firstName lastName email department');
    await task.populate('assignedBy', 'firstName lastName email');

    res.status(200).json({
      success: true,
      message: 'Task closed successfully',
      data: task
    });
  } catch (error) {
    logger.error({ err: error }, 'HR close task error');
    res.status(500).json({
      success: false,
      error: 'Failed to close task',
      details: error.message
    });
  }
};

/**
 * WORK REPORTS MANAGEMENT
 */

/**
 * @route   GET /api/dept/hr/work-reports
 * @desc    Get all work reports
 * @access  Private (HR only)
 */
exports.getWorkReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, employee, reportType, status, startDate, endDate, uniqueTask } = req.query;
    const query = {};

    if (employee) query.employee = employee;
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.reportDate = {};
      if (startDate) query.reportDate.$gte = new Date(startDate);
      if (endDate) query.reportDate.$lte = new Date(endDate);
    }

    if (uniqueTask === 'true') {
      const skip = (page - 1) * limit;
      const basePipeline = [
        { $match: query },
        { $sort: { reportDate: -1, createdAt: -1 } },
        {
          $group: {
            _id: { $ifNull: ['$taskId', '$_id'] },
            doc: { $first: '$$ROOT' }
          }
        },
        { $replaceRoot: { newRoot: '$doc' } }
      ];

      const reports = await WorkReport.aggregate([
        ...basePipeline,
        { $sort: { reportDate: -1, createdAt: -1 } },
        { $skip: skip },
        { $limit: Number(limit) }
      ]);

      await WorkReport.populate(reports, [
        { path: 'employee', select: 'firstName lastName email department' },
        { path: 'reviewedBy', select: 'firstName lastName' },
        { path: 'project', select: 'name projectCode' }
      ]);

      const countResult = await WorkReport.aggregate([
        ...basePipeline,
        { $count: 'total' }
      ]);
      const count = countResult?.[0]?.total || 0;

      return res.status(200).json({
        success: true,
        data: {
          reports,
          totalPages: Math.ceil(count / limit),
          currentPage: parseInt(page),
          total: count
        }
      });
    }

    const reports = await WorkReport.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('reviewedBy', 'firstName lastName')
      .populate('project', 'name projectCode')
      .sort({ reportDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await WorkReport.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reports,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get work reports error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch work reports',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/work-reports/:id/review
 * @desc    Review work report
 * @access  Private (HR only)
 */
exports.reviewWorkReport = async (req, res) => {
  try {
    const { status, feedback } = req.body;

    const report = await WorkReport.findByIdAndUpdate(
      req.params.id,
      {
        status,
        feedback,
        reviewedBy: req.user._id,
        reviewedDate: Date.now()
      },
      { new: true }
    )
      .populate('employee', 'firstName lastName email')
      .populate('reviewedBy', 'firstName lastName');

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Work report not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Work report reviewed successfully',
      data: report
    });
  } catch (error) {
    logger.error({ err: error }, 'Review work report error');
    res.status(500).json({
      success: false,
      error: 'Failed to review work report',
      details: error.message
    });
  }
};

/**
 * COMPLAINTS & SOLUTIONS MANAGEMENT
 */

/**
 * @route   GET /api/dept/hr/complaints
 * @desc    Get all complaints
 * @access  Private (HR only)
 */
exports.getComplaints = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, category, priority } = req.query;
    const query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (priority) query.priority = priority;

    const complaints = await Complaint.find(query)
      .populate('complainant', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .populate('againstPerson', 'firstName lastName')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Complaint.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        complaints,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get complaints error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaints',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/hr/complaints/:id
 * @desc    Get complaint by ID
 * @access  Private (HR only)
 */
exports.getComplaintById = async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate('complainant', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .populate('againstPerson', 'firstName lastName')
      .populate('comments.commentedBy', 'firstName lastName');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      data: complaint
    });
  } catch (error) {
    logger.error({ err: error }, 'Get complaint error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch complaint',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/complaints/:id/assign
 * @desc    Assign complaint to HR personnel
 * @access  Private (HR only)
 */
exports.assignComplaint = async (req, res) => {
  try {
    const { assignedTo } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      { assignedTo, status: 'investigating' },
      { new: true }
    )
      .populate('complainant', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Complaint assigned successfully',
      data: complaint
    });
  } catch (error) {
    logger.error({ err: error }, 'Assign complaint error');
    res.status(500).json({
      success: false,
      error: 'Failed to assign complaint',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/hr/complaints/:id/resolve
 * @desc    Resolve complaint
 * @access  Private (HR only)
 */
exports.resolveComplaint = async (req, res) => {
  try {
    const { solution, actionTaken } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        solution,
        actionTaken,
        resolvedDate: Date.now()
      },
      { new: true }
    )
      .populate('complainant', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Complaint resolved successfully',
      data: complaint
    });
  } catch (error) {
    logger.error({ err: error }, 'Resolve complaint error');
    res.status(500).json({
      success: false,
      error: 'Failed to resolve complaint',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/hr/complaints/:id/comment
 * @desc    Add comment to complaint
 * @access  Private (HR only)
 */
exports.addComplaintComment = async (req, res) => {
  try {
    const { comment } = req.body;

    const complaint = await Complaint.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            commentedBy: req.user._id,
            comment,
            commentedAt: Date.now()
          }
        }
      },
      { new: true }
    )
      .populate('complainant', 'firstName lastName email')
      .populate('comments.commentedBy', 'firstName lastName');

    if (!complaint) {
      return res.status(404).json({
        success: false,
        error: 'Complaint not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: complaint
    });
  } catch (error) {
    logger.error({ err: error }, 'Add comment error');
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      details: error.message
    });
  }
};

/**
 * EMPLOYEE MANAGEMENT (HR CRUD)
 */
exports.createEmployee = async (req, res) => {
  try {
    const { email, password, role, firstName, lastName, phone, department } = req.body;

    if (!email || !password || !role || !firstName || !lastName) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: email, password, role, firstName, and lastName are required'
      });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    const normalizedRole = normalizeRoleValue(role);
    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(normalizedRole)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
      });
    }

    const creatorRole = normalizeRoleValue(req.user?.role);
    if (creatorRole === ROLES.HR && !HR_MANAGEABLE_ROLES.includes(normalizedRole)) {
      return res.status(403).json({
        success: false,
        error: 'HR cannot create admin or CEO accounts'
      });
    }

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'User with this email already exists'
      });
    }

    const user = await User.create({
      email: normalizedEmail,
      password,
      role: normalizedRole,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      phone: phone?.trim(),
      department: department?.trim()
    });

    res.status(201).json({
      success: true,
      message: 'Employee created successfully',
      data: user.toSafeObject()
    });
  } catch (error) {
    logger.error({ err: error }, 'Create employee error');
    res.status(500).json({
      success: false,
      error: 'Failed to create employee',
      details: error.message
    });
  }
};

exports.updateEmployee = async (req, res) => {
  try {
    const { role, firstName, lastName, phone, department, isActive } = req.body;

    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    if (role) {
      const normalizedRole = normalizeRoleValue(role);
      const validRoles = Object.values(ROLES);
      if (!validRoles.includes(normalizedRole)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
        });
      }
      const actorRole = normalizeRoleValue(req.user?.role);
      if (actorRole === ROLES.HR && !HR_MANAGEABLE_ROLES.includes(normalizedRole)) {
        return res.status(403).json({
          success: false,
          error: 'HR cannot assign admin or CEO roles'
        });
      }
      user.role = normalizedRole;
    }
    if (firstName) user.firstName = firstName.trim();
    if (lastName) user.lastName = lastName.trim();
    if (phone !== undefined) user.phone = phone?.trim();
    if (department !== undefined) user.department = department?.trim();
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Employee updated successfully',
      data: user.toSafeObject()
    });
  } catch (error) {
    logger.error({ err: error }, 'Update employee error');
    res.status(500).json({
      success: false,
      error: 'Failed to update employee',
      details: error.message
    });
  }
};

exports.toggleEmployeeStatus = async (req, res) => {
  try {
    if (!req.params.id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid user ID format'
      });
    }

    const employee = await User.findById(req.params.id);
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    if (req.user && req.user.id === req.params.id && employee.isActive) {
      return res.status(400).json({
        success: false,
        error: 'You cannot deactivate your own account'
      });
    }

    employee.isActive = !employee.isActive;
    await employee.save();

    res.status(200).json({
      success: true,
      message: `Employee ${employee.isActive ? 'activated' : 'deactivated'} successfully`,
      data: employee.toSafeObject()
    });
  } catch (error) {
    logger.error({ err: error }, 'Toggle employee status error');
    res.status(500).json({
      success: false,
      error: 'Failed to toggle employee status',
      details: error.message
    });
  }
};

/**
 * DEPARTMENT MANAGEMENT
 */
exports.getDepartments = async (req, res) => {
  try {
    const { isActive } = req.query;
    const query = {};
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const departments = await Department.find(query).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: departments
    });
  } catch (error) {
    logger.error({ err: error }, 'Get departments error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch departments',
      details: error.message
    });
  }
};

exports.createDepartment = async (req, res) => {
  try {
    const department = await Department.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Department created successfully',
      data: department
    });
  } catch (error) {
    logger.error({ err: error }, 'Create department error');
    res.status(500).json({
      success: false,
      error: 'Failed to create department',
      details: error.message
    });
  }
};

exports.updateDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Department updated successfully',
      data: department
    });
  } catch (error) {
    logger.error({ err: error }, 'Update department error');
    res.status(500).json({
      success: false,
      error: 'Failed to update department',
      details: error.message
    });
  }
};

exports.deleteDepartment = async (req, res) => {
  try {
    const department = await Department.findByIdAndDelete(req.params.id);
    if (!department) {
      return res.status(404).json({
        success: false,
        error: 'Department not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Department deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete department error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete department',
      details: error.message
    });
  }
};

/**
 * DESIGNATION MANAGEMENT
 */
exports.getDesignations = async (req, res) => {
  try {
    const { department, isActive } = req.query;
    const query = {};
    if (department) query.department = new RegExp(department, 'i');
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const designations = await Designation.find(query).sort({ name: 1 });
    res.status(200).json({
      success: true,
      data: designations
    });
  } catch (error) {
    logger.error({ err: error }, 'Get designations error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch designations',
      details: error.message
    });
  }
};

exports.createDesignation = async (req, res) => {
  try {
    const designation = await Designation.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Designation created successfully',
      data: designation
    });
  } catch (error) {
    logger.error({ err: error }, 'Create designation error');
    res.status(500).json({
      success: false,
      error: 'Failed to create designation',
      details: error.message
    });
  }
};

exports.updateDesignation = async (req, res) => {
  try {
    const designation = await Designation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!designation) {
      return res.status(404).json({
        success: false,
        error: 'Designation not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Designation updated successfully',
      data: designation
    });
  } catch (error) {
    logger.error({ err: error }, 'Update designation error');
    res.status(500).json({
      success: false,
      error: 'Failed to update designation',
      details: error.message
    });
  }
};

exports.deleteDesignation = async (req, res) => {
  try {
    const designation = await Designation.findByIdAndDelete(req.params.id);
    if (!designation) {
      return res.status(404).json({
        success: false,
        error: 'Designation not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Designation deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete designation error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete designation',
      details: error.message
    });
  }
};

/**
 * EMPLOYEE DOCUMENTS
 */
exports.getEmployeeDocuments = async (req, res) => {
  try {
    const { employee, documentType } = req.query;
    const query = {};
    if (employee) query.employee = employee;
    if (documentType) query.documentType = documentType;

    const documents = await EmployeeDocument.find(query)
      .populate('employee', 'firstName lastName email department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: documents
    });
  } catch (error) {
    logger.error({ err: error }, 'Get employee documents error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee documents',
      details: error.message
    });
  }
};

exports.createEmployeeDocument = async (req, res) => {
  try {
    const document = await EmployeeDocument.create(req.body);
    await document.populate('employee', 'firstName lastName email');
    res.status(201).json({
      success: true,
      message: 'Employee document created successfully',
      data: document
    });
  } catch (error) {
    logger.error({ err: error }, 'Create employee document error');
    res.status(500).json({
      success: false,
      error: 'Failed to create employee document',
      details: error.message
    });
  }
};

exports.updateEmployeeDocument = async (req, res) => {
  try {
    const document = await EmployeeDocument.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName email');
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Employee document not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Employee document updated successfully',
      data: document
    });
  } catch (error) {
    logger.error({ err: error }, 'Update employee document error');
    res.status(500).json({
      success: false,
      error: 'Failed to update employee document',
      details: error.message
    });
  }
};

exports.deleteEmployeeDocument = async (req, res) => {
  try {
    const document = await EmployeeDocument.findByIdAndDelete(req.params.id);
    if (!document) {
      return res.status(404).json({
        success: false,
        error: 'Employee document not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Employee document deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete employee document error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete employee document',
      details: error.message
    });
  }
};

/**
 * BIOMETRIC ENROLLMENT
 */
exports.getBiometricEnrollments = async (req, res) => {
  try {
    const { employee, status } = req.query;
    const query = {};
    if (employee) query.employee = employee;
    if (status) query.status = status;

    const enrollments = await BiometricEnrollment.find(query)
      .populate('employee', 'firstName lastName email department')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: enrollments
    });
  } catch (error) {
    logger.error({ err: error }, 'Get biometric enrollments error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch biometric enrollments',
      details: error.message
    });
  }
};

exports.createBiometricEnrollment = async (req, res) => {
  try {
    const enrollment = await BiometricEnrollment.create(req.body);
    await enrollment.populate('employee', 'firstName lastName email');
    res.status(201).json({
      success: true,
      message: 'Biometric enrollment created successfully',
      data: enrollment
    });
  } catch (error) {
    logger.error({ err: error }, 'Create biometric enrollment error');
    res.status(500).json({
      success: false,
      error: 'Failed to create biometric enrollment',
      details: error.message
    });
  }
};

exports.updateBiometricEnrollment = async (req, res) => {
  try {
    const enrollment = await BiometricEnrollment.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('employee', 'firstName lastName email');
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Biometric enrollment not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Biometric enrollment updated successfully',
      data: enrollment
    });
  } catch (error) {
    logger.error({ err: error }, 'Update biometric enrollment error');
    res.status(500).json({
      success: false,
      error: 'Failed to update biometric enrollment',
      details: error.message
    });
  }
};

exports.deleteBiometricEnrollment = async (req, res) => {
  try {
    const enrollment = await BiometricEnrollment.findByIdAndDelete(req.params.id);
    if (!enrollment) {
      return res.status(404).json({
        success: false,
        error: 'Biometric enrollment not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Biometric enrollment deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete biometric enrollment error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete biometric enrollment',
      details: error.message
    });
  }
};

/**
 * LEAVE POLICIES
 */
exports.getLeavePolicies = async (req, res) => {
  try {
    const { year, isActive } = req.query;
    const query = {};
    if (year) query.year = Number(year);
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const policies = await LeavePolicy.find(query).sort({ year: -1, createdAt: -1 });
    res.status(200).json({
      success: true,
      data: policies
    });
  } catch (error) {
    logger.error({ err: error }, 'Get leave policies error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave policies',
      details: error.message
    });
  }
};

exports.createLeavePolicy = async (req, res) => {
  try {
    const { year } = req.body || {};
    await ensurePolicy(Number(year) || new Date().getFullYear());
    const policy = await LeavePolicy.findOneAndUpdate(
      { year: Number(year) || new Date().getFullYear() },
      req.body,
      { new: true, runValidators: true }
    );
    res.status(201).json({
      success: true,
      message: 'Leave policy created successfully',
      data: policy
    });
  } catch (error) {
    logger.error({ err: error }, 'Create leave policy error');
    res.status(500).json({
      success: false,
      error: 'Failed to create leave policy',
      details: error.message
    });
  }
};

exports.updateLeavePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Leave policy not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Leave policy updated successfully',
      data: policy
    });
  } catch (error) {
    logger.error({ err: error }, 'Update leave policy error');
    res.status(500).json({
      success: false,
      error: 'Failed to update leave policy',
      details: error.message
    });
  }
};

exports.deleteLeavePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.findByIdAndDelete(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Leave policy not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Leave policy deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete leave policy error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete leave policy',
      details: error.message
    });
  }
};

exports.getUserProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10, search, skills, experience, status, role, department } = req.query;
    const cacheKey = getHrProfilesCacheKey(req.query);
    const cached = await getCache(cacheKey);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    const query = {};

    if (role) query.role = role;
    if (department) query.department = new RegExp(department, 'i');
    if (status === 'active' || status === 'inactive') query.isActive = status === 'active';
    if (search) {
      query.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } }
      ];
    }
    if (skills) query['metadata.profile.skills.name'] = new RegExp(skills, 'i');
    if (experience) {
      const expNum = Number(experience);
      if (Number.isFinite(expNum) && expNum >= 0) {
        query['metadata.profile.professional.yearsOfExperience'] = { $gte: expNum };
      }
    }

    const users = await User.find(query)
      .select('firstName lastName email role department isActive profileImage metadata')
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .skip((Number(page) - 1) * Number(limit))
      .lean();

    const total = await User.countDocuments(query);
    const mappedUsers = users.map((u) => {
      const row = toHrProfileListItem(u);
      return {
        ...row,
        profileScore: Number(row?.profile?.metadata?.completion || 0),
      };
    });
    const payload = {
      users: mappedUsers,
      total,
      totalPages: Math.ceil(total / Number(limit)),
      currentPage: Number(page)
    };
    await setCache(cacheKey, payload, 90);
    return res.status(200).json({ success: true, data: payload });
  } catch (error) {
    logger.error({ err: error }, 'HR get user profiles error');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profiles',
      details: error.message
    });
  }
};

exports.getUserProfileById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id)
      .select('firstName lastName email role department isActive profileImage metadata createdAt')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const hrNotes = await ActivityLog.find({
      action: 'hr.user_note_added',
      targetId: String(user._id)
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .select('metadata.note createdAt actor')
      .populate('actor', 'firstName lastName email role')
      .lean();

    return res.status(200).json({
      success: true,
      data: {
        user: toHrProfileListItem(user),
        sensitive: {
          accountStatus: user.metadata?.accountStatus || null
        },
        hrNotes
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'HR get user profile detail error');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch user profile',
      details: error.message
    });
  }
};

exports.addUserInternalNote = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }
    const note = typeof req.body?.note === 'string' ? req.body.note.trim() : '';
    if (!note) {
      return res.status(400).json({ success: false, error: 'Note is required' });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const metadata = user.metadata && typeof user.metadata === 'object' ? user.metadata : {};
    const hrMeta = metadata.hr && typeof metadata.hr === 'object' ? metadata.hr : {};
    const notes = Array.isArray(hrMeta.notes) ? hrMeta.notes : [];
    notes.push({
      note,
      createdAt: new Date(),
      createdBy: req.user?.id || req.user?._id || null
    });
    user.metadata = {
      ...metadata,
      hr: {
        ...hrMeta,
        notes: notes.slice(-200)
      }
    };
    await user.save();

    await ActivityLog.create({
      actor: req.user?._id || req.user?.id,
      user: user._id,
      action: 'hr.user_note_added',
      module: 'hr',
      targetType: 'User',
      targetId: String(user._id),
      metadata: { note },
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });

    return res.status(200).json({
      success: true,
      message: 'Internal note added successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'HR add user internal note error');
    return res.status(500).json({
      success: false,
      error: 'Failed to add internal note',
      details: error.message
    });
  }
};

exports.getLeaveBalances = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const employeeId = req.query.employeeId;

    if (employeeId) {
      const { balance, policy } = await recomputeLeaveBalance(employeeId, year);
      return res.status(200).json({
        success: true,
        data: {
          year,
          policy,
          items: [balance],
        }
      });
    }

    const balances = await LeaveBalance.find({ year })
      .populate('employee', 'firstName lastName email department')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        year,
        items: balances,
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get leave balances error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave balances',
      details: error.message
    });
  }
};

/**
 * HOLIDAYS
 */
exports.getHolidays = async (req, res) => {
  try {
    const { department, startDate, endDate } = req.query;
    const query = {};
    if (department) query.department = new RegExp(department, 'i');
    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const holidays = await Holiday.find(query).sort({ date: 1 });
    res.status(200).json({
      success: true,
      data: holidays
    });
  } catch (error) {
    logger.error({ err: error }, 'Get holidays error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch holidays',
      details: error.message
    });
  }
};

exports.createHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Holiday created successfully',
      data: holiday
    });
  } catch (error) {
    logger.error({ err: error }, 'Create holiday error');
    res.status(500).json({
      success: false,
      error: 'Failed to create holiday',
      details: error.message
    });
  }
};

exports.updateHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Holiday updated successfully',
      data: holiday
    });
  } catch (error) {
    logger.error({ err: error }, 'Update holiday error');
    res.status(500).json({
      success: false,
      error: 'Failed to update holiday',
      details: error.message
    });
  }
};

exports.deleteHoliday = async (req, res) => {
  try {
    const holiday = await Holiday.findByIdAndDelete(req.params.id);
    if (!holiday) {
      return res.status(404).json({
        success: false,
        error: 'Holiday not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Holiday deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete holiday error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete holiday',
      details: error.message
    });
  }
};

/**
 * JOB POSTS
 */
exports.getJobPosts = async (req, res) => {
  try {
    const { status, department } = req.query;
    const query = {};
    if (status) query.status = status;
    if (department) query.department = new RegExp(department, 'i');

    const jobs = await JobPost.find(query)
      .populate('createdBy', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: jobs
    });
  } catch (error) {
    logger.error({ err: error }, 'Get job posts error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch job posts',
      details: error.message
    });
  }
};

exports.createJobPost = async (req, res) => {
  try {
    const payload = {
      ...req.body,
      createdBy: req.user._id
    };
    if (payload.status === 'open' && !payload.postedDate) {
      payload.postedDate = new Date();
    }
    const job = await JobPost.create(payload);
    await job.populate('createdBy', 'firstName lastName email');
    res.status(201).json({
      success: true,
      message: 'Job post created successfully',
      data: job
    });
  } catch (error) {
    logger.error({ err: error }, 'Create job post error');
    res.status(500).json({
      success: false,
      error: 'Failed to create job post',
      details: error.message
    });
  }
};

exports.updateJobPost = async (req, res) => {
  try {
    const job = await JobPost.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('createdBy', 'firstName lastName email');
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Job post updated successfully',
      data: job
    });
  } catch (error) {
    logger.error({ err: error }, 'Update job post error');
    res.status(500).json({
      success: false,
      error: 'Failed to update job post',
      details: error.message
    });
  }
};

exports.deleteJobPost = async (req, res) => {
  try {
    const job = await JobPost.findByIdAndDelete(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        error: 'Job post not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Job post deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete job post error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete job post',
      details: error.message
    });
  }
};

/**
 * INTERVIEWS
 */
exports.getInterviews = async (req, res) => {
  try {
    const { status, applicant, startDate, endDate } = req.query;
    const query = {};
    if (status) query.status = status;
    if (applicant) query.applicant = applicant;
    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }

    const interviews = await Interview.find(query)
      .populate('applicant', 'firstName lastName email position')
      .populate('panel', 'firstName lastName email')
      .sort({ scheduledAt: -1 });

    res.status(200).json({
      success: true,
      data: interviews
    });
  } catch (error) {
    logger.error({ err: error }, 'Get interviews error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch interviews',
      details: error.message
    });
  }
};

exports.createInterview = async (req, res) => {
  try {
    const interview = await Interview.create(req.body);
    await interview.populate('applicant', 'firstName lastName email position');
    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: interview
    });
  } catch (error) {
    logger.error({ err: error }, 'Create interview error');
    res.status(500).json({
      success: false,
      error: 'Failed to schedule interview',
      details: error.message
    });
  }
};

exports.updateInterview = async (req, res) => {
  try {
    const interview = await Interview.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('applicant', 'firstName lastName email position')
      .populate('panel', 'firstName lastName email');

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Interview updated successfully',
      data: interview
    });
  } catch (error) {
    logger.error({ err: error }, 'Update interview error');
    res.status(500).json({
      success: false,
      error: 'Failed to update interview',
      details: error.message
    });
  }
};

exports.deleteInterview = async (req, res) => {
  try {
    const interview = await Interview.findByIdAndDelete(req.params.id);
    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Interview not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Interview deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete interview error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete interview',
      details: error.message
    });
  }
};

/**
 * OFFERS
 */
exports.getOffers = async (req, res) => {
  try {
    const { status, applicant } = req.query;
    const query = {};
    if (status) query.status = status;
    if (applicant) query.applicant = applicant;

    const offers = await Offer.find(query)
      .populate('applicant', 'firstName lastName email position')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: offers
    });
  } catch (error) {
    logger.error({ err: error }, 'Get offers error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch offers',
      details: error.message
    });
  }
};

exports.createOffer = async (req, res) => {
  try {
    const offer = await Offer.create(req.body);
    await offer.populate('applicant', 'firstName lastName email position');
    res.status(201).json({
      success: true,
      message: 'Offer created successfully',
      data: offer
    });
  } catch (error) {
    logger.error({ err: error }, 'Create offer error');
    res.status(500).json({
      success: false,
      error: 'Failed to create offer',
      details: error.message
    });
  }
};

exports.updateOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('applicant', 'firstName lastName email position');
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Offer updated successfully',
      data: offer
    });
  } catch (error) {
    logger.error({ err: error }, 'Update offer error');
    res.status(500).json({
      success: false,
      error: 'Failed to update offer',
      details: error.message
    });
  }
};

exports.deleteOffer = async (req, res) => {
  try {
    const offer = await Offer.findByIdAndDelete(req.params.id);
    if (!offer) {
      return res.status(404).json({
        success: false,
        error: 'Offer not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Offer deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete offer error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete offer',
      details: error.message
    });
  }
};

/**
 * APPRAISAL CYCLES
 */
exports.getAppraisalCycles = async (req, res) => {
  try {
    const { status } = req.query;
    const query = {};
    if (status) query.status = status;

    const cycles = await AppraisalCycle.find(query).sort({ startDate: -1 });
    res.status(200).json({
      success: true,
      data: cycles
    });
  } catch (error) {
    logger.error({ err: error }, 'Get appraisal cycles error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appraisal cycles',
      details: error.message
    });
  }
};

exports.createAppraisalCycle = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Appraisal cycle created successfully',
      data: cycle
    });
  } catch (error) {
    logger.error({ err: error }, 'Create appraisal cycle error');
    res.status(500).json({
      success: false,
      error: 'Failed to create appraisal cycle',
      details: error.message
    });
  }
};

exports.updateAppraisalCycle = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!cycle) {
      return res.status(404).json({
        success: false,
        error: 'Appraisal cycle not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Appraisal cycle updated successfully',
      data: cycle
    });
  } catch (error) {
    logger.error({ err: error }, 'Update appraisal cycle error');
    res.status(500).json({
      success: false,
      error: 'Failed to update appraisal cycle',
      details: error.message
    });
  }
};

exports.deleteAppraisalCycle = async (req, res) => {
  try {
    const cycle = await AppraisalCycle.findByIdAndDelete(req.params.id);
    if (!cycle) {
      return res.status(404).json({
        success: false,
        error: 'Appraisal cycle not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Appraisal cycle deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete appraisal cycle error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete appraisal cycle',
      details: error.message
    });
  }
};

/**
 * APPRAISAL REVIEWS
 */
exports.getAppraisalReviews = async (req, res) => {
  try {
    const { status, employee, cycle } = req.query;
    const query = {};
    if (status) query.status = status;
    if (employee) query.employee = employee;
    if (cycle) query.cycle = cycle;

    const reviews = await AppraisalReview.find(query)
      .populate('employee', 'firstName lastName email')
      .populate('cycle', 'name startDate endDate')
      .populate('reviewer', 'firstName lastName email')
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: reviews
    });
  } catch (error) {
    logger.error({ err: error }, 'Get appraisal reviews error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch appraisal reviews',
      details: error.message
    });
  }
};

exports.createAppraisalReview = async (req, res) => {
  try {
    const review = await AppraisalReview.create({
      ...req.body,
      reviewer: req.user._id
    });
    await review.populate('employee', 'firstName lastName email');
    res.status(201).json({
      success: true,
      message: 'Appraisal review created successfully',
      data: review
    });
  } catch (error) {
    logger.error({ err: error }, 'Create appraisal review error');
    res.status(500).json({
      success: false,
      error: 'Failed to create appraisal review',
      details: error.message
    });
  }
};

exports.updateAppraisalReview = async (req, res) => {
  try {
    const review = await AppraisalReview.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName email')
      .populate('cycle', 'name startDate endDate')
      .populate('reviewer', 'firstName lastName email');

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Appraisal review not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Appraisal review updated successfully',
      data: review
    });
  } catch (error) {
    logger.error({ err: error }, 'Update appraisal review error');
    res.status(500).json({
      success: false,
      error: 'Failed to update appraisal review',
      details: error.message
    });
  }
};

exports.deleteAppraisalReview = async (req, res) => {
  try {
    const review = await AppraisalReview.findByIdAndDelete(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Appraisal review not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Appraisal review deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete appraisal review error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete appraisal review',
      details: error.message
    });
  }
};

/**
 * POLICY DOCUMENTS
 */
exports.getPolicies = async (req, res) => {
  try {
    const { category, isActive } = req.query;
    const query = {};
    if (category) query.category = new RegExp(category, 'i');
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const policies = await PolicyDocument.find(query)
      .populate('publishedBy', 'firstName lastName email')
      .sort({ publishedAt: -1 });

    res.status(200).json({
      success: true,
      data: policies
    });
  } catch (error) {
    logger.error({ err: error }, 'Get policies error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policies',
      details: error.message
    });
  }
};

exports.createPolicy = async (req, res) => {
  try {
    const policy = await PolicyDocument.create({
      ...req.body,
      publishedBy: req.user._id
    });
    await policy.populate('publishedBy', 'firstName lastName email');
    res.status(201).json({
      success: true,
      message: 'Policy created successfully',
      data: policy
    });
  } catch (error) {
    logger.error({ err: error }, 'Create policy error');
    res.status(500).json({
      success: false,
      error: 'Failed to create policy',
      details: error.message
    });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const policy = await PolicyDocument.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('publishedBy', 'firstName lastName email');
    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Policy updated successfully',
      data: policy
    });
  } catch (error) {
    logger.error({ err: error }, 'Update policy error');
    res.status(500).json({
      success: false,
      error: 'Failed to update policy',
      details: error.message
    });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const policy = await PolicyDocument.findByIdAndDelete(req.params.id);
    if (!policy) {
      return res.status(404).json({
        success: false,
        error: 'Policy not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Policy deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete policy error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete policy',
      details: error.message
    });
  }
};

/**
 * POLICY ACKNOWLEDGEMENTS
 */
exports.getPolicyAcknowledgements = async (req, res) => {
  try {
    const { policy, employee } = req.query;
    const query = {};
    if (policy) query.policy = policy;
    if (employee) query.employee = employee;

    const acknowledgements = await PolicyAcknowledgement.find(query)
      .populate('policy', 'title category')
      .populate('employee', 'firstName lastName email department')
      .sort({ acknowledgedAt: -1 });

    res.status(200).json({
      success: true,
      data: acknowledgements
    });
  } catch (error) {
    logger.error({ err: error }, 'Get policy acknowledgements error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch policy acknowledgements',
      details: error.message
    });
  }
};

exports.createPolicyAcknowledgement = async (req, res) => {
  try {
    const acknowledgement = await PolicyAcknowledgement.create(req.body);
    await acknowledgement.populate('policy', 'title category');
    await acknowledgement.populate('employee', 'firstName lastName email');
    res.status(201).json({
      success: true,
      message: 'Policy acknowledgement created successfully',
      data: acknowledgement
    });
  } catch (error) {
    logger.error({ err: error }, 'Create policy acknowledgement error');
    res.status(500).json({
      success: false,
      error: 'Failed to create policy acknowledgement',
      details: error.message
    });
  }
};

exports.deletePolicyAcknowledgement = async (req, res) => {
  try {
    const acknowledgement = await PolicyAcknowledgement.findByIdAndDelete(req.params.id);
    if (!acknowledgement) {
      return res.status(404).json({
        success: false,
        error: 'Policy acknowledgement not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Policy acknowledgement deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete policy acknowledgement error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete policy acknowledgement',
      details: error.message
    });
  }
};

/**
 * HR SUPPORT TICKETS (Employee Queries)
 */
exports.getSupportTickets = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority, category } = req.query;
    const query = {};
    if (status) query.status = status;
    if (priority) query.priority = priority;
    if (category) query.category = category;

    const tickets = await SupportTicket.find(query)
      .populate('requester', 'firstName lastName email department')
      .populate('assignedTo', 'firstName lastName email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await SupportTicket.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        tickets,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    logger.error({ err: error }, 'Get support tickets error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch support tickets',
      details: error.message
    });
  }
};

exports.createSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.create(req.body);
    await ticket.populate('requester', 'firstName lastName email');
    res.status(201).json({
      success: true,
      message: 'Support ticket created successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Create support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to create support ticket',
      details: error.message
    });
  }
};

exports.updateSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket updated successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Update support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to update support ticket',
      details: error.message
    });
  }
};

exports.assignSupportTicket = async (req, res) => {
  try {
    const { assignedTo } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        assignedTo,
        status: 'in-progress',
        assignedDate: Date.now()
      },
      { new: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket assigned successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Assign support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to assign support ticket',
      details: error.message
    });
  }
};

exports.resolveSupportTicket = async (req, res) => {
  try {
    const { solution } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        status: 'resolved',
        solution,
        resolvedDate: Date.now()
      },
      { new: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket resolved successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Resolve support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to resolve support ticket',
      details: error.message
    });
  }
};

exports.closeSupportTicket = async (req, res) => {
  try {
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      { status: 'closed', closedDate: Date.now() },
      { new: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('assignedTo', 'firstName lastName email');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket closed successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Close support ticket error');
    res.status(500).json({
      success: false,
      error: 'Failed to close support ticket',
      details: error.message
    });
  }
};

exports.addSupportTicketComment = async (req, res) => {
  try {
    const { comment, isInternal = false } = req.body;
    const ticket = await SupportTicket.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          comments: {
            commentedBy: req.user._id,
            comment,
            isInternal,
            commentedAt: Date.now()
          }
        }
      },
      { new: true }
    )
      .populate('requester', 'firstName lastName email')
      .populate('comments.commentedBy', 'firstName lastName');

    if (!ticket) {
      return res.status(404).json({
        success: false,
        error: 'Support ticket not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Support ticket comment added successfully',
      data: ticket
    });
  } catch (error) {
    logger.error({ err: error }, 'Add support ticket comment error');
    res.status(500).json({
      success: false,
      error: 'Failed to add support ticket comment',
      details: error.message
    });
  }
};

/**
 * EXIT INTERVIEWS
 */
exports.getExitInterviews = async (req, res) => {
  try {
    const { status, employee } = req.query;
    const query = {};
    if (status) query.status = status;
    if (employee) query.employee = employee;

    const interviews = await ExitInterview.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('interviewer', 'firstName lastName email')
      .sort({ interviewDate: -1 });

    res.status(200).json({
      success: true,
      data: interviews
    });
  } catch (error) {
    logger.error({ err: error }, 'Get exit interviews error');
    res.status(500).json({
      success: false,
      error: 'Failed to fetch exit interviews',
      details: error.message
    });
  }
};

exports.createExitInterview = async (req, res) => {
  try {
    const interview = await ExitInterview.create({
      ...req.body,
      interviewer: req.user._id
    });
    await interview.populate('employee', 'firstName lastName email');
    res.status(201).json({
      success: true,
      message: 'Exit interview created successfully',
      data: interview
    });
  } catch (error) {
    logger.error({ err: error }, 'Create exit interview error');
    res.status(500).json({
      success: false,
      error: 'Failed to create exit interview',
      details: error.message
    });
  }
};

exports.updateExitInterview = async (req, res) => {
  try {
    const interview = await ExitInterview.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    )
      .populate('employee', 'firstName lastName email')
      .populate('interviewer', 'firstName lastName email');

    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Exit interview not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Exit interview updated successfully',
      data: interview
    });
  } catch (error) {
    logger.error({ err: error }, 'Update exit interview error');
    res.status(500).json({
      success: false,
      error: 'Failed to update exit interview',
      details: error.message
    });
  }
};

exports.deleteExitInterview = async (req, res) => {
  try {
    const interview = await ExitInterview.findByIdAndDelete(req.params.id);
    if (!interview) {
      return res.status(404).json({
        success: false,
        error: 'Exit interview not found'
      });
    }
    res.status(200).json({
      success: true,
      message: 'Exit interview deleted successfully'
    });
  } catch (error) {
    logger.error({ err: error }, 'Delete exit interview error');
    res.status(500).json({
      success: false,
      error: 'Failed to delete exit interview',
      details: error.message
    });
  }
};
