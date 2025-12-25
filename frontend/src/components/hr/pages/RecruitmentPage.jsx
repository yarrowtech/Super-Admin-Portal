import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import ApplicantTracking from '../ApplicantTracking';

const RecruitmentPage = () => {
  const { user } = useAuth();

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-purple-50/30 via-white to-pink-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PortalHeader
          title="Recruitment & Hiring"
          subtitle="Manage job postings, applicants, interviews, and offers"
          user={user}
          icon="work"
          showSearch={true}
          showNotifications={true}
          showThemeToggle={true}
          searchPlaceholder="Search applicants, jobs, or interviews..."
        />

        <ApplicantTracking />
      </div>
    </main>
  );
};

export default RecruitmentPage;
