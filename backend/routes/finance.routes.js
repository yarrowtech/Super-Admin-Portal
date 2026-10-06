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
const disputeController = require('../controllers/finance/financeDispute.controller');
const towerController = require('../controllers/finance/financeControlTower.controller');

// All routes require authentication and finance/admin role
router.use(authenticate);
router.use(authorize(ROLES.FINANCE_MANAGER, ROLES.FINANCE_EMPLOYEE, ROLES.ADMIN, ROLES.SUPER_ADMIN, ROLES.CEO, ROLES.HR));
router.use(authorizePortalAccess('finance'));
router.use(cacheGetResponses('finance', { tags: ['finance', 'dashboard', 'analytics'], // Disputes, refunds and the control tower are never cached: a freeze state served stale
// could show money as payable after it has been frozen.
skip: (req) => /financial-summary|invoices|payments|bank-transactions|expenses|budgets|reports|receivables|tax|audit-logs|disputes|refunds|non-compliance|justifications|control-tower/.test(req.path) }));
router.use(invalidateCacheAfterMutation('finance'));
router.use('/module', modularFinanceRoutes);

// CEO and HR can view finance but never change it.
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

// Maker-checker: finance employees prepare and submit; the finance head approves or returns.
const headOnlyStatus = financeController.guardHeadOnlyStatus;
const notUnderReview = financeController.guardNotUnderReview;
router.get('/review/queue', financeController.getReviewQueue);
router.post('/review/:module/:id/submit', canWriteFinance, financeController.submitForReview);
router.post('/review/:module/:id/decision', canControlFinance, financeController.decideReview);

router.get('/bank-transactions', financeController.bankList);
router.post('/bank-transactions/import', canWriteFinance, financeController.bankImport);

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
router.get('/budgets/variance', financeController.getBudgetVariance);
router.get('/projects/catalog', financeController.getProjectOptions);
router.post('/budgets', canControlFinance, financeController.createBudget);
router.put('/budgets/:id', canControlFinance, financeController.updateBudget);
router.post('/budgets/:id/adjust', canControlFinance, financeController.adjustBudget);
router.post('/budgets/:id/baseline', canControlFinance, financeController.approveBudgetBaseline);
router.put('/budgets/:id/phasing', canControlFinance, financeController.setBudgetPhasing);
router.get('/cost-centers', financeController.getCostCenters);
router.post('/cost-centers', canControlFinance, financeController.createCostCenter);
router.put('/cost-centers/:id', canControlFinance, financeController.updateCostCenter);

// Financial Reports
router.get('/reports', financeController.getReports);
router.post('/reports', canWriteFinance, financeController.createReport);
router.get('/reports/trial-balance', financeController.getTrialBalance);
router.get('/reports/balance-sheet', financeController.getBalanceSheet);
router.get('/reports/profit-loss', financeController.getProfitLoss);
router.get('/reports/period-summary', financeController.getPeriodSummary);
router.get('/reports/period-summary/export', financeController.periodCsv);
router.get('/reports/revenue', financeController.getRevenueReport);
router.get('/reports/departmental-pnl', financeController.getDepartmentalPnl);
router.get('/receivables/customers', financeController.getCustomerBalances);
router.get('/receivables/aging', financeController.getAgingSummary);
router.get('/reports/project-pnl', towerController.getProjectPnl);
router.get('/reports/cash-flow', towerController.getCashFlow);
router.get('/search', financeController.search);
router.get('/settings', financeController.getSettings);
router.put('/settings', canControlFinance, financeController.updateSettings);

// Tax rules and statutory filing preparation (external filing integrations are not connected)
router.get('/tax-rules', financeController.listTaxRules);
router.post('/tax-rules', canControlFinance, financeController.createTaxRule);
router.patch('/tax-rules/:id', canControlFinance, financeController.updateTaxRule);
router.get('/audit-logs/export', financeController.auditCsv);

// Compliance, Audit, and Taxation
router.get('/compliance', attachOptionalProjectContext, financeController.getCompliance);
router.post('/compliance', attachOptionalProjectContext, canWriteFinance, financeController.createCompliance);
router.put('/compliance/:id', attachOptionalProjectContext, canWriteFinance, financeController.updateCompliance);

// ── Finance Control Tower ───────────────────────────────────────────────────
// Reads only; each card's drill-down re-runs the card's own filter so the number shown
// and the list it opens cannot disagree.
router.get('/control-tower', towerController.getControlTower);
router.get('/control-tower/summary-pack', towerController.getSummaryPack);
router.get('/control-tower/:card', towerController.getControlTowerCard);

// ── Disputes ────────────────────────────────────────────────────────────────
// Raising a dispute freezes money movement on its subject; only the head resolves it.
router.get('/disputes', disputeController.getDisputes);
router.get('/disputes/:id', disputeController.getDispute);
router.post('/disputes', canWriteFinance, disputeController.createDispute);
router.patch('/disputes/:id/review', canControlFinance, disputeController.reviewDispute);
router.post('/disputes/:id/resolve', canControlFinance, disputeController.resolveDispute);
router.post('/disputes/:id/cancel', canControlFinance, disputeController.cancelDispute);

// ── Refunds ─────────────────────────────────────────────────────────────────
// Maker-checker: anyone who can write may draft and submit; only the head approves and
// processes, and never a refund they submitted themselves.
router.get('/refunds', disputeController.getRefunds);
router.get('/refunds/:id', disputeController.getRefund);
router.post('/refunds', canWriteFinance, disputeController.createRefund);
router.post('/refunds/:id/submit', canWriteFinance, disputeController.submitRefund);
router.post('/refunds/:id/decision', canControlFinance, disputeController.decideRefund);
router.post('/refunds/:id/process', canControlFinance, disputeController.processRefund);

// ── Non-compliance ──────────────────────────────────────────────────────────
router.get('/non-compliance', disputeController.getNonCompliances);
router.get('/non-compliance/:id', disputeController.getNonCompliance);
router.post('/non-compliance', canWriteFinance, disputeController.createNonCompliance);
router.patch('/non-compliance/:id/acknowledge', canWriteFinance, disputeController.acknowledgeNonCompliance);
router.post('/non-compliance/:id/close', canControlFinance, disputeController.closeNonCompliance);
router.post('/non-compliance/:id/escalate', canControlFinance, disputeController.escalateNonCompliance);

// ── Justifications ──────────────────────────────────────────────────────────
// `respond` is the one finance route open to a non-finance stakeholder (a project manager
// or department head answering for their own department); the controller scopes it.
router.get('/justifications', disputeController.getJustifications);
router.post('/justifications', canWriteFinance, disputeController.askJustification);
router.post('/justifications/:id/respond', disputeController.respondJustification);
router.post('/justifications/:id/decide', canControlFinance, disputeController.decideJustification);

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
