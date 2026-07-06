const { body, param } = require('express-validator');
const { CHECKLIST_TYPES } = require('../../models/department/ProjectChecklist');

const checklistTypeValidation = [param('checklistType').isIn(CHECKLIST_TYPES).withMessage('invalid checklist type')];

const addItemValidation = [
  ...checklistTypeValidation,
  body('label').trim().notEmpty().withMessage('label is required'),
];

const toggleItemValidation = [
  ...checklistTypeValidation,
  param('itemId').isMongoId().withMessage('Invalid item id'),
];

module.exports = { checklistTypeValidation, addItemValidation, toggleItemValidation };
