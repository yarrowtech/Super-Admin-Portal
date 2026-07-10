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
    const actorId = req.user?.id || req.user?._id;
    const data = req.body?.text !== undefined
      ? await service.updateObjectiveText(req.params.id, req.params.objectiveId, req.body.text, req.projectId, actorId)
      : await service.updateObjectiveStatus(req.params.id, req.params.objectiveId, req.body?.status, req.projectId, actorId);
    if (!data) return res.status(404).json({ success: false, error: 'Weekly plan or objective not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update objective', 'WeeklyPlan module updateObjective error');
  }
};

exports.addObjective = async (req, res) => {
  try {
    const data = await service.addObjective(req.params.id, req.projectId, req.body?.text, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: 'Weekly plan not found' });
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to add objective', 'WeeklyPlan module addObjective error');
  }
};

exports.deleteObjective = async (req, res) => {
  try {
    const data = await service.deleteObjective(req.params.id, req.params.objectiveId, req.projectId, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: 'Weekly plan or objective not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to delete objective', 'WeeklyPlan module deleteObjective error');
  }
};

exports.deletePlan = async (req, res) => {
  try {
    const data = await service.deletePlan(req.params.id, req.projectId, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: 'Weekly plan not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to delete weekly plan', 'WeeklyPlan module deletePlan error');
  }
};
