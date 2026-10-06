import { apiClient } from './client';
import { createDepartmentModulesApi, createDepartmentCollabApi } from './departmentModules';

export const financeApi = {
  getDashboard: (token) => apiClient.get('/api/dept/finance/dashboard', token),
  getDepartmentFinancials: (token) => apiClient.get('/api/dept/finance/departments', token, { cache: false }),
  getDepartmentCatalog: (token) => apiClient.get('/api/dept/finance/departments/catalog', token, { cache: false }),
  // Projects a cost can be booked to. Used by the expense and budget pages to offer a
  // project dimension alongside the department one.
  getProjectCatalog: (token) => apiClient.get('/api/dept/finance/projects/catalog', token, { cache: false }),
  getDepartmentFinancialProfile: (token, departmentId) => apiClient.get(`/api/dept/finance/departments/${encodeURIComponent(departmentId)}`, token, { cache: false }),
  getRequests: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/requests${query ? `?${query}` : ''}`, token, { cache: false });
  },
  getRequestDetail: (id, token) => apiClient.get(`/api/dept/finance/requests/${id}`, token, { cache: false }),
  updateRequestAction: (id, action, data, token) => apiClient.patch(`/api/dept/finance/requests/${id}/${action}`, data, token),

  getAccounts: (token) => apiClient.get('/api/dept/finance/accounts', token),
  createAccount: (data, token) => apiClient.post('/api/dept/finance/accounts', data, token),
  updateAccount: (id, data, token) => apiClient.put(`/api/dept/finance/accounts/${id}`, data, token),

  getJournalEntries: (token) => apiClient.get('/api/dept/finance/journals', token),
  createJournalEntry: (data, token) => apiClient.post('/api/dept/finance/journals', data, token),
  updateJournalEntry: (id, data, token) => apiClient.put(`/api/dept/finance/journals/${id}`, data, token),
  postJournalEntry: (id, token) => apiClient.post(`/api/dept/finance/journals/${id}/post`, {}, token),

  getInvoices: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/invoices${query ? `?${query}` : ''}`, token);
  },
  createInvoice: (data, token) => apiClient.post('/api/dept/finance/invoices', data, token),
  updateInvoice: (id, data, token) => apiClient.put(`/api/dept/finance/invoices/${id}`, data, token),
  createInvoiceNote: (id, data, token) => apiClient.post(`/api/dept/finance/invoices/${id}/notes`, data, token),
  getInvoiceNotes: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/invoice-notes${query ? `?${query}` : ''}`, token);
  },

  getPayments: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/payments${query ? `?${query}` : ''}`, token);
  },
  createPayment: (data, token) => apiClient.post('/api/dept/finance/payments', data, token),
  updatePayment: (id, data, token) => apiClient.put(`/api/dept/finance/payments/${id}`, data, token),

  getExpenses: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/expenses${query ? `?${query}` : ''}`, token);
  },
  createExpense: (data, token) => apiClient.post('/api/dept/finance/expenses', data, token),
  updateExpense: (id, data, token) => apiClient.put(`/api/dept/finance/expenses/${id}`, data, token),

  getBudgets: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/budgets${query ? `?${query}` : ''}`, token);
  },
  createBudget: (data, token) => apiClient.post('/api/dept/finance/budgets', data, token),
  updateBudget: (id, data, token) => apiClient.put(`/api/dept/finance/budgets/${id}`, data, token),
  // Adds to or removes from an allocation; each change is recorded with its reason.
  adjustBudget: (id, data, token) => apiClient.post(`/api/dept/finance/budgets/${id}/adjust`, data, token),
  // Planned vs committed, split fixed/variable. `groupBy` is 'department' or 'project'.
  getBudgetVariance: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/budgets/variance${query ? `?${query}` : ''}`, token);
  },
  // Freezes the plan as approved, so later changes report as drift against it rather than
  // quietly re-planning to match the spend. Head-only.
  approveBudgetBaseline: (id, data, token) => apiClient.post(`/api/dept/finance/budgets/${id}/baseline`, data, token),
  // Spreads an annual allocation across 12 periods so variance is measured against the
  // plan to date. Head-only.
  setBudgetPhasing: (id, data, token) => apiClient.put(`/api/dept/finance/budgets/${id}/phasing`, data, token),

  getCostCenters: (token) => apiClient.get('/api/dept/finance/cost-centers', token),
  createCostCenter: (data, token) => apiClient.post('/api/dept/finance/cost-centers', data, token),
  updateCostCenter: (id, data, token) => apiClient.put(`/api/dept/finance/cost-centers/${id}`, data, token),


  getReports: (token) => apiClient.get('/api/dept/finance/reports', token),
  createReport: (data, token) => apiClient.post('/api/dept/finance/reports', data, token),
  getTrialBalance: (token) => apiClient.get('/api/dept/finance/reports/trial-balance', token),
  getBalanceSheet: (token) => apiClient.get('/api/dept/finance/reports/balance-sheet', token),
  getProfitLoss: (token) => apiClient.get('/api/dept/finance/reports/profit-loss', token),

  getPeriodSummary: (token, year) => apiClient.get(`/api/dept/finance/reports/period-summary?year=${encodeURIComponent(year)}`, token),
  // Revenue and direct costs per department, from posted journal lines.
  getDepartmentalPnl: (token, params = {}) => apiClient.get(`/api/dept/finance/reports/departmental-pnl?${new URLSearchParams(params)}`, token),
  // Contribution margin per project, and cash in/out by activity — both read posted
  // journal lines, so they agree with the trial balance by construction.
  getProjectPnl: (token, params = {}) => apiClient.get(`/api/dept/finance/reports/project-pnl?${new URLSearchParams(params)}`, token),
  getCashFlow: (token, params = {}) => apiClient.get(`/api/dept/finance/reports/cash-flow?${new URLSearchParams(params)}`, token),
  getRevenueReport: (token, params) => apiClient.get(`/api/dept/finance/reports/revenue?${new URLSearchParams(params)}`, token),
  getCustomerBalances: (token) => apiClient.get('/api/dept/finance/receivables/customers', token),
  // Server-owned finance rules (receipt threshold, budget alert levels) the UI mirrors.
  getSettings: (token) => apiClient.get('/api/dept/finance/settings', token),
  // One query across invoices, clients and vendors.
  search: (token, q) => apiClient.get(`/api/dept/finance/search?q=${encodeURIComponent(q)}`, token, { cache: false }),
  getAgingSummary: (token, params = {}) => apiClient.get(`/api/dept/finance/receivables/aging?${new URLSearchParams(params)}`, token),
  getFinancialSummary: (token, params = {}) => apiClient.get(`/api/dept/finance/financial-summary?${new URLSearchParams(params)}`, token),

  // Tax rules (GST/TDS, effective-dated) and statutory filing worksheets.
  getTaxRules: (token, params = {}) => apiClient.get(`/api/dept/finance/tax-rules?${new URLSearchParams(params)}`, token, { cache: false }),
  createTaxRule: (data, token) => apiClient.post('/api/dept/finance/tax-rules', data, token),
  updateTaxRule: (id, data, token) => apiClient.patch(`/api/dept/finance/tax-rules/${id}`, data, token),

  // Authenticated file downloads. kind: 'audit' | 'period' | 'report'.
  // The 'gst' and 'tds' worksheets went with the tax reports on 6 October 2026.
  download: (kind, params, token) => {
    const q = new URLSearchParams(params);
    const paths = {
      audit: ['/api/dept/finance/audit-logs/export', 'finance-audit-trail.csv'],
      period: ['/api/dept/finance/reports/period-summary/export', `finance-summary-${params.year}.csv`],
      report: ['/api/dept/finance/reports/export', `finance-report.${params.format === 'pdf' ? 'pdf' : 'csv'}`],
    };
    if (!paths[kind]) throw new Error(`Unknown download kind "${kind}"`);
    const [path, name] = paths[kind];
    return apiClient.download(`${path}?${q}`, token, name);
  },
  downloadDocument: (kind, id, token) => apiClient.download(`/api/dept/finance/documents/${kind}/${id}/download`, token, `${kind}-${id}.pdf`),

  // ── Finance Control Tower ─────────────────────────────────────────────────
  // Never cached: a traffic light served stale could show money as payable after a
  // dispute has frozen it.
  getControlTower: (token) => apiClient.get('/api/dept/finance/control-tower', token, { cache: false }),
  getControlTowerCard: (token, card, params = {}) =>
    apiClient.get(`/api/dept/finance/control-tower/${encodeURIComponent(card)}?${new URLSearchParams(params)}`, token, { cache: false }),
  getSummaryPack: (token) => apiClient.get('/api/dept/finance/control-tower/summary-pack', token, { cache: false }),

  // ── Disputes ──────────────────────────────────────────────────────────────
  getDisputes: (token, params = {}) => apiClient.get(`/api/dept/finance/disputes?${new URLSearchParams(params)}`, token, { cache: false }),
  getDispute: (token, id) => apiClient.get(`/api/dept/finance/disputes/${id}`, token, { cache: false }),
  createDispute: (data, token) => apiClient.post('/api/dept/finance/disputes', data, token),
  reviewDispute: (id, data, token) => apiClient.patch(`/api/dept/finance/disputes/${id}/review`, data, token),
  resolveDispute: (id, data, token) => apiClient.post(`/api/dept/finance/disputes/${id}/resolve`, data, token),
  cancelDispute: (id, data, token) => apiClient.post(`/api/dept/finance/disputes/${id}/cancel`, data, token),

  // ── Refunds ───────────────────────────────────────────────────────────────
  getRefunds: (token, params = {}) => apiClient.get(`/api/dept/finance/refunds?${new URLSearchParams(params)}`, token, { cache: false }),
  getRefund: (token, id) => apiClient.get(`/api/dept/finance/refunds/${id}`, token, { cache: false }),
  createRefund: (data, token) => apiClient.post('/api/dept/finance/refunds', data, token),
  submitRefund: (id, token) => apiClient.post(`/api/dept/finance/refunds/${id}/submit`, {}, token),
  decideRefund: (id, data, token) => apiClient.post(`/api/dept/finance/refunds/${id}/decision`, data, token),
  processRefund: (id, token) => apiClient.post(`/api/dept/finance/refunds/${id}/process`, {}, token),

  // ── Non-compliance ────────────────────────────────────────────────────────
  getNonCompliances: (token, params = {}) => apiClient.get(`/api/dept/finance/non-compliance?${new URLSearchParams(params)}`, token, { cache: false }),
  getNonComplianceRecord: (token, id) => apiClient.get(`/api/dept/finance/non-compliance/${id}`, token, { cache: false }),
  createNonCompliance: (data, token) => apiClient.post('/api/dept/finance/non-compliance', data, token),
  acknowledgeNonCompliance: (id, data, token) => apiClient.patch(`/api/dept/finance/non-compliance/${id}/acknowledge`, data, token),
  closeNonCompliance: (id, data, token) => apiClient.post(`/api/dept/finance/non-compliance/${id}/close`, data, token),
  escalateNonCompliance: (id, data, token) => apiClient.post(`/api/dept/finance/non-compliance/${id}/escalate`, data, token),

  // ── Justifications ("why was this cost incurred?") ────────────────────────
  getJustifications: (token, params = {}) => apiClient.get(`/api/dept/finance/justifications?${new URLSearchParams(params)}`, token, { cache: false }),
  askJustification: (data, token) => apiClient.post('/api/dept/finance/justifications', data, token),
  respondJustification: (id, data, token) => apiClient.post(`/api/dept/finance/justifications/${id}/respond`, data, token),
  decideJustification: (id, data, token) => apiClient.post(`/api/dept/finance/justifications/${id}/decide`, data, token),

  // Head-configurable settings (document prefixes, traffic-light thresholds).
  updateSettings: (data, token) => apiClient.put('/api/dept/finance/settings', data, token),

  getCompliance: (token) => apiClient.get('/api/dept/finance/compliance', token),
  createCompliance: (data, token) => apiClient.post('/api/dept/finance/compliance', data, token),
  updateCompliance: (id, data, token) => apiClient.put(`/api/dept/finance/compliance/${id}`, data, token),

  getVendors: (token) => apiClient.get('/api/dept/finance/vendors', token),
  createVendor: (data, token) => apiClient.post('/api/dept/finance/vendors', data, token),
  updateVendor: (id, data, token) => apiClient.put(`/api/dept/finance/vendors/${id}`, data, token),
  // Vendor account: { type: 'bill' | 'payment', amount, reference, date, dueDate, method, note }.
  addVendorLedgerEntry: (id, data, token) => apiClient.post(`/api/dept/finance/vendors/${id}/ledger`, data, token),

  getClients: (token) => apiClient.get('/api/dept/finance/clients', token),
  createClient: (data, token) => apiClient.post('/api/dept/finance/clients', data, token),
  updateClient: (id, data, token) => apiClient.put(`/api/dept/finance/clients/${id}`, data, token)
  ,

  getTransactions: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/transactions${query ? `?${query}` : ''}`, token, { cache: false });
  },
  getAuditLogs: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/audit-logs${query ? `?${query}` : ''}`, token, { cache: false });
  },
  getApprovals: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/approvals${query ? `?${query}` : ''}`, token, { cache: false });
  },
  createApproval: (data, token) => apiClient.post('/api/dept/finance/approvals', data, token),
  decideApproval: (id, data, token) => apiClient.patch(`/api/dept/finance/approvals/${id}/decision`, data, token),
  // Maker-checker review: module = 'invoice' | 'journal'.
  submitForReview: (module, id, note, token) => apiClient.post(`/api/dept/finance/review/${module}/${id}/submit`, { note }, token),
  decideReview: (module, id, body, token) => apiClient.post(`/api/dept/finance/review/${module}/${id}/decision`, body, token),
  getReviewQueue: (token, params = {}) => {
    const query = new URLSearchParams(params).toString();
    return apiClient.get(`/api/dept/finance/review/queue${query ? `?${query}` : ''}`, token, { cache: false });
  },
  getIntegrationSnapshot: (token) => apiClient.get('/api/dept/finance/integrations/snapshot', token, { cache: false }),
  linkComplianceWithLaw: (data, token) => apiClient.post('/api/dept/finance/integrations/law/compliance-link', data, token),

  ...createDepartmentModulesApi('/api/dept/finance'),
  ...createDepartmentCollabApi('/api/dept/finance'),
};
