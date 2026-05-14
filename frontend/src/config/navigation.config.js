export const adminNavigation = [
  { label: 'Dashboard', path: '/admin/dashboard', icon: 'dashboard' },
  { label: 'Users', path: '/admin/users', icon: 'group', permission: 'users:read' },
  { label: 'Departments', path: '/admin/departments', icon: 'domain' },
  { label: 'Security', path: '/admin/security', icon: 'security' },
  { label: 'Reports', path: '/admin/reports', icon: 'analytics' },
  { label: 'Workflows', path: '/admin/workflows', icon: 'account_tree' },
];

export const portalNavigation = {
  ceo: [{ label: 'Dashboard', path: '/ceo/dashboard', icon: 'business_center' }],
  hr: [
    { label: 'Dashboard', path: '/hr/dashboard', icon: 'dashboard' },
    { label: 'Employees', path: '/hr/employees', icon: 'groups' },
    { label: 'Attendance', path: '/hr/attendance', icon: 'event_available' },
    { label: 'Leave', path: '/hr/leave', icon: 'beach_access' },
    { label: 'Recruitment', path: '/hr/recruitment', icon: 'person_search' },
  ],
};
