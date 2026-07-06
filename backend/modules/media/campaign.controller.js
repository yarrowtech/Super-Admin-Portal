const logger = require('../../utils/logger');
const campaignService = require('./campaign.service');
const campaignTaskService = require('./campaignTask.service');

const handleError = (res, err, message, logLabel) => {
  logger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({
    success: false,
    error: message,
    details: err.message,
  });
};

exports.list = async (req, res) => {
  try {
    const data = await campaignService.listCampaigns(req.query || {}, req.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch campaigns', 'Campaign module list error');
  }
};

exports.create = async (req, res) => {
  try {
    const data = await campaignService.createCampaign(req.body || {}, req.user?.id || req.user?._id, req.projectId);
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create campaign', 'Campaign module create error');
  }
};

exports.getById = async (req, res) => {
  try {
    const data = await campaignService.getCampaignById(req.params.id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch campaign', 'Campaign module getById error');
  }
};

exports.update = async (req, res) => {
  try {
    const data = await campaignService.updateCampaign(req.params.id, req.body || {}, req.user?.id || req.user?._id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update campaign', 'Campaign module update error');
  }
};

exports.advanceStage = async (req, res) => {
  try {
    const data = await campaignService.advanceLifecycleStage(
      req.params.id,
      req.body?.status,
      req.user?.id || req.user?._id,
      req.projectId
    );
    if (!data) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to advance campaign stage', 'Campaign module advanceStage error');
  }
};

exports.getAllTasks = async (req, res) => {
  try {
    const data = await campaignTaskService.listTasksForProject(req.projectId);
    res.status(200).json({ success: true, data: { items: data } });
  } catch (err) {
    handleError(res, err, 'Failed to fetch campaign tasks', 'Campaign module getAllTasks error');
  }
};

exports.getTasks = async (req, res) => {
  try {
    const data = await campaignTaskService.listTasksForCampaign(req.params.id, req.projectId);
    if (data === null) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.status(200).json({ success: true, data: { items: data } });
  } catch (err) {
    handleError(res, err, 'Failed to fetch campaign tasks', 'Campaign module getTasks error');
  }
};

exports.updateTaskStatus = async (req, res) => {
  try {
    const data = await campaignTaskService.updateTaskStatus(req.params.id, req.params.taskId, req.body?.status, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: 'Campaign or task not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update task status', 'Campaign module updateTaskStatus error');
  }
};

exports.remove = async (req, res) => {
  try {
    const data = await campaignService.deleteCampaign(req.params.id, req.projectId, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: 'Campaign not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to delete campaign', 'Campaign module remove error');
  }
};
