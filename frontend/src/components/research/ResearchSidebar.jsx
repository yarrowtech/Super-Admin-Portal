import React, { useCallback, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { canAccessPortal, PORTALS } from '../../utils/rbac';
import PortalSidebar from '../common/PortalSidebar';
import { useSidebar } from '../../context/SidebarContext';

const researchNavItems = [
  { label: 'Dashboard',        icon: 'science',      path: '/research/dashboard' },
  { label: 'Project Overview', icon: 'folder_copy',  path: '/research/project-overview' },
];

const ResearchSidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { collapsed } = useSidebar();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = useCallback(() => {
    logout();
    navigate('/login', { replace: true });
  }, [logout, navigate]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

  if (!canAccessPortal(user, PORTALS.RESEARCH)) return null;

  return (
    <>
      {/* Mobile top bar */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-16 items-center justify-between border-b border-neutral-200 bg-white/95 px-3 shadow-sm backdrop-blur dark:border-neutral-800 dark:bg-neutral-900/95 md:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-neutral-700 transition-colors hover:bg-neutral-100 focus:outline-none focus:ring-2 focus:ring-primary/40 dark:text-neutral-200 dark:hover:bg-neutral-800"
          aria-label="Open navigation"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>
        <div className="min-w-0 text-center">
          <p className="truncate text-sm font-bold text-neutral-900 dark:text-neutral-100">Research Portal</p>
          <p className="truncate text-xs text-neutral-500 dark:text-neutral-400">{user?.firstName} {user?.lastName}</p>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="flex h-11 w-11 items-center justify-center rounded-xl text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-300 dark:text-red-400 dark:hover:bg-red-900/20"
          aria-label="Logout"
        >
          <span className="material-symbols-outlined">logout</span>
        </button>
      </div>

      {/* Desktop sidebar */}
      <div className={`fixed left-0 top-0 z-1000 hidden h-screen shadow-lg md:block ${collapsed ? 'w-16' : 'w-[250px]'}`}>
        <PortalSidebar
          brandingTitle="Research Portal"
          brandingSubtitle="Research Operations"
          brandingIcon="science"
          user={user}
          navItems={researchNavItems}
          currentPath={location.pathname}
          onLogout={handleLogout}
          footerItems={[
            { path: '/research/settings', label: 'Settings', icon: 'settings' },
            { path: '/research/support',  label: 'Support',  icon: 'support_agent' },
          ]}
        />
      </div>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={closeMobile}
            aria-label="Close navigation overlay"
          />
          <div className="relative h-full w-[min(250px,86vw)] shadow-2xl">
            <PortalSidebar
              brandingTitle="Research Portal"
              brandingSubtitle="Research Operations"
              brandingIcon="science"
              user={user}
              navItems={researchNavItems}
              currentPath={location.pathname}
              onLogout={handleLogout}
              onNavigate={closeMobile}
              footerItems={[
                { path: '/research/settings', label: 'Settings', icon: 'settings' },
                { path: '/research/support',  label: 'Support',  icon: 'support_agent' },
              ]}
            />
          </div>
        </div>
      )}
    </>
  );
};

export default ResearchSidebar;
