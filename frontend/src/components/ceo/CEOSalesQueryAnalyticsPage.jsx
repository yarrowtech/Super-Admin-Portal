import React from 'react';
import PortalHeader from '../common/PortalHeader';
import { useAuth } from '../../context/AuthContext';
import CEOSalesQueryAnalytics from './CEOSalesQueryAnalytics';

const CEOSalesQueryAnalyticsPage = () => {
  const { token, user } = useAuth();

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Sales Query Analytics"
          subtitle="Field submissions across all sales portals"
          icon="query_stats"
          user={user}
          showSearch={false}
          showNotifications
          showThemeToggle
        />
        <CEOSalesQueryAnalytics token={token} compact={false} />
      </div>
    </main>
  );
};

export default CEOSalesQueryAnalyticsPage;
