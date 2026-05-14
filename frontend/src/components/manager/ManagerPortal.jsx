import React from 'react';
import ManagerSidebar from './ManagerSidebar';
import { NotificationProvider } from '../../context/NotificationContext';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { resolvePortalMenu } from '../../config/portalMenus';

const ManagerPortal = ({ children }) => {
  const { user } = useAuth();
  const managerMobileItems = resolvePortalMenu('manager').map(({ label, icon, path }) => ({ label, icon, path }));

  return (
    <NotificationProvider>
      <AppLayout
        sidebar={<ManagerSidebar />}
        title="Manager Portal"
        subtitle="Team operations"
        mobileIcon="supervisor_account"
        mobileItems={managerMobileItems}
        user={user}
      >
        {children}
      </AppLayout>
    </NotificationProvider>
  );
};

export default ManagerPortal;
