import React from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import ApplicantTracking from '../ApplicantTracking';

const RecruitmentPage = () => {
  const { user } = useAuth();

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Recruitment & Hiring"
          subtitle="Manage job postings, applicants, interviews, and offers"
          user={user}
          icon="work"
        />

        <ApplicantTracking />
      </div>
    </main>
  );
};

export default RecruitmentPage;
