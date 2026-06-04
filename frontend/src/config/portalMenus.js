export const portalMenuConfig = {
  admin: [
    { label: 'Dashboard', icon: 'dashboard', path: '/admin/dashboard', description: 'Overview and analytics' },
    { label: 'HR Management', icon: 'badge', path: '/hr/dashboard', description: 'People operations workspace' },
    { label: 'Employees', icon: 'group', path: '/admin/users', description: 'Users and role management' },
    { label: 'Reports', icon: 'bar_chart', path: '/admin/reports', description: 'Company performance reports' },
    { label: 'Settings', icon: 'settings', path: '/admin/super-admin', description: 'System controls and policies' },
  ],
  hr: [
    { label: 'Dashboard', icon: 'dashboard', path: '/hr/dashboard', description: 'HR command center' },
    { label: 'Employees', icon: 'manage_accounts', path: '/hr/employees', description: 'Employee records' },
    { label: 'Recruitment', icon: 'person_search', path: '/hr/recruitment', description: 'Hiring pipeline' },
    { label: 'Attendance', icon: 'calendar_month', path: '/hr/attendance', description: 'Attendance operations' },
    { label: 'Leave', icon: 'event_note', path: '/hr/leave', description: 'Leave approvals and policy' },
    { label: 'Payroll', icon: 'payments', path: '/finance/dashboard', description: 'Payroll workspace' },
    { label: 'Performance', icon: 'trending_up', path: '/hr/performance', description: 'KPI and appraisal' },
    { label: 'Reports', icon: 'assessment', path: '/hr/dashboard?panel=reports', description: 'People and process reports' },
    { label: 'Messages', icon: 'forum', path: '/hr/communication', description: 'Broadcast and communication' },
    { label: 'Automation', icon: 'smart_toy', path: '/hr/tasks?view=automation', description: 'Workflow automations and reminders' },
    { label: 'Settings', icon: 'settings', path: '/hr/dashboard?panel=settings', description: 'HR portal configuration' },
  ],
  user: [
    { label: 'Dashboard', icon: 'dashboard', path: '/employee/dashboard', description: 'Personal workspace' },
    { label: 'My Profile', icon: 'person', path: '/employee/profile', description: 'Profile and personal data' },
    { label: 'Attendance', icon: 'schedule', path: '/employee/projects', description: 'Attendance and work logs' },
    { label: 'Leave', icon: 'event_note', path: '/employee/leave', description: 'Leave requests and status' },
    { label: 'Payslips', icon: 'receipt_long', path: '/employee/documents', description: 'Salary documents' },
    { label: 'Tasks', icon: 'task', path: '/employee/tasks', description: 'Assigned tasks' },
    { label: 'Messages', icon: 'forum', path: '/employee/chat', description: 'Chat with HR and teams' },
  ],
  manager: [
    { label: 'Dashboard', icon: 'dashboard', path: '/manager/dashboard', description: 'Team overview' },
    { label: 'Work Board', icon: 'work_history', path: '/manager/work-board', description: 'Execution board' },
    { label: 'Tasks', icon: 'task_alt', path: '/manager/tasks', description: 'Task operations' },
    { label: 'Products', icon: 'inventory_2', path: '/manager/products', description: 'Product operations' },
    { label: 'Team', icon: 'group', path: '/manager/team', description: 'Team management' },
    { label: 'Leave', icon: 'event_note', path: '/manager/leave', description: 'Leave approvals' },
    { label: 'Reports', icon: 'assessment', path: '/manager/reports', description: 'Team reports' },
    { label: 'Chat', icon: 'forum', path: '/manager/chat', description: 'Manager chat' },
  ],
  ceo: [
    { label: 'Dashboard', icon: 'dashboard', path: '/ceo/dashboard', description: 'Executive overview' },
  ],
  law: [
    { label: 'Dashboard', icon: 'gavel', path: '/law/dashboard', description: 'Legal operations' },
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
