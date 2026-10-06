import { apiClient } from './client';
import { createDepartmentModulesApi, createDepartmentCollabApi } from './departmentModules';

export const financeApi = {
  getDashboard: (token) => apiClient.get('/api/dept/finance/dashboard', token),
  getDepartmentFinancials: (token) => apiClient.get('/api/dept/finance/departments', token, { cache: false }),
  getDepartmentCatalog: (token) => apiClient.get('/api/dept/finance/departments/catalog', token, { cache: false }),
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

  getCostCenters: (token) => apiClient.get('/api/dept/finance/cost-centers', token),
  createCostCenter: (data, token) => apiClient.post('/api/dept/finance/cost-centers', data, token),
  updateCostCenter: (id, data, token) => apiClient.put(`/api/dept/finance/cost-centers/${id}`, data, token),


  getReports: (token) => apiClient.get('/api/dept/finance/reports', token),
  createReport: (data, token) => apiClient.post('/api/dept/finance/reports', data, token),
  getTrialBalance: (token) => apiClient.get('/api/dept/finance/reports/trial-balance', token),
  getBalanceSheet: (token) => apiClient.get('/api/dept/finance/reports/balance-sheet', token),
  getProfitLoss: (token) => apiClient.get('/api/dept/finance/reports/profit-loss', token),
  getTaxSummary: (token) => apiClient.get('/api/dept/finance/reports/tax-summary', token),
  getItrSummary: (token) => apiClient.get('/api/dept/finance/reports/itr-summary', token),

  getPeriodSummary: (token, year) => apiClient.get(`/api/dept/finance/reports/period-summary?year=${encodeURIComponent(year)}`, token),
  // Revenue and direct costs per department, from posted journal lines.
  getDepartmentalPnl: (token, params = {}) => apiClient.get(`/api/dept/finance/reports/departmental-pnl?${new URLSearchParams(params)}`, token),
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
  getGstReturn: (token, params) => apiClient.get(`/api/dept/finance/tax/gst-return?${new URLSearchParams(params)}`, token, { cache: false }),
  getTdsReturn: (token, params) => apiClient.get(`/api/dept/finance/tax/tds-return?${new URLSearchParams(params)}`, token, { cache: false }),

  // Authenticated file downloads. kind: 'gst' | 'tds' | 'audit' | 'period' | 'report'.
  download: (kind, params, token) => {
    const q = new URLSearchParams(params);
    const paths = {
      gst: ['/api/dept/finance/tax/gst-return/export', 'gst-worksheet.csv'],
      tds: ['/api/dept/finance/tax/tds-return/export', 'tds-worksheet.csv'],
      audit: ['/api/dept/finance/audit-logs/export', 'finance-audit-trail.csv'],
      period: ['/api/dept/finance/reports/period-summary/export', `finance-summary-${params.year}.csv`],
      report: ['/api/dept/finance/reports/export', `finance-report.${params.format === 'pdf' ? 'pdf' : 'csv'}`],
    };
    const [path, name] = paths[kind];
    return apiClient.download(`${path}?${q}`, token, name);
  },
  downloadDocument: (kind, id, token) => apiClient.download(`/api/dept/finance/documents/${kind}/${id}/download`, token, `${kind}-${id}.pdf`),

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
