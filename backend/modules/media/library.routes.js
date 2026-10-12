const express = require('express');
const { body, param, query } = require('express-validator');
const { validate } = require('../../middlewares/validate.middleware');
const { canManageMedia } = require('./media.middleware');
const service = require('./library.service');
const media = require('./media.service');
const router = express.Router();
const wrap = handler => async (req, res, next) => { try { res.json({ success: true, data: await handler(req) }); } catch (error) { if (error.statusCode) return res.status(error.statusCode).json({ success: false, error: error.message }); next(error); } };
const kinds = ['brand', 'creative', 'marketing', 'social', 'content', 'campaigns', 'documents', 'archive'];
const ids = [param('id').isMongoId()];
const queryValidation = [
  query('projectId').optional().isMongoId(), query('ownerId').optional().isMongoId(), query('campaignId').optional().isMongoId(), query('relatedTo').optional().isMongoId(),
  query('kind').optional().isIn(kinds), query('workspace').optional().isIn(['recent', 'favorites', 'mine', 'shared', 'approvals', 'versions', 'trash']),
  query('page').optional().isInt({ min: 1 }), query('limit').optional().isInt({ min: 1, max: 100 }),
  ...['search', 'tag', 'subcategory', 'assetType', 'platform', 'status', 'approvalStatus'].map(field => query(field).optional().isString().isLength({ max: 200 })),
  query('dateFrom').optional().isISO8601(), query('dateTo').optional().isISO8601(),
];
const recordValidation = [
  body('title').optional().isString().trim().isLength({ min: 1, max: 300 }), body('description').optional().isString().isLength({ max: 10000 }),
  ...['projectId', 'ownerId', 'campaignId'].map(field => body(field).optional().isMongoId()),
  body('libraryKind').optional().isIn(kinds.filter(kind => kind !== 'archive')),
  ...['category', 'subcategory', 'assetType', 'usageRights', 'versionNote'].map(field => body(field).optional().isString().isLength({ max: 1000 })),
  body('relatedIds').optional().isArray({ max: 100 }), body('relatedIds.*').isMongoId(),
  body('tags').optional().isArray({ max: 50 }), body('tags.*').isString().isLength({ max: 100 }),
  body('fileSizeBytes').optional().isFloat({ min: 0 }),
  ...['originalName', 'mimeType', 'storageKey', 'storageProvider'].map(field => body(field).optional().isString().isLength({ max: 1000 })),
  body('social').optional().isObject(), body('social.creativeAssetId').optional().isMongoId(),
  ...['platform', 'contentType', 'caption', 'cta', 'targetAudience'].map(field => body(`social.${field}`).optional().isString().isLength({ max: 10000 })),
  body('social.scheduledAt').optional().isISO8601(), body('social.publishedAt').optional().isISO8601(),
  body('social.hashtags').optional().isArray({ max: 50 }), body('social.hashtags.*').isString().isLength({ max: 100 }),
  body('campaignStatus').optional().isIn(['Draft', 'Planning', 'Active', 'Scheduled', 'Completed', 'Archived']),
  body('expiresAt').optional({ nullable: true }).isISO8601(), body('expectedUpdatedAt').optional().isISO8601(),
  ...['storageUrl', 'thumbnailUrl'].map(field => body(field).optional().isString().custom(value => !value || /^https?:\/\//i.test(value))),
];
router.get('/overview', queryValidation, validate, wrap(req => service.overview(req.user, req.query.projectId)));
router.get('/items', queryValidation, validate, wrap(req => service.list(req.user, req.query)));
router.get('/items/:id', ids, validate, wrap(req => service.detail(req.user, req.params.id)));
router.post('/items', canManageMedia, recordValidation, body('title').exists(), body('projectId').exists(), body('libraryKind').exists(), validate, wrap(req => service.create(req.user, req.body)));
router.put('/items/:id', canManageMedia, ids, recordValidation, validate, wrap(req => service.update(req.user, req.params.id, req.body)));
router.post('/items/:id/actions', ids,
  body('action').isIn(['favorite', 'share', 'archive', 'unarchive', 'trash', 'restore', 'restore-version', 'schedule', 'publish']),
  body('enabled').optional().isBoolean(), body('userId').optional().isMongoId(), body('number').optional().isInt({ min: 1 }), body('date').optional().isISO8601(), body('expectedUpdatedAt').optional().isISO8601(), validate,
  wrap(req => service.action(req.user, req.params.id, req.body)));
router.post('/items/:id/approval-request', canManageMedia, ids, validate, wrap(async req => {
  const record = await service.recordFor(req.user, req.params.id);
  if (record.deletedAt || record.archivedAt || record.status === 'Archived') { const error = new Error('Restore this item before submitting for review.'); error.statusCode = 409; throw error; }
  return media.requestApproval({ mediaId: record._id, requestedBy: req.user._id, projectId: record.projectId, section: record.section });
}));
module.exports = router;
