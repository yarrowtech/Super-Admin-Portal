import React from 'react';
import { useLocation } from 'react-router-dom';
import EmployeeSidebar from './EmployeeSidebar';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { resolvePortalMenu } from '../../config/portalMenus';

const EmployeePortal = ({ children }) => {
  const location = useLocation();
  const { user } = useAuth();
  const isChatPage = location.pathname === '/employee/chat';
  const employeeMobileItems = resolvePortalMenu('user').map(({ label, icon, path }) => ({ label, icon, path }));
  const contentClassName = isChatPage
    ? 'overflow-hidden'
    : 'bg-gradient-to-b from-white/80 via-white/60 to-transparent dark:from-slate-900/50 dark:via-slate-900/30';

  return (
    <AppLayout
      sidebar={<EmployeeSidebar />}
      title="Employee Portal"
      subtitle="Work hub"
      mobileIcon="person"
      mobileItems={employeeMobileItems}
      user={user}
      contentClassName={contentClassName}
    >
      {children}
    </AppLayout>
  );
};

export default EmployeePortal;
