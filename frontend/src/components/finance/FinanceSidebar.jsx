import React, { useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { resolvePortalMenu } from '../../config/portalMenus';
import { useSidebar } from '../../context/SidebarContext';
import { financeApi } from '../../services/finance';

const FINANCE_HEAD = ['finance_manager', 'admin', 'super_admin'];
const REVIEW_PATH = '/finance/dashboard/review';

const FinanceSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, token, logout } = useAuth();
  const { collapsed } = useSidebar();
  const isHead = FINANCE_HEAD.includes(String(user?.role || '').toLowerCase());
  const allowed = canAccessPortal(user, PORTALS.FINANCE);

  // Badge on Review Queue (head: waiting for approval) / My Submissions (employee: returned).
  const { data: reviewCount = 0 } = useQuery({
    queryKey: ['finance', 'review-count', isHead ? 'submitted' : 'returned'],
    queryFn: async () => {
      const res = await financeApi.getReviewQueue(token, { status: isHead ? 'submitted' : 'returned' });
      return (res?.data?.rows || []).length;
    },
    enabled: Boolean(token) && allowed,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const financeNavItems = useMemo(
    () => resolvePortalMenu('finance', user).map((item) => (item.path === REVIEW_PATH ? { ...item, badge: reviewCount } : item)),
    [user, reviewCount],
  );

  if (!allowed) return null;

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
