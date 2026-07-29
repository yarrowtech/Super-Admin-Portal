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
    { label: 'Users',       icon: 'manage_accounts', path: '/hr/users',        description: 'Employee records' },
    { label: 'Recruitment', icon: 'person_search',   path: '/hr/recruitment',  description: 'Hiring pipeline' },
    { label: 'Attendance',  icon: 'calendar_month',  path: '/hr/attendance',   description: 'Attendance operations' },
    { label: 'Leave',       icon: 'event_note',      path: '/hr/leave',        description: 'Leave approvals and policy' },
    { label: 'Performance', icon: 'trending_up',     path: '/hr/performance',  description: 'KPI and appraisal' },
    { label: 'Outsourcing', icon: 'handshake',       path: '/hr/outsourcing',  description: 'Freelancer task tracking' },
    { label: 'Tasks',       icon: 'smart_toy',       path: '/hr/tasks',        description: 'Workflow tasks and reminders' },
    { label: 'Communication', icon: 'forum',          path: '/hr/communication', description: 'Broadcast and communication' },
  ],
  user: [
    { label: 'Dashboard', icon: 'dashboard',     path: '/employee/dashboard', description: 'Personal workspace' },
    { label: 'Project Overview', icon: 'folder_copy', path: '/employee/project-overview', description: 'Read-only project plan visibility' },
    { label: 'My Profile', icon: 'person',        path: '/employee/profile',   description: 'Profile and personal data' },
    { label: 'Projects',   icon: 'folder_open',  path: '/employee/projects',  description: 'My projects and work logs' },
    { label: 'Tasks',      icon: 'task',          path: '/employee/tasks',     description: 'Assigned tasks' },
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
    { label: 'Recruitment',  icon: 'person_search', path: '/manager/recruitment', description: 'Hiring pipeline' },
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
    { label: 'Contracts',  icon: 'contract',      path: '/law/contracts',   description: 'Outsourcing contract validation' },
    { label: 'Legal Docs', icon: 'description',   path: '/law/legal-docs',  description: 'Legal document management' },
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

export const resolvePortalMenu = (role) => {
  const normalizedRole = String(role || '').toLowerCase();
  if (normalizedRole === 'employee') return portalMenuConfig.user;
  return portalMenuConfig[normalizedRole] || portalMenuConfig.user;
};
