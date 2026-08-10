const { ROLES } = require('../config/roles');

const roleWorkflows = {
  [ROLES.ADMIN]: {
    role: ROLES.ADMIN,
    dashboardEndpoint: '/api/dept/admin/dashboard',
    modules: [
      { key: 'user_management', endpoint: '/api/dept/admin/users' },
      { key: 'role_management', endpoint: '/api/dept/admin/roles' },
      { key: 'audit_logs', endpoint: '/api/dept/admin/audit-logs' },
      { key: 'settings', endpoint: '/api/dept/admin/settings' },
    ],
  },
  [ROLES.CEO]: {
    role: ROLES.CEO,
    dashboardEndpoint: '/api/dept/ceo/dashboard',
    modules: [
      { key: 'reports', endpoint: '/api/dept/ceo/reports' },
      { key: 'employees', endpoint: '/api/dept/ceo/employees' },
      { key: 'department_stats', endpoint: '/api/dept/ceo/departments' },
      { key: 'notifications', endpoint: '/api/dept/ceo/notifications' },
    ],
  },
  [ROLES.HR]: {
    role: ROLES.HR,
    dashboardEndpoint: '/api/dept/hr/dashboard',
    modules: [
      { key: 'employees', endpoint: '/api/dept/hr/employees' },
      { key: 'attendance', endpoint: '/api/dept/hr/attendance' },
      { key: 'leave', endpoint: '/api/dept/hr/leave' },
      { key: 'work_reports', endpoint: '/api/dept/hr/work-reports' },
    ],
  },
  [ROLES.IT_MANAGER]: {
    role: ROLES.IT_MANAGER,
    dashboardEndpoint: '/api/dept/it/dashboard',
    modules: [
      { key: 'admin', endpoint: '/api/dept/admin/dashboard' },
      { key: 'hr', endpoint: '/api/dept/hr/dashboard' },
      { key: 'law', endpoint: '/api/dept/law/dashboard' },
      { key: 'overview', endpoint: '/api/dept/it/overview' },
      { key: 'assets', endpoint: '/api/dept/it/module/assets' },
      { key: 'tickets', endpoint: '/api/dept/it/module/tickets' },
    ],
  },
  [ROLES.IT_ADMIN]: {
    role: ROLES.IT_ADMIN,
    dashboardEndpoint: '/api/dept/it/dashboard',
    modules: [
      { key: 'assets', endpoint: '/api/dept/it/module/assets' },
      { key: 'tickets', endpoint: '/api/dept/it/module/tickets' },
    ],
  },
  [ROLES.IT_EMPLOYEE]: {
    role: ROLES.IT_EMPLOYEE,
    dashboardEndpoint: '/api/dept/it/dashboard',
    modules: [
      { key: 'tickets', endpoint: '/api/dept/it/module/tickets' },
    ],
  },
  [ROLES.IT_HR]: {
    role: ROLES.IT_HR,
    dashboardEndpoint: '/api/dept/it/dashboard',
    modules: [
      { key: 'hr', endpoint: '/api/dept/hr/dashboard' },
    ],
  },
  [ROLES.FINANCE_MANAGER]: {
    role: ROLES.FINANCE_MANAGER,
    dashboardEndpoint: '/api/dept/finance/dashboard',
    modules: [
      { key: 'invoices', endpoint: '/api/dept/finance/invoices' },
      { key: 'expenses', endpoint: '/api/dept/finance/expenses' },
      { key: 'budgets', endpoint: '/api/dept/finance/budgets' },
      { key: 'payrolls', endpoint: '/api/dept/finance/payrolls' },
      { key: 'vendors', endpoint: '/api/dept/finance/vendors' },
      { key: 'compliance', endpoint: '/api/dept/finance/compliance' },
    ],
  },
  [ROLES.FINANCE_EMPLOYEE]: {
    role: ROLES.FINANCE_EMPLOYEE,
    dashboardEndpoint: '/api/dept/finance/dashboard',
    modules: [
      { key: 'invoices', endpoint: '/api/dept/finance/invoices' },
      { key: 'expenses', endpoint: '/api/dept/finance/expenses' },
    ],
  },
  [ROLES.LAW_HEAD]: {
    role: ROLES.LAW_HEAD,
    dashboardEndpoint: '/api/dept/law/dashboard',
    modules: [
      { key: 'contracts', endpoint: '/api/dept/law/module/contracts' },
    ],
  },
  [ROLES.LAW_EMPLOYEE]: {
    role: ROLES.LAW_EMPLOYEE,
    dashboardEndpoint: '/api/dept/law/dashboard',
    modules: [
      { key: 'contracts', endpoint: '/api/dept/law/module/contracts' },
    ],
  },
  [ROLES.MEDIA_HEAD]: {
    role: ROLES.MEDIA_HEAD,
    dashboardEndpoint: '/api/dept/media/dashboard',
    modules: [],
  },
  [ROLES.MEDIA_SALES]: {
    role: ROLES.MEDIA_SALES,
    dashboardEndpoint: '/api/dept/sales/dashboard',
    modules: [],
  },
  [ROLES.MEDIA_MARKETING]: {
    role: ROLES.MEDIA_MARKETING,
    dashboardEndpoint: '/api/dept/media/dashboard',
    modules: [],
  },
};

const defaultWorkflow = (role) => ({
  role,
  dashboardEndpoint: '/health',
  modules: [],
});

const getWorkflowByRole = (role) => roleWorkflows[role] || defaultWorkflow(role);

const getWorkflowStages = (role) => {
  const wf = getWorkflowByRole(role);
  return [
    { key: 'authenticate', label: 'Authenticate User', status: 'required' },
    { key: 'load_dashboard', label: 'Load Dashboard', endpoint: wf.dashboardEndpoint, status: 'required' },
    ...wf.modules.map((m) => ({
      key: `module_${m.key}`,
      label: `Load ${m.key.replace('_', ' ')}`,
      endpoint: m.endpoint,
      status: 'required',
    })),
    { key: 'subscribe_realtime', label: 'Subscribe Realtime Channels', status: 'optional' },
  ];
};

module.exports = {
  getWorkflowByRole,
  getWorkflowStages,
  roleWorkflows,
};

