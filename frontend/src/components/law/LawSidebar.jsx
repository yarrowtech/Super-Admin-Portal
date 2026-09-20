import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { resolvePortalMenu } from '../../config/portalMenus';
import { useSidebar } from '../../context/SidebarContext';
import useLawProjectContext from './useLawProjectContext';

const applyProjectContext = (items, withProjectContext) => items.map((item) => ({
  ...item,
  path: item.path?.startsWith('/law/group/') ? item.path : withProjectContext(item.path),
  children: Array.isArray(item.children) ? applyProjectContext(item.children, withProjectContext) : undefined,
}));

const LawSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed } = useSidebar();
  const { withProjectContext: withProjectContextRaw } = useLawProjectContext();
  // Law employees have no project context: keep every nav link free of ?projectId.
  const isLawEmployee = String(user?.role || '').toLowerCase() === 'law_employee';
  const withProjectContext = isLawEmployee ? (path) => path : withProjectContextRaw;
  const lawNavWithProject = applyProjectContext(resolvePortalMenu('law', user), withProjectContext);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  if (!canAccessPortal(user, PORTALS.LAW)) return null;

  return (
    <aside className={`fixed left-0 top-0 z-[1000] hidden h-screen md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
      <PortalSidebar
        brandingTitle="Law Portal"
        brandingIcon="gavel"
        user={user}
        navItems={lawNavWithProject}
        currentPath={location.pathname}
        onLogout={handleLogout}
        footerItems={[
          { path: withProjectContext('/law/settings'), label: 'Settings', icon: 'settings' },
          { path: withProjectContext('/law/support'),  label: 'Support',  icon: 'support_agent' },
        ]}
      />
    </aside>
  );
};

export default LawSidebar;
