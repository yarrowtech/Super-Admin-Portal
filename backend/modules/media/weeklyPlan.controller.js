const logger = require('../../utils/logger');
const service = require('./weeklyPlan.service');

const handleError = (res, err, message, logLabel) => {
  logger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({ success: false, error: message, details: err.message });
};

exports.list = async (req, res) => {
  try {
    const data = await service.listPlans(req.projectId);
    res.status(200).json({ success: true, data: { items: data } });
  } catch (err) {
    handleError(res, err, 'Failed to fetch weekly plans', 'WeeklyPlan module list error');
  }
};

exports.create = async (req, res) => {
  try {
    const data = await service.createPlan(req.projectId, req.body || {}, req.user?.id || req.user?._id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create weekly plan', 'WeeklyPlan module create error');
  }
};

exports.updateObjective = async (req, res) => {
  try {
    const data = await service.updateObjectiveStatus(
      req.params.id,
      req.params.objectiveId,
      req.body?.status,
      req.projectId,
      req.user?.id || req.user?._id
    );
    if (!data) return res.status(404).json({ success: false, error: 'Weekly plan or objective not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update objective', 'WeeklyPlan module updateObjective error');
  }
};
