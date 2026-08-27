import React, { useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { useSidebar } from '../../context/SidebarContext';

const outsourcingNavItems = [
  { label: 'Dashboard',     icon: 'dashboard',     path: '/outsourcing/dashboard' },
  { label: 'Projects',      icon: 'apps',          path: '/outsourcing/projects' },
  { label: 'Jobs',          icon: 'work',          path: '/outsourcing/jobs' },
  { label: 'Contracts',     icon: 'contract',      path: '/outsourcing/contracts' },
  { label: 'Time Logs',     icon: 'schedule',      path: '/outsourcing/time-logs' },
  { label: 'Activity',      icon: 'timeline',      path: '/outsourcing/activity' },
  { label: 'Payments',      icon: 'payments',      path: '/outsourcing/payments' },
  { label: 'Profile',       icon: 'person',        path: '/outsourcing/profile' },
];

const outsourcingFooterItems = [
  { path: '/outsourcing/settings', label: 'Settings', icon: 'settings' },
  { path: '/outsourcing/support',  label: 'Support',  icon: 'support_agent' },
];

const sidebarProps = {
  brandingTitle: 'Outsourcing Portal',
  brandingIcon: 'work',
  navItems: outsourcingNavItems,
  footerItems: outsourcingFooterItems,
};

const OutsourcingSidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed } = useSidebar();

  const handleLogout = useCallback(async () => {
    await logout();
    onClose();
    navigate('/outsourcing/login', { replace: true });
  }, [logout, navigate, onClose]);

  if (!canAccessPortal(user, PORTALS.OUTSOURCING)) return null;

  return (
    <>
      {/* Desktop sidebar */}
      <div className={`fixed left-0 top-0 z-1000 hidden h-screen shadow-lg md:block ${collapsed ? 'w-16' : 'w-62.5'}`}>
        <PortalSidebar
          {...sidebarProps}
          user={user}
          currentPath={location.pathname}
          onLogout={handleLogout}
        />
      </div>

      {/* Mobile overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity md:hidden ${isOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[84%] max-w-75 overflow-hidden transition-transform duration-300 md:hidden ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        aria-label="Outsourcing navigation"
      >
        <PortalSidebar
          {...sidebarProps}
          user={user}
          currentPath={location.pathname}
          onLogout={handleLogout}
          onNavigate={onClose}
        />
      </aside>
    </>
  );
};

export default OutsourcingSidebar;
