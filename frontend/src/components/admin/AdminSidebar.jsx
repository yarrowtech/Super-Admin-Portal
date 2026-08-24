import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import { useAuth } from '../../context/AuthContext';
import PortalSidebar from '../common/PortalSidebar';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import { useSidebar } from '../../context/SidebarContext';
import { createLogger } from '../../utils/logger';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');
const adminSidebarLogger = createLogger({ module: 'admin-sidebar' });

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
      {
        label: 'Outsourcing',
        path: '/admin/outsourcing/dashboard',
        children: [
          { label: 'Dashboard', path: '/admin/outsourcing/dashboard' },
          { label: 'Freelancers', path: '/admin/outsourcing/freelancers' },
          { label: 'Jobs', path: '/admin/outsourcing/jobs' },
          { label: 'Contracts', path: '/admin/outsourcing/contracts' },
          { label: 'Reports', path: '/admin/outsourcing/reports' },
          { label: 'Support Tickets', path: '/admin/outsourcing/support' },
        ],
      },
    ]
  },
  {
    label: 'Security',
    icon: 'security',
    path: '/admin/security',
    description: 'Security monitoring'
  },
  {
    label: 'System Logs',
    icon: 'receipt_long',
    path: '/admin/system-logs',
    description: 'MongoDB activity logs'
  },
  {
    label: 'Projects',
    icon: 'folder_open',
    path: '/admin/projects',
    description: 'Project allocation and access'
  },
  {
    label: 'Digital Portfolios',
    icon: 'work',
    path: '/admin/digital-portfolio',
    description: 'Manage project portfolios & pillars'
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
    label: 'Legal Registry',
    icon: 'gavel',
    path: '/admin/legal-docs',
    description: 'Legal document registry'
  },
  {
    label: 'Legal Library',
    icon: 'library_books',
    path: '/admin/legal-library',
    description: 'Approved legal documents'
  },
  {
    label: 'Sales Submissions',
    icon: 'fact_check',
    path: '/admin/sales-submissions',
    description: 'All vendor & buyer questionnaire responses'
  },
  {
    label: 'Support Center',
    icon: 'support_agent',
    path: '/admin/support-center',
    description: 'Manage all portal support tickets'
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

const ADMIN_ROLES = ['admin', 'super_admin', 'superadmin'];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user, token } = useAuth();
  const { collapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [supportBadge, setSupportBadge] = useState(0);
  const role = String(user?.role || '').toLowerCase();

  // Real-time badge: count new support tickets while away from support-center
  useEffect(() => {
    if (!token || !ADMIN_ROLES.includes(role)) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ['websocket'] });
    socket.emit('join_room', 'support:admins');
    socket.on('support:new_ticket', () => {
      setSupportBadge((n) => n + 1);
    });
    return () => socket.disconnect();
  }, [token, role]);

  // Clear badge when admin navigates to support center
  useEffect(() => {
    if (location.pathname.startsWith('/admin/support-center')) setSupportBadge(0);
  }, [location.pathname]);

  const resolvedNavItems = useMemo(() => {
    const items = menuConfig[role] || navItems;
    if (!supportBadge) return items;
    return items.map((item) =>
      item.path === '/admin/support-center' ? { ...item, badge: supportBadge } : item
    );
  }, [role, supportBadge]);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    adminSidebarLogger.debug({ role }, 'Role resolved');
  }, [role]);

  if (!canAccessPortal(user, PORTALS.ADMIN)) return null;

  return (
    <>
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-700 transition-colors hover:bg-neutral-100 active:scale-95 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-200 dark:hover:bg-neutral-800"
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-bold leading-tight text-neutral-900 dark:text-neutral-100">Admin Portal</p>
          <p className="truncate text-xs leading-tight text-neutral-500 dark:text-neutral-400">{user?.firstName} {user?.lastName}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 active:scale-95 focus:outline-none focus:ring-2 focus:ring-red-300 dark:text-red-400 dark:hover:bg-red-900/20"
          aria-label="Logout"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      <div className={`fixed left-0 top-0 z-[1000] hidden h-screen shadow-lg lg:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
        <PortalSidebar
          showBranding={false}
          brandingTitle=""
          brandingSubtitle=""
          brandingIcon=""
          user={user}
          navItems={resolvedNavItems}
          currentPath={location.pathname}
          onLogout={handleLogout}
          footerItems={[
            { path: '/admin/settings', label: 'Settings', icon: 'settings' },
          ]}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50 animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation overlay"
          />
          <div className="animate-in slide-in-from-left relative h-full w-[min(280px,86vw)] shadow-2xl duration-300 ease-out">
            <PortalSidebar
              brandingTitle="Admin Portal"
              brandingSubtitle="Enterprise controls"
              brandingIcon="admin_panel_settings"
              user={user}
              navItems={resolvedNavItems}
              currentPath={location.pathname}
              onLogout={handleLogout}
              onNavigate={closeMobile}
              forceExpanded
              onClose={closeMobile}
              footerItems={[
                { path: '/admin/settings', label: 'Settings', icon: 'settings' },
              ]}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default AdminSidebar;
