import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { resolvePortalMenu } from '../../config/portalMenus';
import { useSidebar } from '../../context/SidebarContext';

const HRSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { collapsed } = useSidebar();
  const hrNavItems = resolvePortalMenu('hr');
  if (!canAccessPortal(user, PORTALS.HR)) return null;
  console.debug('[HRSidebar] mounted', { role: user?.role || 'unknown' });

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <aside className={`fixed left-0 top-0 z-[1000] hidden h-screen md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
      <PortalSidebar
        brandingTitle="HR Portal"
        brandingSubtitle="People operations"
        brandingIcon="badge"
        user={user}
        navItems={hrNavItems}
        currentPath={location.pathname}
        onLogout={handleLogout}
      />
    </aside>
  );
};

export default HRSidebar;
