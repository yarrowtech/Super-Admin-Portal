import React, { Suspense, lazy, useEffect, useState } from 'react';
import CEOSidebar from './CEOSidebar';
import { useSidebar } from '../../context/SidebarContext';
const CEODashboard = lazy(() => import('./CEODashboard'));
const CEOChatPage = lazy(() => import('../../pages/ceo/CEOChatPage'));
const CEOReports = lazy(() => import('./CEOReports'));
const CEOEmployees = lazy(() => import('./CEOEmployees'));
const DepartmentStats = lazy(() => import('./DepartmentStats'));
const CEOProjectUpdates = lazy(() => import('./CEOProjectUpdates'));
const CEORevenueAnalytics = lazy(() => import('./CEORevenueAnalytics'));
const CEOProductInsights = lazy(() => import('./CEOProductInsights'));
const CEONotifications = lazy(() => import('./CEONotifications'));
const CEOLegalApproval = lazy(() => import('./CEOLegalApproval'));
import { NotificationProvider } from '../../context/NotificationContext';
import MobilePortalNav from '../common/MobilePortalNav';

const ceoMobileItems = [
  { key: 'dashboard', label: 'Overview Dashboard', icon: 'dashboard' },
  { key: 'revenueAnalytics', label: 'Revenue Analytics', icon: 'payments' },
  { key: 'productInsights', label: 'Product Insights', icon: 'insights' },
  { key: 'employees', label: 'Employee Analytics', icon: 'groups' },
  { key: 'departmentStats', label: 'Department Insights', icon: 'monitoring' },
  { key: 'reports', label: 'Reports', icon: 'summarize' },
  { key: 'projectUpdates', label: 'Project Updates', icon: 'update' },
  { key: 'legalApproval', label: 'Legal Approval', icon: 'gavel' },
  { key: 'chat', label: 'Chat', icon: 'forum' },
  { key: 'notifications', label: 'Notifications', icon: 'notifications' },
];

const CEOPortal = () => {
  const { collapsed } = useSidebar();
  const [currentView, setCurrentView] = useState(() => {
    try {
      return localStorage.getItem('ceo-portal-current-view') || 'dashboard';
    } catch {
      return 'dashboard';
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('ceo-portal-current-view', currentView);
    } catch {}
  }, [currentView]);

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <CEODashboard />;
      case 'revenueAnalytics':
        return <CEORevenueAnalytics />;
      case 'reports':
        return <CEOReports />;
      case 'employees':
        return <CEOEmployees />;
      case 'productInsights':
        return <CEOProductInsights />;
      case 'chat':
        return <CEOChatPage />;
      case 'departmentStats':
        return <DepartmentStats />;
      case 'projectUpdates':
        return <CEOProjectUpdates />;
      case 'notifications':
        return <CEONotifications />;
      case 'legalApproval':
        return <CEOLegalApproval />;
      default:
        return <CEODashboard />;
    }
  };

  return (
    <NotificationProvider>
      <div className="portal-shell relative flex min-h-screen w-full font-display bg-background-light text-neutral-800 dark:bg-background-dark dark:text-neutral-100">
        <div className="flex h-full w-full">
          <MobilePortalNav
            title="CEO Portal"
            subtitle="Executive workspace"
            icon="business_center"
            items={ceoMobileItems.map((item) => ({
              ...item,
              active: currentView === item.key,
              onClick: () => setCurrentView(item.key),
            }))}
          />
          <CEOSidebar onViewChange={setCurrentView} />
          <div className={`portal-content flex-1 overflow-x-hidden pt-16 transition-[margin] duration-300 ease-out-expo md:pt-0 ${collapsed ? 'md:ml-16' : 'md:ml-64'}`}>
            <Suspense fallback={<div className="m-4 h-72 animate-pulse rounded-xl bg-neutral-200 dark:bg-neutral-800" />}>
              {renderContent()}
            </Suspense>
          </div>
        </div>
      </div>
    </NotificationProvider>
  );
};

export default CEOPortal;
