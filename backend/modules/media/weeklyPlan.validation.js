const { body, param } = require('express-validator');

const planValidation = [
  body('weekStart').optional().isISO8601().withMessage('weekStart must be a valid date'),
  body('weekEnd').optional().isISO8601().withMessage('weekEnd must be a valid date'),
  body('objectives').optional().isArray().withMessage('objectives must be an array'),
];

const objectiveIdValidation = [
  param('id').isMongoId().withMessage('Invalid weekly plan id'),
  param('objectiveId').isMongoId().withMessage('Invalid objective id'),
];

const objectiveStatusValidation = [
  body('status').trim().isIn(['pending', 'in-progress', 'done']).withMessage('invalid objective status'),
];

module.exports = { planValidation, objectiveIdValidation, objectiveStatusValidation };
