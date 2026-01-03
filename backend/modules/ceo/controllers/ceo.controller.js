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

    // Generate some dynamic data for demo purposes
    const currentTime = new Date();
    const revenue = 12.8 + (Math.random() - 0.5) * 0.5; // Random variation around 12.8M
    const revenueChange = ((Math.random() - 0.5) * 5).toFixed(1); // Random between -2.5% and +2.5%
    const customers = 1450 + Math.floor(Math.random() * 100); // Random variation around 1450
    const uptime = (99.95 + Math.random() * 0.05).toFixed(2); // Random between 99.95% and 100%

    const dashboardData = {
      totalEmployees: totalUsers,
      departmentStats,
      totalRevenue: `$${revenue.toFixed(1)}M`,
      revenueChange: `${revenueChange >= 0 ? '+' : ''}${revenueChange}%`,
      newCustomers: customers.toLocaleString(),
      customersChange: `+${(1.5 + Math.random() * 1).toFixed(1)}%`,
      projectCompletion: `${Math.floor(85 + Math.random() * 10)}%`,
      completionChange: `${((Math.random() - 0.7) * 2).toFixed(1)}%`,
      systemUptime: `${uptime}%`,
      uptimeChange: `+${(Math.random() * 0.1).toFixed(2)}%`,
      lastUpdated: currentTime.toISOString(),
      permissions: ['view_all_departments', 'approve_budgets', 'strategic_decisions']
    };

    res.status(200).json({
      success: true,
      data: dashboardData
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
 * @route   POST /api/dept/ceo/alert
 * @desc    Create a new system alert
 * @access  Private (CEO only)
 */
exports.createAlert = async (req, res) => {
  try {
    const { title, description, type = 'info', severity = 'medium' } = req.body;
    
    const alert = {
      id: Date.now(),
      type,
      icon: type === 'error' ? 'error' : type === 'warning' ? 'warning' : 'info',
      title,
      description,
      time: 'now',
      severity,
      timestamp: new Date().toISOString()
    };

    // In a real application, you'd save this to database
    // For now, we'll just emit it via socket
    if (req.io) {
      req.io.emit('alert-update', alert);
    }

    res.status(201).json({
      success: true,
      data: alert
    });
  } catch (error) {
    console.error('Create alert error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create alert',
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

/**
 * @route   GET /api/dept/ceo/employees
 * @desc    Get all employees for CEO
 * @access  Private (CEO only)
 */
exports.getAllEmployees = async (req, res) => {
  try {
    const employees = await User.find({}, {
      password: 0 // Exclude password field
    }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: employees
    });
  } catch (error) {
    console.error('CEO employees error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch employees',
      details: error.message
    });
  }
};
