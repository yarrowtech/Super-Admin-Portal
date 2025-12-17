// backend/controllers/dept/hr.controller.js
const User = require('../../models/User');

/**
 * @route   GET /api/dept/hr/dashboard
 * @desc    Get HR dashboard
 * @access  Private (HR only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments();
    const activeEmployees = await User.countDocuments({ isActive: true });

    res.status(200).json({
      success: true,
      data: {
        message: 'Welcome to HR Department Dashboard',
        totalEmployees,
        activeEmployees,
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
 * @route   GET /api/dept/hr/employees
 * @desc    Get all employees
 * @access  Private (HR only)
 */
exports.getEmployees = async (req, res) => {
  try {
    const employees = await User.find().select('-password').sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        employees,
        count: employees.length
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
 * @route   GET /api/dept/hr/recruitment
 * @desc    Get recruitment data
 * @access  Private (HR only)
 */
exports.getRecruitment = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Recruitment Overview',
        openPositions: []
      }
    });
  } catch (error) {
    console.error('HR recruitment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recruitment data',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/hr/leave-management
 * @desc    Get leave requests
 * @access  Private (HR only)
 */
exports.getLeaveManagement = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Leave Management',
        leaveRequests: []
      }
    });
  } catch (error) {
    console.error('HR leave management error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave data',
      details: error.message
    });
  }
};
