import React, { lazy } from 'react';
import { useLocation } from 'react-router-dom';
import LawDashboard from './LawDashboard';
import LawSidebar from './LawSidebar';
import LawSettingsPage from './LawSettingsPage';
import LawSupportPage from './LawSupportPage';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const ProjectOverviewPage = lazy(() => import('../shared/ProjectOverviewPage'));

const LawPortal = () => {
  const { user } = useAuth();
  const location = useLocation();

  return (
    <AppLayout
      sidebar={<LawSidebar />}
      title="Law Portal"
      subtitle="Legal operations"
      mobileIcon="gavel"
      user={user}
      showHeader={false}
      showMobileNav={false}
    >
      {/* LawSidebar renders its own fixed mobile top bar (h-16) since AppLayout's
          shared MobilePortalNav is disabled above to avoid a duplicate header —
          this reserves the same height so content clears it on mobile only. */}
      <div className="pt-16 md:pt-0">
        {location.pathname === '/law/settings' ? <LawSettingsPage /> :
         location.pathname === '/law/support'  ? <LawSupportPage /> :
         location.pathname.startsWith('/law/project-overview') ? <ProjectOverviewPage portalKey="law" portalName="Law Portal" /> :
         <LawDashboard />}
      </div>
    </AppLayout>
  );
};

export default LawPortal;
