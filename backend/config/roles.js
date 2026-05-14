const ROLES = {
  ADMIN: "admin",
  CEO: "ceo",
  IT: "it",
  LAW: "law",
  HR: "hr",
  MEDIA: "media",
  FINANCE: "finance",
  MANAGER: "manager",
  SALES: "sales",
  RESEARCH_OPERATOR: "research_operator",
  EMPLOYEE: "employee",
  FREELANCER: "freelancer",
};

const ROLE_HIERARCHY = {
  [ROLES.ADMIN]: 100,
  [ROLES.CEO]: 90,
  [ROLES.IT]: 50,
  [ROLES.LAW]: 50,
  [ROLES.HR]: 50,
  [ROLES.MEDIA]: 50,
  [ROLES.FINANCE]: 50,
  [ROLES.SALES]: 50,
  [ROLES.RESEARCH_OPERATOR]: 50,
  [ROLES.MANAGER]: 40,
  [ROLES.EMPLOYEE]: 10,
  [ROLES.FREELANCER]: 5,
};

const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    "manage_all_users",
    "users:read",
    "users:create",
    "users:update",
    "users:delete",
    "users:export",
    "roles:manage",
    "permissions:manage",
    "manage_all_departments",
    "view_all_data",
    "system_settings",
    "audit_logs",
  ],
  [ROLES.CEO]: [
    "view_all_departments",
    "approve_budgets",
    "strategic_decisions",
    "company_reports",
  ],
  [ROLES.IT]: [
    "manage_tech_infrastructure",
    "system_access",
    "technical_support",
    "security_management",
  ],
  [ROLES.LAW]: [
    "legal_documents",
    "compliance_management",
    "contract_review",
    "legal_advice",
  ],
  [ROLES.HR]: [
    "manage_employees",
    "recruitment",
    "payroll_access",
    "performance_reviews",
    "leave_management",
  ],
  [ROLES.MEDIA]: [
    "content_management",
    "social_media",
    "public_relations",
    "marketing_campaigns",
  ],
  [ROLES.FINANCE]: [
    "financial_records",
    "budget_management",
    "expense_approval",
    "financial_reports",
    "invoice_management",
  ],
  [ROLES.MANAGER]: [
    "team_management",
    "project_oversight",
    "task_assignment",
    "team_reports",
  ],
  [ROLES.SALES]: [
    "manage_leads",
    "view_sales_reports",
    "customer_management",
    "sales_pipeline",
    "quotation_management",
  ],
  [ROLES.RESEARCH_OPERATOR]: [
    "research_data_access",
    "research_reports",
    "data_analysis",
    "research_projects",
  ],
  [ROLES.EMPLOYEE]: [
    "view_own_profile",
    "view_tasks",
    "submit_work_reports",
    "view_attendance",
    "request_leave",
  ],
  [ROLES.FREELANCER]: [
    "view_own_profile",
    "view_tasks",
    "submit_work_reports",
  ],
};

const isValidRole = (role) => Object.values(ROLES).includes(role);

const hasHigherOrEqualHierarchy = (userRole, targetRole) =>
  ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[targetRole];

const hasPermission = (userRole, permission) =>
  ROLE_PERMISSIONS[userRole]?.includes(permission) || false;

const getRolePermissions = (role) => ROLE_PERMISSIONS[role] || [];

module.exports = {
  ROLES,
  ROLE_HIERARCHY,
  ROLE_PERMISSIONS,
  isValidRole,
  hasHigherOrEqualHierarchy,
  hasPermission,
  getRolePermissions,
};
