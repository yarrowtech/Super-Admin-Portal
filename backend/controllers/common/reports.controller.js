const logger = require('../../utils/logger');
const WorkReport = require('../../models/hr/StaffWorkReport');
const Task = require('../../models/common/Task');
const Leave = require('../../models/hr/Leave');
const Project = require('../../models/common/Project');

exports.getReports = async (req, res) => {
  try {
    const [workReportStats, taskStats, leaveStats, projectStats, latestReports] = await Promise.all([
      WorkReport.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Task.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Leave.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      Project.aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      WorkReport.find().sort({ reportDate: -1, createdAt: -1 }).limit(10).populate('employee', 'firstName lastName email'),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        generatedAt: new Date().toISOString(),
        workReports: workReportStats,
        tasks: taskStats,
        leaves: leaveStats,
        projects: projectStats,
        latestReports,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch reports');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch reports',
      details: error.message,
    });
  }
};
