const logger = require('../../utils/logger');
const Sales = require('../../models/department/Sales');

exports.getDashboard = async (req, res) => {
  try {
    const [totalLeads, pipelineByStage, totalValueAgg, recentLeads] = await Promise.all([
      Sales.countDocuments(),
      Sales.aggregate([
        {
          $group: {
            _id: { $ifNull: ['$stage', 'unclassified'] },
            count: { $sum: 1 },
          },
        },
        { $sort: { count: -1 } },
      ]),
      Sales.aggregate([
        {
          $group: {
            _id: null,
            totalValue: { $sum: { $ifNull: ['$value', 0] } },
          },
        },
      ]),
      Sales.find().sort({ createdAt: -1 }).limit(10),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        totalLeads,
        totalPipelineValue: totalValueAgg?.[0]?.totalValue || 0,
        pipelineByStage,
        recentLeads,
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch sales dashboard');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch sales dashboard',
      details: error.message,
    });
  }
};
