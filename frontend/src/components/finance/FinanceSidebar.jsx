import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { resolvePortalMenu } from '../../config/portalMenus';
import { useSidebar } from '../../context/SidebarContext';
import { financeApi } from '../../services/finance';

const basePath = '/finance/dashboard';

const FinanceSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { collapsed } = useSidebar();
  const [departmentCatalog, setDepartmentCatalog] = useState([]);

  // Per-department entries under the "Departments" group, as before the shared-sidebar refactor.
  useEffect(() => {
    let alive = true;
    if (!token) return undefined;
    financeApi
      .getDepartmentCatalog(token)
      .then((response) => {
        const rows = response?.data ?? response ?? [];
        if (alive) setDepartmentCatalog(Array.isArray(rows) ? rows.filter((department) => !department.isSystem) : []);
      })
      .catch(() => {
        if (alive) setDepartmentCatalog([]);
      });
    return () => {
      alive = false;
    };
  }, [token]);

  const financeNavItems = useMemo(
    () =>
      resolvePortalMenu('finance', user).map((item) =>
        item.dynamicChildren === 'departments'
          ? {
              ...item,
              children: [
                ...item.children,
                ...departmentCatalog.map((department) => ({
                  label: department.name,
                  icon: 'domain',
                  path: `${basePath}/project-overview?department=${encodeURIComponent(department._id || department.code)}`,
                })),
              ],
            }
          : item
      ),
    [user, departmentCatalog]
  );

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
