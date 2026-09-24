import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { resolvePortalMenu } from '../../config/portalMenus';
import { useSidebar } from '../../context/SidebarContext';

const FinanceSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();

  const financeNavItems = useMemo(() => resolvePortalMenu('finance', user), [user]);

  if (!canAccessPortal(user, PORTALS.FINANCE)) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`fixed left-0 top-0 z-[1000] hidden h-screen md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
      <PortalSidebar
        brandingTitle="Finance Portal"
        brandingIcon="account_balance"
        user={user}
        navItems={financeNavItems}
        currentPath={location.pathname}
        onLogout={handleLogout}
        footerItems={[
          { path: '/finance/dashboard/settings', label: 'Settings', icon: 'settings' },
          { path: '/finance/dashboard/support',  label: 'Support',  icon: 'support_agent' },
        ]}
      />
    </aside>
  );
};

export default FinanceSidebar;
