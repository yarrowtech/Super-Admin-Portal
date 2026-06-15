import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import Performance from '../Performance';

const PerformancePage = () => {
  const { user } = useAuth();

  return (
    <main className="portal-page">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PortalHeader
          title="Performance & Appraisal"
          subtitle="Track performance reviews, appraisals, and employee goals"
          user={user}
          icon="trending_up"
          showSearch={true}
          showNotifications={true}
          showThemeToggle={true}
          searchPlaceholder="Search reviews or appraisals..."
        />

        <Performance />
      </div>
    </main>
  );
};

export default PerformancePage;
