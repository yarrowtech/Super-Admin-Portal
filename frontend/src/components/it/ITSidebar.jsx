import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { resolvePortalMenu } from '../../config/portalMenus';
import { useSidebar } from '../../context/SidebarContext';

const ITSidebar = ({ supportBadge = 0 }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();
  const itNavItems = resolvePortalMenu('it');
  if (!canAccessPortal(user, PORTALS.IT)) return null;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`fixed left-0 top-0 z-[1000] hidden h-screen md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
      <PortalSidebar
        brandingTitle="IT Portal"
        brandingIcon="memory"
        user={user}
        navItems={itNavItems}
        currentPath={location.pathname}
        onLogout={handleLogout}
        footerItems={[
          { path: '/it/dashboard/settings',        label: 'Settings', icon: 'settings' },
          { path: '/it/dashboard/support',         label: 'Support',  icon: 'support_agent' },
          ...(['it_admin', 'admin', 'super_admin', 'superadmin'].includes(user?.role)
            ? [{ path: '/it/dashboard/support-center', label: 'Support Center', icon: 'confirmation_number', badge: supportBadge }]
            : []),
        ]}
      />
    </aside>
  );
};

export default ITSidebar;
