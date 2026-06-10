const express = require('express');
const { authenticate, authorize, authorizePortalAccess } = require('../../middlewares/auth.middleware');
const { requireProjectContext, attachOptionalProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { ROLES } = require('../../config/roles');
const controller = require('./media.controller');
const v = require('./media.validation');

const router = express.Router();

const canManageMedia = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media', 'marketing_head', 'media_manager', 'content_writer', 'graphic_designer', 'video_editor', 'seo_specialist', 'social_media_manager', 'project_manager', 'department_head', 'client_viewer', 'manager', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot manage media records' });
};

const canDecideApproval = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (['media', 'marketing_head', 'media_manager', 'project_manager', 'department_head', 'client_viewer', 'admin', 'super_admin'].includes(role)) {
    return next();
  }
  return res.status(403).json({ success: false, error: 'Role cannot decide media approvals' });
};

router.use(authenticate);
router.use(authorize(
  ROLES.MEDIA,
  ROLES.MARKETING_HEAD,
  ROLES.MEDIA_MANAGER,
  ROLES.CONTENT_WRITER,
  ROLES.GRAPHIC_DESIGNER,
  ROLES.VIDEO_EDITOR,
  ROLES.SEO_SPECIALIST,
  ROLES.SOCIAL_MEDIA_MANAGER,
  ROLES.PROJECT_MANAGER,
  ROLES.DEPARTMENT_HEAD,
  ROLES.CLIENT_VIEWER,
  ROLES.ADMIN,
  ROLES.SUPER_ADMIN
));
router.use(authorizePortalAccess('media'));
router.use(attachOptionalProjectContext);

router.get('/dashboard', controller.getDashboard);
router.get('/overview', controller.getOverview);
router.get('/projects', v.listValidation, validate, controller.getProjects);

router.get('/assets', v.listValidation, validate, controller.getAssets);
router.post('/assets', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.createAsset);
router.get('/assets/:id', v.mediaIdValidation, validate, controller.getAssetById);
router.put('/assets/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.updateAsset);
router.delete('/assets/:id', canManageMedia, v.mediaIdValidation, validate, controller.deleteAsset);
router.post('/assets/:id/approval-request', canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/campaigns', v.listValidation, validate, controller.getCampaigns);
router.post('/campaigns', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.createCampaign);

router.get('/content', v.listValidation, validate, controller.getContent);
router.post('/content', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.createContent);

router.get('/brand-assets', v.listValidation, validate, controller.getBrandAssets);
router.get('/approvals', v.listValidation, validate, controller.getApprovals);
router.patch('/approvals/:workflowId/decision', canDecideApproval, v.approvalDecisionValidation, validate, controller.decideApproval);

router.get('/reporting/summary', controller.getReportingSummary);
router.get('/:moduleKey/project/:projectId', requireProjectContext, v.moduleProjectValidation, validate, controller.getModuleDataByProject);

module.exports = router;
