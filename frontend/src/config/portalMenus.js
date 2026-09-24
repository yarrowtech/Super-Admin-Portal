// Roles that may see head-only menu entries (an item's roles array gates it).
// Department members who get Team + Messages (department-only; backend gates the same roles).
export const IT_DEPT_ROLES = ['it_manager', 'it_admin', 'it_employee', 'it_hr'];
export const FINANCE_DEPT_ROLES = ['finance_manager', 'finance_employee'];
export const FINANCE_HEAD_ROLES = ['finance_manager', 'admin', 'super_admin'];

export const portalMenuConfig = {
  admin: [
    { label: 'Dashboard',      icon: 'dashboard',    path: '/admin/dashboard',         description: 'Overview and analytics' },
    { label: 'HR Management',  icon: 'badge',        path: '/hr/dashboard',            description: 'People operations workspace' },
    { label: 'Employees',      icon: 'group',        path: '/admin/users',             description: 'Users and role management' },
    { label: 'Reports',        icon: 'bar_chart',    path: '/admin/reports',           description: 'Company performance reports' },
    { label: 'Support Center', icon: 'support_agent', path: '/admin/support-center',  description: 'Manage all portal support tickets' },
  ],
  hr: [
    { label: 'Dashboard',   icon: 'dashboard',       path: '/hr/dashboard',    description: 'HR command center' },
    { label: 'Project Overview', icon: 'folder_copy', path: '/hr/project-overview', description: 'Read-only project plan visibility' },
    { label: 'Recruitment', icon: 'person_search',   path: '/hr/recruitment',  description: 'Hiring pipeline' },
    { label: 'Attendance',  icon: 'calendar_month',  path: '/hr/attendance',   description: 'Attendance operations' },
    { label: 'Jobs',        icon: 'work_outline',    path: '/hr/jobs',         description: 'Recruitment postings' },
    { label: 'Leave',       icon: 'event_note',      path: '/hr/leave',        description: 'Leave approvals and policy' },
    { label: 'Performance', icon: 'trending_up',     path: '/hr/performance',  description: 'KPI and appraisal' },
    { label: 'Outsourcing', icon: 'handshake',       path: '/hr/outsourcing',  description: 'Freelancer task tracking' },
    { label: 'Tasks',       icon: 'smart_toy',       path: '/hr/tasks',        description: 'Workflow tasks and reminders' },
    { label: 'Communication', icon: 'forum',          path: '/hr/communication', description: 'Broadcast and communication' },
  ],
  user: [
    { label: 'Dashboard', icon: 'dashboard',     path: '/employee/dashboard', description: 'Personal workspace' },
    { label: 'Project Overview', icon: 'folder_copy', path: '/employee/project-overview', description: 'Read-only project plan visibility' },
    { label: 'Projects',   icon: 'folder_open',  path: '/employee/projects',  description: 'My projects and work logs' },
    { label: 'Tasks',      icon: 'task',          path: '/employee/tasks',     description: 'Assigned tasks' },
    { label: 'Attendance', icon: 'schedule',      path: '/employee/attendance', description: 'Daily check-in and work hours' },
    { label: 'Jobs',       icon: 'work_outline',  path: '/employee/jobs',      description: 'Browse open positions and apply' },
    { label: 'Leave',      icon: 'event_note',    path: '/employee/leave',     description: 'Leave requests and status' },
    { label: 'Documents',  icon: 'receipt_long',  path: '/employee/documents', description: 'Payslips and documents' },
    { label: 'Team',       icon: 'group',         path: '/employee/team',      description: 'Team directory' },
    { label: 'Messages',   icon: 'forum',         path: '/employee/chat',      description: 'Chat with HR and teams' },
  ],
  manager: [
    { label: 'Dashboard',    icon: 'dashboard',    path: '/manager/dashboard',    description: 'Operations overview' },
    { label: 'Project Overview', icon: 'folder_copy', path: '/manager/project-overview', description: 'Read-only project plan visibility' },
    { label: 'Work Board',   icon: 'work_history', path: '/manager/work-board',   description: 'Execution board' },
    { label: 'Tasks',        icon: 'task_alt',     path: '/manager/tasks',        description: 'Task operations' },
    { label: 'Outsourcing',  icon: 'handshake',    path: '/manager/outsourcing',  description: 'Freelancer work tracking' },
    { label: 'Products',     icon: 'inventory_2',  path: '/manager/products',     description: 'Product operations' },
    { label: 'Team',         icon: 'group',        path: '/manager/team',         description: 'Team management' },
    { label: 'Leave',        icon: 'event_note',   path: '/manager/leave',        description: 'Leave approvals' },
    { label: 'Reports',      icon: 'assessment',   path: '/manager/reports',      description: 'Operational reports' },
    { label: 'Chat',         icon: 'forum',        path: '/manager/chat',         description: 'Team chat' },
  ],
  ceo: [
    { label: 'Dashboard', icon: 'dashboard', path: '/ceo/dashboard', description: 'Executive overview' },
  ],
  law: [
    { label: 'Dashboard',  icon: 'gavel',         path: '/law/dashboard',   description: 'Legal operations' },
    { label: 'Project Overview', icon: 'folder_copy', path: '/law/project-overview', description: 'Read-only project plan visibility' },
    { label: 'Assigned Work', icon: 'assignment', path: '/law/assigned-work', description: 'Documents and contracts linked to your tasks', roles: ['law_employee'] },
    {
      label: 'Contracts',
      icon: 'contract',
      path: '/law/group/contracts',
      roles: ['law_head', 'admin', 'super_admin', 'superadmin'],
      children: [
        { label: 'Outsourcing Contracts', icon: 'contract',       path: '/law/contracts/outsourcing' },
        { label: 'Agreements',            icon: 'handshake',      path: '/law/contracts/agreements' },
        { label: 'Work on Hire',          icon: 'assignment_ind', path: '/law/contracts/work-on-hire' },
        { label: 'Third Party',           icon: 'groups',         path: '/law/contracts/third-party' },
      ],
    },
    {
      label: 'Documents',
      icon: 'description',
      path: '/law/group/documents',
      roles: ['law_head', 'admin', 'super_admin', 'superadmin'],
      children: [
        { label: 'Legal Documents',  icon: 'description',   path: '/law/documents/legal' },
        { label: 'Approved Library', icon: 'library_books', path: '/law/documents/library' },
      ],
    },
    {
      label: 'Compliance',
      icon: 'policy',
      path: '/law/group/compliance',
      roles: ['law_head', 'admin', 'super_admin', 'superadmin'],
      children: [
        { label: 'Privacy & Policy', icon: 'policy',    path: '/law/compliance/privacy-policy' },
        { label: 'Policy API', icon: 'vpn_key', path: '/law/compliance/policy-api' },
        { label: 'IP & Copyright',   icon: 'copyright', path: '/law/compliance/ip-copyright' },
      ],
    },
    {
      label: 'Risk',
      icon: 'balance',
      path: '/law/group/risk',
      roles: ['law_head', 'admin', 'super_admin', 'superadmin'],
      children: [
        { label: 'Disputes & Fraud', icon: 'balance', path: '/law/risk/disputes' },
      ],
    },
    { label: 'Tasks',      icon: 'task',           path: '/law/tasks',      description: 'Legal workflow tasks' },
    { label: 'Attendance', icon: 'calendar_month', path: '/law/attendance', description: 'Attendance operations' },
    { label: 'Team',       icon: 'group',          path: '/law/team',       description: 'Law department directory' },
    { label: 'Messages',   icon: 'forum',          path: '/law/messages',   description: 'Law team messages' },
    { label: 'Jobs',       icon: 'work_outline',   path: '/law/jobs',       description: 'Recruitment postings', roles: ['law_head', 'admin', 'super_admin', 'superadmin'] },
    { label: 'Leave',      icon: 'event_busy',     path: '/law/leave', description: 'Request and track leave', roles: ['law_employee'] },
  ],
  it: [
    { label: 'Dashboard',        icon: 'dashboard',              path: '/it/dashboard',                description: 'Command center overview' },
    { label: 'Project Overview', icon: 'folder_copy',            path: '/it/dashboard/project-overview', description: 'Read-only project plan visibility' },
    { label: 'Products',         icon: 'inventory_2',            path: '/it/dashboard/products',        description: 'Workspace control for each product' },
    { label: 'Tickets',          icon: 'confirmation_number',    path: '/it/dashboard/tickets',         description: 'Service desk queues and SLAs' },
    { label: 'Assets',           icon: 'devices',                path: '/it/dashboard/assets',          description: 'Device and hardware lifecycle' },
    { label: 'Security',         icon: 'security',               path: '/it/dashboard/security',        description: 'Threats, compliance and firewall' },
    { label: 'User Access',      icon: 'manage_accounts',        path: '/it/dashboard/iam',             description: 'Roles, permissions and access requests' },
    { label: 'Changes',          icon: 'published_with_changes', path: '/it/dashboard/changes',         description: 'ITIL changes, deployments and CI/CD' },
    { label: 'Operations',       icon: 'dns',                    path: '/it/dashboard/operations',      description: 'Infrastructure, network, security' },
    { label: 'Tasks',            icon: 'task',                   path: '/it/dashboard/tasks',           description: 'Workflow tasks and reminders' },
    { label: 'Attendance',       icon: 'calendar_month',         path: '/it/dashboard/attendance',      description: 'Attendance operations' },
    { label: 'Team',             icon: 'group',                  path: '/it/dashboard/team',            description: 'IT department directory', roles: IT_DEPT_ROLES },
    { label: 'Messages',         icon: 'forum',                  path: '/it/dashboard/messages',        description: 'IT team messages', roles: IT_DEPT_ROLES },
    { label: 'Reports',          icon: 'analytics',              path: '/it/dashboard/reports',         description: 'SLA reports, uptime and ticket trends' },
    { label: 'Activity',         icon: 'history',                path: '/it/dashboard/activity',        description: 'Audit trails and system event logs' },
  ],
  // `section` groups items under headings, ordered along the money workflow:
  // bill (Invoices) → collect/pay (Payments) → spend (Expenses, Payroll) →
  // control (Budgets, Accounting, Approval Rules) → personal workspace.
  finance: [
    { section: 'Overview', label: 'Dashboard', icon: 'dashboard', path: '/finance/dashboard', description: 'Financial control center' },
    { section: 'Overview', label: 'Reports',   icon: 'bar_chart', path: '/finance/dashboard/reports', description: 'Financial reports' },
    {
      section: 'Transactions',
      label: 'Invoices',
      icon: 'receipt_long',
      path: '/finance/group/invoices',
      children: [
        { label: 'All Invoices',         icon: 'receipt_long', path: '/finance/dashboard/invoices' },
        { label: 'Pending Verification', icon: 'fact_check',   path: '/finance/dashboard/invoices?status=draft' },
        { label: 'Approved',             icon: 'verified',     path: '/finance/dashboard/invoices?status=sent' },
        { label: 'Paid',                 icon: 'paid',         path: '/finance/dashboard/invoices?status=paid' },
        { label: 'Overdue',              icon: 'warning',      path: '/finance/dashboard/invoices?status=overdue' },
      ],
    },
    {
      section: 'Transactions',
      label: 'Payments',
      icon: 'payments',
      path: '/finance/group/payments',
      children: [
        { label: 'Payment Ledger',   icon: 'payments', path: '/finance/dashboard/payments' },
        { label: 'To Reconcile',     icon: 'event',    path: '/finance/dashboard/payments?status=recorded' },
        { label: 'Reconciled',       icon: 'done_all', path: '/finance/dashboard/payments?status=reconciled' },
        { label: 'Failed',           icon: 'error',    path: '/finance/dashboard/payments?status=failed' },
        // Heads reach the same page via Approval Rules; one entry avoids a double highlight.
        { label: 'Pending Approval', icon: 'approval', path: '/finance/dashboard/approvals', roles: ['finance_employee'] },
      ],
    },
    { section: 'Transactions', label: 'Expenses', icon: 'request_quote', path: '/finance/dashboard/expenses', description: 'Expense management' },
    { section: 'Transactions', label: 'Payroll',  icon: 'badge',         path: '/finance/dashboard/payroll',  description: 'Payroll processing' },
    { section: 'Planning & Control', label: 'Budgets', icon: 'account_balance_wallet', path: '/finance/dashboard/budgets', description: 'Department budgets' },
    {
      section: 'Planning & Control',
      label: 'Accounting',
      icon: 'menu_book',
      path: '/finance/group/accounting',
      children: [
        { label: 'Chart of Accounts & Journals', icon: 'account_tree', path: '/finance/dashboard/accounting' },
        { label: 'Vendors & Clients',            icon: 'domain',       path: '/finance/dashboard/directory' },
        { label: 'Compliance & Tax',             icon: 'gavel',        path: '/finance/dashboard/compliance' },
      ],
    },
    // Finance Head only (previously the Administration section).
    { section: 'Planning & Control', label: 'Approval Rules', icon: 'rule', path: '/finance/dashboard/approvals', description: 'Approval workflows', roles: FINANCE_HEAD_ROLES },
    { section: 'My Workspace', label: 'Tasks',     icon: 'task',        path: '/finance/dashboard/tasks',     description: 'Workflow tasks and reminders' },
    { section: 'My Workspace', label: 'Leave',     icon: 'event_note',  path: '/finance/dashboard/leave',     description: 'Leave requests and status' },
    { section: 'My Workspace', label: 'Documents', icon: 'folder_open', path: '/finance/dashboard/documents', description: 'Payslips and documents' },
    { section: 'My Workspace', label: 'Team',      icon: 'group',       path: '/finance/dashboard/team',      description: 'Finance department directory', roles: FINANCE_DEPT_ROLES },
    { section: 'My Workspace', label: 'Messages',  icon: 'forum',       path: '/finance/dashboard/messages',  description: 'Finance team messages', roles: FINANCE_DEPT_ROLES },
  ],
  media: [
    { label: 'Dashboard', icon: 'campaign', path: '/media/dashboard', description: 'Media command center' },
  ],
  outsourcing: [
    { label: 'Dashboard', icon: 'dashboard', path: '/outsourcing/dashboard', description: 'Freelancer overview' },
    { label: 'Jobs', icon: 'work', path: '/outsourcing/jobs', description: 'Assigned jobs' },
    { label: 'Contracts', icon: 'contract', path: '/outsourcing/contracts', description: 'Contract lifecycle' },
    { label: 'Time Logs', icon: 'schedule', path: '/outsourcing/time-logs', description: 'Time tracking' },
    { label: 'Profile', icon: 'person', path: '/outsourcing/profile', description: 'Profile and settings' },
  ],
};

// Drops items whose roles allow-list does not include the user role (recursively).
const filterByRole = (items, user) => {
  const role = String(user?.role || '').toLowerCase();
  return items
    .filter((item) => !Array.isArray(item.roles) || item.roles.includes(role))
    .map((item) => (Array.isArray(item.children) ? { ...item, children: filterByRole(item.children, user) } : item));
};

// Employees stay inside the Employee Portal — no cross-link into department
// portals (Finance/IT/Media) from the sidebar. Department-role employees use
// the Employee Portal for their personal workspace like everyone else.
export const resolvePortalMenu = (role, user = null) => {
  const normalizedRole = String(role || '').toLowerCase();
  if (normalizedRole === 'employee') {
    return portalMenuConfig.user;
  }
  const menu = portalMenuConfig[normalizedRole] || portalMenuConfig.user;
  return filterByRole(menu, user);
};
