import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import PortalSidebar from '../common/PortalSidebar';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';
import { resolvePortalMenu } from '../../config/portalMenus';

const EmployeePortal = () => {
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const navItems = useMemo(() => resolvePortalMenu('employee', user), [user]);
  const handleLogout = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const sidebar = (
    <aside className={`fixed left-0 top-0 z-[1000] hidden h-screen md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
      <PortalSidebar
        brandingTitle="Employee Portal"
        brandingSubtitle="Employee workspace"
        brandingIcon="badge"
        user={user}
        navItems={navItems}
        currentPath={location.pathname}
        onLogout={handleLogout}
        footerItems={[
          { path: '/employee/profile', label: 'Settings', icon: 'settings' },
        ]}
      />
    </aside>
  );

  return (
    <AppLayout
      sidebar={sidebar}
      title="Employee Portal"
      subtitle="Employee workspace"
      mobileIcon="badge"
      mobileItems={navItems}
      user={user}
      showHeader={false}
    >
      <Outlet />
    </AppLayout>
  );
};

export default EmployeePortal;
