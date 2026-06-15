import { apiClient } from './client';

export const financeApi = {
  getDashboard: (token) => apiClient.get('/api/dept/finance/dashboard', token),

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

  getCostCenters: (token) => apiClient.get('/api/dept/finance/cost-centers', token),
  createCostCenter: (data, token) => apiClient.post('/api/dept/finance/cost-centers', data, token),
  updateCostCenter: (id, data, token) => apiClient.put(`/api/dept/finance/cost-centers/${id}`, data, token),

  getPayrolls: (token) => apiClient.get('/api/dept/finance/payrolls', token),
  createPayroll: (data, token) => apiClient.post('/api/dept/finance/payrolls', data, token),
  updatePayroll: (id, data, token) => apiClient.put(`/api/dept/finance/payrolls/${id}`, data, token),

  getReports: (token) => apiClient.get('/api/dept/finance/reports', token),
  createReport: (data, token) => apiClient.post('/api/dept/finance/reports', data, token),
  getTrialBalance: (token) => apiClient.get('/api/dept/finance/reports/trial-balance', token),
  getBalanceSheet: (token) => apiClient.get('/api/dept/finance/reports/balance-sheet', token),
  getProfitLoss: (token) => apiClient.get('/api/dept/finance/reports/profit-loss', token),
  getTaxSummary: (token) => apiClient.get('/api/dept/finance/reports/tax-summary', token),
  getItrSummary: (token) => apiClient.get('/api/dept/finance/reports/itr-summary', token),

  getCompliance: (token) => apiClient.get('/api/dept/finance/compliance', token),
  createCompliance: (data, token) => apiClient.post('/api/dept/finance/compliance', data, token),
  updateCompliance: (id, data, token) => apiClient.put(`/api/dept/finance/compliance/${id}`, data, token),

  getVendors: (token) => apiClient.get('/api/dept/finance/vendors', token),
  createVendor: (data, token) => apiClient.post('/api/dept/finance/vendors', data, token),
  updateVendor: (id, data, token) => apiClient.put(`/api/dept/finance/vendors/${id}`, data, token),

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
  getIntegrationSnapshot: (token) => apiClient.get('/api/dept/finance/integrations/snapshot', token, { cache: false }),
  syncPayrollFromHr: (data, token) => apiClient.post('/api/dept/finance/integrations/hr/payroll-sync', data, token),
  linkComplianceWithLaw: (data, token) => apiClient.post('/api/dept/finance/integrations/law/compliance-link', data, token)
};
