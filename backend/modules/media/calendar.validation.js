const { body, param } = require('express-validator');

const eventIdValidation = [
  param('id').isMongoId().withMessage('Invalid calendar event id'),
];

const createEventValidation = [
  body('title').trim().notEmpty().withMessage('title is required'),
  body('date').isISO8601().withMessage('date must be a valid date'),
  body('type').optional().trim(),
  body('description').optional().trim(),
];

const updateEventValidation = [
  body('title').optional().trim().notEmpty().withMessage('title must not be empty'),
  body('date').optional().isISO8601().withMessage('date must be a valid date'),
  body('type').optional().trim(),
  body('description').optional().trim(),
];

module.exports = { eventIdValidation, createEventValidation, updateEventValidation };
