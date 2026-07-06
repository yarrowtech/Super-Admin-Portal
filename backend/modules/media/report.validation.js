const { body } = require('express-validator');
const { PERIOD_TYPES } = require('../../models/department/MarketingReport');

const generateValidation = [
  body('periodType').optional().trim().isIn(PERIOD_TYPES).withMessage('invalid periodType'),
];

module.exports = { generateValidation };
