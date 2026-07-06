const logger = require('../../utils/logger');
const kpiService = require('./kpi.service');

const handleError = (res, err, message, logLabel) => {
  logger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({ success: false, error: message, details: err.message });
};

exports.getSnapshot = async (req, res) => {
  try {
    const data = await kpiService.getSnapshot(req.projectId, req.query?.period);
    res.status(200).json({ success: true, data: data || null });
  } catch (err) {
    handleError(res, err, 'Failed to fetch KPI snapshot', 'KPI module getSnapshot error');
  }
};

exports.upsertSnapshot = async (req, res) => {
  try {
    const data = await kpiService.upsertSnapshot(req.projectId, req.body || {}, req.user?.id || req.user?._id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update KPI snapshot', 'KPI module upsertSnapshot error');
  }
};

exports.getFunnel = async (req, res) => {
  try {
    const data = await kpiService.getFunnel(req.projectId, req.query?.period);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch marketing funnel', 'KPI module getFunnel error');
  }
};

exports.getKpiTrend = async (req, res) => {
  try {
    const data = await kpiService.getKpiTrend(req.projectId, req.query?.period);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch KPI trend', 'KPI module getKpiTrend error');
  }
};
