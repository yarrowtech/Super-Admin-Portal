const express = require('express');
const { authenticate, authorize, authorizePortalAccess } = require('../../middlewares/auth.middleware');
const { requireProjectContext, attachOptionalProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { ROLES } = require('../../config/roles');
const controller = require('./media.controller');
const v = require('./media.validation');
const { canManageMedia, canViewMediaHead, canDecideApproval } = require('./media.middleware');
const { uploadMediaFile } = require('./media.upload.middleware');
const marketingPlanRoutes = require('./marketingPlan.routes');

const router = express.Router();
const setMediaSection = (section) => (req, res, next) => {
  req.mediaSection = section;
  next();
};

router.use(authenticate);
router.use(authorize(
  ROLES.MEDIA_HEAD,
  ROLES.MEDIA_MARKETING,
  ROLES.CEO,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
));
router.use(authorizePortalAccess('media'));
router.use(attachOptionalProjectContext);
router.use((req, res, next) => {
  if (req.log?.child) {
    req.log = req.log.child({ module: 'media', portal: 'media' });
  }
  next();
});

router.get('/dashboard', controller.getDashboard);
router.get('/overview', controller.getOverview);
router.get('/projects', v.listValidation, validate, controller.getProjects);

router.get('/head/dashboard', canViewMediaHead, v.mediaHeadListValidation, validate, controller.getMediaHeadDashboard);
router.get('/head/overview', canViewMediaHead, v.mediaHeadListValidation, validate, controller.getMediaHeadDashboard);
router.get('/head/kpis', canViewMediaHead, v.mediaHeadListValidation, validate, controller.getMediaHeadDashboard);
router.get('/head/attention', canViewMediaHead, controller.getMediaHeadAttention);
router.get('/head/team', canViewMediaHead, controller.getMediaHeadTeam);
router.get('/head/deadlines', canViewMediaHead, controller.getMediaHeadDeadlines);
router.get('/head/projects', canViewMediaHead, v.mediaHeadListValidation, validate, controller.getMediaHeadProjects);
router.get('/head/sales-summary', canViewMediaHead, v.mediaHeadListValidation, validate, controller.getMediaHeadSalesSummary);
router.get('/head/marketing-summary', canViewMediaHead, v.mediaHeadListValidation, validate, controller.getMediaHeadMarketingSummary);
router.get('/head/revenue', canViewMediaHead, v.mediaHeadListValidation, validate, controller.getMediaHeadRevenue);
router.get('/head/approvals', canViewMediaHead, controller.listApprovals);
router.get('/head/activity', canViewMediaHead, controller.getActivity);
router.get('/head/reports', canViewMediaHead, v.mediaHeadListValidation, validate, controller.getMediaHeadDashboard);

router.post('/projects/:id/logo', canManageMedia, v.mediaIdValidation, validate, uploadMediaFile(), controller.uploadProjectLogo);
router.patch('/projects/:id/theme-color', canManageMedia, v.themeColorValidation, validate, controller.updateProjectThemeColor);

router.get('/assets', v.listValidation, validate, controller.getAssets);
router.get('/campaigns', v.listValidation, validate, controller.getCampaigns);
router.post('/assets', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.createAsset);
router.get('/assets/:id', v.mediaIdValidation, validate, controller.getAssetById);
router.put('/assets/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.updateAsset);
router.delete('/assets/:id', canManageMedia, v.mediaIdValidation, validate, controller.deleteAsset);
router.post('/assets/:id/approval-request', setMediaSection('asset'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.use('/marketing-plans', marketingPlanRoutes);

router.get('/content', v.listValidation, validate, controller.getContent);
router.post('/content', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.createContent);
router.get('/content/:id', v.mediaIdValidation, validate, controller.getContentById);
router.put('/content/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.updateContent);
router.delete('/content/:id', canManageMedia, v.mediaIdValidation, validate, controller.deleteContent);
router.post('/content/:id/approval-request', setMediaSection('content'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.post('/upload', uploadMediaFile(), requireProjectContext, canManageMedia, controller.uploadFile);

router.get('/brand-assets', v.listValidation, validate, controller.getBrandAssets);
router.post('/brand-assets', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.brandAssets.create);
router.get('/brand-assets/:id', v.mediaIdValidation, validate, controller.brandAssets.getById);
router.put('/brand-assets/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.brandAssets.update);
router.delete('/brand-assets/:id', canManageMedia, v.mediaIdValidation, validate, controller.brandAssets.remove);
router.post('/brand-assets/:id/approval-request', setMediaSection('brand'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/design', v.listValidation, validate, controller.design.list);
router.post('/design', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.design.create);
router.get('/design/:id', v.mediaIdValidation, validate, controller.design.getById);
router.put('/design/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.design.update);
router.delete('/design/:id', canManageMedia, v.mediaIdValidation, validate, controller.design.remove);
router.post('/design/:id/approval-request', setMediaSection('design'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/video', v.listValidation, validate, controller.video.list);
router.post('/video', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.video.create);
router.get('/video/:id', v.mediaIdValidation, validate, controller.video.getById);
router.put('/video/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.video.update);
router.delete('/video/:id', canManageMedia, v.mediaIdValidation, validate, controller.video.remove);
router.post('/video/:id/approval-request', setMediaSection('video'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/social', v.listValidation, validate, controller.social.list);
router.post('/social', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.social.create);
router.get('/social/:id', v.mediaIdValidation, validate, controller.social.getById);
router.put('/social/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.social.update);
router.delete('/social/:id', canManageMedia, v.mediaIdValidation, validate, controller.social.remove);
router.post('/social/:id/approval-request', setMediaSection('social'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/approvals', controller.listApprovals);
router.patch('/approvals/:workflowId/decision', canDecideApproval, controller.decideMediaApproval);
router.get('/activity', controller.getActivity);

router.get('/:moduleKey/project/:projectId', requireProjectContext, v.moduleProjectValidation, validate, controller.getModuleDataByProject);

module.exports = router;
