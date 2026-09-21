// backend/routes/dept/finance.routes.js
const express = require('express');
const router = express.Router();
const financeController = require('../controllers/finance/financeDashboard.controller');
const hrController = require('../controllers/hr/hrDashboard.controller');
const { departmentScope, mountDepartmentModules } = require('../middlewares/departmentScope.middleware');
const mountDepartmentCollab = require('../utils/mountDepartmentCollab');
const { authenticate, authorize, authorizePortalAccess } = require('../middlewares/auth.middleware');
const { cacheGetResponses, invalidateCacheAfterMutation } = require('../middlewares/cacheInvalidation.middleware');
const { ROLES } = require('../config/roles');
const { attachOptionalProjectContext } = require('../middlewares/project.middleware');
const modularFinanceRoutes = require('../modules/finance/finance.routes');

// All routes require authentication and finance/admin role
router.use(authenticate);
router.use(authorize(ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO, ROLES.HR));
router.use(authorizePortalAccess('finance'));
router.use(cacheGetResponses('finance', { tags: ['finance', 'dashboard', 'analytics'] }));
router.use(invalidateCacheAfterMutation('finance'));
router.use('/module', modularFinanceRoutes);

const canWriteFinance = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  const readonly = new Set([ROLES.CEO]);
  if (readonly.has(role)) {
    return res.status(403).json({ success: false, error: 'Read-only role for finance operations' });
  }
  return next();
};

const canControlFinance = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if ([ROLES.FINANCE_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(role)) return next();
  return res.status(403).json({ success: false, error: 'Finance Head permission required' });
};

// Finance dashboard
router.get('/dashboard', financeController.getDashboard);
router.get('/departments', financeController.getDepartmentFinancials);
router.get('/departments/catalog', financeController.listDepartments);
router.get('/requests', financeController.getFinanceRequests);
router.get('/requests/:id', financeController.getFinanceRequestDetail);
router.patch('/requests/:id/:action', canWriteFinance, financeController.updateFinanceRequestAction);
router.get('/departments/:departmentId', financeController.getDepartmentFinancialProfile);

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
router.delete('/invoices/:id', canControlFinance, financeController.deleteInvoice);
router.post('/invoices/:id/notes', canWriteFinance, financeController.createInvoiceNote);
router.get('/invoice-notes', financeController.getInvoiceNotes);

// Payments and Receivables
router.get('/payments', attachOptionalProjectContext, financeController.getPayments);
router.post('/payments', attachOptionalProjectContext, canWriteFinance, financeController.createPayment);
router.put('/payments/:id', attachOptionalProjectContext, canWriteFinance, financeController.updatePayment);

// Expense Management
router.get('/expenses', financeController.getExpenses);
router.post('/expenses', canWriteFinance, financeController.createExpense);
router.put('/expenses/:id', canWriteFinance, financeController.updateExpense);
router.delete('/expenses/:id', canControlFinance, financeController.deleteExpense);

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
router.get('/compliance', attachOptionalProjectContext, financeController.getCompliance);
router.post('/compliance', attachOptionalProjectContext, canWriteFinance, financeController.createCompliance);
router.put('/compliance/:id', attachOptionalProjectContext, canWriteFinance, financeController.updateCompliance);

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
router.patch('/approvals/:id/decision', canControlFinance, financeController.updateApprovalWorkflowDecision);
router.post('/integrations/hr/payroll-sync', canWriteFinance, financeController.syncPayrollFromHr);
router.post('/integrations/law/compliance-link', canWriteFinance, financeController.linkComplianceWithLaw);
router.get('/integrations/snapshot', financeController.getIntegrationSnapshot);

// Tasks / Attendance / Jobs — department-scoped views over the same shared
// Task/Attendance/JobPost models HR's controller already operates on
// (backend/controllers/hr/hrDashboard.controller.js). No new data model is
// introduced; these endpoints just mirror HR's route surface for Finance.
const scope = departmentScope({
  roles: [ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE],
  label: 'Finance',
  selfOnlyRoles: [ROLES.FINANCE_EMPLOYEE],
  headRoles: [ROLES.FINANCE_MANAGER],
  portalKey: 'finance',
});
const canManageFinanceTasks = authorize(ROLES.FINANCE_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN);
// Recruitment/job-posting is HR-only, so the shared jobs module is not mounted here.
mountDepartmentModules(router, scope, hrController, {
  taskManage: canManageFinanceTasks,
  taskManageRoles: [ROLES.FINANCE_MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  jobs: false,
});

// Finance-only Team directory + Messages (chat services also enforce this by role).
mountDepartmentCollab(router, 'finance', authorize(ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE));

module.exports = router;
