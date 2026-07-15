const logger = require('../../utils/logger');
const marketingPlanService = require('./marketingPlan.service');

const handleError = (res, err, message, logLabel) => {
  logger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({
    success: false,
    error: message,
    details: err.message,
  });
};

exports.getByProject = async (req, res) => {
  try {
    const data = await marketingPlanService.getPlanByProject(req.params.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch marketing plan', 'MarketingPlan module getByProject error');
  }
};

exports.upsertByProject = async (req, res) => {
  try {
    const data = await marketingPlanService.upsertPlanByProject(
      req.params.projectId,
      req.body || {},
      req.user?.id || req.user?._id
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to save marketing plan', 'MarketingPlan module upsert error');
  }
};
