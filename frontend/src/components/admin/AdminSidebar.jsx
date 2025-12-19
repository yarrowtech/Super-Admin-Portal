import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PortalSidebar from '../common/PortalSidebar';

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
    description: 'Department overview'
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
];

const AdminSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, user } = useAuth();

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  return (
    <div className="fixed left-0 top-0 z-20 h-screen w-64 shadow-lg">
      <PortalSidebar
        showBranding={false}
        brandingTitle=""
        brandingSubtitle=""
        brandingIcon=""
        user={user}
        navItems={navItems}
        currentPath={location.pathname}
        onLogout={handleLogout}
      />
    </div>
  );
};

export default AdminSidebar;
