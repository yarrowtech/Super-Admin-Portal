// backend/routes/dept/finance.routes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance/financeDashboard.controller');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { ROLES } = require('../config/roles');
const modularFinanceRoutes = require('../modules/finance/finance.routes');

// All routes require authentication and finance/admin role
router.use(authenticate);
router.use(authorize(ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO, ROLES.HR));
router.use(authorizePortalAccess('finance'));
router.use('/module', modularFinanceRoutes);

const canWriteFinance = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  const readonly = new Set([ROLES.CEO]);
  if (readonly.has(role)) {
    return res.status(403).json({ success: false, error: 'Read-only role for finance operations' });
  }
  return next();
};

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
router.post('/invoices', canWriteFinance, financeController.createInvoice);
router.put('/invoices/:id', canWriteFinance, financeController.updateInvoice);
router.delete('/invoices/:id', canWriteFinance, financeController.deleteInvoice);
router.post('/invoices/:id/notes', canWriteFinance, financeController.createInvoiceNote);
router.get('/invoice-notes', financeController.getInvoiceNotes);

// Payments and Receivables
router.get('/payments', financeController.getPayments);
router.post('/payments', canWriteFinance, financeController.createPayment);
router.put('/payments/:id', canWriteFinance, financeController.updatePayment);

// Expense Management
router.get('/expenses', financeController.getExpenses);
router.post('/expenses', canWriteFinance, financeController.createExpense);
router.put('/expenses/:id', canWriteFinance, financeController.updateExpense);
router.delete('/expenses/:id', canWriteFinance, financeController.deleteExpense);

// Budget and Cost Control
router.get('/budgets', financeController.getBudgets);
router.post('/budgets', canWriteFinance, financeController.createBudget);
router.put('/budgets/:id', canWriteFinance, financeController.updateBudget);
router.get('/cost-centers', financeController.getCostCenters);
router.post('/cost-centers', canWriteFinance, financeController.createCostCenter);
router.put('/cost-centers/:id', canWriteFinance, financeController.updateCostCenter);

// Payroll Processing
router.get('/payrolls', financeController.getPayrolls);
router.post('/payrolls', canWriteFinance, financeController.createPayroll);
router.put('/payrolls/:id', canWriteFinance, financeController.updatePayroll);

// Financial Reports
router.get('/reports', financeController.getReports);
router.post('/reports', canWriteFinance, financeController.createReport);
router.get('/reports/trial-balance', financeController.getTrialBalance);
router.get('/reports/balance-sheet', financeController.getBalanceSheet);
router.get('/reports/profit-loss', financeController.getProfitLoss);
router.get('/reports/tax-summary', financeController.getTaxSummary);
router.get('/reports/itr-summary', financeController.getItrSummary);

// Compliance, Audit, and Taxation
router.get('/compliance', financeController.getCompliance);
router.post('/compliance', canWriteFinance, financeController.createCompliance);
router.put('/compliance/:id', canWriteFinance, financeController.updateCompliance);

// Vendors and Clients
router.get('/vendors', financeController.getVendors);
router.post('/vendors', canWriteFinance, financeController.createVendor);
router.put('/vendors/:id', canWriteFinance, financeController.updateVendor);
router.get('/clients', financeController.getClients);
router.post('/clients', canWriteFinance, financeController.createClient);
router.put('/clients/:id', canWriteFinance, financeController.updateClient);

// Enterprise workflow and observability
router.get('/transactions', financeController.getTransactions);
router.get('/audit-logs', financeController.getAuditLogs);
router.get('/approvals', financeController.getApprovalWorkflows);
router.post('/approvals', canWriteFinance, financeController.createApprovalWorkflow);
router.patch('/approvals/:id/decision', canWriteFinance, financeController.updateApprovalWorkflowDecision);
router.post('/integrations/hr/payroll-sync', canWriteFinance, financeController.syncPayrollFromHr);
router.post('/integrations/law/compliance-link', canWriteFinance, financeController.linkComplianceWithLaw);
router.get('/integrations/snapshot', financeController.getIntegrationSnapshot);

module.exports = router;
