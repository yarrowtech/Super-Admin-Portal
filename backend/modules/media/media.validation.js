const { body, param, query } = require('express-validator');

const MEDIA_MODULE_KEYS = [
  'dashboard',
  'assets',
  'content',
  'brand',
  'design',
  'video',
  'social',
  'archive',
];

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
  query('status').optional().trim().isLength({ min: 1, max: 50 }),
  query('priority').optional().trim().isLength({ min: 1, max: 50 }),
  query('search').optional().trim().isLength({ max: 200 }),
];

const mediaHeadListValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('limit must be between 1 and 100'),
  query('status').optional().trim().isLength({ min: 1, max: 50 }),
  query('health').optional().trim().isIn(['COMPLETED', 'BLOCKED', 'AT_RISK', 'ATTENTION', 'ON_TRACK']),
  query('search').optional().trim().isLength({ max: 200 }),
  query('sortBy').optional().trim().isIn(['createdAt', 'updatedAt', 'name', 'status', 'priority', 'deadline', 'progress']),
  query('order').optional().trim().isIn(['asc', 'desc']),
  query('dateFrom').optional().isISO8601().withMessage('dateFrom must be an ISO date'),
  query('dateTo').optional().isISO8601().withMessage('dateTo must be an ISO date'),
];

const mediaIdValidation = [param('id').isMongoId().withMessage('Invalid media id')];

const mediaRecordValidation = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('section').optional().trim().isIn([
    'dashboard',
    'asset',
    'content',
    'brand',
    'design',
    'video',
    'social',
    'archive',
  ]),
  body('moduleType').optional().trim().isLength({ min: 1, max: 80 }),
  body('description').optional().trim().isLength({ max: 10000 }),
  body('status').optional().trim().isLength({ min: 1, max: 50 }),
  body('priority').optional().trim().isIn(['Low', 'Medium', 'High', 'Critical']),
  body('projectId').optional().isMongoId().withMessage('projectId must be valid'),
  body('departmentId').optional().isMongoId().withMessage('departmentId must be valid'),
  body('clientId').optional().isMongoId().withMessage('clientId must be valid'),
  body('teamId').optional().isMongoId().withMessage('teamId must be valid'),
  body('campaignId').optional().isMongoId().withMessage('campaignId must be valid'),
  body('folderPath').optional().trim().isLength({ max: 500 }),
  body('category').optional().trim().isLength({ max: 120 }),
  body('tags').optional().isArray().withMessage('tags must be an array'),
  body('assignedEmployees').optional().isArray().withMessage('assignedEmployees must be an array'),
  body('metadata').optional().isObject().withMessage('metadata must be an object'),
  body('analytics').optional().isObject().withMessage('analytics must be an object'),
  body('budgetImpact').optional().isObject().withMessage('budgetImpact must be an object'),
  body('spend').optional().isFloat({ min: 0 }).withMessage('spend must be >= 0'),
  body('roi').optional().isFloat().withMessage('roi must be numeric'),
  body('storageUrl').optional().trim().isLength({ max: 2000 }).withMessage('storageUrl too long'),
  body('thumbnailUrl').optional().trim().isLength({ max: 2000 }).withMessage('thumbnailUrl too long'),
  body('previewUrl').optional().trim().isLength({ max: 2000 }).withMessage('previewUrl too long'),
  body('storageKey').optional().trim().isLength({ max: 500 }).withMessage('storageKey too long'),
  body('storageProvider').optional().trim().isIn(['cloudinary']).withMessage('media files must use Cloudinary storage'),
  body('mimeType').optional().trim().isLength({ max: 120 }).withMessage('mimeType too long'),
  body('fileSizeBytes').optional().isInt({ min: 0 }).withMessage('fileSizeBytes must be >= 0'),
];

const themeColorValidation = [
  param('id').isMongoId().withMessage('Invalid project id'),
  body('themeColor')
    .trim()
    .matches(/^#([0-9a-fA-F]{6}|[0-9a-fA-F]{3})$/)
    .withMessage('themeColor must be a hex color like #0f766e'),
];

const moduleProjectValidation = [
  param('moduleKey').trim().isIn(MEDIA_MODULE_KEYS).withMessage('invalid module key'),
  param('projectId').isMongoId().withMessage('Invalid projectId'),
];

module.exports = {
  listValidation,
  mediaHeadListValidation,
  mediaIdValidation,
  mediaRecordValidation,
  themeColorValidation,
  moduleProjectValidation,
};
