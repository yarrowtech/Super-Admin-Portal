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
  [ROLES.MANAGER]: {
    role: ROLES.MANAGER,
    dashboardEndpoint: '/api/dept/manager/dashboard',
    modules: [
      { key: 'admin', endpoint: '/api/dept/admin/dashboard' },
      { key: 'hr', endpoint: '/api/dept/hr/dashboard' },
      { key: 'it', endpoint: '/api/dept/it/dashboard' },
      { key: 'law', endpoint: '/api/dept/law/dashboard' },
      { key: 'employee', endpoint: '/api/employee/dashboard' },
      { key: 'team', endpoint: '/api/dept/manager/team' },
      { key: 'projects', endpoint: '/api/dept/manager/projects' },
      { key: 'tasks', endpoint: '/api/dept/manager/tasks' },
      { key: 'leave', endpoint: '/api/dept/manager/leave' },
      { key: 'notifications', endpoint: '/api/dept/manager/notifications' },
    ],
  },
  [ROLES.IT]: {
    role: ROLES.IT,
    dashboardEndpoint: '/api/dept/it/dashboard',
    modules: [
      { key: 'admin', endpoint: '/api/dept/admin/dashboard' },
      { key: 'hr', endpoint: '/api/dept/hr/dashboard' },
      { key: 'law', endpoint: '/api/dept/law/dashboard' },
      { key: 'manager', endpoint: '/api/dept/manager/dashboard' },
      { key: 'employee', endpoint: '/api/employee/dashboard' },
      { key: 'overview', endpoint: '/api/dept/it/overview' },
      { key: 'assets', endpoint: '/api/dept/it/module/assets' },
      { key: 'tickets', endpoint: '/api/dept/it/module/tickets' },
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
  [ROLES.EMPLOYEE]: {
    role: ROLES.EMPLOYEE,
    dashboardEndpoint: '/api/employee/dashboard',
    modules: [
      { key: 'projects', endpoint: '/api/employee/projects' },
      { key: 'tasks', endpoint: '/api/employee/tasks' },
      { key: 'attendance', endpoint: '/api/dept/employee/attendance' },
      { key: 'leave', endpoint: '/api/dept/employee/leave' },
      { key: 'documents', endpoint: '/api/employee/documents' },
    ],
  },
  [ROLES.FINANCE]: {
    role: ROLES.FINANCE,
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

