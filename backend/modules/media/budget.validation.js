const { body } = require('express-validator');

const allocationValidation = [
  body('totalBudget').optional().isFloat({ min: 0 }).withMessage('totalBudget must be >= 0'),
  body('platformAllocations').optional().isArray().withMessage('platformAllocations must be an array'),
  body('campaignAllocations').optional().isArray().withMessage('campaignAllocations must be an array'),
];

const expenseValidation = [
  body('amount').isFloat({ min: 0 }).withMessage('amount must be >= 0'),
  body('platform').optional().trim().isLength({ max: 80 }),
  body('category').optional().trim().isLength({ max: 80 }),
  body('campaignId').optional().isMongoId().withMessage('campaignId must be valid'),
  body('note').optional().trim().isLength({ max: 500 }),
];

module.exports = { allocationValidation, expenseValidation };
