const { param, body } = require('express-validator');

const projectIdValidation = [param('projectId').isMongoId().withMessage('Invalid project id')];

const marketingPlanValidation = [
  body('overview').optional().isObject().withMessage('overview must be an object'),
  body('goals').optional().isObject().withMessage('goals must be an object'),
  body('framework').optional().isArray().withMessage('framework must be an array'),
  body('planning').optional().isObject().withMessage('planning must be an object'),
  body('funnelStages').optional().isArray().withMessage('funnelStages must be an array'),
  body('kpiPlan').optional().isArray().withMessage('kpiPlan must be an array'),
  body('budgetPlan').optional().isArray().withMessage('budgetPlan must be an array'),

  body('weeklyChecklist').optional().isArray().withMessage('weeklyChecklist must be an array'),
  body('weeklyUpdates').optional().isArray().withMessage('weeklyUpdates must be an array'),
  body('acquisitionBudget').optional().isArray().withMessage('acquisitionBudget must be an array'),
  body('funnelPerformance').optional().isArray().withMessage('funnelPerformance must be an array'),
  body('contentTracker').optional().isArray().withMessage('contentTracker must be an array'),
  body('priorityMatrix').optional().isObject().withMessage('priorityMatrix must be an object'),
  body('deliverables').optional().isArray().withMessage('deliverables must be an array'),
  body('performanceSnapshot').optional().isObject().withMessage('performanceSnapshot must be an object'),
  body('notes').optional().isObject().withMessage('notes must be an object'),
];

module.exports = { projectIdValidation, marketingPlanValidation };
