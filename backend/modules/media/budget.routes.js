const express = require('express');
const { requireProjectContext } = require('../../middlewares/project.middleware');
const { validate } = require('../../middlewares/validate.middleware');
const { canManageMedia } = require('./media.middleware');
const controller = require('./budget.controller');
const v = require('./budget.validation');

const router = express.Router();

// Mounted at /api/dept/media/budget by media.routes.js (inherits auth/portal/project middleware).
router.use(requireProjectContext);

router.get('/', controller.getAllocation);
router.put('/', canManageMedia, v.allocationValidation, validate, controller.upsertAllocation);
router.get('/summary', controller.getSummary);
router.get('/expenses', controller.listExpenses);
router.post('/expenses', canManageMedia, v.expenseValidation, validate, controller.addExpense);

module.exports = router;
