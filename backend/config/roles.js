// backend/config/roles.js
const ROLES = {
  ADMIN: 'admin',
  CEO: 'ceo',
  IT: 'it',
  LAW: 'law',
  HR: 'hr',
  MEDIA: 'media',
  FINANCE: 'finance',
  MANAGER: 'manager'
};

// Role hierarchy - higher number = more permissions
const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 100,
  [ROLES.CEO]: 90,
  [ROLES.IT]: 50,
  [ROLES.LAW]: 50,
  [ROLES.HR]: 50,
  [ROLES.MEDIA]: 50,
  [ROLES.FINANCE]: 50,
  [ROLES.MANAGER]: 40
};

// Role permissions mapping
const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    'manage_all_users',
    'manage_all_departments',
    'view_all_data',
    'system_settings',
    'audit_logs'
  ],
  [ROLES.CEO]: [
    'view_all_departments',
    'approve_budgets',
    'strategic_decisions',
    'company_reports'
  ],
  [ROLES.IT]: [
    'manage_tech_infrastructure',
    'system_access',
    'technical_support',
    'security_management'
  ],
  [ROLES.LAW]: [
    'legal_documents',
    'compliance_management',
    'contract_review',
    'legal_advice'
  ],
  [ROLES.HR]: [
    'manage_employees',
    'recruitment',
    'payroll_access',
    'performance_reviews',
    'leave_management'
  ],
  [ROLES.MEDIA]: [
    'content_management',
    'social_media',
    'public_relations',
    'marketing_campaigns'
  ],
  [ROLES.FINANCE]: [
    'financial_records',
    'budget_management',
    'expense_approval',
    'financial_reports',
    'invoice_management'
  ],
  [ROLES.MANAGER]: [
    'team_management',
    'project_oversight',
    'task_assignment',
    'team_reports'
  ]
};

// Helper functions
const isValidRole = (role) => {
  return Object.values(ROLES).includes(role);
};

const hasHigherOrEqualHierarchy = (userRole, targetRole) => {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];
};

const hasPermission = (userRole, permission) => {
  return ROLE_PERMISSIONS[userRole]?.includes(permission) || false;
};

const getRolePermissions = (role) => {
  return ROLE_PERMISSIONS[role] || [];
};

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  isValidRole,
  hasHigherOrEqualHierarchy,
  hasPermission,
  getRolePermissions
};
