import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import Performance from '../Performance';

const PerformancePage = () => {
  const { user } = useAuth();

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-indigo-50/30 via-white to-blue-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
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
