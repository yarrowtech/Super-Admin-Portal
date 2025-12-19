// backend/routes/dept/finance.routes.js
const express = require('express');
const router = express.Router();
const financeController = require('../../controllers/dept/finance.controller');
const { authenticate, authorize } = require('../../middleware/auth');
const { ROLES } = require('../../config/roles');

// All routes require authentication and FINANCE role
router.use(authenticate);
router.use(authorize(ROLES.FINANCE, ROLES.ADMIN));

// Finance specific routes
router.get('/dashboard', financeController.getDashboard);
router.get('/reports', financeController.getReports);
router.get('/budgets', financeController.getBudgets);
router.get('/invoices', financeController.getInvoices);

module.exports = router;
