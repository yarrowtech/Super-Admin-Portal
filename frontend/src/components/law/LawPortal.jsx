import React from 'react';
import { Outlet } from 'react-router-dom';
import LawSidebar from './LawSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { resolvePortalMenu } from '../../config/portalMenus';
import useLawProjectContext from './useLawProjectContext';

const LawPortal = () => {
  const { user } = useAuth();
  const { withProjectContext } = useLawProjectContext();
  const mobileItems = resolvePortalMenu('law', user).flatMap(item => item.children?.length ? item.children : [item]).concat([
    { label: 'Settings', icon: 'settings', path: '/law/settings' },
    { label: 'Support', icon: 'support_agent', path: '/law/support' },
  ]).map(item => ({ ...item, path: user?.role === 'law_employee' ? item.path : withProjectContext(item.path) }));

  return (
    <AppLayout
      sidebar={<LawSidebar />}
      theme="law"
      title="Law Portal"
      subtitle="Legal operations"
      mobileIcon="gavel"
      mobileItems={mobileItems}
      user={user}
      showHeader={false}
      showMobileNav
    >
      <Outlet />
    </AppLayout>
  );
};

export default LawPortal;
