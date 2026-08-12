const { mediaLogger, getMediaRequestLogger } = require('./media.logger');
const mediaService = require('./media.service');
const dashboardAggregateService = require('./dashboardAggregate.service');

const handleError = (res, err, message, logLabel) => {
  mediaLogger.error({ err }, logLabel);
  return res.status(err.statusCode || 500).json({
    success: false,
    error: message,
    details: err.message,
  });
};

exports.getOverview = async (req, res) => {
  try {
    const data = await mediaService.getOverview(req.projectId);
    getMediaRequestLogger(req, { action: 'getOverview' }).info(
      { projectId: req.projectId || null },
      'Media overview loaded'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media dashboard', 'Media module getOverview error');
  }
};

exports.getDashboard = async (req, res) => {
  try {
    const data = await dashboardAggregateService.getProjectDashboard(req.projectId);
    getMediaRequestLogger(req, { action: 'getDashboard' }).info(
      { projectId: req.projectId || null },
      'Media dashboard loaded'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media dashboard', 'Media module getDashboard error');
  }
};

exports.getProjects = async (req, res) => {
  try {
    const data = await mediaService.listProjects(req.query || {});
    getMediaRequestLogger(req, { action: 'getProjects' }).info(
      { query: req.query || {} },
      'Media projects listed'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media projects', 'Media module getProjects error');
  }
};

exports.getMediaHeadDashboard = async (req, res) => {
  try {
    const data = await mediaService.getMediaHeadDashboard(req.query || {});
    getMediaRequestLogger(req, { action: 'getMediaHeadDashboard' }).info(
      { query: req.query || {} },
      'Media Head dashboard loaded'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head dashboard', 'Media Head dashboard error');
  }
};

exports.getMediaHeadProjects = async (req, res) => {
  try {
    const data = await mediaService.listMediaHeadProjects(req.query || {});
    getMediaRequestLogger(req, { action: 'getMediaHeadProjects' }).info(
      { query: req.query || {} },
      'Media Head projects listed'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head projects', 'Media Head projects error');
  }
};

exports.getMediaHeadSalesSummary = async (req, res) => {
  try {
    const data = await mediaService.getSalesSummary(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head sales summary', 'Media Head sales summary error');
  }
};

exports.getMediaHeadMarketingSummary = async (req, res) => {
  try {
    const data = await mediaService.getMarketingSummary(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head marketing summary', 'Media Head marketing summary error');
  }
};

exports.getMediaHeadRevenue = async (req, res) => {
  try {
    const data = await mediaService.getRevenueSummary(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head revenue summary', 'Media Head revenue error');
  }
};

exports.getMediaHeadAttention = async (req, res) => {
  try {
    const data = await mediaService.getNeedsAttention(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head attention items', 'Media Head attention error');
  }
};

exports.getMediaHeadTeam = async (req, res) => {
  try {
    const data = await mediaService.getTeamOverview();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head team overview', 'Media Head team error');
  }
};

exports.getMediaHeadDeadlines = async (req, res) => {
  try {
    const data = await mediaService.getDeadlineCenter();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head deadline center', 'Media Head deadlines error');
  }
};

exports.getMediaHeadProjectDetail = async (req, res) => {
  try {
    const data = await mediaService.getProjectDetailForHead(req.params.id);
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Unable to load Media Head project detail', 'Media Head project detail error');
  }
};

exports.getAssets = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'asset');
    getMediaRequestLogger(req, { action: 'getAssets' }).info(
      { projectId: req.projectId || null, query: req.query || {} },
      'Media assets listed'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media assets', 'Media module getAssets error');
  }
};

exports.getCampaigns = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'campaign');
    getMediaRequestLogger(req, { action: 'getCampaigns' }).info(
      { projectId: req.projectId || null, query: req.query || {} },
      'Media campaigns listed'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media campaigns', 'Media module getCampaigns error');
  }
};

exports.createAsset = async (req, res) => {
  try {
    const data = await mediaService.createMediaRecord(req.body || {}, req.user?.id || req.user?._id, req.projectId, {
      section: 'asset',
      moduleType: 'asset',
    });
    getMediaRequestLogger(req, { action: 'createAsset' }).info(
      { projectId: req.projectId || null, mediaId: data?._id || null },
      'Media asset created'
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create media asset', 'Media module createAsset error');
  }
};

exports.getAssetById = async (req, res) => {
  try {
    const data = await mediaService.getMediaRecordById(req.params.id, req.projectId, 'asset');
    if (!data) return res.status(404).json({ success: false, error: 'Media asset not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch media asset', 'Media module getAssetById error');
  }
};

exports.updateAsset = async (req, res) => {
  try {
    const data = await mediaService.updateMediaRecord(req.params.id, req.body || {}, req.user?.id || req.user?._id, req.projectId, 'asset');
    if (!data) return res.status(404).json({ success: false, error: 'Media asset not found' });
    getMediaRequestLogger(req, { action: 'updateAsset' }).info(
      { projectId: req.projectId || null, mediaId: req.params.id },
      'Media asset updated'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update media asset', 'Media module updateAsset error');
  }
};

exports.deleteAsset = async (req, res) => {
  try {
    const data = await mediaService.deleteMediaRecord(req.params.id, req.projectId, req.user?.id || req.user?._id, 'asset');
    if (!data) return res.status(404).json({ success: false, error: 'Media asset not found' });
    getMediaRequestLogger(req, { action: 'deleteAsset' }).info(
      { projectId: req.projectId || null, mediaId: req.params.id },
      'Media asset deleted'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to delete media asset', 'Media module deleteAsset error');
  }
};

exports.getContent = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'content');
    getMediaRequestLogger(req, { action: 'getContent' }).info(
      { projectId: req.projectId || null, query: req.query || {} },
      'Media content listed'
    );
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
    getMediaRequestLogger(req, { action: 'createContent' }).info(
      { projectId: req.projectId || null, mediaId: data?._id || null },
      'Media content created'
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create content', 'Media module createContent error');
  }
};

exports.getContentById = async (req, res) => {
  try {
    const data = await mediaService.getMediaRecordById(req.params.id, req.projectId, 'content');
    if (!data) return res.status(404).json({ success: false, error: 'Content not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch content', 'Media module getContentById error');
  }
};

exports.updateContent = async (req, res) => {
  try {
    const data = await mediaService.updateMediaRecord(req.params.id, req.body || {}, req.user?.id || req.user?._id, req.projectId, 'content');
    if (!data) return res.status(404).json({ success: false, error: 'Content not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update content', 'Media module updateContent error');
  }
};

exports.deleteContent = async (req, res) => {
  try {
    const data = await mediaService.deleteMediaRecord(req.params.id, req.projectId, req.user?.id || req.user?._id, 'content');
    if (!data) return res.status(404).json({ success: false, error: 'Content not found' });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to delete content', 'Media module deleteContent error');
  }
};

exports.getBrandAssets = async (req, res) => {
  try {
    const data = await mediaService.listMedia(req.query || {}, req.projectId, 'brand');
    getMediaRequestLogger(req, { action: 'getBrandAssets' }).info(
      { projectId: req.projectId || null, query: req.query || {} },
      'Media brand assets listed'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch brand assets', 'Media module getBrandAssets error');
  }
};

const makeSectionController = (section, label) => ({
  list: async (req, res) => {
    try {
      const data = await mediaService.listMedia(req.query || {}, req.projectId, section);
      getMediaRequestLogger(req, { action: `list:${section}` }).info(
        { projectId: req.projectId || null, section, query: req.query || {} },
        'Media section listed'
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      handleError(res, err, `Failed to fetch ${label}`, `Media module list ${section} error`);
    }
  },
  create: async (req, res) => {
    try {
      const data = await mediaService.createMediaRecord(req.body || {}, req.user?.id || req.user?._id, req.projectId, {
        section,
        moduleType: section,
      });
      getMediaRequestLogger(req, { action: `create:${section}` }).info(
        { projectId: req.projectId || null, section, mediaId: data?._id || null },
        'Media section item created'
      );
      res.status(201).json({ success: true, data });
    } catch (err) {
      handleError(res, err, `Failed to create ${label}`, `Media module create ${section} error`);
    }
  },
  getById: async (req, res) => {
    try {
      const data = await mediaService.getMediaRecordById(req.params.id, req.projectId, section);
      if (!data) return res.status(404).json({ success: false, error: `${label} not found` });
      getMediaRequestLogger(req, { action: `get:${section}` }).info(
        { projectId: req.projectId || null, section, mediaId: req.params.id },
        'Media section item loaded'
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      handleError(res, err, `Failed to fetch ${label}`, `Media module get ${section} error`);
    }
  },
  update: async (req, res) => {
    try {
      const data = await mediaService.updateMediaRecord(req.params.id, req.body || {}, req.user?.id || req.user?._id, req.projectId, section);
      if (!data) return res.status(404).json({ success: false, error: `${label} not found` });
      getMediaRequestLogger(req, { action: `update:${section}` }).info(
        { projectId: req.projectId || null, section, mediaId: req.params.id },
        'Media section item updated'
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      handleError(res, err, `Failed to update ${label}`, `Media module update ${section} error`);
    }
  },
  remove: async (req, res) => {
    try {
      const data = await mediaService.deleteMediaRecord(req.params.id, req.projectId, req.user?.id || req.user?._id, section);
      if (!data) return res.status(404).json({ success: false, error: `${label} not found` });
      getMediaRequestLogger(req, { action: `delete:${section}` }).info(
        { projectId: req.projectId || null, section, mediaId: req.params.id },
        'Media section item deleted'
      );
      res.status(200).json({ success: true, data });
    } catch (err) {
      handleError(res, err, `Failed to delete ${label}`, `Media module delete ${section} error`);
    }
  },
});

exports.brandAssets = makeSectionController('brand', 'brand asset');
exports.design = makeSectionController('design', 'design item');
exports.video = makeSectionController('video', 'video item');
exports.social = makeSectionController('social', 'social post');

exports.uploadFile = async (req, res) => {
  try {
    const data = await mediaService.uploadMediaFile({
      file: req.file,
      section: req.body?.section,
      projectId: req.projectId,
    });
    getMediaRequestLogger(req, { action: 'uploadFile' }).info(
      { projectId: req.projectId || null, section: req.body?.section || 'asset', fileName: req.file?.originalname || null },
      'Media file uploaded'
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to upload media file', 'Media module uploadFile error');
  }
};

exports.uploadProjectLogo = async (req, res) => {
  try {
    const data = await mediaService.setProjectLogo(req.params.id, req.file);
    getMediaRequestLogger(req, { action: 'uploadProjectLogo' }).info(
      { projectId: req.params.id, fileName: req.file?.originalname || null },
      'Project logo uploaded'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to upload project logo', 'Media module uploadProjectLogo error');
  }
};

exports.updateProjectThemeColor = async (req, res) => {
  try {
    const data = await mediaService.setProjectThemeColor(req.params.id, req.body?.themeColor);
    getMediaRequestLogger(req, { action: 'updateProjectThemeColor' }).info(
      { projectId: req.params.id, themeColor: req.body?.themeColor || null },
      'Project theme color updated'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to update project theme color', 'Media module updateProjectThemeColor error');
  }
};

exports.requestApproval = async (req, res) => {
  try {
    const data = await mediaService.requestApproval({
      mediaId: req.params.id,
      requestedBy: req.user?.id || req.user?._id,
      projectId: req.projectId,
      section: req.mediaSection,
      steps: req.body?.steps,
    });
    getMediaRequestLogger(req, { action: 'requestApproval' }).info(
      { projectId: req.projectId || null, mediaId: req.params.id },
      'Media approval requested'
    );
    res.status(201).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to create approval request', 'Media module requestApproval error');
  }
};

exports.getModuleDataByProject = async (req, res) => {
  try {
    const data = await mediaService.getModuleDataByProject({
      moduleKey: req.params.moduleKey,
      projectId: req.params.projectId,
      query: req.query || {},
    });
    getMediaRequestLogger(req, { action: 'getModuleDataByProject' }).info(
      { moduleKey: req.params.moduleKey, projectId: req.params.projectId },
      'Media project module loaded'
    );
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to fetch project media data', 'Media module getModuleDataByProject error');
  }
};

exports.listApprovals = async (req, res) => {
  try {
    const data = await mediaService.listApprovals(req.query || {});
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to load approvals', 'Media module listApprovals error');
  }
};

exports.decideMediaApproval = async (req, res) => {
  try {
    const data = await mediaService.decideMediaApproval({
      workflowId: req.params.workflowId,
      actorId: req.user?.id || req.user?._id,
      actorRole: req.user?.role,
      decision: req.body?.decision,
      remarks: req.body?.remarks || '',
    });
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to decide approval request', 'Media module decideMediaApproval error');
  }
};

exports.getActivity = async (req, res) => {
  try {
    const data = await mediaService.getActivity();
    res.status(200).json({ success: true, data });
  } catch (err) {
    handleError(res, err, 'Failed to load activity feed', 'Media module getActivity error');
  }
};
