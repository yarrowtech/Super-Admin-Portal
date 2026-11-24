import React from 'react';
import { Outlet } from 'react-router-dom';
import HRSidebar from './HRSidebar';
import { useAuth } from '../../context/AuthContext';
import AppLayout from '../../layouts/AppLayout';
import { resolvePortalMenu } from '../../config/portalMenus';

const HRPortal = () => {
  const { user } = useAuth();
  const hrMobileItems = resolvePortalMenu('hr', user).map(({ label, icon, path }) => ({ label, icon, path })).concat([
    { label: 'Settings', icon: 'settings', path: '/hr/settings' },
    { label: 'Support', icon: 'support_agent', path: '/hr/support' },
  ]);

  return (
    <AppLayout
      sidebar={<HRSidebar />}
      theme="hr"
      title="HR Portal"
      subtitle="People operations"
      mobileIcon="badge"
      mobileItems={hrMobileItems}
      user={user}
      showHeader={false}
      showMobileNav
    >
        <Outlet />
    </AppLayout>
  );
};

export default HRPortal;
