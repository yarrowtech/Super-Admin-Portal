const logger = require('../../utils/logger');
const OtherDepartment = require('../../models/department/OtherDepartment');

exports.getDashboard = async (req, res) => {
  try {
    const [totalRecords, departmentRows, recentRecords] = await Promise.all([
      OtherDepartment.countDocuments(),
      OtherDepartment.aggregate([
        {
          $group: {
            _id: '$departmentName',
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      OtherDepartment.find().sort({ updatedAt: -1 }).limit(10),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalRecords,
        departmentStats: departmentRows,
        recentRecords,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch other-department dashboard');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch other-department dashboard',
      details: error.message,
    });
  }
};
