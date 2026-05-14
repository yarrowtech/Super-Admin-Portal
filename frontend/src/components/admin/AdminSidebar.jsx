import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PortalSidebar from '../common/PortalSidebar';
import { canAccessPortal, PORTALS } from '../../utils/rbac';

const navItems = [
  {
    label: 'Dashboard',
    icon: 'dashboard',
    path: '/admin/dashboard',
    description: 'Overview & Analytics'
  },
  {
    label: 'User Management',
    icon: 'group',
    path: '/admin/users',
    description: 'Manage users & roles'
  },
  {
    label: 'Departments',
    icon: 'corporate_fare',
    path: '/admin/departments',
    description: 'Department overview',
    children: [
      { label: 'Overview', path: '/admin/departments' },
      { label: 'LAW', path: '/law/dashboard' },
      { label: 'HR', path: '/hr/dashboard' },
      { label: 'IT', path: '/it/dashboard' },
      { label: 'Finance', path: '/finance/dashboard' },
      { label: 'Media', path: '/media/dashboard' },
    ]
  },
  {
    label: 'Security',
    icon: 'security',
    path: '/admin/security',
    description: 'Security monitoring'
  },
  {
    label: 'Reports',
    icon: 'bar_chart',
    path: '/admin/reports',
    description: 'Analytics & reports'
  },
  {
    label: 'Workflows',
    icon: 'account_tree',
    path: '/admin/workflows',
    description: 'Process management'
  },
  {
    label: 'Super Admin',
    icon: 'admin_panel_settings',
    path: '/admin/super-admin',
    description: 'Global controls'
  },
  {
    label: 'Outsourcing',
    icon: 'work',
    path: '/admin/outsourcing/dashboard',
    description: 'Outsourcing operations',
    children: [
      { label: 'Dashboard', path: '/admin/outsourcing/dashboard' },
      { label: 'Freelancers', path: '/admin/outsourcing/freelancers' },
      { label: 'Jobs', path: '/admin/outsourcing/jobs' },
      { label: 'Contracts', path: '/admin/outsourcing/contracts' },
      { label: 'Reports', path: '/admin/outsourcing/reports' },
    ]
  },
];

const menuConfig = {
  admin: navItems,
  hr: [
    { label: 'Dashboard', icon: 'dashboard', path: '/hr/dashboard', description: 'People operations overview' },
    { label: 'Employees', icon: 'groups', path: '/hr/employees', description: 'Employee directory' },
    { label: 'Hiring', icon: 'person_search', path: '/hr/recruitment', description: 'Recruitment pipeline' },
  ],
  user: [
    { label: 'Profile', icon: 'person', path: '/employee/profile', description: 'Personal profile' },
    { label: 'Tasks', icon: 'task', path: '/employee/tasks', description: 'Assigned work' },
  ],
};

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const role = String(user?.role || '').toLowerCase();
  const resolvedNavItems = useMemo(() => menuConfig[role] || navItems, [role]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    console.debug('[AdminSidebar] role resolved', role);
  }, [role]);

  if (!canAccessPortal(user, PORTALS.ADMIN)) return null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-700 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-200 dark:hover:bg-neutral-800"
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">Admin Portal</p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user?.firstName} {user?.lastName}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 dark:text-red-400 dark:hover:bg-red-900/20"
          aria-label="Logout"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      <div className="fixed left-0 top-0 z-[1000] hidden h-screen w-[250px] shadow-lg md:block">
        <PortalSidebar
          showBranding={false}
          brandingTitle=""
          brandingSubtitle=""
          brandingIcon=""
          user={user}
          navItems={resolvedNavItems}
          currentPath={location.pathname}
          onLogout={handleLogout}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="relative h-full w-[min(250px,86vw)] shadow-2xl transition-transform duration-300 ease-out">
            <PortalSidebar
              brandingTitle="Admin Portal"
              brandingSubtitle="Enterprise controls"
              brandingIcon="admin_panel_settings"
              user={user}
              navItems={resolvedNavItems}
              currentPath={location.pathname}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
