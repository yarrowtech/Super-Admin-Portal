const asyncHandler = require('../../utils/asyncHandler');
const logger = require('../../utils/logger').child({ module: 'employee.dashboard' });
const dashboardService = require('../../services/dashboard.service');

exports.getDashboard = asyncHandler(async (req, res) => {
  const data = await dashboardService.getDashboard(req.user);
  res.json({
    success: true,
    data,
  });
});
