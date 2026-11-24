import Drawer from '../ui/Drawer';
import { useMediaQuery } from '../../hooks/useMediaQuery';
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
  { label: 'Tasks',         icon: 'task',          path: '/outsourcing/tasks' },
  { label: 'Assigned Work', icon: 'assignment',    path: '/outsourcing/assigned-work', freelancerOnly: true },
  // Attendance and Recruitment postings are staff-only (backend: Admin/HR).
  { label: 'Attendance',    icon: 'calendar_month', path: '/outsourcing/attendance', staffOnly: true },
  { label: 'Recruitment',   icon: 'person_search', path: '/outsourcing/recruitment', staffOnly: true },
  { label: 'Activity',      icon: 'timeline',      path: '/outsourcing/activity' },
  { label: 'Payments',      icon: 'payments',      path: '/outsourcing/payments' },
  { label: 'Profile',       icon: 'person',        path: '/outsourcing/profile' },
];

const outsourcingFooterItems = [
  { path: '/outsourcing/settings', label: 'Settings', icon: 'settings' },
  { path: '/outsourcing/support',  label: 'Support',  icon: 'support_agent' },
];

const STAFF_ROLES = ['admin', 'super_admin', 'superadmin', 'hr'];

const OutsourcingSidebar = ({ isOpen = false, onClose = () => {} }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed } = useSidebar();
  const mobileViewport = useMediaQuery('(max-width: 767px)');
  const isStaff = STAFF_ROLES.includes(String(user?.role || '').toLowerCase());
  const sidebarProps = {
    brandingTitle: 'Outsourcing Portal',
    brandingIcon: 'work',
    navItems: outsourcingNavItems.filter((item) => (!item.staffOnly || isStaff) && (!item.freelancerOnly || !isStaff)),
    footerItems: outsourcingFooterItems,
  };

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

      <Drawer open={isOpen && mobileViewport} onClose={onClose} title="Outsourcing navigation" side="left" hideHeader closeOnBackdrop className="!w-[min(300px,88vw)]">
        <div className="portal-shell h-full" data-role="outsourcing">
          <PortalSidebar {...sidebarProps} user={user} currentPath={location.pathname} onLogout={handleLogout} onNavigate={onClose} forceExpanded onClose={onClose} />
        </div>
      </Drawer>
    </>
  );
};

export default OutsourcingSidebar;
