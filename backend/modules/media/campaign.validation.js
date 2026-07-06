const { body, param, query } = require('express-validator');
const { CAMPAIGN_STATUSES } = require('../../models/department/Campaign');

const listValidation = [
  query('page').optional().isInt({ min: 1 }).withMessage('page must be >= 1'),
  query('limit').optional().isInt({ min: 1, max: 200 }).withMessage('limit must be between 1 and 200'),
  query('status').optional().trim().isIn(CAMPAIGN_STATUSES).withMessage('invalid status'),
  query('search').optional().trim().isLength({ max: 200 }),
];

const campaignIdValidation = [param('id').isMongoId().withMessage('Invalid campaign id')];

const campaignRecordValidation = [
  body('name').trim().notEmpty().withMessage('name is required'),
  body('objective').optional().trim().isLength({ max: 2000 }),
  body('description').optional().trim().isLength({ max: 10000 }),
  body('platform').optional().isArray().withMessage('platform must be an array'),
  body('status').optional().trim().isIn(CAMPAIGN_STATUSES).withMessage('invalid status'),
  body('budgetAllocated').optional().isFloat({ min: 0 }).withMessage('budgetAllocated must be >= 0'),
  body('teamMembers').optional().isArray().withMessage('teamMembers must be an array'),
  body('startDate').optional().isISO8601().withMessage('startDate must be a valid date'),
  body('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
  body('projectId').optional().isMongoId().withMessage('projectId must be valid'),
  body('kpiTargets').optional().isObject().withMessage('kpiTargets must be an object'),
];

const campaignStageValidation = [
  body('status').trim().isIn(CAMPAIGN_STATUSES).withMessage('invalid stage'),
];

const taskIdValidation = [
  param('id').isMongoId().withMessage('Invalid campaign id'),
  param('taskId').isMongoId().withMessage('Invalid task id'),
];

const taskStatusValidation = [
  body('status').trim().isIn(['pending', 'in-progress', 'review', 'completed', 'cancelled']).withMessage('invalid task status'),
];

module.exports = {
  listValidation,
  campaignIdValidation,
  campaignRecordValidation,
  campaignStageValidation,
  taskIdValidation,
  taskStatusValidation,
};
