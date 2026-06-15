const logger = require('../../utils/logger');
const SystemHealth = require('../../models/superAdmin/SystemHealth');

exports.getSystemHealth = async (req, res) => {
  try {
    const checks = await SystemHealth.find().sort({ checkedAt: -1, updatedAt: -1 }).limit(100);

    const summary = checks.reduce(
      (acc, item) => {
        const status = item.status || 'healthy';
        if (status === 'down') acc.down += 1;
        else if (status === 'degraded') acc.degraded += 1;
        else acc.healthy += 1;
        return acc;
      },
      { healthy: 0, degraded: 0, down: 0 }
    );

    return res.status(200).json({
      success: true,
      data: {
        summary,
        checks,
        overallStatus: summary.down > 0 ? 'down' : summary.degraded > 0 ? 'degraded' : 'healthy',
      },
    });
  } catch (error) {
    logger.error({ err: error }, 'Failed to fetch system health');
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch system health',
      details: error.message,
    });
  }
};
