const express = require('express');
const { authenticate, authorize, authorizePortalAccess } = require('../../middlewares/auth.middleware');
const { requireProjectContext, attachOptionalProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { ROLES } = require('../../config/roles');
const controller = require('./media.controller');
const v = require('./media.validation');
const { canManageMedia, canDecideApproval } = require('./media.middleware');
const { uploadMediaFile } = require('./media.upload.middleware');
const campaignRoutes = require('./campaign.routes');
const budgetRoutes = require('./budget.routes');
const kpiRoutes = require('./kpi.routes');
const calendarController = require('./calendar.controller');
const calendarValidation = require('./calendar.validation');
const weeklyPlanRoutes = require('./weeklyPlan.routes');
const checklistRoutes = require('./checklist.routes');
const reportRoutes = require('./report.routes');

const router = express.Router();
const setMediaSection = (section) => (req, res, next) => {
  req.mediaSection = section;
  next();
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
  ROLES.ADS_MANAGER,
  ROLES.PROJECT_MANAGER,
  ROLES.DEPARTMENT_HEAD,
  ROLES.CLIENT_VIEWER,
  ROLES.CEO,
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
router.post('/assets/:id/approval-request', setMediaSection('asset'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.use('/campaigns', campaignRoutes);
router.use('/budget', budgetRoutes);
router.use('/kpi', kpiRoutes);
router.use('/weekly-plans', weeklyPlanRoutes);
router.use('/checklists', checklistRoutes);
router.use('/reports', reportRoutes);

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

router.get('/advertisements', v.listValidation, validate, controller.advertisements.list);
router.post('/advertisements', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.advertisements.create);
router.get('/advertisements/:id', v.mediaIdValidation, validate, controller.advertisements.getById);
router.put('/advertisements/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.advertisements.update);
router.delete('/advertisements/:id', canManageMedia, v.mediaIdValidation, validate, controller.advertisements.remove);
router.post('/advertisements/:id/approval-request', setMediaSection('advertisement'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/seo', v.listValidation, validate, controller.seo.list);
router.post('/seo', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.seo.create);
router.get('/seo/:id', v.mediaIdValidation, validate, controller.seo.getById);
router.put('/seo/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.seo.update);
router.delete('/seo/:id', canManageMedia, v.mediaIdValidation, validate, controller.seo.remove);
router.post('/seo/:id/approval-request', setMediaSection('seo'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/website', v.listValidation, validate, controller.website.list);
router.post('/website', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.website.create);
router.get('/website/:id', v.mediaIdValidation, validate, controller.website.getById);
router.put('/website/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.website.update);
router.delete('/website/:id', canManageMedia, v.mediaIdValidation, validate, controller.website.remove);
router.post('/website/:id/approval-request', setMediaSection('website'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/testimonials', v.listValidation, validate, controller.testimonials.list);
router.post('/testimonials', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.testimonials.create);
router.get('/testimonials/:id', v.mediaIdValidation, validate, controller.testimonials.getById);
router.put('/testimonials/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.testimonials.update);
router.delete('/testimonials/:id', canManageMedia, v.mediaIdValidation, validate, controller.testimonials.remove);
router.post('/testimonials/:id/approval-request', setMediaSection('testimonial'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/case-studies', v.listValidation, validate, controller.caseStudies.list);
router.post('/case-studies', requireProjectContext, canManageMedia, v.mediaRecordValidation, validate, controller.caseStudies.create);
router.get('/case-studies/:id', v.mediaIdValidation, validate, controller.caseStudies.getById);
router.put('/case-studies/:id', canManageMedia, v.mediaIdValidation, v.mediaRecordValidation, validate, controller.caseStudies.update);
router.delete('/case-studies/:id', canManageMedia, v.mediaIdValidation, validate, controller.caseStudies.remove);
router.post('/case-studies/:id/approval-request', setMediaSection('case-study'), canManageMedia, v.mediaIdValidation, validate, controller.requestApproval);

router.get('/approvals', v.listValidation, validate, controller.getApprovals);
router.patch('/approvals/:workflowId/decision', canDecideApproval, v.approvalDecisionValidation, validate, controller.decideApproval);

router.get('/calendar', calendarController.getCalendar);
router.post('/calendar/events', requireProjectContext, canManageMedia, calendarValidation.createEventValidation, validate, calendarController.createEvent);
router.put('/calendar/events/:id', requireProjectContext, canManageMedia, calendarValidation.eventIdValidation, calendarValidation.updateEventValidation, validate, calendarController.updateEvent);
router.delete('/calendar/events/:id', requireProjectContext, canManageMedia, calendarValidation.eventIdValidation, validate, calendarController.deleteEvent);

router.get('/reporting/summary', controller.getReportingSummary);
router.get('/:moduleKey/project/:projectId', requireProjectContext, v.moduleProjectValidation, validate, controller.getModuleDataByProject);

module.exports = router;
