import React, { useState } from 'react';
import { useAuth } from '../../../context/AuthContext';
import PortalHeader from '../../common/PortalHeader';
import Notices from '../Notices';
import ComplaintSolutions from '../ComplaintSolutions';
import StaffWorkReport from '../StaffWorkReport';

const CommunicationPage = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('notices'); // 'notices', 'complaints', 'reports'

  const tabs = [
    { id: 'notices', label: 'Notices & Announcements', icon: 'campaign' },
    { id: 'complaints', label: 'Complaints & Solutions', icon: 'report_problem' },
    { id: 'reports', label: 'Work Reports', icon: 'assignment' },
  ];

  return (
    <main className="flex-1 overflow-y-auto bg-gradient-to-br from-cyan-50/30 via-white to-teal-50/30 dark:from-neutral-950 dark:via-neutral-900 dark:to-neutral-950">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <PortalHeader
          title="Communication & Reports"
          subtitle="Manage notices, handle complaints, and review work reports"
          user={user}
          icon="campaign"
          showSearch={false}
          showNotifications={true}
          showThemeToggle={true}
        />

        {/* Tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto border-b border-neutral-200/50 dark:border-neutral-800/50">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 whitespace-nowrap border-b-2 px-5 py-3.5 text-sm font-semibold transition-all ${
                activeTab === tab.id
                  ? 'border-cyan-500 bg-cyan-50/50 text-cyan-700 dark:border-cyan-400 dark:bg-cyan-900/20 dark:text-cyan-300'
                  : 'border-transparent text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900 dark:text-neutral-400 dark:hover:bg-neutral-800/50 dark:hover:text-neutral-100'
              }`}
            >
              <span className="material-symbols-outlined text-lg">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === 'notices' && <Notices />}
          {activeTab === 'complaints' && <ComplaintSolutions />}
          {activeTab === 'reports' && <StaffWorkReport />}
        </div>
      </div>
    </main>
  );
};

export default CommunicationPage;
