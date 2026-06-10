import React, { useMemo } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import ITSidebar from './ITSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const IT_SECTIONS = [
  { id: 'dashboard', label: 'Overview', icon: 'dashboard', description: 'Command center overview', path: '/it/dashboard' },
  { id: 'products', label: 'Products & Systems', icon: 'inventory_2', description: 'Workspace control for each product', path: '/it/dashboard/products' },
  { id: 'tickets', label: 'Support & Tickets', icon: 'support_agent', description: 'Service desk queues and SLAs', path: '/it/dashboard/tickets' },
  { id: 'assets', label: 'Asset Management', icon: 'inventory_2', description: 'Device and hardware lifecycle', path: '/it/dashboard/assets' },
  { id: 'operations', label: 'Operations', icon: 'dns', description: 'Infrastructure, network, security', path: '/it/dashboard/operations' },
  { id: 'activity', label: 'Activity Logs', icon: 'history', description: 'Traceability and controls', path: '/it/dashboard/activity' },
  { id: 'settings', label: 'Settings', icon: 'settings', description: 'Portal preferences and policies', path: '/it/dashboard/settings' },
];

const ITPortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const activeSection = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.startsWith('/it/dashboard/products')) return 'products';
    if (pathname.startsWith('/it/dashboard/tickets')) return 'tickets';
    if (pathname.startsWith('/it/dashboard/assets')) return 'assets';
    if (pathname.startsWith('/it/dashboard/operations')) return 'operations';
    if (pathname.startsWith('/it/dashboard/activity')) return 'activity';
    if (pathname.startsWith('/it/dashboard/settings')) return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  const mobileItems = useMemo(
    () =>
      IT_SECTIONS.map((item) => ({
        key: item.id,
        label: item.label,
        icon: item.icon,
        active: activeSection === item.id,
        onClick: () => navigate(item.path),
      })),
    [activeSection, navigate]
  );

  return (
    <AppLayout
      sidebar={<ITSidebar activeSection={activeSection} onSelect={(sectionId) => navigate(IT_SECTIONS.find((item) => item.id === sectionId)?.path || '/it/dashboard')} sections={IT_SECTIONS} />}
      title="IT Portal"
      subtitle="Executive technology control center"
      mobileIcon="memory"
      mobileItems={mobileItems}
      user={user}
    >
      <Outlet />
    </AppLayout>
  );
};

export default ITPortal;
