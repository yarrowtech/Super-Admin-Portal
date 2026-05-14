import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import HRSidebar from './HRSidebar';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { resolvePortalMenu } from '../../config/portalMenus';

const HRPortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const hrMobileItems = resolvePortalMenu('hr').map(({ label, icon, path }) => ({ label, icon, path }));
  const isHrDashboardRoute = location.pathname === '/hr/dashboard';

  return (
    <AppLayout
      sidebar={<HRSidebar />}
      title="HR Portal"
      subtitle="People operations"
      mobileIcon="badge"
      mobileItems={hrMobileItems}
      user={user}
      showHeader={!isHrDashboardRoute}
      showMobileNav={!isHrDashboardRoute}
    >
        <Outlet />
    </AppLayout>
  );
};

export default HRPortal;
