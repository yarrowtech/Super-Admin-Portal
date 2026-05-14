const logger = require('../../utils/logger');
const User = require('../../models/auth/User');
const Task = require('../../models/common/Task');
const Project = require('../../models/common/Project');
const Notification = require('../../models/common/Notification');

exports.getDashboard = async (req, res) => {
  try {
    const [totalUsers, activeUsers, openTasks, activeProjects, unreadNotifications] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      Task.countDocuments({ status: { $in: ['pending', 'in-progress', 'review'] } }),
      Project.countDocuments({ status: { $in: ['planning', 'in-progress', 'on-hold'] } }),
      Notification.countDocuments({
        manager: req.user?.id || req.user?._id,
        read: false,
      }),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: req.user?.id || req.user?._id,
          role: req.user?.role,
          department: req.user?.department || null,
        },
        stats: {
          totalUsers,
          activeUsers,
          openTasks,
          activeProjects,
          unreadNotifications,
        },
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch common dashboard');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard',
      details: error.message,
    });
  }
};
