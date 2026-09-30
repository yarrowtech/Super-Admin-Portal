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
router.use(cacheGetResponses('finance', { tags: ['finance', 'dashboard', 'analytics'], skip: (req) => /salary|payroll|financial-summary|invoices|payments|bank-transactions|expenses|budgets|reports|receivables|tax|audit-logs/.test(req.path) }));
router.use(invalidateCacheAfterMutation('finance'));
router.use('/module', modularFinanceRoutes);

// CEO and HR can view finance but never change it (HR keeps only the payroll sync below).
const canWriteFinance = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  const readonly = new Set([ROLES.CEO, ROLES.HR]);
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

const canSyncPayroll = (req, res, next) => {
  const role = String(req.user?.role || '').toLowerCase();
  if (role === ROLES.CEO) return res.status(403).json({ success: false, error: 'Read-only role for finance operations' });
  return next();
};

// Maker-checker: finance employees prepare and submit; the finance head approves or returns.
const headOnlyStatus = financeController.guardHeadOnlyStatus;
const notUnderReview = financeController.guardNotUnderReview;
router.get('/review/queue', financeController.getReviewQueue);
router.post('/review/:module/:id/submit', canWriteFinance, financeController.submitForReview);
router.post('/review/:module/:id/decision', canControlFinance, financeController.decideReview);

router.get('/bank-transactions', financeController.bankList);
router.post('/bank-transactions/import', canWriteFinance, financeController.bankImport);
router.get('/salary-profiles/employees', canControlFinance, financeController.salaryEmployees);
router.get('/salary-profiles', canControlFinance, financeController.getSalaries);
router.post('/salary-profiles', canControlFinance, financeController.saveSalary);

router.get('/financial-summary', financeController.summary);
router.get('/reports/export', financeController.reportExport);
router.get('/documents/:kind/:id/download', financeController.documentExport);
router.get('/invoices/:id', (req, res) => financeController.getInvoices({ ...req, query: { ...req.query, recordId: req.params.id } }, res));

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
router.post('/accounts', canControlFinance, financeController.createAccount);
router.put('/accounts/:id', canControlFinance, financeController.updateAccount);

// ERP Journals
router.get('/journals', financeController.getJournalEntries);
router.post('/journals', canWriteFinance, financeController.createJournalEntry);
router.put('/journals/:id', canWriteFinance, notUnderReview('journal'), financeController.updateJournalEntry);
router.post('/journals/:id/post', canControlFinance, financeController.postJournalEntry);

// Invoice and Billing
router.get('/invoices', financeController.getInvoices);
router.post('/invoices', canWriteFinance, headOnlyStatus('invoice'), financeController.createInvoice);
router.put('/invoices/:id', canWriteFinance, headOnlyStatus('invoice'), notUnderReview('invoice'), financeController.updateInvoice);
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
router.post('/budgets', canControlFinance, financeController.createBudget);
router.put('/budgets/:id', canControlFinance, financeController.updateBudget);
router.get('/cost-centers', financeController.getCostCenters);
router.post('/cost-centers', canControlFinance, financeController.createCostCenter);
router.put('/cost-centers/:id', canControlFinance, financeController.updateCostCenter);

// Payroll Processing
router.get('/payrolls', financeController.getPayrolls);
router.post('/payrolls', canWriteFinance, headOnlyStatus('payroll'), financeController.createPayroll);
router.put('/payrolls/:id', canWriteFinance, headOnlyStatus('payroll'), notUnderReview('payroll'), financeController.updatePayroll);

// Financial Reports
router.get('/reports', financeController.getReports);
router.post('/reports', canWriteFinance, financeController.createReport);
router.get('/reports/trial-balance', financeController.getTrialBalance);
router.get('/reports/balance-sheet', financeController.getBalanceSheet);
router.get('/reports/profit-loss', financeController.getProfitLoss);
router.get('/reports/tax-summary', financeController.getTaxSummary);
router.get('/reports/itr-summary', financeController.getItrSummary);
router.get('/reports/period-summary', financeController.getPeriodSummary);
router.get('/reports/period-summary/export', financeController.periodCsv);
router.get('/reports/revenue', financeController.getRevenueReport);
router.get('/receivables/customers', financeController.getCustomerBalances);

// Tax rules and statutory filing preparation (external filing integrations are not connected)
router.get('/tax-rules', financeController.listTaxRules);
router.post('/tax-rules', canControlFinance, financeController.createTaxRule);
router.patch('/tax-rules/:id', canControlFinance, financeController.updateTaxRule);
router.get('/tax/gst-return', financeController.getGstReturn);
router.get('/tax/gst-return/export', financeController.gstCsv);
router.get('/tax/tds-return', financeController.getTdsReturn);
router.get('/tax/tds-return/export', financeController.tdsCsv);
router.get('/audit-logs/export', financeController.auditCsv);

// Compliance, Audit, and Taxation
router.get('/compliance', attachOptionalProjectContext, financeController.getCompliance);
router.post('/compliance', attachOptionalProjectContext, canWriteFinance, financeController.createCompliance);
router.put('/compliance/:id', attachOptionalProjectContext, canWriteFinance, financeController.updateCompliance);

// Vendors and Clients
router.get('/vendors', financeController.getVendors);
router.post('/vendors', canWriteFinance, financeController.createVendor);
router.put('/vendors/:id', canWriteFinance, financeController.updateVendor);
router.post('/vendors/:id/ledger', canWriteFinance, financeController.addVendorLedgerEntry);
router.get('/clients', financeController.getClients);
router.post('/clients', canWriteFinance, financeController.createClient);
router.put('/clients/:id', canWriteFinance, financeController.updateClient);

// Enterprise workflow and observability
router.get('/transactions', financeController.getTransactions);
router.get('/audit-logs', financeController.getAuditLogs);
router.get('/approvals', financeController.getApprovalWorkflows);
router.post('/approvals', canWriteFinance, financeController.createApprovalWorkflow);
router.patch('/approvals/:id/decision', canControlFinance, financeController.updateApprovalWorkflowDecision);
router.post('/integrations/hr/payroll-sync', canSyncPayroll, financeController.syncPayrollFromHr);
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
