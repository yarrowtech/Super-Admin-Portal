const logger = require('../../utils/logger');
const reportService = require('./report.service');

const handleError = (res, err, message, logLabel) => {
  logger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({ success: false, error: message, details: err.message });
};

exports.generate = async (req, res) => {
  try {
    const data = await reportService.generateReport(req.projectId, req.body?.periodType || 'weekly', req.user?.id || req.user?._id);
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to generate report', 'Report module generate error');
  }
};

exports.list = async (req, res) => {
  try {
    const data = await reportService.listReports(req.projectId, req.query || {});
    res.status(200).json({ success: true, data: { items: data } });
  } catch (err) {
    handleError(res, err, 'Failed to fetch reports', 'Report module list error');
  }
};
