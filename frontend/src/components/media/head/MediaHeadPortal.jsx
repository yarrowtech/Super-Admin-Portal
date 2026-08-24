import React, { Suspense, lazy } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import MediaHeadSidebar from './MediaHeadSidebar';
import { useSidebar } from '../../../context/SidebarContext';
import MobilePortalNav from '../../common/MobilePortalNav';

const MediaHeadDashboard = lazy(() => import('./MediaHeadDashboard'));
const MediaHeadProjectList = lazy(() => import('./MediaHeadProjectList'));
const MediaHeadProjectOverview = lazy(() => import('./MediaHeadProjectOverview'));
const MediaHeadTeamAnalytics = lazy(() => import('./MediaHeadTeamAnalytics'));
const MediaHeadDeadlineCenter = lazy(() => import('./MediaHeadDeadlineCenter'));
const MediaHeadApprovalCenter = lazy(() => import('./MediaHeadApprovalCenter'));
const MediaHeadActivityFeed = lazy(() => import('./MediaHeadActivityFeed'));
const MediaHeadSettingsPage = lazy(() => import('../../shared/PortalSettingsPage').then((m) => ({ default: () => <m.default portalLabel="Media Head" accentColor="#0f766e" /> })));
const MediaHeadSupportPage = lazy(() => import('../../shared/PortalSupportPage').then((m) => ({ default: () => <m.default portal="media" portalLabel="Media Head" accentColor="#0f766e" /> })));

// Kept as its own theme constant (not imported from the Marketing portal)
// so this shell stays fully decoupled from MediaPortal.jsx — same visual
// identity, zero dependency.
const MEDIA_THEME = {
  '--portal-accent': '#0f766e',
  '--portal-accent-soft': '#ccfbf1',
  '--portal-accent-strong': '#134e4a',
};

const mediaHeadMobileItems = [
  { key: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { key: 'projects', label: 'Projects', icon: 'folder_copy' },
  { key: 'overview', label: 'Overview', icon: 'table_view' },
  { key: 'team-analytics', label: 'Team Analytics', icon: 'insights' },
  { key: 'deadlines', label: 'Deadlines', icon: 'event_upcoming' },
  { key: 'approvals', label: 'Approvals', icon: 'fact_check' },
  { key: 'activity', label: 'Activity', icon: 'history' },
  { key: 'settings', label: 'Settings', icon: 'settings' },
  { key: 'support', label: 'Support', icon: 'support_agent' },
];

const VALID_VIEWS = new Set(mediaHeadMobileItems.map((item) => item.key));

const MediaHeadPortal = () => {
  const { collapsed } = useSidebar();
  const navigate = useNavigate();
  const { view = 'dashboard' } = useParams();
  const currentView = VALID_VIEWS.has(view) ? view : 'dashboard';
  const setCurrentView = (nextView) => {
    const safeView = VALID_VIEWS.has(nextView) ? nextView : 'dashboard';
    navigate(`/media/head/${safeView}`);
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <MediaHeadDashboard onNavigate={setCurrentView} />;
      case 'projects':
        return <MediaHeadProjectList />;
      case 'overview':
        return <MediaHeadProjectOverview />;
      case 'team-analytics':
        return <MediaHeadTeamAnalytics />;
      case 'deadlines':
        return <MediaHeadDeadlineCenter />;
      case 'approvals':
        return <MediaHeadApprovalCenter />;
      case 'activity':
        return <MediaHeadActivityFeed />;
      case 'settings':
        return <MediaHeadSettingsPage />;
      case 'support':
        return <MediaHeadSupportPage />;
      default:
        return <MediaHeadDashboard onNavigate={setCurrentView} />;
    }
  };

  if (view && !VALID_VIEWS.has(view)) {
    return <Navigate to="/media/head/dashboard" replace />;
  }

  return (
    <div
      className="portal-shell relative flex min-h-screen w-full font-display bg-background-light text-neutral-800 dark:bg-background-dark dark:text-neutral-100"
      data-role="media"
      style={MEDIA_THEME}
    >
      <div className="flex h-full w-full">
        <MobilePortalNav
          title="Media Head"
          subtitle="Department Command Center"
          icon="workspace_premium"
          items={mediaHeadMobileItems.map((item) => ({
            ...item,
            active: currentView === item.key,
            onClick: () => setCurrentView(item.key),
          }))}
        />
        <MediaHeadSidebar currentView={currentView} onViewChange={setCurrentView} />
        <div className={`portal-content flex-1 overflow-x-hidden pt-16 transition-[margin] duration-300 ease-out-expo md:pt-0 ${collapsed ? 'md:ml-16' : 'md:ml-64'}`}>
          <Suspense fallback={<div className="m-4 h-72 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}>
            {renderContent()}
          </Suspense>
        </div>
      </div>
    </div>
  );
};

export default MediaHeadPortal;
