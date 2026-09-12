import React, { lazy, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import LawDashboard from './LawDashboard';
import LawSidebar from './LawSidebar';
import LawSettingsPage from './LawSettingsPage';
import LawSupportPage from './LawSupportPage';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';
import useLawProjectContext from './useLawProjectContext';

const ProjectOverviewPage = lazy(() => import('../shared/ProjectOverviewPage'));

const LawPortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const { withProjectContext } = useLawProjectContext();

  const mobileItems = useMemo(
    () => [
      { key: 'dashboard',   label: 'Workflow',   icon: 'gavel',         active: location.pathname === '/law/dashboard',                onClick: () => navigate(withProjectContext('/law/dashboard')) },
      { key: 'project-overview', label: 'Project Overview', icon: 'folder_copy', active: location.pathname.startsWith('/law/project-overview'), onClick: () => navigate(withProjectContext('/law/project-overview')) },
      { key: 'contracts',   label: 'Contracts',  icon: 'contract',      active: location.pathname.startsWith('/law/contracts'),       onClick: () => navigate(withProjectContext('/law/contracts')) },
      { key: 'legal-docs',  label: 'Legal Docs', icon: 'description',   active: location.pathname.startsWith('/law/legal-docs'),      onClick: () => navigate(withProjectContext('/law/legal-docs')) },
      { key: 'agreements',  label: 'Agreements', icon: 'handshake',     active: location.pathname.startsWith('/law/agreements'),      onClick: () => navigate(withProjectContext('/law/agreements')) },
    ],
    [location.pathname, navigate, withProjectContext]
  );

  return (
    <AppLayout
      sidebar={<LawSidebar />}
      title="Law Portal"
      subtitle="Legal operations"
      mobileIcon="gavel"
      mobileItems={mobileItems}
      user={user}
      showHeader={false}
      contentClassName="law-portal-content"
    >
      <div className="p-0">
        {location.pathname === '/law/settings' ? <LawSettingsPage /> :
         location.pathname === '/law/support'  ? <LawSupportPage /> :
         location.pathname.startsWith('/law/project-overview') ? <ProjectOverviewPage portalKey="law" portalName="Law Portal" /> :
         <LawDashboard />}
      </div>
    </AppLayout>
  );
};

export default LawPortal;
