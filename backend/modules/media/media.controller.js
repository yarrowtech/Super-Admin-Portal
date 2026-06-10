const logger = require('../../utils/logger');
const mediaService = require('./media.service');

const handleError = (res, err, message, logLabel) => {
  logger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({
    success: false,
    error: message,
    details: err.message,
  });
};

exports.getOverview = async (req, res) => {
  try {
    const data = await mediaService.getOverview(req.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media dashboard', 'Media module getOverview error');
  }
};

exports.getDashboard = exports.getOverview;

exports.getProjects = async (req, res) => {
  try {
    const data = await mediaService.listProjects(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media projects', 'Media module getProjects error');
  }
};

exports.getAssets = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'asset');
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media assets', 'Media module getAssets error');
  }
};

exports.createAsset = async (req, res) => {
  try {
    const data = await mediaService.createMediaRecord(req.body || {}, req.user?.id || req.user?._id, req.projectId, {
      section: 'asset',
      moduleType: 'asset',
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create media asset', 'Media module createAsset error');
  }
};

exports.getAssetById = async (req, res) => {
  try {
    const data = await mediaService.getMediaRecordById(req.params.id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: 'Media asset not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media asset', 'Media module getAssetById error');
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const data = await mediaService.updateMediaRecord(req.params.id, req.body || {}, req.user?.id || req.user?._id, req.projectId);
    if (!data) return res.status(404).json({ success: false, error: 'Media asset not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update media asset', 'Media module updateAsset error');
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const data = await mediaService.deleteMediaRecord(req.params.id, req.projectId, req.user?.id || req.user?._id);
    if (!data) return res.status(404).json({ success: false, error: 'Media asset not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to delete media asset', 'Media module deleteAsset error');
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'campaign');
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch campaigns', 'Media module getCampaigns error');
  }
};

exports.createCampaign = async (req, res) => {
  try {
    const data = await mediaService.createMediaRecord(req.body || {}, req.user?.id || req.user?._id, req.projectId, {
      section: 'campaign',
      moduleType: 'campaign',
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create campaign', 'Media module createCampaign error');
  }
};

exports.getContent = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'content');
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch content', 'Media module getContent error');
  }
};

exports.createContent = async (req, res) => {
  try {
    const data = await mediaService.createMediaRecord(req.body || {}, req.user?.id || req.user?._id, req.projectId, {
      section: 'content',
      moduleType: 'content',
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create content', 'Media module createContent error');
  }
};

exports.getBrandAssets = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'brand');
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch brand assets', 'Media module getBrandAssets error');
  }
};

exports.getApprovals = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'approval');
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch approvals', 'Media module getApprovals error');
  }
};

exports.requestApproval = async (req, res) => {
  try {
    const data = await mediaService.requestApproval({
      mediaId: req.params.id,
      requestedBy: req.user?.id || req.user?._id,
      steps: req.body?.steps,
    });
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create approval request', 'Media module requestApproval error');
  }
};

exports.decideApproval = async (req, res) => {
  try {
    const data = await mediaService.decideApproval({
      workflowId: req.params.workflowId,
      actorId: req.user?.id || req.user?._id,
      actorRole: req.user?.role,
      decision: req.body?.decision,
      remarks: req.body?.remarks || '',
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to decide approval', 'Media module decideApproval error');
  }
};

exports.getReportingSummary = async (req, res) => {
  try {
    const data = await mediaService.getReportingSummary(req.projectId);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch reporting summary', 'Media module getReportingSummary error');
  }
};

exports.getModuleDataByProject = async (req, res) => {
  try {
    const data = await mediaService.getModuleDataByProject({
      moduleKey: req.params.moduleKey,
      projectId: req.params.projectId,
      query: req.query || {},
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch project media data', 'Media module getModuleDataByProject error');
  }
};
