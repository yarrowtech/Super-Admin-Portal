import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import Performance from '../Performance';

const PerformancePage = () => {
  const { user } = useAuth();

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Performance & Appraisal"
          subtitle="Automated scorecards, appraisal snapshots, and review-cycle management"
          user={user}
          icon="insights"
        />

        <Performance />
      </div>
    </main>
  );
};

export default PerformancePage;
