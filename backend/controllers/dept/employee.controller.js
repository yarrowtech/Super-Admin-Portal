// backend/controllers/dept/employee.controller.js
const Task = require('../../models/Task');
const Attendance = require('../../models/Attendance');
const Leave = require('../../models/Leave');
const Notice = require('../../models/Notice');
const WorkReport = require('../../models/WorkReport');
const Performance = require('../../models/Performance');

/**
 * @route   GET /api/dept/employee/dashboard
 * @desc    Get Employee dashboard with statistics
 * @access  Private (Employee only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const employeeId = req.user._id;

    const myTasks = await Task.countDocuments({ assignedTo: employeeId, status: { $ne: 'completed' } });
    const completedTasks = await Task.countDocuments({ assignedTo: employeeId, status: 'completed' });
    const overdueTasks = await Task.countDocuments({ assignedTo: employeeId, isOverdue: true, status: { $ne: 'completed' } });
    const pendingLeaves = await Leave.countDocuments({ employee: employeeId, status: 'pending' });
    const todayAttendance = await Attendance.findOne({
      employee: employeeId,
      date: {
        $gte: new Date().setHours(0, 0, 0, 0),
        $lt: new Date().setHours(23, 59, 59, 999)
      }
    });

    // Get recent notices
    const recentNotices = await Notice.find({
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { specificEmployees: employeeId }
      ]
    })
      .sort({ publishDate: -1 })
      .limit(5)
      .select('title type priority publishDate');

    res.status(200).json({
      success: true,
      data: {
        myTasks,
        completedTasks,
        overdueTasks,
        pendingLeaves,
        hasCheckedInToday: !!todayAttendance,
        todayCheckIn: todayAttendance?.checkIn,
        recentNotices,
        permissions: ['view_own_profile', 'view_tasks', 'submit_work_reports', 'view_attendance', 'request_leave']
      }
    });
  } catch (error) {
    console.error('Employee dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employee dashboard',
      details: error.message
    });
  }
};

/**
 * TASK MANAGEMENT
 */

/**
 * @route   GET /api/dept/employee/tasks
 * @desc    Get all tasks assigned to employee
 * @access  Private (Employee only)
 */
exports.getMyTasks = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, priority } = req.query;
    const query = { assignedTo: req.user._id };

    if (status) query.status = status;
    if (priority) query.priority = priority;

    const tasks = await Task.find(query)
      .populate('assignedBy', 'firstName lastName email')
      .populate('project', 'name projectCode')
      .sort({ priority: -1, dueDate: 1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .exec();

    const count = await Task.countDocuments(query);

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
    console.error('Get my tasks error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tasks',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/employee/tasks/:id
 * @desc    Get task by ID
 * @access  Private (Employee only)
 */
exports.getTaskById = async (req, res) => {
  try {
    const task = await Task.findOne({
      _id: req.params.id,
      assignedTo: req.user._id
    })
      .populate('assignedBy', 'firstName lastName email')
      .populate('project', 'name projectCode')
      .populate('comments.commentedBy', 'firstName lastName');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      data: task
    });
  } catch (error) {
    console.error('Get task error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch task',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/employee/tasks/:id/status
 * @desc    Update task status
 * @access  Private (Employee only)
 */
exports.updateTaskStatus = async (req, res) => {
  try {
    const { status, progress } = req.body;

    const existingTask = await Task.findOne({
      _id: req.params.id,
      assignedTo: req.user._id
    });

    if (!existingTask) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const wasCompleted = existingTask.status === 'completed';

    const updateData = { status };
    if (progress !== undefined) updateData.progress = progress;
    if (status === 'completed') updateData.completedDate = Date.now();

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        assignedTo: req.user._id
      },
      updateData,
      { new: true, runValidators: true }
    )
      .populate('assignedBy', 'firstName lastName email')
      .populate('project', 'name projectCode');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    const statusChanged = status && existingTask.status !== status;
    if (statusChanged) {
      const hoursSpent = task.actualHours ?? task.estimatedHours ?? 0;
      const taskProgressStatus = status === 'completed' ? 'completed' : status === 'in-progress' ? 'in-progress' : 'pending';
      await WorkReport.create({
        employee: req.user._id,
        reportType: task.project ? 'project' : 'daily',
        taskId: task._id,
        title: `Task ${status}: ${task.title}`,
        description: task.description || `Task moved to ${status}: ${task.title}`,
        taskStatus: status,
        tasksCompleted: [
          {
            task: task.title,
            hoursSpent,
            status: taskProgressStatus
          }
        ],
        project: task.project?._id || task.project,
        status: 'submitted'
      });

      const io = req.app.get('io');
      if (io) {
        const managerId = (task.assignedBy && (task.assignedBy._id || task.assignedBy)) || null;
        const payload = {
          taskId: task._id,
          title: task.title,
          status,
          project: task.project?.name || task.project || null,
          employee: {
            id: req.user._id,
            name: `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.email,
            email: req.user.email,
            department: req.user.department || null
          },
          updatedAt: new Date().toISOString()
        };
        if (managerId) {
          io.to(`manager:${managerId.toString()}`).emit('manager:work-update', payload);
        }
        io.to('hr').emit('hr:work-update', payload);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Task status updated successfully',
      data: task
    });
  } catch (error) {
    console.error('Update task status error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update task status',
      details: error.message
    });
  }
};

/**
 * @route   POST /api/dept/employee/tasks/:id/comment
 * @desc    Add comment to task
 * @access  Private (Employee only)
 */
exports.addTaskComment = async (req, res) => {
  try {
    const { comment } = req.body;

    const task = await Task.findOneAndUpdate(
      {
        _id: req.params.id,
        assignedTo: req.user._id
      },
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
      .populate('assignedBy', 'firstName lastName email')
      .populate('comments.commentedBy', 'firstName lastName');

    if (!task) {
      return res.status(404).json({
        success: false,
        error: 'Task not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Comment added successfully',
      data: task
    });
  } catch (error) {
    console.error('Add task comment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to add comment',
      details: error.message
    });
  }
};

/**
 * ATTENDANCE MANAGEMENT
 */

/**
 * @route   POST /api/dept/employee/attendance/check-in
 * @desc    Check in for attendance
 * @access  Private (Employee only)
 */
exports.checkIn = async (req, res) => {
  try {
    const { location = 'office' } = req.body;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Check if already checked in today
    const existingAttendance = await Attendance.findOne({
      employee: req.user._id,
      date: { $gte: today }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        error: 'Already checked in today'
      });
    }

    const attendance = await Attendance.create({
      employee: req.user._id,
      date: Date.now(),
      checkIn: Date.now(),
      location,
      status: 'present'
    });

    await attendance.populate('employee', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Checked in successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Check-in error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check in',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/employee/attendance/check-out
 * @desc    Check out from attendance
 * @access  Private (Employee only)
 */
exports.checkOut = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const attendance = await Attendance.findOneAndUpdate(
      {
        employee: req.user._id,
        date: { $gte: today },
        checkOut: null
      },
      {
        checkOut: Date.now()
      },
      { new: true }
    ).populate('employee', 'firstName lastName email');

    if (!attendance) {
      return res.status(404).json({
        success: false,
        error: 'No check-in record found for today'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Checked out successfully',
      data: attendance
    });
  } catch (error) {
    console.error('Check-out error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to check out',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/employee/attendance
 * @desc    Get employee's attendance history
 * @access  Private (Employee only)
 */
exports.getMyAttendance = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 20 } = req.query;
    const query = { employee: req.user._id };

    if (startDate || endDate) {
      query.date = {};
      if (startDate) query.date.$gte = new Date(startDate);
      if (endDate) query.date.$lte = new Date(endDate);
    }

    const attendance = await Attendance.find(query)
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
 * LEAVE MANAGEMENT
 */

/**
 * @route   POST /api/dept/employee/leave
 * @desc    Request leave
 * @access  Private (Employee only)
 */
exports.requestLeave = async (req, res) => {
  try {
    const leave = await Leave.create({
      ...req.body,
      employee: req.user._id,
      managerApprovalStatus: 'pending'
    });

    await leave.populate('employee', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Leave request submitted successfully',
      data: leave
    });
  } catch (error) {
    console.error('Request leave error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to request leave',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/employee/leave
 * @desc    Get employee's leave requests
 * @access  Private (Employee only)
 */
exports.getMyLeaves = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    const query = { employee: req.user._id };

    if (status) query.status = status;

    const leaves = await Leave.find(query)
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
    console.error('Get leaves error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave requests',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/employee/leave/:id/cancel
 * @desc    Cancel leave request
 * @access  Private (Employee only)
 */
exports.cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findOneAndUpdate(
      {
        _id: req.params.id,
        employee: req.user._id,
        status: 'pending'
      },
      { status: 'cancelled' },
      { new: true }
    ).populate('employee', 'firstName lastName email');

    if (!leave) {
      return res.status(404).json({
        success: false,
        error: 'Leave request not found or cannot be cancelled'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Leave request cancelled successfully',
      data: leave
    });
  } catch (error) {
    console.error('Cancel leave error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to cancel leave request',
      details: error.message
    });
  }
};

/**
 * WORK REPORTS
 */

/**
 * @route   POST /api/dept/employee/work-reports
 * @desc    Submit work report
 * @access  Private (Employee only)
 */
exports.submitWorkReport = async (req, res) => {
  try {
    const report = await WorkReport.create({
      ...req.body,
      employee: req.user._id
    });

    await report.populate('employee', 'firstName lastName email');

    res.status(201).json({
      success: true,
      message: 'Work report submitted successfully',
      data: report
    });
  } catch (error) {
    console.error('Submit work report error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to submit work report',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/employee/work-reports
 * @desc    Get employee's work reports
 * @access  Private (Employee only)
 */
exports.getMyWorkReports = async (req, res) => {
  try {
    const { page = 1, limit = 10, reportType, status } = req.query;
    const query = { employee: req.user._id };

    if (reportType) query.reportType = reportType;
    if (status) query.status = status;

    const reports = await WorkReport.find(query)
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
 * NOTICES
 */

/**
 * @route   GET /api/dept/employee/notices
 * @desc    Get notices for employee
 * @access  Private (Employee only)
 */
exports.getNotices = async (req, res) => {
  try {
    const { page = 1, limit = 10, type } = req.query;
    const query = {
      isActive: true,
      $or: [
        { targetAudience: 'all' },
        { specificEmployees: req.user._id }
      ]
    };

    if (type) query.type = type;

    const notices = await Notice.find(query)
      .populate('publishedBy', 'firstName lastName')
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
 * @route   PUT /api/dept/employee/notices/:id/mark-read
 * @desc    Mark notice as read
 * @access  Private (Employee only)
 */
exports.markNoticeAsRead = async (req, res) => {
  try {
    const notice = await Notice.findByIdAndUpdate(
      req.params.id,
      {
        $addToSet: {
          readBy: {
            employee: req.user._id,
            readAt: Date.now()
          }
        }
      },
      { new: true }
    );

    if (!notice) {
      return res.status(404).json({
        success: false,
        error: 'Notice not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notice marked as read'
    });
  } catch (error) {
    console.error('Mark notice as read error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notice as read',
      details: error.message
    });
  }
};

/**
 * PERFORMANCE
 */

/**
 * @route   GET /api/dept/employee/performance
 * @desc    Get employee's performance reviews
 * @access  Private (Employee only)
 */
exports.getMyPerformance = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const query = { employee: req.user._id };

    const reviews = await Performance.find(query)
      .populate('reviewer', 'firstName lastName')
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
    console.error('Get performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance reviews',
      details: error.message
    });
  }
};

/**
 * @route   PUT /api/dept/employee/performance/:id/acknowledge
 * @desc    Acknowledge performance review
 * @access  Private (Employee only)
 */
exports.acknowledgePerformance = async (req, res) => {
  try {
    const { employeeComments } = req.body;

    const review = await Performance.findOneAndUpdate(
      {
        _id: req.params.id,
        employee: req.user._id
      },
      {
        status: 'acknowledged',
        acknowledgedDate: Date.now(),
        employeeComments
      },
      { new: true }
    )
      .populate('reviewer', 'firstName lastName');

    if (!review) {
      return res.status(404).json({
        success: false,
        error: 'Performance review not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Performance review acknowledged successfully',
      data: review
    });
  } catch (error) {
    console.error('Acknowledge performance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge performance review',
      details: error.message
    });
  }
};
