// backend/routes/dept/finance.routes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance/financeDashboard.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');

// All routes require authentication and finance/admin role
router.use(authenticate);
router.use(authorize(ROLES.FINANCE, ROLES.ADMIN));
router.use(authorizePortalAccess('finance'));

// Finance dashboard
router.get('/dashboard', financeController.getDashboard);

// ERP Chart of Accounts
router.get('/accounts', financeController.getAccounts);
router.post('/accounts', financeController.createAccount);
router.put('/accounts/:id', financeController.updateAccount);

// ERP Journals
router.get('/journals', financeController.getJournalEntries);
router.post('/journals', financeController.createJournalEntry);
router.put('/journals/:id', financeController.updateJournalEntry);
router.post('/journals/:id/post', financeController.postJournalEntry);

// Invoice and Billing
router.get('/invoices', financeController.getInvoices);
router.post('/invoices', financeController.createInvoice);
router.put('/invoices/:id', financeController.updateInvoice);
router.delete('/invoices/:id', financeController.deleteInvoice);
router.post('/invoices/:id/notes', financeController.createInvoiceNote);
router.get('/invoice-notes', financeController.getInvoiceNotes);

// Payments and Receivables
router.get('/payments', financeController.getPayments);
router.post('/payments', financeController.createPayment);
router.put('/payments/:id', financeController.updatePayment);

// Expense Management
router.get('/expenses', financeController.getExpenses);
router.post('/expenses', financeController.createExpense);
router.put('/expenses/:id', financeController.updateExpense);
router.delete('/expenses/:id', financeController.deleteExpense);

// Budget and Cost Control
router.get('/budgets', financeController.getBudgets);
router.post('/budgets', financeController.createBudget);
router.put('/budgets/:id', financeController.updateBudget);
router.get('/cost-centers', financeController.getCostCenters);
router.post('/cost-centers', financeController.createCostCenter);
router.put('/cost-centers/:id', financeController.updateCostCenter);

// Payroll Processing
router.get('/payrolls', financeController.getPayrolls);
router.post('/payrolls', financeController.createPayroll);
router.put('/payrolls/:id', financeController.updatePayroll);

// Financial Reports
router.get('/reports', financeController.getReports);
router.post('/reports', financeController.createReport);
router.get('/reports/trial-balance', financeController.getTrialBalance);
router.get('/reports/balance-sheet', financeController.getBalanceSheet);
router.get('/reports/profit-loss', financeController.getProfitLoss);
router.get('/reports/tax-summary', financeController.getTaxSummary);
router.get('/reports/itr-summary', financeController.getItrSummary);

// Compliance, Audit, and Taxation
router.get('/compliance', financeController.getCompliance);
router.post('/compliance', financeController.createCompliance);
router.put('/compliance/:id', financeController.updateCompliance);

// Vendors and Clients
router.get('/vendors', financeController.getVendors);
router.post('/vendors', financeController.createVendor);
router.put('/vendors/:id', financeController.updateVendor);
router.get('/clients', financeController.getClients);
router.post('/clients', financeController.createClient);
router.put('/clients/:id', financeController.updateClient);

module.exports = router;
