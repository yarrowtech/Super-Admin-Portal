import React, { useEffect, useMemo, useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { io } from 'socket.io-client';
import ITSidebar from './ITSidebar';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const SOCKET_URL = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/$/, '');

const IT_SECTIONS = [
  { id: 'dashboard',       label: 'Overview',            icon: 'dashboard',              description: 'Command center overview',                    path: '/it/dashboard' },
  { id: 'products',        label: 'Products & Systems',  icon: 'inventory_2',            description: 'Workspace control for each product',          path: '/it/dashboard/products' },
  { id: 'tickets',         label: 'IT Tickets',          icon: 'confirmation_number',    description: 'Service desk queues and SLAs',                path: '/it/dashboard/tickets' },
  { id: 'assets',          label: 'Asset Management',    icon: 'devices',                description: 'Device and hardware lifecycle',               path: '/it/dashboard/assets' },
  { id: 'security',        label: 'Security Center',     icon: 'security',               description: 'Threats, compliance and firewall',            path: '/it/dashboard/security' },
  { id: 'iam',             label: 'User Access & IAM',   icon: 'manage_accounts',        description: 'Roles, permissions and access requests',      path: '/it/dashboard/iam' },
  { id: 'changes',         label: 'Change Management',   icon: 'published_with_changes', description: 'ITIL changes, deployments and CI/CD',        path: '/it/dashboard/changes' },
  { id: 'operations',      label: 'Operations',          icon: 'dns',                    description: 'Infrastructure, network, security',           path: '/it/dashboard/operations' },
  { id: 'reports',         label: 'Reports & Analytics', icon: 'analytics',              description: 'SLA reports, uptime and ticket trends',       path: '/it/dashboard/reports' },
  { id: 'activity',        label: 'Activity Logs',       icon: 'history',                description: 'Audit trails and system event logs',          path: '/it/dashboard/activity' },
  { id: 'support-center',  label: 'Support Center',      icon: 'support_agent',          description: 'Manage support tickets from all portals',    path: '/it/dashboard/support-center' },
  { id: 'settings',        label: 'Settings',            icon: 'settings',               description: 'Portal preferences and policies',            path: '/it/dashboard/settings' },
];

const ITPortal = () => {
  const { user, token } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [supportBadge, setSupportBadge] = useState(0);

  useEffect(() => {
    if (!token) return undefined;
    const socket = io(SOCKET_URL, { auth: { token }, withCredentials: true, transports: ['websocket'] });
    socket.emit('join_room', 'support:admins');
    socket.on('support:new_ticket', () => setSupportBadge((n) => n + 1));
    return () => socket.disconnect();
  }, [token]);

  const activeSection = useMemo(() => {
    const pathname = location.pathname;
    if (pathname.startsWith('/it/dashboard/products'))   return 'products';
    if (pathname.startsWith('/it/dashboard/tickets'))    return 'tickets';
    if (pathname.startsWith('/it/dashboard/assets'))     return 'assets';
    if (pathname.startsWith('/it/dashboard/security'))   return 'security';
    if (pathname.startsWith('/it/dashboard/iam'))        return 'iam';
    if (pathname.startsWith('/it/dashboard/changes'))    return 'changes';
    if (pathname.startsWith('/it/dashboard/operations')) return 'operations';
    if (pathname.startsWith('/it/dashboard/reports'))    return 'reports';
    if (pathname.startsWith('/it/dashboard/activity'))   return 'activity';
    if (pathname.startsWith('/it/dashboard/support-center')) return 'support-center';
    if (pathname.startsWith('/it/dashboard/settings'))   return 'settings';
    return 'dashboard';
  }, [location.pathname]);

  // Clear badge when IT user opens the support center
  useEffect(() => {
    if (activeSection === 'support-center') setSupportBadge(0);
  }, [activeSection]);

  // Inject badge into the support-center section item
  const sectionsWithBadge = useMemo(
    () => IT_SECTIONS.map((s) =>
      s.id === 'support-center' && supportBadge > 0 ? { ...s, badge: supportBadge } : s
    ),
    [supportBadge]
  );

  const mobileItems = useMemo(
    () =>
      sectionsWithBadge.map((item) => ({
        key: item.id,
        label: item.label,
        icon: item.icon,
        active: activeSection === item.id,
        onClick: () => navigate(item.path),
      })),
    [activeSection, navigate, sectionsWithBadge]
  );

  return (
    <AppLayout
      sidebar={<ITSidebar activeSection={activeSection} onSelect={(sectionId) => navigate(IT_SECTIONS.find((item) => item.id === sectionId)?.path || '/it/dashboard')} sections={sectionsWithBadge} />}
      title="IT Portal"
      subtitle="Executive technology control center"
      mobileIcon="memory"
      mobileItems={mobileItems}
      user={user}
      showHeader={false}
    >
      <Outlet />
    </AppLayout>
  );
};

export default ITPortal;
