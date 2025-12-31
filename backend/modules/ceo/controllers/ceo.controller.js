// backend/controllers/dept/ceo.controller.js
const User = require('../../shared/models/User');

/**
 * @route   GET /api/dept/ceo/dashboard
 * @desc    Get CEO dashboard with company overview
 * @access  Private (CEO only)
 */
exports.getDashboard = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments();
    const departmentStats = await User.aggregate([
      { $group: { _id: '$department', count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        message: 'Welcome to CEO Dashboard',
        totalEmployees: totalUsers,
        departmentStats,
        permissions: ['view_all_departments', 'approve_budgets', 'strategic_decisions']
      }
    });
  } catch (error) {
    console.error('CEO dashboard error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch CEO dashboard',
      details: error.message
    });
  }
};

/**
 * @route   GET /api/dept/ceo/reports
 * @desc    Get company-wide reports
 * @access  Private (CEO only)
 */
exports.getReports = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        message: 'Company reports',
        reports: []
      }
    });
  } catch (error) {
    console.error('CEO reports error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      details: error.message
    });
  }
};
