import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import AppLayout from '../../layouts/AppLayout';
import PortalSidebar from '../common/PortalSidebar';
import { useAuth } from '../../context/AuthContext';
import { useSidebar } from '../../context/SidebarContext';

export const managerMenu = [
  { label: 'Dashboard', icon: 'dashboard', path: '/manager/dashboard' },
  { label: 'Projects', icon: 'folder_open', path: '/manager/projects' },
  { label: 'Team', icon: 'groups', path: '/manager/team' },
  { label: 'Tasks', icon: 'task_alt', path: '/manager/tasks' },
  { label: 'Work Reviews', icon: 'fact_check', path: '/manager/work-reviews' },
  { label: 'Leave Approvals', icon: 'event_available', path: '/manager/leave' },
  { label: 'Project Overview', icon: 'folder_copy', path: '/manager/project-overview' },
];

const ManagerPortal = () => {
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();
  const location = useLocation();
  const navigate = useNavigate();
  const mobileItems = useMemo(() => managerMenu, []);
  const signOut = async () => { await logout(); navigate('/login', { replace: true }); };

  return <AppLayout
    sidebar={<aside className={`fixed left-0 top-0 z-[1000] hidden h-screen md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}><PortalSidebar brandingTitle="IT Manager" brandingIcon="manage_accounts" user={user} navItems={managerMenu} currentPath={location.pathname} onLogout={signOut} /></aside>}
    title="IT Manager Portal"
    subtitle={`${user?.department || 'IT'} team operations`}
    mobileIcon="manage_accounts"
    mobileItems={mobileItems}
    user={user}
    showHeader={false}
  ><Outlet /></AppLayout>;
};

export default ManagerPortal;
