import { resolvePortalMenu } from '../../config/portalMenus';
import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import PortalSidebar from '../common/PortalSidebar';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

const ManagerPortal = () => {
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const managerMenu = useMemo(() => resolvePortalMenu('manager', user), [user]);
  const mobileItems = useMemo(() => [...managerMenu, { label: 'Settings', icon: 'settings', path: '/manager/settings' }, { label: 'Support', icon: 'support_agent', path: '/manager/support' }], [managerMenu]);
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };

  return <AppLayout
    theme="manager"
    sidebar={<aside className={`fixed left-0 top-0 z-[1000] hidden h-screen md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}><PortalSidebar brandingTitle="IT Manager" brandingIcon="manage_accounts" user={user} navItems={managerMenu} currentPath={location.pathname} onLogout={signOut} footerItems={[{ path: '/manager/settings', label: 'Settings', icon: 'settings' }, { path: '/manager/support', label: 'Support', icon: 'support_agent' }]} /></aside>}
    title="IT Manager Portal"
    subtitle={`${user?.department || 'IT'} team operations`}
    mobileIcon="manage_accounts"
    mobileItems={mobileItems}
    user={user}
    showHeader={false}
  ><Outlet /></AppLayout>;
};

export default ManagerPortal;
