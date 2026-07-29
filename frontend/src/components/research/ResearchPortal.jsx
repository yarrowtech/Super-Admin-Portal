import React, { lazy, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ResearchSidebar from './ResearchSidebar';
import ResearchSettingsPage from './ResearchSettingsPage';
import ResearchSupportPage from './ResearchSupportPage';
import AppLayout from '../../layouts/AppLayout';
import { useAuth } from '../../context/AuthContext';

const ProjectOverviewPage = lazy(() => import('../shared/ProjectOverviewPage'));
const ResearchDepartmentPortal = lazy(() =>
  import('../department/DepartmentPortals').then((m) => ({ default: m.ResearchDepartmentPortal }))
);

const ResearchPortal = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const mobileItems = useMemo(
    () => [
      { key: 'dashboard',        label: 'Dashboard',        icon: 'science',      active: location.pathname === '/research/dashboard',                onClick: () => navigate('/research/dashboard') },
      { key: 'project-overview', label: 'Project Overview', icon: 'folder_copy',  active: location.pathname.startsWith('/research/project-overview'), onClick: () => navigate('/research/project-overview') },
    ],
    [location.pathname, navigate]
  );

  return (
    <AppLayout
      sidebar={<ResearchSidebar />}
      title="Research Portal"
      subtitle="Research operations"
      mobileIcon="science"
      mobileItems={mobileItems}
      user={user}
      showHeader={false}
    >
      <div className="portal-content p-0">
        {location.pathname === '/research/settings' ? <ResearchSettingsPage /> :
         location.pathname === '/research/support'  ? <ResearchSupportPage /> :
         location.pathname.startsWith('/research/project-overview') ? <ProjectOverviewPage portalKey="research" portalName="Research Portal" /> :
         <ResearchDepartmentPortal />}
      </div>
    </AppLayout>
  );
};

export default ResearchPortal;
