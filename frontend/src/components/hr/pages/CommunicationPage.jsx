import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import Tabs from '../../common/Tabs';
import Notices from '../NoticesLive';
import ComplaintSolutions from '../ComplaintSolutionsLive';
import StaffWorkReport from '../StaffWorkReport';

const communicationTabs = [
  { key: 'notices', label: 'Notices & Announcements', icon: 'campaign' },
  { key: 'complaints', label: 'Complaints & Solutions', icon: 'report_problem' },
  { key: 'reports', label: 'Work Reports', icon: 'assignment' },
];

const CommunicationPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notices');

  return (
    <main className="portal-page">
      <div className="portal-page-inner">
        <PortalHeader
          title="Communication & Reports"
          subtitle="Manage notices, complaints, and staff work reporting from one workspace."
          user={user}
          icon="campaign"
          showThemeToggle={true}
        />

        <Tabs items={communicationTabs} activeKey={activeTab} onChange={setActiveTab} className="mb-6" />

        <div>
          {activeTab === 'notices' && <Notices />}
          {activeTab === 'complaints' && <ComplaintSolutions />}
          {activeTab === 'reports' && <StaffWorkReport embedded />}
        </div>
      </div>
    </main>
  );
};

export default CommunicationPage;
