// backend/controllers/dept/hr.controller.js
const User = require('../../models/User');
const Applicant = require('../../models/Applicant');
const Attendance = require('../../models/Attendance');
const Leave = require('../../models/Leave');
const Notice = require('../../models/Notice');
const Performance = require('../../models/Performance');
const WorkReport = require('../../models/WorkReport');
const Complaint = require('../../models/Complaint');

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

    res.status(200).json({
      success: true,
      data: {
        attendance,
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
      data: attendance
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
    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        approvedBy: req.user._id,
        approvedDate: Date.now()
      },
      { new: true }
    ).populate('employee', 'firstName lastName email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

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

    const leave = await Leave.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        approvedBy: req.user._id,
        approvedDate: Date.now(),
        rejectionReason
      },
      { new: true }
    ).populate('employee', 'firstName lastName email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found'
      });
    }

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
 * WORK REPORTS MANAGEMENT
 */

/**
 * @route   GET /api/dept/hr/work-reports
 * @desc    Get all work reports
 * @access  Private (HR only)
 */
exports.getWorkReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, employee, reportType, status } = req.query;
    const query = {};

    if (employee) query.employee = employee;
    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

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
