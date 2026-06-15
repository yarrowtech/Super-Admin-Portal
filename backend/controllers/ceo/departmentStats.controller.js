const logger = require('../../utils/logger');
const User = require('../../models/auth/User');
const Task = require('../../models/common/Task');

exports.getDepartmentStats = async (req, res) => {
  try {
    const [usersByDepartment, taskByDepartment] = await Promise.all([
      User.aggregate([
        { $match: { isActive: true } },
        {
          $group: {
            _id: { $ifNull: ['$department', 'Unassigned'] },
            users: { $sum: 1 },
            activeUsers: {
              $sum: {
                $cond: [{ $eq: ['$isActive', true] }, 1, 0],
              },
            },
          },
        },
        { $sort: { users: -1 } },
      ]),
      Task.aggregate([
        {
          $lookup: {
            from: 'users',
            localField: 'assignedTo',
            foreignField: '_id',
            as: 'assignee',
          },
        },
        { $unwind: { path: '$assignee', preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: { $ifNull: ['$assignee.department', 'Unassigned'] },
            totalTasks: { $sum: 1 },
            openTasks: {
              $sum: {
                $cond: [{ $in: ['$status', ['pending', 'in-progress', 'review']] }, 1, 0],
              },
            },
            completedTasks: {
              $sum: {
                $cond: [{ $eq: ['$status', 'completed'] }, 1, 0],
              },
            },
          },
        },
      ]),
    ]);

    const taskMap = taskByDepartment.reduce((acc, item) => {
      acc[item._id] = item;
      return acc;
    }, {});

    const result = usersByDepartment.map((department) => {
      const taskStats = taskMap[department._id] || {};
      return {
        department: department._id,
        users: department.users || 0,
        activeUsers: department.activeUsers || 0,
        totalTasks: taskStats.totalTasks || 0,
        openTasks: taskStats.openTasks || 0,
        completedTasks: taskStats.completedTasks || 0,
      };
    });

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch CEO department stats');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch department stats',
      details: error.message,
    });
  }
};
