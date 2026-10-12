import React from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import FinanceSidebar from './FinanceSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';
import { resolvePortalMenu } from '../../config/portalMenus';

const FinancePortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const isFinanceHead = ['finance_manager', 'admin', 'super_admin'].includes(String(user?.role || '').toLowerCase());

  // Mobile navigation uses the same role-filtered routes as the desktop sidebar.
  // Group paths are presentation-only; only their real child routes are navigable.
  const mobileItems = resolvePortalMenu('finance', user).flatMap(item => (
    item.children?.length ? item.children : [item]
  )).concat([
    { path: '/finance/dashboard/settings', label: 'Settings', icon: 'settings' },
    { path: '/finance/dashboard/support', label: 'Support', icon: 'support_agent' },
  ]).map(item => {
    const [pathname, search = ''] = item.path.split('?');
    const active = search
      ? location.pathname === pathname && new URLSearchParams(search).get('status') === new URLSearchParams(location.search).get('status')
      : location.pathname === pathname
        ? !new URLSearchParams(location.search).has('status')
        : pathname !== '/finance/dashboard' && location.pathname.startsWith(`${pathname}/`);
    return { ...item, active };
  });

  return (
    <AppLayout
      sidebar={<FinanceSidebar />}
      title="Finance Portal"
      subtitle={isFinanceHead ? 'Financial control layer' : 'Finance operations queue'}
      mobileIcon="account_balance"
      user={user}
      showHeader={false}
      mobileItems={mobileItems}
      showMobileNav
    >
      <Outlet />
    </AppLayout>
  );
};

export default FinancePortal;
