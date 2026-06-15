export const hrNavItems = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/hr/dashboard',
    description: 'People operations overview',
  },
  {
    label: 'Employees',
    icon: 'manage_accounts',
    path: '/hr/employees',
    description: 'Employee records and structure',
  },
  {
    label: 'Profiles',
    icon: 'person_search',
    path: '/hr/profiles',
    description: 'Read-only employee profile intelligence',
  },
  {
    label: 'Attendance',
    icon: 'calendar_month',
    path: '/hr/attendance',
    description: 'Attendance and corrections',
  },
  {
    label: 'Leave',
    icon: 'hourglass_empty',
    path: '/hr/leave',
    description: 'Leave approvals and policies',
  },
  {
    label: 'Recruitment',
    icon: 'work',
    path: '/hr/recruitment',
    description: 'Hiring pipeline and applicants',
  },
  {
    label: 'Work Management',
    icon: 'task_alt',
    path: '/hr/tasks',
    description: 'Tasks, execution updates, and review',
  },
  {
    label: 'Performance',
    icon: 'trending_up',
    path: '/hr/performance',
    description: 'Reviews, appraisals, and growth',
  },
  {
    label: 'Communication',
    icon: 'campaign',
    path: '/hr/communication',
    description: 'Policies, notices, and updates',
  },
];

export const hrMobileItems = hrNavItems.map(({ label, icon, path }) => ({
  label,
  icon,
  path,
}));
