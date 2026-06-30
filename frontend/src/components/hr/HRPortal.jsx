import React from 'react';
import { Outlet } from 'react-router-dom';
import HRSidebar from './HRSidebar';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { resolvePortalMenu } from '../../config/portalMenus';

const HRPortal = () => {
  const { user } = useAuth();
  const hrMobileItems = resolvePortalMenu('hr').map(({ label, icon, path }) => ({ label, icon, path }));

  return (
    <AppLayout
      sidebar={<HRSidebar />}
      title="HR Portal"
      subtitle="People operations"
      mobileIcon="badge"
      mobileItems={hrMobileItems}
      user={user}
      showHeader={false}
      showMobileNav={false}
    >
        <Outlet />
    </AppLayout>
  );
};

export default HRPortal;
