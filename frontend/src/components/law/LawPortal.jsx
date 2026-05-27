import React, { useMemo } from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import LawSidebar from './LawSidebar';
import LawDashboard from './LawDashboard';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

// Routes handled by dedicated pages (not LawDashboard internally)
const DEDICATED_ROUTES = [
  '/law/legal-docs',
  '/law/legal-library',
];

const LawPortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const mobileItems = useMemo(
    () => [
      { key: 'dashboard',    label: 'Dashboard',   icon: 'dashboard',    active: location.pathname === '/law/dashboard',            onClick: () => navigate('/law/dashboard') },
      { key: 'legal-docs',   label: 'Legal Docs',  icon: 'description',  active: location.pathname.startsWith('/law/legal-docs'),   onClick: () => navigate('/law/legal-docs') },
      { key: 'legal-library',label: 'Library',     icon: 'library_books',active: location.pathname.startsWith('/law/legal-library'), onClick: () => navigate('/law/legal-library') },
      { key: 'agreements',   label: 'Agreements',  icon: 'contract',     active: location.pathname.startsWith('/law/agreements'),    onClick: () => navigate('/law/agreements') },
      { key: 'policy',       label: 'Policy',      icon: 'policy',       active: location.pathname.startsWith('/law/policy'),        onClick: () => navigate('/law/policy') },
    ],
    [location.pathname, navigate]
  );

  // Check if the current path matches one of the new dedicated-page routes
  const isDedicatedRoute = DEDICATED_ROUTES.some((r) => location.pathname.startsWith(r));
  // The dashboard / old routes are handled by LawDashboard internally
  const isLawDashboard = !isDedicatedRoute;

  return (
    <AppLayout
      sidebar={<LawSidebar />}
      title="Law Portal"
      subtitle="Legal operations"
      mobileIcon="gavel"
      mobileItems={mobileItems}
      user={user}
      showHeader={false}
    >
      <div className="portal-content p-0">
        {isLawDashboard ? <LawDashboard /> : <Outlet />}
      </div>
    </AppLayout>
  );
};

export default LawPortal;
