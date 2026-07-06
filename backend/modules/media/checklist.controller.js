const logger = require('../../utils/logger');
const service = require('./checklist.service');

const handleError = (res, err, message, logLabel) => {
  logger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({ success: false, error: message, details: err.message });
};

exports.list = async (req, res) => {
  try {
    const data = await service.listChecklists(req.projectId);
    res.status(200).json({ success: true, data: { items: data } });
  } catch (err) {
    handleError(res, err, 'Failed to fetch checklists', 'Checklist module list error');
  }
};

exports.addItem = async (req, res) => {
  try {
    const data = await service.addItem(req.projectId, req.params.checklistType, req.body?.label, req.user?.id || req.user?._id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to add checklist item', 'Checklist module addItem error');
  }
};

exports.toggleItem = async (req, res) => {
  try {
    const data = await service.toggleItem(req.projectId, req.params.checklistType, req.params.itemId, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: 'Checklist or item not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update checklist item', 'Checklist module toggleItem error');
  }
};
