// backend/controllers/dept/hr.controller.js
const User = require('../../shared/models/User');
const Applicant = require('../models/Applicant');
const Attendance = require('../../shared/models/Attendance');
const Leave = require('../../shared/models/Leave');
const Notice = require('../../shared/models/Notice');
const Performance = require('../../shared/models/Performance');
const WorkReport = require('../../shared/models/WorkReport');
const Complaint = require('../models/Complaint');
const Department = require('../models/Department');
const Task = require('../../shared/models/Task');
const Designation = require('../models/Designation');
const EmployeeDocument = require('../models/EmployeeDocument');
const BiometricEnrollment = require('../models/BiometricEnrollment');
const LeavePolicy = require('../models/LeavePolicy');
const Holiday = require('../models/Holiday');
const JobPost = require('../models/JobPost');
const Interview = require('../models/Interview');
const Offer = require('../models/Offer');
const AppraisalCycle = require('../models/AppraisalCycle');
const AppraisalReview = require('../models/AppraisalReview');
const PolicyDocument = require('../models/PolicyDocument');
const PolicyAcknowledgement = require('../models/PolicyAcknowledgement');
const SupportTicket = require('../../shared/models/SupportTicket');
const ExitInterview = require('../models/ExitInterview');
const { ROLES } = require('../../../config/roles');
const { evaluateAttendanceRecord } = require('../../shared/utils/shiftRules');

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

/**
 * @route   GET /api/dept/hr/dashboard
 * @desc    Get HR dashboard with statistics
 * @access  Private (HR only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments();
    const activeEmployees = await User.countDocuments({ isActive: true });
    const pendingApplicants = await Applicant.countDocuments({ status: 'pending' });
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    const todayAttendance = await Attendance.countDocuments({
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999)
      }
    });
    const openComplaints = await Complaint.countDocuments({
      status: { $in: ['pending', 'investigating'] }
    });

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeEmployees,
        pendingApplicants,
        pendingLeaves,
        todayAttendance,
        openComplaints,
        permissions: ['manage_employees', 'recruitment', 'payroll_access', 'performance_reviews', 'leave_management']
      }
    });
  } catch (error) {
    console.error('HR dashboard error:', error);
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
    const { page = 1, limit = 10, status, position, department } = req.query;
    const query = {};

    if (status) query.status = status;
    if (position) query.position = new RegExp(position, 'i');
    if (department) query.department = new RegExp(department, 'i');

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
    console.error('Get applicants error:', error);
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
    const applicant = await Applicant.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Applicant created successfully',
      data: applicant
    });
  } catch (error) {
    console.error('Create applicant error:', error);
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
    console.error('Get applicant error:', error);
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
    console.error('Update applicant error:', error);
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
    console.error('Delete applicant error:', error);
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
    const { page = 1, limit = 10, employee, status, startDate, endDate } = req.query;
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

    res.status(200).json({
      success: true,
      data: {
        attendance: normalizedRecords,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
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
    console.error('Create attendance error:', error);
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
    console.error('Update attendance error:', error);
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
    console.error('Get employee attendance error:', error);
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
    const { page = 1, limit = 10, role, department, isActive } = req.query;
    const query = {};

    if (role) query.role = role;
    if (department) query.department = new RegExp(department, 'i');
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const employees = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await User.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        employees,
        totalPages: Math.ceil(count / limit),
        currentPage: parseInt(page),
        total: count
      }
    });
  } catch (error) {
    console.error('HR employees error:', error);
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
    console.error('HR request leave error:', error);
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
    const { page = 1, limit = 10, status, leaveType, employee } = req.query;
    const query = {};

    if (status) query.status = status;
    if (leaveType) query.leaveType = leaveType;
    if (employee) query.employee = employee;

    const leaves = await Leave.find(query)
      .populate('employee', 'firstName lastName email department')
      .populate('approvedBy', 'firstName lastName')
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
    console.error('Get leave requests error:', error);
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

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Leave request is not pending'
      });
    }

    leave.status = 'approved';
    leave.approvedBy = req.user._id;
    leave.approvedDate = Date.now();
    if (leave.managerApprovalStatus === 'pending') {
      leave.managerApprovalStatus = 'bypassed';
    }
    await leave.save();

    res.status(200).json({
      success: true,
      message: 'Leave request approved successfully',
      data: leave
    });
  } catch (error) {
    console.error('Approve leave error:', error);
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

    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        error: 'Leave request is not pending'
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

    res.status(200).json({
      success: true,
      message: 'Leave request rejected',
      data: leave
    });
  } catch (error) {
    console.error('Reject leave error:', error);
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
    console.error('Get notices error:', error);
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
    console.error('Create notice error:', error);
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
    console.error('Update notice error:', error);
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
    console.error('Delete notice error:', error);
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
    console.error('Get performance reviews error:', error);
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
    console.error('Create performance review error:', error);
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
    console.error('Update performance review error:', error);
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
    console.error('HR get tasks error:', error);
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
    console.error('HR create task error:', error);
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
    console.error('HR update task error:', error);
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
    console.error('HR close task error:', error);
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
    const { page = 1, limit = 10, employee, reportType, status, uniqueTask } = req.query;
    const query = {};

    if (employee) query.employee = employee;
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

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
    console.error('Get work reports error:', error);
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
    console.error('Review work report error:', error);
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
    console.error('Get complaints error:', error);
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
    console.error('Get complaint error:', error);
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
    console.error('Assign complaint error:', error);
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
    console.error('Resolve complaint error:', error);
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
    console.error('Add comment error:', error);
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

    const validRoles = Object.values(ROLES);
    if (!validRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        error: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
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
      role,
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
    console.error('Create employee error:', error);
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
      const validRoles = Object.values(ROLES);
      if (!validRoles.includes(role)) {
        return res.status(400).json({
          success: false,
          error: `Invalid role. Valid roles are: ${validRoles.join(', ')}`
        });
      }
      user.role = role;
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
    console.error('Update employee error:', error);
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
    console.error('Toggle employee status error:', error);
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
    console.error('Get departments error:', error);
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
    console.error('Create department error:', error);
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
    console.error('Update department error:', error);
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
    console.error('Delete department error:', error);
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
    console.error('Get designations error:', error);
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
    console.error('Create designation error:', error);
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
    console.error('Update designation error:', error);
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
    console.error('Delete designation error:', error);
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
    console.error('Get employee documents error:', error);
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
    console.error('Create employee document error:', error);
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
    console.error('Update employee document error:', error);
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
    console.error('Delete employee document error:', error);
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
    console.error('Get biometric enrollments error:', error);
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
    console.error('Create biometric enrollment error:', error);
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
    console.error('Update biometric enrollment error:', error);
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
    console.error('Delete biometric enrollment error:', error);
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
    const { isActive, leaveType } = req.query;
    const query = {};
    if (leaveType) query.leaveType = leaveType;
    if (isActive !== undefined) query.isActive = isActive === 'true';

    const policies = await LeavePolicy.find(query).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: policies
    });
  } catch (error) {
    console.error('Get leave policies error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave policies',
      details: error.message
    });
  }
};

exports.createLeavePolicy = async (req, res) => {
  try {
    const policy = await LeavePolicy.create(req.body);
    res.status(201).json({
      success: true,
      message: 'Leave policy created successfully',
      data: policy
    });
  } catch (error) {
    console.error('Create leave policy error:', error);
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
    console.error('Update leave policy error:', error);
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
    console.error('Delete leave policy error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete leave policy',
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
    console.error('Get holidays error:', error);
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
    console.error('Create holiday error:', error);
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
    console.error('Update holiday error:', error);
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
    console.error('Delete holiday error:', error);
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
    console.error('Get job posts error:', error);
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
    console.error('Create job post error:', error);
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
    console.error('Update job post error:', error);
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
    console.error('Delete job post error:', error);
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
    console.error('Get interviews error:', error);
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
    console.error('Create interview error:', error);
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
    console.error('Update interview error:', error);
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
    console.error('Delete interview error:', error);
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
    console.error('Get offers error:', error);
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
    console.error('Create offer error:', error);
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
    console.error('Update offer error:', error);
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
    console.error('Delete offer error:', error);
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
    console.error('Get appraisal cycles error:', error);
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
    console.error('Create appraisal cycle error:', error);
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
    console.error('Update appraisal cycle error:', error);
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
    console.error('Delete appraisal cycle error:', error);
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
    console.error('Get appraisal reviews error:', error);
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
    console.error('Create appraisal review error:', error);
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
    console.error('Update appraisal review error:', error);
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
    console.error('Delete appraisal review error:', error);
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
    console.error('Get policies error:', error);
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
    console.error('Create policy error:', error);
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
    console.error('Update policy error:', error);
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
    console.error('Delete policy error:', error);
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
    console.error('Get policy acknowledgements error:', error);
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
    console.error('Create policy acknowledgement error:', error);
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
    console.error('Delete policy acknowledgement error:', error);
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
    console.error('Get support tickets error:', error);
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
    console.error('Create support ticket error:', error);
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
    console.error('Update support ticket error:', error);
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
    console.error('Assign support ticket error:', error);
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
    console.error('Resolve support ticket error:', error);
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
    console.error('Close support ticket error:', error);
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
    console.error('Add support ticket comment error:', error);
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
    console.error('Get exit interviews error:', error);
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
    console.error('Create exit interview error:', error);
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
    console.error('Update exit interview error:', error);
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
    console.error('Delete exit interview error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete exit interview',
      details: error.message
    });
  }
};
